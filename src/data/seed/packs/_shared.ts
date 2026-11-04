/**
 * The pack-invariant seed layer.
 *
 * A demo pack changes the *domain language* of the data — brands, campaigns,
 * regulators, assets — and nothing else. Everything in this file is the part
 * that must be byte-identical across packs, because it is what the product's
 * behaviour is defined against rather than what the demo is about:
 *
 *  - **Workflows and workflow stages** — the approval machinery, including SLA
 *    hours and which role owns each gate.
 *  - **Roles** — the `AppRole` union in `../../types`. Not data; every pack
 *    seeds exactly one stakeholder per role so the persona switcher is
 *    complete in all of them.
 *  - **Channel types** — the `ChannelKind` union, plus the six concrete
 *    channels and their hard delivery constraints.
 *  - **Status taxonomy** — the status unions in `../../types`, documented in
 *    `docs/STATE_TAXONOMY.md`. Not data either; what matters is that every
 *    pack seeds the same *set* of states (see `docs/DEMO_PACKS.md` §4).
 *  - **Operating model** — the eight lifecycle stages and the A1..A8 agent
 *    roster, which describe how the function runs rather than what it sells.
 *  - **Positioning frameworks** — reference prompts a strategist fills in.
 *
 * These are re-exported from the default pack's modules rather than copied.
 * Copying would let the packs drift, and a workflow that differs between packs
 * is exactly the kind of divergence that hides a bug in one pack while it is
 * visible in another.
 *
 * Two things are *added* on top of the default pack's versions, because every
 * pack in the specification needs them and the default dataset predates both:
 *
 *  1. `REG-MENA` — a fourth operating region. Every pack carries a MENA thread.
 *  2. `WF-005` — the crisis-response workflow: parallel approvals on a
 *     30-minute SLA, pre-delegated to the crisis lead.
 */

import type {
  Channel,
  ChannelConstraint,
  LifecycleStage,
  MarcomAgent,
  PositioningFramework,
  Region,
  Workflow,
  WorkflowStage,
} from '../../types';
import { seedRegions } from '../org';
import { seedChannels, seedChannelConstraints } from '../communications';
import { seedWorkflows, seedWorkflowStages } from '../governance';
import { seedLifecycleStages, seedMarcomAgents } from '../module';
import { seedPositioningFrameworks } from '../planning';

/* ------------------------------------------------------------------ */
/* Regions                                                             */
/* ------------------------------------------------------------------ */

/**
 * MENA is separated from EMEA rather than folded into it. Every pack is
 * required to carry a MENA/Arabic thread, and a region that a campaign, a
 * jurisdiction and an Arabic content version can all point at is the only way
 * that thread is visible in scope filters rather than merely asserted in copy.
 */
export const REGION_MENA: Region = {
  id: 'REG-MENA',
  name: 'Middle East & North Africa',
  code: 'MENA',
  createdAt: '2025-11-03T09:45:00Z',
  updatedAt: '2025-11-03T09:45:00Z',
};

/** AMER · EMEA · MENA · APAC — the operating regions every pack works in. */
export const sharedRegions: readonly Region[] = Object.freeze([
  ...seedRegions,
  REGION_MENA,
]);

/** Convenience: every region id, in the order above. */
export const ALL_REGION_IDS: readonly string[] = sharedRegions.map((r) => r.id);

/* ------------------------------------------------------------------ */
/* Workflows                                                           */
/* ------------------------------------------------------------------ */

const CRISIS_WF_CREATED = '2026-01-10T09:15:00Z';

/**
 * Crisis response runs on a different shape from every other approval path:
 * the two clearances run *in parallel* rather than in sequence, the SLA is
 * half an hour rather than a day, and authority is pre-delegated to the crisis
 * lead so nobody is waiting on a calendar. Seeded as a real workflow so a
 * crisis approval resolves to a stage with a real SLA, not to a special case.
 */
export const CRISIS_WORKFLOW: Workflow = {
  id: 'WF-005',
  name: 'Crisis response clearance',
  appliesTo: 'CrisisIncident',
  version: 1,
  stageIds: ['WFS-016', 'WFS-017'],
  slaHours: 1,
  createdAt: CRISIS_WF_CREATED,
  updatedAt: CRISIS_WF_CREATED,
};

export const CRISIS_WORKFLOW_STAGES: readonly WorkflowStage[] = Object.freeze([
  {
    id: 'WFS-016',
    workflowId: 'WF-005',
    order: 1,
    name: 'Crisis lead clearance',
    mode: 'parallel-group',
    assigneeRole: 'Corporate Comms Manager',
    // 30 minutes. Authority is pre-delegated to the crisis lead for the
    // duration of the incident, which is what makes half an hour honest
    // rather than aspirational.
    slaHours: 0.5,
    automation: null,
    createdAt: CRISIS_WF_CREATED,
    updatedAt: CRISIS_WF_CREATED,
  },
  {
    id: 'WFS-017',
    workflowId: 'WF-005',
    order: 2,
    name: 'Legal & regulatory clearance',
    mode: 'parallel-group',
    assigneeRole: 'Legal/Compliance Reviewer',
    slaHours: 0.5,
    automation: null,
    createdAt: CRISIS_WF_CREATED,
    updatedAt: CRISIS_WF_CREATED,
  },
]);

/** Every workflow, in every pack. */
export const sharedWorkflows: readonly Workflow[] = Object.freeze([
  ...seedWorkflows,
  CRISIS_WORKFLOW,
]);

/** Every workflow stage, in every pack. */
export const sharedWorkflowStages: readonly WorkflowStage[] = Object.freeze([
  ...seedWorkflowStages,
  ...CRISIS_WORKFLOW_STAGES,
]);

/* ------------------------------------------------------------------ */
/* Channels                                                            */
/* ------------------------------------------------------------------ */

/** Channel ids, so a pack can name an owner without repeating the string. */
export const CHANNEL_IDS = Object.freeze({
  email: 'CHN-001',
  social: 'CHN-002',
  web: 'CHN-003',
  press: 'CHN-004',
  intranet: 'CHN-005',
  event: 'CHN-006',
} as const);

/** Who owns each channel in this pack, keyed by channel id. */
export type ChannelOwnerMap = Readonly<Record<string, string>>;

/**
 * The six channels, bound to a pack's own stakeholders and regions.
 *
 * The channel *definitions* — kind, adapter key, capabilities — are invariant;
 * only who runs them and where they reach is a pack decision. A pack that
 * needs a narrower footprint for one channel (a press wire that does not carry
 * MENA, say) maps over the result rather than redefining the channel.
 */
export function sharedChannels(
  ownerByChannelId: ChannelOwnerMap,
  regionIds: readonly string[],
): Channel[] {
  return seedChannels.map((channel) => {
    const ownerStakeholderId = ownerByChannelId[channel.id];
    if (!ownerStakeholderId) {
      throw new Error(
        `[packs/_shared] sharedChannels: no owner given for ${channel.id} (${channel.name}). Every channel needs a named owner — an unowned channel produces a delivery surface nobody is accountable for.`,
      );
    }
    return { ...channel, ownerStakeholderId, regionIds: [...regionIds] };
  });
}

/**
 * Hard delivery limits per channel. Pack-invariant: a subject line truncates
 * at the same character count whichever industry wrote it.
 */
export const sharedChannelConstraints: readonly ChannelConstraint[] =
  Object.freeze([...seedChannelConstraints]);

/* ------------------------------------------------------------------ */
/* Operating model & reference data                                    */
/* ------------------------------------------------------------------ */

/** The eight lifecycle stages, in order. */
export const sharedLifecycleStages: readonly LifecycleStage[] = Object.freeze([
  ...seedLifecycleStages,
]);

/** The A1..A8 agent roster. */
export const sharedMarcomAgents: readonly MarcomAgent[] = Object.freeze([...seedMarcomAgents]);

/** The four positioning frameworks a strategist can work in. */
export const sharedPositioningFrameworks: readonly PositioningFramework[] = Object.freeze([
  ...seedPositioningFrameworks,
]);

/* ------------------------------------------------------------------ */
/* Relative-date seeding                                               */
/* ------------------------------------------------------------------ */

/**
 * Every pack seeds dates as offsets from one anchor, never as literals, so the
 * demo does not rot: an asset seeded to expire on a fixed date stops being
 * "expiring soon" the month after it is written, and the state coverage the
 * pack promises quietly disappears.
 *
 * The anchor is the app's demo clock, `TODAY` in
 * `src/data/selectors/campaignSelectors.ts`. It is duplicated here as a string
 * rather than imported so that the seed layer keeps no dependency on the
 * selector layer; `assertPackAnchor` below is the guard against the two
 * drifting apart, and every pack calls it at module load.
 */
export const PACK_ANCHOR = '2026-08-13';

const ANCHOR_MS = Date.parse(`${PACK_ANCHOR}T00:00:00Z`);
const DAY_MS = 86_400_000;

/** ISO date (`YYYY-MM-DD`) `offset` days from the anchor. */
export function packDate(offset: number): string {
  return new Date(ANCHOR_MS + offset * DAY_MS).toISOString().slice(0, 10);
}

/** ISO 8601 timestamp `offset` days from the anchor, at `hhmm` UTC. */
export function packAt(offset: number, hhmm = '09:00'): string {
  return `${packDate(offset)}T${hhmm}:00Z`;
}

/**
 * Fails loudly if a pack's anchor no longer matches the app's demo clock.
 * Called at pack module load. Without it the drift is silent and shows up as
 * a demo where nothing is "due this week" and no asset is expiring.
 */
export function assertPackAnchor(today: string): void {
  if (today !== PACK_ANCHOR) {
    throw new Error(
      `[packs/_shared] Pack anchor '${PACK_ANCHOR}' no longer matches the app clock '${today}'. Update PACK_ANCHOR in src/data/seed/packs/_shared.ts to match TODAY in src/data/selectors/campaignSelectors.ts — every pack date is an offset from it.`,
    );
  }
}

/**
 * The ten ISO week-start Mondays the metric grid reports on, oldest first.
 * The anchor falls inside the last of them, so the final week is partial —
 * which is why its rollup timestamp lands before the anchor rather than after.
 */
export const METRIC_WEEK_OFFSETS: readonly number[] = Object.freeze([
  -66, -59, -52, -45, -38, -31, -24, -17, -10, -3,
]);

/** Rollup timestamps for `METRIC_WEEK_OFFSETS`, one per week. */
export const METRIC_ROLLUP_OFFSETS: readonly number[] = Object.freeze([
  -59, -52, -45, -38, -31, -24, -17, -10, -3, -1,
]);
