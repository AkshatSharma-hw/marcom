/**
 * Seed-data integrity tests (BLUEPRINT.md data-test mandate).
 *
 * Every check derives from the frozen SeedDB and the selector contracts —
 * counts, totals, percentages, and cross-entity relationships. No UI.
 */

import { describe, expect, it } from 'vitest';
import { assertAllLinksResolve, getPackDB, getSeedDB } from '@/data/seed';
import { DEMO_PACKS, type DemoPackId } from '@/lib/demoPack';
import type {
  ApprovalStatus,
  CampaignStatus,
  CommunicationStatus,
  ContentStatus,
  EntityName,
  SeedDB,
} from '@/data/types';
import { lifecycleStageFor } from '@/lib/lifecycle';
import { statusTone } from '@/components/marcomm/StatusBadge';
import {
  campaignsInScope,
  pipelineByStatus,
} from '@/data/selectors/campaignSelectors';
import {
  budgetsPlannedTotal,
  budgetUtilization,
  campaignSpend,
  totalPlannedVsCommitted,
} from '@/data/selectors/budgetSelectors';
import { campaignRoi, kpiSummary, roiSummary } from '@/data/selectors/metricSelectors';
import { TODAY } from '@/data/selectors/campaignSelectors';
import { aiService } from '@/services/ai';

const db = getSeedDB();

/* ------------------------------------------------------------------ */
/* 1. Referential integrity                                            */
/* ------------------------------------------------------------------ */

describe('referential integrity', () => {
  it('assertAllLinksResolve reports zero dangling references', () => {
    expect(assertAllLinksResolve(db)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* 1b. Every pack, not just the active one                             */
/* ------------------------------------------------------------------ */

/**
 * The checks above run against whichever pack the build selected — in CI that
 * is always `default`, so a defect seeded into `renewable`, `cloud` or
 * `lifesciences` would ship unseen. Packs share record SHAPES, so the
 * structural invariants are the same for all four and are worth asserting
 * against all four. Fixture-level assertions stay per-pack (packs/*.test.ts);
 * only invariants that hold by construction belong here.
 */
const ALL_PACK_IDS = Object.keys(DEMO_PACKS) as DemoPackId[];

/**
 * The statuses `StatusBadge` deliberately paints muted — genuinely inert
 * states, nothing in motion and nobody waiting. `statusTone` falls back to
 * muted for anything it does not know, so "muted" alone cannot tell a mapped
 * status from a missing one; this list is what makes the difference visible.
 * A new status that reads as inert when it is not is exactly the drift the
 * assertion below is for.
 */
const INERT_STATUSES = new Set([
  'draft',
  'planned',
  'parked',
  'archived',
  'retired',
  'uploaded',
  'withdrawn',
  'idea',
  'scored',
  'discarded',
  'no data yet',
]);

function hasBadgeTone(status: string): boolean {
  const key = status.trim().toLowerCase();
  return statusTone(key) !== 'muted' || INERT_STATUSES.has(key);
}

describe.each(ALL_PACK_IDS)('pack %s — structural invariants', (packId) => {
  const pack = getPackDB(packId);

  it('has zero dangling references', () => {
    expect(assertAllLinksResolve(pack)).toEqual([]);
  });

  it('has createdAt <= updatedAt on every row', () => {
    for (const { collection, row } of allRows(pack)) {
      const createdAt = row.createdAt as string;
      const updatedAt = row.updatedAt as string;
      expect(typeof createdAt, `${collection} ${row.id} missing createdAt`).toBe('string');
      expect(typeof updatedAt, `${collection} ${row.id} missing updatedAt`).toBe('string');
      expect(
        Date.parse(createdAt) <= Date.parse(updatedAt),
        `${collection} ${row.id} has createdAt ${createdAt} > updatedAt ${updatedAt}`,
      ).toBe(true);
    }
  });

  it('orders every campaign and activity window, and keeps activities inside their campaign', () => {
    const campaignById = new Map(pack.campaigns.map((c) => [c.id, c]));
    for (const campaign of pack.campaigns) {
      expect(
        Date.parse(campaign.startDate) <= Date.parse(campaign.endDate),
        `Campaign ${campaign.id}: ${campaign.startDate} !<= ${campaign.endDate}`,
      ).toBe(true);
    }
    for (const activity of pack.campaignActivities) {
      expect(
        Date.parse(activity.startDate) <= Date.parse(activity.endDate),
        `Activity ${activity.id}: ${activity.startDate} !<= ${activity.endDate}`,
      ).toBe(true);
      const campaign = campaignById.get(activity.campaignId);
      expect(
        campaign,
        `Activity ${activity.id} names unknown campaign ${activity.campaignId}`,
      ).toBeDefined();
      if (!campaign) continue;
      expect(
        Date.parse(activity.startDate) >= Date.parse(campaign.startDate),
        `Activity ${activity.id} starts ${activity.startDate}, before campaign ${campaign.id} starts ${campaign.startDate}`,
      ).toBe(true);
      expect(
        Date.parse(activity.endDate) <= Date.parse(campaign.endDate),
        `Activity ${activity.id} ends ${activity.endDate}, after campaign ${campaign.id} ends ${campaign.endDate}`,
      ).toBe(true);
    }
  });

  it('uses every entity id exactly once', () => {
    const seen = new Map<string, string>();
    for (const { collection, row } of allRows(pack)) {
      const id = row.id as string;
      expect(typeof id, `${collection} row missing id`).toBe('string');
      expect(seen.has(id), `id ${id} used by both ${seen.get(id)} and ${collection}`).toBe(
        false,
      );
      seen.set(id, collection);
    }
  });

  it('reconciles budget planned >= allocated and campaign spend within 105% of allocation', () => {
    for (const budget of pack.budgets) {
      const allocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0);
      expect(allocated, `Budget ${budget.id} over-allocates`).toBeLessThanOrEqual(
        budget.amountPlanned,
      );
      expect(budget.amountPlanned, `Budget ${budget.id} negative plan`).toBeGreaterThanOrEqual(
        0,
      );
    }
    for (const campaign of pack.campaigns) {
      expect(
        campaign.budgetAllocation,
        `Campaign ${campaign.id} negative allocation`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        campaignSpend(pack, campaign.id),
        `Campaign ${campaign.id} overspends`,
      ).toBeLessThanOrEqual(campaign.budgetAllocation * 1.05);
    }
    for (const activity of pack.campaignActivities) {
      expect(
        activity.spendAllocated,
        `Activity ${activity.id} negative spend`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('places every stored status on a lifecycle stage and a badge tone', () => {
    /* An unmapped status is invisible drift: `lifecycleStageFor` drops the
     * record off the lifecycle board, and `statusTone` paints it muted —
     * "inert" — which is silently wrong for anything in motion. Only the
     * entity families the UI renders raw are listed; AgentRun and MarcomAgent
     * statuses go through their own adapters (AgentTrace, AgentsPage) and are
     * deliberately outside both tables. */
    const families: [EntityName, { id: string; status: string }[]][] = [
      ['Campaign', pack.campaigns],
      ['CampaignActivity', pack.campaignActivities],
      ['Content', pack.contents],
      ['Communication', pack.communications],
      ['Asset', pack.assets],
      ['Idea', pack.ideas],
      ['Brief', pack.briefs],
      ['ChannelExecution', pack.channelExecutions],
    ];
    for (const [entity, rows] of families) {
      for (const row of rows) {
        expect(
          lifecycleStageFor(entity, row.status),
          `${entity} ${row.id} status '${row.status}' has no lifecycle stage`,
        ).not.toBeNull();
        expect(
          hasBadgeTone(row.status),
          `${entity} ${row.id} status '${row.status}' has no badge tone — it would render muted`,
        ).toBe(true);
      }
    }
    /* Fixed-stage families carry a status the badge still renders. */
    for (const row of [...pack.approvals, ...pack.crisisIncidents, ...pack.journeys]) {
      expect(
        hasBadgeTone(row.status),
        `${row.id} status '${row.status}' has no badge tone — it would render muted`,
      ).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 2. Budget math                                                      */
/* ------------------------------------------------------------------ */

describe('budget math', () => {
  it('each budget’s per-campaign allocations sum to at most amountPlanned', () => {
    for (const budget of db.budgets) {
      const allocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0);
      expect(allocated, `Budget ${budget.id} over-allocates`).toBeLessThanOrEqual(
        budget.amountPlanned,
      );
    }
  });

  it('each campaign’s activity spend stays within 105% of its budgetAllocation', () => {
    for (const campaign of db.campaigns) {
      const spend = campaignSpend(db, campaign.id);
      expect(spend, `Campaign ${campaign.id} overspends`).toBeLessThanOrEqual(
        campaign.budgetAllocation * 1.05,
      );
    }
  });

  it('budgetUtilization returns a 0–100 percentage matching committed / amountPlanned', () => {
    for (const bu of db.businessUnits) {
      const u = budgetUtilization(db, bu.id);
      expect(u.businessUnitId).toBe(bu.id);
      expect(Number.isFinite(u.utilizationPct)).toBe(true);
      expect(u.utilizationPct).toBeGreaterThanOrEqual(0);
      expect(u.utilizationPct).toBeLessThanOrEqual(100);
      if (u.amountPlanned > 0) {
        expect(u.utilizationPct).toBeCloseTo((u.committed / u.amountPlanned) * 100, 8);
      } else {
        expect(u.utilizationPct).toBe(0);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* 3. Selector consistency                                             */
/* ------------------------------------------------------------------ */

describe('selector consistency', () => {
  it('pipelineByStatus totals equal campaignsInScope length for the empty scope', () => {
    const counts = pipelineByStatus(db, {});
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(campaignsInScope(db, {}).length);
    expect(total).toBe(db.campaigns.length);
  });

  it('per-brand pipeline totals sum to the all-scope total', () => {
    const allScopeTotal = Object.values(pipelineByStatus(db, {})).reduce(
      (sum, n) => sum + n,
      0,
    );
    const perBrandTotal = db.brands.reduce((sum, brand) => {
      const counts = pipelineByStatus(db, { brandId: brand.id });
      return sum + Object.values(counts).reduce((s, n) => s + n, 0);
    }, 0);
    expect(perBrandTotal).toBe(allScopeTotal);
  });

  it('kpiSummary utilization uses the unified finance-plan denominator (Σ Budget.amountPlanned)', () => {
    const summary = kpiSummary(db, {});
    const plannedBudget = budgetsPlannedTotal(db, {});
    const { committed } = totalPlannedVsCommitted(db, {});
    expect(plannedBudget).toBeGreaterThan(0);
    expect(summary.budgetUtilizationPct).toBeCloseTo((committed / plannedBudget) * 100, 8);

    // Same figure the Budget page derives from its per-BU rollups.
    const buTotals = db.businessUnits.reduce(
      (acc, bu) => {
        const u = budgetUtilization(db, bu.id);
        return {
          planned: acc.planned + u.amountPlanned,
          committed: acc.committed + u.committed,
        };
      },
      { planned: 0, committed: 0 },
    );
    expect(buTotals.planned).toBeCloseTo(plannedBudget, 8);
    expect(summary.budgetUtilizationPct).toBeCloseTo(
      (buTotals.committed / buTotals.planned) * 100,
      8,
    );
  });

  it('kpiSummary values are finite and non-negative for the empty scope', () => {
    const summary = kpiSummary(db, {});
    expect(Number.isFinite(summary.totalReach)).toBe(true);
    expect(summary.totalReach).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(summary.conversions)).toBe(true);
    expect(summary.conversions).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(summary.budgetUtilizationPct)).toBe(true);
    expect(summary.budgetUtilizationPct).toBeGreaterThanOrEqual(0);
    if (summary.avgEngagementRate !== null) {
      expect(Number.isFinite(summary.avgEngagementRate)).toBe(true);
      expect(summary.avgEngagementRate).toBeGreaterThanOrEqual(0);
    }
  });

  it('kpiSummary values stay finite and non-negative for every single-brand scope', () => {
    for (const brand of db.brands) {
      const summary = kpiSummary(db, { brandId: brand.id });
      for (const value of [
        summary.totalReach,
        summary.conversions,
        summary.budgetUtilizationPct,
        ...(summary.avgEngagementRate === null ? [] : [summary.avgEngagementRate]),
      ]) {
        expect(Number.isFinite(value), `brand ${brand.id}`).toBe(true);
        expect(value, `brand ${brand.id}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* 4. Status validity                                                  */
/* ------------------------------------------------------------------ */

/* Record<Union, null> keeps each list exhaustive: adding a union member
 * without listing it here is a compile error. */
const CAMPAIGN_STATUSES: Record<CampaignStatus, null> = {
  Draft: null,
  Planned: null,
  'In Approval': null,
  Approved: null,
  Live: null,
  Paused: null,
  Completed: null,
  Archived: null,
  Cancelled: null,
};
const CONTENT_STATUSES: Record<ContentStatus, null> = {
  Draft: null,
  'In Review': null,
  Rework: null,
  Approved: null,
  Published: null,
  Retired: null,
  Archived: null,
  Discarded: null,
};
const COMMUNICATION_STATUSES: Record<CommunicationStatus, null> = {
  Idea: null,
  Briefed: null,
  Drafting: null,
  'In Review': null,
  Rework: null,
  Approved: null,
  Scheduled: null,
  Live: null,
  Paused: null,
  Completed: null,
  Archived: null,
  Killed: null,
};
const APPROVAL_STATUSES: Record<ApprovalStatus, null> = {
  Requested: null,
  'In Review': null,
  'Changes Requested': null,
  Escalated: null,
  Approved: null,
  Rejected: null,
  Withdrawn: null,
  Expired: null,
};

describe('status validity', () => {
  const cases: [string, { id: string; status: string }[], Record<string, null>][] = [
    ['campaigns', db.campaigns, CAMPAIGN_STATUSES],
    ['contents', db.contents, CONTENT_STATUSES],
    ['communications', db.communications, COMMUNICATION_STATUSES],
    ['approvals', db.approvals, APPROVAL_STATUSES],
  ];

  it.each(cases.map(([name]) => [name] as const))(
    'every %s status is a member of its union',
    (name) => {
      const [, rows, valid] = cases.find(([n]) => n === name)!;
      for (const row of rows) {
        expect(
          row.status in valid,
          `${name} ${row.id} has invalid status '${row.status}'`,
        ).toBe(true);
      }
    },
  );
});

/* ------------------------------------------------------------------ */
/* 5. Date sanity                                                      */
/* ------------------------------------------------------------------ */

/** Every top-level row collection in the SeedDB, flattened with its origin. */
function allRows(database: SeedDB): { collection: string; row: Record<string, unknown> }[] {
  const out: { collection: string; row: Record<string, unknown> }[] = [];
  for (const [collection, value] of Object.entries(database)) {
    const rows = Array.isArray(value) ? value : [value];
    for (const row of rows) out.push({ collection, row: row as Record<string, unknown> });
  }
  return out;
}

describe('date sanity', () => {
  it('every entity has createdAt <= updatedAt', () => {
    for (const { collection, row } of allRows(db)) {
      const createdAt = row.createdAt as string;
      const updatedAt = row.updatedAt as string;
      expect(typeof createdAt, `${collection} ${row.id} missing createdAt`).toBe('string');
      expect(typeof updatedAt, `${collection} ${row.id} missing updatedAt`).toBe('string');
      expect(
        Date.parse(createdAt) <= Date.parse(updatedAt),
        `${collection} ${row.id} has createdAt ${createdAt} > updatedAt ${updatedAt}`,
      ).toBe(true);
    }
  });

  it('every campaign has startDate < endDate', () => {
    for (const campaign of db.campaigns) {
      expect(
        Date.parse(campaign.startDate) < Date.parse(campaign.endDate),
        `Campaign ${campaign.id}: ${campaign.startDate} !< ${campaign.endDate}`,
      ).toBe(true);
    }
  });

  it('every metric period falls within 2026', () => {
    for (const metric of db.metricResults) {
      expect(
        metric.period >= '2026-01-01' && metric.period <= '2026-12-31',
        `MetricResult ${metric.id} period ${metric.period} outside 2026`,
      ).toBe(true);
    }
  });

  /* Operational dates — the planning window every screen renders — stay close
   * to the demo clock. `createdAt` may predate it (the org and its FY26 plans
   * were created in late 2025) and `Asset.rightsExpiry` may run past it; both
   * are history, not the planning year, so they are deliberately exempt.
   *
   * The band is TODAY ± 1 year rather than "inside 2026" because demo packs
   * seed their dates as offsets from the demo clock (packs spec §4.4), so an
   * always-on campaign legitimately crosses a year boundary. What this guards
   * is that no window has drifted somewhere absurd — the calendar, the
   * timeline and every "upcoming" selector assume dates near the clock. */
  it('every campaign and activity window sits within a year of the demo clock', () => {
    const clock = Date.parse(TODAY);
    const YEAR_MS = 366 * 24 * 60 * 60 * 1000;
    const inYear = (d: string) => Math.abs(Date.parse(d) - clock) <= YEAR_MS;
    for (const campaign of db.campaigns) {
      expect(inYear(campaign.startDate), `Campaign ${campaign.id} startDate`).toBe(true);
      expect(inYear(campaign.endDate), `Campaign ${campaign.id} endDate`).toBe(true);
      expect(
        Date.parse(campaign.startDate) <= Date.parse(campaign.endDate),
        `Campaign ${campaign.id}: ${campaign.startDate} !<= ${campaign.endDate}`,
      ).toBe(true);
    }
    for (const activity of db.campaignActivities) {
      expect(inYear(activity.startDate), `Activity ${activity.id} startDate`).toBe(true);
      expect(inYear(activity.endDate), `Activity ${activity.id} endDate`).toBe(true);
      expect(
        Date.parse(activity.startDate) <= Date.parse(activity.endDate),
        `Activity ${activity.id}: ${activity.startDate} !<= ${activity.endDate}`,
      ).toBe(true);
    }
  });

  /**
   * An activity cannot run outside the campaign it belongs to.
   *
   * ACT-036 started 14 days before CMP-012 did. Nothing caught it: every
   * existing date check looks at one record in isolation, and the calendar
   * happily renders an activity chip in a month its campaign has not reached.
   * This is the cross-record version of the same guard.
   */
  it('every activity runs inside its own campaign window', () => {
    const campaignById = new Map(db.campaigns.map((c) => [c.id, c]));
    for (const activity of db.campaignActivities) {
      const campaign = campaignById.get(activity.campaignId);
      expect(campaign, `Activity ${activity.id} names unknown campaign ${activity.campaignId}`)
        .toBeDefined();
      if (!campaign) continue;
      expect(
        Date.parse(activity.startDate) >= Date.parse(campaign.startDate),
        `Activity ${activity.id} starts ${activity.startDate}, before campaign ${campaign.id} starts ${campaign.startDate}`,
      ).toBe(true);
      expect(
        Date.parse(activity.endDate) <= Date.parse(campaign.endDate),
        `Activity ${activity.id} ends ${activity.endDate}, after campaign ${campaign.id} ends ${campaign.endDate}`,
      ).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 5b. Expansion invariants — funnel, share of voice, id uniqueness    */
/* ------------------------------------------------------------------ */

describe('expansion invariants', () => {
  it('conversions <= clicks <= opens <= impressions for every campaign-week', () => {
    const CONVERSION_KEYS = new Set([
      'preorders',
      'orders',
      'registrations',
      'leads',
      'qualified_leads',
      'signups',
    ]);
    type Funnel = { impressions: number; opens: number; clicks: number; conversions: number };
    const grid = new Map<string, Funnel>();
    for (const metric of db.metricResults) {
      const campaignId = metric.dimensions.campaignId;
      if (campaignId === undefined) continue;
      const key = `${campaignId}|${metric.period}`;
      const row = grid.get(key) ?? { impressions: 0, opens: 0, clicks: 0, conversions: 0 };
      if (metric.metricKey === 'impressions') row.impressions += metric.value;
      else if (metric.metricKey === 'email_opens') row.opens += metric.value;
      else if (metric.metricKey === 'clicks') row.clicks += metric.value;
      else if (CONVERSION_KEYS.has(metric.metricKey)) row.conversions += metric.value;
      grid.set(key, row);
    }
    // A stage only constrains the stage below it when both were measured —
    // paid-only campaigns have impressions and clicks but no email opens.
    for (const [key, f] of grid) {
      if (f.opens > 0 && f.impressions > 0) {
        expect(f.opens, `${key} opens > impressions`).toBeLessThanOrEqual(f.impressions);
      }
      if (f.clicks > 0) {
        const ceiling = f.opens > 0 ? f.opens : f.impressions;
        if (ceiling > 0) expect(f.clicks, `${key} clicks > ${f.opens > 0 ? 'opens' : 'impressions'}`).toBeLessThanOrEqual(ceiling);
      }
      if (f.conversions > 0) {
        const ceiling = f.clicks > 0 ? f.clicks : f.opens > 0 ? f.opens : f.impressions;
        if (ceiling > 0) expect(f.conversions, `${key} conversions exceed the stage above`).toBeLessThanOrEqual(ceiling);
      }
    }
  });

  it('share of voice sums to at most 100 in every period', () => {
    const byPeriod = new Map<string, number>();
    for (const row of db.shareOfVoice) {
      expect(row.pct, `ShareOfVoice ${row.id}`).toBeGreaterThanOrEqual(0);
      expect(row.pct, `ShareOfVoice ${row.id}`).toBeLessThanOrEqual(100);
      byPeriod.set(row.period, (byPeriod.get(row.period) ?? 0) + row.pct);
    }
    for (const [period, total] of byPeriod) {
      expect(total, `ShareOfVoice period ${period} sums to ${total}`).toBeLessThanOrEqual(100);
    }
  });

  it('every entity id is unique across the whole seed graph', () => {
    const seen = new Map<string, string>();
    for (const { collection, row } of allRows(db)) {
      const id = row.id as string;
      expect(typeof id, `${collection} row missing id`).toBe('string');
      expect(seen.has(id), `id ${id} used by both ${seen.get(id)} and ${collection}`).toBe(false);
      seen.set(id, collection);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 6. AI service determinism                                           */
/* ------------------------------------------------------------------ */

describe('aiService determinism', () => {
  it('proposeCampaign is deterministic for every seeded idea', () => {
    for (const idea of db.ideas) {
      const first = aiService.proposeCampaign(idea, { db });
      const second = aiService.proposeCampaign(idea, { db });
      expect(second, `Idea ${idea.id}`).toEqual(first);
    }
  });

  it('proposeCampaign resolves channels and audience against the seed graph', () => {
    const channelIds = new Set(db.channels.map((c) => c.id));
    const audienceIds = new Set(db.audiences.map((a) => a.id));
    for (const idea of db.ideas) {
      const proposal = aiService.proposeCampaign(idea, { db });
      for (const id of proposal.channels) {
        expect(channelIds.has(id), `Idea ${idea.id} proposes unknown channel ${id}`).toBe(true);
      }
      expect(
        audienceIds.has(proposal.audienceId),
        `Idea ${idea.id} proposes unknown audience ${proposal.audienceId}`,
      ).toBe(true);
      expect(Number.isFinite(proposal.budgetEstimate)).toBe(true);
      expect(proposal.budgetEstimate).toBeGreaterThan(0);
    }
  });

  it('proposeCampaign estimatedRoi matches the mean of the brand campaignRoi values', () => {
    for (const idea of db.ideas) {
      const proposal = aiService.proposeCampaign(idea, { db });
      const rois = db.campaigns
        .filter((c) => c.brandId === idea.brandId)
        .map((c) => campaignRoi(db, c.id).roi)
        .filter((roi): roi is number => roi !== null);
      if (rois.length === 0) {
        expect(proposal.estimatedRoi, `Idea ${idea.id}`).toBeNull();
      } else {
        const mean = rois.reduce((s, r) => s + r, 0) / rois.length;
        expect(proposal.estimatedRoi, `Idea ${idea.id}`).toBe(Math.round(mean * 100) / 100);
      }
      expect(typeof proposal.roiNote).toBe('string');
      expect(proposal.roiNote.length).toBeGreaterThan(0);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 7. ROI selectors — Performance and Budget reconcile by construction */
/* ------------------------------------------------------------------ */

describe('ROI selectors', () => {
  it('campaignRoi spend equals campaignSpend and roi is null exactly when not estimable', () => {
    const businessKeys = new Set(
      db.kpis.filter((k) => k.tier === 'business').map((k) => k.metricKey),
    );
    for (const campaign of db.campaigns) {
      const result = campaignRoi(db, campaign.id);
      expect(result.spend, campaign.id).toBe(campaignSpend(db, campaign.id));
      const hasBusinessRows = db.metricResults.some(
        (m) => m.dimensions.campaignId === campaign.id && businessKeys.has(m.metricKey),
      );
      if (result.spend > 0 && hasBusinessRows) {
        expect(result.roi, campaign.id).toBeCloseTo(
          (result.attributedValue - result.spend) / result.spend,
        );
      } else {
        expect(result.roi, campaign.id).toBeNull();
      }
    }
  });

  it('roiSummary totals equal the sum of measured per-campaign ROI parts', () => {
    for (const scope of [{}, { businessUnitId: 'BU-001' }, { businessUnitId: 'BU-002' }]) {
      const summary = roiSummary(db, scope);
      const measured = campaignsInScope(db, scope)
        .map((c) => campaignRoi(db, c.id))
        .filter((r) => r.roi !== null);
      const spend = measured.reduce((s, r) => s + r.spend, 0);
      const attributed = measured.reduce((s, r) => s + r.attributedValue, 0);
      expect(summary.spend).toBe(spend);
      expect(summary.attributedValue).toBe(attributed);
      expect(summary.measuredCampaignCount).toBe(measured.length);
      if (spend > 0) {
        expect(summary.roi).toBeCloseTo((attributed - spend) / spend);
      } else {
        expect(summary.roi).toBeNull();
      }
    }
  });
});
