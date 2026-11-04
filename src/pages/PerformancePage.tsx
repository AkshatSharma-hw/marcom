/**
 * Performance — increment-2 analytics page.
 * Every number derives from selectors over the frozen SeedDB (KPI attainment,
 * weekly metric series, channel mix); trend and mix sections re-derive when the
 * topbar scope (brand / BU / region) changes. The funnel drills into one
 * Live/Completed campaign's fact rows.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Coins,
  Filter,
  Gauge,
  GraduationCap,
  Info,
  Network,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { PageSkeleton } from "@/components/marcomm/PageSkeleton";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";

import { useLiveDB } from "@/data/useLiveDB";
import {
  ANOMALY_THRESHOLD_PCT,
  ANOMALY_TRAILING_WEEKS,
  anomalyFlags,
  benchmarkComparisons,
  campaignRoi,
  campaignsInScope,
  channelMix,
  costMetrics,
  kpiAttainment,
  metricSeries,
  performanceByMessage,
  performanceByPersona,
  roiSummary,
  type AnomalyFlag,
  type BenchmarkComparison,
  type BenchmarkStanding,
  type MessagePerformanceRow,
  type PersonaPerformanceRow,
  type Scope,
} from "@/data/selectors";
import type { KPI, KpiTier, MetricResult, SeedDB } from "@/data/types";
import {
  ATTRIBUTION_MODELS,
  attributeCampaign,
  type AttributionModelKey,
} from "@/services/attribution";
import { CHART_MUTED, CHART_PRIMARY } from "@/lib/chartPalette";
import { fmtDateShort, fmtPct } from "@/lib/format";
import { canSeeNav, useRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Format a metric value according to its KPI unit ('%', 'USD', 'count'). */
function fmtByUnit(value: number, unit: string | undefined): string {
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "USD") return compactCurrency.format(value);
  return value >= 10000 ? compactNumber.format(value) : wholeNumber.format(value);
}

/** 'email_open_rate' -> 'Email open rate' (sentence case, known keys mapped). */
const METRIC_LABELS: Record<string, string> = {
  impressions: "Impressions",
  email_open_rate: "Email open rate",
  preorders: "Pre-orders",
  registrations: "Registrations",
  revenue_attributed: "Revenue attributed",
  pipeline_usd: "Pipeline influenced",
  participation_rate: "Participation rate",
};

/** '+42%' / '-13%' from a fraction — ROI is always shown signed. */
function fmtSignedPct(fraction: number): string {
  const pct = Math.round(fraction * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

/** Emerald for break-even or better, rose for value-destructive spend. */
function roiToneClass(roi: number): string {
  return roi >= 0
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-rose-700 dark:text-rose-400";
}

function metricLabel(metricKey: string): string {
  if (METRIC_LABELS[metricKey]) return METRIC_LABELS[metricKey];
  const words = metricKey.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const TIER_ORDER: Record<KpiTier, number> = {
  reach: 0,
  engagement: 1,
  conversion: 2,
  business: 3,
  brand: 4,
};

const TIER_LABELS: Record<KpiTier, string> = {
  reach: "Reach",
  engagement: "Engagement",
  conversion: "Conversion",
  business: "Business",
  brand: "Brand",
};

/* ------------------------------------------------------------------ */
/* Chart styling — theme tokens only, no raw hex                       */
/* ------------------------------------------------------------------ */

const PRIMARY = CHART_PRIMARY;
const MUTED = CHART_MUTED;

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
} as const;

const AXIS_TICK = { fill: MUTED, fontSize: 11 } as const;

/**
 * Gap between the plot floor and the week labels. At the Recharts default the
 * first week label starts 4px under the floor, while the bottom value label is
 * drawn centred ON the floor and hangs 8px below it — 'Jun 8' and '0' came out
 * on top of each other in the bottom-left corner of every weekly series.
 */
const X_TICK_MARGIN = 10;

/* ------------------------------------------------------------------ */
/* Attainment RAG chip                                                 */
/* ------------------------------------------------------------------ */

type Rag = "green" | "amber" | "red";

const RAG_STYLES: Record<Rag, string> = {
  green: "border-success/20 bg-success/10 text-success",
  amber: "border-warning/20 bg-warning/10 text-warning",
  red: "border-destructive/20 bg-destructive/10 text-destructive",
};

const RAG_LABELS: Record<Rag, string> = {
  green: "On track",
  amber: "At risk",
  red: "Off track",
};

function attainmentRag(attainment: number): Rag {
  if (attainment >= 0.9) return "green";
  if (attainment >= 0.6) return "amber";
  return "red";
}

function RagChip({ rag }: { rag: Rag }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        RAG_STYLES[rag],
      )}
    >
      {RAG_LABELS[rag]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Pure derivations over the SeedDB (page-local, no literals)          */
/* ------------------------------------------------------------------ */

/** KPI unit for a metric key, from the KPI registry. */
function unitForMetricKey(db: SeedDB, metricKey: string): string | undefined {
  return db.kpis.find((k) => k.metricKey === metricKey)?.unit;
}

/** True when the key's values are rates (mean-aggregated, never summed). */
function isRateKey(db: SeedDB, metricKey: string): boolean {
  return unitForMetricKey(db, metricKey) === "%";
}

/** Lowest KPI tier rank a metric key belongs to (funnel ordering). */
function tierForMetricKey(db: SeedDB, metricKey: string): KpiTier | undefined {
  const tiers = db.kpis.filter((k) => k.metricKey === metricKey).map((k) => k.tier);
  return tiers.sort((a, b) => TIER_ORDER[a] - TIER_ORDER[b])[0];
}

/** Distinct metric keys with fact rows, ordered by tier then key. */
function metricKeysInFacts(db: SeedDB): string[] {
  const keys = [...new Set(db.metricResults.map((m) => m.metricKey))];
  return keys.sort((a, b) => {
    const tierDelta =
      TIER_ORDER[tierForMetricKey(db, a) ?? "brand"] -
      TIER_ORDER[tierForMetricKey(db, b) ?? "brand"];
    return tierDelta !== 0 ? tierDelta : a.localeCompare(b, DEFAULT_LOCALE);
  });
}

function campaignRows(db: SeedDB, campaignId: string): MetricResult[] {
  return db.metricResults.filter((m) => m.dimensions.campaignId === campaignId);
}

interface FunnelStage {
  metricKey: string;
  tier: KpiTier | undefined;
  /** Sum for additive keys, mean for '%' keys. */
  value: number;
  isRate: boolean;
}

/** Per-metric aggregates for one campaign, in funnel (tier) order. */
function campaignFunnel(db: SeedDB, campaignId: string): FunnelStage[] {
  const byKey = new Map<string, { total: number; count: number }>();
  for (const row of campaignRows(db, campaignId)) {
    const bucket = byKey.get(row.metricKey) ?? { total: 0, count: 0 };
    bucket.total += row.value;
    bucket.count += 1;
    byKey.set(row.metricKey, bucket);
  }
  return [...byKey.entries()]
    .map(([metricKey, { total, count }]) => {
      const isRate = isRateKey(db, metricKey);
      return {
        metricKey,
        tier: tierForMetricKey(db, metricKey),
        value: isRate && count > 0 ? total / count : total,
        isRate,
      };
    })
    .sort(
      (a, b) => TIER_ORDER[a.tier ?? "brand"] - TIER_ORDER[b.tier ?? "brand"],
    );
}

/** Weekly series (mean for rate keys) for one metric key of one campaign. */
function campaignMetricSeries(
  db: SeedDB,
  campaignId: string,
  metricKey: string,
): { period: string; value: number }[] {
  const rate = isRateKey(db, metricKey);
  const byPeriod = new Map<string, { total: number; count: number }>();
  for (const row of campaignRows(db, campaignId)) {
    if (row.metricKey !== metricKey) continue;
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

/* ------------------------------------------------------------------ */
/* Cost efficiency + benchmark presentation                            */
/* ------------------------------------------------------------------ */

/** Cost-per-x is money per single action — shown to the cent, not compacted. */
const exactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

/** Rounded count for credited (split) volumes. */
function fmtCount(value: number): string {
  return wholeNumber.format(Math.round(value));
}

/** '—' whenever the input is missing; a real number is never invented. */
function fmtCostRatio(value: number | null): string {
  return value === null ? "—" : exactCurrency.format(value);
}

const BENCHMARK_STANDING_LABELS: Record<BenchmarkStanding, string> = {
  "top-quartile": "Top quartile",
  "above-median": "Above median",
  "below-median": "Below median",
};

const BENCHMARK_STANDING_STYLES: Record<BenchmarkStanding, string> = {
  "top-quartile": "border-success/20 bg-success/10 text-success",
  "above-median": "border-border bg-muted text-muted-foreground",
  "below-median": "border-warning/20 bg-warning/10 text-warning",
};

/**
 * A benchmark figure with its own unit attached.
 *
 * The Measured column always prints a percentage, which is safe because
 * `benchmarkComparisons` only compares rate metrics. Benchmark rows carry a
 * prose unit though ('% of registrations attending', 'impressions per $1k
 * spend'), and appending '%' only on an exact '%' match dropped the unit
 * entirely for those — BMK-008 would have rendered a bare '38' beside a
 * '38.0%'. Anything whose unit starts with '%' is a percentage; anything else
 * keeps its unit in words rather than losing it.
 */
function fmtBenchmarkValue(value: number, unit: string): string {
  if (unit.startsWith("%")) return `${value}%`;
  return `${value} ${unit}`;
}

/** '+29%' / '-4%' against the industry median. */
function fmtVsMedian(pct: number): string {
  const rounded = Math.round(pct);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/* ------------------------------------------------------------------ */
/* Attribution model limitations (FR-MA-03)                            */
/* ------------------------------------------------------------------ */

/** What each model structurally cannot see — stated, not implied. */
const MODEL_LIMITATIONS: Record<AttributionModelKey, string> = {
  "first-touch":
    "Cannot account for anything after the first touch — nurture, re-engagement, or the channel that actually closed. Discovery channels are systematically over-credited.",
  "last-touch":
    "Cannot account for the demand created before the final touch. Closing and intent-capture channels absorb credit that earlier channels built.",
  linear:
    "Cannot account for touches differing in persuasive weight. Every touch is assumed equally influential, which flatters high-frequency channels.",
  "time-decay":
    "Cannot account for slow-burn brand building. Recency is assumed to equal influence, so early awareness work is discounted by construction.",
  "position-based":
    "Cannot account for a middle touch that actually decided the outcome. The 40/20/40 split is an assumption carried in the model, not a measurement.",
};

/** Limits that hold for every model, because they are limits of the input data. */
const SHARED_ATTRIBUTION_LIMITATIONS = [
  "Only delivered channel executions are counted — no view-through, offline, retail, word-of-mouth, or competitor activity enters the model.",
  "Touch order comes from scheduled send times, not observed per-person journeys, so sequence is an approximation of exposure.",
  "There is no holdout or control group, so no model here measures incrementality — none of these numbers says what would have happened anyway.",
  "Credit is distributed inside one campaign at a time; influence flowing between campaigns, or from always-on brand spend, is invisible.",
  "Conversion volume is the campaign's conversion-tier fact total; conversions with no campaign dimension are not attributed at all.",
];

/* ------------------------------------------------------------------ */
/* Learn loop (FR-MA-08) — recommendations derived from the numbers    */
/* ------------------------------------------------------------------ */

interface LearningLink {
  label: string;
  to: string;
}

interface Learning {
  id: string;
  /** Sentence naming the observation and the suggested response. */
  headline: string;
  /** The numbers the headline came from, stated in full. */
  evidence: string;
  links: LearningLink[];
}

const LINK_PERSONAS: LearningLink = { label: "Personas", to: "/audiences" };
const LINK_IDEAS: LearningLink = { label: "Ideas", to: "/ideas" };

/**
 * Turns the derived analytics into candidate learnings. Every headline carries
 * the comparison it came from; nothing here writes back to the seed — adopting
 * a learning is an approver decision taken on the pages these link to.
 */
function deriveLearnings(input: {
  personaRows: PersonaPerformanceRow[];
  messageRows: MessagePerformanceRow[];
  anomalies: AnomalyFlag[];
  benchmarks: BenchmarkComparison[];
  /** Formats a metric value in its KPI unit (the page owns the KPI registry). */
  formatValue: (metricKey: string, value: number) => string;
}): Learning[] {
  const { personaRows, messageRows, anomalies, benchmarks, formatValue } = input;
  const out: Learning[] = [];

  /* 1 — persona outperformance against the mean of the other personas. */
  const scoredPersonas = personaRows.filter((p) => p.conversions > 0);
  if (scoredPersonas.length >= 2) {
    const [top, ...rest] = scoredPersonas;
    const restMean =
      rest.reduce((sum, p) => sum + p.conversions, 0) / rest.length;
    if (restMean > 0 && top.conversions > restMean) {
      const pct = Math.round(((top.conversions - restMean) / restMean) * 100);
      out.push({
        id: `persona-${top.personaId}`,
        headline: `${top.personaName} outperformed by ${pct}% — refresh positioning for the other personas`,
        evidence:
          rest.length === 1
            ? `${fmtCount(top.conversions)} credited conversions across ${top.campaignIds.length} campaign${top.campaignIds.length === 1 ? "" : "s"}, against ${fmtCount(rest[0].conversions)} for ${rest[0].personaName}.`
            : `${fmtCount(top.conversions)} credited conversions across ${top.campaignIds.length} campaign${top.campaignIds.length === 1 ? "" : "s"}, against a ${fmtCount(restMean)} average for the other ${rest.length} personas with data.`,
        links: [LINK_PERSONAS, LINK_IDEAS],
      });
    }
  }

  /* 2 — the message with the strongest engagement rate. */
  const engaged = messageRows
    .filter((m) => m.engagementRatePct !== null)
    .sort((a, b) => (b.engagementRatePct ?? 0) - (a.engagementRatePct ?? 0));
  if (engaged.length >= 2) {
    const [best, second] = engaged;
    const bestRate = best.engagementRatePct ?? 0;
    const secondRate = second.engagementRatePct ?? 0;
    if (secondRate > 0 && bestRate > secondRate) {
      const pct = Math.round(((bestRate - secondRate) / secondRate) * 100);
      out.push({
        id: `message-${best.contentId}`,
        headline: `"${best.title}" led engagement by ${pct}% — reuse the angle in the next brief`,
        evidence: `${bestRate.toFixed(1)}% mean engagement rate against ${secondRate.toFixed(1)}% for "${second.title}".`,
        links: [
          { label: "Open the message", to: `/content/${best.contentId}` },
          LINK_IDEAS,
        ],
      });
    }
  }

  /* 3 — the sharpest deviation from a campaign's own trailing mean. */
  const sharpest =
    anomalies.find((a) => a.direction === "below") ?? anomalies[0];
  if (sharpest) {
    out.push({
      id: `anomaly-${sharpest.campaignId}-${sharpest.metricKey}`,
      headline:
        sharpest.direction === "below"
          ? `${metricLabel(sharpest.metricKey)} on ${sharpest.campaignName} ran ${sharpest.comparison} — review pacing before the next flight`
          : `${metricLabel(sharpest.metricKey)} on ${sharpest.campaignName} ran ${sharpest.comparison} — capture what changed while it is fresh`,
      evidence: `Week of ${fmtDateShort(sharpest.period)}: ${formatValue(sharpest.metricKey, sharpest.latest)} against a ${formatValue(sharpest.metricKey, sharpest.trailingMean)} ${sharpest.trailingWeeks}-week mean.`,
      links: [
        { label: "Open the campaign", to: `/campaigns/${sharpest.campaignId}` },
        LINK_IDEAS,
      ],
    });
  }

  /* 4 — closest run at the industry top quartile. */
  const nearTop = benchmarks
    .filter(
      (b) =>
        b.standing === "above-median" &&
        b.pointsToTopQuartile !== null &&
        b.pointsToTopQuartile > 0,
    )
    .sort((a, b) => (a.pointsToTopQuartile ?? 0) - (b.pointsToTopQuartile ?? 0))[0];
  if (nearTop?.benchmark) {
    out.push({
      id: `benchmark-${nearTop.campaignId}-${nearTop.metricKey}`,
      headline: `${nearTop.campaignName} is ${(nearTop.pointsToTopQuartile ?? 0).toFixed(1)} pts off the top quartile on ${metricLabel(nearTop.metricKey).toLowerCase()} — worth one more test`,
      evidence: `${nearTop.actual.toFixed(1)}% measured against a ${fmtBenchmarkValue(nearTop.benchmark.industryMedian, nearTop.benchmark.unit)} industry median and a ${fmtBenchmarkValue(nearTop.benchmark.topQuartile, nearTop.benchmark.unit)} top quartile — source: ${nearTop.benchmark.sourceLabel}`,
      links: [LINK_IDEAS, LINK_PERSONAS],
    });
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PerformancePage() {
  return (
    <ErrorBoundary>
      <PerformanceContent />
    </ErrorBoundary>
  );
}

function PerformanceContent() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  const { brandId, businessUnitId, regionId } = useScope();

  /* This page admits ten roles; `/audiences` admits five. The persona rows
     below link there, so without this gate a Content Manager, Brand Manager,
     PR Manager, Corporate Comms Manager or Executive clicks a persona name and
     lands on the restricted-area notice. */
  const { role } = useRole();
  const canOpenAudiences = canSeeNav(role, "audiences");

  // Live DB, not the frozen seed: a campaign promoted on the Ideation hub, or
  // any other runtime mutation, must reach this page too — every other read
  // surface (Command center, Budget, Board pack) already derives from it, and
  // reading the seed here made Performance disagree with all of them.
  const db = useLiveDB();

  const scope = useMemo<Scope>(
    () => ({ brandId, businessUnitId, regionId }),
    [brandId, businessUnitId, regionId],
  );

  /** Campaigns the topbar scope currently admits — the basis for KPI scoping. */
  const scopedCampaigns = useMemo(() => campaignsInScope(db, scope), [db, scope]);

  /* KPI attainment — only KPIs attached to something in the current scope, so
     the table agrees with the scoped header above it. Campaign-attached KPIs
     are scoped to their own campaign's fact rows. */
  const kpiRows = useMemo(() => {
    const inScopeCampaignIds = new Set(scopedCampaigns.map((c) => c.id));
    const inScopeStrategyIds = new Set(
      scopedCampaigns.map((c) => c.strategyId).filter((id): id is string => Boolean(id)),
    );
    return db.kpis
      .filter((kpi) => {
        const c = kpi.attachedTo?.campaignId;
        const st = kpi.attachedTo?.strategyId;
        if (c) return inScopeCampaignIds.has(c);
        if (st) return inScopeStrategyIds.has(st);
        return true;
      })
      .map((kpi) => ({
        kpi,
        attainment: kpiAttainment(db, kpi.id, kpi.attachedTo?.campaignId),
      }));
  }, [db, scopedCampaigns]);

  /* Weekly trends — one series per metric key with in-scope fact rows. */
  const trendCharts = useMemo(
    () =>
      metricKeysInFacts(db)
        .map((metricKey) => ({
          metricKey,
          unit: unitForMetricKey(db, metricKey),
          series: metricSeries(db, metricKey, scope),
        }))
        .filter((chart) => chart.series.length > 0),
    [db, scope],
  );

  const mix = useMemo(() => channelMix(db, scope), [db, scope]);

  /* Funnel drilldown — Live/Completed campaigns in scope. */
  const drillCampaigns = useMemo(
    () =>
      campaignsInScope(db, scope).filter(
        (c) => c.status === "Live" || c.status === "Completed",
      ),
    [db, scope],
  );

  /* ROI — spend joined against business-tier attributed value (one selector,
     shared with the Budget page, so both surfaces reconcile by construction). */
  const scopedRoi = useMemo(() => roiSummary(db, scope), [db, scope]);
  const roiRows = useMemo(
    () =>
      drillCampaigns.map((campaign) => ({
        campaign,
        ...campaignRoi(db, campaign.id),
      })),
    [db, drillCampaigns],
  );

  /* Cost efficiency — CPL / CAC / CPA / ROAS per campaign, nulls preserved. */
  const costRows = useMemo(
    () =>
      drillCampaigns.map((campaign) => ({
        campaign,
        cost: costMetrics(db, campaign.id),
      })),
    [db, drillCampaigns],
  );

  /* Anomalies — latest week vs each campaign's own trailing mean. */
  const anomalies = useMemo(() => anomalyFlags(db, scope), [db, scope]);

  /* Persona and message breakdowns — the same fact rows, joined two ways. */
  const personaRows = useMemo(() => performanceByPersona(db, scope), [db, scope]);
  const messageRows = useMemo(() => performanceByMessage(db, scope), [db, scope]);

  /* Benchmarks — measured rate metrics against the reference data. */
  const benchmarks = useMemo(() => benchmarkComparisons(db, scope), [db, scope]);

  /* Playbook patterns — reference data, strongest observed lift first. */
  const patterns = useMemo(
    () => [...db.playbookPatterns].sort((a, b) => b.liftPct - a.liftPct),
    [db],
  );

  /* Learn loop — recommendations derived from the four blocks above. */
  const learnings = useMemo(
    () =>
      deriveLearnings({
        personaRows,
        messageRows,
        anomalies,
        benchmarks,
        formatValue: (metricKey, value) =>
          fmtByUnit(value, unitForMetricKey(db, metricKey)),
      }),
    [db, personaRows, messageRows, anomalies, benchmarks],
  );

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>();
  const selectedCampaign = useMemo(
    () =>
      drillCampaigns.find((c) => c.id === selectedCampaignId) ?? drillCampaigns[0],
    [drillCampaigns, selectedCampaignId],
  );

  const funnel = useMemo(
    () => (selectedCampaign ? campaignFunnel(db, selectedCampaign.id) : []),
    [db, selectedCampaign],
  );
  const funnelBars = useMemo(() => funnel.filter((s) => !s.isRate), [funnel]);
  const funnelRates = useMemo(() => funnel.filter((s) => s.isRate), [funnel]);
  /**
   * Bar widths are drawn against the largest stage, not the first one. Stages
   * are ordered by KPI tier and carry different units — a business-tier USD
   * figure (pipeline influenced) can exceed the reach count above it, and
   * scaling against the first stage then produced a bar wider than its own
   * track. The printed figure beside each bar is the value; the bar is only a
   * relative read.
   */
  const funnelTop = funnelBars.reduce((max, stage) => Math.max(max, stage.value), 0);

  const drillSeries = useMemo(
    () =>
      selectedCampaign
        ? [...new Set(campaignRows(db, selectedCampaign.id).map((m) => m.metricKey))]
            .sort(
              (a, b) =>
                TIER_ORDER[tierForMetricKey(db, a) ?? "brand"] -
                TIER_ORDER[tierForMetricKey(db, b) ?? "brand"],
            )
            .map((metricKey) => ({
              metricKey,
              unit: unitForMetricKey(db, metricKey),
              series: campaignMetricSeries(db, selectedCampaign.id, metricKey),
            }))
            .filter((chart) => chart.series.length > 0)
        : [],
    [db, selectedCampaign],
  );

  /* Attribution — all five pluggable models over one campaign's touchpoints. */
  const [attributionCampaignId, setAttributionCampaignId] = useState<
    string | undefined
  >();
  const attributionCampaign = useMemo(
    () =>
      drillCampaigns.find((c) => c.id === attributionCampaignId) ??
      drillCampaigns[0],
    [drillCampaigns, attributionCampaignId],
  );
  const [attributionModelKey, setAttributionModelKey] =
    useState<AttributionModelKey>("linear");

  /* Every model runs over the identical derived touchpoint sequence. */
  const attributionByModel = useMemo(
    () =>
      attributionCampaign
        ? ATTRIBUTION_MODELS.map((model) =>
            attributeCampaign(db, attributionCampaign.id, model.key),
          )
        : [],
    [db, attributionCampaign],
  );

  const selectedAttribution = useMemo(
    () => attributionByModel.find((a) => a.modelKey === attributionModelKey),
    [attributionByModel, attributionModelKey],
  );
  const attributionConversionTotal = selectedAttribution?.conversion.value ?? 0;
  const attributionTouchpointCount =
    selectedAttribution?.touchpoints.length ?? 0;

  /** Channel ids in touchpoint order — identical across all five models. */
  const attributionChannelIds = useMemo(
    () => attributionByModel[0]?.allocations.map((a) => a.channelId) ?? [],
    [attributionByModel],
  );

  const attributionChannelName = (channelId: string) =>
    db.channels.find((c) => c.id === channelId)?.name ?? channelId;

  /* Bar chart rows for the selected model: absolute credit when the campaign
     has conversion volume, otherwise credit share (%). */
  const attributionBars = useMemo(
    () =>
      selectedAttribution
        ? [...selectedAttribution.allocations]
            .sort((a, b) => b.weight - a.weight)
            .map((a) => ({
              channelName:
                db.channels.find((c) => c.id === a.channelId)?.name ??
                a.channelId,
              credit:
                selectedAttribution.conversion.value > 0
                  ? a.value
                  : a.weight * 100,
              weight: a.weight,
            }))
        : [],
    [db, selectedAttribution],
  );

  /** Owning campaign or strategy of a KPI (campaigns link to their detail page). */
  const kpiOwner = (kpi: KPI) => {
    const { campaignId, strategyId } = kpi.attachedTo;
    if (campaignId) {
      const campaign = db.campaigns.find((c) => c.id === campaignId);
      return (
        <Link
          to={`/campaigns/${campaignId}`}
          className="text-sm hover:underline"
        >
          {campaign?.name ?? campaignId}
        </Link>
      );
    }
    if (strategyId) {
      const strategy = db.strategies.find((s) => s.id === strategyId);
      return (
        <span className="text-sm text-muted-foreground">
          {strategy?.title ?? strategyId}
        </span>
      );
    }
    return <span className="text-sm text-muted-foreground">—</span>;
  };

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Performance"
        description="KPI attainment, weekly trends, and channel mix across the current scope"
      />

      {/* Headline ROI — derived from the shared campaignRoi join */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Estimated ROI"
          value={
            scopedRoi.roi !== null ? (
              <span className={roiToneClass(scopedRoi.roi)}>
                {fmtSignedPct(scopedRoi.roi)}
              </span>
            ) : (
              "—"
            )
          }
          sub={
            scopedRoi.roi !== null
              ? `${compactCurrency.format(scopedRoi.attributedValue)} attributed vs ${compactCurrency.format(scopedRoi.spend)} spend · ${scopedRoi.measuredCampaignCount} campaign${scopedRoi.measuredCampaignCount === 1 ? "" : "s"} measured`
              : "No campaigns with attributed business value in scope"
          }
        />
      </div>

      {/* KPI attainment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">KPI attainment</CardTitle>
        </CardHeader>
        <CardContent>
          {kpiRows.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="No KPIs defined"
              hint="The seed contains no KPI targets to report against."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Attainment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiRows.map(({ kpi, attainment }) => (
                  <TableRow key={kpi.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{kpi.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {metricLabel(kpi.metricKey)} · {kpi.period}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TIER_LABELS[kpi.tier]}
                    </TableCell>
                    <TableCell>{kpiOwner(kpi)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtByUnit(kpi.target, kpi.unit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {attainment ? fmtByUnit(attainment.actual, kpi.unit) : "—"}
                      {/* A campaign-attached KPI reads only its own campaign's
                          fact rows (`kpiAttainment` is passed the campaign id).
                          A strategy-attached one has no single campaign to
                          narrow to, so its actual is every fact row for the
                          metric — which the topbar scope does not touch. The
                          row says which, rather than letting two differently
                          counted numbers sit in one column unlabelled. */}
                      {attainment && !kpi.attachedTo.campaignId && (
                        <div className="text-[11px] font-normal text-muted-foreground">
                          all campaigns
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {attainment ? fmtPct(attainment.attainment) : "—"}
                    </TableCell>
                    <TableCell>
                      {attainment ? (
                        <RagChip rag={attainmentRag(attainment.attainment)} />
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          No data yet
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Estimated ROI by campaign — same campaignRoi selector as the tile above */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Estimated ROI by campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roiRows.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="No live or completed campaigns in scope"
              hint="ROI joins committed spend against attributed business value. Widen the filters to find a measured campaign."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Attributed value</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roiRows.map(({ campaign, spend, attributedValue, roi }) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {compactCurrency.format(spend)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {roi !== null ? compactCurrency.format(attributedValue) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {roi !== null ? (
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            roiToneClass(roi),
                          )}
                        >
                          {fmtSignedPct(roi)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No business metrics
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cost metrics — CPL / CAC / CPA / ROAS (FR-MA-04) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Cost metrics by campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costRows.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No live or completed campaigns in scope"
              hint="Cost metrics divide committed spend by the volumes a campaign's own fact rows report. Widen the filters to find one."
            />
          ) : (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead className="text-right">CAC</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead>Missing inputs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costRows.map(({ campaign, cost }) => {
                    const missing: string[] = [];
                    if (cost.basis.leads.volume === null)
                      missing.push("no lead data");
                    if (cost.basis.acquisitions.volume === null)
                      missing.push("no acquisition data");
                    if (cost.basis.conversions.volume === null)
                      missing.push("no conversion data");
                    if (cost.basis.attributedValue.volume === null)
                      missing.push("no attributed-value data");
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {campaign.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {cost.basis.conversions.volume !== null
                              ? `${fmtCount(cost.basis.conversions.volume)} conversion actions · ${cost.basis.conversions.metricKeys
                                  .map(metricLabel)
                                  .join(", ")}`
                              : "No conversion-tier fact rows"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {compactCurrency.format(cost.spend)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtCostRatio(cost.cpl)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtCostRatio(cost.cac)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtCostRatio(cost.cpa)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {cost.roas !== null ? `${cost.roas.toFixed(2)}x` : "—"}
                        </TableCell>
                        <TableCell>
                          {missing.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              All inputs present
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {missing.join(" · ")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                CPL is committed spend per lead-type conversion (registrations,
                sign-ups); CAC is spend per acquisition (pre-orders, orders);
                CPA is spend per conversion-tier action of any kind; ROAS is
                attributed business value per unit of spend. An em dash means
                the campaign has no fact rows of that kind — the ratio is left
                unstated rather than estimated.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomalies — each campaign judged against its own history (FR-MA-06) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No deviations beyond the threshold"
              hint={`Every in-scope series' latest week sits within ${ANOMALY_THRESHOLD_PCT}% of its own trailing ${ANOMALY_TRAILING_WEEKS}-week mean.`}
            />
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2">
                {anomalies.map((flag) => (
                  <li
                    key={`${flag.campaignId}-${flag.metricKey}`}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border p-3"
                  >
                    <AlertTriangle
                      className="h-4 w-4 shrink-0 self-center text-warning"
                      aria-hidden="true"
                    />
                    <Link
                      to={`/campaigns/${flag.campaignId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {flag.campaignName}
                    </Link>
                    <span className="text-sm">
                      {metricLabel(flag.metricKey)} ran{" "}
                      <span className="font-medium">{flag.comparison}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      week of {fmtDateShort(flag.period)} ·{" "}
                      {fmtByUnit(
                        flag.latest,
                        unitForMetricKey(db, flag.metricKey),
                      )}{" "}
                      against a{" "}
                      {fmtByUnit(
                        flag.trailingMean,
                        unitForMetricKey(db, flag.metricKey),
                      )}{" "}
                      {flag.trailingWeeks}-week mean
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                A metric is flagged when its most recent reported week deviates
                from that campaign's own trailing {ANOMALY_TRAILING_WEEKS}-week
                mean by more than {ANOMALY_THRESHOLD_PCT}%. The baseline is the
                campaign's own history, so a flag says the number moved — not
                that it is good or bad.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly trends */}
      <div>
        <h2 className="mb-2 text-sm font-medium">Weekly trends</h2>
        {trendCharts.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No metric results in scope"
            hint="Widen the brand, business unit, or region filters to see weekly trends."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {trendCharts.map(({ metricKey, unit, series }) => (
              <Card key={metricKey}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metricLabel(metricKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ left: 8, right: 16, top: 8 }}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="period"
                          tickFormatter={fmtDateShort}
                          tick={AXIS_TICK}
                          tickMargin={X_TICK_MARGIN}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v: number) => fmtByUnit(v, unit)}
                          tick={AXIS_TICK}
                          axisLine={false}
                          tickLine={false}
                          width={56}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          labelFormatter={(label: string) =>
                            `Week of ${fmtDateShort(label)}`
                          }
                          formatter={(value: number) => [
                            fmtByUnit(value, unit),
                            metricLabel(metricKey),
                          ]}
                        />
                        <Line
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="value"
                          stroke={PRIMARY}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Channel mix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Channel mix</CardTitle>
        </CardHeader>
        <CardContent>
          {mix.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No channel volume in scope"
              hint="No metric results carry a channel dimension for the current filters."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mix} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => compactNumber.format(v)}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="channelName"
                      width={140}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number) => [
                        compactNumber.format(value),
                        "Volume",
                      ]}
                    />
                    <Bar isAnimationActive={false} dataKey="value" fill={PRIMARY} radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 self-center text-xs">
                {mix.map((slice) => (
                  <li key={slice.channelId} className="flex items-center gap-2">
                    {/* The column is narrow and the platform names are long
                        ('Lifecycle email (AJO / SFMC)' loses its last 14px), so
                        the full name has to stay reachable on hover. */}
                    <span
                      className="min-w-0 flex-1 truncate text-muted-foreground"
                      title={slice.channelName}
                    >
                      {slice.channelName}
                    </span>
                    <span className="tabular-nums">
                      {compactNumber.format(slice.value)}
                    </span>
                    <span className="w-10 text-right tabular-nums text-muted-foreground">
                      {fmtPct(slice.share)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By persona / by message — the same fact rows joined two ways (FR-MA-07) */}
      <div>
        <h2 className="mb-2 text-sm font-medium">
          Performance by persona and by message
        </h2>
        {/* Stacked, not side-by-side: both tables carry long names and six
            columns, which cramp badly in a half-width column. */}
        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By persona</CardTitle>
            </CardHeader>
            <CardContent>
              {personaRows.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No persona-attributable results in scope"
                  hint="Results reach a persona through the campaign's communications and their audience. Widen the filters to find one."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                      <TableHead className="text-right">Per 1k reach</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personaRows.map((row, index) => (
                      <TableRow key={row.personaId}>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          {canOpenAudiences ? (
                            <Link
                              to="/audiences"
                              className="text-sm font-medium hover:underline"
                            >
                              {row.personaName}
                            </Link>
                          ) : (
                            <span
                              className="text-sm font-medium"
                              title="Personas are managed on the audiences page, which is not open to your role."
                            >
                              {row.personaName}
                            </span>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {row.audienceName} · {row.campaignIds.length} campaign
                            {row.campaignIds.length === 1 ? "" : "s"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.reach > 0 ? compactNumber.format(row.reach) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.conversions > 0 ? fmtCount(row.conversions) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.conversionsPerThousandReach !== null
                            ? row.conversionsPerThousandReach.toFixed(1)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.engagementRatePct !== null
                            ? `${row.engagementRatePct.toFixed(1)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By message</CardTitle>
            </CardHeader>
            <CardContent>
              {messageRows.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No message-attributable results in scope"
                  hint="Results reach a message through the communication that carried the content item. Widen the filters to find one."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Conversions</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messageRows.map((row, index) => (
                      <TableRow key={row.contentId}>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/content/${row.contentId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {row.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {row.contentType} · {row.campaignIds.length} campaign
                            {row.campaignIds.length === 1 ? "" : "s"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.reach > 0 ? compactNumber.format(row.reach) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.conversions > 0 ? fmtCount(row.conversions) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.engagementRatePct !== null
                            ? `${row.engagementRatePct.toFixed(1)}%`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Both tables read the same fact rows, joined through campaign activity →
          communication → audience (persona) or content item (message). A row
          that reached several personas or messages is split evenly between them,
          so the breakdown stays additive against the scope total; rate metrics
          are averaged, never split.
        </p>
      </div>

      {/* Benchmarks — measured rates against external reference data (FR-MA-10) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Benchmarks — rate metrics vs industry
          </CardTitle>
        </CardHeader>
        <CardContent>
          {benchmarks.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="No rate metrics to benchmark in scope"
              hint="Benchmarks compare '%'-unit metrics against reference data matched on metric and channel kind."
            />
          ) : (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Measured</TableHead>
                    <TableHead className="text-right">Industry median</TableHead>
                    <TableHead className="text-right">Top quartile</TableHead>
                    <TableHead className="text-right">vs median</TableHead>
                    <TableHead>Standing</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benchmarks.map((row) => (
                    <TableRow key={`${row.campaignId}-${row.metricKey}`}>
                      <TableCell>
                        <Link
                          to={`/campaigns/${row.campaignId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {row.campaignName}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {metricLabel(row.metricKey)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.actual.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.benchmark
                          ? fmtBenchmarkValue(
                              row.benchmark.industryMedian,
                              row.benchmark.unit,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.benchmark
                          ? fmtBenchmarkValue(
                              row.benchmark.topQuartile,
                              row.benchmark.unit,
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.vsMedianPct !== null
                          ? fmtVsMedian(row.vsMedianPct)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {row.standing ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                              BENCHMARK_STANDING_STYLES[row.standing],
                            )}
                          >
                            {BENCHMARK_STANDING_LABELS[row.standing]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No benchmark
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[18rem] text-xs text-muted-foreground">
                        {row.benchmark?.sourceLabel ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Benchmarks are external reference data matched on metric key and,
                where the fact rows carry one, channel kind. They are a published
                comparison, not a target — the source and its population are
                named on every row so the comparability is yours to judge.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign funnel drilldown */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Campaign funnel</CardTitle>
          {drillCampaigns.length > 0 && selectedCampaign && (
            <Select
              value={selectedCampaign.id}
              onValueChange={setSelectedCampaignId}
            >
              <SelectTrigger className="h-8 w-64 text-sm">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {drillCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {drillCampaigns.length === 0 || !selectedCampaign ? (
            <EmptyState
              icon={Filter}
              title="No live or completed campaigns in scope"
              hint="Funnel drilldown covers campaigns that have shipped metric results. Widen the filters to find one."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/campaigns/${selectedCampaign.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {selectedCampaign.name}
                </Link>
                <StatusBadge status={selectedCampaign.status} />
                {funnelRates.map((stage) => (
                  <span
                    key={stage.metricKey}
                    className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {metricLabel(stage.metricKey)}
                    <span className="ml-1 font-medium tabular-nums text-foreground">
                      {fmtByUnit(stage.value, "%")}
                    </span>
                  </span>
                ))}
              </div>

              {funnelBars.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No funnel volume recorded"
                  hint="This campaign has no additive metric results to build a funnel from."
                />
              ) : (
                <ul className="space-y-2">
                  {funnelBars.map((stage) => (
                    <li key={stage.metricKey} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                        {stage.tier ? TIER_LABELS[stage.tier] : "Other"}
                      </span>
                      <span className="w-36 shrink-0 truncate text-sm">
                        {metricLabel(stage.metricKey)}
                      </span>
                      <div className="h-5 min-w-0 flex-1 rounded bg-muted">
                        <div
                          className="h-full rounded bg-primary"
                          style={{
                            width: `${
                              funnelTop > 0
                                ? Math.max(2, (stage.value / funnelTop) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                        {fmtByUnit(
                          stage.value,
                          unitForMetricKey(db, stage.metricKey),
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {drillSeries.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {drillSeries.map(({ metricKey, unit, series }) => (
                    <div key={metricKey} className="rounded-lg border p-3">
                      <div className="mb-1 text-xs font-medium text-muted-foreground">
                        {metricLabel(metricKey)}
                      </div>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={series}
                            margin={{ left: 4, right: 8, top: 4 }}
                          >
                            <XAxis
                              dataKey="period"
                              tickFormatter={fmtDateShort}
                              tick={AXIS_TICK}
                              tickMargin={X_TICK_MARGIN}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tickFormatter={(v: number) => fmtByUnit(v, unit)}
                              tick={AXIS_TICK}
                              axisLine={false}
                              tickLine={false}
                              width={52}
                            />
                            <Tooltip
                              contentStyle={CHART_TOOLTIP_STYLE}
                              labelFormatter={(label: string) =>
                                `Week of ${fmtDateShort(label)}`
                              }
                              formatter={(value: number) => [
                                fmtByUnit(value, unit),
                                metricLabel(metricKey),
                              ]}
                            />
                            <Line
                              isAnimationActive={false}
                              type="monotone"
                              dataKey="value"
                              stroke={PRIMARY}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attribution — pluggable calculators over identical touchpoint data */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attribution</CardTitle>
          {drillCampaigns.length > 0 && attributionCampaign && (
            <Select
              value={attributionCampaign.id}
              onValueChange={setAttributionCampaignId}
            >
              <SelectTrigger className="h-8 w-64 text-sm">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {drillCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {drillCampaigns.length === 0 || !attributionCampaign ? (
            <EmptyState
              icon={Network}
              title="No live or completed campaigns in scope"
              hint="Attribution runs over campaigns whose channel executions have shipped. Widen the filters to find one."
            />
          ) : attributionTouchpointCount === 0 ? (
            <EmptyState
              icon={Network}
              title="No touchpoints derived"
              hint="This campaign's activities have no channel executions to attribute credit across."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/campaigns/${attributionCampaign.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {attributionCampaign.name}
                </Link>
                <StatusBadge status={attributionCampaign.status} />
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Touchpoints
                  <span className="ml-1 font-medium tabular-nums text-foreground">
                    {attributionTouchpointCount}
                  </span>
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Conversions
                  <span className="ml-1 font-medium tabular-nums text-foreground">
                    {wholeNumber.format(attributionConversionTotal)}
                  </span>
                </span>
              </div>

              <Tabs
                value={attributionModelKey}
                onValueChange={(v) =>
                  setAttributionModelKey(v as AttributionModelKey)
                }
              >
                <TabsList className="h-8">
                  {ATTRIBUTION_MODELS.map((model) => (
                    <TabsTrigger
                      key={model.key}
                      value={model.key}
                      className="text-xs"
                    >
                      {model.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={attributionBars}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) =>
                        attributionConversionTotal > 0
                          ? compactNumber.format(v)
                          : `${v.toFixed(0)}%`
                      }
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="channelName"
                      width={140}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number, _name, entry) => [
                        attributionConversionTotal > 0
                          ? `${compactNumber.format(value)} (${fmtPct(
                              (entry?.payload as { weight: number }).weight,
                            )})`
                          : fmtPct(
                              (entry?.payload as { weight: number }).weight,
                            ),
                        "Credit",
                      ]}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="credit"
                      fill={PRIMARY}
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    {ATTRIBUTION_MODELS.map((model) => (
                      <TableHead key={model.key} className="text-right">
                        {model.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attributionChannelIds.map((channelId) => (
                    <TableRow key={channelId}>
                      <TableCell className="text-sm">
                        {attributionChannelName(channelId)}
                      </TableCell>
                      {attributionByModel.map((result) => {
                        const allocation = result.allocations.find(
                          (a) => a.channelId === channelId,
                        );
                        return (
                          <TableCell
                            key={result.modelKey}
                            className={cn(
                              "text-right tabular-nums",
                              result.modelKey === attributionModelKey &&
                                "font-medium",
                            )}
                          >
                            {allocation ? fmtPct(allocation.weight) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="text-xs text-muted-foreground">
                Same touchpoints, different lenses — models are pluggable
                calculators over identical event data
              </p>

              {/* Model limitations — what each lens cannot see (FR-MA-03) */}
              <section className="rounded-lg border border-warning/20 bg-warning/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-warning" aria-hidden="true" />
                  Model limitations
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attribution assigns credit; it does not prove cause. Each model
                  below is a rule for splitting the same numbers, and each rule
                  is blind to something specific.
                </p>
                <dl className="mt-3 space-y-2">
                  {ATTRIBUTION_MODELS.map((model) => (
                    <div
                      key={model.key}
                      className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-3"
                    >
                      <dt
                        className={cn(
                          "text-xs font-medium",
                          model.key === attributionModelKey
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {model.label}
                        {model.key === attributionModelKey && (
                          <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                            (shown above)
                          </span>
                        )}
                      </dt>
                      <dd className="text-xs text-muted-foreground">
                        {MODEL_LIMITATIONS[model.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
                <h4 className="mt-4 text-xs font-medium">
                  True of every model here, because they are limits of the input
                  data
                </h4>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {SHARED_ATTRIBUTION_LIMITATIONS.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Playbook patterns — what worked, with the evidence attached (FR-MA-10) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Playbook patterns</CardTitle>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No playbook patterns recorded"
              hint="Patterns are written up from campaigns that beat their comparable baseline."
            />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                {patterns.map((pattern) => (
                  <article
                    key={pattern.id}
                    className="flex flex-col gap-3 rounded-lg border p-4"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium">{pattern.title}</h3>
                      <span className="inline-flex shrink-0 items-center rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-medium tabular-nums text-success">
                        +{pattern.liftPct}% lift
                      </span>
                    </header>

                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Situation
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {pattern.situation}
                      </p>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Actions
                      </div>
                      <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
                        {pattern.actions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Evidence
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {pattern.evidenceCampaignIds.map((campaignId) => {
                          const campaign = db.campaigns.find(
                            (c) => c.id === campaignId,
                          );
                          return (
                            <Link
                              key={campaignId}
                              to={`/campaigns/${campaignId}`}
                              className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs hover:underline"
                            >
                              {campaign?.name ?? campaignId}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Lift is the observed result against the comparable baseline at
                the time the pattern was written up, on the campaigns named under
                Evidence. It is a record of what happened once, not a forecast
                for the next campaign.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Learn loop — recommendations derived from this page's own numbers (FR-MA-08) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Learn loop</CardTitle>
        </CardHeader>
        <CardContent>
          {learnings.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Nothing separated far enough to learn from yet"
              hint="Recommendations appear once a persona, message, benchmark, or weekly series separates from its comparison in the current scope."
            />
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2">
                {learnings.map((learning) => (
                  <li key={learning.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <GraduationCap
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {learning.headline}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {learning.evidence}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {learning.links.map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              className="text-xs font-medium hover:underline"
                            >
                              {link.label} →
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Every line above is derived from the numbers on this page and
                states the comparison it came from. Adopting a learning is an
                approver decision — nothing here changes a persona, a campaign, or a
                brief on its own; the links open the place where that decision
                gets made and recorded.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
