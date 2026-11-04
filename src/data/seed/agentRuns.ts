/**
 * Agent execution ledger — one row per execution of one agent against one
 * record (`AgentRun`, ids `ARN-001`..`ARN-040`).
 *
 * This file is the evidence behind every "an agent did this" statement in the
 * product. Three rules govern it, and breaking any of them makes the ledger a
 * decoration rather than a record:
 *
 *  1. `agentId` is always a real `MarcomAgent` from `./module.ts`, and
 *     `subjectId` is always a real record of `subjectEntity`. `assertAllLinksResolve`
 *     in `./index.ts` enforces both.
 *  2. A run only claims `producedEntity`/`producedId` when that record genuinely
 *     exists AND genuinely carries agent provenance. Every produced record here
 *     is one of the fifteen `ContentVersion`s in `./content.ts` whose
 *     `provenance.source` is `ai-draft`, `variant` or `localization` — the runs
 *     and the provenance trail describe the same events from two directions.
 *  3. Nothing here is a summary statistic. Counts, acceptance and agent status
 *     are derived in `selectors/agentRunSelectors.ts` from these rows; no row
 *     carries a precomputed rate, and none ever should.
 *
 * Timestamps are anchored on the demo date 2026-08-13 and sit inside the
 * lifetime of their subject: a localization run finishes at the exact minute the
 * version it produced was created, a review run lands just before the content it
 * reviewed was last updated, and nothing finishes in the future.
 *
 * Optionality is meaningful, not incidental:
 *  - `queued` and `running` rows have no `finishedAt`, `outcomeSummary` or
 *    `confidence` — there is no outcome yet to describe or be certain about.
 *  - `failed` rows carry an `error` in place of an outcome.
 *  - Mechanical runs (channel fan-out, metric rollups, copilot intent routing)
 *    carry no `confidence`: their output is arithmetic or a lookup, not a
 *    judgement, and a certainty score on them would be noise.
 */

import type { AgentRun, AgentRunStatus, EntityName } from '../types';

/* ------------------------------------------------------------------ */
/* Row builder                                                         */
/* ------------------------------------------------------------------ */

interface RunSpec {
  id: string;
  agentId: string;
  subjectEntity: EntityName;
  subjectId: string;
  status: AgentRunStatus;
  startedAt: string;
  finishedAt?: string;
  outcomeSummary?: string;
  confidence?: number;
  ruleSetVersion?: string;
  error?: string;
  producedEntity?: EntityName;
  producedId?: string;
  triggeredByStakeholderId?: string;
}

/**
 * `createdAt` is the moment the run was recorded (its start / enqueue), and
 * `updatedAt` is the last time the row changed — its finish, or its start while
 * it is still in flight. Neither is invented separately from the execution.
 */
function run(spec: RunSpec): AgentRun {
  const { startedAt, finishedAt } = spec;
  return {
    ...spec,
    createdAt: startedAt,
    updatedAt: finishedAt ?? startedAt,
  };
}

/* Rule-set / generator revisions, one per agent that runs a rule set. */
const RS_BRAND = 'brand-guardrails-2026.07';
const RS_MARKET = 'market-scan-2026.06';
const RS_PLANNING = 'idea-scoring-2026.05';
const RS_STUDIO = 'content-studio-2026.06';
const RS_COMMS = 'comms-classification-2026.07';
const RS_ORCHESTRATION = 'orchestration-2026.08';
const RS_ANALYTICS = 'rollup-2026.07';
const RS_COPILOT = 'copilot-intents-2026.08';

/* ------------------------------------------------------------------ */
/* AGT-A1 · Brand Governance — brand & compliance checks               */
/* ------------------------------------------------------------------ */

/**
 * A1 produces no persisted record here: the app's `AIReview` collection is
 * runtime-only and seeded empty, so these runs record the check and its verdict
 * without claiming an artifact that does not exist.
 */
const a1Runs: AgentRun[] = [
  run({
    id: 'ARN-001',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-008',
    status: 'succeeded',
    startedAt: '2026-08-06T11:00:00Z',
    finishedAt: '2026-08-06T11:01:00Z',
    outcomeSummary:
      'Volt5 global launch press release checked against brand voice and embargo handling; embargo wording held for the legal reviewer rather than cleared.',
    confidence: 0.91,
    ruleSetVersion: RS_BRAND,
    triggeredByStakeholderId: 'STK-005',
  }),
  run({
    id: 'ARN-002',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-017',
    status: 'succeeded',
    startedAt: '2026-08-11T16:36:00Z',
    finishedAt: '2026-08-11T16:37:00Z',
    outcomeSummary:
      'Findings raised on Volt brand voice and on an unsubstantiated performance claim; the block-level finding holds approval until a named approver clears it.',
    confidence: 0.94,
    ruleSetVersion: RS_BRAND,
    triggeredByStakeholderId: 'STK-005',
  }),
  run({
    id: 'ARN-003',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-057',
    status: 'succeeded',
    startedAt: '2026-08-13T08:18:00Z',
    finishedAt: '2026-08-13T08:19:00Z',
    outcomeSummary:
      'Battery-safety holding statement re-checked after rework; mandated disclaimer now present, tone findings cleared.',
    confidence: 0.9,
    ruleSetVersion: RS_BRAND,
    triggeredByStakeholderId: 'STK-008',
  }),
  run({
    id: 'ARN-004',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-052',
    status: 'running',
    startedAt: '2026-08-13T11:55:00Z',
    ruleSetVersion: RS_BRAND,
    triggeredByStakeholderId: 'STK-008',
  }),
];

/* ------------------------------------------------------------------ */
/* AGT-A2 · Market Intelligence — competitor & share-of-voice sweeps   */
/* ------------------------------------------------------------------ */

/**
 * A2's sweeps are read-only: they report on competitors and share of voice
 * without writing to either. The most recent one is ten days before the demo
 * date, which is why `agentStatus` derives `Idle` for this agent rather than a
 * seeded literal.
 */
const a2Runs: AgentRun[] = [
  run({
    id: 'ARN-005',
    agentId: 'AGT-A2',
    subjectEntity: 'Brand',
    subjectId: 'BRD-003',
    status: 'succeeded',
    startedAt: '2026-07-20T07:00:00Z',
    finishedAt: '2026-07-20T07:06:00Z',
    outcomeSummary:
      'Share-of-voice read recut for Volt against the tracked competitor set for the quarter.',
    confidence: 0.74,
    ruleSetVersion: RS_MARKET,
    triggeredByStakeholderId: 'STK-001',
  }),
  run({
    id: 'ARN-006',
    agentId: 'AGT-A2',
    subjectEntity: 'Competitor',
    subjectId: 'CPT-003',
    status: 'succeeded',
    startedAt: '2026-07-27T07:00:00Z',
    finishedAt: '2026-07-27T07:04:00Z',
    outcomeSummary:
      'HelioGrid activity swept for launches, pricing and partnership moves against the GridWorks focus brand.',
    confidence: 0.69,
    ruleSetVersion: RS_MARKET,
    triggeredByStakeholderId: 'STK-001',
  }),
  run({
    id: 'ARN-007',
    agentId: 'AGT-A2',
    subjectEntity: 'Competitor',
    subjectId: 'CPT-001',
    status: 'succeeded',
    startedAt: '2026-08-03T07:00:00Z',
    finishedAt: '2026-08-03T07:05:00Z',
    outcomeSummary:
      'Northvolt Dynamics swept ahead of the Volt5 launch window; moves recorded against the Volt focus brand.',
    confidence: 0.72,
    ruleSetVersion: RS_MARKET,
    triggeredByStakeholderId: 'STK-001',
  }),
];

/* ------------------------------------------------------------------ */
/* AGT-A3 · Planning — idea scoring & campaign proposals               */
/* ------------------------------------------------------------------ */

/**
 * A proposal is a proposal: none of these runs created a campaign, so none of
 * them claims a produced record. The failure is load-bearing — it is why
 * IDE-017 still carries a score of 0 in `./strategy.ts`.
 */
const a3Runs: AgentRun[] = [
  run({
    id: 'ARN-008',
    agentId: 'AGT-A3',
    subjectEntity: 'Idea',
    subjectId: 'IDE-011',
    status: 'succeeded',
    startedAt: '2026-07-14T11:15:00Z',
    finishedAt: '2026-07-14T11:17:00Z',
    outcomeSummary:
      'Partner co-op marketing marketplace scored and returned as an editable campaign proposal; no campaign created.',
    confidence: 0.74,
    ruleSetVersion: RS_PLANNING,
    triggeredByStakeholderId: 'STK-004',
  }),
  run({
    id: 'ARN-009',
    agentId: 'AGT-A3',
    subjectEntity: 'Idea',
    subjectId: 'IDE-002',
    status: 'succeeded',
    startedAt: '2026-07-21T09:40:00Z',
    finishedAt: '2026-07-21T09:42:00Z',
    outcomeSummary:
      'Solara energy-saving autumn stories scored and proposed with a channel mix and KPI suggestions for a planner to edit.',
    confidence: 0.79,
    ruleSetVersion: RS_PLANNING,
    triggeredByStakeholderId: 'STK-004',
  }),
  run({
    id: 'ARN-010',
    agentId: 'AGT-A3',
    subjectEntity: 'Idea',
    subjectId: 'IDE-010',
    status: 'succeeded',
    startedAt: '2026-07-28T13:50:00Z',
    finishedAt: '2026-07-28T13:52:00Z',
    outcomeSummary:
      'Trade-in valuation guarantee scored against comparable Volt campaigns; proposal returned for a planner to accept or reject.',
    confidence: 0.83,
    ruleSetVersion: RS_PLANNING,
    triggeredByStakeholderId: 'STK-004',
  }),
  run({
    id: 'ARN-011',
    agentId: 'AGT-A3',
    subjectEntity: 'Idea',
    subjectId: 'IDE-017',
    status: 'failed',
    startedAt: '2026-08-11T08:35:00Z',
    finishedAt: '2026-08-11T08:35:12Z',
    error:
      'Scoring aborted: no comparable campaign exists for a repair-and-reuse proposition in Consumer Devices, so the reach and conversion inputs the score depends on are missing. The idea was left unscored rather than given a guessed score.',
    ruleSetVersion: RS_PLANNING,
    triggeredByStakeholderId: 'STK-004',
  }),
];

/* ------------------------------------------------------------------ */
/* AGT-A4 · Content Studio — drafts, variants and localizations        */
/* ------------------------------------------------------------------ */

/**
 * Every succeeded run below produced exactly one `ContentVersion` that exists in
 * `./content.ts` with matching `provenance`: the two `ai-draft` versions, the
 * two persona/channel `variant` versions, and the eleven `localization`
 * versions. `finishedAt` equals the produced version's `createdAt` — the run and
 * the artifact are the same event.
 */
const a4Runs: AgentRun[] = [
  /* --- Variants (provenance.source = 'variant') --------------------- */
  run({
    id: 'ARN-012',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-003',
    status: 'succeeded',
    startedAt: '2026-07-18T11:28:00Z',
    finishedAt: '2026-07-18T11:30:00Z',
    outcomeSummary:
      'Social variant written for Upgrade-ready Uma and checked against the Paid & Organic Social character limit before it was saved.',
    confidence: 0.82,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-004',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-013',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-005',
    status: 'succeeded',
    startedAt: '2026-07-24T08:57:00Z',
    finishedAt: '2026-07-24T09:00:00Z',
    outcomeSummary:
      'Email variant written for Waitlisted Wei, leading on launch-day delivery certainty.',
    confidence: 0.85,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-006',
    triggeredByStakeholderId: 'STK-003',
  }),

  /* --- AI drafts from an approved brief (source = 'ai-draft') ------- */
  run({
    id: 'ARN-014',
    agentId: 'AGT-A4',
    subjectEntity: 'Brief',
    subjectId: 'BRF-008',
    status: 'succeeded',
    startedAt: '2026-08-06T10:18:00Z',
    finishedAt: '2026-08-06T10:20:00Z',
    outcomeSummary:
      'Month-one onboarding email drafted for Solara everyday-home owners and flagged as AI-generated.',
    confidence: 0.71,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-022',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-015',
    agentId: 'AGT-A4',
    subjectEntity: 'Brief',
    subjectId: 'BRF-001',
    status: 'succeeded',
    startedAt: '2026-08-07T10:08:00Z',
    finishedAt: '2026-08-07T10:10:00Z',
    outcomeSummary:
      'Autumn teaser copy drafted for Solara from the brief and flagged as AI-generated; left in Draft for a person to take forward.',
    confidence: 0.68,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-014',
    triggeredByStakeholderId: 'STK-003',
  }),

  /* --- Localizations (source = 'localization') ---------------------- */
  run({
    id: 'ARN-016',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-002',
    status: 'succeeded',
    startedAt: '2026-07-09T10:38:00Z',
    finishedAt: '2026-07-09T10:40:00Z',
    outcomeSummary:
      'Volt4 clearance email transcreated into Arabic (ar-SA) for EMEA, right-to-left, with the KSA promotion-terms exposure carried over.',
    confidence: 0.89,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-019',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-017',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-002',
    status: 'succeeded',
    startedAt: '2026-07-09T10:48:00Z',
    finishedAt: '2026-07-09T10:50:00Z',
    outcomeSummary: 'Volt4 clearance email transcreated into French (fr-FR) for EMEA.',
    confidence: 0.92,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-092',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-018',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-002',
    status: 'succeeded',
    startedAt: '2026-07-09T10:53:00Z',
    finishedAt: '2026-07-09T10:55:00Z',
    outcomeSummary:
      'Volt4 clearance email transcreated into Japanese (ja-JP) for APAC, with the tighter prize-value framing applied.',
    confidence: 0.87,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-094',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-019',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-041',
    status: 'succeeded',
    startedAt: '2026-07-30T08:28:00Z',
    finishedAt: '2026-07-30T08:30:00Z',
    outcomeSummary: 'Volt5 teaser social flight transcreated into Arabic (ar-SA) for EMEA.',
    confidence: 0.9,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-042',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-020',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-008',
    status: 'succeeded',
    startedAt: '2026-08-07T09:13:00Z',
    finishedAt: '2026-08-07T09:15:00Z',
    outcomeSummary:
      'Volt5 global launch press release transcreated into Arabic (ar-SA) for EMEA.',
    confidence: 0.9,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-018',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-021',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-008',
    status: 'succeeded',
    startedAt: '2026-08-07T09:23:00Z',
    finishedAt: '2026-08-07T09:25:00Z',
    outcomeSummary: 'Volt5 global launch press release transcreated into French (fr-FR) for EMEA.',
    confidence: 0.93,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-091',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-022',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-008',
    status: 'succeeded',
    startedAt: '2026-08-07T09:28:00Z',
    finishedAt: '2026-08-07T09:30:00Z',
    outcomeSummary:
      'Volt5 global launch press release transcreated into Japanese (ja-JP) for APAC.',
    confidence: 0.88,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-093',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-023',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-052',
    status: 'succeeded',
    startedAt: '2026-08-10T11:28:00Z',
    finishedAt: '2026-08-10T11:30:00Z',
    outcomeSummary: 'Volt5 APAC launch press release transcreated into Arabic (ar-SA) for EMEA.',
    confidence: 0.88,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-053',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-024',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-046',
    status: 'succeeded',
    startedAt: '2026-08-11T09:38:00Z',
    finishedAt: '2026-08-11T09:40:00Z',
    outcomeSummary: 'Volt5 spec comparison page transcreated into Arabic (ar-SA) for EMEA.',
    confidence: 0.86,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-047',
    triggeredByStakeholderId: 'STK-003',
  }),
  run({
    id: 'ARN-025',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-079',
    status: 'succeeded',
    startedAt: '2026-08-11T10:18:00Z',
    finishedAt: '2026-08-11T10:20:00Z',
    outcomeSummary: 'Sustainability pledge press release transcreated into Arabic (ar-SA) for EMEA.',
    confidence: 0.9,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-080',
    triggeredByStakeholderId: 'STK-002',
  }),
  run({
    id: 'ARN-026',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-049',
    status: 'succeeded',
    startedAt: '2026-08-12T08:13:00Z',
    finishedAt: '2026-08-12T08:15:00Z',
    outcomeSummary: 'Volt5 pre-order reminder email transcreated into Arabic (ar-SA) for EMEA.',
    confidence: 0.91,
    ruleSetVersion: RS_STUDIO,
    producedEntity: 'ContentVersion',
    producedId: 'CV-050',
    triggeredByStakeholderId: 'STK-003',
  }),

  /* --- The one that did not produce anything ------------------------ */
  run({
    id: 'ARN-027',
    agentId: 'AGT-A4',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-016',
    status: 'failed',
    startedAt: '2026-07-16T14:05:00Z',
    finishedAt: '2026-07-16T14:05:31Z',
    error:
      'Localization aborted after two attempts: the controlled lexicon has no approved ar-SA rendering for the promotional terms on this page, and the transcreation will not invent one. No version was written.',
    ruleSetVersion: RS_STUDIO,
    triggeredByStakeholderId: 'STK-003',
  }),
];

/* ------------------------------------------------------------------ */
/* AGT-A5 · Corporate Communication                                    */
/* ------------------------------------------------------------------ */

const a5Runs: AgentRun[] = [
  run({
    id: 'ARN-028',
    agentId: 'AGT-A5',
    subjectEntity: 'Communication',
    subjectId: 'COM-007',
    status: 'succeeded',
    startedAt: '2026-08-11T10:28:00Z',
    finishedAt: '2026-08-11T10:30:00Z',
    outcomeSummary:
      'CEO mid-year update assessed for classification and audience fit; held at Internal rather than raised to Public.',
    confidence: 0.77,
    ruleSetVersion: RS_COMMS,
    triggeredByStakeholderId: 'STK-002',
  }),
  run({
    id: 'ARN-029',
    agentId: 'AGT-A5',
    subjectEntity: 'CrisisIncident',
    subjectId: 'CRI-001',
    status: 'succeeded',
    startedAt: '2026-08-11T14:05:00Z',
    finishedAt: '2026-08-11T14:07:00Z',
    outcomeSummary:
      'Battery overheating incident triaged on declaration: severity and classification proposed and a war-room roster assembled for the Corporate Comms Manager to confirm.',
    confidence: 0.86,
    ruleSetVersion: RS_COMMS,
    triggeredByStakeholderId: 'STK-002',
  }),
  run({
    id: 'ARN-030',
    agentId: 'AGT-A5',
    subjectEntity: 'Communication',
    subjectId: 'COM-039',
    status: 'succeeded',
    startedAt: '2026-08-11T15:50:00Z',
    finishedAt: '2026-08-11T15:52:00Z',
    outcomeSummary:
      'Holding statement assembled for the battery-safety incident at Restricted classification; sent to a reviewer, not published.',
    confidence: 0.8,
    ruleSetVersion: RS_COMMS,
    triggeredByStakeholderId: 'STK-002',
  }),
];

/* ------------------------------------------------------------------ */
/* AGT-A6 · Campaign Orchestration                                     */
/* ------------------------------------------------------------------ */

/**
 * Fan-out and scheduling are mechanical, so those runs carry no `confidence`.
 * The failure is the one recorded in the seed as `ChannelExecution` CHX-075,
 * which is still sitting at status `failed` in `./communications.ts`.
 */
const a6Runs: AgentRun[] = [
  run({
    id: 'ARN-031',
    agentId: 'AGT-A6',
    subjectEntity: 'ChannelExecution',
    subjectId: 'CHX-075',
    status: 'failed',
    startedAt: '2026-08-03T07:00:00Z',
    finishedAt: '2026-08-03T07:09:00Z',
    error:
      'Publish rejected by the corporate web adapter: the target page path is locked by an in-flight release. The channel execution was left at status "failed" for a person to retry rather than silently rescheduled.',
    ruleSetVersion: RS_ORCHESTRATION,
    triggeredByStakeholderId: 'STK-002',
  }),
  run({
    id: 'ARN-032',
    agentId: 'AGT-A6',
    subjectEntity: 'Communication',
    subjectId: 'COM-041',
    status: 'succeeded',
    startedAt: '2026-08-12T14:32:00Z',
    finishedAt: '2026-08-12T14:36:00Z',
    outcomeSummary:
      'Launch-day employee brief fanned out to its intranet execution and queued against the scheduled send window.',
    ruleSetVersion: RS_ORCHESTRATION,
    triggeredByStakeholderId: 'STK-007',
  }),
  run({
    id: 'ARN-033',
    agentId: 'AGT-A6',
    subjectEntity: 'Communication',
    subjectId: 'COM-036',
    status: 'succeeded',
    startedAt: '2026-08-12T16:36:00Z',
    finishedAt: '2026-08-12T16:46:00Z',
    outcomeSummary:
      'Volt5 pre-order reminder fanned out to its email and social executions; suppression and per-channel consent applied before queueing.',
    ruleSetVersion: RS_ORCHESTRATION,
    triggeredByStakeholderId: 'STK-004',
  }),
  run({
    id: 'ARN-034',
    agentId: 'AGT-A6',
    subjectEntity: 'Journey',
    subjectId: 'JRN-005',
    status: 'succeeded',
    startedAt: '2026-08-12T16:48:00Z',
    finishedAt: '2026-08-12T16:50:00Z',
    outcomeSummary:
      'Launch countdown journey re-validated: every send node resolves to an approved communication and no branch leaves the audience without an exit.',
    confidence: 0.83,
    ruleSetVersion: RS_ORCHESTRATION,
    triggeredByStakeholderId: 'STK-004',
  }),
];

/* ------------------------------------------------------------------ */
/* AGT-A7 · Marketing Analytics                                        */
/* ------------------------------------------------------------------ */

/**
 * Rollups are arithmetic over `MetricResult` rows, so they carry no
 * `confidence` — there is nothing to be uncertain about, and a score here would
 * imply doubt the computation does not have.
 */
const a7Runs: AgentRun[] = [
  run({
    id: 'ARN-035',
    agentId: 'AGT-A7',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-003',
    status: 'succeeded',
    startedAt: '2026-08-10T06:00:00Z',
    finishedAt: '2026-08-10T06:04:00Z',
    outcomeSummary:
      'Weekly rollup for the Volt5 5G Launch reconciled against its KPI targets and budget allocation.',
    ruleSetVersion: RS_ANALYTICS,
    triggeredByStakeholderId: 'STK-001',
  }),
  run({
    id: 'ARN-036',
    agentId: 'AGT-A7',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-009',
    status: 'succeeded',
    startedAt: '2026-08-10T06:05:00Z',
    finishedAt: '2026-08-10T06:08:00Z',
    outcomeSummary:
      'Weekly rollup for the Security Resilience Index reconciled against its KPI targets and budget allocation.',
    ruleSetVersion: RS_ANALYTICS,
    triggeredByStakeholderId: 'STK-001',
  }),
  run({
    id: 'ARN-037',
    agentId: 'AGT-A7',
    subjectEntity: 'KPI',
    subjectId: 'KPI-004',
    status: 'succeeded',
    startedAt: '2026-08-12T06:00:00Z',
    finishedAt: '2026-08-12T06:01:00Z',
    outcomeSummary:
      'Pre-order attainment recomputed for Q3-2026 from the metric results recorded to date.',
    ruleSetVersion: RS_ANALYTICS,
    triggeredByStakeholderId: 'STK-001',
  }),
  run({
    id: 'ARN-038',
    agentId: 'AGT-A7',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-010',
    status: 'queued',
    startedAt: '2026-08-13T06:10:00Z',
    ruleSetVersion: RS_ANALYTICS,
    triggeredByStakeholderId: 'STK-001',
  }),
];

/* ------------------------------------------------------------------ */
/* AGT-A8 · MarCom Copilot                                             */
/* ------------------------------------------------------------------ */

/**
 * The copilot routes an intent over the seed graph and cites the records it
 * used. It either matches an intent or says it cannot answer, so there is no
 * meaningful `confidence` to record, and it takes no action on a user's behalf —
 * hence no produced record.
 */
const a8Runs: AgentRun[] = [
  run({
    id: 'ARN-039',
    agentId: 'AGT-A8',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-001',
    status: 'succeeded',
    startedAt: '2026-08-13T09:12:00Z',
    finishedAt: '2026-08-13T09:12:03Z',
    outcomeSummary:
      'Answered why Solara Smart Autumn is not moving, naming the open approvals and the approvers who own them.',
    ruleSetVersion: RS_COPILOT,
    triggeredByStakeholderId: 'STK-004',
  }),
  run({
    id: 'ARN-040',
    agentId: 'AGT-A8',
    subjectEntity: 'Approval',
    subjectId: 'APR-029',
    status: 'succeeded',
    startedAt: '2026-08-13T09:20:00Z',
    finishedAt: '2026-08-13T09:20:02Z',
    outcomeSummary:
      'Explained the escalation: the approval passed its SLA due date and the escalation path routed it to the CMO.',
    ruleSetVersion: RS_COPILOT,
    triggeredByStakeholderId: 'STK-001',
  }),
];

/* ------------------------------------------------------------------ */
/* Collection                                                          */
/* ------------------------------------------------------------------ */

/** The execution ledger, oldest run first. */
export const seedAgentRuns: AgentRun[] = [
  ...a1Runs,
  ...a2Runs,
  ...a3Runs,
  ...a4Runs,
  ...a5Runs,
  ...a6Runs,
  ...a7Runs,
  ...a8Runs,
].sort((a, b) => (a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0));
