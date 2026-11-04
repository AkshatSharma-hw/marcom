import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  Ban,
  GitBranch,
  History,
  ListChecks,
  Pause,
  Pencil,
  Play,
  Save,
  ScanSearch,
  Send,
  ShieldCheck,
  Undo2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useLiveDB } from "@/data/useLiveDB";
import { getSeedDB } from "@/data/seed";
import { campaignsInScope, segmentSize } from "@/data/selectors";
import {
  FREQUENCY_CAP_PER_WINDOW,
  FREQUENCY_WINDOW_DAYS,
  MIN_CONSENT_PCT,
  SEND_LEDGER_COLLECTION,
  evaluateSendGate,
  ledgerEntryForPush,
  mergeSendLedger,
  openingSendLedger,
  type SendGateDecision,
  type SendLedgerEntry,
} from "@/data/selectors/sendGate";
import type {
  Brief,
  Campaign,
  Channel,
  ChannelExecution,
  ChannelKind,
  Communication,
  Journey,
  JourneyNode,
  Policy,
  SeedDB,
  Segment,
} from "@/data/types";
import type { AIReviewResult } from "@/services/ai";
import { aiService } from "@/services/ai";
import { useCollection } from "@/store/DataStore";
import { canSeeNav, useRole, type AppRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { fmtCompact, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { JourneyCanvas } from "@/components/marcomm/JourneyCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DEFAULT_LOCALE } from "@/lib/i18n";

interface DeliveryRow {
  execution: ChannelExecution;
  communication: Communication;
  channel: Channel;
  /** Full pre-send verdict — blocks, reductions, and the numbers behind them. */
  gate: SendGateDecision;
  /** Derived reasons this execution cannot move (FR-CO-08); empty = clear. */
  blockers: string[];
}

/**
 * Stable empty seed for the send ledger.
 *
 * The ledger has no shipped rows — it is opened from delivery history at read
 * time and appended to by pushes — but `useCollection` keys its memo on the
 * seed array's identity, so this has to be one module-level constant rather
 * than a fresh `[]` on every render.
 */
const NO_LEDGER_SEED: SendLedgerEntry[] = [];

/** Roles allowed to run journey lifecycle controls (mirrors the journeys nav gate). */
const JOURNEY_MANAGER_ROLES: readonly AppRole[] = [
  "Campaign Manager",
  "Internal Comms Manager",
  "PR Manager",
  "Platform Admin",
];

/** Highest numeric suffix for a given id prefix, e.g. maxIdNumber(rows, 'JRN-') → 3. */
function maxIdNumber(rows: ReadonlyArray<{ id: string }>, prefix: string): number {
  let max = 0;
  for (const r of rows) {
    if (r.id.startsWith(prefix)) {
      const n = parseInt(r.id.slice(prefix.length), 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return max;
}

/* ------------------------------------------------------------------ */
/* FR-CO-01 · Brief → channel-specific execution tasks                  */
/* ------------------------------------------------------------------ */

/** One derived task in the execution plan. Ids are positional (T1, T2, …). */
interface ExecutionTask {
  id: string;
  label: string;
  /** Channel the task belongs to, or 'All channels' for brief-level work. */
  channelName: string;
  /** Provenance line — which record and which constraint produced the task. */
  detail: string;
  /** Ids of tasks that must finish first, rendered as "after: {task}". */
  dependsOn: string[];
}

/** The build step each channel kind needs once the copy has been adapted. */
const CHANNEL_BUILD: Record<ChannelKind, { verb: string; detail: string }> = {
  email: {
    verb: "Build the template",
    detail: "subject + preheader variants, seed-list render test across clients",
  },
  social: {
    verb: "Cut platform-native variants",
    detail: "per-platform aspect ratios and caption lengths, alt text on every image",
  },
  web: {
    verb: "Stage the page in the CMS",
    detail: "behind a preview URL, SEO title and meta description set",
  },
  press: {
    verb: "Assemble the release",
    detail: "boilerplate, quotes and the embargoed distribution list",
  },
  intranet: {
    verb: "Lay out the post",
    detail: "teaser card plus full article, translated where the region requires it",
  },
  event: {
    verb: "Build the event listing",
    detail: "registration page, calendar invite and reminder set",
  },
  SMS: {
    verb: "Trim to the message limit",
    detail: "single-segment copy, registered sender id, opt-out footer",
  },
  print: {
    verb: "Prepare production artwork",
    detail: "print-resolution assets, bleed and colour profile signed off",
  },
  ads: {
    verb: "Configure the ad sets",
    detail: "targeting, pacing and creative rotation, spend cap applied",
  },
};

/**
 * Derives the execution plan for a campaign from its brief and its activities.
 *
 * Deterministic: same graph in → same tasks out. Nothing is invented — every
 * task cites the brief, the activity, the channel adapter or the channel
 * constraint it came from, and sequencing is expressed as explicit `dependsOn`
 * edges rather than an implied order. The approved brief is the driver; when
 * the campaign's brief has not been approved yet the plan is still derived but
 * the caller flags it as provisional.
 */
function deriveExecutionTasks(
  db: SeedDB,
  campaign: Campaign,
): { brief: Brief | null; tasks: ExecutionTask[] } {
  const briefs = db.briefs
    .filter((b) => b.campaignId === campaign.id)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id, DEFAULT_LOCALE));
  const brief = briefs.find((b) => b.status === "Approved") ?? briefs[0] ?? null;
  if (!brief) return { brief: null, tasks: [] };

  const tasks: ExecutionTask[] = [];
  const add = (
    label: string,
    channelName: string,
    detail: string,
    dependsOn: string[],
  ): string => {
    const id = `T${tasks.length + 1}`;
    tasks.push({ id, label, channelName, detail, dependsOn });
    return id;
  };

  const lock = add(
    `Lock the brief — ${brief.title}`,
    "All channels",
    `${brief.id} · ${brief.status} · ${brief.keyMessages.length} key messages fixed`,
    [],
  );
  const master = add(
    "Draft channel-neutral master copy",
    "All channels",
    `Covers all ${brief.keyMessages.length} key messages against the brief objective`,
    [lock],
  );

  const activities = db.campaignActivities
    .filter((a) => a.campaignId === campaign.id)
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE) || a.id.localeCompare(b.id, DEFAULT_LOCALE));

  for (const activity of activities) {
    const channel = db.channels.find((c) => c.id === activity.channelId);
    const channelName = channel?.name ?? activity.channelId;
    const constraint = db.channelConstraints.find((c) => c.channelId === activity.channelId);
    const limits = [
      constraint?.subjectMaxChars ? `subject ≤ ${constraint.subjectMaxChars} chars` : null,
      constraint?.maxChars ? `body ≤ ${constraint.maxChars} chars` : null,
      constraint?.requiresAltText ? "alt text mandatory" : null,
    ].filter(Boolean);

    const adapt = add(
      `Adapt master copy for ${channelName}`,
      channelName,
      `${activity.id} ${activity.name} · ${limits.length > 0 ? limits.join(" · ") : "no hard channel limits"}`,
      [master],
    );

    const build = channel
      ? add(
          `${CHANNEL_BUILD[channel.channelKind].verb} on ${channelName}`,
          channelName,
          `${channel.channelKind} · ${CHANNEL_BUILD[channel.channelKind].detail}`,
          [adapt],
        )
      : adapt;

    let ready = build;
    if (channel?.capabilities.includes("ab-test")) {
      ready = add(
        `Set up A/B variants on ${channelName}`,
        channelName,
        "Channel declares the ab-test capability — one hypothesis per variant",
        [build],
      );
    }

    const review = add(
      `Route ${activity.name} for brand & compliance review`,
      channelName,
      "Assembled output is validated on this channel before anything is pushed",
      [ready],
    );

    add(
      `Push the ${channelName} draft — hold for launch authorisation`,
      channelName,
      `${channel?.adapterKey ?? "connector"} · unpublished draft · activity window opens ${fmtDate(activity.startDate)}`,
      [review],
    );
  }

  return { brief, tasks };
}

/* ------------------------------------------------------------------ */
/* FR-CO-08 · Derived blockers                                          */
/* ------------------------------------------------------------------ */

/*
 * The gate itself now lives in `@/data/selectors/sendGate` — a pure function of
 * (db, execution, communication, ledger). It moved out of this file because it
 * had grown into policy: while it lived here it could only ever be exercised by
 * rendering the page, which is why it went so long checking three things and
 * claiming six. `evaluateSendGate` is imported above and used directly; nothing
 * about a blocker is stored, so clearing the underlying record still clears the
 * chip on the next render with no extra write.
 */

/* ------------------------------------------------------------------ */
/* FR-CO-10 · Segment handoff with consent enforcement                  */
/* ------------------------------------------------------------------ */

interface HandoffRow {
  segment: Segment;
  population: number;
  /** Lowest opted-in share across the channel kinds in play, or null. */
  consentedPct: number | null;
  /** Channel kind the binding consent figure came from. */
  consentKind: ChannelKind | null;
  consented: number;
  /** Suppressed profiles matching this audience/channel mix. */
  suppressed: number;
  /** What actually leaves — consented minus suppressed, never below zero. */
  handoff: number;
}

/**
 * Builds the handoff manifest for a set of audiences on a set of channel kinds.
 *
 * Consent binds on the *tightest* channel in the mix (the minimum optedInPct
 * across the summaries that apply) — a segment consented for email but not for
 * SMS cannot be handed to an SMS-carrying journey on the email figure. A
 * segment with no consent record at all hands off nobody; absence of consent is
 * never read as consent. Suppressed profiles are then removed from what is
 * left, and the removals are reported alongside the number.
 */
function buildHandoff(
  db: SeedDB,
  audienceIds: string[],
  kinds: ChannelKind[],
): HandoffRow[] {
  const kindSet = new Set(kinds);
  const segmentIds = new Set<string>();
  for (const id of audienceIds) {
    const audience = db.audiences.find((a) => a.id === id);
    for (const sid of audience?.segmentIds ?? []) segmentIds.add(sid);
  }

  const suppressed = db.suppressionEntries.filter(
    (e) =>
      (!e.audienceId || audienceIds.includes(e.audienceId)) &&
      (!e.channelKind || kindSet.size === 0 || kindSet.has(e.channelKind)),
  ).length;

  return [...segmentIds]
    .map((sid) => db.segments.find((s) => s.id === sid))
    .filter((s): s is Segment => Boolean(s))
    .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE))
    .map((segment) => {
      const summaries = db.consentSummaries
        .filter((c) => c.segmentId === segment.id)
        .filter((c) => kindSet.size === 0 || kindSet.has(c.channelKind))
        .slice()
        .sort((a, b) => a.optedInPct - b.optedInPct);
      const binding = summaries[0] ?? null;
      const population = segmentSize(db, segment.id);
      const consented = binding ? Math.floor((population * binding.optedInPct) / 100) : 0;
      return {
        segment,
        population,
        consentedPct: binding?.optedInPct ?? null,
        consentKind: binding?.channelKind ?? null,
        consented,
        suppressed,
        handoff: Math.max(0, consented - suppressed),
      };
    });
}

/** The consent + suppression manifest for one journey or campaign. */
function SegmentHandoff({
  title,
  subtitle,
  rows,
  kinds,
  canOpenAudiences,
}: {
  title: string;
  subtitle: string;
  rows: HandoffRow[];
  kinds: ChannelKind[];
  /** Roles without audiences access get plain text instead of a dead link. */
  canOpenAudiences: boolean;
}) {
  // One suppression entry is one masked profile, matched against the audience
  // and channel mix rather than against a segment — so it is removed from every
  // segment export, and the two numbers are reported separately rather than
  // collapsed into one.
  const suppressedProfiles = rows[0]?.suppressed ?? 0;
  const removals = rows.reduce(
    (sum, r) => sum + (r.consentedPct === null ? 0 : Math.min(r.suppressed, r.consented)),
    0,
  );
  const withheld = rows.filter((r) => r.consentedPct === null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Segment handoff
            </div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {kinds.map((k) => (
              <Badge key={k} variant="outline" className="shrink-0 capitalize">
                {k}
              </Badge>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3 p-0 pb-4">
        {rows.length === 0 ? (
          <p className="px-6 text-sm text-muted-foreground">
            No audience segments resolve for this selection — nothing to hand off.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Population</TableHead>
                  <TableHead className="text-right">Consented</TableHead>
                  <TableHead className="text-right">Suppressed</TableHead>
                  <TableHead className="text-right">Handoff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.segment.id}>
                    <TableCell>
                      <div className="font-medium">{r.segment.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {r.segment.id} · {r.segment.criteria}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCompact(r.population)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.consentedPct === null ? (
                        <span className="text-xs text-destructive">no consent record</span>
                      ) : (
                        <>
                          <div className="tabular-nums">{fmtCompact(r.consented)}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {r.consentedPct}% opted in · {r.consentKind}
                          </div>
                        </>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.consentedPct === null
                        ? "—"
                        : `−${Math.min(r.suppressed, r.consented)}`}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmtCompact(r.handoff)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-start gap-3 px-6">
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Suppressed profiles are removed before handoff
                </span>{" "}
                — {suppressedProfiles} suppressed profile
                {suppressedProfiles === 1 ? "" : "s"} match this audience and channel
                mix, and each is removed from every segment export: {removals} removal
                {removals === 1 ? "" : "s"} applied across {rows.length} segment
                {rows.length === 1 ? "" : "s"}. Suppression is absolute: no approval,
                campaign, or channel connector can re-include a suppressed profile.
                {withheld.length > 0 && (
                  <>
                    {" "}
                    {withheld.length} segment{withheld.length === 1 ? "" : "s"} (
                    {withheld.map((r) => r.segment.id).join(", ")}) hand
                    {withheld.length === 1 ? "s" : ""} off nobody — no consent record on
                    these channels, and absence of consent is never read as consent.
                  </>
                )}{" "}
                {canOpenAudiences ? (
                  <Link
                    to="/audiences"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    View consent &amp; suppression
                  </Link>
                ) : (
                  <span className="font-medium">
                    Consent &amp; suppression is managed on the audiences page.
                  </span>
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* FR-CO-11 · Assembled-output validation                               */
/* ------------------------------------------------------------------ */

interface ValidationRun {
  result: AIReviewResult;
  /** The exact assembled string the engine scanned. */
  scanned: string;
  versionId: string;
  channelKind: ChannelKind;
  ranAt: string;
}

const severityTone: Record<"pass" | "warn" | "block", string> = {
  pass: "bg-success/10 text-success border-success/20",
  warn: "bg-warning/10 text-warning border-warning/20",
  block: "bg-destructive/10 text-destructive border-destructive/20",
};

function SeverityChip({
  severity,
  children,
}: {
  severity: "pass" | "warn" | "block";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        severityTone[severity],
      )}
    >
      {children}
    </span>
  );
}

export default function JourneysChannels() {
  const db = useLiveDB();
  const { brandId, businessUnitId, regionId } = useScope();
  const scope = { brandId, businessUnitId, regionId };
  const { role } = useRole();
  const canManage = JOURNEY_MANAGER_ROLES.includes(role);

  const journeys = useCollection<Journey>("journeys", getSeedDB().journeys);
  // Same collection id the governance crisis freeze writes to — a push here and
  // a freeze there move the same records.
  const channelExecutions = useCollection<ChannelExecution>(
    "channelExecutions",
    getSeedDB().channelExecutions,
  );

  // The send ledger — what has actually been pushed, per audience and channel.
  // It ships with no rows and is not meant to: the frequency cap is counted
  // over delivery history the graph already records PLUS anything pushed in
  // this session, so the cap is right on first load rather than pretending
  // every audience is untouched until someone clicks something.
  const sendLedger = useCollection<SendLedgerEntry>(SEND_LEDGER_COLLECTION, NO_LEDGER_SEED);
  const ledger = useMemo(
    () => mergeSendLedger(openingSendLedger(db), sendLedger.records),
    [db, sendLedger.records],
  );

  /** Acting identity — the named approver behind every push, recall and launch. */
  const actor = db.stakeholders.find((s) => s.role === role);
  const actorName = actor?.name ?? role;

  // Published journeys are immutable — a lineage is every version sharing a name.
  // The card grid shows only the latest version per lineage; older versions stay
  // in the collection, pinned to any members still flowing through them.
  const lineages = useMemo(() => {
    const byName = new Map<string, Journey[]>();
    for (const j of journeys.records) {
      const list = byName.get(j.name) ?? [];
      list.push(j);
      byName.set(j.name, list);
    }
    for (const list of byName.values()) list.sort((a, b) => b.version - a.version);
    return byName;
  }, [journeys.records]);

  const latestJourneys = useMemo(
    () =>
      [...lineages.values()]
        .map((list) => list[0])
        .sort((a, b) => {
          const aMin = lineages.get(a.name)?.at(-1)?.id ?? a.id;
          const bMin = lineages.get(b.name)?.at(-1)?.id ?? b.id;
          return aMin.localeCompare(bMin, DEFAULT_LOCALE);
        }),
    [lineages],
  );

  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingWaits, setEditingWaits] = useState(false);
  const [waitDrafts, setWaitDrafts] = useState<Record<string, number>>({});

  const regionCode = (id: string): string =>
    db.regions.find((r) => r.id === id)?.code ?? id;
  const ownerName = (id: string): string =>
    db.stakeholders.find((s) => s.id === id)?.name ?? id;
  const audienceName = (id: string): string =>
    db.audiences.find((a) => a.id === id)?.name ?? id;

  // ABAC: Restricted subjects mask everywhere else, and most of the roles that
  // reach this page (Campaign Manager, Internal Comms Manager, PR Manager) are
  // exactly the ones the masking rule excludes — so every surface on this page
  // that renders a subject goes through `subjectOf`, canvas included.
  const canReadRestricted = (
    ["Corporate Comms Manager", "CMO", "Executive", "Platform Admin"] as readonly string[]
  ).includes(role);
  const subjectOf = (c: { subject: string; classification: string }): string =>
    c.classification === "Restricted" && !canReadRestricted
      ? "Restricted communication"
      : c.subject;

  // Executions per channel — counted over the SAME scoped rows the delivery
  // pipeline below renders, so the card and the table can never disagree.
  const executionCount = (channelId: string): number =>
    deliveries.filter((d) => d.channel.id === channelId).length;

  // Scope filtering: execution -> communication -> campaign activity -> campaign.
  // Communications without a campaign activity (pure corporate/internal sends)
  // have no brand/BU/region binding, so they stay visible in every scope.
  const scopedCampaignIds = new Set(campaignsInScope(db, scope).map((c) => c.id));
  const scopedActivityIds = new Set(
    db.campaignActivities
      .filter((a) => scopedCampaignIds.has(a.campaignId))
      .map((a) => a.id),
  );
  const communicationInScope = (com: Communication): boolean =>
    !com.campaignActivityId || scopedActivityIds.has(com.campaignActivityId);

  const effectiveJourneyId = selectedJourneyId ?? latestJourneys[0]?.id ?? null;
  const selectedJourney =
    journeys.records.find((j) => j.id === effectiveJourneyId) ?? null;
  const selectedVersions = selectedJourney
    ? lineages.get(selectedJourney.name) ?? []
    : [];
  const selectedNode: JourneyNode | null =
    selectedJourney?.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedCommunication: Communication | null =
    selectedNode?.type === "send" && selectedNode.config?.communicationId
      ? db.communications.find((c) => c.id === selectedNode.config?.communicationId) ?? null
      : null;

  const waitNodes = selectedJourney?.nodes.filter((n) => n.type === "wait") ?? [];

  const selectJourney = (id: string) => {
    setSelectedJourneyId(id);
    setSelectedNodeId(null);
    setEditingWaits(false);
    setWaitDrafts({});
  };

  /* ------------------------------------------------------------ */
  /* Lifecycle transitions (Draft→Active, Active⇄Paused)            */
  /* ------------------------------------------------------------ */

  const transition = (journey: Journey, next: Journey["status"], verb: string): void => {
    journeys.updateIn(journey.id, {
      status: next,
      updatedAt: new Date().toISOString(),
    });
    toast.success(`${journey.name} ${verb}`, {
      description: `${journey.id} · v${journey.version} · now ${next}`,
    });
  };

  /* ------------------------------------------------------------ */
  /* Edit waits → publish a new immutable version                   */
  /* ------------------------------------------------------------ */

  const startEditWaits = (): void => {
    if (!selectedJourney) return;
    const drafts: Record<string, number> = {};
    for (const n of waitNodes) drafts[n.id] = n.config?.waitDays ?? 0;
    setWaitDrafts(drafts);
    setEditingWaits(true);
  };

  const cancelEditWaits = (): void => {
    setEditingWaits(false);
    setWaitDrafts({});
  };

  /**
   * Publishing never mutates the prior record — it snapshots the journey with
   * the edited waits as a NEW Journey row with version + 1. Members already in
   * flight finish on the version they entered on (append-only history, same
   * pattern as the workflow designer).
   */
  const publishWaitEdits = (): void => {
    if (!selectedJourney) return;
    const now = new Date().toISOString();
    const nextVersion = (selectedVersions[0]?.version ?? selectedJourney.version) + 1;
    const newId = `JRN-${String(maxIdNumber(journeys.records, "JRN-") + 1).padStart(3, "0")}`;

    const nodes = selectedJourney.nodes.map((n) => {
      if (n.type !== "wait" || waitDrafts[n.id] === undefined) return n;
      const days = waitDrafts[n.id];
      // Keep auto-generated "Wait N days" labels in sync with the config.
      const label = /^Wait \d+ days?$/.test(n.label)
        ? `Wait ${days} day${days === 1 ? "" : "s"}`
        : n.label;
      return { ...n, label, config: { ...n.config, waitDays: days } };
    });

    journeys.createIn({
      id: newId,
      name: selectedJourney.name,
      audienceId: selectedJourney.audienceId,
      status: selectedJourney.status,
      version: nextVersion,
      nodes,
      edges: selectedJourney.edges,
      createdAt: now,
      updatedAt: now,
    });

    setSelectedJourneyId(newId);
    setSelectedNodeId(null);
    setEditingWaits(false);
    setWaitDrafts({});
    toast.success(`Published v${nextVersion} — members in flight finish on their pinned version`, {
      description: `${selectedJourney.name} · ${newId}`,
    });
  };

  // While editing, the canvas previews the draft waits without touching the record.
  const canvasJourney: Journey | null =
    selectedJourney && editingWaits
      ? {
          ...selectedJourney,
          nodes: selectedJourney.nodes.map((n) =>
            n.type === "wait" && waitDrafts[n.id] !== undefined
              ? { ...n, config: { ...n.config, waitDays: waitDrafts[n.id] } }
              : n,
          ),
        }
      : selectedJourney;

  const deliveries: DeliveryRow[] = db.channelExecutions
    .flatMap((execution) => {
      const communication = db.communications.find(
        (c) => c.id === execution.communicationId,
      );
      const channel = db.channels.find((c) => c.id === execution.channelId);
      if (!communication || !channel || !communicationInScope(communication)) {
        return [];
      }
      const gate = evaluateSendGate(db, execution, communication, ledger);
      return [{ execution, communication, channel, gate, blockers: gate.blockers }];
    })
    .sort((a, b) =>
      (a.execution.scheduledAt ?? "9999").localeCompare(b.execution.scheduledAt ?? "9999", DEFAULT_LOCALE),
    );

  /* ------------------------------------------------------------ */
  /* FR-CO-01 · Brief → execution tasks                            */
  /* ------------------------------------------------------------ */

  const scopedCampaigns = campaignsInScope(db, scope)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE));

  const [taskCampaignId, setTaskCampaignId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, ExecutionTask[]>>({});

  const selectedCampaign =
    scopedCampaigns.find((c) => c.id === taskCampaignId) ?? scopedCampaigns[0] ?? null;
  const campaignBrief = selectedCampaign
    ? deriveExecutionTasks(db, selectedCampaign).brief
    : null;
  const plan = selectedCampaign ? plans[selectedCampaign.id] : undefined;

  const generateTasks = (): void => {
    if (!selectedCampaign) return;
    const { brief, tasks } = deriveExecutionTasks(db, selectedCampaign);
    if (!brief) {
      toast.error(`${selectedCampaign.name} has no brief — nothing to derive tasks from`);
      return;
    }
    setPlans((prev) => ({ ...prev, [selectedCampaign.id]: tasks }));
    toast.success(`${tasks.length} execution tasks derived from ${brief.id}`, {
      description:
        brief.status === "Approved"
          ? `${brief.title} · approved brief · ${selectedCampaign.name}`
          : `${brief.title} · brief is ${brief.status} — plan is provisional until it is approved`,
    });
  };

  /* ------------------------------------------------------------ */
  /* FR-CO-02..05 · Push as draft · FR-CO-09 · Recall              */
  /* ------------------------------------------------------------ */

  const pushDraft = (row: DeliveryRow): void => {
    // Re-run the gate at click time rather than trusting the rendered row: the
    // frequency cap counts pushes made in this session, so two clicks in quick
    // succession must be judged against the ledger as it is now, not as it was
    // when the table last rendered.
    const gate = evaluateSendGate(db, row.execution, row.communication, ledger);
    if (!gate.allowed) {
      toast.error(`${row.channel.name} — blocked before send`, {
        description: gate.blockers.join(" · "),
      });
      return;
    }

    channelExecutions.updateIn(row.execution.id, {
      status: "queued",
      updatedAt: new Date().toISOString(),
    });

    // The ledger line is what makes the cap real. It records the contact — the
    // audience, the channel kind, the recipient count the gate let through and
    // who authorised it — so a later recall cannot un-count a contact that has
    // already happened.
    const entry = ledgerEntryForPush(
      db,
      row.execution,
      row.communication,
      gate.recipients,
      actorName,
    );
    if (entry) sendLedger.createIn(entry);

    const reductions = gate.reductions.map((r) => r.reason).join(" · ");
    toast.success(`${row.channel.name} — draft created, awaiting launch in the channel tool`, {
      description: `${row.channel.adapterKey} · ${row.execution.id} · ${fmtCompact(gate.recipients)} addressable after consent & suppression · ${actorName} must authorise launch${reductions ? ` · ${reductions}` : ""}`,
    });
  };

  const recallDraft = (row: DeliveryRow): void => {
    const now = new Date().toISOString();
    channelExecutions.updateIn(row.execution.id, { status: "draft", updatedAt: now });
    toast.warning(`${row.channel.name} — draft recalled, nothing was published`, {
      description: `${row.execution.id} · ${row.execution.status} → draft · audit-logged to ${actorName} at ${new Date(now).toLocaleTimeString("en-US")}`,
    });
  };

  /* ------------------------------------------------------------ */
  /* FR-CO-11 · Validate assembled output                          */
  /* ------------------------------------------------------------ */

  const [validations, setValidations] = useState<Record<string, ValidationRun>>({});

  /** Brand guardrails plus every block-enforcement policy (as on content detail). */
  const reviewPolicies = (brandGuardrailIds: string[] | undefined): Policy[] => {
    const ids = new Set<string>(brandGuardrailIds ?? []);
    for (const p of db.policies) if (p.enforcement === "block") ids.add(p.id);
    return db.policies.filter((p) => ids.has(p.id));
  };

  const campaignForCommunication = (communication: Communication): Campaign | undefined => {
    const activity = communication.campaignActivityId
      ? db.campaignActivities.find((a) => a.id === communication.campaignActivityId)
      : undefined;
    return activity ? db.campaigns.find((c) => c.id === activity.campaignId) : undefined;
  };

  const validateAssembled = (row: DeliveryRow): void => {
    const version = row.execution.contentVersionId
      ? db.contentVersions.find((v) => v.id === row.execution.contentVersionId)
      : undefined;
    if (!version) {
      toast.error(`${row.execution.id} has no bound content version to assemble`);
      return;
    }
    const content = db.contents.find((c) => c.id === version.contentId);
    const brand = content ? db.brands.find((b) => b.id === content.brandId) : undefined;
    if (!content || !brand) {
      toast.error(`${row.execution.id} cannot resolve its brand — validation not run`);
      return;
    }
    const campaign = campaignForCommunication(row.communication);
    const regionCodes = campaign
      ? campaign.regionIds
          .map((rid) => db.regions.find((r) => r.id === rid)?.code)
          .filter((c): c is string => Boolean(c))
      : undefined;
    // The assembled output is what the channel will actually render: the
    // communication's subject line over the bound version's body.
    const scanned = `${row.communication.subject}\n${version.body}`;
    const result = aiService.reviewContent(
      {
        title: row.communication.subject,
        body: version.body,
        brand,
        classification: row.communication.classification,
        regionCodes,
        regionIds: campaign?.regionIds,
        locale: version.locale,
        channelKind: row.channel.channelKind,
        campaignStartDate: campaign?.startDate,
        reviewDate: new Date().toISOString().slice(0, 10),
      },
      reviewPolicies(brand.guardrailPolicyIds),
      { db },
    );
    setValidations((prev) => ({
      ...prev,
      [row.execution.id]: {
        result,
        scanned,
        versionId: version.id,
        channelKind: row.channel.channelKind,
        ranAt: new Date().toISOString(),
      },
    }));
    const blocks = result.findings.filter((f) => f.severity === "block").length;
    const warns = result.findings.filter((f) => f.severity === "warn").length;
    if (result.overallSeverity === "block") {
      toast.error(`${row.channel.name} render blocked — ${blocks} block, ${warns} warn`, {
        description: `${version.id} assembled for ${row.channel.channelKind} · launch held until the blocking findings clear`,
      });
    } else {
      toast.success(
        `${row.channel.name} render ${result.overallSeverity === "pass" ? "passed" : `passed with ${warns} warn`}`,
        { description: `${version.id} assembled for ${row.channel.channelKind}` },
      );
    }
  };

  /* ------------------------------------------------------------ */
  /* FR-CO-10 · Segment handoff manifests                          */
  /* ------------------------------------------------------------ */

  /** Audiences + channel kinds a campaign's communications actually touch. */
  const campaignHandoff = useMemo(() => {
    if (!selectedCampaign) return null;
    const activityIds = db.campaignActivities
      .filter((a) => a.campaignId === selectedCampaign.id)
      .map((a) => a.id);
    const comms = db.communications.filter(
      (c) => c.campaignActivityId && activityIds.includes(c.campaignActivityId),
    );
    const audienceIds = [...new Set(comms.map((c) => c.audienceId))];
    const kinds = [
      ...new Set(
        db.campaignActivities
          .filter((a) => a.campaignId === selectedCampaign.id)
          .map((a) => db.channels.find((c) => c.id === a.channelId)?.channelKind)
          .filter((k): k is ChannelKind => Boolean(k)),
      ),
    ];
    return { audienceIds, kinds, rows: buildHandoff(db, audienceIds, kinds) };
  }, [db, selectedCampaign]);

  /** The same manifest for the selected journey, on the kinds its sends use. */
  const journeyHandoff = useMemo(() => {
    if (!selectedJourney) return null;
    const commIds = selectedJourney.nodes
      .filter((n) => n.type === "send" && n.config?.communicationId)
      .map((n) => n.config?.communicationId as string);
    const kinds = [
      ...new Set(
        db.channelExecutions
          .filter((x) => commIds.includes(x.communicationId))
          .map((x) => db.channels.find((c) => c.id === x.channelId)?.channelKind)
          .filter((k): k is ChannelKind => Boolean(k)),
      ),
    ];
    return {
      kinds,
      rows: buildHandoff(db, [selectedJourney.audienceId], kinds),
    };
  }, [db, selectedJourney]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Journeys & channels"
        description="Registered delivery channels and the executions flowing through them"
      />

      {/* ------------------------------------------------------------ */}
      {/* Channel registry                                              */}
      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Channel registry</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {db.channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-medium">{channel.name}</CardTitle>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {channel.channelKind}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {channel.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Regions</span>
                    <span>{channel.regionIds.map(regionCode).join(", ")}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Owner</span>
                    <span>{ownerName(channel.ownerStakeholderId)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Executions</span>
                    <span className="tabular-nums">{executionCount(channel.id)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Brief → execution tasks (FR-CO-01)                            */}
      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Campaign orchestration
        </h2>
        {scopedCampaigns.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No campaigns in this scope"
            hint="Widen the brand, business unit, or region filters in the top bar to orchestrate a campaign."
          />
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Execution plan
                  </div>
                  <CardTitle className="text-base font-medium">
                    Brief → channel-specific execution tasks
                  </CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedCampaign?.id ?? ""}
                    onValueChange={(v) => setTaskCampaignId(v)}
                  >
                    <SelectTrigger className="h-9 w-64">
                      <SelectValue placeholder="Campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopedCampaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={generateTasks} disabled={!campaignBrief}>
                    <ListChecks className="mr-1 h-3.5 w-3.5" />
                    Generate execution tasks
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Approved briefs drive this — the plan is derived from the campaign's
                brief and its activities, and every task cites the record, channel
                adapter or channel constraint it came from. Nothing here is scheduled or
                sent; it is a work plan for the team.
              </p>
              {campaignBrief && campaignBrief.status !== "Approved" && (
                <p className="text-xs text-warning">
                  {campaignBrief.id} is {campaignBrief.status} — any plan derived now is
                  provisional and must be re-derived once the brief is approved.
                </p>
              )}
              {!campaignBrief && (
                <p className="text-xs text-warning">
                  {selectedCampaign?.name} has no brief — write and approve one before
                  execution tasks can be derived.
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!plan ? (
                <p className="text-sm text-muted-foreground">
                  No plan derived yet for {selectedCampaign?.name}.
                </p>
              ) : plan.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  The brief carries no activities to sequence.
                </p>
              ) : (
                <ol className="space-y-2">
                  {plan.map((task, i) => (
                    <li
                      key={task.id}
                      className="flex gap-3 rounded-md border border-border/60 bg-muted/20 p-3"
                    >
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{task.label}</span>
                          <Badge variant="outline" className="shrink-0">
                            {task.channelName}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{task.detail}</div>
                        <div className="text-xs text-muted-foreground">
                          {task.dependsOn.length === 0
                            ? "no dependencies — starts the plan"
                            : task.dependsOn
                                .map(
                                  (d) =>
                                    `after: ${plan.find((t) => t.id === d)?.label ?? d}`,
                                )
                                .join(" · ")}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        )}

        {/* -------------------------------- Segment handoff (FR-CO-10) */}
        {selectedCampaign && campaignHandoff && (
          <SegmentHandoff
            title={selectedCampaign.name}
            subtitle={`Audience segments handed to the channel platforms for this campaign. Consent binds on the tightest channel in the mix — ${campaignHandoff.kinds.length > 0 ? campaignHandoff.kinds.join(", ") : "no channel resolved"}.`}
            rows={campaignHandoff.rows}
            kinds={campaignHandoff.kinds}
          canOpenAudiences={canSeeNav(role, "audiences")}
            />
        )}
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Delivery pipeline                                             */}
      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Delivery pipeline</h2>
        {deliveries.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No channel executions in this scope"
            hint="Widen the brand, business unit, or region filters in the top bar to see more deliveries."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Communication</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    {/* Not "Blocked" any more: the gate also reports sends it
                        lets through at a reduced size. */}
                    <TableHead className="w-64">Pre-send gate</TableHead>
                    <TableHead className="w-52 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((row) => {
                    const { execution, communication, channel, blockers } = row;
                    const validation = validations[execution.id];
                    // Validation and recall are pre-launch actions — an execution
                    // that has already left the building is history, not a draft.
                    const preLaunch =
                      execution.status === "draft" ||
                      execution.status === "queued" ||
                      execution.status === "sending";
                    return (
                      <Fragment key={execution.id}>
                        <TableRow>
                          <TableCell>
                            <div className="font-medium">{subjectOf(communication)}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {execution.id}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {channel.name}
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {channel.adapterKey}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm tabular-nums">
                            {execution.scheduledAt ? fmtDate(execution.scheduledAt) : "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={execution.status} />
                          </TableCell>
                          <TableCell className="align-top">
                            {/* Only pre-launch rows get a verdict. The gate is a
                                PRE-send check: telling someone a delivered send
                                is over its frequency cap is noise at best, and
                                at worst reads as a retrospective judgement on a
                                message that has already landed. */}
                            {!preLaunch ? (
                              <span className="text-xs text-muted-foreground">
                                not re-run — already {execution.status}
                              </span>
                            ) : (
                            <div className="flex flex-col items-start gap-1">
                              {blockers.length === 0 && row.gate.reductions.length === 0 && (
                                <span className="text-xs text-muted-foreground">
                                  clear · {fmtCompact(row.gate.recipients)} addressable
                                </span>
                              )}
                              {blockers.map((reason) => (
                                <StatusBadge
                                  key={reason}
                                  status="Blocked"
                                  className="whitespace-normal text-left"
                                >
                                  {reason}
                                </StatusBadge>
                              ))}
                              {/* A reduction is not a block. Consent held back
                                  from some segments, or suppressed profiles
                                  removed, shrink the send rather than stop it —
                                  and go unread if they are not shown. */}
                              {row.gate.reductions.map((r) => (
                                <span
                                  key={r.reason}
                                  className="text-xs text-muted-foreground"
                                >
                                  {r.reason}
                                </span>
                              ))}
                            </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col items-stretch gap-1.5">
                              {preLaunch ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-auto justify-start whitespace-normal py-1.5 text-left"
                                  onClick={() => validateAssembled(row)}
                                  disabled={!execution.contentVersionId}
                                  title={
                                    execution.contentVersionId
                                      ? `Render the bound version as ${channel.channelKind} and run the brand & compliance rules over it`
                                      : "No content version bound to this execution"
                                  }
                                >
                                  <ScanSearch className="mr-1 h-3.5 w-3.5 shrink-0" />
                                  Validate assembled output
                                </Button>
                              ) : (
                                <span className="text-right text-xs text-muted-foreground">
                                  {execution.status === "sent"
                                    ? "delivered — nothing left to authorise"
                                    : "no pre-launch action available"}
                                </span>
                              )}
                              {canManage && execution.status === "draft" && (
                                <Button
                                  size="sm"
                                  className="h-auto justify-start whitespace-normal py-1.5 text-left"
                                  onClick={() => pushDraft(row)}
                                  disabled={blockers.length > 0}
                                  title={
                                    blockers.length > 0
                                      ? `Blocked: ${blockers.join("; ")}`
                                      : `Create an unpublished draft on ${channel.name}`
                                  }
                                >
                                  <Send className="mr-1 h-3.5 w-3.5" />
                                  Push as draft to {channel.name}
                                </Button>
                              )}
                              {canManage &&
                                (execution.status === "queued" ||
                                  execution.status === "sending") && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-auto justify-start whitespace-normal py-1.5 text-left"
                                    onClick={() => recallDraft(row)}
                                  >
                                    <Undo2 className="mr-1 h-3.5 w-3.5" />
                                    Recall draft
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {validation && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/20">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Assembled {validation.channelKind} output ·{" "}
                                    {validation.versionId}
                                  </span>
                                  {(["pass", "warn", "block"] as const).map((sev) => (
                                    <SeverityChip key={sev} severity={sev}>
                                      {
                                        validation.result.findings.filter(
                                          (f) => f.severity === sev,
                                        ).length
                                      }{" "}
                                      {sev}
                                    </SeverityChip>
                                  ))}
                                  <span className="text-xs text-muted-foreground">
                                    {validation.result.overallSeverity === "block"
                                      ? "launch held — blocking findings must clear first"
                                      : validation.result.overallSeverity === "warn"
                                        ? "cleared to push as draft; warnings are for the reviewer"
                                        : "cleared to push as draft"}
                                  </span>
                                </div>
                                <ul className="space-y-1">
                                  {validation.result.findings
                                    .filter((f) => f.severity !== "pass")
                                    .slice(0, 6)
                                    .map((f, i) => (
                                      <li
                                        key={`${f.ruleId}-${i}`}
                                        className="flex flex-wrap items-center gap-2 text-xs"
                                      >
                                        <SeverityChip severity={f.severity}>
                                          {f.severity}
                                        </SeverityChip>
                                        <span>{f.message}</span>
                                        <span className="text-muted-foreground">
                                          {f.ruleId}
                                          {f.policyId ? ` · ${f.policyId}` : ""}
                                        </span>
                                      </li>
                                    ))}
                                  {validation.result.findings.every(
                                    (f) => f.severity === "pass",
                                  ) && (
                                    <li className="text-xs text-muted-foreground">
                                      Every rule group that ran on this channel passed —{" "}
                                      {validation.result.findings.length} checks over{" "}
                                      {validation.scanned.length} rendered characters.
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          Content is pushed as an unpublished draft. Launch is authorised by a named approver in the channel platform itself — this module never publishes.
          Blocked rows cannot be pushed — the reason is named on the row and clears when
          the underlying record moves.
        </p>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Journeys                                                      */}
      {/* ------------------------------------------------------------ */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Journeys</h2>
        {latestJourneys.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No journeys defined"
            hint="Multi-step journeys will appear here once orchestration flows are created."
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* The journey NAME is a link to the journey's own page — keyboard
                  reachable, cmd-clickable, bookmarkable. The card itself is not
                  a click target: selecting a journey into the workbench below
                  (lifecycle controls, wait editing, handoff manifest) is a
                  separate, explicitly labelled button, because "read this
                  record" and "load it into the editor" are different acts. */}
              {latestJourneys.map((journey) => (
                <Card
                  key={journey.id}
                  className={
                    journey.id === effectiveJourneyId
                      ? "border-primary ring-1 ring-primary transition-colors"
                      : "transition-colors hover:border-primary/50"
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium">
                        <Link
                          to={`/journeys/${journey.id}`}
                          className="rounded-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {journey.name}
                        </Link>
                      </CardTitle>
                      <StatusBadge status={journey.status} entity="Journey" className="shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Audience</span>
                      <span className="truncate" title={audienceName(journey.audienceId)}>
                        {audienceName(journey.audienceId)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Nodes</span>
                      <span className="tabular-nums">{journey.nodes.length}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Version</span>
                      <span className="tabular-nums">v{journey.version}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={journey.id === effectiveJourneyId ? "secondary" : "outline"}
                      className="mt-2 w-full"
                      onClick={() => selectJourney(journey.id)}
                      aria-pressed={journey.id === effectiveJourneyId}
                    >
                      {journey.id === effectiveJourneyId
                        ? "Loaded below"
                        : "Load into workbench"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedJourney && (
              <>
                {/* -------------------------------- Lifecycle controls */}
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedJourney.status === "Draft" && (
                      <Button
                        size="sm"
                        onClick={() => transition(selectedJourney, "Active", "activated")}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        Activate
                      </Button>
                    )}
                    {selectedJourney.status === "Active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => transition(selectedJourney, "Paused", "paused")}
                      >
                        <Pause className="mr-1 h-3.5 w-3.5" />
                        Pause
                      </Button>
                    )}
                    {selectedJourney.status === "Paused" && (
                      <Button
                        size="sm"
                        onClick={() => transition(selectedJourney, "Active", "resumed")}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" />
                        Resume
                      </Button>
                    )}
                    {waitNodes.length > 0 &&
                      (editingWaits ? (
                        <>
                          <Button size="sm" variant="outline" onClick={cancelEditWaits}>
                            <X className="mr-1 h-3.5 w-3.5" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={publishWaitEdits}>
                            <Save className="mr-1 h-3.5 w-3.5" />
                            Publish v{(selectedVersions[0]?.version ?? selectedJourney.version) + 1}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={startEditWaits}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit waits
                        </Button>
                      ))}
                  </div>
                )}

                {/* -------------------------------- Version history line */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <History className="h-3.5 w-3.5" />
                    Version history
                  </span>
                  {/* The strip lists the version records this workspace holds.
                      A journey published at v3 whose v1 and v2 records are not
                      in the collection would otherwise show a single badge
                      under a "Version history" heading and read as if the
                      history had been lost — so say how many of them are on
                      file. */}
                  {selectedVersions.length < (selectedVersions[0]?.version ?? 0) && (
                    <span className="tabular-nums">
                      {selectedVersions.length} of {selectedVersions[0]?.version} versions
                      on file
                    </span>
                  )}
                  {selectedVersions.map((v, i) => (
                    <span key={v.id} className="inline-flex items-center gap-1.5">
                      <Badge
                        variant={i === 0 ? "default" : "secondary"}
                        className="h-5 px-1.5 text-[10px] font-normal"
                      >
                        v{v.version}
                      </Badge>
                      <span>{v.id}</span>
                      <span>published {fmtDate(v.createdAt)}</span>
                      <span>
                        {i === 0
                          ? "· current — new entrants use this version"
                          : "· pinned to members in flight"}
                      </span>
                    </span>
                  ))}
                </div>

                <div className="flex flex-col gap-4 lg:flex-row">
                  {canvasJourney && (
                    <JourneyCanvas
                      className="min-w-0 flex-1"
                      journey={canvasJourney}
                      selectedNodeId={selectedNodeId}
                      onNodeSelect={(node) =>
                        setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                      }
                      resolveCommunication={(id) => {
                        const c = db.communications.find((x) => x.id === id);
                        return c ? subjectOf(c) : undefined;
                      }}
                      resolveSegment={(id) => db.segments.find((s) => s.id === id)?.name}
                    />
                  )}

                  {editingWaits ? (
                    <Card className="shrink-0 lg:w-80">
                      <CardHeader className="pb-2">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Edit waits
                        </div>
                        <CardTitle className="text-base font-medium">
                          Wait durations
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Saving publishes v
                          {(selectedVersions[0]?.version ?? selectedJourney.version) + 1} —
                          the current version stays untouched for members in flight.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {waitNodes.map((n) => (
                          <div key={n.id}>
                            <Label
                              htmlFor={`wait-${n.id}`}
                              className="text-[10px] text-muted-foreground"
                            >
                              {n.label} ({n.id})
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`wait-${n.id}`}
                                type="number"
                                min={0}
                                className="h-8 text-sm"
                                value={waitDrafts[n.id] ?? n.config?.waitDays ?? 0}
                                onChange={(e) =>
                                  setWaitDrafts((d) => ({
                                    ...d,
                                    [n.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                  }))
                                }
                              />
                              <span className="text-xs text-muted-foreground">days</span>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    selectedCommunication && (
                      <Card className="shrink-0 lg:w-80">
                        <CardHeader className="pb-2">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Referenced communication
                          </div>
                          <CardTitle className="text-base font-medium">
                            {subjectOf(selectedCommunication)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Status</span>
                            <StatusBadge status={selectedCommunication.status} />
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Type</span>
                            <span className="capitalize">{selectedCommunication.commsType}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Classification</span>
                            <span>{selectedCommunication.classification}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Audience</span>
                            <span
                              className="truncate"
                              title={audienceName(selectedCommunication.audienceId)}
                            >
                              {audienceName(selectedCommunication.audienceId)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Scheduled</span>
                            <span className="tabular-nums">
                              {selectedCommunication.scheduledAt
                                ? fmtDate(selectedCommunication.scheduledAt)
                                : "—"}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Owner</span>
                            <span
                              className="truncate"
                              title={ownerName(selectedCommunication.ownerStakeholderId)}
                            >
                              {ownerName(selectedCommunication.ownerStakeholderId)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                {/* ---------------------------- Segment handoff (FR-CO-10) */}
                {journeyHandoff && (
                  <SegmentHandoff
                    title={`${selectedJourney.name} → ${audienceName(selectedJourney.audienceId)}`}
                    subtitle={`Segments handed to the channel platforms when a member enters this journey. Consent binds on the tightest channel its sends use — ${journeyHandoff.kinds.length > 0 ? journeyHandoff.kinds.join(", ") : "no channel resolved from the send nodes"}.`}
                    rows={journeyHandoff.rows}
                    kinds={journeyHandoff.kinds}
                  canOpenAudiences={canSeeNav(role, "audiences")}
            />
                )}
              </>
            )}

            {/* -------------------------------- Suppression guardrail */}
            <Card className="border-dashed">
              <CardContent className="flex items-start gap-3 p-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  The pre-send gate reads six things before a draft can be
                  pushed: a paused communication, content or comms in rework, an
                  undecided approval, the consent summary for every segment of
                  the target audience on the sending channel, the suppression
                  list, and a frequency cap of {FREQUENCY_CAP_PER_WINDOW} sends
                  per audience per channel in a rolling {FREQUENCY_WINDOW_DAYS}{" "}
                  days, counted over a send ledger. A segment below{" "}
                  {MIN_CONSENT_PCT}% opted in is held back and the recorded
                  percentage is named; on email, SMS and ads a missing consent
                  record is treated the same way, because absence of consent is
                  not consent. Suppressed profiles are removed once from the
                  audience, org-wide entries included. Consent and suppression
                  shrink a send; a freeze, rework, an open approval, a fully
                  unconsented audience or a reached cap stop it.{" "}
                  {canSeeNav(role, "audiences") ? (
                    <Link
                      to="/audiences"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      View suppression &amp; consent
                    </Link>
                  ) : (
                    <span className="font-medium">
                      Suppression &amp; consent is managed on the audiences page.
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}
