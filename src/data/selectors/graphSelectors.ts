/**
 * Graph selectors — pure functions over the frozen SeedDB.
 * linksTo/linksFrom do a naive scan of every FK-shaped field so the UI can
 * render "referenced by" / "references" panels for any entity.
 */

import type {
  Approval,
  ApprovalStatus,
  Campaign,
  CampaignActivity,
  Content,
  ContentVersion,
  EntityName,
  Notification,
  SeedDB,
  TypedLink,
} from '../types';
import { campaignsInScope, TODAY, type Scope } from './campaignSelectors';
import { DEFAULT_LOCALE } from "@/lib/i18n";

/**
 * Longest prefixes first so WFS- never falls through to WF-.
 *
 * This pattern and `collections()` below must stay in step with the seed: an
 * id whose prefix is missing here is invisible to the graph, and — worse — an
 * empty "Referenced by" panel is indistinguishable from "nothing references
 * this". A confident wrong answer is the failure mode to avoid.
 */
const ID_PATTERN =
  /^(WFS|ORG|BRD|REG|STK|AGY|IDE|STR|CMP|ACT|BRF|COM|CHX|CHN|CNT|AST|AUD|SEG|APR|POL|NTF|BUD|KPI|ADT|AGT|ARN|CRI|MCT|COV|SUP|CNS|PER|CPT|LCS|JUR|LGL|GLS|JRN|EVT|BU|CV|WF|MR)-/;

export type Row = { id: string } & Record<string, unknown>;

export function collections(db: SeedDB): [EntityName, Row[]][] {
  return [
    ['Organization', [db.org as unknown as Row]],
    ['BusinessUnit', db.businessUnits as unknown as Row[]],
    ['Brand', db.brands as unknown as Row[]],
    ['Region', db.regions as unknown as Row[]],
    ['Stakeholder', db.stakeholders as unknown as Row[]],
    ['Agency', db.agencies as unknown as Row[]],
    ['Idea', db.ideas as unknown as Row[]],
    ['Strategy', db.strategies as unknown as Row[]],
    ['Campaign', db.campaigns as unknown as Row[]],
    ['CampaignActivity', db.campaignActivities as unknown as Row[]],
    ['Brief', db.briefs as unknown as Row[]],
    ['Communication', db.communications as unknown as Row[]],
    ['ChannelExecution', db.channelExecutions as unknown as Row[]],
    ['Channel', db.channels as unknown as Row[]],
    ['Content', db.contents as unknown as Row[]],
    ['ContentVersion', db.contentVersions as unknown as Row[]],
    ['Asset', db.assets as unknown as Row[]],
    ['Audience', db.audiences as unknown as Row[]],
    ['Segment', db.segments as unknown as Row[]],
    ['Workflow', db.workflows as unknown as Row[]],
    ['WorkflowStage', db.workflowStages as unknown as Row[]],
    ['Approval', db.approvals as unknown as Row[]],
    ['Policy', db.policies as unknown as Row[]],
    ['Notification', db.notifications as unknown as Row[]],
    ['Budget', db.budgets as unknown as Row[]],
    ['KPI', db.kpis as unknown as Row[]],
    ['MetricResult', db.metricResults as unknown as Row[]],
    ['AuditRecord', db.auditRecords as unknown as Row[]],
    // Collections added after the original 28. Personas in particular were
    // isolated from the graph, so "which campaigns target this persona, and
    // what breaks if we retire it?" was unanswerable.
    ['CustomerPersona', db.customerPersonas as unknown as Row[]],
    ['Journey', db.journeys as unknown as Row[]],
    ['Event', db.events as unknown as Row[]],
    ['CrisisIncident', db.crisisIncidents as unknown as Row[]],
    ['MediaContact', db.mediaContacts as unknown as Row[]],
    ['CoverageItem', db.coverageItems as unknown as Row[]],
    ['SuppressionEntry', db.suppressionEntries as unknown as Row[]],
    ['ConsentSummary', db.consentSummaries as unknown as Row[]],
    ['Competitor', db.competitors as unknown as Row[]],
    ['LifecycleStage', db.lifecycleStages as unknown as Row[]],
    ['MarcomAgent', db.marcomAgents as unknown as Row[]],
    // The agent execution ledger. Without it every ARN- row is invisible to the
    // graph, and a record an agent produced reports an empty "Referenced by"
    // panel — a confidently wrong answer rather than a missing one.
    ['AgentRun', db.agentRuns as unknown as Row[]],
    ['Jurisdiction', db.jurisdictions as unknown as Row[]],
    ['LegalClause', db.legalClauses as unknown as Row[]],
    ['GlossaryTerm', db.glossaryTerms as unknown as Row[]],
  ];
}

/** Collects every FK-shaped id referenced by a record, with its field path. */
function collectRefs(value: unknown, path: string, out: { rel: string; id: string }[]): void {
  if (typeof value === 'string') {
    if (ID_PATTERN.test(value)) out.push({ rel: path, id: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectRefs(v, `${path}[${i}]`, out));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key === 'id') continue; // the record's own identity is not a reference
      collectRefs(v, path ? `${path}.${key}` : key, out);
    }
  }
}

function entityNameOf(db: SeedDB, id: string): EntityName | null {
  for (const [name, rows] of collections(db)) {
    if (rows.some((r) => r.id === id)) return name;
  }
  return null;
}

/** Every entity that references `entityId`, as typed links (rel = referencing field). */
export function linksTo(db: SeedDB, entityId: string): TypedLink[] {
  const links: TypedLink[] = [];
  for (const [entityName, rows] of collections(db)) {
    for (const row of rows) {
      const refs: { rel: string; id: string }[] = [];
      collectRefs(row, '', refs);
      for (const ref of refs) {
        if (ref.id === entityId) links.push({ rel: ref.rel, entity: entityName, id: row.id });
      }
    }
  }
  return links;
}

/** Every entity that `entityId` references, as typed links (rel = source field). */
export function linksFrom(db: SeedDB, entityId: string): TypedLink[] {
  for (const [, rows] of collections(db)) {
    const row = rows.find((r) => r.id === entityId);
    if (!row) continue;
    const refs: { rel: string; id: string }[] = [];
    collectRefs(row, '', refs);
    const links: TypedLink[] = [];
    for (const ref of refs) {
      const entity = entityNameOf(db, ref.id);
      if (entity) links.push({ rel: ref.rel, entity, id: ref.id });
    }
    return links;
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Asset impact analysis                                               */
/* ------------------------------------------------------------------ */

export interface AssetImpact {
  /** Versions that embed the asset. */
  contentVersions: ContentVersion[];
  /** Head content records of those versions. */
  contents: Content[];
  /** Campaigns those contents belong to. */
  campaigns: Campaign[];
  /** Approvals whose subject is the asset itself. */
  approvals: Approval[];
  /** Notifications raised about the asset (e.g. rights expiry). */
  notifications: Notification[];
}

/**
 * Blueprint traversal `Asset ← embeds ← ContentVersion → Content → Campaign`:
 * everything that would be affected if the asset's rights expired today.
 * Built on linksTo so any new FK-shaped reference to the asset is picked up.
 */
export function assetImpact(db: SeedDB, assetId: string): AssetImpact {
  const refs = linksTo(db, assetId);
  const idsOf = (entity: EntityName): Set<string> =>
    new Set(refs.filter((l) => l.entity === entity).map((l) => l.id));

  const contentVersions = db.contentVersions.filter((v) => idsOf('ContentVersion').has(v.id));
  const contentIds = new Set(contentVersions.map((v) => v.contentId));
  const contents = db.contents.filter((c) => contentIds.has(c.id));
  const campaignIds = new Set(
    contents.map((c) => c.campaignId).filter((id): id is string => Boolean(id)),
  );
  const campaigns = db.campaigns.filter((c) => campaignIds.has(c.id));
  const approvals = db.approvals.filter((a) => idsOf('Approval').has(a.id));
  const notifications = db.notifications.filter((n) => idsOf('Notification').has(n.id));

  return { contentVersions, contents, campaigns, approvals, notifications };
}

/* ------------------------------------------------------------------ */
/* Work queues                                                         */
/* ------------------------------------------------------------------ */

const PENDING_APPROVAL_STATUSES: ApprovalStatus[] = ['Requested', 'In Review', 'Escalated'];

export interface ApprovalQueueItem {
  approval: Approval;
  /** Readable title of the approval's subject entity. */
  subjectTitle: string;
}

/** Best human-readable name on a row, falling back to its id. */
export function displayTitle(row: Row | undefined): string {
  if (!row) return 'Unknown item';
  // `headline` is a coverage item's natural name; without it a press hit renders
  // as "COV-026". Ordered last so it only applies to rows carrying no other name.
  for (const key of ['title', 'name', 'subject', 'filename', 'headline']) {
    const v = row[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return row.id;
}

/** Pending approvals assigned to a stakeholder, joined with subject titles, due-date order. */
export function myApprovals(db: SeedDB, stakeholderId: string): ApprovalQueueItem[] {
  const byEntity = new Map<EntityName, Row[]>(collections(db));
  return db.approvals
    .filter(
      (a) =>
        a.approverStakeholderId === stakeholderId &&
        PENDING_APPROVAL_STATUSES.includes(a.status),
    )
    .map((approval) => ({
      approval,
      subjectTitle: displayTitle(
        byEntity.get(approval.subjectEntity)?.find((r) => r.id === approval.subjectId),
      ),
    }))
    .sort((a, b) => a.approval.slaDueAt.localeCompare(b.approval.slaDueAt, DEFAULT_LOCALE));
}

/**
 * Activities of in-scope campaigns whose window overlaps [TODAY, TODAY + days),
 * for the calendar strip. Default horizon: 14 days from 2026-08-13.
 */
export function upcomingActivities(db: SeedDB, scope: Scope, days = 14): CampaignActivity[] {
  const windowStart = Date.parse(TODAY);
  const windowEnd = windowStart + days * 24 * 60 * 60 * 1000;
  const campaignIds = new Set(campaignsInScope(db, scope).map((c) => c.id));

  return db.campaignActivities
    .filter((a) => {
      if (!campaignIds.has(a.campaignId)) return false;
      const start = Date.parse(a.startDate);
      const end = Date.parse(a.endDate);
      return start < windowEnd && end >= windowStart;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE));
}

/** Count of unread notifications for a stakeholder (badge number). */
export function unreadNotificationCount(db: SeedDB, stakeholderId: string): number {
  return db.notifications.filter((n) => n.recipientStakeholderId === stakeholderId && !n.read)
    .length;
}

/** Seeded population of a segment (0 if the segment is unknown). */
export function segmentSize(db: SeedDB, segmentId: string): number {
  return db.segments.find((s) => s.id === segmentId)?.population ?? 0;
}
