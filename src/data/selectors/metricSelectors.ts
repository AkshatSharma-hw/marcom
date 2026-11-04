/**
 * Metric selectors — pure functions over the frozen SeedDB.
 * All dashboard numbers roll up from MetricResult fact rows; rate metrics
 * (unit '%') aggregate by mean, everything else by sum.
 */

import type { Benchmark, KPI, MetricResult, SeedDB } from '../types';
import { campaignsInScope, type Scope } from './campaignSelectors';
import {
  budgetsPlannedTotal,
  campaignSpend,
  totalPlannedVsCommitted,
} from './budgetSelectors';
import { DEFAULT_LOCALE } from "@/lib/i18n";

export interface KpiAttainmentResult {
  kpiId: string;
  metricKey: string;
  /** Aggregated actual: mean for '%' KPIs, cumulative sum otherwise. */
  actual: number;
  target: number;
  /** actual/target for direction 'up', target/actual for 'down'. */
  attainment: number;
  weeksReported: number;
}

export interface SeriesPoint {
  /** ISO week start (Monday). */
  period: string;
  value: number;
}

export interface ChannelShare {
  channelId: string;
  channelName: string;
  value: number;
  /** Fraction of the in-scope total, 0–1. */
  share: number;
}

export interface KpiSummary {
  /** Sum of reach-tier metric values (impressions) in scope. */
  totalReach: number;
  /** Mean of '%'-unit engagement metric values in scope, or null if none. */
  avgEngagementRate: number | null;
  /** Sum of conversion-tier metric values (preorders, registrations) in scope. */
  conversions: number;
  /**
   * Committed activity spend / Σ Budget.amountPlanned (finance-plan
   * denominator via budgetsPlannedTotal) in scope, 0–100. Same rule as the
   * Budget page, so both surfaces show the same percentage.
   */
  budgetUtilizationPct: number;
}

export interface CampaignRoi {
  /** Σ activity spendAllocated for the campaign (campaignSpend). */
  spend: number;
  /** Σ business-tier MetricResult values attributed to the campaign. */
  attributedValue: number;
  /**
   * (attributedValue − spend) / spend, or null when spend is 0 or the
   * campaign has no business-tier fact rows (ROI not estimable).
   */
  roi: number | null;
}

export interface RoiSummary {
  /** Σ spend across measured campaigns (those with a non-null ROI) in scope. */
  spend: number;
  /** Σ attributed business value across measured campaigns in scope. */
  attributedValue: number;
  /** (attributedValue − spend) / spend over measured campaigns, or null. */
  roi: number | null;
  /** How many in-scope campaigns have a computable ROI. */
  measuredCampaignCount: number;
}

/* ------------------------------------------------------------------ */
/* Scope matching for fact rows                                        */
/* ------------------------------------------------------------------ */

/**
 * A fact row is in scope when each requested scope key matches either the
 * row's own dimension or (fallback) the row's campaign.
 */
function rowInScope(db: SeedDB, row: MetricResult, scope: Scope): boolean {
  const campaign = row.dimensions.campaignId
    ? db.campaigns.find((c) => c.id === row.dimensions.campaignId)
    : undefined;

  if (scope.brandId) {
    const brandId = row.dimensions.brandId ?? campaign?.brandId;
    if (brandId !== scope.brandId) return false;
  }
  if (scope.businessUnitId) {
    const businessUnitId = row.dimensions.businessUnitId ?? campaign?.businessUnitId;
    if (businessUnitId !== scope.businessUnitId) return false;
  }
  if (scope.regionId) {
    const rowRegion = row.dimensions.regionId;
    const matches = rowRegion
      ? rowRegion === scope.regionId
      : campaign?.regionIds.includes(scope.regionId) ?? false;
    if (!matches) return false;
  }
  return true;
}

function isRateKpi(kpi: KPI): boolean {
  return kpi.unit === '%';
}

/** True for metric keys whose values are rates (mean-aggregated, never summed). */
function isRateMetricKey(db: SeedDB, metricKey: string): boolean {
  return db.kpis.some((k) => k.metricKey === metricKey && isRateKpi(k));
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

/**
 * Attainment of one KPI against its target, from its MetricResult rows.
 *
 * `campaignId` scopes the fact rows to that campaign. A KPI may be listed by
 * several campaigns, but a fact row belongs to exactly one — without the scope
 * a campaign would report another campaign's results as its own, so campaign
 * surfaces must always pass it.
 */
export function kpiAttainment(
  db: SeedDB,
  kpiId: string,
  campaignId?: string,
): KpiAttainmentResult | null {
  const kpi = db.kpis.find((k) => k.id === kpiId);
  if (!kpi) return null;

  const rows = db.metricResults.filter(
    (m) =>
      m.kpiId === kpiId &&
      (campaignId === undefined || m.dimensions.campaignId === campaignId),
  );
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, m) => sum + m.value, 0);
  const actual = isRateKpi(kpi) ? total / rows.length : total;
  const attainment =
    kpi.direction === 'up'
      ? kpi.target > 0
        ? actual / kpi.target
        : 0
      : actual > 0
        ? kpi.target / actual
        : 0;

  return {
    kpiId,
    metricKey: kpi.metricKey,
    actual,
    target: kpi.target,
    attainment,
    weeksReported: rows.length,
  };
}

/** Weekly totals (mean for rate metrics) for one metric key within scope. */
export function metricSeries(db: SeedDB, metricKey: string, scope: Scope): SeriesPoint[] {
  const rate = isRateMetricKey(db, metricKey);
  const byPeriod = new Map<string, { total: number; count: number }>();

  for (const row of db.metricResults) {
    if (row.metricKey !== metricKey) continue;
    if (!rowInScope(db, row, scope)) continue;
    const bucket = byPeriod.get(row.period) ?? { total: 0, count: 0 };
    bucket.total += row.value;
    bucket.count += 1;
    byPeriod.set(row.period, bucket);
  }

  return [...byPeriod.entries()]
    .map(([period, { total, count }]) => ({
      period,
      value: rate && count > 0 ? total / count : total,
    }))
    .sort((a, b) => a.period.localeCompare(b.period, DEFAULT_LOCALE));
}

/**
 * Volume share by channel from fact rows carrying a channel dimension.
 * Rate metrics (e.g. open rates) are excluded so shares stay additive.
 */
export function channelMix(db: SeedDB, scope: Scope): ChannelShare[] {
  const byChannel = new Map<string, number>();

  for (const row of db.metricResults) {
    const channelId = row.dimensions.channelId;
    if (!channelId) continue;
    if (isRateMetricKey(db, row.metricKey)) continue;
    if (!rowInScope(db, row, scope)) continue;
    byChannel.set(channelId, (byChannel.get(channelId) ?? 0) + row.value);
  }

  const total = [...byChannel.values()].reduce((s, v) => s + v, 0);
  return [...byChannel.entries()]
    .map(([channelId, value]) => ({
      channelId,
      channelName: db.channels.find((c) => c.id === channelId)?.name ?? channelId,
      value,
      share: total > 0 ? value / total : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Metric keys the KPI registry marks as business-tier (revenue_attributed, pipeline_usd, …). */
function businessMetricKeys(db: SeedDB): Set<string> {
  return new Set(db.kpis.filter((k) => k.tier === 'business').map((k) => k.metricKey));
}

/**
 * Estimated ROI for one campaign: committed activity spend joined against the
 * campaign's business-tier fact rows. Both inputs already exist in the seed —
 * this selector is the one place the join is computed, so every surface that
 * shows ROI (Performance, Budget, AI proposals) reconciles by construction.
 */
export function campaignRoi(db: SeedDB, campaignId: string): CampaignRoi {
  const keys = businessMetricKeys(db);
  let attributedValue = 0;
  let hasBusinessRows = false;
  for (const row of db.metricResults) {
    if (row.dimensions.campaignId !== campaignId) continue;
    if (!keys.has(row.metricKey)) continue;
    attributedValue += row.value;
    hasBusinessRows = true;
  }
  const spend = campaignSpend(db, campaignId);
  return {
    spend,
    attributedValue,
    roi: spend > 0 && hasBusinessRows ? (attributedValue - spend) / spend : null,
  };
}

/**
 * In-scope ROI totals over measured campaigns only (campaigns with a
 * computable campaignRoi). Unmeasured spend is excluded so the headline
 * ratio compares attributed value against the spend that produced it.
 */
export function roiSummary(db: SeedDB, scope: Scope): RoiSummary {
  let spend = 0;
  let attributedValue = 0;
  let measuredCampaignCount = 0;
  for (const campaign of campaignsInScope(db, scope)) {
    const result = campaignRoi(db, campaign.id);
    if (result.roi === null) continue;
    spend += result.spend;
    attributedValue += result.attributedValue;
    measuredCampaignCount += 1;
  }
  return {
    spend,
    attributedValue,
    roi: spend > 0 ? (attributedValue - spend) / spend : null,
    measuredCampaignCount,
  };
}

/** Headline dashboard tiles — every figure derived from fact rows and budgets. */
export function kpiSummary(db: SeedDB, scope: Scope): KpiSummary {
  const keysForTier = (tier: KPI['tier']): Set<string> =>
    new Set(db.kpis.filter((k) => k.tier === tier).map((k) => k.metricKey));

  const reachKeys = keysForTier('reach');
  const conversionKeys = keysForTier('conversion');
  const engagementRateKeys = new Set(
    db.kpis.filter((k) => k.tier === 'engagement' && isRateKpi(k)).map((k) => k.metricKey),
  );

  let totalReach = 0;
  let conversions = 0;
  let engagementTotal = 0;
  let engagementCount = 0;

  for (const row of db.metricResults) {
    if (!rowInScope(db, row, scope)) continue;
    if (reachKeys.has(row.metricKey)) totalReach += row.value;
    if (conversionKeys.has(row.metricKey)) conversions += row.value;
    if (engagementRateKeys.has(row.metricKey)) {
      engagementTotal += row.value;
      engagementCount += 1;
    }
  }

  const { committed } = totalPlannedVsCommitted(db, scope);
  const plannedBudget = budgetsPlannedTotal(db, scope);

  return {
    totalReach,
    avgEngagementRate: engagementCount > 0 ? engagementTotal / engagementCount : null,
    conversions,
    budgetUtilizationPct: plannedBudget > 0 ? (committed / plannedBudget) * 100 : 0,
  };
}

/* ================================================================== */
/* Cost efficiency — CPL / CAC / CPA / ROAS                            */
/* ================================================================== */

/**
 * Conversion-tier metric keys that record a *captured lead* — an expression of
 * interest, not a sale. Classification is by key family because the seed has no
 * explicit lead flag; keys that match neither family still count toward CPA.
 */
const LEAD_KEY_PATTERN =
  /(^|_)(lead|leads|mql|sql|registration|registrations|signup|signups|subscriber|subscribers|inquiry|inquiries|rsvp)($|_)/;

/** Conversion-tier metric keys that record an *acquired customer* (a purchase or commitment). */
const ACQUISITION_KEY_PATTERN =
  /(^|_)(preorder|preorders|order|orders|purchase|purchases|sale|sales|activation|activations|subscription|subscriptions)($|_)/;

/** The denominator behind one cost ratio — kept so the UI can state the basis. */
export interface CostBasis {
  /** Summed denominator volume, or null when no fact rows feed it. */
  volume: number | null;
  /** Metric keys that contributed to the volume. */
  metricKeys: string[];
}

export interface CostMetrics {
  campaignId: string;
  /** Committed activity spend (campaignSpend) — the numerator for CPL/CAC/CPA. */
  spend: number;
  /** spend / leads, or null when the campaign has no lead-type fact rows. */
  cpl: number | null;
  /** spend / acquisitions, or null when the campaign has no acquisition-type fact rows. */
  cac: number | null;
  /** spend / all conversion-tier actions, or null when there are none. */
  cpa: number | null;
  /** attributed business value / spend, or null without business-tier rows or spend. */
  roas: number | null;
  basis: {
    leads: CostBasis;
    acquisitions: CostBasis;
    conversions: CostBasis;
    attributedValue: CostBasis;
  };
}

/** Metric keys of a given tier, excluding rate ('%') keys which are never summed. */
function countableKeysForTier(db: SeedDB, tier: KPI['tier']): Set<string> {
  return new Set(
    db.kpis.filter((k) => k.tier === tier && !isRateKpi(k)).map((k) => k.metricKey),
  );
}

/** Sum one campaign's fact rows whose metric key passes `accept`, tracking the keys used. */
function sumCampaignRows(
  db: SeedDB,
  campaignId: string,
  accept: (metricKey: string) => boolean,
): CostBasis {
  let total = 0;
  const metricKeys = new Set<string>();
  for (const row of db.metricResults) {
    if (row.dimensions.campaignId !== campaignId) continue;
    if (!accept(row.metricKey)) continue;
    total += row.value;
    metricKeys.add(row.metricKey);
  }
  return {
    volume: metricKeys.size > 0 ? total : null,
    metricKeys: [...metricKeys].sort(),
  };
}

/**
 * Cost efficiency for one campaign: committed spend divided by the volumes its
 * own fact rows report. Every ratio is null — never zero, never estimated —
 * when the inputs are absent (no spend recorded, or no fact rows of that kind),
 * so the UI can say "no lead data" instead of printing a fabricated number.
 */
export function costMetrics(db: SeedDB, campaignId: string): CostMetrics {
  const conversionKeys = countableKeysForTier(db, 'conversion');
  const businessKeys = countableKeysForTier(db, 'business');

  const leads = sumCampaignRows(
    db,
    campaignId,
    (key) => conversionKeys.has(key) && LEAD_KEY_PATTERN.test(key),
  );
  const acquisitions = sumCampaignRows(
    db,
    campaignId,
    (key) => conversionKeys.has(key) && ACQUISITION_KEY_PATTERN.test(key),
  );
  const conversions = sumCampaignRows(db, campaignId, (key) => conversionKeys.has(key));
  const attributedValue = sumCampaignRows(db, campaignId, (key) => businessKeys.has(key));

  const spend = campaignSpend(db, campaignId);
  const perUnit = (basis: CostBasis): number | null =>
    spend > 0 && basis.volume !== null && basis.volume > 0 ? spend / basis.volume : null;

  return {
    campaignId,
    spend,
    cpl: perUnit(leads),
    cac: perUnit(acquisitions),
    cpa: perUnit(conversions),
    roas:
      spend > 0 && attributedValue.volume !== null ? attributedValue.volume / spend : null,
    basis: { leads, acquisitions, conversions, attributedValue },
  };
}

/* ================================================================== */
/* Anomaly detection — latest week vs the campaign's own trailing mean */
/* ================================================================== */

/** How many prior weeks form the comparison baseline. */
export const ANOMALY_TRAILING_WEEKS = 4;
/** Minimum prior weeks required before a deviation is judged at all. */
export const ANOMALY_MIN_TRAILING_WEEKS = 2;
/** Absolute deviation from the trailing mean, in percent, that raises a flag. */
export const ANOMALY_THRESHOLD_PCT = 20;

export interface AnomalyFlag {
  campaignId: string;
  campaignName: string;
  metricKey: string;
  /** ISO week start of the most recent reported week. */
  period: string;
  latest: number;
  trailingMean: number;
  /** Weeks that formed the trailing mean (≤ ANOMALY_TRAILING_WEEKS). */
  trailingWeeks: number;
  /** Signed deviation of latest from the trailing mean, in percent. */
  deviationPct: number;
  direction: 'above' | 'below';
  /** Ready-to-read comparison, e.g. '34% below its 4-week mean'. */
  comparison: string;
}

/**
 * Flags each in-scope campaign metric whose most recent week deviates from its
 * own trailing mean by more than ANOMALY_THRESHOLD_PCT. The baseline is the
 * campaign's own history — nothing is compared against another campaign or an
 * external expectation — so the flag says "moved", not "is bad". Series with
 * fewer than ANOMALY_MIN_TRAILING_WEEKS prior weeks, or a zero baseline, are
 * skipped rather than reported against an unusable mean.
 */
export function anomalyFlags(db: SeedDB, scope: Scope): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  for (const campaign of campaignsInScope(db, scope)) {
    const byKey = new Map<string, Map<string, { total: number; count: number }>>();
    for (const row of db.metricResults) {
      if (row.dimensions.campaignId !== campaign.id) continue;
      if (!rowInScope(db, row, scope)) continue;
      const periods = byKey.get(row.metricKey) ?? new Map();
      const bucket = periods.get(row.period) ?? { total: 0, count: 0 };
      bucket.total += row.value;
      bucket.count += 1;
      periods.set(row.period, bucket);
      byKey.set(row.metricKey, periods);
    }

    for (const [metricKey, periods] of byKey) {
      const rate = isRateMetricKey(db, metricKey);
      const series = [...periods.entries()]
        .map(([period, { total, count }]) => ({
          period,
          value: rate && count > 0 ? total / count : total,
        }))
        .sort((a, b) => a.period.localeCompare(b.period, DEFAULT_LOCALE));

      const latest = series[series.length - 1];
      const trailing = series.slice(
        Math.max(0, series.length - 1 - ANOMALY_TRAILING_WEEKS),
        series.length - 1,
      );
      if (!latest || trailing.length < ANOMALY_MIN_TRAILING_WEEKS) continue;

      const trailingMean =
        trailing.reduce((sum, p) => sum + p.value, 0) / trailing.length;
      if (trailingMean === 0) continue;

      const deviationPct = ((latest.value - trailingMean) / trailingMean) * 100;
      if (Math.abs(deviationPct) < ANOMALY_THRESHOLD_PCT) continue;

      const direction = deviationPct >= 0 ? 'above' : 'below';
      flags.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        metricKey,
        period: latest.period,
        latest: latest.value,
        trailingMean,
        trailingWeeks: trailing.length,
        deviationPct,
        direction,
        comparison: `${Math.abs(Math.round(deviationPct))}% ${direction} its ${trailing.length}-week mean`,
      });
    }
  }

  return flags.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
}

/* ================================================================== */
/* Performance by persona and by message                               */
/* ================================================================== */

/** The aggregate every attributed-performance row carries. */
export interface AttributedPerformance {
  /** Σ reach-tier value credited to this row's subject. */
  reach: number;
  /** Σ conversion-tier value credited to this row's subject. */
  conversions: number;
  /** Mean of '%'-unit engagement values reaching the subject, or null. */
  engagementRatePct: number | null;
  /** conversions per 1,000 credited reach, or null when reach is 0. */
  conversionsPerThousandReach: number | null;
  /** Campaigns whose fact rows reached the subject. */
  campaignIds: string[];
  /** How many fact rows contributed. */
  factRowCount: number;
}

export interface PersonaPerformanceRow extends AttributedPerformance {
  personaId: string;
  personaName: string;
  audienceId: string;
  audienceName: string;
}

export interface MessagePerformanceRow extends AttributedPerformance {
  contentId: string;
  title: string;
  contentType: string;
}

/**
 * Communications a fact row plausibly rolls up from: the row's campaign
 * activities, narrowed to the row's channel when it carries one. When the
 * channel narrows the set to nothing, the campaign's full communication set is
 * used rather than dropping the row.
 */
function communicationsForRow(db: SeedDB, row: MetricResult) {
  const campaignId = row.dimensions.campaignId;
  if (!campaignId) return [];
  const activities = db.campaignActivities.filter((a) => a.campaignId === campaignId);
  const channelId = row.dimensions.channelId;
  const narrowed = channelId
    ? activities.filter((a) => a.channelId === channelId)
    : activities;
  const activityIds = new Set((narrowed.length > 0 ? narrowed : activities).map((a) => a.id));
  return db.communications.filter(
    (c) => c.campaignActivityId !== undefined && activityIds.has(c.campaignActivityId),
  );
}

interface Accumulator {
  reach: number;
  conversions: number;
  rateTotal: number;
  rateCount: number;
  campaignIds: Set<string>;
  factRowCount: number;
}

function emptyAccumulator(): Accumulator {
  return {
    reach: 0,
    conversions: 0,
    rateTotal: 0,
    rateCount: 0,
    campaignIds: new Set(),
    factRowCount: 0,
  };
}

function finalize(acc: Accumulator): AttributedPerformance {
  return {
    reach: acc.reach,
    conversions: acc.conversions,
    engagementRatePct: acc.rateCount > 0 ? acc.rateTotal / acc.rateCount : null,
    conversionsPerThousandReach: acc.reach > 0 ? (acc.conversions / acc.reach) * 1000 : null,
    campaignIds: [...acc.campaignIds].sort(),
    factRowCount: acc.factRowCount,
  };
}

/**
 * Walk in-scope fact rows, resolve each row to zero or more subjects (persona
 * ids, content ids, …) through the communication join, and credit the row's
 * value evenly across the subjects it reached. Volume metrics are split so the
 * breakdown stays additive against the scope total; rate metrics are averaged,
 * never split.
 */
function accumulateBySubject(
  db: SeedDB,
  scope: Scope,
  subjectsForRow: (row: MetricResult) => string[],
): Map<string, Accumulator> {
  const reachKeys = countableKeysForTier(db, 'reach');
  const conversionKeys = countableKeysForTier(db, 'conversion');
  const bySubject = new Map<string, Accumulator>();

  for (const row of db.metricResults) {
    if (!row.dimensions.campaignId) continue;
    if (!rowInScope(db, row, scope)) continue;

    const subjects = [...new Set(subjectsForRow(row))];
    if (subjects.length === 0) continue;

    const share = 1 / subjects.length;
    const isRate = isRateMetricKey(db, row.metricKey);

    for (const subject of subjects) {
      const acc = bySubject.get(subject) ?? emptyAccumulator();
      if (isRate) {
        acc.rateTotal += row.value;
        acc.rateCount += 1;
      } else if (reachKeys.has(row.metricKey)) {
        acc.reach += row.value * share;
      } else if (conversionKeys.has(row.metricKey)) {
        acc.conversions += row.value * share;
      }
      acc.campaignIds.add(row.dimensions.campaignId);
      acc.factRowCount += 1;
      bySubject.set(subject, acc);
    }
  }

  return bySubject;
}

/**
 * Performance rolled up by customer persona: fact row → campaign activity →
 * communication → audience → persona. Personas with no communication reaching
 * them, and communications whose audience has no persona, simply do not appear
 * — the join is never padded.
 */
export function performanceByPersona(db: SeedDB, scope: Scope): PersonaPerformanceRow[] {
  const personasByAudience = new Map<string, string[]>();
  for (const persona of db.customerPersonas) {
    personasByAudience.set(persona.audienceId, [
      ...(personasByAudience.get(persona.audienceId) ?? []),
      persona.id,
    ]);
  }

  const bySubject = accumulateBySubject(db, scope, (row) =>
    communicationsForRow(db, row).flatMap(
      (comm) => personasByAudience.get(comm.audienceId) ?? [],
    ),
  );

  return [...bySubject.entries()]
    .map(([personaId, acc]) => {
      const persona = db.customerPersonas.find((p) => p.id === personaId);
      const audience = db.audiences.find((a) => a.id === persona?.audienceId);
      return {
        personaId,
        personaName: persona?.name ?? personaId,
        audienceId: persona?.audienceId ?? '',
        audienceName: audience?.name ?? persona?.audienceId ?? '',
        ...finalize(acc),
      };
    })
    .sort((a, b) => b.conversions - a.conversions || b.reach - a.reach);
}

/**
 * Performance rolled up by message: fact row → campaign activity →
 * communication → the content item it carried. Communications with no content
 * attached contribute nothing rather than an "unknown message" bucket.
 */
export function performanceByMessage(db: SeedDB, scope: Scope): MessagePerformanceRow[] {
  const bySubject = accumulateBySubject(db, scope, (row) =>
    communicationsForRow(db, row)
      .map((comm) => comm.contentId)
      .filter((id): id is string => id !== undefined),
  );

  return [...bySubject.entries()]
    .map(([contentId, acc]) => {
      const content = db.contents.find((c) => c.id === contentId);
      return {
        contentId,
        title: content?.title ?? contentId,
        contentType: content?.contentType ?? '',
        ...finalize(acc),
      };
    })
    .sort((a, b) => b.conversions - a.conversions || b.reach - a.reach);
}

/* ================================================================== */
/* Benchmarks — measured rate metrics against external reference data  */
/* ================================================================== */

export type BenchmarkStanding = 'top-quartile' | 'above-median' | 'below-median';

export interface BenchmarkComparison {
  campaignId: string;
  campaignName: string;
  metricKey: string;
  /** Mean of the campaign's '%'-unit fact rows for this metric key. */
  actual: number;
  /** The reference row, or null when the seed carries no matching benchmark. */
  benchmark: Benchmark | null;
  /** (actual − industryMedian) / industryMedian x 100, or null without a benchmark. */
  vsMedianPct: number | null;
  /** Points of the metric still to gain to reach the top quartile, or null. */
  pointsToTopQuartile: number | null;
  standing: BenchmarkStanding | null;
}

/**
 * Compares each in-scope campaign's rate metrics against db.benchmarks.
 * A benchmark matches on metric key, preferring the row whose channelKind
 * equals the channel the fact rows came from; a channel-agnostic benchmark is
 * the fallback. No match means no comparison — the reference data is never
 * interpolated.
 */
export function benchmarkComparisons(db: SeedDB, scope: Scope): BenchmarkComparison[] {
  const out: BenchmarkComparison[] = [];

  for (const campaign of campaignsInScope(db, scope)) {
    const byKey = new Map<
      string,
      { total: number; count: number; channelIds: Set<string> }
    >();
    for (const row of db.metricResults) {
      if (row.dimensions.campaignId !== campaign.id) continue;
      if (!rowInScope(db, row, scope)) continue;
      if (!isRateMetricKey(db, row.metricKey)) continue;
      const bucket = byKey.get(row.metricKey) ?? {
        total: 0,
        count: 0,
        channelIds: new Set<string>(),
      };
      bucket.total += row.value;
      bucket.count += 1;
      if (row.dimensions.channelId) bucket.channelIds.add(row.dimensions.channelId);
      byKey.set(row.metricKey, bucket);
    }

    for (const [metricKey, bucket] of byKey) {
      const actual = bucket.total / bucket.count;
      const kinds = new Set(
        [...bucket.channelIds]
          .map((id) => db.channels.find((c) => c.id === id)?.channelKind)
          .filter((k): k is NonNullable<typeof k> => k !== undefined),
      );
      const candidates = db.benchmarks.filter((b) => b.metricKey === metricKey);
      const benchmark =
        candidates.find((b) => b.channelKind !== undefined && kinds.has(b.channelKind)) ??
        candidates.find((b) => b.channelKind === undefined) ??
        null;

      out.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        metricKey,
        actual,
        benchmark,
        vsMedianPct:
          benchmark && benchmark.industryMedian !== 0
            ? ((actual - benchmark.industryMedian) / benchmark.industryMedian) * 100
            : null,
        pointsToTopQuartile: benchmark ? benchmark.topQuartile - actual : null,
        standing: benchmark
          ? actual >= benchmark.topQuartile
            ? 'top-quartile'
            : actual >= benchmark.industryMedian
              ? 'above-median'
              : 'below-median'
          : null,
      });
    }
  }

  return out.sort(
    (a, b) =>
      a.campaignName.localeCompare(b.campaignName, DEFAULT_LOCALE) || a.metricKey.localeCompare(b.metricKey, DEFAULT_LOCALE),
  );
}
