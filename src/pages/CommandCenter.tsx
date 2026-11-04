/**
 * Command center — flagship dashboard.
 * Every number derives from selectors over the live DB (frozen seed + runtime
 * DataStore mutations via useLiveDB); the whole page re-derives when the
 * topbar scope (brand / BU / region) changes or a collection is mutated.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock,
  Compass,
  PieChart as PieChartIcon,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  X,
  type LucideIcon,
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
import { KpiTile } from "@/components/marcomm/KpiTile";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { PageSkeleton } from "@/components/marcomm/PageSkeleton";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { originOf } from "@/data/selectors/originSelectors";
import { runsForRecord } from "@/data/selectors/agentRunSelectors";

import { useLiveDB } from "@/data/useLiveDB";
import {
  atRiskCampaigns,
  campaignKpiIds,
  campaignsInScope,
  channelMix,
  kpiAttainment,
  kpiSummary,
  metricSeries,
  myApprovals,
  pipelineByStatus,
  TODAY,
  upcomingActivities,
  type Rag,
  type Scope,
} from "@/data/selectors";
import type {
  AgentRun,
  ApprovalStatus,
  CampaignActivity,
  CrisisIncident,
  EntityName,
  SeedDB,
} from "@/data/types";
import { aiService } from "@/services/ai";
import { CHART_MUTED, CHART_PRIMARY, CHART_SERIES } from "@/lib/chartPalette";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { canSeeNav, useRole, type AppRole, type NavKey } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string): string {
  return shortDate.format(new Date(iso));
}

/** 'Aug 13, 11:55 UTC' — run timestamps carry a time, and the time matters. */
const shortDateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${shortDateTime.format(parsed)} UTC`;
}

function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/* ------------------------------------------------------------------ */
/* Chart palette — muted NST tones, accents used sparingly             */
/* ------------------------------------------------------------------ */

const PRIMARY = CHART_PRIMARY;
const MUTED = CHART_MUTED;

/** Donut slices: primary first, then the shared restrained accent series. */
const DONUT_COLORS = [PRIMARY, ...CHART_SERIES, MUTED];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
} as const;

/* ------------------------------------------------------------------ */
/* RAG chip                                                            */
/* ------------------------------------------------------------------ */

const RAG_STYLES: Record<Rag, string> = {
  green: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  amber: "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:text-amber-400",
  red: "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-400",
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
/* Executive digest (Executive / CMO only)                             */
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

function plural(count: number, noun: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? noun : (pluralForm ?? `${noun}s`)}`;
}

interface AttentionRow {
  key: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  to: string;
}

/* ------------------------------------------------------------------ */
/* Start here — role-specific first-run orientation                    */
/* ------------------------------------------------------------------ */

/**
 * A first-run pointer for each signed-in role: the few places in a broad nav
 * that role actually starts from. Every `to` is a route declared in App.tsx,
 * and every entry carries the nav key that guards it so the list is filtered
 * through the same RBAC rule the sidebar uses — a role is never pointed at a
 * page it cannot open. Nothing here is derived from data, so nothing here
 * claims a count.
 */
interface StartHereAction {
  to: string;
  navKey: NavKey;
  label: string;
  detail: string;
}

const START_HERE: Record<AppRole, readonly StartHereAction[]> = {
  CMO: [
    { to: "/reports", navKey: "reports", label: "Board pack", detail: "The roll-up you present from" },
    { to: "/performance", navKey: "performance", label: "Performance", detail: "KPI attainment against target" },
    { to: "/budget", navKey: "budget", label: "Budget", detail: "Committed versus planned spend" },
    { to: "/approvals", navKey: "approvals", label: "Approvals", detail: "Decisions queued in your name" },
  ],
  "Campaign Manager": [
    { to: "/campaigns", navKey: "campaigns", label: "Campaigns", detail: "Your pipeline, stage by stage" },
    { to: "/calendar", navKey: "calendar", label: "Calendar", detail: "What runs, and when" },
    { to: "/approvals", navKey: "approvals", label: "Approvals", detail: "What is holding a launch up" },
    { to: "/budget", navKey: "budget", label: "Budget", detail: "Spend against each campaign" },
  ],
  "Corporate Comms Manager": [
    { to: "/communications", navKey: "communications", label: "Communications", detail: "Outbound comms and their status" },
    { to: "/pr", navKey: "pr", label: "PR & media", detail: "Media contacts and coverage" },
    { to: "/governance", navKey: "governance", label: "Governance & crisis", detail: "Open incidents and playbooks" },
    { to: "/reports", navKey: "reports", label: "Board pack", detail: "The narrative for leadership" },
  ],
  "Content Manager": [
    { to: "/content", navKey: "content", label: "Content studio", detail: "Drafts, versions and localisation" },
    { to: "/assets", navKey: "assets", label: "Asset library", detail: "Approved assets and their rights" },
    { to: "/approvals", navKey: "approvals", label: "Approvals", detail: "Content awaiting review" },
    { to: "/rulebook", navKey: "rulebook", label: "Brand rulebook", detail: "Rules your drafts are checked against" },
  ],
  "Brand Manager": [
    { to: "/rulebook", navKey: "rulebook", label: "Brand rulebook", detail: "Voice, claims and visual rules" },
    { to: "/assets", navKey: "assets", label: "Asset library", detail: "What is on-brand and in date" },
    { to: "/approvals", navKey: "approvals", label: "Approvals", detail: "Brand checks awaiting review" },
    { to: "/performance", navKey: "performance", label: "Performance", detail: "How the brand work landed" },
  ],
  "PR Manager": [
    { to: "/pr", navKey: "pr", label: "PR & media", detail: "Contacts, pitches and coverage" },
    { to: "/communications", navKey: "communications", label: "Communications", detail: "Announcements in flight" },
    { to: "/calendar", navKey: "calendar", label: "Calendar", detail: "Embargo and announcement dates" },
    { to: "/journeys", navKey: "journeys", label: "Journeys & channels", detail: "Where each message goes out" },
  ],
  "Internal Comms Manager": [
    { to: "/internal", navKey: "internal", label: "Internal comms", detail: "Employee announcements and reach" },
    { to: "/journeys", navKey: "journeys", label: "Journeys & channels", detail: "Internal channels and sequences" },
    { to: "/audiences", navKey: "audiences", label: "Audiences & personas", detail: "Who each message reaches" },
    { to: "/calendar", navKey: "calendar", label: "Calendar", detail: "Scheduled internal moments" },
  ],
  "Legal/Compliance Reviewer": [
    { to: "/approvals", navKey: "approvals", label: "Approvals", detail: "Items awaiting your review" },
    { to: "/governance", navKey: "governance", label: "Governance & crisis", detail: "Policies, incidents and audit trail" },
    { to: "/rulebook", navKey: "rulebook", label: "Brand rulebook", detail: "Claims and mandatory disclosures" },
    { to: "/audiences", navKey: "audiences", label: "Audiences & personas", detail: "Consent posture and suppression list" },
  ],
  Executive: [
    { to: "/reports", navKey: "reports", label: "Board pack", detail: "The quarter in one place" },
    { to: "/performance", navKey: "performance", label: "Performance", detail: "KPI attainment against target" },
    { to: "/campaigns", navKey: "campaigns", label: "Campaigns", detail: "What is live right now" },
    { to: "/lifecycle", navKey: "lifecycle", label: "Brand to Demand", detail: "How the operating model fits together" },
  ],
  "Agency User": [
    { to: "/campaigns", navKey: "campaigns", label: "Campaigns", detail: "The campaigns assigned to your agency" },
    { to: "/content", navKey: "content", label: "Content studio", detail: "Drafts you are producing" },
    { to: "/assets", navKey: "assets", label: "Asset library", detail: "Assets your content uses" },
    { to: "/calendar", navKey: "calendar", label: "Calendar", detail: "Delivery dates you are working to" },
  ],
  "Platform Admin": [
    { to: "/admin", navKey: "admin", label: "Administration", detail: "Roles, workspace and integrations" },
    { to: "/agents", navKey: "agents", label: "Agent catalogue", detail: "Which agents run at which stage" },
    { to: "/graph", navKey: "graph", label: "Graph explorer", detail: "How every record links up" },
    { to: "/lifecycle", navKey: "lifecycle", label: "Brand to Demand", detail: "The whole lifecycle, with live counts" },
  ],
};

/** Dismissal is per identity — each role gets its own orientation once. */
const startHereKey = (role: AppRole): string => `marcomm-start-here:${role}`;

function readStartHereDismissed(role: AppRole): boolean {
  try {
    return localStorage.getItem(startHereKey(role)) === "dismissed";
  } catch {
    // Storage unavailable — show it for the session rather than swallow it.
    return false;
  }
}

function writeStartHereDismissed(role: AppRole): void {
  try {
    localStorage.setItem(startHereKey(role), "dismissed");
  } catch {
    // Storage unavailable — the dismissal still holds for this session.
  }
}

/* ------------------------------------------------------------------ */
/* Blockers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Named blocker for a blocked activity.
 *
 * blockerSelectors can only date a state it can find a record for, and campaign
 * activities are not among the record types it dates — a status-only blocker for
 * one would render "blocked · 0 days", where the 0 is an artefact rather than a
 * derived age and the reason repeats the badge beside it. So an activity only
 * gets a blocker line when it resolves to a real pending approval, which carries
 * an owner, a genuine age and an SLA position.
 */
function activityBlocker(db: SeedDB, activity: CampaignActivity) {
  const info = blockerFor(db, "CampaignActivity", activity.id, activity.status);
  return info?.approvalId ? info : null;
}

/* ------------------------------------------------------------------ */
/* Agent activity queue                                                */
/* ------------------------------------------------------------------ */

/**
 * The agent queue: what is executing, what an agent produced that is now
 * waiting on the signed-in person, and what failed.
 *
 * Every row is one `AgentRun` from the ledger or one approval whose subject
 * `originOf` reports as agent-produced. Nothing here is summarised or scored —
 * a failed run shows the error string the run actually recorded, in full.
 */

/** Roles allowed to read Restricted communication subjects — mirrors GraphExplorer. */
const RESTRICTED_VIEWERS: readonly AppRole[] = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
];

const MASKED_SUBJECT = "Restricted communication";

/** The collection a run's subject or product lives in, where the app holds one. */
function rowsFor(db: SeedDB, entity: string): { id: string }[] | null {
  switch (entity) {
    case "Campaign": return db.campaigns;
    case "CampaignActivity": return db.campaignActivities;
    case "Brief": return db.briefs;
    case "Communication": return db.communications;
    case "ChannelExecution": return db.channelExecutions;
    case "Content": return db.contents;
    case "ContentVersion": return db.contentVersions;
    case "Asset": return db.assets;
    case "Idea": return db.ideas;
    case "Approval": return db.approvals;
    case "Brand": return db.brands;
    case "Competitor": return db.competitors;
    case "CrisisIncident": return db.crisisIncidents;
    case "Journey": return db.journeys;
    case "KPI": return db.kpis;
    case "MetricResult": return db.metricResults;
    default: return null;
  }
}

/**
 * Readable name of the record a run touched. A content version reads through
 * its content item, a restricted communication is masked for roles that may not
 * read it, and anything with no title field falls back to its id — which is a
 * real handle a user can search on, not a placeholder.
 */
function recordLabel(
  db: SeedDB,
  entity: string,
  id: string,
  canReadRestricted: boolean,
): string {
  if (entity === "ContentVersion") {
    const version = db.contentVersions.find((v) => v.id === id);
    if (version) {
      const content = db.contents.find((c) => c.id === version.contentId);
      return `${content?.title ?? version.contentId} ${version.versionNumber}`;
    }
  }
  if (entity === "Communication") {
    const comm = db.communications.find((c) => c.id === id);
    if (comm) {
      return comm.classification === "Restricted" && !canReadRestricted
        ? MASKED_SUBJECT
        : comm.subject;
    }
  }
  if (entity === "ChannelExecution") {
    const execution = db.channelExecutions.find((e) => e.id === id);
    const comm = execution && db.communications.find((c) => c.id === execution.communicationId);
    const channel = execution && db.channels.find((c) => c.id === execution.channelId);
    if (execution) {
      const subject =
        comm && (comm.classification !== "Restricted" || canReadRestricted)
          ? comm.subject
          : (comm ? MASKED_SUBJECT : execution.id);
      return channel ? `${subject} · ${channel.name}` : subject;
    }
  }

  const row = rowsFor(db, entity)?.find((r) => r.id === id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return id;
  for (const key of ["title", "name", "subject", "filename", "headline"]) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return id;
}

/**
 * Where a user goes to act on the record a run touched, or null when the app
 * has no route for it or the signed-in role cannot open the surface it lives
 * on. A row without a route still names the record — it just does not pretend
 * to be a door.
 */
function recordRoute(db: SeedDB, entity: string, id: string, role: AppRole): string | null {
  const gate = (navKey: NavKey, to: string): string | null =>
    canSeeNav(role, navKey) ? to : null;

  switch (entity) {
    case "Campaign": return gate("campaigns", `/campaigns/${id}`);
    case "CampaignActivity": return gate("campaigns", "/campaigns");
    case "Brief": {
      const brief = db.briefs.find((b) => b.id === id);
      return brief ? gate("campaigns", `/campaigns/${brief.campaignId}`) : gate("campaigns", "/campaigns");
    }
    case "Content": return gate("content", `/content/${id}`);
    case "ContentVersion": {
      const version = db.contentVersions.find((v) => v.id === id);
      return version ? gate("content", `/content/${version.contentId}`) : null;
    }
    case "Communication": return gate("communications", "/communications");
    case "ChannelExecution": return gate("governance", "/governance");
    case "CrisisIncident": return gate("governance", "/governance");
    case "Asset": return gate("assets", "/assets");
    case "Idea": return gate("ideas", "/ideas");
    case "Approval": return gate("approvals", `/approvals?focus=${id}`);
    case "Brand": return gate("rulebook", "/rulebook");
    case "Competitor": return gate("market", "/market");
    case "Journey": return gate("journeys", "/journeys");
    case "KPI":
    case "MetricResult":
      return gate("performance", "/performance");
    default: return null;
  }
}

/**
 * Wall-clock time since an ISO timestamp, as "4d 6h" / "2h 15m" / "8m".
 *
 * Measured against the viewer's own clock, which is the only honest reading of
 * "how long has this been running": the ledger records when the run started and
 * nothing has since recorded it finishing. When the viewer's clock sits before
 * the recorded start there is no elapsed time to state, so this returns null
 * and the row shows the start time alone rather than a negative duration.
 */
/** Newest first. ISO 8601 timestamps sort correctly as plain strings. */
function byStartedAtDesc(a: AgentRun, b: AgentRun): number {
  if (a.startedAt === b.startedAt) return 0;
  return a.startedAt < b.startedAt ? 1 : -1;
}

function elapsedSince(iso: string, nowMs: number): string | null {
  const started = Date.parse(iso);
  if (Number.isNaN(started)) return null;
  const ms = nowMs - started;
  if (ms < 0) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CommandCenter() {
  return (
    <ErrorBoundary>
      <CommandCenterContent />
    </ErrorBoundary>
  );
}

function CommandCenterContent() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  const { role } = useRole();
  const { brandId, businessUnitId, regionId } = useScope();

  const db = useLiveDB();

  /* ---- Role orientation (item 19) ---- */

  const [startHereHidden, setStartHereHidden] = useState(() => readStartHereDismissed(role));
  // Signing in as another identity is a different orientation with its own
  // dismissal, and the picker can change the role without remounting.
  useEffect(() => {
    setStartHereHidden(readStartHereDismissed(role));
  }, [role]);

  const startHere = useMemo(
    () => START_HERE[role].filter((action) => canSeeNav(role, action.navKey)),
    [role],
  );

  const dismissStartHere = (): void => {
    writeStartHereDismissed(role);
    setStartHereHidden(true);
  };

  const scope = useMemo<Scope>(
    () => ({ brandId, businessUnitId, regionId }),
    [brandId, businessUnitId, regionId],
  );

  /** The seeded stakeholder identity for the signed-in role. */
  const currentStakeholder = useMemo(
    () => db.stakeholders.find((s) => s.role === role),
    [db, role],
  );

  // Agency users are hard-scoped to their agency's assigned records and have
  // no Budget/KPI visibility (blueprint) — rows below filter to these sets,
  // and the KPI strip is replaced with a scoped-down tile row.
  const agencyScope = useMemo(() => agencyScopeForRole(db, role), [db, role]);

  const summary = useMemo(() => kpiSummary(db, scope), [db, scope]);

  const pipeline = useMemo(() => {
    if (agencyScope) {
      // Re-derive the pipeline over the agency's assigned campaigns only.
      const counts = new Map<string, number>();
      for (const c of campaignsInScope(db, scope)) {
        if (!agencyScope.campaignIds.has(c.id)) continue;
        counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
      }
      return [...counts.entries()].map(([status, count]) => ({ status, count }));
    }
    const counts = pipelineByStatus(db, scope);
    // Drop zero rows so the chart reads the same for every role — the agency
    // branch above already only emits statuses that actually occur.
    return (Object.entries(counts) as [string, number][])
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count }));
  }, [db, scope, agencyScope]);
  const pipelineTotal = useMemo(
    () => pipeline.reduce((sum, row) => sum + row.count, 0),
    [pipeline],
  );

  const mix = useMemo(() => channelMix(db, scope), [db, scope]);

  const approvals = useMemo(
    () => (currentStakeholder ? myApprovals(db, currentStakeholder.id) : []),
    [db, currentStakeholder],
  );

  const upcoming = useMemo(
    () =>
      upcomingActivities(db, scope, 14).filter(
        (a) => !agencyScope || agencyScope.activityIds.has(a.id),
      ),
    [db, scope, agencyScope],
  );

  const atRisk = useMemo(() => {
    const rows = atRiskCampaigns(db, scope);
    if (!agencyScope) return rows;
    // Assigned campaigns only, with budget/KPI reasons stripped (no budget or
    // KPI visibility for agency users) — the RAG label stands in when every
    // reason was budget/KPI-derived.
    return rows
      .filter(({ campaign }) => agencyScope.campaignIds.has(campaign.id))
      .map(({ campaign, health }) => ({
        campaign,
        health: {
          ...health,
          reasons: health.reasons.filter((r) => !/budget|kpi/i.test(r)),
        },
      }));
  }, [db, scope, agencyScope]);

  const reachSeries = useMemo(() => metricSeries(db, "impressions", scope), [db, scope]);

  /* ---- Origin of the records waiting on me (item 1) ---- */

  /**
   * Origin of each queued approval's *subject* — the thing a person actually
   * reviews. Derived from provenance, so only records an agent genuinely
   * produced read as proposed.
   */
  const approvalOrigins = useMemo(
    () =>
      new Map(
        approvals.map(({ approval }) => [
          approval.id,
          originOf(db, approval.subjectEntity, approval.subjectId),
        ]),
      ),
    [db, approvals],
  );

  const proposedApprovalCount = useMemo(
    () => [...approvalOrigins.values()].filter((o) => o.origin === "agent").length,
    [approvalOrigins],
  );

  /* ---- Agent activity queue (item 7) ---- */

  const canReadRestricted = RESTRICTED_VIEWERS.includes(role);

  /**
   * Runs whose subject this identity is allowed to see. Agency users are
   * hard-scoped to their agency's assigned records, so a run against anything
   * outside that set is withheld entirely rather than shown as an unnamed row —
   * and a subject whose entity has no agency-scoped set is treated as not
   * theirs, because nothing here evidences that it is.
   */
  const visibleRuns = useMemo(() => {
    if (!agencyScope) return db.agentRuns;
    return db.agentRuns.filter((run) => {
      switch (run.subjectEntity) {
        case "Campaign":
          return agencyScope.campaignIds.has(run.subjectId);
        case "CampaignActivity":
          return agencyScope.activityIds.has(run.subjectId);
        case "Content":
          return agencyScope.contentIds.has(run.subjectId);
        case "ContentVersion": {
          const version = db.contentVersions.find((v) => v.id === run.subjectId);
          return version ? agencyScope.contentIds.has(version.contentId) : false;
        }
        case "Asset":
          return agencyScope.assetIds.has(run.subjectId);
        default:
          return false;
      }
    });
  }, [db, agencyScope]);

  const runningRuns = useMemo(
    () =>
      visibleRuns
        .filter((r) => r.status === "running" || r.status === "queued")
        .slice()
        .sort(byStartedAtDesc),
    [visibleRuns],
  );

  const failedRuns = useMemo(
    () => visibleRuns.filter((r) => r.status === "failed").slice().sort(byStartedAtDesc),
    [visibleRuns],
  );

  /** Runs that have finished — what an empty "in flight" group is measured against. */
  const finishedRunCount = useMemo(
    () => visibleRuns.filter((r) => r.status === "succeeded" || r.status === "failed").length,
    [visibleRuns],
  );

  /**
   * The approvals queued in this person's name whose subject an agent produced
   * and nobody has confirmed yet — the same `originOf` derivation the approvals
   * table uses, so the panel and the table can never disagree.
   */
  const proposedForReview = useMemo(
    () =>
      approvals.filter(
        ({ approval }) => approvalOrigins.get(approval.id)?.origin === "agent",
      ),
    [approvals, approvalOrigins],
  );

  /** Name of the agent that executed a run, from the seeded roster. */
  const agentName = (agentId: string): string =>
    db.marcomAgents.find((a) => a.id === agentId)?.name ?? agentId;

  /**
   * The agent that actually produced a record awaiting review, when the ledger
   * says so. Only a run that *produced* the record counts — a review run that
   * merely read it did not write it. Content is checked through its current
   * version, because that is the row an agent produces. No matching run leaves
   * this undefined and the chip falls back to the generator on the provenance.
   */
  const producingAgentName = (entity: EntityName, id: string): string | undefined => {
    const candidates: { entity: EntityName; id: string }[] = [{ entity, id }];
    if (entity === "Content") {
      const versionId = db.contents.find((c) => c.id === id)?.currentVersionId;
      if (versionId) candidates.push({ entity: "ContentVersion", id: versionId });
    }
    for (const candidate of candidates) {
      const run = runsForRecord(db, candidate.entity, candidate.id).find(
        (r) => r.producedEntity === candidate.entity && r.producedId === candidate.id,
      );
      if (run) return agentName(run.agentId);
    }
    return undefined;
  };

  /**
   * Read once per render rather than on a timer: rAF and interval work is
   * throttled in review browsers, and a duration that silently stops updating
   * is worse than one that is correct when the page renders.
   *
   * Measured against the demo clock, not the viewer's. Every run timestamp in
   * the ledger is authored relative to TODAY, so reading them against real time
   * made an in-flight run report "4d elapsed" the moment the demo sat unused
   * for a few days — and that number grows forever. Against the demo clock the
   * same run reads in hours, and it reads the same tomorrow.
   */
  const nowMs = Date.parse(`${TODAY}T23:59:59Z`);

  /* ---- Blocked activities behind an at-risk campaign (item 9) ---- */

  /** The activities behind each at-risk campaign's "N blocked activities" reason. */
  const blockedActivitiesByCampaign = useMemo(() => {
    const map = new Map<string, CampaignActivity[]>();
    for (const { campaign } of atRisk) {
      const blocked = db.campaignActivities.filter(
        (a) => a.campaignId === campaign.id && a.status === "Blocked",
      );
      if (blocked.length > 0) map.set(campaign.id, blocked);
    }
    return map;
  }, [db, atRisk]);

  /* ---- Preconditions the empty states report (item 8) ---- */

  /** Campaigns actually assessed for risk — agency users see their own only. */
  const assessedCampaigns = useMemo(
    () =>
      campaignsInScope(db, scope).filter(
        (c) => !agencyScope || agencyScope.campaignIds.has(c.id),
      ),
    [db, scope, agencyScope],
  );

  /** Pending approvals org-wide — what an empty personal queue is measured against. */
  const orgPendingApprovalCount = useMemo(
    () => db.approvals.filter((a) => PENDING_APPROVAL_STATUSES.includes(a.status)).length,
    [db],
  );

  /**
   * The first in-scope activity beyond the 14-day strip. Nothing overlapping the
   * strip means every activity the 12-month window returns starts after it, so
   * the head of that list is the next one to run.
   */
  const nextActivityBeyondWindow = useMemo(() => {
    if (upcoming.length > 0) return null;
    return (
      upcomingActivities(db, scope, 365).filter(
        (a) => !agencyScope || agencyScope.activityIds.has(a.id),
      )[0] ?? null
    );
  }, [db, scope, agencyScope, upcoming]);

  /* ---- Executive digest (rendered for Executive / CMO only) ---- */

  const isExecutiveView = role === "Executive" || role === "CMO";

  const scopedCampaigns = useMemo(() => campaignsInScope(db, scope), [db, scope]);

  const liveCampaignCount = useMemo(
    () => scopedCampaigns.filter((c) => c.status === "Live").length,
    [scopedCampaigns],
  );

  /** Mean KPI attainment across every KPI attached to an in-scope campaign. */
  const attainmentMeanPct = useMemo(() => {
    const values = scopedCampaigns
      .flatMap((c) => campaignKpiIds(db, c.id).map((kpiId) => ({ kpiId, campaignId: c.id })))
      .map(({ kpiId, campaignId }) => kpiAttainment(db, kpiId, campaignId))
      .filter((a): a is NonNullable<ReturnType<typeof kpiAttainment>> => a !== null)
      .map((a) => a.attainment);
    if (values.length === 0) return null;
    return (values.reduce((s, v) => s + v, 0) / values.length) * 100;
  }, [db, scopedCampaigns]);

  /** All pending approvals org-wide whose SLA due date has already passed. */
  const overdueApprovalCount = useMemo(
    () =>
      db.approvals.filter(
        (a) =>
          PENDING_APPROVAL_STATUSES.includes(a.status) &&
          Date.parse(a.slaDueAt) < Date.parse(TODAY),
      ).length,
    [db],
  );

  /** Active crisis incidents, most severe first (SeedDB always carries the collection). */
  const activeCrises = useMemo(
    () =>
      (db.crisisIncidents ?? [])
        .filter((c) => c.status === "Active")
        .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [db],
  );

  /** Deterministic 3-sentence narrative — sentence one comes from aiService.summarize. */
  const digestText = useMemo(() => {
    const campaignSentence = aiService.summarize(
      "Campaign",
      scopedCampaigns as unknown as Record<string, unknown>[],
    );

    const attainmentClause =
      attainmentMeanPct !== null
        ? `mean KPI attainment stands at ${formatPct(attainmentMeanPct, 0)}`
        : "KPI attainment is not yet reported";
    const performanceSentence = `${plural(liveCampaignCount, "campaign is", "campaigns are")} live, ${attainmentClause}, and budget utilization is at ${formatPct(summary.budgetUtilizationPct, 0)}.`;

    const approvalClause =
      overdueApprovalCount > 0
        ? `${plural(overdueApprovalCount, "pending approval")} past SLA`
        : "no pending approvals past SLA";
    const severityBreakdown = activeCrises
      .map((c) => c.severity)
      .reduce<Map<string, number>>((m, s) => m.set(s, (m.get(s) ?? 0) + 1), new Map());
    const crisisClause =
      activeCrises.length > 0
        ? `${plural(activeCrises.length, "active crisis incident")} (${[...severityBreakdown.entries()]
            .map(([severity, count]) => `${count} ${severity}`)
            .join(", ")})`
        : "no active crisis incidents";
    const riskSentence = `Risk watch: ${approvalClause} and ${crisisClause}.`;

    return `${campaignSentence} ${performanceSentence} ${riskSentence}`;
  }, [scopedCampaigns, liveCampaignCount, attainmentMeanPct, summary, overdueApprovalCount, activeCrises]);

  /**
   * Where a crisis incident row leads. Incidents are held on the governance
   * surface (the same target `recordRoute` uses), so a role that can open it
   * goes there; the board pack lists the active incidents too and is the
   * fallback for a role — an Executive — that governance is closed to.
   */
  const crisisRoute = canSeeNav(role, "governance") ? "/governance" : "/reports";

  /** Up to 3 deep-linked items: crises, then my overdue approvals, then at-risk campaigns. */
  const attentionRows = useMemo<AttentionRow[]>(() => {
    const rows: AttentionRow[] = [];
    for (const incident of activeCrises) {
      if (incident.severity !== "Critical" && incident.severity !== "High") continue;
      rows.push({
        key: incident.id,
        icon: ShieldAlert,
        title: incident.title,
        detail: `${incident.severity} crisis incident — declared ${formatDate(incident.declaredAt)}`,
        to: crisisRoute,
      });
    }
    for (const { approval, subjectTitle } of approvals) {
      if (Date.parse(approval.slaDueAt) >= Date.parse(TODAY)) continue;
      rows.push({
        key: approval.id,
        icon: Clock,
        title: subjectTitle,
        detail: `Approval past SLA — was due ${formatDate(approval.slaDueAt)}`,
        to: `/approvals?focus=${approval.id}`,
      });
    }
    for (const { campaign, health } of atRisk) {
      rows.push({
        key: campaign.id,
        icon: AlertTriangle,
        title: campaign.name,
        detail: health.reasons[0] ?? RAG_LABELS[health.rag],
        to: `/campaigns/${campaign.id}`,
      });
    }
    return rows.slice(0, 3);
  }, [activeCrises, approvals, atRisk, crisisRoute]);

  const campaignName = (campaignId: string): string =>
    db.campaigns.find((c) => c.id === campaignId)?.name ?? campaignId;

  const channelName = (channelId: string): string =>
    db.channels.find((c) => c.id === channelId)?.name ?? channelId;

  const stageName = (workflowStageId: string): string =>
    db.workflowStages.find((ws) => ws.id === workflowStageId)?.name ?? workflowStageId;

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Command center"
        description={`Marketing and communications overview for ${db.org.name}`}
        actions={
          proposedApprovalCount > 0 ? (
            <Link
              to="/approvals"
              className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:underline"
            >
              {proposedApprovalCount} proposed awaiting review
            </Link>
          ) : undefined
        }
      />

      {/* Start here — role orientation, shown until dismissed */}
      {!startHereHidden && startHere.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm font-medium">Start here as {role}</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The pages this role works from. Everything else stays in the
                  sidebar, grouped by lifecycle stage.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="-mr-1 -mt-1 h-7 w-7 shrink-0 p-0"
                aria-label="Dismiss orientation"
                onClick={dismissStartHere}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {startHere.map((action) => (
                <li key={action.to} className="relative">
                  <Link
                    to={action.to}
                    className="flex items-center gap-2 rounded-md border border-border p-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* Both lines truncate inside a 4-up grid, so each carries
                        its own title — at 1280 the detail line is cut (e.g.
                        "Committed versus planned spend" needs 205px in a
                        175px box) and the tooltip is the only way to read it. */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" title={action.label}>
                        {action.label}
                      </div>
                      <div
                        className="truncate text-xs text-muted-foreground"
                        title={action.detail}
                      >
                        {action.detail}
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Executive digest — Executive / CMO only */}
      {isExecutiveView && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-500" aria-hidden="true" />
              <CardTitle className="text-sm font-medium">Executive digest</CardTitle>
              <span className="inline-flex items-center rounded-full border border-sky-600/20 bg-sky-600/10 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400">
                AI summary
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{digestText}</p>
            <p className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              Generated from live data
            </p>
            {attentionRows.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Needs your attention
                </div>
                <ul className="mt-2 divide-y">
                  {attentionRows.map((row) => (
                    <li key={row.key} className="relative flex items-center gap-3 py-2">
                      <row.icon
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={row.to}
                          className="text-sm font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {row.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.detail}
                        </p>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI strip — agency users get a scoped-down tile row instead (no
          budget or KPI visibility per blueprint) */}
      {agencyScope ? (
        <>
          <p className="text-xs text-muted-foreground">
            Showing records assigned to {agencyScope.agencyName ?? "your agency"}
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile
              label="Assigned campaigns"
              value={wholeNumber.format(agencyScope.campaignIds.size)}
              sub="Campaigns your agency executes on"
            />
            <KpiTile
              label="Assigned activities"
              value={wholeNumber.format(agencyScope.activityIds.size)}
              sub="Activities owned by your agency"
            />
            <KpiTile
              label="Content items"
              value={wholeNumber.format(agencyScope.contentIds.size)}
              sub="Content on assigned campaigns"
            />
            <KpiTile
              label="Assets"
              value={wholeNumber.format(agencyScope.assetIds.size)}
              sub="Assets embedded by assigned content"
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiTile
            label="Total reach"
            value={compactNumber.format(summary.totalReach)}
            sub="Impressions in scope"
          />
          <KpiTile
            label="Avg engagement rate"
            value={
              summary.avgEngagementRate !== null
                ? formatPct(summary.avgEngagementRate)
                : "—"
            }
            sub="Mean of rate metrics in scope"
          />
          <KpiTile
            label="Conversions"
            value={compactNumber.format(summary.conversions)}
            sub="Preorders and registrations"
          />
          <KpiTile
            label="Budget utilization"
            value={formatPct(summary.budgetUtilizationPct, 0)}
            /* Budgets are held per business unit, so a brand or region filter
               narrows the committed spend but not the plan it is measured
               against. Saying only "Committed vs BU plan" let the tile read 6%
               under a brand scope whose own BU is 62% utilised, with nothing on
               screen to say the two sides were counted differently. */
            sub={
              brandId || regionId
                ? "Committed in scope vs whole BU plan"
                : "Committed vs BU plan"
            }
          />
        </div>
      )}

      {/* Pipeline + channel mix (channel mix is metric-derived — hidden for
          agency users, who have no KPI visibility) */}
      <div className={cn("grid gap-4", !agencyScope && "lg:grid-cols-2")}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campaign pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineTotal === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No campaigns in scope"
                hint={
                  agencyScope
                    ? `The pipeline counts campaigns assigned to ${agencyScope.agencyName ?? "your agency"}; none of the ${db.campaigns.length} campaigns is. Assignment happens on the campaign record.`
                    : db.campaigns.length === 0
                      ? "The pipeline counts campaigns, and none have been created yet."
                      : `${db.campaigns.length} campaigns exist, and none match the current brand, business unit and region filter. Widen the scope in the topbar to see them.`
                }
                actionSlot={
                  db.campaigns.length > 0 ? (
                    <Link
                      to="/campaigns"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open campaigns
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipeline} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: MUTED, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="status"
                      width={88}
                      tick={{ fill: MUTED, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number) => [wholeNumber.format(value), "Campaigns"]}
                    />
                    <Bar isAnimationActive={false} dataKey="count" fill={PRIMARY} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {!agencyScope && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Channel mix</CardTitle>
          </CardHeader>
          <CardContent>
            {mix.length === 0 ? (
              <EmptyState
                icon={PieChartIcon}
                title="No channel volume in scope"
                hint={`Channel mix is built from volume metric results tagged with a channel. None of the ${db.metricResults.length} recorded results carries a channel dimension inside the current scope — tagging results by channel is what fills this chart.`}
                actionSlot={
                  <Link
                    to="/performance"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open performance
                  </Link>
                }
              />
            ) : (
              <div className="flex h-64 items-center gap-4">
                <div className="h-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={mix}
                        dataKey="value"
                        nameKey="channelName"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="hsl(var(--background))"
                      >
                        {mix.map((slice, i) => (
                          <Cell
                            key={slice.channelId}
                            fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(value: number, name: string) => [
                          compactNumber.format(value),
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-40 shrink-0 space-y-1.5 text-xs">
                  {mix.map((slice, i) => (
                    <li key={slice.channelId} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span
                        className="min-w-0 flex-1 truncate text-muted-foreground"
                        title={slice.channelName}
                      >
                        {slice.channelName}
                      </span>
                      <span className="tabular-nums">{formatPct(slice.share * 100, 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Weekly reach trend — metric-derived, hidden for agency users */}
      {!agencyScope && (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly reach trend</CardTitle>
        </CardHeader>
        <CardContent>
          {reachSeries.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No impression data in scope"
              hint={`The trend plots weekly results recorded against the impressions metric. None of the ${db.metricResults.length} recorded results matches that metric inside the current scope, so there is no series to draw.`}
              actionSlot={
                <Link
                  to="/performance"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Open performance
                </Link>
              }
            />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reachSeries} margin={{ left: 8, right: 16, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={formatDate}
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    /* The first tick is centred on the first data point, which
                       sits flush against the Y axis, so half its label hangs
                       left into the Y-axis gutter and lands on the bottom Y
                       tick — "Jun 8" was drawn over "0". Insetting the series
                       by half a tick label clears the two apart; the Y tick
                       labels are right-aligned to a fixed edge, so this holds
                       whatever the values format to. */
                    padding={{ left: 16 }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => compactNumber.format(v)}
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelFormatter={(label: string) => `Week of ${formatDate(label)}`}
                    formatter={(value: number) => [compactNumber.format(value), "Impressions"]}
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
          )}
        </CardContent>
      </Card>
      )}

      {/* My approvals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">My approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No pending approvals"
              hint={
                !currentStakeholder
                  ? `No stakeholder holds the ${role} role in this workspace, so no approval queue can be resolved for the signed-in identity.`
                  : orgPendingApprovalCount > 0
                    ? `Nothing is assigned to ${currentStakeholder.name}. ${plural(orgPendingApprovalCount, "approval is", "approvals are")} open across the org, each waiting on a different approver.`
                    : `Nothing is assigned to ${currentStakeholder.name}, and no approval anywhere in the org is still open.`
              }
              actionSlot={
                orgPendingApprovalCount > 0 ? (
                  <Link
                    to="/approvals"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open approvals
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map(({ approval, subjectTitle }) => {
                  const origin =
                    approvalOrigins.get(approval.id) ?? { origin: "manual" as const };
                  return (
                    <TableRow
                      key={approval.id}
                      className={cn("relative", proposedRowClass(origin.origin))}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/approvals?focus=${approval.id}`}
                            className="after:absolute after:inset-0 hover:underline"
                          >
                            {subjectTitle}
                          </Link>
                          <OriginChip info={origin} className="relative" />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {stageName(approval.workflowStageId)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDate(approval.slaDueAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={approval.status} />
                        <BlockerLine
                          blocker={blockerFor(
                            db,
                            approval.subjectEntity,
                            approval.subjectId,
                          )}
                          className="relative mt-1 flex max-w-[18rem]"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Agent activity — the agent queue: in flight, waiting on me, failed */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">Agent activity</CardTitle>
            {canSeeNav(role, "agents") && (
              <Link
                to="/agents"
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Agent catalogue
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {agencyScope
              ? `Runs against records assigned to ${agencyScope.agencyName ?? "your agency"}.`
              : "Runs are listed across the org — the brand, business unit and region filter does not apply to them."}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* In flight */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              In flight ({runningRuns.length})
            </h3>
            {runningRuns.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Nothing is running or queued.{" "}
                {finishedRunCount > 0
                  ? `A run appears here the moment an agent is triggered against a record; all ${plural(finishedRunCount, "recorded run has", "recorded runs have")} finished.`
                  : "A run appears here the moment an agent is triggered against a record, and none has been."}
              </p>
            ) : (
              <ul className="mt-1 divide-y">
                {runningRuns.map((run) => {
                  const label = recordLabel(db, run.subjectEntity, run.subjectId, canReadRestricted);
                  const to = recordRoute(db, run.subjectEntity, run.subjectId, role);
                  const elapsed = elapsedSince(run.startedAt, nowMs);
                  return (
                    <li key={run.id} className="flex items-start gap-3 py-2">
                      {/* Blue: a machine owns this row (docs/STATE_TAXONOMY.md). */}
                      <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {run.status === "running" ? "Running" : "Queued"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-1.5">
                          <span className="text-sm font-medium">{agentName(run.agentId)}</span>
                          <span className="text-xs text-muted-foreground">on</span>
                          {to ? (
                            <Link to={to} className="text-sm text-primary hover:underline">
                              {label}
                            </Link>
                          ) : (
                            <span className="text-sm">{label}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {run.status === "running" ? "Started" : "Queued"}{" "}
                          {formatDateTime(run.startedAt)}
                          {elapsed !== null &&
                            ` · ${elapsed} ${run.status === "running" ? "elapsed" : "in the queue"}`}
                          {run.ruleSetVersion && ` · rule set ${run.ruleSetVersion}`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Awaiting your review */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Awaiting your review ({proposedForReview.length})
            </h3>
            {proposedForReview.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {!currentStakeholder
                  ? `No stakeholder holds the ${role} role in this workspace, so no review queue can be resolved for the signed-in identity.`
                  : approvals.length === 0
                    ? `Records an agent produced and queued for ${currentStakeholder.name} appear here. Nothing at all is queued in that name right now.`
                    : `${plural(approvals.length, "approval is", "approvals are")} queued for ${currentStakeholder.name}, and none of their subjects carries agent provenance — each was authored by a person.`}
              </p>
            ) : (
              <ul className="mt-1 divide-y">
                {proposedForReview.map(({ approval, subjectTitle }) => {
                  const origin = approvalOrigins.get(approval.id) ?? { origin: "manual" as const };
                  const producedBy = producingAgentName(
                    approval.subjectEntity,
                    approval.subjectId,
                  );
                  return (
                    <li
                      key={approval.id}
                      className={cn(
                        "relative flex items-start gap-3 py-2",
                        proposedRowClass(origin.origin),
                      )}
                    >
                      <div className="min-w-0 flex-1 pl-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/approvals?focus=${approval.id}`}
                            className="text-sm font-medium after:absolute after:inset-0 hover:underline"
                          >
                            {subjectTitle}
                          </Link>
                          <OriginChip
                            info={origin}
                            agentName={producedBy}
                            className="relative"
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {stageName(approval.workflowStageId)} · due{" "}
                          {formatDate(approval.slaDueAt)}
                        </p>
                      </div>
                      <StatusBadge status={approval.status} className="shrink-0" />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Failed */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Failed ({failedRuns.length})
            </h3>
            {failedRuns.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                No agent run has failed. A failure appears here with the error it
                recorded and a route to the record, so the person who owns that record
                can decide whether to run it again.
              </p>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  A re-run is a decision a person takes on the record itself — this
                  ledger records runs, it does not execute them.
                </p>
                <ul className="mt-1 divide-y">
                  {failedRuns.map((run) => {
                    const label = recordLabel(db, run.subjectEntity, run.subjectId, canReadRestricted);
                    const to = recordRoute(db, run.subjectEntity, run.subjectId, role);
                    return (
                      <li key={run.id} className="flex items-start gap-3 py-2">
                        <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          Failed
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-1.5">
                            <span className="text-sm font-medium">{agentName(run.agentId)}</span>
                            <span className="text-xs text-muted-foreground">on</span>
                            {to ? (
                              <Link to={to} className="text-sm text-primary hover:underline">
                                {label}
                              </Link>
                            ) : (
                              <span className="text-sm">{label}</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {run.error ?? "The run recorded no error string."}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {formatDateTime(run.startedAt)}
                              {run.ruleSetVersion && ` · rule set ${run.ruleSetVersion}`}
                            </span>
                            {to ? (
                              <Link
                                to={to}
                                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                              >
                                Retry from the record
                                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            ) : (
                              <span>
                                The record it ran against is not on a surface your role
                                can open.
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        </CardContent>
      </Card>

      {/* Upcoming 14 days */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upcoming 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled"
              hint={
                nextActivityBeyondWindow
                  ? `The strip shows activities running inside the next 14 days, and none does. The next one to run is ${nextActivityBeyondWindow.name}, starting ${formatDate(nextActivityBeyondWindow.startDate)}.`
                  : "The strip shows activities running inside the next 14 days. No activity in the current scope is scheduled to run at any point in the next 12 months."
              }
              actionSlot={
                <Link
                  to="/calendar"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Open calendar
                </Link>
              }
            />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {upcoming.map((activity) => {
                const channel = channelName(activity.channelId);
                return (
                  <div
                    key={activity.id}
                    className="w-56 shrink-0 rounded-lg border bg-card p-3"
                  >
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
                      {formatDate(activity.startDate)} – {formatDate(activity.endDate)}
                    </div>
                    <div
                      className="mt-1 truncate text-sm font-medium"
                      title={activity.name}
                    >
                      {activity.name}
                    </div>
                    <div
                      className="mt-0.5 truncate text-xs text-muted-foreground"
                      title={campaignName(activity.campaignId)}
                    >
                      {campaignName(activity.campaignId)}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {/* Channel names run long ("Corporate web (Sitecore / AEM)"
                          needs 190px) and the card is 224px wide with a badge
                          beside them, so the name is cut and needs its tooltip. */}
                      <span
                        className="truncate text-xs text-muted-foreground"
                        title={channel}
                      >
                        {channel}
                      </span>
                      <StatusBadge status={activity.status} />
                    </div>
                    <BlockerLine
                      blocker={activityBlocker(db, activity)}
                      className="mt-1.5 flex"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* At-risk campaigns */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">At-risk campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {atRisk.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No campaigns at risk"
              hint={
                assessedCampaigns.length === 0
                  ? "Risk is assessed per campaign in scope, and there are none in scope to assess. Widen the brand, business unit or region filter."
                  : assessedCampaigns.length === 1
                    ? "The one campaign in scope is green on budget burn versus schedule, KPI attainment versus schedule, and blocked activities."
                    : `All ${assessedCampaigns.length} campaigns in scope are green on budget burn versus schedule, KPI attainment versus schedule, and blocked activities.`
              }
            />
          ) : (
            <ul className="divide-y">
              {atRisk.map(({ campaign, health }) => {
                const blocked = blockedActivitiesByCampaign.get(campaign.id) ?? [];
                return (
                  <li key={campaign.id} className="relative flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="text-sm font-medium after:absolute after:inset-0 hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {health.reasons.length > 0
                          ? health.reasons.join(" · ")
                          : RAG_LABELS[health.rag]}
                      </p>
                      {/* The health reason counts blocked activities; these name
                          them, and each names what is holding it up. */}
                      {blocked.map((activity) => (
                        <div
                          key={activity.id}
                          className="relative mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"
                        >
                          <span className="text-muted-foreground">
                            Blocked: {activity.name}
                          </span>
                          <BlockerLine blocker={activityBlocker(db, activity)} />
                        </div>
                      ))}
                      <BlockerLine
                        blocker={blockerFor(db, "Campaign", campaign.id, campaign.status)}
                        className="relative mt-1 flex"
                      />
                    </div>
                    <RagChip rag={health.rag} />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
