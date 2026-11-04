/**
 * Agent-run selectors — everything the product knows about how an agent is
 * actually performing, derived from the `AgentRun` ledger in
 * `seed/agentRuns.ts`. Pure functions of `(db, ...)`, like every other selector.
 *
 * The governing rule here is that no number is stored. `MarcomAgent` carries a
 * `status` field, but that field says how much of the agent is *demonstrable in
 * this build* — it is not a live health signal, and reading it as one would be
 * wrong. `agentStatus()` below derives health from run history instead, and
 * `acceptanceRate()` derives quality from what people did with the agent's
 * output afterwards.
 *
 * Where the evidence runs out these functions return `null` rather than 0. A
 * zero acceptance rate means "people rejected everything this agent made"; no
 * denominator means "this agent has never produced anything for anyone to
 * accept". Collapsing the second into the first invents a failure that did not
 * happen, so callers get `null` and must render an honest empty state.
 */

import type { AgentRun, EntityName, SeedDB } from '@/data/types';
import { originOf } from './originSelectors';
import { TODAY } from './campaignSelectors';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Newest first. ISO 8601 strings sort correctly as plain strings. */
function byStartedAtDesc(a: AgentRun, b: AgentRun): number {
  if (a.startedAt === b.startedAt) return a.id < b.id ? 1 : -1;
  return a.startedAt < b.startedAt ? 1 : -1;
}

/** How many of the most recent runs `agentStatus` looks at for failures. */
const DEGRADED_WINDOW = 5;

/** A run inside this many days of `TODAY` counts the agent as recently active. */
const ACTIVE_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Run lookups                                                         */
/* ------------------------------------------------------------------ */

/** Every run of one agent, most recent first. */
export function runsForAgent(db: SeedDB, agentId: string): AgentRun[] {
  return db.agentRuns.filter((r) => r.agentId === agentId).sort(byStartedAtDesc);
}

/**
 * Every run that touched one record, most recent first — both runs that took it
 * as a subject and runs that produced it. A version wants to show the run that
 * wrote it just as much as the review that read it.
 */
export function runsForRecord(db: SeedDB, entity: EntityName, id: string): AgentRun[] {
  return db.agentRuns
    .filter(
      (r) =>
        (r.subjectEntity === entity && r.subjectId === id) ||
        (r.producedEntity === entity && r.producedId === id),
    )
    .sort(byStartedAtDesc);
}

/**
 * Monday-start ISO week containing the demo anchor date, as `[start, end)`
 * timestamps. Anchored on `TODAY` exactly like every other date-aware selector,
 * so "this week" reconciles with the calendar and the metric periods.
 */
function currentWeekBounds(): { start: number; end: number } {
  const today = Date.parse(`${TODAY}T00:00:00Z`);
  const dayOfWeek = new Date(today).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const start = today - daysSinceMonday * DAY_MS;
  return { start, end: start + 7 * DAY_MS };
}

/** Runs of one agent that started inside the ISO week containing `TODAY`. */
export function runsThisWeek(db: SeedDB, agentId: string): AgentRun[] {
  const { start, end } = currentWeekBounds();
  return runsForAgent(db, agentId).filter((r) => {
    const at = Date.parse(r.startedAt);
    return at >= start && at < end;
  });
}

/* ------------------------------------------------------------------ */
/* Acceptance                                                          */
/* ------------------------------------------------------------------ */

/** Record statuses that mean a person signed the record off. */
const ACCEPTED_STATUSES = new Set([
  'approved',
  'published',
  'in use',
  'live',
  'sent',
  'completed',
]);

/** Reads a `status` field off any record, when the record has one. */
function statusOf(db: SeedDB, entity: EntityName, id: string): string | null {
  const rows = collectionFor(db, entity);
  const row = rows?.find((r) => r.id === id) as { status?: unknown } | undefined;
  return typeof row?.status === 'string' ? row.status : null;
}

/** The collections a produced record can currently live in. */
function collectionFor(db: SeedDB, entity: EntityName): { id: string }[] | null {
  switch (entity) {
    case 'ContentVersion':
      return db.contentVersions;
    case 'Content':
      return db.contents;
    case 'Campaign':
      return db.campaigns;
    case 'Communication':
      return db.communications;
    case 'Asset':
      return db.assets;
    case 'Brief':
      return db.briefs;
    case 'ChannelExecution':
      return db.channelExecutions;
    case 'Idea':
      return db.ideas;
    default:
      return null;
  }
}

/**
 * Did a person accept this produced record? Three independent kinds of evidence,
 * any one of which is sufficient — and all three are things that happened to the
 * record, never a claim the agent made about itself:
 *
 *  1. an `Approval` naming the record (or the version) was decided `Approved`;
 *  2. `originOf` reports `agent-accepted`, i.e. the provenance is intact and the
 *     record has since reached a signed-off state;
 *  3. the record itself carries an approved/published/in-use status.
 */
function acceptedByAPerson(db: SeedDB, entity: EntityName, id: string): boolean {
  const approved = db.approvals.some(
    (a) =>
      a.status === 'Approved' &&
      ((a.subjectEntity === entity && a.subjectId === id) || a.subjectVersionId === id),
  );
  if (approved) return true;

  if (originOf(db, entity, id).origin === 'agent-accepted') return true;

  const status = statusOf(db, entity, id);
  return status !== null && ACCEPTED_STATUSES.has(status.trim().toLowerCase());
}

/**
 * The acceptance evidence for one agent. `rate` is `accepted / produced` as a
 * fraction 0–1; the counts travel with it so a surface can say "8 of 15" rather
 * than a bare percentage with nothing behind it.
 */
export interface AgentAcceptance {
  /** Succeeded runs of this agent that produced a persisted record. */
  produced: number;
  /** How many of those produced records a person subsequently accepted. */
  accepted: number;
  /** `accepted / produced`, 0–1. */
  rate: number;
  /** The produced records still awaiting a person's decision. */
  pendingIds: string[];
}

/**
 * Share of an agent's produced records that a person went on to accept.
 *
 * Returns `null` when the agent has never produced a persisted record: there is
 * no denominator, so there is no rate — not a rate of zero. Callers must render
 * "nothing produced yet" rather than "0% accepted".
 */
export function acceptanceRate(db: SeedDB, agentId: string): AgentAcceptance | null {
  const produced = runsForAgent(db, agentId).filter(
    (r): r is AgentRun & { producedEntity: EntityName; producedId: string } =>
      r.status === 'succeeded' && Boolean(r.producedEntity) && Boolean(r.producedId),
  );
  if (produced.length === 0) return null;

  const pendingIds: string[] = [];
  let accepted = 0;
  for (const r of produced) {
    if (acceptedByAPerson(db, r.producedEntity, r.producedId)) accepted += 1;
    else pendingIds.push(r.producedId);
  }

  return {
    produced: produced.length,
    accepted,
    rate: accepted / produced.length,
    pendingIds,
  };
}

/* ------------------------------------------------------------------ */
/* Confidence & recency                                                */
/* ------------------------------------------------------------------ */

/**
 * Mean self-reported confidence across the agent's runs that recorded one.
 *
 * Returns `null` when no run carries a confidence — which is the normal case for
 * agents whose work is arithmetic or a lookup rather than a judgement (A6, A7,
 * A8 record none by design). An average over an empty set is not 0.
 */
export function averageConfidence(db: SeedDB, agentId: string): number | null {
  const scored = runsForAgent(db, agentId)
    .map((r) => r.confidence)
    .filter((c): c is number => typeof c === 'number');
  if (scored.length === 0) return null;
  return scored.reduce((sum, c) => sum + c, 0) / scored.length;
}

/** The agent's most recent run in any state, or `null` if it has never run. */
export function lastRun(db: SeedDB, agentId: string): AgentRun | null {
  return runsForAgent(db, agentId)[0] ?? null;
}

/** The agent's most recent failed run, or `null` if it has never failed. */
export function lastFailure(db: SeedDB, agentId: string): AgentRun | null {
  return runsForAgent(db, agentId).find((r) => r.status === 'failed') ?? null;
}

/* ------------------------------------------------------------------ */
/* Derived agent health                                                */
/* ------------------------------------------------------------------ */

/**
 * Operational health of an agent, derived from its run history.
 *
 * Deliberately distinct from `MarcomAgent.status` (`live` / `partial` /
 * `roadmap`), which describes how much of the agent is demonstrable in this
 * build and never changes as runs come and go.
 *
 * - `Degraded` — a failure sits in the most recent runs. Takes precedence:
 *   an agent that is busy and failing is failing.
 * - `Active`   — work is in flight, or it ran within the last week.
 * - `Idle`     — it has run before, but not recently and nothing is queued.
 * - `Disabled` — no run has ever been recorded. Nothing has executed here.
 */
export type AgentActivityStatus = 'Active' | 'Idle' | 'Degraded' | 'Disabled';

export function agentStatus(db: SeedDB, agentId: string): AgentActivityStatus {
  const runs = runsForAgent(db, agentId);
  if (runs.length === 0) return 'Disabled';

  const recent = runs.slice(0, DEGRADED_WINDOW);
  if (recent.some((r) => r.status === 'failed')) return 'Degraded';

  if (runs.some((r) => r.status === 'queued' || r.status === 'running')) return 'Active';

  const cutoff = Date.parse(`${TODAY}T00:00:00Z`) - ACTIVE_WINDOW_DAYS * DAY_MS;
  return Date.parse(runs[0].startedAt) >= cutoff ? 'Active' : 'Idle';
}
