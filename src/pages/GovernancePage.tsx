/**
 * Governance & crisis center — Blueprint Part 5 modules 14 (Governance) + 21
 * (Crisis command center), plus the Part 9 crisis-accelerated approval rules
 * (parallel, time-boxed, pre-delegated).
 *
 * Four tabs:
 *  - Crisis center: incident cards + detail view (timeline, war room, frozen
 *    sends, crisis workflow variant note) and a role-gated "Declare incident"
 *    dialog. Declaring with the send-freeze option (blueprint §45) pauses the
 *    brand's Scheduled/Live communications and drops their queued channel
 *    executions back to draft — every mutation lands in the audit trail.
 *    A consolidated "Brand risk" card (assets expiring ≤30d, contents in
 *    Rework, overdue approvals, active incidents) sits under the incidents.
 *  - Policies: policy cards with enforcement + which workflows carry AI gates.
 *  - Exceptions: WF-004 waiver requests — a role-gated dialog creates an
 *    In Review Approval at WFS-014 routed to the Brand Manager stakeholder,
 *    with the policy + justification carried in a parseable comment.
 *    GR-07 / FR-BG-18: a legal or regulatory policy is never waivable by a
 *    marketing role — the dialog blocks the submit and offers "Request legal
 *    review", which opens a Legal/Compliance approval at WFS-006 instead.
 *  - Audit trail: an Override log (GR-11 — waived policies and AI findings a
 *    an approver went past, derived from approvals + AI review runs), then the
 *    seed AuditRecords merged with the runtime DataStore audit. That runtime
 *    half is append-only and persisted with the record data, so what this page
 *    shows after a mutation is still there after a reload — within this
 *    browser's storage, which is not a server-side tamper-evident store.
 *
 * ABAC (blueprint): incidents classified 'Restricted' stay listed for everyone,
 * but the title masks unless the signed-in role is Corporate Comms Manager,
 * CMO, Executive, Legal/Compliance Reviewer, or Platform Admin.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  FileSignature,
  FileText,
  Gavel,
  Hourglass,
  Image as ImageIcon,
  Lock,
  Pause,
  Scale,
  ScrollText,
  ShieldAlert,
  Siren,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { getSeedDB } from "@/data/seed";
import { TODAY, isPastOnDemoClock } from "@/data/selectors";
import { useLiveDB } from "@/data/useLiveDB";
import type {
  AIReview,
  Approval,
  Asset,
  Campaign,
  ChannelExecution,
  Communication,
  Content,
  CrisisIncident,
  CrisisSeverity,
  Policy,
  SeedDB,
} from "@/data/types";
import { useCollection, useAuditTrail, type AuditEntry } from "@/store/DataStore";
import { useRole, type AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* ABAC — restricted-title masking (blueprint rule)                    */
/* ------------------------------------------------------------------ */

const RESTRICTED_READ_ROLES = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Legal/Compliance Reviewer",
  "Platform Admin",
] as const;

const DECLARE_ROLES = ["Corporate Comms Manager", "CMO", "Platform Admin"] as const;

const MASKED_TITLE = "Restricted incident";

/* ------------------------------------------------------------------ */
/* Exception / waiver flow — WF-004 (WFS-014 → WFS-015)                */
/* ------------------------------------------------------------------ */

/** Roles allowed to request a policy waiver (blueprint exception flow). */
const WAIVER_REQUEST_ROLES = [
  "Campaign Manager",
  "CMO",
  "Legal/Compliance Reviewer",
  "Platform Admin",
] as const;

/* ------------------------------------------------------------------ */
/* GR-07 / FR-BG-18 — legal failures are never waivable by marketing    */
/* ------------------------------------------------------------------ */

/**
 * Marketing roles: they own the work, so they can never sign off an exception
 * to a legal or regulatory finding on it. Legal/Compliance Reviewer and
 * Platform Admin are the only identities that may waive one.
 */
const MARKETING_ROLES: readonly AppRole[] = [
  "Campaign Manager",
  "Content Manager",
  "Brand Manager",
  "PR Manager",
  "Internal Comms Manager",
  "CMO",
  "Agency User",
];

/** Policy kinds whose findings marketing may never waive. */
const NON_WAIVABLE_KINDS: ReadonlyArray<Policy["policyKind"]> = ["legal", "regulatory"];

const LEGAL_WAIVER_BLOCK_NOTICE =
  "Legal and regulatory findings cannot be waived by marketing roles. Route this to Legal/Compliance.";

/** GR-07 predicate — true when this role may not waive this policy kind. */
function isWaiverBlocked(role: AppRole, kind: Policy["policyKind"] | undefined): boolean {
  return kind !== undefined && NON_WAIVABLE_KINDS.includes(kind) && MARKETING_ROLES.includes(role);
}

/** WF-002 parallel brand & legal review stage — where blocked waivers land. */
const LEGAL_REVIEW_STAGE_ID = "WFS-006";

/** WF-004 entry stage — waiver justification review by the Brand Manager. */
const WAIVER_STAGE_ID = "WFS-014";
/** WF-004 elevated sign-off stage (waivers escalated to the CMO land here). */
const WAIVER_ELEVATED_STAGE_ID = "WFS-015";

const OPEN_APPROVAL_STATUSES: ReadonlyArray<Approval["status"]> = [
  "Requested",
  "In Review",
  "Escalated",
];

/**
 * The Approval entity has no policy field, so waiver approvals carry the
 * policy + justification in a parseable comment. Keep the format readable —
 * the same comment shows verbatim in the approvals inbox.
 */
const WAIVER_COMMENT_RE = /^Waiver of (\S+) — ([\s\S]*)$/;
/** GR-07 — a waiver marketing was not allowed to make, routed to Legal instead. */
const LEGAL_REVIEW_COMMENT_RE = /^Legal review requested for (\S+) — ([\s\S]*)$/;

function waiverComment(policyId: string, justification: string): string {
  return `Waiver of ${policyId} — ${justification}`;
}

function legalReviewComment(policyId: string, justification: string): string {
  return `Legal review requested for ${policyId} — ${justification}`;
}

function isWaiverApproval(a: Approval): boolean {
  return WAIVER_COMMENT_RE.test(a.comment ?? "");
}

function isLegalReviewApproval(a: Approval): boolean {
  return LEGAL_REVIEW_COMMENT_RE.test(a.comment ?? "");
}

function parseWaiverComment(comment: string | undefined): {
  policyId: string | null;
  justification: string;
} {
  const m =
    comment?.match(WAIVER_COMMENT_RE) ?? comment?.match(LEGAL_REVIEW_COMMENT_RE);
  return m
    ? { policyId: m[1], justification: m[2] }
    : { policyId: null, justification: comment ?? "" };
}

/* ------------------------------------------------------------------ */
/* Brand risk (derived) — same expiry horizon as the Asset Library      */
/* ------------------------------------------------------------------ */

const EXPIRY_WARNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from the demo clock (TODAY) until the ISO date; negative = past. */
function daysUntil(isoDate: string): number {
  return Math.round((Date.parse(isoDate) - Date.parse(TODAY)) / DAY_MS);
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

const severityStyles: Record<CrisisSeverity, string> = {
  Critical: "bg-destructive/10 text-destructive border-destructive/20",
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Low: "bg-muted text-muted-foreground border-border",
};

function SeverityChip({ severity }: { severity: CrisisSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        severityStyles[severity],
      )}
    >
      {(severity === "Critical" || severity === "High") && (
        <AlertTriangle className="h-3 w-3" />
      )}
      {severity}
    </span>
  );
}

function EnforcementChip({ enforcement }: { enforcement: Policy["enforcement"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        enforcement === "block"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-warning/10 text-warning border-warning/20",
      )}
    >
      {enforcement === "block" ? "Blocks approval" : "Warns"}
    </span>
  );
}

function KindChip({ kind }: { kind: Policy["policyKind"] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
      {kind}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/**
 * Brand lineage of a communication (blueprint §45 crisis send-freeze):
 * campaign activity → campaign → brand; otherwise the linked content's brand;
 * otherwise the content version referenced by any of its channel executions.
 */
function brandIdForCommunication(
  db: SeedDB,
  comm: Communication,
  executions: ChannelExecution[],
): string | undefined {
  if (comm.campaignActivityId) {
    const activity = db.campaignActivities.find((a) => a.id === comm.campaignActivityId);
    const campaign = activity
      ? db.campaigns.find((c) => c.id === activity.campaignId)
      : undefined;
    if (campaign) return campaign.brandId;
  }
  if (comm.contentId) {
    const content = db.contents.find((c) => c.id === comm.contentId);
    if (content) return content.brandId;
  }
  for (const x of executions) {
    if (x.communicationId !== comm.id || !x.contentVersionId) continue;
    const version = db.contentVersions.find((v) => v.id === x.contentVersionId);
    const content = version
      ? db.contents.find((c) => c.id === version.contentId)
      : undefined;
    if (content) return content.brandId;
  }
  return undefined;
}

function WarRoomAvatars({ db, stakeholderIds }: { db: SeedDB; stakeholderIds: string[] }) {
  return (
    <div className="flex -space-x-2">
      {stakeholderIds.map((id) => {
        const s = db.stakeholders.find((st) => st.id === id);
        return (
          <span
            key={id}
            title={s ? `${s.name} — ${s.role}` : id}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-background bg-primary/10 text-[10px] font-semibold text-primary ring-1 ring-border"
          >
            {s?.avatar ?? id.slice(-2)}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Crisis center                                                       */
/* ------------------------------------------------------------------ */

function IncidentCard({
  db,
  incident,
  titleFor,
  selected,
  onSelect,
}: {
  db: SeedDB;
  incident: CrisisIncident;
  titleFor: (i: CrisisIncident) => string;
  selected: boolean;
  onSelect: () => void;
}) {
  const masked = titleFor(incident) === MASKED_TITLE;
  const brands = incident.affectedBrandIds
    .map((id) => db.brands.find((b) => b.id === id)?.name ?? id)
    .join(", ");
  const regions = incident.affectedRegionIds
    .map((id) => db.regions.find((r) => r.id === id)?.code ?? id)
    .join(", ");
  const holdingStatement = incident.holdingStatementContentId
    ? db.contents.find((c) => c.id === incident.holdingStatementContentId)
    : undefined;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected && "border-primary/60 ring-1 ring-primary/30",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={cn(
                "flex items-center gap-1.5 font-medium",
                masked && "italic text-muted-foreground",
              )}
            >
              {masked && <Lock className="h-3.5 w-3.5 shrink-0" />}
              {/* The card is narrow enough that longer incident names ellipsize;
                  the tooltip carries whatever the viewer is allowed to read. */}
              <span className="truncate" title={titleFor(incident)}>
                {titleFor(incident)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {incident.id} · declared {fmtDateTime(incident.declaredAt)}
            </div>
          </div>
          <SeverityChip severity={incident.severity} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={incident.status} />
          <span className="text-xs text-muted-foreground">
            {brands || "No brands"} · {regions || "No regions"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <WarRoomAvatars db={db} stakeholderIds={incident.warRoomStakeholderIds} />
          {incident.holdingStatementContentId ? (
            <Link
              to={`/content/${incident.holdingStatementContentId}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              {holdingStatement?.title ?? "Holding statement"}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">No holding statement</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IncidentDetail({
  db,
  incident,
  titleFor,
  frozenSends,
  runtimeAudit,
  currentActorName,
}: {
  db: SeedDB;
  incident: CrisisIncident;
  titleFor: (i: CrisisIncident) => string;
  /** Paused communications for this incident's brands — live from the store. */
  frozenSends: Communication[];
  /** The store's durable trail, so a just-declared incident has a history. */
  runtimeAudit: AuditEntry[];
  /** Signed-in identity — the actor behind every runtime entry. */
  currentActorName: string;
}) {
  /* Timeline from the incident's AuditRecords, oldest → newest (newest last),
     merged with what the app has recorded against the same record. Reading the
     seed alone meant an incident you had just declared reported "no audit
     events recorded yet" while the Audit tab three clicks away listed the
     create. Those runtime entries are persisted with the record data, so the
     timeline reads the same after a reload as it did before one. */
  const timeline = [
    ...db.auditRecords
      .filter((r) => r.entityId === incident.id)
      .map((r) => ({
        id: r.id,
        at: r.at,
        detail: r.detail,
        action: r.action,
        actorName:
          db.stakeholders.find((s) => s.id === r.actorStakeholderId)?.name ??
          r.actorStakeholderId,
      })),
    ...runtimeAudit
      .filter((e) => e.recordId === incident.id)
      .map((e) => ({
        id: e.id,
        at: new Date(e.ts).toISOString(),
        detail: e.label,
        action: e.action,
        actorName: currentActorName,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at, DEFAULT_LOCALE));

  // ABAC: a masked title means the viewer has no read access to the record —
  // the summary, timeline, and roster must not leak either.
  if (titleFor(incident) === MASKED_TITLE) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Siren className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Restricted incident</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Details are visible only to the crisis war room and governance roles.
            Every access to restricted records is written to the audit trail.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Summary + timeline */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Siren className="h-4 w-4 text-destructive" />
            {titleFor(incident)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{incident.summary}</p>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Incident timeline
            </h3>
            {timeline.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No audit events recorded for this incident yet.
              </p>
            ) : (
              <ol className="mt-3 space-y-0">
                {timeline.map((r, idx) => {
                  const last = idx === timeline.length - 1;
                  return (
                    <li key={r.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {!last && (
                        <span
                          aria-hidden
                          className="absolute left-[5px] top-4 h-full w-px bg-border"
                        />
                      )}
                      <span
                        className={cn(
                          "mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-background ring-1",
                          last ? "bg-destructive ring-destructive/40" : "bg-primary ring-border",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-sm">
                          <span className="font-medium">{r.actorName}</span>{" "}
                          <span className="text-muted-foreground">· {r.action}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>
                        <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {fmtDateTime(r.at)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </CardContent>
      </Card>

      {/* War room + crisis variant note */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">War room roster</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incident.warRoomStakeholderIds.map((id) => {
              const s = db.stakeholders.find((st) => st.id === id);
              return (
                <div key={id} className="flex items-center gap-2.5 rounded-md border p-2">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {s?.avatar ?? id.slice(-2)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium" title={s?.name ?? id}>
                      {s?.name ?? id}
                    </div>
                    <div
                      className="truncate text-xs text-muted-foreground"
                      title={s?.role ?? "Stakeholder"}
                    >
                      {s?.role ?? "Stakeholder"}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pause className="h-4 w-4 text-warning" />
              Frozen sends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {frozenSends.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No in-flight sends are paused for this incident&apos;s brands.
              </p>
            ) : (
              frozenSends.map((c) => (
                <Link
                  key={c.id}
                  to="/communications"
                  className="block rounded-md border p-2 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium" title={c.subject}>
                      {c.subject}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {c.id}
                    {c.scheduledAt ? ` · was scheduled ${fmtDateTime(c.scheduledAt)}` : ""}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex gap-2.5 p-4">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Crisis variant:</span>{" "}
              approvals run parallel and time-boxed (30 min SLA), decisions
              pre-delegated to the crisis lead
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Declare incident dialog                                             */
/* ------------------------------------------------------------------ */

const SEVERITIES: CrisisSeverity[] = ["Critical", "High", "Medium", "Low"];

function DeclareIncidentDialog({
  db,
  open,
  onOpenChange,
  declarerName,
  onDeclare,
}: {
  db: SeedDB;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declarerName: string;
  onDeclare: (draft: {
    title: string;
    severity: CrisisSeverity;
    brandId: string;
    regionId: string;
    summary: string;
    freezeSends: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<CrisisSeverity>("High");
  const [brandId, setBrandId] = useState<string>(db.brands[0]?.id ?? "");
  const [regionId, setRegionId] = useState<string>(db.regions[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [freezeSends, setFreezeSends] = useState(true);

  const canSubmit = title.trim().length > 0 && summary.trim().length > 0;

  /**
   * The dialog stays mounted between opens, so closing it must clear the draft —
   * otherwise a cancelled declaration is still sitting in the fields the next
   * time someone opens it.
   */
  const reset = (): void => {
    setTitle("");
    setSummary("");
    setSeverity("High");
    setFreezeSends(true);
  };

  const changeOpen = (next: boolean): void => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!canSubmit) return;
    onDeclare({
      title: title.trim(),
      severity,
      brandId,
      regionId,
      summary: summary.trim(),
      freezeSends,
    });
    changeOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Declare incident</DialogTitle>
          <DialogDescription>
            Opens an Active crisis with {declarerName} in the war room. The crisis
            approval variant (parallel, time-boxed, pre-delegated) applies to
            everything created under it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cri-title">Title</Label>
            <Input
              id="cri-title"
              value={title}
              placeholder="e.g. Product recall press leak"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as CrisisSeverity)}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  {db.brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  {db.regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cri-summary">Summary</Label>
            <Textarea
              id="cri-summary"
              value={summary}
              rows={3}
              placeholder="What happened, where, and what is exposed?"
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cri-freeze"
              checked={freezeSends}
              onCheckedChange={(v) => setFreezeSends(v === true)}
            />
            <Label htmlFor="cri-freeze" className="text-sm font-normal">
              Freeze this brand&apos;s in-flight sends (recommended)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => changeOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!canSubmit}>
            <Siren className="mr-1.5 h-4 w-4" />
            Declare incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Policies tab                                                        */
/* ------------------------------------------------------------------ */

/**
 * Workflows whose stages carry the AI gate that checks a given policy kind.
 *
 * Read off the live collections: a version published in the workflow designer
 * writes `workflowStages`, and reading the frozen seed here meant "Enforced by
 * AI gates in …" never reflected a gate that had just been added or removed.
 */
function aiGateWorkflowsFor(
  db: SeedDB,
  kind: Policy["policyKind"],
): { name: string; stage: string }[] {
  const automation = kind === "legal" || kind === "regulatory" ? "compliance-ai" : "brand-ai";
  return db.workflowStages
    .filter((s) => s.automation === automation)
    .map((s) => ({
      name: db.workflows.find((w) => w.id === s.workflowId)?.name ?? s.workflowId,
      stage: s.name,
    }));
}

function PoliciesTab({ db, policies }: { db: SeedDB; policies: Policy[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {policies.map((p) => {
        const gates = aiGateWorkflowsFor(db, p.policyKind);
        return (
          <Card key={p.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{p.id}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <KindChip kind={p.policyKind} />
                  <EnforcementChip enforcement={p.enforcement} />
                </div>
              </div>

              <p className="rounded-md border bg-muted/40 p-2.5 text-sm text-muted-foreground">
                {p.ruleText}
              </p>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  AI gates referencing this policy
                </h3>
                {gates.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No workflow AI gate references this policy kind.
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {gates.map((g) => (
                      <li
                        key={`${g.name}-${g.stage}`}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        <Zap className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="font-medium">{g.name}</span>
                        <span className="text-xs text-muted-foreground">· {g.stage}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* The mapping is real — these workflows do carry a gate for this
                    policy kind. What does not exist is any path from a stage
                    transition to the review: it runs only when a person presses
                    the button on a record. Reading "enforced" beside a workflow
                    name told a compliance officer the opposite. */}
                {gates.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Gates are run from the record by a reviewer. Reaching the stage
                    does not trigger the check on its own.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Audit trail tab                                                     */
/* ------------------------------------------------------------------ */

interface AuditRow {
  id: string;
  at: string; // ISO
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  source: "seed" | "runtime";
}

/** DataStore collection key → entity label for runtime audit entries. */
const COLLECTION_ENTITY: Record<string, string> = {
  campaigns: "Campaign",
  communications: "Communication",
  contents: "Content",
  assets: "Asset",
  ideas: "Idea",
  approvals: "Approval",
  crisisIncidents: "CrisisIncident",
  journeys: "Journey",
  audiences: "Audience",
  briefs: "Brief",
  budgets: "Budget",
  workflows: "Workflow",
  policies: "Policy",
  events: "Event",
};

function entityForCollection(collection: string): string {
  return (
    COLLECTION_ENTITY[collection] ??
    collection.charAt(0).toUpperCase() + collection.slice(1).replace(/s$/, "")
  );
}

/* ------------------------------------------------------------------ */
/* Override log (GR-11) — approver decisions taken against the guard-rails */
/* ------------------------------------------------------------------ */

interface OverrideRow {
  id: string;
  /** ISO timestamp of the overriding decision. */
  at: string;
  kind: "Policy waived" | "AI finding overridden";
  actorName: string;
  subject: string;
  detail: string;
  /** True when the decision was made in the app, not shipped with the seed. */
  recordedHere: boolean;
}

/** Readable label for an approval/review subject, live records first. */
function subjectLabel(
  db: SeedDB,
  entity: string,
  id: string,
  live: { contents: Content[]; campaigns: Campaign[]; communications: Communication[] },
): string {
  switch (entity) {
    case "Content":
      return live.contents.find((c) => c.id === id)?.title ?? `${entity} ${id}`;
    case "Campaign":
      return live.campaigns.find((c) => c.id === id)?.name ?? `${entity} ${id}`;
    case "Communication":
      return live.communications.find((c) => c.id === id)?.subject ?? `${entity} ${id}`;
    case "Brief":
      return db.briefs.find((b) => b.id === id)?.title ?? `${entity} ${id}`;
    case "Asset":
      return db.assets.find((a) => a.id === id)?.filename ?? `${entity} ${id}`;
    case "Budget":
      return db.budgets.find((b) => b.id === id)?.name ?? `${entity} ${id}`;
    default:
      return `${entity} ${id}`;
  }
}

/**
 * GR-11 — every override is captured and reportable. Two things count as an
 * override, and both are derived (never authored) so the log cannot drift:
 *
 *  1. Policy waived — a WF-004 waiver approval that an approver granted; the
 *     policy and justification come from the approval's parseable comment.
 *  2. AI finding overridden — an AIReview that came back 'warn' or 'block' and
 *     whose subject was approved anyway afterwards (by an approval decision, or
 *     by the record itself reaching Approved after the run).
 *
 * Rows the DataStore audit has an entry for are flagged so a demo can tell its
 * own overrides apart from the ones that shipped with the seed.
 */
function buildOverrideRows({
  db,
  approvals,
  aiReviews,
  contents,
  campaigns,
  communications,
  runtimeAudit,
}: {
  db: SeedDB;
  approvals: Approval[];
  aiReviews: AIReview[];
  contents: Content[];
  campaigns: Campaign[];
  communications: Communication[];
  runtimeAudit: AuditEntry[];
}): OverrideRow[] {
  const live = { contents, campaigns, communications };
  const touched = new Set(runtimeAudit.map((e) => e.recordId));
  const actorName = (stakeholderId: string | undefined): string =>
    db.stakeholders.find((s) => s.id === stakeholderId)?.name ??
    stakeholderId ??
    "Unknown actor";

  const rows: OverrideRow[] = [];

  // 1 — granted policy waivers.
  for (const a of approvals) {
    if (a.status !== "Approved" || !isWaiverApproval(a)) continue;
    const { policyId, justification } = parseWaiverComment(a.comment);
    const policy = policyId ? db.policies.find((p) => p.id === policyId) : undefined;
    rows.push({
      id: `waiver-${a.id}`,
      at: a.decidedAt ?? a.updatedAt,
      kind: "Policy waived",
      actorName: actorName(a.approverStakeholderId),
      subject: subjectLabel(db, a.subjectEntity, a.subjectId, live),
      detail: `${policy?.name ?? policyId ?? "Policy"}${
        policy ? ` (${policy.policyKind}, ${policy.enforcement})` : ""
      } waived — ${justification || "no justification recorded"} · ${a.id}`,
      recordedHere: touched.has(a.id),
    });
  }

  // 2 — AI findings an approver went past.
  for (const review of aiReviews) {
    if (review.overallSeverity === "pass") continue;
    const blocks = review.findings.filter((f) => f.severity === "block").length;
    const warns = review.findings.filter((f) => f.severity === "warn").length;
    const findingSummary = `${blocks} block / ${warns} warn finding${
      blocks + warns === 1 ? "" : "s"
    }`;

    const decision = approvals
      .filter(
        (a) =>
          a.subjectEntity === review.subjectEntity &&
          a.subjectId === review.subjectId &&
          a.status === "Approved" &&
          (a.decidedAt ?? a.updatedAt) >= review.ranAt,
      )
      .sort((a, b) => (a.decidedAt ?? a.updatedAt).localeCompare(b.decidedAt ?? b.updatedAt, DEFAULT_LOCALE))[0];

    if (decision) {
      rows.push({
        id: `ai-${review.id}-${decision.id}`,
        at: decision.decidedAt ?? decision.updatedAt,
        kind: "AI finding overridden",
        actorName: actorName(decision.approverStakeholderId),
        subject: subjectLabel(db, review.subjectEntity, review.subjectId, live),
        detail: `Approved after ${review.id} returned '${review.overallSeverity}' (${findingSummary}) · ${decision.id}`,
        recordedHere: touched.has(decision.id) || touched.has(review.id),
      });
      continue;
    }

    // No approval row, but the record itself moved to Approved after the run.
    const record =
      review.subjectEntity === "Content"
        ? contents.find((c) => c.id === review.subjectId)
        : review.subjectEntity === "Communication"
          ? communications.find((c) => c.id === review.subjectId)
          : undefined;
    if (record && record.status === "Approved" && record.updatedAt >= review.ranAt) {
      rows.push({
        id: `ai-${review.id}-${record.id}`,
        at: record.updatedAt,
        kind: "AI finding overridden",
        actorName: actorName(record.ownerStakeholderId),
        subject: subjectLabel(db, review.subjectEntity, review.subjectId, live),
        detail: `Moved to Approved after ${review.id} returned '${review.overallSeverity}' (${findingSummary})`,
        recordedHere: touched.has(record.id) || touched.has(review.id),
      });
    }
  }

  return rows.sort((a, b) => b.at.localeCompare(a.at, DEFAULT_LOCALE));
}

function OverrideLog({ rows }: { rows: OverrideRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="h-4 w-4 text-warning" />
          Override log
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Every decision where an approver went against an AI finding or waived a
          policy — captured and reportable, derived from approvals and the AI
          review runs rather than authored by hand.
        </p>
      </CardHeader>
      <CardContent className={rows.length === 0 ? undefined : "p-0"}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No overrides recorded. Nobody has granted a policy waiver, and no
            warn/block AI review has been approved past — the log stays empty
            until one happens.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Timestamp</TableHead>
                <TableHead className="w-44">Actor</TableHead>
                <TableHead className="w-48">Override</TableHead>
                <TableHead className="w-52">Subject</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {fmtDateTime(r.at)}
                  </TableCell>
                  <TableCell className="text-sm">{r.actorName}</TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      {r.kind}
                    </span>
                    {r.recordedHere && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        recorded in this app
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{r.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTrailTab({
  db,
  runtimeAudit,
  currentActorName,
  overrides,
}: {
  db: SeedDB;
  runtimeAudit: AuditEntry[];
  currentActorName: string;
  overrides: OverrideRow[];
}) {
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const rows = useMemo<AuditRow[]>(() => {
    const seedRows: AuditRow[] = db.auditRecords.map((r) => ({
      id: r.id,
      at: r.at,
      actorName:
        db.stakeholders.find((s) => s.id === r.actorStakeholderId)?.name ??
        r.actorStakeholderId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      detail: r.detail,
      source: "seed",
    }));
    // Runtime mutations were performed in the app by the signed-in identity.
    const runtimeRows: AuditRow[] = runtimeAudit.map((e) => ({
      id: e.id,
      at: new Date(e.ts).toISOString(),
      actorName: currentActorName,
      action: `${e.collection}.${e.action}`,
      entityType: entityForCollection(e.collection),
      entityId: e.recordId,
      detail: e.label,
      source: "runtime",
    }));
    return [...seedRows, ...runtimeRows].sort((a, b) => b.at.localeCompare(a.at, DEFAULT_LOCALE));
  }, [db, runtimeAudit, currentActorName]);

  const entityTypes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entityType))).sort(),
    [rows],
  );

  const filtered =
    entityFilter === "all" ? rows : rows.filter((r) => r.entityType === entityFilter);

  return (
    <div className="space-y-4">
      <OverrideLog rows={overrides} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length} events · seed history merged with
          the durable runtime trail
        </p>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {entityTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit events for this entity type"
          hint="Switch the entity filter, or make a change anywhere in the app to log a runtime event."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Timestamp</TableHead>
                  <TableHead className="w-44">Actor</TableHead>
                  <TableHead className="w-56">Action</TableHead>
                  <TableHead className="w-44">Entity</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={`${r.source}-${r.id}`}>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {fmtDateTime(r.at)}
                    </TableCell>
                    <TableCell className="text-sm">{r.actorName}</TableCell>
                    <TableCell className="text-sm">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{r.entityType}</span>
                      <span className="text-xs text-muted-foreground"> · {r.entityId}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exceptions tab — WF-004 waiver requests                             */
/* ------------------------------------------------------------------ */

function RequestWaiverDialog({
  campaigns,
  policies,
  open,
  onOpenChange,
  approverName,
  role,
  legalReviewerName,
  onSubmit,
  onRequestLegalReview,
}: {
  campaigns: Campaign[];
  policies: Policy[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Brand Manager stakeholder who reviews WFS-014 waivers. */
  approverName: string;
  /** Signed-in role — drives the GR-07 / FR-BG-18 block. */
  role: AppRole;
  /** Legal/Compliance Reviewer stakeholder a blocked waiver is routed to. */
  legalReviewerName: string;
  onSubmit: (draft: { campaignId: string; policyId: string; justification: string }) => void;
  onRequestLegalReview: (draft: {
    campaignId: string;
    policyId: string;
    justification: string;
  }) => void;
}) {
  const [campaignId, setCampaignId] = useState<string>(campaigns[0]?.id ?? "");
  const [policyId, setPolicyId] = useState<string>(policies[0]?.id ?? "");
  const [justification, setJustification] = useState("");

  const policy = policies.find((p) => p.id === policyId);
  // GR-07 / FR-BG-18 — a legal or regulatory finding is never waivable by a
  // marketing role, whatever the justification says.
  const blocked = isWaiverBlocked(role, policy?.policyKind);

  const complete =
    campaignId.length > 0 && policyId.length > 0 && justification.trim().length > 0;
  const canSubmit = complete && !blocked;

  /**
   * The dialog stays mounted between opens, so closing it must clear the
   * justification — a cancelled request must not be waiting in the box the next
   * time someone opens it against a different campaign or policy.
   */
  const changeOpen = (next: boolean): void => {
    if (!next) setJustification("");
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!canSubmit) return;
    onSubmit({ campaignId, policyId, justification: justification.trim() });
    changeOpen(false);
  };

  const requestLegalReview = (): void => {
    if (!complete) return;
    onRequestLegalReview({ campaignId, policyId, justification: justification.trim() });
    changeOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request policy waiver</DialogTitle>
          <DialogDescription>
            Starts the WF-004 exception approval workflow: justification review by{" "}
            {approverName} (24h SLA), with elevated CMO sign-off on escalation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Campaign</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Policy to waive</Label>
              <Select value={policyId} onValueChange={setPolicyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Policy" />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="capitalize text-muted-foreground">
                        {p.policyKind}
                      </span>{" "}
                      · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="waiver-justification">Justification</Label>
            <Textarea
              id="waiver-justification"
              value={justification}
              rows={4}
              placeholder="Why this campaign needs an exception, the scope, and the mitigation in place"
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>

          {blocked && (
            <div
              role="alert"
              className="flex gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  {LEGAL_WAIVER_BLOCK_NOTICE}
                </p>
                <p className="text-xs text-muted-foreground">
                  {policy?.name} is a {policy?.policyKind} policy and you are signed
                  in as {role}. Requesting legal review opens an approval for{" "}
                  {legalReviewerName} instead of a waiver.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => changeOpen(false)}>
            Cancel
          </Button>
          {blocked && (
            <Button variant="secondary" onClick={requestLegalReview} disabled={!complete}>
              <Scale className="mr-1.5 h-4 w-4" />
              Request legal review
            </Button>
          )}
          <Button onClick={submit} disabled={!canSubmit}>
            <FileSignature className="mr-1.5 h-4 w-4" />
            Submit waiver request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WaiverTable({
  db,
  campaigns,
  waivers,
  title,
}: {
  db: SeedDB;
  campaigns: Campaign[];
  waivers: Approval[];
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-52">Subject</TableHead>
              <TableHead className="w-48">Policy</TableHead>
              <TableHead>Justification</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead className="w-40">SLA due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waivers.map((a) => {
              const { policyId, justification } = parseWaiverComment(a.comment);
              const policy = policyId
                ? db.policies.find((p) => p.id === policyId)
                : undefined;
              const campaign =
                a.subjectEntity === "Campaign"
                  ? campaigns.find((c) => c.id === a.subjectId)
                  : undefined;
              return (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">
                    {campaign ? (
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="font-medium hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    ) : (
                      <span className="font-medium">
                        {db.budgets.find((b) => b.id === a.subjectId)?.name ??
                          `${a.subjectEntity} ${a.subjectId}`}
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground">{a.id}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {policy ? (
                      <>
                        {policy.name}
                        <div className="text-xs text-muted-foreground">{policy.id}</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {justification || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {fmtDateTime(a.slaDueAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Brand risk card — consolidated derived signals                      */
/* ------------------------------------------------------------------ */

interface RiskRow {
  key: string;
  icon: typeof ImageIcon;
  category: string;
  label: string;
  detail: string;
  /** Deep link target; rows without one use onSelect instead. */
  to?: string;
  onSelect?: () => void;
}

function BrandRiskCard({
  assets,
  contents,
  approvals,
  incidents,
  titleFor,
  subjectTitleFor,
  onSelectIncident,
}: {
  assets: Asset[];
  contents: Content[];
  approvals: Approval[];
  incidents: CrisisIncident[];
  titleFor: (i: CrisisIncident) => string;
  /** Names an approval's subject; every other row here shows a title, not an id. */
  subjectTitleFor: (entity: string, id: string) => string;
  onSelectIncident: (id: string) => void;
}) {
  const rows: RiskRow[] = [
    // Assets whose usage rights lapse inside the warning horizon (Asset Library rule).
    ...assets
      .filter((a) => {
        if (!a.rightsExpiry) return false;
        const days = daysUntil(a.rightsExpiry);
        return days >= 0 && days <= EXPIRY_WARNING_DAYS;
      })
      .map((a) => ({
        key: `asset-${a.id}`,
        icon: ImageIcon,
        category: "Asset expiring",
        label: a.filename,
        detail: `rights expire in ${daysUntil(a.rightsExpiry!)}d`,
        to: "/assets",
      })),
    // Contents bounced back into Rework by an approver.
    ...contents
      .filter((c) => c.status === "Rework")
      .map((c) => ({
        key: `content-${c.id}`,
        icon: FileText,
        category: "Content in Rework",
        label: c.title,
        detail: c.id,
        to: `/content/${c.id}`,
      })),
    // Open approvals already past their SLA on the demo clock.
    ...approvals
      .filter(
        (a) => OPEN_APPROVAL_STATUSES.includes(a.status) && isPastOnDemoClock(a.slaDueAt),
      )
      .map((a) => ({
        key: `approval-${a.id}`,
        icon: Hourglass,
        category: "Overdue approval",
        label: subjectTitleFor(a.subjectEntity, a.subjectId),
        detail: `${a.id} · SLA was ${fmtDateTime(a.slaDueAt)}`,
        // These are org-wide, so the row is usually somebody else's queue item:
        // ?focus lands the inbox on the exact approval (or says whose it is)
        // instead of dropping the reader on their own unrelated queue.
        to: `/approvals?focus=${a.id}`,
      })),
    // Crises still open right now.
    ...incidents
      .filter((i) => i.status === "Active")
      .map((i) => ({
        key: `incident-${i.id}`,
        icon: Siren,
        category: "Active incident",
        label: titleFor(i),
        detail: `${i.id} · ${i.severity} severity`,
        onSelect: () => onSelectIncident(i.id),
      })),
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-warning" />
          Brand risk
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Monitored by the Brand Execution Agent
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No open brand risk signals — nothing expiring, in rework, overdue, or
            in crisis for the current data.
          </p>
        ) : (
          rows.map((row) => {
            const Icon = row.icon;
            const body = (
              <>
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm" title={`${row.label} · ${row.detail}`}>
                    <span className="font-medium">{row.label}</span>{" "}
                    <span className="text-muted-foreground">· {row.detail}</span>
                  </span>
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {row.category}
                  </span>
                </span>
              </>
            );
            const rowClass =
              "flex w-full items-start gap-2.5 rounded-md border p-2 text-left transition-colors hover:border-primary/40";
            return row.to ? (
              <Link key={row.key} to={row.to} className={rowClass}>
                {body}
              </Link>
            ) : (
              <button key={row.key} type="button" onClick={row.onSelect} className={rowClass}>
                {body}
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function GovernancePage() {
  /* Live, not frozen: this page reads workflow stages, audit records and
     subject titles that other surfaces write at runtime. */
  const db = useLiveDB();
  const { role, currentUser } = useRole();
  const runtimeAudit = useAuditTrail();
  const incidents = useCollection<CrisisIncident>("crisisIncidents", getSeedDB().crisisIncidents);
  const communications = useCollection<Communication>("communications", getSeedDB().communications);
  const channelExecutions = useCollection<ChannelExecution>(
    "channelExecutions",
    getSeedDB().channelExecutions,
  );
  // Same collection ids as the approvals inbox / asset library / content admin,
  // so waivers land in the shared inbox and risk signals track live records.
  const approvals = useCollection<Approval>("approvals", getSeedDB().approvals);
  const assets = useCollection<Asset>("assets", getSeedDB().assets);
  const contents = useCollection<Content>("contents", getSeedDB().contents);
  const campaigns = useCollection<Campaign>("campaigns", getSeedDB().campaigns);
  // Same collection id ContentDetail writes its compliance runs to — the
  // override log reads them live (the seed collection is empty by design).
  const aiReviews = useCollection<AIReview>("aiReviews", getSeedDB().aiReviews);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [waiverOpen, setWaiverOpen] = useState(false);

  // Signed-in demo identity → seed stakeholder (same join as the approvals inbox).
  const stakeholder = db.stakeholders.find((s) => s.role === role);

  const canReadRestricted = (RESTRICTED_READ_ROLES as readonly string[]).includes(role);
  const canDeclare = (DECLARE_ROLES as readonly string[]).includes(role);
  const canRequestWaiver = (WAIVER_REQUEST_ROLES as readonly string[]).includes(role);

  // WF-004 routing — WFS-014 waivers go to the Brand Manager stakeholder.
  const brandManager = db.stakeholders.find((s) => s.role === "Brand Manager");
  // GR-07 routing — blocked waivers become a legal review for this stakeholder.
  const legalReviewer = db.stakeholders.find(
    (s) => s.role === "Legal/Compliance Reviewer",
  );

  /* Every approval sitting in a WF-004 stage is a waiver request (open or
     decided). The stage is what makes it one — the subject is not. Restricting
     this to campaigns hid the seed's only two WF-004 items (APR-015, APR-027,
     both on Budgets), so this tab reported "No waiver requests" while the CMO's
     inbox listed them under the exact stage names this table is about. The
     table already renders a non-campaign subject. */
  const waiverApprovals = approvals.records
    .filter(
      (a) =>
        a.workflowStageId === WAIVER_STAGE_ID ||
        a.workflowStageId === WAIVER_ELEVATED_STAGE_ID,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt, DEFAULT_LOCALE));

  // GR-07 — waivers marketing could not make, now sitting with Legal/Compliance.
  const legalReviewApprovals = approvals.records
    .filter(isLegalReviewApproval)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt, DEFAULT_LOCALE));
  const openWaivers = waiverApprovals.filter((a) =>
    OPEN_APPROVAL_STATUSES.includes(a.status),
  );
  const decidedWaivers = waiverApprovals.filter(
    (a) => !OPEN_APPROVAL_STATUSES.includes(a.status),
  );

  const requestWaiver = (draft: {
    campaignId: string;
    policyId: string;
    justification: string;
  }): void => {
    // GR-07 / FR-BG-18 — enforced here as well as on the disabled button, so the
    // rule holds however the submit is reached.
    const policyKind = db.policies.find((p) => p.id === draft.policyId)?.policyKind;
    if (isWaiverBlocked(role, policyKind)) {
      toast.error("Waiver blocked", { description: LEGAL_WAIVER_BLOCK_NOTICE });
      return;
    }
    const now = new Date();
    const iso = now.toISOString();
    const stage = db.workflowStages.find((s) => s.id === WAIVER_STAGE_ID);
    const id = approvals.createIn(
      {
        subjectEntity: "Campaign",
        subjectId: draft.campaignId,
        workflowStageId: WAIVER_STAGE_ID,
        approverStakeholderId: brandManager?.id ?? "STK-005",
        status: "In Review",
        slaDueAt: new Date(
          now.getTime() + (stage?.slaHours ?? 24) * 60 * 60 * 1000,
        ).toISOString(),
        comment: waiverComment(draft.policyId, draft.justification),
        createdAt: iso,
        updatedAt: iso,
      },
      "APR-",
    );
    const campaignName =
      campaigns.records.find((c) => c.id === draft.campaignId)?.name ?? draft.campaignId;
    toast.success("Waiver request submitted — exception approval workflow started", {
      description: `${id} · ${campaignName} · routed to ${
        brandManager?.name ?? "the Brand Manager"
      } (WF-004)`,
    });
  };

  /**
   * GR-07 alternative path — instead of a waiver the marketing role may not
   * make, open a legal review approval assigned to Legal/Compliance at the
   * WF-002 brand & legal review stage. Nothing about the policy is waived.
   */
  const requestLegalReview = (draft: {
    campaignId: string;
    policyId: string;
    justification: string;
  }): void => {
    const now = new Date();
    const iso = now.toISOString();
    const stage = db.workflowStages.find((s) => s.id === LEGAL_REVIEW_STAGE_ID);
    const id = approvals.createIn(
      {
        subjectEntity: "Campaign",
        subjectId: draft.campaignId,
        workflowStageId: LEGAL_REVIEW_STAGE_ID,
        approverStakeholderId: legalReviewer?.id ?? "STK-008",
        status: "Requested",
        slaDueAt: new Date(
          now.getTime() + (stage?.slaHours ?? 48) * 60 * 60 * 1000,
        ).toISOString(),
        comment: legalReviewComment(draft.policyId, draft.justification),
        createdAt: iso,
        updatedAt: iso,
      },
      "APR-",
    );
    const campaignName =
      campaigns.records.find((c) => c.id === draft.campaignId)?.name ?? draft.campaignId;
    const policyName =
      db.policies.find((p) => p.id === draft.policyId)?.name ?? draft.policyId;
    toast.success("Routed to Legal/Compliance — no waiver granted", {
      description: `${id} · ${campaignName} · ${policyName} review assigned to ${
        legalReviewer?.name ?? "the Legal/Compliance Reviewer"
      }`,
    });
  };

  // GR-11 — derived override log for the audit tab.
  const overrides = buildOverrideRows({
    db,
    approvals: approvals.records,
    aiReviews: aiReviews.records,
    contents: contents.records,
    campaigns: campaigns.records,
    communications: communications.records,
    runtimeAudit,
  });

  const titleFor = (incident: CrisisIncident): string =>
    incident.classification === "Restricted" && !canReadRestricted
      ? MASKED_TITLE
      : incident.title;

  const sorted = incidents.records
    .slice()
    .sort((a, b) => b.declaredAt.localeCompare(a.declaredAt, DEFAULT_LOCALE));

  // Detail defaults to the active incident; clicking any card focuses it.
  const selected =
    (selectedId ? sorted.find((i) => i.id === selectedId) : undefined) ??
    sorted.find((i) => i.status === "Active");

  // Frozen sends for an incident — paused communications whose brand lineage
  // matches an affected brand, derived live from the (possibly mutated) store.
  const frozenSendsFor = (incident: CrisisIncident): Communication[] =>
    communications.records.filter((c) => {
      if (c.status !== "Paused") return false;
      const brand = brandIdForCommunication(db, c, channelExecutions.records);
      return brand !== undefined && incident.affectedBrandIds.includes(brand);
    });

  const declareIncident = (draft: {
    title: string;
    severity: CrisisSeverity;
    brandId: string;
    regionId: string;
    summary: string;
    freezeSends: boolean;
  }): void => {
    const now = new Date().toISOString();
    // War room: the declarer plus the standing crisis leads (corp comms + legal).
    const warRoom = Array.from(
      new Set([stakeholder?.id ?? "STK-002", "STK-002", "STK-008"]),
    );
    const id = incidents.createIn(
      {
        title: draft.title,
        severity: draft.severity,
        status: "Active",
        classification: "Restricted",
        summary: draft.summary,
        warRoomStakeholderIds: warRoom,
        affectedBrandIds: [draft.brandId],
        affectedRegionIds: [draft.regionId],
        declaredAt: now,
        createdAt: now,
        updatedAt: now,
      },
      "CRI-",
    );
    setSelectedId(id);
    toast.success("Incident declared — crisis workflow activated", {
      description: `${id} · ${draft.severity} severity · lead ${currentUser.name}`,
    });

    // Blueprint §45 — CrisisDeclared freezes the brand's conflicting sends:
    // Scheduled/Live communications pause, their queued executions drop to draft.
    if (draft.freezeSends) {
      const inFlight = communications.records.filter(
        (c) =>
          (c.status === "Scheduled" || c.status === "Live") &&
          brandIdForCommunication(db, c, channelExecutions.records) === draft.brandId,
      );
      for (const comm of inFlight) {
        communications.updateIn(comm.id, { status: "Paused", updatedAt: now });
        for (const x of channelExecutions.records) {
          if (x.communicationId === comm.id && x.status === "queued") {
            channelExecutions.updateIn(x.id, { status: "draft", updatedAt: now });
          }
        }
      }
      if (inFlight.length > 0) {
        const brandName =
          db.brands.find((b) => b.id === draft.brandId)?.name ?? draft.brandId;
        toast.warning(
          `${inFlight.length} in-flight sends frozen for ${brandName}`,
          {
            description: inFlight.map((c) => c.id).join(", "),
          },
        );
      }
    }
  };

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Governance & crisis"
        description="Crisis command center, policy guard-rails, and the full audit trail"
        actions={
          canDeclare ? (
            <Button variant="destructive" onClick={() => setDeclareOpen(true)}>
              <Siren className="mr-1.5 h-4 w-4" />
              Declare incident
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="crisis">
        <TabsList>
          <TabsTrigger value="crisis">Crisis center</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="crisis" className="mt-4 space-y-4">
          {sorted.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No crisis incidents"
              hint="Declare an incident to assemble a war room and activate the crisis approval variant."
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sorted.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    db={db}
                    incident={incident}
                    titleFor={titleFor}
                    selected={selected?.id === incident.id}
                    onSelect={() => setSelectedId(incident.id)}
                  />
                ))}
              </div>
              {selected && (
                <IncidentDetail
                  db={db}
                  incident={selected}
                  titleFor={titleFor}
                  frozenSends={frozenSendsFor(selected)}
                  runtimeAudit={runtimeAudit}
                  currentActorName={currentUser.name}
                />
              )}
            </>
          )}

          <BrandRiskCard
            assets={assets.records}
            contents={contents.records}
            approvals={approvals.records}
            incidents={incidents.records}
            titleFor={titleFor}
            subjectTitleFor={(entity, id) =>
              subjectLabel(db, entity, id, {
                contents: contents.records,
                campaigns: campaigns.records,
                communications: communications.records,
              })
            }
            onSelectIncident={setSelectedId}
          />
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <PoliciesTab db={db} policies={db.policies} />
        </TabsContent>

        <TabsContent value="exceptions" className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Policy waivers route through WF-004 Exception approval — justification
                review by the Brand Manager, elevated CMO sign-off on escalation.
              </p>
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <span>
                  <span className="font-medium text-foreground">
                    Legal and regulatory findings are never waivable by marketing
                    roles.
                  </span>{" "}
                  Only the Legal/Compliance Reviewer and the Platform Admin may
                  waive one; everyone else can request legal review, which opens a
                  Legal/Compliance approval instead of an exception.
                </span>
              </p>
            </div>
            {canRequestWaiver && (
              <Button className="shrink-0" onClick={() => setWaiverOpen(true)}>
                <FileSignature className="mr-1.5 h-4 w-4" />
                Request waiver
              </Button>
            )}
          </div>

          {legalReviewApprovals.length > 0 && (
            <WaiverTable
              db={db}
              campaigns={campaigns.records}
              waivers={legalReviewApprovals}
              title={`Routed to Legal/Compliance — no waiver granted (${legalReviewApprovals.length})`}
            />
          )}

          {waiverApprovals.length === 0 ? (
            <EmptyState
              icon={FileSignature}
              title="No waiver requests"
              hint="Request a waiver to start the WF-004 exception approval workflow for a campaign."
            />
          ) : (
            <>
              {openWaivers.length > 0 && (
                <WaiverTable
                  db={db}
                  campaigns={campaigns.records}
                  waivers={openWaivers}
                  title={`Open waiver requests (${openWaivers.length})`}
                />
              )}
              {decidedWaivers.length > 0 && (
                <WaiverTable
                  db={db}
                  campaigns={campaigns.records}
                  waivers={decidedWaivers}
                  title={`Decided waiver requests (${decidedWaivers.length})`}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditTrailTab
            db={db}
            runtimeAudit={runtimeAudit}
            currentActorName={currentUser.name}
            overrides={overrides}
          />
        </TabsContent>
      </Tabs>

      <DeclareIncidentDialog
        db={db}
        open={declareOpen}
        onOpenChange={setDeclareOpen}
        declarerName={currentUser.name}
        onDeclare={declareIncident}
      />

      <RequestWaiverDialog
        campaigns={campaigns.records}
        policies={db.policies}
        open={waiverOpen}
        onOpenChange={setWaiverOpen}
        approverName={brandManager?.name ?? "the Brand Manager"}
        role={role}
        legalReviewerName={legalReviewer?.name ?? "the Legal/Compliance Reviewer"}
        onSubmit={requestWaiver}
        onRequestLegalReview={requestLegalReview}
      />
    </div>
  );
}
