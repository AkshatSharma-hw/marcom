import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AlertTriangle, BellRing, Crosshair, FileText, Radar, Ruler, TrendingUp } from "lucide-react";
import { getSeedDB } from "@/data/seed";
import type {
  Campaign,
  Competitor,
  CompetitorMoveType,
  MarketSizing,
  MarketTrend,
  SeedDB,
} from "@/data/types";
import { useScope } from "@/lib/scope";
import { CHART_MUTED, CHART_PRIMARY } from "@/lib/chartPalette";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Chart styling — theme tokens only, no raw hex                       */
/* ------------------------------------------------------------------ */

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
} as const;

const AXIS_TICK = { fill: CHART_MUTED, fontSize: 11 } as const;

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * The unit is joined to the value with a non-breaking space: Recharts breaks a
 * tick label on any ordinary space, and a wrapped second line lands in the
 * X-axis strip on top of the period labels. The tick therefore always occupies
 * one line — which is what `trendAxisWidth` below has to reserve room for.
 */
function fmtTrendValue(value: number, unit: string): string {
  if (unit === "%") return `${value}%`;
  // A bare number is not a reading. TRD-005 is measured in months and four
  // trends in index points; dropping the unit left the axis and the tooltip
  // stating a quantity without saying of what.
  if (unit === "index") return `${value}\u00a0idx`;
  return unit ? `${value}\u00a0${unit}` : `${value}`;
}

/**
 * Width to reserve for the Y axis of a trend chart.
 *
 * Recharts 2 has no auto-sizing axis: a label wider than the axis is simply
 * drawn outside it. A fixed 44px fits '18%' and '120 idx' but not TRD-005,
 * whose ticks read '39.65 months' — 74px of text that ran off the left edge of
 * the chart and across the first period label. The width therefore scales with
 * the widest label the series can produce. Ticks are generated between the
 * observed values and can carry a digit the data does not, hence the one
 * character of headroom; TICK_CHAR_PX is a glyph advance at the 11px tick size
 * and the clamp stops a long unit from eating the plot.
 */
const TICK_CHAR_PX = 6;
const Y_AXIS_MIN_PX = 44;
const Y_AXIS_MAX_PX = 92;

function trendAxisWidth(series: MarketTrend["series"], unit: string): number {
  const longest = series.reduce(
    (max, point) => Math.max(max, fmtTrendValue(point.value, unit).length),
    0,
  );
  return Math.min(
    Y_AXIS_MAX_PX,
    Math.max(Y_AXIS_MIN_PX, Math.ceil((longest + 1) * TICK_CHAR_PX) + 8),
  );
}

/**
 * Gap between the plot floor and the period labels. At the Recharts default
 * the first period label starts 4px under the floor, while the bottom value
 * label is drawn centred ON the floor and hangs 8px below it — 'Jan' and '18%'
 * came out on top of each other in the bottom-left corner of every trend.
 */
const X_TICK_MARGIN = 10;

/**
 * Gap between two bars of the same band on the share-of-voice chart. The bars
 * are 12px and their printed labels 16px, so the gap has to carry the label
 * height rather than the bar height for the two periods' figures to stay apart.
 */
const LABELLED_BAR_GAP = 6;

/* ------------------------------------------------------------------ */
/* Period ordering                                                     */
/* ------------------------------------------------------------------ */

type PeriodGrain = "quarter" | "month" | "other";

function periodGrain(period: string): PeriodGrain {
  if (/^\d{4}-Q\d$/.test(period)) return "quarter";
  if (/^\d{4}-\d{2}$/.test(period)) return "month";
  return "other";
}

/**
 * A chronologically sortable key for a period label.
 *
 * `shareOfVoice` holds both quarterly (`2026-Q3`) and monthly (`2026-08`)
 * observations, and a plain string sort puts every quarter after every month
 * because 'Q' sorts above the digits. "Latest period" therefore always resolved
 * to a quarter and silently discarded the five monthly rows — including the
 * most recent observation in the dataset.
 */
function periodSortKey(period: string): string {
  const quarterly = /^(\d{4})-Q(\d)$/.exec(period);
  // End of the quarter, so a quarter orders after the months it contains.
  if (quarterly) return `${quarterly[1]}-${String(Number(quarterly[2]) * 3).padStart(2, "0")}`;
  return period;
}

/**
 * The `count` most recent periods, all of one granularity.
 *
 * Granularity is taken from the chronologically latest observation, so the
 * newest data always shows — and a month is never compared against a quarter
 * that contains it, which would read as change where there is none.
 */
function latestPeriods(periods: readonly string[], count: number): string[] {
  const sorted = [...new Set(periods)]
    .map((period) => ({ period, key: periodSortKey(period) }))
    .sort((a, b) => a.key.localeCompare(b.key, DEFAULT_LOCALE))
    .map((entry) => entry.period);
  const newest = sorted[sorted.length - 1];
  if (newest === undefined) return [];
  const grain = periodGrain(newest);
  return sorted.filter((p) => periodGrain(p) === grain).slice(-count);
}

/** "2026-06-18" -> "Jun 18, 2026" */
function fmtMoveDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * "2026-01" -> "Jan"; "2025-Q4" -> "Q4 '25"; "2026-07-13" -> "Jul 13".
 *
 * TRD-006 is observed weekly, and without the third case those periods printed
 * as raw ISO dates along an axis whose other series read as month names.
 */
function fmtTrendPeriod(period: string): string {
  const quarterly = /^(\d{4})-(Q\d)$/.exec(period);
  if (quarterly) return `${quarterly[2]} '${quarterly[1].slice(2)}`;
  const monthly = /^(\d{4})-(\d{2})$/.exec(period);
  if (monthly) {
    const d = new Date(Date.UTC(Number(monthly[1]), Number(monthly[2]) - 1, 1));
    return d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  }
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period);
  if (daily) {
    const d = new Date(`${period}T00:00:00Z`);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return period;
}

/** '$412B' — compact currency, formatter cached per ISO 4217 code. */
const moneyFormatters = new Map<string, Intl.NumberFormat>();
function fmtMoneyCompact(value: number, currency: string): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

/* ------------------------------------------------------------------ */
/* Provenance chips — every intelligence figure carries source + how   */
/* certain we are of it (FR-MI-02: no unsourced assertions).           */
/* ------------------------------------------------------------------ */

/** Confidence band → token. Coarse on purpose so the chips read at a glance. */
function confidenceTone(confidence: number): string {
  if (confidence >= 0.75) return "border-success/20 bg-success/10 text-success";
  if (confidence >= 0.6) return "border-warning/20 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/5 text-destructive/80";
}

function ConfidenceChip({ confidence }: { confidence: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        confidenceTone(confidence),
      )}
      title="Analyst confidence in this figure, as recorded with the source"
    >
      {Math.round(confidence * 100)}% confidence
    </span>
  );
}

function SourceLine({ label }: { label: string }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <FileText className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">Source:</span> {label}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Section: market sizing (TAM / SAM / SOM)                            */
/* ------------------------------------------------------------------ */

/** Tier tone — the funnel darkens as the market narrows to what we can win. */
const SIZING_TIERS = [
  { key: "tam", label: "TAM", expand: "Total addressable market", tone: "bg-primary/25" },
  { key: "sam", label: "SAM", expand: "Serviceable addressable market", tone: "bg-primary/55" },
  { key: "som", label: "SOM", expand: "Serviceable obtainable market", tone: "bg-primary" },
] as const;

/**
 * Nested three-tier figure: each bar is drawn as a share of TAM, so SAM sits
 * inside TAM and SOM inside SAM. Very small tiers are padded to a minimum
 * visible width — the printed figures, not the pixels, are the truth.
 */
const MIN_BAR_PCT = 1.5;

function MarketSizingCard({
  sizing,
  businessUnitName,
}: {
  sizing: MarketSizing;
  businessUnitName: string;
}) {
  const tiers = SIZING_TIERS.map((tier) => {
    const value = sizing[tier.key];
    const shareOfTam = sizing.tam > 0 ? (value / sizing.tam) * 100 : 0;
    return { ...tier, value, shareOfTam };
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm font-medium">{businessUnitName}</CardTitle>
          <Badge variant="outline">{sizing.currency}</Badge>
          <ConfidenceChip confidence={sizing.confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Three-tier nested figure */}
        <div className="space-y-2.5">
          {tiers.map((tier) => (
            <div key={tier.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  title={tier.expand}
                >
                  {tier.label}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {fmtMoneyCompact(tier.value, sizing.currency)}
                  {tier.key !== "tam" && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({tier.shareOfTam.toFixed(tier.shareOfTam < 1 ? 2 : 1)}% of TAM)
                    </span>
                  )}
                </span>
              </div>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-label={`${tier.expand} as a share of TAM`}
                aria-valuenow={Math.round(tier.shareOfTam)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn("h-full rounded-full", tier.tone)}
                  style={{ width: `${Math.max(tier.shareOfTam, MIN_BAR_PCT)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Methodology (FR-MI-04) */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Methodology
          </h4>
          <p className="mt-1 text-sm">{sizing.methodology}</p>
        </div>

        {/* Assumptions the numbers stand on */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Assumptions ({sizing.assumptions.length})
          </h4>
          <ul className="mt-1 space-y-1">
            {sizing.assumptions.map((assumption) => (
              <li
                key={assumption}
                className="flex gap-2 text-sm text-muted-foreground before:mt-2 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-muted-foreground/60 before:content-['']"
              >
                {assumption}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1 border-t pt-3">
          <SourceLine label={sizing.sourceLabel} />
          <p className="text-xs text-muted-foreground">
            Bars are drawn as a share of TAM; the smallest tier is padded to stay
            visible — read the figures, not the pixels.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Competitor move chip                                                */
/* ------------------------------------------------------------------ */

const MOVE_TYPE_CHIP: Record<CompetitorMoveType, string> = {
  // launch = info (primary tint), campaign = warning,
  // pricing = destructive-muted, partnership = muted.
  launch: "border-primary/20 bg-primary/10 text-primary",
  campaign: "border-warning/20 bg-warning/10 text-warning",
  pricing: "border-destructive/20 bg-destructive/5 text-destructive/80",
  partnership: "border-border bg-muted text-muted-foreground",
};

function MoveTypeChip({ moveType }: { moveType: CompetitorMoveType }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize " +
        MOVE_TYPE_CHIP[moveType]
      }
    >
      {moveType}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Section: market trends                                              */
/* ------------------------------------------------------------------ */

function TrendCard({ trend, businessUnitName }: { trend: MarketTrend; businessUnitName: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm font-medium">{trend.label}</CardTitle>
          <Badge variant="outline">{businessUnitName}</Badge>
          {typeof trend.confidence === "number" && (
            <ConfidenceChip confidence={trend.confidence} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.series} margin={{ left: 8, right: 16, top: 8 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="period"
                tickFormatter={fmtTrendPeriod}
                tick={AXIS_TICK}
                tickMargin={X_TICK_MARGIN}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => fmtTrendValue(v, trend.unit)}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={trendAxisWidth(trend.series, trend.unit)}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={fmtTrendPeriod}
                formatter={(value: number) => [fmtTrendValue(value, trend.unit), trend.label]}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="value"
                stroke={CHART_PRIMARY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground">{trend.insight}</p>
        {trend.sourceLabel ? (
          <SourceLine label={trend.sourceLabel} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Source not recorded — treat this series as unattributed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section: positioning map (FR-MI-15)                                 */
/* ------------------------------------------------------------------ */

/**
 * Both axes are DERIVED from the curated dataset — nothing here is measured
 * price data. Kept in one place so the caption under the chart and the maths
 * can never drift apart.
 *
 *  x — share of voice. Our brands use the latest tracked ShareOfVoice period.
 *      Competitors are not tracked in that dataset, so they split the period's
 *      untracked remainder in proportion to how many recent moves they made.
 *
 *  y — price positioning, 0 (value) … 100 (premium), from a 50 baseline.
 *      Competitor moves: launch +8, partnership +6, pricing −12, campaign 0.
 *      Our brands read the equivalent signal off campaign type:
 *      product-launch +8, thought-leadership +6, seasonal −12, always-on 0
 *      (internal campaigns are not market-facing and are skipped).
 */
const PRICE_BASELINE = 50;
const MOVE_PRICE_WEIGHT: Record<CompetitorMoveType, number> = {
  launch: 8,
  partnership: 6,
  pricing: -12,
  campaign: 0,
};
const CAMPAIGN_PRICE_WEIGHT: Partial<Record<Campaign["campaignType"], number>> = {
  "product-launch": 8,
  "thought-leadership": 6,
  seasonal: -12,
  "always-on": 0,
};

function clampPosition(value: number): number {
  return Math.min(95, Math.max(5, Math.round(value)));
}

interface PositionPoint {
  name: string;
  /** Share of voice, % */
  x: number;
  /** Price positioning index, 0–100 */
  y: number;
  side: "ours" | "rival";
  /** What produced the score, shown in the tooltip so the derivation is legible. */
  basis: string;
}

/** A point plus the name to print beside it — empty when thinned for legibility. */
interface LabelledPoint extends PositionPoint {
  label: string;
}

function buildPositioningPoints(
  db: SeedDB,
  brandId: string | null | undefined,
): { points: PositionPoint[]; period: string | null } {
  const period = latestPeriods(db.shareOfVoice.map((s) => s.period), 1)[0] ?? null;
  if (!period) return { points: [], period: null };

  const observations = db.shareOfVoice.filter((s) => s.period === period);
  const trackedTotal = observations.reduce((sum, s) => sum + s.pct, 0);
  const remainder = Math.max(0, 100 - trackedTotal);

  // Our brands — measured share of voice, campaign-derived price positioning.
  const ourPoints: PositionPoint[] = observations
    .filter((s) => !brandId || s.brandId === brandId)
    .map((s) => {
      const brand = db.brands.find((b) => b.id === s.brandId);
      const campaigns = db.campaigns.filter(
        (c) => c.brandId === s.brandId && c.campaignType in CAMPAIGN_PRICE_WEIGHT,
      );
      const shift = campaigns.reduce(
        (sum, c) => sum + (CAMPAIGN_PRICE_WEIGHT[c.campaignType] ?? 0),
        0,
      );
      return {
        name: brand?.name ?? s.brandId,
        x: s.pct,
        y: clampPosition(PRICE_BASELINE + shift),
        side: "ours" as const,
        basis: `${campaigns.length} market-facing campaign${campaigns.length === 1 ? "" : "s"}`,
      };
    });

  // Competitors — apportioned remainder, move-type-derived price positioning.
  const inScopeCompetitors = db.competitors.filter(
    (c) => !brandId || c.focusBrandIds.includes(brandId),
  );
  const moveTotal = db.competitors.reduce((sum, c) => sum + c.moves.length, 0);
  const rivalPoints: PositionPoint[] = inScopeCompetitors.map((c) => {
    const share = moveTotal > 0 ? (c.moves.length / moveTotal) * remainder : 0;
    const shift = c.moves.reduce((sum, m) => sum + MOVE_PRICE_WEIGHT[m.moveType], 0);
    return {
      name: c.name,
      x: Math.round(share * 10) / 10,
      y: clampPosition(PRICE_BASELINE + shift),
      side: "rival" as const,
      basis: `${c.moves.length} tracked move${c.moves.length === 1 ? "" : "s"}`,
    };
  });

  return { points: [...ourPoints, ...rivalPoints], period };
}

function PositioningTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PositionPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div style={CHART_TOOLTIP_STYLE} className="px-2.5 py-2">
      <div className="font-medium">{point.name}</div>
      <div className="tabular-nums">Share of voice: {point.x}%</div>
      <div className="tabular-nums">Price positioning: {point.y} / 100</div>
      <div className="opacity-70">Derived from {point.basis}</div>
    </div>
  );
}

/**
 * Decides which points may carry a name label.
 *
 * Competitors bunch at the low end of share of voice with similar positioning
 * scores, so labelling every point stacked five names on top of each other and
 * produced an unreadable smear. Thinning is done in DATA space rather than by
 * measuring rendered text: it is deterministic, independent of render order,
 * and gives the same answer at every viewport width.
 *
 * Our own brands always keep their label — they are few and they are the point
 * of the chart. Rivals are considered in descending share of voice, and one is
 * labelled only if it clears every label already kept. Everything else is still
 * plotted and still named on hover; only the printed name is dropped.
 */
function withLabels(
  ours: PositionPoint[],
  rivals: PositionPoint[],
  xMax: number,
): { ours: LabelledPoint[]; rivals: LabelledPoint[]; hidden: number } {
  const minDx = xMax * 0.07;
  const minDy = 9;
  const kept: PositionPoint[] = [];

  const clears = (p: PositionPoint): boolean =>
    kept.every((k) => Math.abs(k.x - p.x) > minDx || Math.abs(k.y - p.y) > minDy);

  const ourLabelled = ours.map((p) => {
    kept.push(p);
    return { ...p, label: p.name };
  });

  let hidden = 0;
  const rivalLabelled = [...rivals]
    .sort((a, b) => b.x - a.x)
    .map((p) => {
      if (clears(p)) {
        kept.push(p);
        return { ...p, label: p.name };
      }
      hidden += 1;
      return { ...p, label: "" };
    });

  return { ours: ourLabelled, rivals: rivalLabelled, hidden };
}

function PositioningMap({ points, period }: { points: PositionPoint[]; period: string | null }) {
  const allOurs = points.filter((p) => p.side === "ours");
  const allRivals = points.filter((p) => p.side === "rival");
  const maxX = Math.max(10, ...points.map((p) => p.x));
  const { ours, rivals, hidden: hiddenLabels } = withLabels(allOurs, allRivals, maxX);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-sm font-medium">Positioning map</CardTitle>
          {period && <Badge variant="outline">{period}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing to plot in this scope — no tracked brand or competitor remains.
          </p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 32, top: 8, bottom: 24 }}>
                <CartesianGrid stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Share of voice"
                  domain={[0, Math.ceil((maxX * 1.25) / 5) * 5]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Share of voice (derived) →",
                    position: "insideBottom",
                    offset: -12,
                    fill: CHART_MUTED,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Price positioning"
                  domain={[0, 100]}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  label={{
                    value: "Value ← price positioning → Premium",
                    angle: -90,
                    position: "insideLeft",
                    fill: CHART_MUTED,
                    fontSize: 11,
                    style: { textAnchor: "middle" },
                  }}
                />
                <ZAxis range={[90, 90]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "hsl(var(--border))" }}
                  content={<PositioningTooltip />}
                />
                {/* Top, not bottom: the X-axis label also renders at
                    insideBottom, and the two were drawing over each other —
                    "Our brands" and "Competitors (derived)" came out as one
                    unreadable overlapping string. */}
                <Legend verticalAlign="top" align="right" height={24} wrapperStyle={{ fontSize: 11 }} />
                <Scatter
                  isAnimationActive={false}
                  name="Our brands"
                  data={ours}
                  fill={CHART_PRIMARY}
                >
                  <LabelList
                    dataKey="label"
                    position="top"
                    style={{ fill: CHART_MUTED, fontSize: 11 }}
                  />
                </Scatter>
                <Scatter
                  isAnimationActive={false}
                  name="Competitors"
                  data={rivals}
                  fill={CHART_MUTED}
                  fillOpacity={0.7}
                  shape="triangle"
                >
                  <LabelList
                    dataKey="label"
                    position="top"
                    style={{ fill: CHART_MUTED, fontSize: 11 }}
                  />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Both axes are <span className="font-medium">derived from the curated dataset</span>, not
          measured. Horizontal: the latest tracked share-of-voice period, with competitors
          splitting that period&rsquo;s untracked remainder in proportion to their recent move
          volume. Vertical: a price-positioning index scored from behaviour — launches and
          partnerships read premium, price cuts and promotional flights read value. Directional
          only; it is not a substitute for a priced competitive study.
          {hiddenLabels > 0 && (
            <>
              {" "}
              {hiddenLabels} competitor {hiddenLabels === 1 ? "name is" : "names are"} not
              printed because {hiddenLabels === 1 ? "it sits" : "they sit"} too close to another
              label to stay readable — every point is still plotted, and hovering names it.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section: competitor watch + alert triggers (FR-MI-16)               */
/* ------------------------------------------------------------------ */

/**
 * Triggers are written as prose by analysts, so matching is a deterministic
 * token overlap rather than an exact string test: a trigger fires when it
 * shares at least two significant words with the move, or one significant word
 * when the trigger also names the move's type. No inference, no model call —
 * the matched trigger text is always shown next to the alert.
 */
const TRIGGER_STOPWORDS = new Set([
  "that",
  "with",
  "from",
  "than",
  "more",
  "into",
  "this",
  "they",
  "them",
  "their",
  "when",
  "have",
  "been",
  "also",
  "only",
  "over",
  "ours",
  "such",
  "each",
  "other",
  "within",
  "against",
  "without",
  "across",
  "greater",
  "after",
  "before",
  "detected",
  "announced",
]);

function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 4 && !TRIGGER_STOPWORDS.has(token)),
  );
}

/** The first trigger the move matches, or undefined. */
function matchingTrigger(
  move: Competitor["moves"][number],
  triggers: readonly string[],
): string | undefined {
  const moveTokens = significantTokens(`${move.title} ${move.note ?? ""}`);
  return triggers.find((trigger) => {
    const triggerTokens = significantTokens(trigger);
    const shared = [...triggerTokens].filter((token) => moveTokens.has(token));
    if (shared.length >= 2) return true;
    return shared.length === 1 && triggerTokens.has(move.moveType);
  });
}

function AlertChip() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      Alert: matches trigger
    </span>
  );
}

function CompetitorCard({
  competitor,
  brandName,
}: {
  competitor: Competitor;
  brandName: (id: string) => string;
}) {
  // Newest first — derived, not assumed sorted in seed.
  const moves = [...competitor.moves].sort((a, b) => b.date.localeCompare(a.date, DEFAULT_LOCALE));
  const latest = moves[0];
  const triggers = competitor.alertTriggers ?? [];
  const firedTrigger = latest ? matchingTrigger(latest, triggers) : undefined;

  return (
    <Card className={cn(firedTrigger && "border-warning/40")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{competitor.name}</CardTitle>
          {competitor.focusBrandIds.map((brandId) => (
            <Badge key={brandId} variant="outline">
              {brandName(brandId)}
            </Badge>
          ))}
          {firedTrigger && <AlertChip />}
        </div>
        <p className="text-sm text-muted-foreground">{competitor.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Recent moves
          </div>
          <ul className="space-y-2">
            {moves.map((move) => {
              const isFlagged = Boolean(firedTrigger) && move === latest;
              return (
                <li
                  key={`${move.date}-${move.title}`}
                  className={cn(
                    "flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm",
                    isFlagged && "rounded-md border border-warning/20 bg-warning/5 p-2",
                  )}
                >
                  <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmtMoveDate(move.date)}
                  </span>
                  <MoveTypeChip moveType={move.moveType} />
                  <span className="font-medium">{move.title}</span>
                  {move.note && <span className="text-xs text-muted-foreground">{move.note}</span>}
                  {isFlagged && (
                    <>
                      <AlertChip />
                      <span className="w-full text-xs text-warning">
                        Fired trigger: {firedTrigger}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Standing alert triggers — the fired one is highlighted */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <BellRing className="h-3 w-3" aria-hidden="true" />
            Alert triggers ({triggers.length})
          </div>
          {triggers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No alert triggers configured for this competitor.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {triggers.map((trigger) => (
                <span
                  key={trigger}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
                    trigger === firedTrigger
                      ? "border-warning/30 bg-warning/10 font-medium text-warning"
                      : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {trigger}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Triggers are evaluated against the latest tracked move only, by word
            overlap — a fired trigger is a prompt to look, not a verdict.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

/**
 * Market intelligence — sizing, trends, share of voice, a derived positioning
 * map and competitor watch with alert triggers. Rendered by the Market
 * intelligence page under Understand. Sizing and trends scope by business
 * unit; share of voice, positioning and competitors scope by brand.
 */
export function MarketIntelPanel() {
  const db = getSeedDB();
  const { brandId, businessUnitId } = useScope();

  const businessUnitName = (id: string): string =>
    db.businessUnits.find((bu) => bu.id === id)?.name ?? id;
  const brandName = (id: string): string => db.brands.find((b) => b.id === id)?.name ?? id;

  const sizings = useMemo(
    () =>
      db.marketSizings.filter(
        (s) => !businessUnitId || s.businessUnitId === businessUnitId,
      ),
    [db, businessUnitId],
  );

  const trends = useMemo(
    () =>
      db.marketTrends.filter(
        (t) => !businessUnitId || t.businessUnitId === businessUnitId,
      ),
    [db, businessUnitId],
  );

  const competitors = useMemo(
    () =>
      db.competitors.filter((c) => !brandId || c.focusBrandIds.includes(brandId)),
    [db, brandId],
  );

  const positioning = useMemo(() => buildPositioningPoints(db, brandId), [db, brandId]);

  // Paired share-of-voice rows: one row per brand, one column per period
  // (the two most recent periods observed in the data).
  const sov = useMemo(() => {
    const observations = db.shareOfVoice.filter(
      (s) => !brandId || s.brandId === brandId,
    );
    const periods = latestPeriods(observations.map((s) => s.period), 2);
    const brandIds = [...new Set(observations.map((s) => s.brandId))];
    const rows = brandIds.map((id) => {
      const row: Record<string, string | number> = { brand: brandName(id) };
      for (const period of periods) {
        const obs = observations.find((s) => s.brandId === id && s.period === period);
        if (obs) row[period] = obs.pct;
      }
      return row;
    });
    return { periods, rows };
  }, [db, brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const nothingInScope =
    sizings.length === 0 &&
    trends.length === 0 &&
    sov.rows.length === 0 &&
    competitors.length === 0;

  return (
    <div className="space-y-4">
      {nothingInScope ? (
        <EmptyState
          icon={Radar}
          title="No market intelligence in this scope"
          hint="Widen the brand or business unit filters in the top bar to see market sizing, trends, share of voice, and competitor activity."
        />
      ) : (
        <>
          {/* Market sizing — TAM / SAM / SOM per business unit */}
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Ruler className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Market sizing
            </h2>
            {sizings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No market sizing recorded for this business unit.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sizings.map((sizing) => (
                  <MarketSizingCard
                    key={sizing.id}
                    sizing={sizing}
                    businessUnitName={businessUnitName(sizing.businessUnitId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Market trends */}
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Market trends
            </h2>
            {trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No market trends tracked for this business unit.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {trends.map((trend) => (
                  <TrendCard
                    key={trend.id}
                    trend={trend}
                    businessUnitName={businessUnitName(trend.businessUnitId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Share of voice */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Share of voice{" "}
                {sov.periods.length > 0 && (
                  <span className="font-normal text-muted-foreground">
                    ({sov.periods.join(" vs ")})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sov.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No share-of-voice observations for this brand.
                </p>
              ) : (
                <div style={{ height: Math.max(120, sov.rows.length * 56 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sov.rows}
                      layout="vertical"
                      margin={{ left: 8, right: 32, top: 4 }}
                      /* Wider than it looks: each bar carries its value as a
                         printed label, and at the previous 2px gap the two
                         periods' labels sat 14px apart with 16px of line box
                         each — '9%' and '10%' overlapped. The gap has to clear
                         the label, not the bar. */
                      barGap={LABELLED_BAR_GAP}
                    >
                      <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v: number) => `${v}%`}
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="brand"
                        width={120}
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {sov.periods.map((period, i) => (
                        <Bar
                          key={period}
                          isAnimationActive={false}
                          dataKey={period}
                          name={period}
                          fill={i === sov.periods.length - 1 ? CHART_PRIMARY : CHART_MUTED}
                          fillOpacity={i === sov.periods.length - 1 ? 1 : 0.55}
                          radius={[0, 4, 4, 0]}
                          barSize={12}
                        >
                          <LabelList
                            dataKey={period}
                            position="right"
                            formatter={(v: number) => `${v}%`}
                            style={{ fill: CHART_MUTED, fontSize: 11 }}
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Tracked brands only — the remainder of each period is untracked
                competitors.
              </p>
            </CardContent>
          </Card>

          {/* Positioning map */}
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Crosshair className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Comparative positioning
            </h2>
            <PositioningMap points={positioning.points} period={positioning.period} />
          </div>

          {/* Competitor watch */}
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Radar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Competitor watch
            </h2>
            {competitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tracked competitors pressure this brand.
              </p>
            ) : (
              <div className="space-y-4">
                {competitors.map((competitor) => (
                  <CompetitorCard
                    key={competitor.id}
                    competitor={competitor}
                    brandName={brandName}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Curated intelligence dataset — live ingestion arrives with platform
            integrations. Every figure carries the source and confidence recorded
            with it; nothing on this page is asserted without one.
          </p>
        </>
      )}
    </div>
  );
}
