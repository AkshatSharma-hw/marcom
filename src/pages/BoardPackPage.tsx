/**
 * Board pack — print-optimized leadership report.
 *
 * Every figure derives from selectors over the frozen SeedDB (no literals);
 * the narrative opener comes from aiService.summarize. The page respects the
 * topbar scope and is restricted to leadership roles. `window.print()` plus
 * the inline @media print styles produce a clean PDF: chrome (sidebar,
 * topbar, help rail) is hidden, background goes white, and sections avoid
 * page breaks.
 *
 * ABAC (blueprint rule, mirrors CommunicationsPage): 'Restricted' crisis
 * incidents render masked unless the signed-in role may read restricted rows.
 */

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckSquare,
  FileText,
  Lock,
  Printer,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";

import { useLiveDB } from "@/data/useLiveDB";
import {
  atRiskCampaigns,
  budgetUtilization,
  campaignKpiIds,
  campaignsInScope,
  kpiAttainment,
  kpiSummary,
  pipelineByStatus,
  totalPlannedVsCommitted,
  TODAY,
  type Rag,
  type Scope,
} from "@/data/selectors";
import type {
  Approval,
  ApprovalStatus,
  CrisisIncident,
  EntityName,
  SeedDB,
} from "@/data/types";
import { aiService } from "@/services/ai";
import { fmtCompact, fmtCurrency, fmtDate } from "@/lib/format";
import { useRole, type AppRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Access control                                                      */
/* ------------------------------------------------------------------ */

/** Roles who may open the board pack — leadership only. */
const BOARD_PACK_ROLES: readonly AppRole[] = [
  "CMO",
  "Executive",
  "Corporate Comms Manager",
  "Platform Admin",
];

/** Roles who may read 'Restricted' rows unmasked (mirrors CommunicationsPage). */
const RESTRICTED_READ_ROLES: readonly AppRole[] = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
];

const MASKED_INCIDENT_TITLE = "Restricted incident";
const MASKED_INCIDENT_SUMMARY = "Details restricted to authorized roles.";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function formatPct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** Actual/target rendered in the KPI's own unit. */
function formatKpiValue(value: number, unit: string): string {
  if (unit === "%") return formatPct(value, 1);
  if (unit === "USD") return fmtCurrency(value);
  return fmtCompact(value);
}

/* ------------------------------------------------------------------ */
/* RAG chip (print-safe borders + text, no reliance on bg printing)    */
/* ------------------------------------------------------------------ */

const RAG_STYLES: Record<Rag, string> = {
  green: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  amber: "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400",
  red: "border-rose-600/30 bg-rose-600/10 text-rose-700 dark:text-rose-400",
};

const RAG_LABELS: Record<Rag, string> = {
  green: "On track",
  amber: "At risk",
  red: "Off track",
};

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
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Approval statuses still awaiting a decision — mirrors myApprovals. */
const PENDING_APPROVAL_STATUSES: readonly ApprovalStatus[] = [
  "Requested",
  "In Review",
  "Escalated",
];

/** Severity sort for crisis incidents — most severe first. */
const SEVERITY_ORDER: Record<CrisisIncident["severity"], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/** Readable title for an approval's subject row, by entity kind. */
function approvalSubjectTitle(db: SeedDB, entity: EntityName, id: string): string {
  switch (entity) {
    case "Campaign":
      return db.campaigns.find((r) => r.id === id)?.name ?? id;
    case "CampaignActivity":
      return db.campaignActivities.find((r) => r.id === id)?.name ?? id;
    case "Brief":
      return db.briefs.find((r) => r.id === id)?.title ?? id;
    case "Content":
      return db.contents.find((r) => r.id === id)?.title ?? id;
    case "ContentVersion": {
      const version = db.contentVersions.find((r) => r.id === id);
      const head = version
        ? db.contents.find((c) => c.id === version.contentId)
        : undefined;
      return head ? `${head.title} ${version?.versionNumber ?? ""}`.trim() : id;
    }
    case "Communication":
      return db.communications.find((r) => r.id === id)?.subject ?? id;
    case "Asset":
      return db.assets.find((r) => r.id === id)?.filename ?? id;
    case "CrisisIncident":
      return db.crisisIncidents.find((r) => r.id === id)?.title ?? id;
    default:
      return id;
  }
}

function SectionCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="board-pack-section">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <span className="mr-2 text-muted-foreground tabular-nums">{number}.</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}

/** Inline print stylesheet — hides app chrome and keeps sections whole. */
const PRINT_STYLES = `
@media print {
  /* Hide app chrome: sidebar, topbar, help rail and any panels after main. */
  aside, header, main ~ * { display: none !important; }
  /* Unlock the app shell's fixed-height scroll container for pagination. */
  .h-screen { height: auto !important; }
  .overflow-hidden, .overflow-y-auto { overflow: visible !important; height: auto !important; }
  /* White page, dark ink. */
  html, body { background: white !important; }
  #board-pack { background: white !important; color: rgb(17 17 17) !important; }
  #board-pack .text-muted-foreground { color: rgb(85 85 85) !important; }
  #board-pack .bg-card, #board-pack .bg-background { background: white !important; }
  /* Keep each report section on one page where possible. */
  #board-pack section { break-inside: avoid; page-break-inside: avoid; }
  #board-pack tr { break-inside: avoid; page-break-inside: avoid; }
  /* Controls that make no sense on paper. */
  .board-pack-no-print { display: none !important; }
}
`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BoardPackPage() {
  return (
    <ErrorBoundary>
      <BoardPackContent />
    </ErrorBoundary>
  );
}

function BoardPackContent() {
  const { role } = useRole();
  const { brandId, businessUnitId, regionId } = useScope();

  const db = useLiveDB();

  const scope = useMemo<Scope>(
    () => ({ brandId, businessUnitId, regionId }),
    [brandId, businessUnitId, regionId],
  );

  const allowed = BOARD_PACK_ROLES.includes(role);
  const canReadRestricted = RESTRICTED_READ_ROLES.includes(role);

  /* ---- Derived figures (all selector-driven) ---- */

  const scopedCampaigns = useMemo(() => campaignsInScope(db, scope), [db, scope]);
  const summary = useMemo(() => kpiSummary(db, scope), [db, scope]);
  const pipeline = useMemo(() => pipelineByStatus(db, scope), [db, scope]);
  const pipelineRows = useMemo(
    () => (Object.entries(pipeline) as [string, number][]).filter(([, n]) => n > 0),
    [pipeline],
  );
  const pipelineTotal = useMemo(
    () => pipelineRows.reduce((sum, [, n]) => sum + n, 0),
    [pipelineRows],
  );

  const atRisk = useMemo(() => atRiskCampaigns(db, scope), [db, scope]);
  const ragByCampaignId = useMemo(
    () => new Map(atRisk.map(({ campaign, health }) => [campaign.id, health.rag])),
    [atRisk],
  );

  /** Campaign portfolio grouped by brand (brand order = seed order). */
  const portfolioRows = useMemo(
    () =>
      db.brands
        .map((brand) => ({
          brand,
          campaigns: scopedCampaigns
            .filter((c) => c.brandId === brand.id)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE)),
        }))
        .filter((group) => group.campaigns.length > 0),
    [db, scopedCampaigns],
  );

  /** KPI attainment for every KPI attached to an in-scope campaign. */
  const kpiRows = useMemo(() => {
    return scopedCampaigns
      .flatMap((campaign) =>
        campaignKpiIds(db, campaign.id).map((kpiId) => {
          const kpi = db.kpis.find((k) => k.id === kpiId);
          const result = kpiAttainment(db, kpiId, campaign.id);
          return kpi && result ? { campaign, kpi, result } : null;
        }),
      )
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(
        (a, b) =>
          a.campaign.name.localeCompare(b.campaign.name, DEFAULT_LOCALE) ||
          a.kpi.name.localeCompare(b.kpi.name, DEFAULT_LOCALE),
      );
  }, [db, scopedCampaigns]);

  const attainmentMeanPct = useMemo(() => {
    if (kpiRows.length === 0) return null;
    return (
      (kpiRows.reduce((s, r) => s + r.result.attainment, 0) / kpiRows.length) * 100
    );
  }, [kpiRows]);

  /** Per-BU planned vs committed; the totals row sums the same columns. */
  const buRows = useMemo(
    () =>
      db.businessUnits.map((bu) => ({
        bu,
        utilization: budgetUtilization(db, bu.id),
      })),
    [db],
  );
  const buTotals = useMemo(
    () =>
      buRows.reduce(
        (acc, { utilization }) => ({
          amountPlanned: acc.amountPlanned + utilization.amountPlanned,
          allocated: acc.allocated + utilization.allocated,
          committed: acc.committed + utilization.committed,
        }),
        { amountPlanned: 0, allocated: 0, committed: 0 },
      ),
    [buRows],
  );
  const scopedBudget = useMemo(() => totalPlannedVsCommitted(db, scope), [db, scope]);

  /* True when the scope narrows on a dimension budgets are not held on, which
     is exactly when the §1 utilization tile and the §4 table stop reconciling. */
  const narrowedBeyondBusinessUnit = Boolean(scope.brandId || scope.regionId);

  /** Active crisis incidents, most severe first, ABAC-masked as needed. */
  const activeCrises = useMemo(
    () =>
      db.crisisIncidents
        .filter((c) => c.status === "Active")
        .slice()
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [db],
  );

  /** All pending approvals org-wide whose SLA due date has passed. */
  const overdueApprovals = useMemo(
    () =>
      db.approvals
        .filter(
          (a) =>
            PENDING_APPROVAL_STATUSES.includes(a.status) &&
            Date.parse(a.slaDueAt) < Date.parse(TODAY),
        )
        .slice()
        .sort((a, b) => a.slaDueAt.localeCompare(b.slaDueAt, DEFAULT_LOCALE)),
    [db],
  );

  const liveCampaignCount = useMemo(
    () => scopedCampaigns.filter((c) => c.status === "Live").length,
    [scopedCampaigns],
  );

  /** Deterministic narrative — opener from aiService.summarize, then derived clauses. */
  const narrative = useMemo(() => {
    const opener = aiService.summarize(
      "Campaign",
      scopedCampaigns as unknown as Record<string, unknown>[],
    );
    const attainmentClause =
      attainmentMeanPct !== null
        ? `mean KPI attainment stands at ${formatPct(attainmentMeanPct)}`
        : "KPI attainment is not yet reported";
    const performance = `${liveCampaignCount} campaign${liveCampaignCount === 1 ? " is" : "s are"} live, ${attainmentClause}, and budget utilization is at ${formatPct(summary.budgetUtilizationPct)} of plan.`;
    const reach = `The portfolio has delivered ${fmtCompact(summary.totalReach)} impressions and ${fmtCompact(summary.conversions)} conversions to date.`;
    const risk = `Risk watch: ${atRisk.length} campaign${atRisk.length === 1 ? "" : "s"} at risk, ${activeCrises.length} active crisis incident${activeCrises.length === 1 ? "" : "s"}, and ${overdueApprovals.length} pending approval${overdueApprovals.length === 1 ? "" : "s"} past SLA.`;
    return `${opener} ${performance} ${reach} ${risk}`;
  }, [
    scopedCampaigns,
    attainmentMeanPct,
    liveCampaignCount,
    summary,
    atRisk,
    activeCrises,
    overdueApprovals,
  ]);

  const stakeholderName = (id: string): string =>
    db.stakeholders.find((s) => s.id === id)?.name ?? id;

  const stageName = (id: string): string =>
    db.workflowStages.find((ws) => ws.id === id)?.name ?? id;

  const approvalIsMasked = (approval: Approval): boolean => {
    if (canReadRestricted) return false;
    if (approval.subjectEntity !== "CrisisIncident") return false;
    const incident = db.crisisIncidents.find((c) => c.id === approval.subjectId);
    return incident?.classification === "Restricted";
  };

  /* ---- Access gate ---- */

  if (!allowed) {
    return (
      <div className="p-6">
        <PageHeader
          title="Board pack"
          description={`Leadership report for ${db.org.name}`}
        />
        <div className="mt-4">
          <EmptyState
            icon={Lock}
            title="Available to leadership roles"
            hint="The board pack is limited to the CMO, Executives, the Corporate Comms Manager, and Platform Admins."
          />
        </div>
      </div>
    );
  }

  return (
    <div id="board-pack" className="space-y-4 p-6">
      <style>{PRINT_STYLES}</style>

      <PageHeader
        title="Board pack"
        description={`Leadership report for ${db.org.name} — as of ${fmtDate(TODAY)}`}
        actions={
          <Button
            className="board-pack-no-print"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Print or save as PDF
          </Button>
        }
      />

      {/* 1. Executive summary */}
      <SectionCard number={1} title="Executive summary">
        <p className="text-sm leading-relaxed">{narrative}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total reach
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {fmtCompact(summary.totalReach)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Conversions
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {fmtCompact(summary.conversions)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              KPI attainment
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {attainmentMeanPct !== null ? formatPct(attainmentMeanPct) : "—"}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Budget utilization
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {formatPct(summary.budgetUtilizationPct)}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
              of business-unit plan
            </div>
          </div>
        </div>
        {/* Budgets are held per business unit, so a brand or region filter
            narrows the committed spend above the line but not the plan below
            it. §4 carries the same caveat on its own table; without it here the
            same printed pack showed §1 at 6% and §4's total at 71% under a
            brand scope with nothing to explain the gap. */}
        {narrowedBeyondBusinessUnit && (
          <p className="mt-2 text-xs text-muted-foreground">
            Budgets are held per business unit. The current scope narrows
            committed spend by brand or region, but the fiscal-year plan it is
            measured against stays whole — read this figure alongside §4, where
            campaign budgets in scope total {fmtCurrency(scopedBudget.planned)}{" "}
            planned against {fmtCurrency(scopedBudget.committed)} committed.
          </p>
        )}
      </SectionCard>

      {/* 2. Portfolio */}
      <SectionCard number={2} title="Portfolio">
        {pipelineTotal === 0 ? (
          <EmptyState
            icon={FileText}
            title="No campaigns in scope"
            hint="Widen the brand, business unit, or region filters to include campaigns."
          />
        ) : (
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pipeline by status
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Campaigns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineRows.map(([status, count]) => (
                    <TableRow key={status}>
                      <TableCell>{status}</TableCell>
                      <TableCell className="text-right tabular-nums">{count}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pipelineTotal}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Campaigns by brand
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioRows.flatMap(({ brand, campaigns }) =>
                    campaigns.map((campaign, i) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="text-muted-foreground">
                          {i === 0 ? brand.name : ""}
                        </TableCell>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <StatusBadge status={campaign.status} />
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {fmtDate(campaign.startDate)} – {fmtDate(campaign.endDate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtCurrency(campaign.budgetAllocation)}
                        </TableCell>
                        <TableCell>
                          <RagChip rag={ragByCampaignId.get(campaign.id) ?? "green"} />
                        </TableCell>
                      </TableRow>
                    )),
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 3. Performance */}
      <SectionCard number={3} title="Performance">
        {kpiRows.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No KPI results in scope"
            hint="No metric results are reported yet for KPIs on in-scope campaigns."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Attainment</TableHead>
                <TableHead className="text-right">Weeks reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiRows.map(({ campaign, kpi, result }) => (
                <TableRow key={`${campaign.id}-${kpi.id}`}>
                  <TableCell className="font-medium">{kpi.name}</TableCell>
                  <TableCell className="text-muted-foreground">{campaign.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKpiValue(result.target, kpi.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKpiValue(result.actual, kpi.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPct(result.attainment * 100)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {result.weeksReported}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* 4. Budget */}
      <SectionCard number={4} title="Budget">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business unit</TableHead>
              <TableHead className="text-right">Planned</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buRows.map(({ bu, utilization }) => (
              <TableRow key={bu.id}>
                <TableCell className="font-medium">{bu.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtCurrency(utilization.amountPlanned)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtCurrency(utilization.allocated)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtCurrency(utilization.committed)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPct(utilization.utilizationPct)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCurrency(buTotals.amountPlanned)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCurrency(buTotals.allocated)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {fmtCurrency(buTotals.committed)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPct(
                  buTotals.amountPlanned > 0
                    ? (buTotals.committed / buTotals.amountPlanned) * 100
                    : 0,
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="mt-2 text-xs text-muted-foreground">
          Business-unit figures are fiscal-year budgets org-wide. Within the current
          report scope, campaign budgets total {fmtCurrency(scopedBudget.planned)} planned
          against {fmtCurrency(scopedBudget.committed)} committed across{" "}
          {scopedBudget.campaignCount} campaign
          {scopedBudget.campaignCount === 1 ? "" : "s"}.
        </p>
      </SectionCard>

      {/* 5. Risk & governance */}
      <SectionCard number={5} title="Risk & governance">
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              At-risk campaigns
            </div>
            {atRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every campaign in scope is green on budget, schedule, and KPI attainment.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Reasons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRisk.map(({ campaign, health }) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <RagChip rag={health.rag} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {health.reasons.join(" · ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Active crisis incidents
            </div>
            {activeCrises.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active crisis incidents.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Declared</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCrises.map((incident) => {
                    const masked =
                      incident.classification === "Restricted" && !canReadRestricted;
                    return (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">
                          {masked ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              {MASKED_INCIDENT_TITLE}
                            </span>
                          ) : (
                            incident.title
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={incident.severity} />
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {fmtDate(incident.declaredAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {masked ? MASKED_INCIDENT_SUMMARY : incident.summary}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Pending approvals past SLA
            </div>
            {overdueApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending approvals are past their SLA.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Was due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueApprovals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">
                        {approvalIsMasked(approval)
                          ? MASKED_INCIDENT_TITLE
                          : approvalSubjectTitle(
                              db,
                              approval.subjectEntity,
                              approval.subjectId,
                            )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {stageName(approval.workflowStageId)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {stakeholderName(approval.approverStakeholderId)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {fmtDate(approval.slaDueAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={approval.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SectionCard>

      <footer className="border-t pt-3 text-center text-xs text-muted-foreground">
        Generated from live data · {fmtDate(TODAY)} · {db.org.name}
      </footer>
    </div>
  );
}
