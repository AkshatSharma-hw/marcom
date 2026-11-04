/**
 * Routed detail page for one Communication — `/communications/:id`.
 *
 * This replaces the side sheet the Communications workspace used to open. A
 * sheet has no URL, so a communication could not be linked, bookmarked, opened
 * in a new tab or returned to with the back button. Everything the sheet
 * showed is here, plus the two things it could not fit: the versions of the
 * linked content, and which version each channel execution actually carries.
 *
 * ABAC (blueprint), carried over from the list unchanged:
 *  - a 'Restricted' communication stays *reachable* by id, but its subject and
 *    body render masked unless the signed-in role may read restricted comms;
 *  - the audit trail is suppressed while masked, because event details quote
 *    the subject and would defeat the masking;
 *  - an Agency User sees a communication only through an activity assigned to
 *    their agency, or a draft they own themselves — anything else reads as
 *    out of scope, not as missing.
 */

import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Lock, Megaphone, Pencil } from "lucide-react";
import { toast } from "sonner";

import { getSeedDB } from "@/data/seed";
import { useLiveDB } from "@/data/useLiveDB";
import { useCollection } from "@/store/DataStore";
import type {
  Communication,
  SeedDB,
} from "@/data/types";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { originOf, type OriginInfo } from "@/data/selectors/originSelectors";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { fmtDate } from "@/lib/format";
import {
  ClassificationChip,
  CommsTypeChip,
} from "@/components/marcomm/CommsChips";
import { DEFAULT_LOCALE } from "@/lib/i18n";

import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { OriginChip } from "@/components/marcomm/OriginChip";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/* ABAC — restricted masking (identical rule to CommunicationsPage)    */
/* ------------------------------------------------------------------ */

const RESTRICTED_READ_ROLES = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
] as const;

const MASKED_SUBJECT = "Restricted communication";
const MASKED_BODY = "Restricted — message body hidden for your role.";

/** Roles that may edit any drafting communication (beyond its owner). */
const EDIT_ANY_ROLES = ["Corporate Comms Manager", "Platform Admin"] as const;

/* ------------------------------------------------------------------ */
/* Derivations (pure over SeedDB)                                      */
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
 * that content's provenance. Same rule as the list, so the chip cannot differ
 * between the row and the page it opens.
 */
function commOrigin(db: SeedDB, comm: Communication): OriginInfo {
  return comm.contentId
    ? originOf(db, "Content", comm.contentId)
    : originOf(db, "Communication", comm.id);
}

/* ------------------------------------------------------------------ */
/* Edit draft dialog                                                   */
/* ------------------------------------------------------------------ */

function EditCommunicationDialog({
  comm,
  onSave,
  onClose,
}: {
  comm: Communication;
  onSave: (patch: { subject: string; body?: string }) => void;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(comm.subject);
  const [body, setBody] = useState(comm.body ?? "");
  const canSave = subject.trim().length > 0;

  const save = (): void => {
    if (!canSave) return;
    onSave({
      subject: subject.trim(),
      body: body.trim() ? body.trim() : undefined,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit draft</DialogTitle>
          <DialogDescription>
            {comm.id} · update the subject and message body while the
            communication is still drafting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="edit-comm-subject">Subject</Label>
            <Input
              id="edit-comm-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-comm-body">Message body</Label>
            <Textarea
              id="edit-comm-body"
              value={body}
              rows={6}
              placeholder="Message copy (optional)"
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CommunicationDetail() {
  const db = useLiveDB();
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();
  // Write handle only — reads go through useLiveDB, which is backed by the
  // same "communications" collection id.
  const communications = useCollection<Communication>(
    "communications",
    getSeedDB().communications,
  );
  const [editing, setEditing] = useState(false);

  const comm = db.communications.find((c) => c.id === id);

  // Agency users reach a communication through an activity assigned to their
  // agency, or through a draft they own. Same predicate as the list, so a page
  // cannot become a way around the list's scoping.
  const agencyScope = agencyScopeForRole(db, role);
  const stakeholder = db.stakeholders.find((s) => s.role === role);
  const inAgencyScope =
    !agencyScope ||
    (comm !== undefined &&
      ((stakeholder !== undefined && comm.ownerStakeholderId === stakeholder.id) ||
        (comm.campaignActivityId !== undefined &&
          agencyScope.activityIds.has(comm.campaignActivityId))));

  if (!comm || !inAgencyScope) {
    return (
      <RecordNotFound
        icon={Megaphone}
        noun="communication"
        id={id}
        backTo="/communications"
        backLabel="communications"
        outOfScope={comm !== undefined}
        scopeHint={agencyScope?.agencyName ?? undefined}
      />
    );
  }

  const canReadRestricted = (RESTRICTED_READ_ROLES as readonly string[]).includes(role);
  const masked = comm.classification === "Restricted" && !canReadRestricted;
  const subject = masked ? MASKED_SUBJECT : comm.subject;

  const { activity, campaign } = lineageOf(db, comm);
  const audience = db.audiences.find((a) => a.id === comm.audienceId);
  const owner = db.stakeholders.find((s) => s.id === comm.ownerStakeholderId);
  const content = comm.contentId
    ? db.contents.find((c) => c.id === comm.contentId)
    : undefined;

  const executions = db.channelExecutions
    .filter((x) => x.communicationId === comm.id)
    .slice()
    .sort((a, b) =>
      (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "", DEFAULT_LOCALE),
    );

  /* Versions of the linked content, newest first — the copy this
     communication can actually put on a channel. Executions point at one of
     these by id, so the table below can say which version each send carries
     instead of printing a bare identifier. */
  const versions = content
    ? db.contentVersions
        .filter((v) => v.contentId === content.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt, DEFAULT_LOCALE))
    : [];
  const versionLabel = (versionId: string): string => {
    const v = versions.find((candidate) => candidate.id === versionId);
    return v ? `${v.versionNumber} · ${v.locale}` : versionId;
  };
  /** Version ids actually carried by a send — drives the "in flight" marker. */
  const scheduledVersionIds = new Set(
    executions
      .map((x) => x.contentVersionId)
      .filter((vid): vid is string => Boolean(vid)),
  );

  const origin = commOrigin(db, comm);
  const blocker = blockerFor(db, "Communication", comm.id, comm.status);
  const channelName = (cid: string): string =>
    db.channels.find((ch) => ch.id === cid)?.name ?? cid;
  const channelKind = (cid: string): string =>
    db.channels.find((ch) => ch.id === cid)?.channelKind ?? "channel";

  /**
   * Draft editing — same rule the list applied from inside its sheet: the
   * owner may edit their own draft, Corporate Comms Manager and Platform Admin
   * may edit any, and a masked Restricted row is never editable (editing would
   * expose the subject and body the mask hides).
   */
  const canEdit =
    comm.status === "Drafting" &&
    !masked &&
    ((EDIT_ANY_ROLES as readonly string[]).includes(role) ||
      (stakeholder !== undefined && comm.ownerStakeholderId === stakeholder.id));

  const saveDraft = (patch: { subject: string; body?: string }): void => {
    communications.updateIn(comm.id, {
      subject: patch.subject,
      body: patch.body,
      updatedAt: new Date().toISOString(),
    });
    toast.success(`Updated draft '${patch.subject}'`, {
      description: `${comm.id} · subject and body saved`,
    });
  };

  const facts: { label: string; node: ReactNode }[] = [
    { label: "Type", node: <CommsTypeChip commsType={comm.commsType} /> },
    {
      label: "Classification",
      node: <ClassificationChip classification={comm.classification} />,
    },
    {
      label: "Audience",
      node: audience ? (
        <Link
          to={`/audiences/${audience.id}`}
          className="text-sm text-primary hover:underline"
        >
          {audience.name}
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">{comm.audienceId}</span>
      ),
    },
    {
      label: "Owner",
      node: <span className="text-sm">{owner?.name ?? comm.ownerStakeholderId}</span>,
    },
    {
      label: "Scheduled",
      node: (
        <span className="text-sm tabular-nums">
          {comm.scheduledAt ? fmtDate(comm.scheduledAt) : "Not scheduled"}
        </span>
      ),
    },
    {
      label: "Campaign",
      node: campaign ? (
        <Link
          to={`/campaigns/${campaign.id}`}
          className="text-sm text-primary hover:underline"
        >
          {campaign.name}
        </Link>
      ) : (
        <span className="text-sm text-muted-foreground">Standalone</span>
      ),
    },
  ];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="Communication"
        id={comm.id}
        title={subject}
        description={`${comm.classification} · ${comm.commsType}`}
        status={comm.status}
        blocker={blocker}
        backTo="/communications"
        backLabel="Communications"
        chipPrefix={<OriginChip info={origin} />}
        actions={
          canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit draft
            </Button>
          ) : undefined
        }
      />

      {/* Key facts */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 md:grid-cols-3 lg:grid-cols-6">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {f.label}
              </div>
              <div className="mt-0.5 truncate">{f.node}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- */}
        {/* Overview — the message, its lineage and its copy            */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Message body</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {comm.body === undefined ? (
                <p className="text-sm text-muted-foreground">
                  No copy written on the communication itself. Message bodies are
                  recorded here for high-profile comms; everything else sends the
                  body of the content version each channel execution carries.
                </p>
              ) : masked ? (
                <p className="flex items-center gap-1.5 rounded-md border border-dashed p-3 text-xs italic text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  {MASKED_BODY}
                </p>
              ) : (
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                  {comm.body}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Campaign lineage</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {campaign && activity ? (
                  <div className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="min-w-0 truncate text-sm font-medium text-primary hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <StatusBadge status={campaign.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      via activity “{activity.name}” ({activity.id})
                    </div>
                    <BlockerLine
                      blocker={blockerFor(
                        db,
                        "CampaignActivity",
                        activity.id,
                        activity.status,
                      )}
                      className="mt-1 flex max-w-full"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Standalone communication — no campaign activity, so it carries
                    no campaign budget, brand or region and never matches a scope
                    filter on the list.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Linked content</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {content ? (
                  <div className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/content/${content.id}`}
                        className="min-w-0 truncate text-sm font-medium text-primary hover:underline"
                      >
                        {content.title}
                      </Link>
                      <StatusBadge status={content.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {content.contentType} · {content.id}
                    </div>
                    <BlockerLine
                      blocker={blockerFor(db, "Content", content.id, content.status)}
                      className="mt-1 flex max-w-full"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No content linked yet — this communication sends the body
                    written on it. Linking content happens on the content record.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Versions of the linked content */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Content versions{versions.length > 0 && ` (${versions.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {!content ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Versions belong to content, and no content is linked to this
                  communication — so there is no copy to version.
                </div>
              ) : versions.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  “{content.title}” has no versions yet. A channel execution
                  carries a version, so nothing can be sent until one is drafted
                  on the content record.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Version</TableHead>
                      <TableHead className="w-24">Locale</TableHead>
                      <TableHead>Copy</TableHead>
                      <TableHead className="w-44">In this send</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          <Link
                            to={`/content/${content.id}`}
                            className="text-primary hover:underline"
                          >
                            {v.versionNumber}
                          </Link>
                          {content.currentVersionId === v.id && (
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              current
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{v.locale}</TableCell>
                        <TableCell className="max-w-0">
                          <span className="block truncate text-sm text-muted-foreground">
                            {v.body}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {scheduledVersionIds.has(v.id)
                            ? "Carried by a channel execution"
                            : "Not on a channel execution"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Delivery — one row per (communication × channel)            */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Channel executions ({executions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {executions.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Megaphone}
                    title="No channel executions yet"
                    hint={`One execution is created per channel when the communication is scheduled — this one is ${comm.status.toLowerCase()}${
                      comm.scheduledAt ? "" : " and has no send date"
                    }.`}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="w-28">Kind</TableHead>
                      <TableHead className="w-36">Scheduled</TableHead>
                      <TableHead className="w-44">Version carried</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((x) => (
                      <TableRow key={x.id}>
                        <TableCell className="font-medium">
                          {channelName(x.channelId)}
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {x.id}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {channelKind(x.channelId)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {x.scheduledAt ? fmtDate(x.scheduledAt) : "Unscheduled"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {x.contentVersionId ? (
                            content ? (
                              <Link
                                to={`/content/${content.id}`}
                                className="text-primary hover:underline"
                              >
                                {versionLabel(x.contentVersionId)}
                              </Link>
                            ) : (
                              versionLabel(x.contentVersionId)
                            )
                          ) : (
                            <span className="text-muted-foreground">
                              Sends the message body
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={x.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* The audit trail quotes subjects in its event details, so on a masked
          Restricted record it is suppressed rather than rendered — the same
          rule the sheet applied. */}
      {masked ? (
        <p className="text-xs text-muted-foreground">
          Audit trail hidden — event details quote the subject of a Restricted
          communication.
        </p>
      ) : (
        <RecordAuditTrail entity="Communication" id={comm.id} />
      )}

      {editing && (
        <EditCommunicationDialog
          comm={comm}
          onSave={saveDraft}
          onClose={() => setEditing(false)}
        />
      )}
    </RecordDetailPage>
  );
}
