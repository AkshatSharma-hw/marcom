/**
 * Communications workspace — every communication in scope, split by commsType,
 * with per-row channel-execution detail and a quick "New communication" form.
 *
 * ABAC (blueprint): rows classified 'Restricted' stay visible to everyone, but
 * the subject renders as 'Restricted communication' unless the signed-in role
 * is Corporate Comms Manager, CMO, Executive or Platform Admin.
 *
 * A row's subject links to `/communications/:id`. It used to open a side sheet,
 * which had no URL: the record could not be linked, bookmarked, opened in a new
 * tab or returned to with the back button. CommunicationDetail is that sheet as
 * a page, and the draft editing that lived inside the sheet moved there with it.
 */

import { useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { MailPlus, Megaphone, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { getSeedDB } from "@/data/seed";
import { useLiveDB } from "@/data/useLiveDB";
import type {
  Classification,
  CommsType,
  Communication,
  Content,
  ContentType,
  SeedDB,
} from "@/data/types";
import { aiService } from "@/services/ai";
import { useCollection } from "@/store/DataStore";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { useScope } from "@/lib/scope";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ClassificationChip,
  CommsTypeChip,
} from "@/components/marcomm/CommsChips";
import {
  originOf,
  proposedCount,
  type OriginInfo,
} from "@/data/selectors/originSelectors";
import { blockerFor } from "@/data/selectors/blockerSelectors";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
/* ABAC — restricted-subject masking (blueprint rule)                  */
/* ------------------------------------------------------------------ */

const RESTRICTED_READ_ROLES = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
] as const;

const MASKED_SUBJECT = "Restricted communication";

/* ------------------------------------------------------------------ */
/* AI drafting — deterministic body via the aiService seam             */
/* ------------------------------------------------------------------ */

/** Comms type → the content shape the simulated provider drafts best. */
const CONTENT_TYPE_BY_COMMS: Record<CommsType, ContentType> = {
  external: "email",
  internal: "script",
  corporate: "PR",
  investor: "PR",
};

/**
 * Deterministic message body from subject + selected audience + brand voice.
 * Goes through `aiService.generateDraft` (the one AI seam — BLUEPRINT Part 10
 * §3) with a synthetic, never-persisted Content input, then appends the
 * audience and brand-voice lines. Same inputs, same output.
 */
function aiCommunicationBody(
  db: SeedDB,
  subject: string,
  commsType: CommsType,
  audienceId: string,
  scopeBrandId?: string,
): string {
  const audience = db.audiences.find((a) => a.id === audienceId);
  const brand =
    (scopeBrandId ? db.brands.find((b) => b.id === scopeBrandId) : undefined) ??
    db.brands[0];
  const syntheticContent: Content = {
    id: "COM-AI-DRAFT", // synthetic input only — never written to any collection
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    title: subject,
    contentType: CONTENT_TYPE_BY_COMMS[commsType],
    status: "Draft",
    classification: "Internal",
    brandId: brand?.id ?? "",
    ownerStakeholderId: "",
    workflowId: "",
  };
  const draft = aiService.generateDraft(syntheticContent, { db });
  return [
    draft.body,
    audience ? `Prepared for ${audience.name}.` : "",
    brand?.tone ? `Brand voice — ${brand.tone}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* Lineage helpers (pure over SeedDB)                                  */
/* ------------------------------------------------------------------ */

/** Campaign a communication rolls up to via its activity, if any. */
function lineageOf(db: SeedDB, comm: Communication) {
  const activity = comm.campaignActivityId
    ? db.campaignActivities.find((a) => a.id === comm.campaignActivityId)
    : undefined;
  const campaign = activity
    ? db.campaigns.find((c) => c.id === activity.campaignId)
    : undefined;
  return { activity, campaign };
}

/**
 * Origin of a communication. A communication carries no production record of
 * its own — what it sends is the content it is bound to, so its provenance is
 * that content's provenance. Communications with no linked content resolve
 * through the communication itself, which reports `manual` today.
 */
function commOrigin(db: SeedDB, comm: Communication): OriginInfo {
  return comm.contentId
    ? originOf(db, "Content", comm.contentId)
    : originOf(db, "Communication", comm.id);
}

/* ------------------------------------------------------------------ */
/* New communication dialog                                            */
/* ------------------------------------------------------------------ */

const COMMS_TYPES: CommsType[] = ["external", "internal", "corporate", "investor"];
const CLASSIFICATIONS: Classification[] = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
];

function NewCommunicationDialog({
  db,
  open,
  onOpenChange,
  ownerName,
  scopeBrandId,
  onCreate,
}: {
  db: SeedDB;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  /** Brand from the top-bar scope — anchors the AI draft's brand voice. */
  scopeBrandId?: string;
  onCreate: (draft: {
    subject: string;
    commsType: CommsType;
    classification: Classification;
    audienceId: string;
    body?: string;
  }) => void;
}) {
  const [subject, setSubject] = useState("");
  const [commsType, setCommsType] = useState<CommsType>("external");
  const [classification, setClassification] = useState<Classification>("Internal");
  const [audienceId, setAudienceId] = useState<string>(db.audiences[0]?.id ?? "");
  const [body, setBody] = useState("");

  const canSubmit = subject.trim().length > 0 && audienceId.length > 0;
  const canDraftWithAI = subject.trim().length > 0 && audienceId.length > 0;

  const draftWithAI = (): void => {
    if (!canDraftWithAI) return;
    setBody(
      aiCommunicationBody(db, subject.trim(), commsType, audienceId, scopeBrandId),
    );
  };

  const submit = (): void => {
    if (!canSubmit) return;
    onCreate({
      subject: subject.trim(),
      commsType,
      classification,
      audienceId,
      body: body.trim() ? body.trim() : undefined,
    });
    setSubject("");
    setBody("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New communication</DialogTitle>
          <DialogDescription>
            Creates a draft owned by {ownerName}. Channels and content are attached later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="comm-subject">Subject</Label>
            <Input
              id="comm-subject"
              value={subject}
              placeholder="e.g. Volt5 accessory bundle teaser"
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={commsType} onValueChange={(v) => setCommsType(v as CommsType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {COMMS_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Classification</Label>
              <Select
                value={classification}
                onValueChange={(v) => setClassification(v as Classification)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSIFICATIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select value={audienceId} onValueChange={setAudienceId}>
              <SelectTrigger>
                <SelectValue placeholder="Audience" />
              </SelectTrigger>
              <SelectContent>
                {db.audiences.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="comm-body">Message body</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={!canDraftWithAI}
                onClick={draftWithAI}
              >
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Draft with AI
              </Button>
            </div>
            <Textarea
              id="comm-body"
              value={body}
              rows={5}
              placeholder="Write the message copy, or draft it with AI from the subject, audience and brand voice."
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              AI drafting needs a subject and an audience; it is deterministic and
              always editable before you create the draft.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Owner: {ownerName} (signed-in identity)
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            <Plus className="mr-1 h-4 w-4" />
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type TabKey = "all" | CommsType;

/** Proposed-vs-authored list filter (item 1). */
type OriginFilter = "all" | "proposed" | "authored";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "external", label: "External" },
  { key: "internal", label: "Internal" },
  { key: "corporate", label: "Corporate" },
  { key: "investor", label: "Investor" },
];

export default function CommunicationsPage() {
  // Live view of the graph: approvals decided in the inbox and content statuses
  // moved elsewhere must clear the blocker chips and the "proposed" badge here
  // without a reload — reading the frozen seed left both stale.
  const db = useLiveDB();
  const { role, currentUser } = useRole();
  const { brandId, businessUnitId, regionId, setScope } = useScope();
  const communications = useCollection<Communication>(
    "communications",
    getSeedDB().communications,
  );

  /* Global search links here as `/communications?id=<COM-…>`. That used to open
     a sheet over the list; the record now has its own URL, so the query form is
     kept working by forwarding it there. `replace` so the back button returns
     to wherever the search was run from, not to a redirect that fires again. */
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get("id");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");

  // The signed-in demo identity maps to the seed stakeholder holding that role
  // (same join as the approvals inbox).
  const stakeholder = db.stakeholders.find((s) => s.role === role);

  // Agency users only see communications executed through their agency's
  // assigned activities, plus drafts they own themselves (blueprint scoping).
  const agencyScope = useMemo(() => agencyScopeForRole(db, role), [db, role]);

  // Every hook above runs unconditionally; the deep-link forward is the first
  // thing after them.
  if (deepLinkId) return <Navigate to={`/communications/${deepLinkId}`} replace />;

  const inAgencyScope = (comm: Communication): boolean => {
    if (!agencyScope) return true;
    if (stakeholder && comm.ownerStakeholderId === stakeholder.id) return true;
    return (
      comm.campaignActivityId !== undefined &&
      agencyScope.activityIds.has(comm.campaignActivityId)
    );
  };

  const canReadRestricted = (RESTRICTED_READ_ROLES as readonly string[]).includes(role);
  const subjectFor = (comm: Communication): string =>
    comm.classification === "Restricted" && !canReadRestricted
      ? MASKED_SUBJECT
      : comm.subject;

  // Scope: brand/BU/region live on the campaign reached via the communication's
  // activity. A communication without campaign lineage cannot match an active
  // scope filter (same convention as the content list).
  const inScope = (comm: Communication): boolean => {
    if (!brandId && !businessUnitId && !regionId) return true;
    const { campaign } = lineageOf(db, comm);
    if (!campaign) return false;
    if (brandId && campaign.brandId !== brandId) return false;
    if (businessUnitId && campaign.businessUnitId !== businessUnitId) return false;
    if (regionId && !campaign.regionIds.includes(regionId)) return false;
    return true;
  };

  const agencyVisible = communications.records.filter(inAgencyScope);
  const scoped = agencyVisible
    .filter(inScope)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt, DEFAULT_LOCALE));

  const scopeActive = Boolean(brandId || businessUnitId || regionId);
  const clearScope = (): void =>
    setScope({ brandId: undefined, businessUnitId: undefined, regionId: undefined });

  /**
   * Communications awaiting review because an agent produced the content they
   * send. Counted through the content records, so the number is provenance and
   * nothing else — it is zero until an agent has actually drafted something.
   */
  const proposedInScope = proposedCount(
    db,
    "Content",
    scoped.map((c) => c.contentId).filter((id): id is string => Boolean(id)),
  );

  const matchesOrigin = (comm: Communication): boolean => {
    if (originFilter === "all") return true;
    const isProposed = commOrigin(db, comm).origin === "agent";
    return originFilter === "proposed" ? isProposed : !isProposed;
  };

  const channelCount = (commId: string): number =>
    db.channelExecutions.filter((x) => x.communicationId === commId).length;
  const audienceName = (id: string): string =>
    db.audiences.find((a) => a.id === id)?.name ?? id;
  const ownerName = (id: string): string =>
    db.stakeholders.find((s) => s.id === id)?.name ?? id;

  const createDraft = (draft: {
    subject: string;
    commsType: CommsType;
    classification: Classification;
    audienceId: string;
    body?: string;
  }): void => {
    const now = new Date().toISOString();
    const id = communications.createIn(
      {
        subject: draft.subject,
        commsType: draft.commsType,
        // 'Drafting' is the draft stage of the communication lifecycle.
        status: "Drafting",
        classification: draft.classification,
        audienceId: draft.audienceId,
        ownerStakeholderId: stakeholder?.id ?? "",
        ...(draft.body !== undefined && { body: draft.body }),
        createdAt: now,
        updatedAt: now,
      },
      "COM-",
    );
    toast.success(`Created draft '${draft.subject}'`, {
      description: `${id} · owned by ${currentUser.name}`,
    });
  };

  /**
   * Why this list is empty, and what would fill it — read off the real record
   * counts at each filtering step rather than a single generic message.
   */
  const renderEmptyState = (tabKey: TabKey) => {
    const label = TABS.find((t) => t.key === tabKey)?.label ?? "All";
    const inType =
      tabKey === "all" ? scoped : scoped.filter((c) => c.commsType === tabKey);

    if (communications.records.length === 0) {
      return (
        <EmptyState
          icon={Megaphone}
          title="No communications yet"
          hint="Nothing has been drafted. Creating one needs a subject and an audience; channels and content are attached afterwards."
          action={{
            label: "New communication",
            onClick: () => setDialogOpen(true),
          }}
        />
      );
    }

    if (agencyScope && agencyVisible.length === 0) {
      return (
        <EmptyState
          icon={Megaphone}
          title="Nothing assigned to your agency yet"
          hint={`Communications reach this list through the campaign activities assigned to ${
            agencyScope.agencyName ?? "your agency"
          }, plus drafts you own. Neither exists yet — a client-side campaign manager assigns the activity.`}
        />
      );
    }

    if (scopeActive && scoped.length === 0) {
      return (
        <EmptyState
          icon={Megaphone}
          title="No communications in this scope"
          hint={`${agencyVisible.length} visible in total, but none rolls up to a campaign matching the current brand, business unit and region scope. Standalone communications never match an active scope.`}
          action={{ label: "Clear scope filters", onClick: clearScope }}
        />
      );
    }

    if (inType.length === 0) {
      return (
        <EmptyState
          icon={Megaphone}
          title={`No ${label.toLowerCase()} communications in this scope`}
          hint={`This tab shows only communications typed '${tabKey}'. The ${scoped.length} in scope are all of other types.`}
          action={{ label: "Show all types", onClick: () => setTab("all") }}
        />
      );
    }

    return (
      <EmptyState
        icon={Megaphone}
        title={
          originFilter === "proposed"
            ? "Nothing proposed awaiting review"
            : "Everything here was proposed by an agent"
        }
        hint={
          originFilter === "proposed"
            ? `All ${inType.length} communications in this view were either authored by a person or produced by an agent and since accepted. A row lands here when an agent drafts the content the communication sends and nobody has approved it yet.`
            : `All ${inType.length} communications in this view send agent-drafted content that is still awaiting review.`
        }
        action={{ label: "Show all origins", onClick: () => setOriginFilter("all") }}
      />
    );
  };

  const renderTable = (rows: Communication[], tabKey: TabKey) =>
    rows.length === 0 ? (
      renderEmptyState(tabKey)
    ) : (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-64">Status</TableHead>
                <TableHead className="w-32">Classification</TableHead>
                <TableHead className="w-44">Audience</TableHead>
                <TableHead className="w-40">Owner</TableHead>
                <TableHead className="w-32">Scheduled</TableHead>
                <TableHead className="w-24 text-right">Channels</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const masked = subjectFor(c) === MASKED_SUBJECT && c.classification === "Restricted";
                const origin = commOrigin(db, c);
                return (
                  <TableRow key={c.id} className={proposedRowClass(origin.origin)}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* A real link, not a click handler on the row: it is
                            keyboard reachable, cmd-click opens the record in a
                            new tab, and the URL can be shared. A masked row
                            still links — the page masks it the same way. */}
                        <Link
                          to={`/communications/${c.id}`}
                          className={cn(
                            "text-left font-medium hover:underline",
                            masked ? "italic text-muted-foreground" : "text-primary",
                          )}
                        >
                          {subjectFor(c)}
                        </Link>
                        <OriginChip info={origin} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{c.id}</div>
                    </TableCell>
                    <TableCell>
                      <CommsTypeChip commsType={c.commsType} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                      <BlockerLine
                        blocker={blockerFor(db, "Communication", c.id, c.status)}
                        className="mt-1 flex max-w-[15rem]"
                      />
                    </TableCell>
                    <TableCell>
                      <ClassificationChip classification={c.classification} />
                    </TableCell>
                    <TableCell className="text-sm">{audienceName(c.audienceId)}</TableCell>
                    <TableCell className="text-sm">
                      {ownerName(c.ownerStakeholderId)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {c.scheduledAt ? fmtDate(c.scheduledAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {channelCount(c.id)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Communications"
        description="Planned and in-flight communications across every channel"
        actions={
          <>
            {proposedInScope > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {proposedInScope} proposed awaiting review
              </span>
            )}
            <Button onClick={() => setDialogOpen(true)}>
              <MailPlus className="mr-1.5 h-4 w-4" />
              New communication
            </Button>
          </>
        }
      />

      {agencyScope && (
        <p className="text-xs text-muted-foreground">
          Showing records assigned to {agencyScope.agencyName ?? "your agency"}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {/*
            The origin filter appears once the list actually holds an
            agent-proposed row. Origin is real provenance, so before that the
            filter could only ever return the same list.
          */}
          {proposedInScope > 0 && (
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
                {/* The complement of proposed, so it also holds agent-produced
                    rows a person has since accepted — those keep the sparkle
                    marker, and "Authored" alone read as a contradiction. */}
                <SelectItem value="authored">Authored or accepted</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-4">
            {renderTable(
              (t.key === "all"
                ? scoped
                : scoped.filter((c) => c.commsType === t.key)
              ).filter(matchesOrigin),
              t.key,
            )}
          </TabsContent>
        ))}
      </Tabs>

      {dialogOpen && (
        <NewCommunicationDialog
          db={db}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          ownerName={currentUser.name}
          scopeBrandId={brandId}
          onCreate={createDraft}
        />
      )}
    </div>
  );
}
