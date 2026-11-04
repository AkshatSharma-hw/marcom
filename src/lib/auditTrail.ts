/**
 * Durable, append-only audit trail for DataStore mutations.
 *
 * Before this module the store logged mutations into React state, capped at
 * 500, excluded from the persisted payload and destroyed on reload. That made
 * the audit trail unusable as evidence: an incident declared in-app rendered a
 * permanently empty timeline, which is the single most-cited compliance gap in
 * docs/MARKET_READINESS_AUDIT_PASS2.md.
 *
 * The pieces here are deliberately pure functions over plain arrays — the
 * provider owns the React state and localStorage, this module owns the shape
 * and the rules — so the append-only guarantee can be tested without mounting
 * anything.
 *
 * Design constraints that shaped this file:
 *
 *  - Records use `AuditRecord` from src/data/types.ts *exactly*. Fields such as
 *    "before"/"after" were not added: the seeded trail, the graph selectors and
 *    every audit surface read that shape, and a runtime-only variant would show
 *    up as a second class of event that half the app cannot render. The diff
 *    therefore lives inside `detail`, rendered as text, the same way the seeded
 *    records describe what changed.
 *  - Ids are prefixed `ADT-RT-` rather than continuing the seeded `ADT-nnn`
 *    sequence. Each demo pack ships its own ADT ids and the packs disagree on
 *    how far the sequence runs, so continuing it would collide with shipped
 *    records the moment VITE_DEMO_PACK changed.
 *  - There is no update or delete export. Trimming is the one operation that
 *    removes anything, it only ever removes the oldest entries, and it records
 *    that it happened (see `appendAudit`).
 */

import { DEMO_NOW_MS } from '@/data/selectors/campaignSelectors';
import { getSeedDB } from '@/data/seed';
import type { AuditRecord, EntityName } from '@/data/types';
import type { AppRole } from '@/lib/rbac';

/**
 * Upper bound on persisted entries.
 *
 * localStorage is a few MB per origin and the record payload shares that quota,
 * so the trail cannot grow without limit. 500 matches the cap the in-memory log
 * already used, which keeps the behaviour change to "it survives reload" rather
 * than "it also holds far more".
 */
export const AUDIT_CAP = 500;

/** Longest `detail` string written; keeps one noisy diff from eating the quota. */
const DETAIL_MAX = 400;

/** Fields named individually in a diff before it collapses to a count. */
const DIFF_FIELD_MAX = 8;

/** Longest rendering of a single field value inside a diff. */
const VALUE_MAX = 60;

/**
 * DataStore collection id → the entity it holds, and the noun used in action
 * strings ("campaign.updated", matching the seeded `campaign.created`).
 *
 * Written out rather than derived from the collection id because the derivation
 * is wrong for the ones that matter: "aiReviews" → "AIReview" and "contents" →
 * "Content" are not mechanical, and a silently wrong `entityType` is worse than
 * a missing one — it files the event against a record that does not exist.
 *
 * Keep in step with the `useCollection('…')` call sites listed in
 * src/data/useLiveDB.ts; an unmapped id still logs (see `describeCollection`),
 * it just cannot claim an entity type.
 */
const COLLECTION_ENTITIES: Record<string, { entity: EntityName; noun: string }> = {
  agentRuns: { entity: 'AgentRun', noun: 'agentRun' },
  aiReviews: { entity: 'AIReview', noun: 'aiReview' },
  approvals: { entity: 'Approval', noun: 'approval' },
  assets: { entity: 'Asset', noun: 'asset' },
  brands: { entity: 'Brand', noun: 'brand' },
  briefs: { entity: 'Brief', noun: 'brief' },
  budgets: { entity: 'Budget', noun: 'budget' },
  campaigns: { entity: 'Campaign', noun: 'campaign' },
  channelExecutions: { entity: 'ChannelExecution', noun: 'channelExecution' },
  communications: { entity: 'Communication', noun: 'communication' },
  contents: { entity: 'Content', noun: 'content' },
  contentVersions: { entity: 'ContentVersion', noun: 'contentVersion' },
  crisisIncidents: { entity: 'CrisisIncident', noun: 'crisisIncident' },
  customerPersonas: { entity: 'CustomerPersona', noun: 'customerPersona' },
  glossaryTerms: { entity: 'GlossaryTerm', noun: 'glossaryTerm' },
  ideas: { entity: 'Idea', noun: 'idea' },
  journeys: { entity: 'Journey', noun: 'journey' },
  legalClauses: { entity: 'LegalClause', noun: 'legalClause' },
  notifications: { entity: 'Notification', noun: 'notification' },
  suppressionEntries: { entity: 'SuppressionEntry', noun: 'suppressionEntry' },
  workflows: { entity: 'Workflow', noun: 'workflow' },
  workflowStages: { entity: 'WorkflowStage', noun: 'workflowStage' },
};

/** Reverse of `COLLECTION_ENTITIES`, so a stored record can name its collection. */
const COLLECTION_BY_ENTITY: Partial<Record<EntityName, string>> = Object.fromEntries(
  Object.entries(COLLECTION_ENTITIES).map(([id, { entity }]) => [entity, id]),
);

/**
 * The entity and action noun for a collection id.
 *
 * An unknown collection is logged against `AuditRecord` rather than dropped: a
 * screen registering a new collection should not silently lose its history
 * because this table was not updated at the same time.
 */
export function describeCollection(collectionId: string): {
  entity: EntityName;
  noun: string;
} {
  return (
    COLLECTION_ENTITIES[collectionId] ?? {
      entity: 'AuditRecord',
      noun: collectionId,
    }
  );
}

/** Collection id an audit record's entity lives in, for surfaces keyed by collection. */
export function collectionForEntity(entity: EntityName): string {
  return COLLECTION_BY_ENTITY[entity] ?? entity;
}

/**
 * The stakeholder behind a signed-in role.
 *
 * `DEMO_USERS` in rbac.ts resolves role → person the same way; this resolves
 * role → *id*, which is what `AuditRecord.actorStakeholderId` holds and what
 * every audit surface joins on to print a name. Falling back to the role string
 * keeps the record writable when a pack has no stakeholder in that role — the
 * surfaces already render an unresolved actor id verbatim.
 */
export function actorIdForRole(role: AppRole): string {
  return getSeedDB().stakeholders.find((s) => s.role === role)?.id ?? role;
}

/* ------------------------------------------------------------------ */
/* Timestamps                                                          */
/* ------------------------------------------------------------------ */

/**
 * Timestamp for the nth runtime audit record.
 *
 * The app runs on a pinned clock (`DEMO_NOW_ISO`), so `Date.now()` would stamp
 * events months after every record they describe and drop them off the top of
 * timelines that measure against the demo present. But stamping every entry
 * with the identical instant is not usable either: three of the audit surfaces
 * sort by `at`, and a block of ties leaves the ordering to whichever direction
 * that particular surface sorts.
 *
 * So entries land on the pinned second and take the millisecond field as a
 * sequence number — still the demo "now" to every reader and to `fmtStamp`,
 * still strictly ordered. Past 999 entries the offset saturates and ordering
 * falls back to array position, which is append order anyway.
 */
export function auditStamp(sequence: number): string {
  const offset = Math.min(999, Math.max(0, sequence));
  return new Date(DEMO_NOW_MS + offset).toISOString();
}

/* ------------------------------------------------------------------ */
/* Diffs                                                               */
/* ------------------------------------------------------------------ */

/** One field value, short enough that a wide record still yields a readable diff. */
function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    const trimmed = value.length > VALUE_MAX ? `${value.slice(0, VALUE_MAX - 1)}…` : value;
    return `"${trimmed}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} item${value.length === 1 ? '' : 's'}]`;
  return '{…}';
}

/** Structural equality good enough for seed-shaped rows (plain JSON values). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    /* cyclic or otherwise unserialisable — treat as changed rather than equal */
    return false;
  }
}

/**
 * Human-readable before/after diff between two rows.
 *
 * Only changed fields appear, so an update that patches one status field reads
 * as one line instead of the whole record. `id` is skipped because it is on the
 * record header already and is never what changed.
 */
export function diffFields(
  before: Readonly<Record<string, unknown>>,
  after: Readonly<Record<string, unknown>>,
): string {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((k) => k !== 'id')
    .filter((k) => !sameValue(before[k], after[k]))
    .sort();

  if (keys.length === 0) return 'no field values changed';

  const shown = keys
    .slice(0, DIFF_FIELD_MAX)
    .map((k) => `${k}: ${renderValue(before[k])} → ${renderValue(after[k])}`);
  const hidden = keys.length - shown.length;
  return hidden > 0
    ? `${shown.join('; ')}; +${hidden} more field${hidden === 1 ? '' : 's'}`
    : shown.join('; ');
}

/* ------------------------------------------------------------------ */
/* The log                                                             */
/* ------------------------------------------------------------------ */

/** Next runtime id. Monotonic over the persisted log — ids are never reused. */
export function nextAuditSequence(log: readonly AuditRecord[]): number {
  let max = 0;
  for (const r of log) {
    const m = /^ADT-RT-(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

export interface AuditDraft {
  actorStakeholderId: string;
  action: string;
  entityType: EntityName;
  entityId: string;
  detail: string;
}

/** Build a record from a draft, filling id/timestamps from the log's position. */
export function makeAuditRecord(
  log: readonly AuditRecord[],
  draft: AuditDraft,
): AuditRecord {
  const seq = nextAuditSequence(log);
  const at = auditStamp(seq);
  return {
    id: `ADT-RT-${String(seq).padStart(4, '0')}`,
    actorStakeholderId: draft.actorStakeholderId,
    action: draft.action,
    entityType: draft.entityType,
    entityId: draft.entityId,
    at,
    detail:
      draft.detail.length > DETAIL_MAX
        ? `${draft.detail.slice(0, DETAIL_MAX - 1)}…`
        : draft.detail,
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * Append a record, oldest-first, trimming from the front only if over cap.
 *
 * Returns a new array; the input is never mutated, so React state updates stay
 * honest. When entries have to go, a record of the trim goes on in their place
 * — a compliance trail that quietly forgets its own oldest events is worse than
 * one that is explicitly short, because nothing on screen distinguishes
 * "nothing happened" from "we dropped it".
 */
export function appendAudit(
  log: readonly AuditRecord[],
  draft: AuditDraft,
): AuditRecord[] {
  const next = [...log, makeAuditRecord(log, draft)];
  if (next.length <= AUDIT_CAP) return next;

  /* One slot is reserved for the trim marker itself, so the result lands
     exactly on the cap instead of one over it. */
  const dropCount = next.length - AUDIT_CAP + 1;
  const dropped = next.slice(0, dropCount);
  const kept = next.slice(dropCount);
  const marker = makeAuditRecord(kept, {
    actorStakeholderId: 'system',
    action: 'auditTrail.trimmed',
    /* Log-level events are about the trail itself, so they are filed against
       AuditRecord pointing at their own id. EntityName is a closed union read
       by exhaustive switches across the selectors — inventing a "Store" member
       for two housekeeping events would break all of them. Pointing at its own
       id also keeps the marker out of every record-scoped trail, which filter
       on entityId. */
    entityType: 'AuditRecord',
    entityId: '',
    detail:
      `Audit trail reached its ${AUDIT_CAP}-entry storage cap. ` +
      `Trimmed ${dropped.length} oldest entr${dropped.length === 1 ? 'y' : 'ies'}, ` +
      `covering ${dropped[0].at} to ${dropped[dropped.length - 1].at}.`,
  });
  return [...kept, { ...marker, entityId: marker.id }];
}

/**
 * Validate a persisted payload back into records.
 *
 * Storage is user-writable and survives code changes, so anything that does not
 * carry every field the audit surfaces read is dropped rather than rendered as
 * a half-blank timeline entry.
 */
export function parseAuditLog(value: unknown): AuditRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is AuditRecord => {
    if (row === null || typeof row !== 'object') return false;
    const r = row as Record<string, unknown>;
    return (
      typeof r.id === 'string' &&
      typeof r.actorStakeholderId === 'string' &&
      typeof r.action === 'string' &&
      typeof r.entityType === 'string' &&
      typeof r.entityId === 'string' &&
      typeof r.at === 'string' &&
      typeof r.detail === 'string'
    );
  });
}
