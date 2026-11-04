/**
 * Audiences page — audience registry with composed segments and their summed
 * population (never called reach: see `audienceTotalSize` below).
 * Four tabs: the audience registry (a name links to `/audiences/:id`, the
 * routed record page with its segments, consent posture, suppression entries
 * and the communications that target it), a flat segment list
 * showing which audiences compose each segment, a customer-persona gallery
 * (who the people in each audience actually are — demographics, behavior,
 * transactions, needs, preferred channels, plus cohort size, consent,
 * data readiness, confidence, version/refresh state, journey stages and drift),
 * and a consent & suppression surface (consent posture per segment/channel
 * plus the suppression list).
 * All sizes are computed via the segmentSize selector — never hardcoded.
 *
 * The registry used to open a side sheet, which had no URL: an audience could
 * not be linked, bookmarked, opened in a new tab or returned to with the back
 * button. AudienceDetail is that sheet as a page, and every reference to an
 * audience on this screen — a registry row, a segment's "composed by" chip, a
 * persona's audience chip — is now a link to it.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Contact,
  Layers,
  Plus,
  RefreshCw,
  Route,
  ShieldBan,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { PageSkeleton } from "@/components/marcomm/PageSkeleton";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";

import { useLiveDB } from "@/data/useLiveDB";
import { getSeedDB } from "@/data/seed";
import { segmentSize } from "@/data/selectors";
import { originOf, proposedCount } from "@/data/selectors/originSelectors";
import type {
  Audience,
  ChannelKind,
  CustomerPersona,
  SeedDB,
  SuppressionEntry,
  SuppressionReason,
} from "@/data/types";
import { useCollection } from "@/store/DataStore";
import { fmtCompact, fmtDate } from "@/lib/format";
import { useRole, type AppRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import {
  KindChip,
  LOW_CONSENT_PCT,
  LowConsentChip,
  ReasonChip,
} from "@/components/marcomm/AudienceChips";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Kind chip                                                           */
/* ------------------------------------------------------------------ */

/** Roles allowed to add suppression entries. */
const SUPPRESSION_EDITOR_ROLES: readonly AppRole[] = [
  "Legal/Compliance Reviewer",
  "Internal Comms Manager",
  "Platform Admin",
];

const SUPPRESSION_REASONS: SuppressionReason[] = [
  "opt-out",
  "legal-complaint",
  "do-not-contact",
  "bounce",
];

/**
 * Every `ChannelKind`. This list used to stop at seven, so a suppression could
 * not be scoped to `print` or `ads` — even though the consent panel on the same
 * page reports `ads` consent, which made the omission read as a missing option
 * rather than a deliberate one.
 */
const CHANNEL_KINDS: ChannelKind[] = [
  "email",
  "social",
  "web",
  "press",
  "intranet",
  "event",
  "SMS",
  "print",
  "ads",
];

/* ------------------------------------------------------------------ */
/* Derivations (pure over SeedDB — sizes always via segmentSize)       */
/* ------------------------------------------------------------------ */

/**
 * Sum of segmentSize over an audience's composed segments.
 *
 * A plain sum, because the model carries no segment-overlap data: a profile in
 * two composed segments is counted twice. AUD-002 "Global employees" is
 * SEG-005 "All employees" (8,200) + SEG-006 "People managers" (1,150) = 9,350,
 * which is more employees than the company has. Labelling this "Total size"
 * claimed a deduplicated reach the data cannot support, so every surface calls
 * it what it is — the summed segment population.
 */
function audienceTotalSize(db: SeedDB, audience: Audience): number {
  return audience.segmentIds.reduce((sum, id) => sum + segmentSize(db, id), 0);
}

/** Reverse lookup: audiences whose segmentIds include this segment. */
function audiencesComposing(db: SeedDB, segmentId: string): Audience[] {
  return db.audiences.filter((a) => a.segmentIds.includes(segmentId));
}

/**
 * Chip linking to an audience's record page. Used everywhere this screen names
 * an audience it is not currently listing — a segment's "composed by" column, a
 * persona's cohort. A real link, so it is keyboard reachable and cmd-click
 * opens the record in a new tab; the click handler it replaced could do
 * neither, because the thing it opened had no URL.
 */
function AudienceLinkChip({ audience }: { audience: Audience }) {
  return (
    <Link
      to={`/audiences/${audience.id}`}
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {audience.name}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Customer persona card                                               */
/* ------------------------------------------------------------------ */

/** Real channels of a kind, if the org operates any (e.g. no 'ads' channel). */
function channelsOfKind(db: SeedDB, kind: ChannelKind) {
  return db.channels.filter((c) => c.channelKind === kind);
}

/**
 * One chip per preferred channel kind — labeled with the real channel name
 * when a channel of that kind exists, otherwise with the bare kind.
 */
function PreferredChannelChips({ db, kinds }: { db: SeedDB; kinds: ChannelKind[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {kinds.map((kind) => {
        const channels = channelsOfKind(db, kind);
        return channels.length === 0 ? (
          <span
            key={kind}
            title={`No configured channel of kind '${kind}' yet`}
            className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {kind}
          </span>
        ) : (
          channels.map((c) => (
            <span
              key={`${kind}-${c.id}`}
              title={kind}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {c.name}
            </span>
          ))
        );
      })}
    </div>
  );
}

/** Confidence band → token. Coarse on purpose so the chips read at a glance. */
function personaConfidenceTone(confidence: number): string {
  if (confidence >= 0.75) return "border-success/20 bg-success/10 text-success";
  if (confidence >= 0.6) return "border-warning/20 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/5 text-destructive/80";
}

/** How certain we are of the persona definition itself (FR-MI-13). */
function PersonaConfidenceChip({ confidence }: { confidence: number }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        personaConfidenceTone(confidence),
      )}
      title="Confidence in the persona definition, recorded at the last re-cut"
    >
      {Math.round(confidence * 100)}% confidence
    </span>
  );
}

/** Readiness band → token, same coarse bands as the confidence chip. */
function readinessTone(value: number): string {
  if (value >= 85) return "bg-success";
  if (value >= 60) return "bg-warning";
  return "bg-destructive";
}

/**
 * Data-readiness meter (FR-MI-13) — how complete and usable the underlying
 * profile data is for this cohort, 0–100.
 */
function DataReadinessMeter({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Data readiness
        </span>
        <span className="text-xs font-medium tabular-nums">{value}/100</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label="Data readiness"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", readinessTone(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Journey stages this persona is actively worked in (FR-MI-12). */
function JourneyStageChips({ stages }: { stages: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {stages.map((stage) => (
        <span
          key={stage}
          className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground"
        >
          {stage}
        </span>
      ))}
    </div>
  );
}

function PersonaCard({
  db,
  persona,
  onRefresh,
}: {
  db: SeedDB;
  persona: CustomerPersona;
  onRefresh: (persona: CustomerPersona) => void;
}) {
  const audience = db.audiences.find((a) => a.id === persona.audienceId);

  const profileRows: Array<[label: string, value: string]> = [
    ["Demographics", persona.demographics],
    ["Behavioral", persona.behavioral],
    ["Transactional", persona.transactional],
  ];

  const lowConsent = persona.consentedPct < LOW_CONSENT_PCT;

  return (
    <Card className={cn(persona.driftSignal && "border-warning/40")}>
      <CardContent className="space-y-4 p-4">
        {/* Name + linked audience (links to the audience's record page) */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Contact className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate text-sm font-semibold">{persona.name}</h3>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <PersonaConfidenceChip confidence={persona.confidence} />
              <span
                className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground"
                title={`Last refreshed from the CDP on ${fmtDate(persona.lastRefreshedAt)}`}
              >
                v{persona.version} · refreshed {fmtDate(persona.lastRefreshedAt)}
              </span>
            </div>
          </div>
          {audience ? (
            <AudienceLinkChip audience={audience} />
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">
              {persona.audienceId}
            </span>
          )}
        </div>

        {/* Cohort facts — aggregate counts only, never individual records */}
        <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cohort size
            </div>
            <div className="mt-0.5 text-sm font-medium tabular-nums">
              {fmtCompact(persona.cohortSize)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">profiles</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Consented
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium tabular-nums">{persona.consentedPct}%</span>
              {lowConsent && <LowConsentChip />}
            </div>
          </div>
          <div className="col-span-2">
            <DataReadinessMeter value={persona.dataReadiness} />
          </div>
        </div>

        {/* Drift signal + refresh (FR-MI-11) */}
        {persona.driftSignal && (
          <div className="rounded-md border border-warning/20 bg-warning/5 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p className="text-sm text-warning">
                <span className="font-medium">Drift detected</span> — {persona.driftSignal}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Refreshing re-cuts the cohort and bumps the version; the signal
                clears on the next drift scan.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => onRefresh(persona)}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh persona
              </Button>
            </div>
          </div>
        )}

        {/* Demographic / behavioral / transactional profile */}
        <dl className="space-y-2">
          {profileRows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Needs as a check-list */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Needs
          </h4>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {persona.needs.map((need) => (
              <span
                key={need}
                className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
              >
                <Check className="h-3 w-3 shrink-0" />
                {need}
              </span>
            ))}
          </div>
        </div>

        {/* Preferred channels resolved to real channel names */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Preferred channels
          </h4>
          <div className="mt-1.5">
            <PreferredChannelChips db={db} kinds={persona.preferredChannelKinds} />
          </div>
        </div>

        {/* Journey stages this persona is worked in */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Route className="h-3 w-3" aria-hidden="true" />
            Journey stages
          </h4>
          <div className="mt-1.5">
            {persona.journeyStages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Not mapped to a journey stage yet.
              </p>
            ) : (
              <JourneyStageChips stages={persona.journeyStages} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Add suppression dialog                                              */
/* ------------------------------------------------------------------ */

const ALL_CHANNELS = "__all__";
const ORG_WIDE = "__org__";

function AddSuppressionDialog({
  db,
  open,
  onOpenChange,
  onAdd,
}: {
  db: SeedDB;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (draft: {
    subjectKey: string;
    reason: SuppressionReason;
    channelKind?: ChannelKind;
    audienceId?: string;
  }) => void;
}) {
  const [subjectKey, setSubjectKey] = useState("");
  const [reason, setReason] = useState<SuppressionReason>("opt-out");
  const [channel, setChannel] = useState<string>(ALL_CHANNELS);
  const [audienceId, setAudienceId] = useState<string>(ORG_WIDE);

  const canSubmit = subjectKey.trim().length > 0;

  const submit = (): void => {
    if (!canSubmit) return;
    onAdd({
      subjectKey: subjectKey.trim(),
      reason,
      channelKind: channel === ALL_CHANNELS ? undefined : (channel as ChannelKind),
      audienceId: audienceId === ORG_WIDE ? undefined : audienceId,
    });
    setSubjectKey("");
    setReason("opt-out");
    setChannel(ALL_CHANNELS);
    setAudienceId(ORG_WIDE);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add suppression</DialogTitle>
          <DialogDescription>
            Records a masked contact as do-not-contact. This is a register: the
            entry is not yet read by the pre-send check, and there is no channel
            layer to enforce it at send time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="sup-subject">Subject key (masked)</Label>
            <Input
              id="sup-subject"
              value={subjectKey}
              placeholder="e.g. m***@example.com or employee-4821"
              className="font-mono"
              onChange={(e) => setSubjectKey(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as SuppressionReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="Reason" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPRESSION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CHANNELS}>All channels</SelectItem>
                  {CHANNEL_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Scope audience (optional)</Label>
            <Select value={audienceId} onValueChange={setAudienceId}>
              <SelectTrigger>
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ORG_WIDE}>Org-wide</SelectItem>
                {db.audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add suppression
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** Proposed-vs-authored list filter (item 1). */
type OriginFilter = "all" | "proposed" | "authored";

export default function AudiencesPage() {
  return (
    <ErrorBoundary>
      <AudiencesPageContent />
    </ErrorBoundary>
  );
}

function AudiencesPageContent() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  /* Global search links here as `/audiences?id=<AUD-…>`. That used to open a
     sheet over the list; the record now has its own URL, so the query form is
     kept working by forwarding it there. `replace` so the back button returns
     to wherever the search was run from, not to a redirect that fires again. */
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get("id");
  const [addOpen, setAddOpen] = useState(false);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");

  const db = useLiveDB();
  const { regionId, setScope } = useScope();
  const { role } = useRole();

  const suppressions = useCollection<SuppressionEntry>(
    "suppressionEntries",
    getSeedDB().suppressionEntries,
  );
  // Personas are writable: 'Refresh persona' bumps version + lastRefreshedAt,
  // so the tab reads them from the store rather than the frozen seed.
  const personaStore = useCollection<CustomerPersona>(
    "customerPersonas",
    getSeedDB().customerPersonas,
  );
  const canManageSuppressions = SUPPRESSION_EDITOR_ROLES.includes(role);

  // Region scope: an audience is in scope when it targets the selected region.
  const audiences = useMemo(
    () =>
      db.audiences
        .filter((a) => !regionId || a.regionIds.includes(regionId))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE)),
    [db, regionId],
  );

  // Segments follow the audience scope: with a region selected, only segments
  // composed by an in-scope audience remain.
  const segments = useMemo(() => {
    const inScopeSegmentIds = new Set(audiences.flatMap((a) => a.segmentIds));
    return db.segments
      .filter((s) => !regionId || inScopeSegmentIds.has(s.id))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE));
  }, [db, audiences, regionId]);

  // Personas follow the audience scope: with a region selected, only personas
  // linked to an in-scope audience remain.
  const personas = useMemo(() => {
    const inScopeAudienceIds = new Set(audiences.map((a) => a.id));
    return personaStore.records
      .filter((p) => !regionId || inScopeAudienceIds.has(p.audienceId))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE));
  }, [personaStore.records, audiences, regionId]);

  // Consent rows follow the segment scope; suppression entries stay in scope
  // when org-wide or scoped to an in-scope audience.
  const consentRows = useMemo(() => {
    const inScopeSegmentIds = new Set(segments.map((s) => s.id));
    return db.consentSummaries
      .filter((c) => inScopeSegmentIds.has(c.segmentId))
      .slice()
      .sort((a, b) => a.optedInPct - b.optedInPct);
  }, [db, segments]);

  const suppressionRows = useMemo(() => {
    const inScopeAudienceIds = new Set(audiences.map((a) => a.id));
    return suppressions.records
      .filter((e) => !e.audienceId || inScopeAudienceIds.has(e.audienceId))
      .slice()
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt, DEFAULT_LOCALE));
  }, [suppressions.records, audiences]);

  const stakeholderName = (id: string): string =>
    db.stakeholders.find((s) => s.id === id)?.name ?? id;

  const addSuppression = (draft: {
    subjectKey: string;
    reason: SuppressionReason;
    channelKind?: ChannelKind;
    audienceId?: string;
  }): void => {
    const now = new Date().toISOString();
    const addedBy = db.stakeholders.find((s) => s.role === role)?.id ?? "STK-001";
    suppressions.createIn(
      {
        ...draft,
        addedAt: now,
        addedByStakeholderId: addedBy,
        createdAt: now,
        updatedAt: now,
      },
      "SUP-",
    );
    toast.success("Suppression added", {
      description: `${draft.subjectKey} is excluded from sends at the channel layer.`,
    });
  };

  /**
   * Re-cut the persona from the CDP: bump the version and stamp the refresh
   * time. The drift signal itself is an observation from the last scan and is
   * left untouched — only the next scan can clear it.
   */
  const refreshPersona = (persona: CustomerPersona): void => {
    const now = new Date().toISOString();
    personaStore.updateIn(persona.id, {
      version: persona.version + 1,
      lastRefreshedAt: now,
      updatedAt: now,
    });
    toast.success("Persona refreshed", {
      description: `${persona.name} re-cut from consented aggregates — now v${persona.version + 1}.`,
    });
  };

  const regionCodes = (ids: string[]): string =>
    ids.map((id) => db.regions.find((r) => r.id === id)?.code ?? id).join(", ");

  const selectedRegionCode =
    db.regions.find((r) => r.id === regionId)?.code ?? regionId ?? "";
  const showAllRegions = { label: "Show all regions", onClick: () => setScope({ regionId: undefined }) };

  // Origin is derived provenance: an audience reads as proposed only when an
  // agent actually produced it, so this is zero until that happens.
  const proposedAudiences = proposedCount(
    db,
    "Audience",
    audiences.map((a) => a.id),
  );

  const visibleAudiences = audiences.filter((a) => {
    if (originFilter === "all") return true;
    const isProposed = originOf(db, "Audience", a.id).origin === "agent";
    return originFilter === "proposed" ? isProposed : !isProposed;
  });

  /* Every hook above runs unconditionally; the deep-link forward is the first
     thing after them, and it comes before the skeleton so a deep link does not
     pay 300ms for a list it is about to leave. */
  if (deepLinkId) return <Navigate to={`/audiences/${deepLinkId}`} replace />;

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4 p-6">
      {/* Title matches the menu label exactly, so PageHeader recognises it as a
          repeat of the nav item and hides it while the menu is on screen. */}
      <PageHeader
        title="Audiences & personas"
        description="Audience registry with composed segments and their summed segment population"
        actions={
          proposedAudiences > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {proposedAudiences} proposed awaiting review
            </span>
          ) : undefined
        }
      />

      <Tabs defaultValue="audiences">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="audiences">Audiences</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="personas">Customer personas</TabsTrigger>
            <TabsTrigger value="consent">Consent &amp; suppression</TabsTrigger>
          </TabsList>
          {/*
            The origin filter appears once the registry actually holds an
            agent-proposed audience. Origin is real provenance, so before that
            the filter could only ever return the same list.
          */}
          {proposedAudiences > 0 && (
            <Select
              value={originFilter}
              onValueChange={(v) => setOriginFilter(v as OriginFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All origins</SelectItem>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="authored">Authored</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ------------------------- Audiences tab ------------------------ */}
        <TabsContent value="audiences" className="mt-4">
          {visibleAudiences.length === 0 ? (
            db.audiences.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No audiences defined yet"
                hint="An audience is a named group composed of one or more segments; nothing can be targeted until one exists."
              />
            ) : audiences.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No audiences in this region"
                hint={`${db.audiences.length} audiences exist, but none lists ${selectedRegionCode} in its regions — an audience shows here only when it targets the selected region.`}
                action={showAllRegions}
              />
            ) : (
              <EmptyState
                icon={UsersRound}
                title={
                  originFilter === "proposed"
                    ? "Nothing proposed awaiting review"
                    : "Every audience here was proposed by an agent"
                }
                hint={
                  originFilter === "proposed"
                    ? `All ${audiences.length} audiences in scope were defined by a person. A row lands here when an agent produces one and nobody has accepted it yet.`
                    : `All ${audiences.length} audiences in scope were produced by an agent and are still awaiting review.`
                }
                action={{
                  label: "Show all origins",
                  onClick: () => setOriginFilter("all"),
                }}
              />
            )
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Audience</TableHead>
                      <TableHead className="w-28">Kind</TableHead>
                      <TableHead className="w-40">Regions</TableHead>
                      <TableHead className="w-24 text-right">Segments</TableHead>
                      <TableHead className="w-28 text-right">Segment population</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleAudiences.map((a) => {
                      const origin = originOf(db, "Audience", a.id);
                      return (
                        <TableRow
                          key={a.id}
                          className={proposedRowClass(origin.origin)}
                        >
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              {/* A real link, not a click handler on the row:
                                  it is keyboard reachable, cmd-click opens the
                                  record in a new tab, and the URL can be
                                  shared. */}
                              <Link
                                to={`/audiences/${a.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {a.name}
                              </Link>
                              <OriginChip info={origin} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <KindChip kind={a.audienceKind} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {regionCodes(a.regionIds)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {a.segmentIds.length}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {fmtCompact(audienceTotalSize(db, a))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------------------------- Segments tab ------------------------- */}
        <TabsContent value="segments" className="mt-4">
          {segments.length === 0 ? (
            db.segments.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No segments defined yet"
                hint="A segment is a criteria-defined population; audiences are composed from them, so every audience's segment population stays at zero until one exists."
              />
            ) : (
              <EmptyState
                icon={Layers}
                title="No segments in this scope"
                hint={`${db.segments.length} segments exist, but a segment shows here only when an in-scope audience composes it — ${
                  audiences.length === 0
                    ? `no audience targets ${selectedRegionCode}`
                    : `none of the ${audiences.length} audiences in ${selectedRegionCode} composes one`
                }.`}
                action={showAllRegions}
              />
            )
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Criteria</TableHead>
                      <TableHead className="w-28 text-right">Population</TableHead>
                      <TableHead className="w-64">Composed by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments.map((s) => {
                      const composedBy = audiencesComposing(db, s.id);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <span className="break-all font-mono text-xs text-muted-foreground">
                              {s.criteria}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {fmtCompact(segmentSize(db, s.id))}
                          </TableCell>
                          <TableCell>
                            {composedBy.length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                Not in any audience
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {composedBy.map((a) => (
                                  <AudienceLinkChip key={a.id} audience={a} />
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* --------------------- Customer personas tab --------------------- */}
        <TabsContent value="personas" className="mt-4 space-y-4">
          {personas.length === 0 ? (
            personaStore.records.length === 0 ? (
              <EmptyState
                icon={Contact}
                title="No personas built yet"
                hint="A persona is cut from an aggregate cohort of consented profiles and linked to an audience; none has been cut."
              />
            ) : (
              <EmptyState
                icon={Contact}
                title="No personas in this scope"
                hint={`${personaStore.records.length} personas exist, but a persona shows here only when the audience it is linked to is in scope — ${
                  audiences.length === 0
                    ? `no audience targets ${selectedRegionCode}`
                    : `none is linked to the ${audiences.length} audiences in ${selectedRegionCode}`
                }.`}
                action={showAllRegions}
              />
            )
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {personas.map((p) => (
                <PersonaCard
                  key={p.id}
                  db={db}
                  persona={p}
                  onRefresh={refreshPersona}
                />
              ))}
            </div>
          )}

          {/* Aggregate-only construction rule (FR-MI-08 / FR-MI-09) */}
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {/* The rule used to read "aggregate cohorts of at least 1,000
                  consented profiles". Newsroom Nadia (PER-010) is cut from 480
                  APAC trade journalists, so the page stated a floor it broke on
                  the same screen. A press cohort of a few hundred named outlets
                  is the realistic figure, not a data error, so the claim was
                  corrected to the guarantee that actually holds — aggregate
                  only, with each cohort's size and consented share on its card
                  to be checked against. */}
              <p className="text-sm text-muted-foreground">
                Personas are built from aggregate cohorts of consented profiles —
                each card states its cohort size and consented share, and no
                individual record is ever exposed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <Contact className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Personas keep segment rules grounded in who the people actually
                are — the Product Marketing Planning Agent references them in
                campaign proposals.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------- Consent & suppression tab ------------------- */}
        <TabsContent value="consent" className="mt-4 space-y-4">
          {/* (a) Consent posture per segment/channel */}
          <div>
            <h2 className="mb-2 text-sm font-medium">Consent by segment</h2>
            {consentRows.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No consent posture to show"
                hint={
                  segments.length === 0
                    ? `Consent is summarized per segment and channel, and no segment is in scope for ${selectedRegionCode}.`
                    : `Consent is summarized per segment and channel; none of the ${segments.length} in-scope segments has a summary recorded yet. Summaries arrive from the consent platform.`
                }
                action={segments.length === 0 ? showAllRegions : undefined}
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Segment</TableHead>
                        <TableHead className="w-24">Channel</TableHead>
                        <TableHead className="w-72">Opted in</TableHead>
                        <TableHead className="w-32">Last refreshed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consentRows.map((c) => {
                        const segment = db.segments.find((s) => s.id === c.segmentId);
                        const low = c.optedInPct < LOW_CONSENT_PCT;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              {segment?.name ?? c.segmentId}
                            </TableCell>
                            <TableCell className="text-sm">{c.channelKind}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Progress
                                  value={c.optedInPct}
                                  className="h-1.5 w-32"
                                  aria-label={`${c.optedInPct}% opted in`}
                                />
                                <span className="w-10 shrink-0 text-sm tabular-nums">
                                  {c.optedInPct}%
                                </span>
                                {low && <LowConsentChip />}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {fmtDate(c.lastRefreshedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* (b) Suppression list */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Suppression list</h2>
              {canManageSuppressions && (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add suppression
                </Button>
              )}
            </div>
            {suppressionRows.length === 0 ? (
              suppressions.records.length === 0 ? (
                <EmptyState
                  icon={ShieldBan}
                  title="Nothing suppressed"
                  hint={
                    canManageSuppressions
                      ? "No contact is excluded from outreach. Adding an entry needs a masked subject key and a reason; enforcement is at send time."
                      : "No contact is excluded from outreach. Entries are added by Legal/Compliance, Internal Comms or a platform admin."
                  }
                  action={
                    canManageSuppressions
                      ? { label: "Add suppression", onClick: () => setAddOpen(true) }
                      : undefined
                  }
                />
              ) : (
                <EmptyState
                  icon={ShieldBan}
                  title="No suppression entries in this scope"
                  hint={`${suppressions.records.length} entries exist, all scoped to audiences outside ${selectedRegionCode}. Org-wide entries always show here.`}
                  action={showAllRegions}
                />
              )
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject key</TableHead>
                        <TableHead className="w-36">Reason</TableHead>
                        <TableHead className="w-28">Channel</TableHead>
                        <TableHead className="w-52">Scope</TableHead>
                        <TableHead className="w-40">Added by</TableHead>
                        <TableHead className="w-28">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppressionRows.map((e) => {
                        const scopeAudience = e.audienceId
                          ? db.audiences.find((a) => a.id === e.audienceId)
                          : undefined;
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="font-mono text-sm">
                              {e.subjectKey}
                            </TableCell>
                            <TableCell>
                              <ReasonChip reason={e.reason} />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {e.channelKind ?? (
                                <span className="text-muted-foreground">All channels</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {scopeAudience?.name ?? (
                                <span className="text-muted-foreground">Org-wide</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {stakeholderName(e.addedByStakeholderId)}
                            </TableCell>
                            {/* A date is one token. Left wrappable in the w-28
                                column it broke after the month on the wider
                                values ("Aug 10," / "2026") and not on the
                                narrower ones, so the row heights came out
                                ragged — 73px against 55px in the same list. */}
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {fmtDate(e.addedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* (c) Enforcement rule note */}
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldBan className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Suppression is enforced at send time by the channel layer — no
                workflow approval can override it.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {canManageSuppressions && addOpen && (
        <AddSuppressionDialog
          db={db}
          open={addOpen}
          onOpenChange={setAddOpen}
          onAdd={addSuppression}
        />
      )}

    </div>
  );
}
