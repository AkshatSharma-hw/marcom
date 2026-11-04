/**
 * Brand to Demand lifecycle placement (UI change instructions item 10).
 *
 * No entity carries a stage column — a record's stage is *derived* from its
 * status, which keeps the stepper honest: it always reflects the record's real
 * state rather than a second field that can drift out of step with it.
 *
 * The eight stages and their order mirror `seedLifecycleStages` in
 * src/data/seed/module.ts and the sidebar grouping in AppSidebar.tsx.
 */

import type { EntityName, LifecycleStageKey } from '@/data/types';

export const LIFECYCLE_ORDER: readonly LifecycleStageKey[] = [
  'govern',
  'understand',
  'plan',
  'create',
  'comply',
  'activate',
  'measure',
  'learn',
] as const;

export const LIFECYCLE_LABELS: Record<LifecycleStageKey, string> = {
  govern: 'Govern',
  understand: 'Understand',
  plan: 'Plan',
  create: 'Create',
  comply: 'Comply',
  activate: 'Activate',
  measure: 'Measure',
  learn: 'Learn',
};

/**
 * Status → stage, per entity family. Keys are lowercased status strings so the
 * table survives the casing inconsistencies the status taxonomy pass is fixing
 * (`sent` vs `Sent`).
 */
const STAGE_BY_STATUS: Partial<Record<EntityName, Record<string, LifecycleStageKey>>> = {
  // CampaignStatus
  Campaign: {
    draft: 'plan',
    planned: 'plan',
    'in approval': 'comply',
    approved: 'comply',
    live: 'activate',
    paused: 'activate',
    completed: 'measure',
    cancelled: 'measure',
    archived: 'learn',
  },
  // CampaignActivityStatus
  CampaignActivity: {
    planned: 'plan',
    blocked: 'comply',
    'in progress': 'activate',
    completed: 'measure',
  },
  // ContentStatus
  Content: {
    draft: 'create',
    rework: 'create',
    'in review': 'comply',
    approved: 'activate',
    published: 'activate',
    retired: 'learn',
    archived: 'learn',
    discarded: 'learn',
  },
  // CommunicationStatus
  Communication: {
    idea: 'plan',
    briefed: 'plan',
    drafting: 'create',
    rework: 'create',
    'in review': 'comply',
    approved: 'comply',
    scheduled: 'activate',
    live: 'activate',
    paused: 'activate',
    completed: 'measure',
    archived: 'learn',
    killed: 'learn',
  },
  // AssetStatus
  Asset: {
    uploaded: 'create',
    cataloged: 'activate',
    approved: 'activate',
    'in use': 'activate',
    expired: 'govern',
    rejected: 'create',
    archived: 'learn',
  },
  // IdeaStatus
  Idea: {
    draft: 'plan',
    scored: 'plan',
    approved: 'plan',
    promoted: 'plan',
    parked: 'plan',
    archived: 'learn',
  },
  // BriefStatus
  Brief: {
    draft: 'plan',
    'in review': 'comply',
    approved: 'create',
  },
  // ChannelExecutionStatus (lowercase in the data)
  ChannelExecution: {
    draft: 'create',
    queued: 'activate',
    sending: 'activate',
    sent: 'activate',
    failed: 'activate',
  },
};

/** Entities whose stage does not depend on status at all. */
const FIXED_STAGE: Partial<Record<EntityName, LifecycleStageKey>> = {
  Brand: 'govern',
  Policy: 'govern',
  LegalClause: 'govern',
  CrisisIncident: 'govern',
  // A version carries no status of its own — the head Content record does — but
  // producing a cut of the copy IS the Create stage. Left unplaced, a content
  // record's own versions were counted by the relationship chips and then
  // appeared under no stage at all.
  ContentVersion: 'create',
  Audience: 'understand',
  Segment: 'understand',
  CustomerPersona: 'understand',
  MarketSizing: 'understand',
  Budget: 'plan',
  // A strategy is objectives and horizon — planning substance that campaigns
  // ladder to. Left unplaced, a campaign's own strategy was dropped from its
  // stage breakdown even though the record is right there in the graph.
  Strategy: 'plan',
  KPI: 'measure',
  // Earned coverage is the outcome of activation, not the act of it: a headline
  // in an outlet is evidence, which is what Measure holds. The relationship
  // chips already count these ("3 coverage items"), so leaving them unplaced
  // meant the two lines on the same header disagreed about the same records.
  CoverageItem: 'measure',
  MetricResult: 'measure',
  Approval: 'comply',
  Journey: 'activate',
  PlaybookPattern: 'learn',
};

/**
 * Where a record currently sits in the lifecycle, or null when the entity has
 * no meaningful placement. Returning null is deliberate — a stepper that
 * guesses is worse than no stepper.
 */
export function lifecycleStageFor(
  entity: EntityName,
  status?: string,
): LifecycleStageKey | null {
  const fixed = FIXED_STAGE[entity];
  if (fixed) return fixed;

  const table = STAGE_BY_STATUS[entity];
  if (!table || !status) return null;
  return table[status.trim().toLowerCase()] ?? null;
}

/** Index of a stage in the canonical order, for completed/current/future styling. */
export function lifecycleIndex(stage: LifecycleStageKey): number {
  return LIFECYCLE_ORDER.indexOf(stage);
}
