/**
 * Budget — per-BU budget vs committed spend (blueprint Part 5, module 17).
 * Planned money comes from Budget rows; committed spend always derives from
 * campaignSpend (activity spendAllocated) so the KPI strip, BU cards, and
 * allocation-table totals reconcile by construction. Scope-aware via useScope.
 *
 * Live money: budgets register with the DataStore under the "budgets"
 * collection id and are layered onto the SeedDB via useLiveDBWith, so a
 * Reforecast (CMO/Platform Admin) flows into every derived utilization,
 * variance, and KPI figure. Open Budget approvals (e.g. APR-015 on BUD-001)
 * surface as a "Pending approval" chip derived from the shared "approvals"
 * collection — deciding the approval in the inbox clears the chip.
 *
 * Planning depth:
 *  - FR-PP-08 — scenario comparison: conservative / base / aggressive cases
 *    per measured campaign, every off-plan figure expressed as a delta from
 *    the base case, plus a marginal-cost sensitivity read.
 *  - FR-PP-10 — spend thresholds: allocations above CMO_APPROVAL_THRESHOLD_USD
 *    route to CMO approval; the threshold is stated in the approval copy.
 *  - FR-PP-12 — plan vs actual: planned allocation, committed spend and
 *    attributed value per campaign, with deviations beyond
 *    MATERIAL_VARIANCE_THRESHOLD flagged as a material variance.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronDown,
  Hourglass,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Target,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { PageSkeleton } from "@/components/marcomm/PageSkeleton";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";

import { useLiveDBWith } from "@/data/useLiveDB";
import { getSeedDB } from "@/data/seed";
import {
  applyScope,
  campaignRoi,
  campaignSpend,
  campaignsInScope,
  roiSummary,
  type RoiSummary,
  type Scope,
} from "@/data/selectors";
import type {
  Approval,
  Budget,
  BudgetScenario,
  BudgetScenarioKind,
  BusinessUnit,
  Campaign,
  SeedDB,
} from "@/data/types";
import { CHART_MUTED, CHART_PRIMARY } from "@/lib/chartPalette";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { useRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { useCollection } from "@/store/DataStore";

/* ------------------------------------------------------------------ */
/* Formatting & chart styling — theme tokens only, no raw hex          */
/* ------------------------------------------------------------------ */

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

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

/* ------------------------------------------------------------------ */
/* Pure derivations over the SeedDB (page-local, no literals)          */
/* ------------------------------------------------------------------ */

interface AllocationRow {
  campaign: Campaign;
  /** Budget.allocations amount for the campaign, or null when unallocated. */
  allocation: number | null;
  /** campaignSpend — the campaign's committed activity spend. */
  committed: number;
  /** committed / allocation as a 0–1 fraction, or null without an allocation. */
  utilization: number | null;
}

interface BuRollup {
  bu: BusinessUnit;
  budget: Budget | null;
  /** Budget.amountPlanned (0 when the BU has no budget row). */
  planned: number;
  /** Sum of allocation amounts across the rows below. */
  allocated: number;
  /** Sum of row committed spends — the one committed number for the BU. */
  committed: number;
  /** committed / planned as a 0–1 fraction (0 when unplanned). */
  utilization: number;
  /** planned − committed; negative means over budget. */
  variance: number;
  /** Estimated ROI over the BU's measured campaigns — shared roiSummary selector. */
  roi: RoiSummary;
  rows: AllocationRow[];
}

/** One reconciling rollup per BU: card, table rows, and totals share these sums. */
function buRollups(db: SeedDB, scope: Scope): BuRollup[] {
  const units = db.businessUnits.filter(
    (bu) => !scope.businessUnitId || bu.id === scope.businessUnitId,
  );
  return units
    .map((bu) => {
      const budget = db.budgets.find((b) => b.businessUnitId === bu.id) ?? null;
      const campaigns = applyScope(db.campaigns, { ...scope, businessUnitId: bu.id });
      const rows: AllocationRow[] = campaigns.map((campaign) => {
        const allocation =
          budget?.allocations.find((a) => a.campaignId === campaign.id)?.amount ?? null;
        const committed = campaignSpend(db, campaign.id);
        return {
          campaign,
          allocation,
          committed,
          utilization: allocation && allocation > 0 ? committed / allocation : null,
        };
      });
      const planned = budget?.amountPlanned ?? 0;
      const allocated = rows.reduce((sum, r) => sum + (r.allocation ?? 0), 0);
      const committed = rows.reduce((sum, r) => sum + r.committed, 0);
      return {
        bu,
        budget,
        planned,
        allocated,
        committed,
        utilization: planned > 0 ? committed / planned : 0,
        variance: planned - committed,
        // Same selector as the Performance page, scoped to this BU, so the
        // two surfaces reconcile by construction.
        roi: roiSummary(db, { ...scope, businessUnitId: bu.id }),
        rows,
      };
    })
    .filter((r) => r.budget !== null || r.rows.length > 0);
}

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

/* ------------------------------------------------------------------ */
/* FR-PP-08 — scenario comparison (conservative / base / aggressive)   */
/* ------------------------------------------------------------------ */

/** Left-to-right column order; the base case sits in the middle as the plan of record. */
const SCENARIO_ORDER: readonly BudgetScenarioKind[] = [
  "conservative",
  "base",
  "aggressive",
] as const;

const SCENARIO_LABEL: Record<BudgetScenarioKind, string> = {
  conservative: "Conservative",
  base: "Base (plan of record)",
  aggressive: "Aggressive",
};

interface ScenarioColumn {
  scenario: BudgetScenario;
  isBase: boolean;
  /** Signed difference from the base case. */
  spendDelta: number;
  spendDeltaFraction: number;
  conversionsDelta: number;
  conversionsDeltaFraction: number;
  /** Expected-ROI difference from base, in multiples (e.g. −0.8x). */
  roiDelta: number;
  /**
   * Incremental spend per incremental conversion against base — the marginal
   * rate, not the average. Null when the two cases expect equal conversions.
   */
  marginalCostPerConversion: number | null;
}

interface ScenarioComparison {
  campaign: Campaign;
  base: BudgetScenario;
  /** Base-case spend per expected conversion — the yardstick for the margin. */
  baseCostPerConversion: number | null;
  columns: ScenarioColumn[];
  /** One sensitivity line per off-plan case, read against the base column. */
  sensitivity: string[];
}

/** '3.6x' — expected ROI is a multiple, unlike the signed realised ROI above. */
function fmtMultiple(value: number): string {
  return `${value.toFixed(1)}x`;
}

/** '+42%' / '−27%' from a fraction, using a true minus sign. */
function fmtDeltaPct(fraction: number): string {
  const pct = Math.round(fraction * 100);
  return pct >= 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

function fmtDeltaCurrency(value: number): string {
  return value >= 0 ? `+${fmtCurrency(value)}` : `−${fmtCurrency(-value)}`;
}

function fmtDeltaCount(value: number): string {
  const abs = Math.abs(value).toLocaleString("en-US");
  return value >= 0 ? `+${abs}` : `−${abs}`;
}

/** One sentence per off-plan case: what the money buys or releases at the margin. */
function sensitivityLine(column: ScenarioColumn, baseCostPerConversion: number | null): string {
  const { scenario, spendDelta, spendDeltaFraction, conversionsDelta } = column;
  const label = scenario.kind === "aggressive" ? "Aggressive" : "Conservative";
  const marginal = column.marginalCostPerConversion;
  const direction =
    spendDelta >= 0
      ? `adds ${fmtCurrency(spendDelta)} (${fmtDeltaPct(spendDeltaFraction)}) for ${fmtDeltaCount(conversionsDelta)} expected conversions`
      : `releases ${fmtCurrency(-spendDelta)} (${fmtDeltaPct(spendDeltaFraction)}) and gives up ${Math.abs(conversionsDelta).toLocaleString("en-US")} expected conversions`;
  const margin =
    marginal === null || baseCostPerConversion === null
      ? ""
      : ` — ${fmtCurrency(marginal)} per conversion at the margin against ${fmtCurrency(baseCostPerConversion)} on the base plan (${fmtDeltaPct(marginal / baseCostPerConversion - 1)})`;
  return `${label} ${direction}${margin}. Expected ROI ${fmtMultiple(scenario.expectedRoi)} (${column.roiDelta >= 0 ? "+" : "−"}${Math.abs(column.roiDelta).toFixed(1)}x vs base).`;
}

/**
 * One comparison per in-scope campaign that has been scenario-modelled. Every
 * off-plan figure is expressed against the campaign's own base case, so the
 * three columns are read as a spread rather than three unrelated plans.
 */
function scenarioComparisons(db: SeedDB, scope: Scope): ScenarioComparison[] {
  return campaignsInScope(db, scope)
    .map((campaign) => {
      const scenarios = db.budgetScenarios.filter((s) => s.campaignId === campaign.id);
      const base = scenarios.find((s) => s.kind === "base");
      if (!base) return null;

      const baseCostPerConversion =
        base.expectedConversions > 0 ? base.spend / base.expectedConversions : null;

      const columns: ScenarioColumn[] = SCENARIO_ORDER.flatMap((kind) => {
        const scenario = scenarios.find((s) => s.kind === kind);
        if (!scenario) return [];
        const spendDelta = scenario.spend - base.spend;
        const conversionsDelta = scenario.expectedConversions - base.expectedConversions;
        return [
          {
            scenario,
            isBase: kind === "base",
            spendDelta,
            spendDeltaFraction: base.spend > 0 ? spendDelta / base.spend : 0,
            conversionsDelta,
            conversionsDeltaFraction:
              base.expectedConversions > 0
                ? conversionsDelta / base.expectedConversions
                : 0,
            roiDelta: scenario.expectedRoi - base.expectedRoi,
            marginalCostPerConversion:
              conversionsDelta !== 0 ? spendDelta / conversionsDelta : null,
          },
        ];
      });

      return {
        campaign,
        base,
        baseCostPerConversion,
        columns,
        sensitivity: columns
          .filter((c) => !c.isBase)
          .map((c) => sensitivityLine(c, baseCostPerConversion)),
      };
    })
    .filter((c): c is ScenarioComparison => c !== null);
}

/* ------------------------------------------------------------------ */
/* FR-PP-12 — plan vs actual with material-variance flagging           */
/* ------------------------------------------------------------------ */

/**
 * Committed spend may deviate from the planned allocation by this fraction
 * before the row is called out. Beyond it, the variance is material and the
 * owner is expected to explain or reforecast rather than absorb it.
 */
const MATERIAL_VARIANCE_THRESHOLD = 0.15;

interface PlanVsActualRow {
  campaign: Campaign;
  /** Budget.allocations amount, or null when the campaign is unallocated. */
  planned: number | null;
  /** campaignSpend — committed activity spend. */
  committed: number;
  /** Σ business-tier attributed value (campaignRoi), or null when unmeasured. */
  attributedValue: number | null;
  /** committed − planned; negative means underspend against plan. */
  variance: number | null;
  /** variance / planned as a signed fraction. */
  varianceFraction: number | null;
  /** |varianceFraction| > MATERIAL_VARIANCE_THRESHOLD. */
  material: boolean;
}

/** Plan vs actual across the scope — one row per campaign carrying money. */
function planVsActualRows(db: SeedDB, scope: Scope): PlanVsActualRow[] {
  return campaignsInScope(db, scope)
    .map((campaign) => {
      const planned =
        db.budgets
          .flatMap((b) => b.allocations)
          .find((a) => a.campaignId === campaign.id)?.amount ?? null;
      const committed = campaignSpend(db, campaign.id);
      const roi = campaignRoi(db, campaign.id);
      const variance = planned !== null ? committed - planned : null;
      const varianceFraction =
        planned !== null && planned > 0 ? (committed - planned) / planned : null;
      return {
        campaign,
        planned,
        committed,
        attributedValue: roi.roi !== null ? roi.attributedValue : null,
        variance,
        varianceFraction,
        material:
          varianceFraction !== null &&
          Math.abs(varianceFraction) > MATERIAL_VARIANCE_THRESHOLD,
      };
    })
    .filter((row) => row.planned !== null || row.committed > 0);
}

/* ------------------------------------------------------------------ */
/* Budget approvals — open Approval rows against a Budget subject      */
/* ------------------------------------------------------------------ */

const OPEN_APPROVAL_STATUSES: ReadonlyArray<Approval["status"]> = [
  "Requested",
  "In Review",
  "Escalated",
];

/** Roles allowed to reforecast a BU's planned budget. */
const REFORECAST_ROLES = ["CMO", "Platform Admin"] as const;

/**
 * Configurable spend threshold (FR-PP-10). A campaign allocation at or below
 * this figure is signed off by the business-unit marketing lead; anything
 * above it routes to CMO approval. Held as a named constant and stated in the
 * approval copy, so the delegation rule is visible where the money is rather
 * than buried in an admin screen.
 */
const CMO_APPROVAL_THRESHOLD_USD = 250_000;

/** The open approval gating a budget (e.g. APR-015 on BUD-001), if any. */
function pendingBudgetApproval(
  approvals: Approval[],
  budgetId: string,
): Approval | undefined {
  return approvals.find(
    (a) =>
      a.subjectEntity === "Budget" &&
      a.subjectId === budgetId &&
      OPEN_APPROVAL_STATUSES.includes(a.status),
  );
}

function PendingApprovalChip({ approval }: { approval: Approval }) {
  return (
    <Link
      to="/approvals"
      title={`${approval.comment} — allocations above ${fmtCurrency(
        CMO_APPROVAL_THRESHOLD_USD,
      )} route to CMO approval.`}
      className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning transition-colors hover:border-warning/40"
    >
      <Hourglass className="h-3 w-3" />
      Pending approval · {approval.id}
    </Link>
  );
}

/**
 * FR-PP-10 — the routing rule behind the chip, in words. Renders next to the
 * pending-approval chip (and on its own when nothing is pending) so the reader
 * always knows which allocations here need a CMO signature and why.
 */
function SpendThresholdNote({
  rows,
  approval,
}: {
  rows: AllocationRow[];
  approval?: Approval;
}) {
  const above = rows.filter(
    (row) => (row.allocation ?? 0) > CMO_APPROVAL_THRESHOLD_USD,
  );
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        Spend threshold — allocations above{" "}
        <span className="font-medium tabular-nums text-foreground">
          {fmtCurrency(CMO_APPROVAL_THRESHOLD_USD)}
        </span>{" "}
        route to CMO approval; at or below it the business unit's marketing lead signs
        off.{" "}
        {above.length === 0
          ? "No allocation in this business unit is above the threshold."
          : `${above.length} of ${rows.length} allocations here ${
              above.length === 1 ? "is" : "are"
            } above it: ${above.map((row) => row.campaign.name).join(", ")}.`}
        {approval
          ? ` ${approval.id} is the open decision on this budget — deciding it in the approvals inbox clears the chip.`
          : ""}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Reforecast dialog — CMO / Platform Admin update amountPlanned       */
/* ------------------------------------------------------------------ */

function ReforecastDialog({
  target,
  onOpenChange,
  onSave,
}: {
  /** The budget + BU being reforecast, or null when closed. */
  target: { budget: Budget; buName: string } | null;
  onOpenChange: (open: boolean) => void;
  onSave: (budgetId: string, amountPlanned: number) => void;
}) {
  const [amount, setAmount] = useState("");

  // Reset the field each time the dialog opens on a (possibly different) budget.
  useEffect(() => {
    if (target) setAmount(String(target.budget.amountPlanned));
  }, [target]);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const allocated = target
    ? target.budget.allocations.reduce((sum, a) => sum + a.amount, 0)
    : 0;

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reforecast {target?.buName}</DialogTitle>
          <DialogDescription>
            Updates {target?.budget.name} ({target?.budget.fiscalYear}) planned
            budget. Utilization, variance, and the KPI strip re-derive from the
            new figure immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <Label htmlFor="reforecast-amount">New planned amount (USD)</Label>
          <Input
            id="reforecast-amount"
            type="number"
            min={0}
            step={10000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Current {target ? fmtCurrency(target.budget.amountPlanned) : ""} ·{" "}
            {fmtCurrency(allocated)} already allocated to campaigns
          </p>
          {valid && parsed < allocated && (
            <p className="text-xs text-warning">
              Below current campaign allocations — the BU will show over-allocated.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => target && onSave(target.budget.id, parsed)}
          >
            <RefreshCcw className="mr-1.5 h-4 w-4" />
            Save reforecast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Variance chip — over budget = rose, under = emerald                 */
/* ------------------------------------------------------------------ */

function VarianceChip({ variance }: { variance: number }) {
  const over = variance < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        over
          ? "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-400"
          : "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {over ? `Over by ${fmtCurrency(-variance)}` : `Under by ${fmtCurrency(variance)}`}
    </span>
  );
}

/**
 * FR-PP-12 — deviation of committed spend from the planned allocation. Beyond
 * MATERIAL_VARIANCE_THRESHOLD the row is called out as a material variance;
 * inside it the deviation is shown but read as normal in-flight movement.
 */
function PlanVarianceChip({ row }: { row: PlanVsActualRow }) {
  if (row.varianceFraction === null || row.variance === null) {
    return <span className="text-xs text-muted-foreground">Unallocated</span>;
  }
  const over = row.variance > 0;
  const label = `${over ? "Over" : "Under"} plan ${fmtDeltaPct(row.varianceFraction)}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        !row.material
          ? "border-border bg-muted text-muted-foreground"
          : over
            ? "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-400"
            : "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:text-amber-400",
      )}
      title={
        row.material
          ? `Deviation exceeds the ${fmtPct(MATERIAL_VARIANCE_THRESHOLD)} material-variance threshold.`
          : `Within the ${fmtPct(MATERIAL_VARIANCE_THRESHOLD)} tolerance.`
      }
    >
      {row.material && <TriangleAlert className="h-3 w-3" aria-hidden="true" />}
      {row.material ? `Material variance · ${label}` : label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Scenario comparison card (FR-PP-08)                                 */
/* ------------------------------------------------------------------ */

function ScenarioComparisonCard({
  comparisons,
}: {
  comparisons: ScenarioComparison[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Scale className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Scenario comparison
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Conservative, base and aggressive cases for every scenario-modelled campaign
          in scope. The base case is the plan of record; the other two are shown as
          deltas from it, with the marginal cost of the change called out underneath.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {comparisons.map((comparison) => (
          <div key={comparison.campaign.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/campaigns/${comparison.campaign.id}`}
                className="text-sm font-medium hover:underline"
              >
                {comparison.campaign.name}
              </Link>
              <StatusBadge status={comparison.campaign.status} />
              {comparison.baseCostPerConversion !== null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  base plan {fmtCurrency(comparison.baseCostPerConversion)} per expected
                  conversion
                </span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {comparison.columns.map((column) => (
                <div
                  key={column.scenario.id}
                  className={cn(
                    "rounded-md border p-3",
                    column.isBase ? "border-primary/40 bg-muted/40" : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">
                      {SCENARIO_LABEL[column.scenario.kind]}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {column.scenario.id}
                    </span>
                  </div>

                  <dl className="mt-2 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="text-xs text-muted-foreground">Spend</dt>
                      <dd className="text-sm font-medium tabular-nums">
                        {fmtCurrency(column.scenario.spend)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="text-xs text-muted-foreground">
                        Expected conversions
                      </dt>
                      <dd className="text-sm font-medium tabular-nums">
                        {column.scenario.expectedConversions.toLocaleString("en-US")}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <dt className="text-xs text-muted-foreground">Expected ROI</dt>
                      <dd className="text-sm font-medium tabular-nums">
                        {fmtMultiple(column.scenario.expectedRoi)}
                      </dd>
                    </div>
                  </dl>

                  {/* Delta from base — the whole point of the three columns. */}
                  <div className="mt-2 border-t border-border pt-2">
                    {column.isBase ? (
                      <span className="text-[11px] text-muted-foreground">
                        Baseline — every delta on this row is measured against these
                        figures.
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        <DeltaChip
                          label="spend"
                          text={fmtDeltaCurrency(column.spendDelta)}
                          positive={column.spendDelta > 0}
                        />
                        <DeltaChip
                          label="conversions"
                          text={fmtDeltaCount(column.conversionsDelta)}
                          positive={column.conversionsDelta > 0}
                        />
                        <DeltaChip
                          label="ROI"
                          text={`${column.roiDelta >= 0 ? "+" : "−"}${Math.abs(
                            column.roiDelta,
                          ).toFixed(1)}x`}
                          positive={column.roiDelta > 0}
                        />
                      </div>
                    )}
                  </div>

                  <ul className="mt-2 space-y-1">
                    {column.scenario.assumptions.map((assumption) => (
                      <li
                        key={assumption}
                        className="text-[11px] leading-snug text-muted-foreground"
                      >
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Sensitivity — returns are non-linear, so read at the margin. */}
            {comparison.sensitivity.length > 0 && (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Sensitivity
                </div>
                <ul className="space-y-1">
                  {comparison.sensitivity.map((line) => (
                    <li key={line} className="text-xs leading-snug text-muted-foreground">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Small signed chip used inside the scenario columns. */
function DeltaChip({
  label,
  text,
  positive,
}: {
  label: string;
  text: string;
  positive: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        positive
          ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {text}
      <span className="font-normal">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Plan vs actual card (FR-PP-12)                                      */
/* ------------------------------------------------------------------ */

function PlanVsActualCard({ rows }: { rows: PlanVsActualRow[] }) {
  const material = rows.filter((row) => row.material);
  const over = material.filter((row) => (row.variance ?? 0) > 0).length;
  const under = material.length - over;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Plan vs actual
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Planned allocation against committed spend and the business value attributed
          back to each campaign. A deviation of more than{" "}
          {fmtPct(MATERIAL_VARIANCE_THRESHOLD)} from plan is flagged as a material
          variance —{" "}
          {material.length === 0
            ? "none in this scope."
            : `${material.length} of ${rows.length} campaigns in this scope (${over} over plan, ${under} under).`}{" "}
          Underspend against a full-period allocation is normal while a campaign is
          still in flight, so it reads amber; over-commitment reads red and needs a
          reforecast.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Planned allocation</TableHead>
              <TableHead className="text-right">Committed spend</TableHead>
              <TableHead className="text-right">Attributed value</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Flag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.campaign.id}>
                <TableCell>
                  <Link
                    to={`/campaigns/${row.campaign.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {row.campaign.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.planned !== null ? fmtCurrency(row.planned) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtCurrency(row.committed)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.attributedValue !== null ? (
                    fmtCurrency(row.attributedValue)
                  ) : (
                    <span className="text-muted-foreground">not measured</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.variance !== null ? fmtDeltaCurrency(row.variance) : "—"}
                </TableCell>
                <TableCell>
                  <PlanVarianceChip row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Committed spend is the sum of activity spend; attributed value is the sum of
          business-tier metric results credited to the campaign, so unmeasured campaigns
          show no value rather than a zero.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BudgetPage() {
  return (
    <ErrorBoundary>
      <BudgetContent />
    </ErrorBoundary>
  );
}

function BudgetContent() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  const { brandId, businessUnitId, regionId } = useScope();
  const { role } = useRole();

  // Live budgets — registered under the shared "budgets" collection id and
  // layered onto the SeedDB so every derivation below sees reforecasts.
  const budgets = useCollection<Budget>("budgets", getSeedDB().budgets);
  const budgetOverride = useMemo(
    () => ({ budgets: budgets.records }),
    [budgets.records],
  );
  const db = useLiveDBWith(budgetOverride);
  const scope = useMemo<Scope>(
    () => ({ brandId, businessUnitId, regionId }),
    [brandId, businessUnitId, regionId],
  );

  const rollups = useMemo(() => buRollups(db, scope), [db, scope]);
  // FR-PP-08 / FR-PP-12 — both read the same committed-spend selector as the
  // rollups above, so the three surfaces cannot disagree.
  const comparisons = useMemo(() => scenarioComparisons(db, scope), [db, scope]);
  const planRows = useMemo(() => planVsActualRows(db, scope), [db, scope]);

  const canReforecast = (REFORECAST_ROLES as readonly string[]).includes(role);
  const [reforecastTarget, setReforecastTarget] = useState<{
    budget: Budget;
    buName: string;
  } | null>(null);

  const saveReforecast = (budgetId: string, amountPlanned: number): void => {
    const buName = reforecastTarget?.buName ?? budgetId;
    budgets.updateIn(budgetId, {
      amountPlanned,
      updatedAt: new Date().toISOString(),
    });
    setReforecastTarget(null);
    toast.success(`Reforecast saved — ${buName} planned at ${fmtCurrency(amountPlanned)}`, {
      description: "Utilization, variance, and KPI figures re-derived from the new plan.",
    });
  };

  /* KPI strip — straight sums of the BU rollups, so everything reconciles. */
  const totalPlanned = rollups.reduce((sum, r) => sum + r.planned, 0);
  const totalCommitted = rollups.reduce((sum, r) => sum + r.committed, 0);
  const totalUtilization = totalPlanned > 0 ? totalCommitted / totalPlanned : 0;
  const totalRemaining = totalPlanned - totalCommitted;

  const chartData = useMemo(
    () =>
      rollups.map((r) => ({
        name: r.bu.name,
        planned: r.planned,
        committed: r.committed,
      })),
    [rollups],
  );

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Budget"
        description="Planned budgets vs committed campaign spend across the current scope"
      />

      {rollups.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No budgets in scope"
          hint="Widen the brand, business unit, or region filters to see budget rollups."
        />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Total planned"
              value={fmtCurrency(totalPlanned)}
              sub={`${rollups.length} business ${rollups.length === 1 ? "unit" : "units"} in scope`}
            />
            <KpiTile
              label="Total committed"
              value={fmtCurrency(totalCommitted)}
              sub="Sum of campaign activity spend"
            />
            <KpiTile
              label="Utilization"
              value={fmtPct(totalUtilization)}
              sub="Committed as a share of planned"
            />
            <KpiTile
              label="Remaining"
              value={fmtCurrency(totalRemaining)}
              sub="Planned minus committed"
            />
          </div>

          {/* Planned vs committed per BU */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Planned vs committed by business unit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: 8, right: 16, top: 8 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) => compactCurrency.format(v)}
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number, key: string) => [
                        fmtCurrency(value),
                        key === "planned" ? "Planned" : "Committed",
                      ]}
                    />
                    <Legend
                      formatter={(key: string) =>
                        key === "planned" ? "Planned" : "Committed"
                      }
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="planned"
                      fill={MUTED}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="committed"
                      fill={PRIMARY}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Per-BU budget cards */}
          {rollups.map((rollup) => {
            const pending = rollup.budget
              ? pendingBudgetApproval(db.approvals, rollup.budget.id)
              : undefined;
            return (
            <Card key={rollup.bu.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-medium">{rollup.bu.name}</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {rollup.budget
                      ? `${rollup.budget.name} · ${rollup.budget.fiscalYear}`
                      : "No budget defined"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pending && <PendingApprovalChip approval={pending} />}
                  <VarianceChip variance={rollup.variance} />
                  {canReforecast && rollup.budget && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setReforecastTarget({
                          budget: rollup.budget!,
                          buName: rollup.bu.name,
                        })
                      }
                    >
                      <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                      Reforecast
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* FR-PP-10 — the delegation rule behind the approval chip. */}
                <SpendThresholdNote rows={rollup.rows} approval={pending} />

                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Planned
                    </span>
                    <div className="text-xl font-light tabular-nums">
                      {fmtCurrency(rollup.planned)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Committed
                    </span>
                    <div className="text-xl font-light tabular-nums">
                      {fmtCurrency(rollup.committed)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Utilization
                    </span>
                    <div className="text-xl font-light tabular-nums">
                      {fmtPct(rollup.utilization)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Estimated ROI
                    </span>
                    <div
                      className={cn(
                        "text-xl font-light tabular-nums",
                        rollup.roi.roi !== null && roiToneClass(rollup.roi.roi),
                      )}
                    >
                      {rollup.roi.roi !== null ? fmtSignedPct(rollup.roi.roi) : "—"}
                    </div>
                    {rollup.roi.roi !== null && (
                      <p className="text-[11px] text-muted-foreground">
                        {rollup.roi.measuredCampaignCount} campaign
                        {rollup.roi.measuredCampaignCount === 1 ? "" : "s"} measured
                      </p>
                    )}
                  </div>
                </div>

                <Progress value={Math.min(100, rollup.utilization * 100)} className="h-2" />

                {rollup.rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No campaigns in scope for this business unit.
                  </p>
                ) : (
                  <Collapsible>
                    <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                      {rollup.rows.length} campaign{" "}
                      {rollup.rows.length === 1 ? "allocation" : "allocations"}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Table className="mt-2">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Campaign</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Allocation</TableHead>
                            <TableHead className="text-right">Committed</TableHead>
                            <TableHead className="text-right">Utilization</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rollup.rows.map((row) => (
                            <TableRow key={row.campaign.id}>
                              <TableCell>
                                <Link
                                  to={`/campaigns/${row.campaign.id}`}
                                  className="text-sm font-medium hover:underline"
                                >
                                  {row.campaign.name}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={row.campaign.status} />
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.allocation !== null
                                  ? fmtCurrency(row.allocation)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtCurrency(row.committed)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.utilization !== null ? fmtPct(row.utilization) : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Totals row — matches the card's committed and utilization. */}
                          <TableRow className="font-medium">
                            <TableCell className="text-sm">Total</TableCell>
                            <TableCell />
                            <TableCell className="text-right tabular-nums">
                              {fmtCurrency(rollup.allocated)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtCurrency(rollup.committed)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {fmtPct(rollup.utilization)}
                              <span className="ml-1 font-normal text-muted-foreground">
                                of planned
                              </span>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
            );
          })}

          {/* FR-PP-12 — plan vs actual with material-variance flagging */}
          {planRows.length > 0 && <PlanVsActualCard rows={planRows} />}

          {/* FR-PP-08 — conservative / base / aggressive with sensitivity */}
          {comparisons.length > 0 && (
            <ScenarioComparisonCard comparisons={comparisons} />
          )}
        </>
      )}

      <ReforecastDialog
        target={reforecastTarget}
        onOpenChange={(open) => {
          if (!open) setReforecastTarget(null);
        }}
        onSave={saveReforecast}
      />
    </div>
  );
}
