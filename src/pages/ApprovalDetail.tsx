/**
 * /approvals/:id — the routed approval record.
 *
 * The approvals inbox is the highest-traffic screen in the product and had no
 * drill-down at all: a row carried a subject, an SLA date and three buttons,
 * and there was nowhere to go to see what was actually being decided. This is
 * that page — subject, stage, approver, SLA position, comment, the AI review
 * findings on the subject, and the decision controls.
 *
 * The decision path is NOT reimplemented here. `useApprovalDecisions` is the
 * one engine both surfaces use, so the GR-09 segregation-of-duties rule the
 * inbox enforces holds identically on this route: a detail page must not be a
 * way around it.
 */

import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  CheckSquare,
  ClipboardCheck,
  Megaphone,
  MessageSquare,
  MessageSquareWarning,
  ScanSearch,
  ShieldAlert,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { getSeedDB } from "@/data/seed";
import { useCollection } from "@/store/DataStore";
import type { AIReview, Approval, EntityName } from "@/data/types";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { DEMO_NOW_ISO, DEMO_NOW_MS } from "@/data/selectors/campaignSelectors";
import { originOf } from "@/data/selectors/originSelectors";
import { useRole, canSeeNav, type AppRole } from "@/lib/rbac";
import { agencyScopeForRole, type AgencyScope } from "@/lib/agencyScope";
import { fmtDate, fmtStamp } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  PENDING,
  SLA_BOARD_ROLES,
  SOD_NOTE,
  useApprovalDecisions,
} from "@/lib/useApprovalDecisions";
import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { OriginChip } from "@/components/marcomm/OriginChip";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { ReviewFindings } from "@/components/marcomm/ReviewFindings";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two instants, floored at zero. */
function daysBetween(fromMs: number, toMs: number): number {
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0;
  return Math.max(0, Math.floor((toMs - fromMs) / MS_PER_DAY));
}

/**
 * Where the subject of an approval lives, when it has a route of its own.
 *
 * Only routes that exist are returned; everything else renders as plain text
 * rather than a link that 404s. Nav-gated destinations are checked against the
 * signed-in role first, so this never offers a door the role cannot open.
 */
function subjectRoute(
  entity: EntityName,
  id: string,
  role: AppRole,
  contentIdForVersion: string | undefined,
): string | null {
  switch (entity) {
    case "Campaign":
      return `/campaigns/${id}`;
    case "Content":
      return `/content/${id}`;
    case "ContentVersion":
      // A version has no route of its own; its parent content item does.
      return contentIdForVersion ? `/content/${contentIdForVersion}` : null;
    case "Communication":
      return `/communications/${id}`;
    case "Asset":
      return `/assets/${id}`;
    case "Budget":
      return canSeeNav(role, "budget") ? "/budget" : null;
    default:
      return null;
  }
}

/**
 * Whether an agency-scoped user may see this approval's subject at all.
 *
 * The scope is the one `agencyScope.ts` derives from activity assignment. An
 * entity the blueprint keeps away from agencies entirely (Budget, Brand,
 * Audience) is out of scope by omission — the switch fails closed.
 */
function subjectInAgencyScope(
  scope: AgencyScope,
  approval: Approval,
  parentContentId: string | undefined,
  briefCampaignId: string | undefined,
  activityId: string | undefined,
): boolean {
  switch (approval.subjectEntity) {
    case "Campaign":
      return scope.campaignIds.has(approval.subjectId);
    case "CampaignActivity":
      return activityId !== undefined && scope.activityIds.has(activityId);
    case "Content":
      return scope.contentIds.has(approval.subjectId);
    case "ContentVersion":
      return parentContentId !== undefined && scope.contentIds.has(parentContentId);
    case "Asset":
      return scope.assetIds.has(approval.subjectId);
    case "Brief":
      return briefCampaignId !== undefined && scope.campaignIds.has(briefCampaignId);
    default:
      return false;
  }
}

export default function ApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const liveDb = useLiveDB();
  const { role } = useRole();
  const {
    db,
    stakeholder,
    approvals,
    subjectTitle,
    approverName,
    stageName,
    subjectOwnerStakeholderId,
    ownsSubject,
    decide,
  } = useApprovalDecisions();
  /* Reviews are a runtime-only collection (the dataset seeds none), so they
     must be read through the store — reading `db.aiReviews` alone would miss a
     check run minutes ago on the content record this approval is holding. */
  const reviews = useCollection<AIReview>("aiReviews", getSeedDB().aiReviews);

  const approval = approvals.records.find((a) => a.id === id);

  // Subject lookups needed before the scope test, so they are resolved against
  // the live DB up front and reused below.
  const parentContentId = approval
    ? db.contentVersions.find((v) => v.id === approval.subjectId)?.contentId
    : undefined;
  const briefCampaignId = approval
    ? db.briefs.find((b) => b.id === approval.subjectId)?.campaignId
    : undefined;
  const subjectActivity = approval
    ? db.campaignActivities.find((a) => a.id === approval.subjectId)
    : undefined;
  const activityId = subjectActivity?.id;

  const agencyScope = agencyScopeForRole(db, role);

  if (!approval) {
    return (
      <RecordNotFound
        icon={CheckSquare}
        noun="approval"
        id={id}
        backTo="/approvals"
        backLabel="approvals"
      />
    );
  }

  /* Two separate gates, both of which produce the "not available" screen.
     (a) An agency user may only reach an approval whose subject is inside the
         agency's assigned slice.
     (b) Everyone else sees an approval that is theirs to decide, one whose
         subject they own (they raised it and are waiting on it), or — for the
         roles with org-wide SLA visibility — any of them. */
  const outOfAgencyScope =
    agencyScope !== null &&
    !subjectInAgencyScope(
      agencyScope,
      approval,
      parentContentId,
      briefCampaignId,
      activityId,
    );

  const isMine =
    stakeholder !== undefined && approval.approverStakeholderId === stakeholder.id;
  const ownsThisSubject = ownsSubject(approval);
  const hasBoardView = SLA_BOARD_ROLES.includes(role);
  const outOfRoleScope = !isMine && !ownsThisSubject && !hasBoardView;

  if (outOfAgencyScope || outOfRoleScope) {
    return (
      <RecordNotFound
        icon={CheckSquare}
        noun="approval"
        id={id}
        backTo="/approvals"
        backLabel="approvals"
        outOfScope
        scopeHint={
          outOfAgencyScope
            ? (agencyScope?.agencyName ?? "your agency")
            : `${approverName(approval.approverStakeholderId)}'s queue — you are signed in as ${role}, which sees its own queue and the items it owns`
        }
      />
    );
  }

  const title = subjectTitle(approval.subjectEntity, approval.subjectId);
  const stage = db.workflowStages.find((s) => s.id === approval.workflowStageId);
  const workflow = stage
    ? db.workflows.find((w) => w.id === stage.workflowId)
    : undefined;
  const origin = originOf(db, approval.subjectEntity, approval.subjectId);
  const route = subjectRoute(
    approval.subjectEntity,
    approval.subjectId,
    role,
    parentContentId,
  );

  /* A Brief and a CampaignActivity have no record page of their own, so the
     nearest real route is the campaign that owns them. It is labelled as the
     parent rather than offered as the subject — the link goes somewhere true,
     just not to the thing being decided. */
  const parentCampaignId =
    approval.subjectEntity === "Brief"
      ? briefCampaignId
      : approval.subjectEntity === "CampaignActivity"
        ? subjectActivity?.campaignId
        : undefined;
  const parentCampaign =
    parentCampaignId !== undefined && route === null
      ? db.campaigns.find((c) => c.id === parentCampaignId)
      : undefined;

  const pending = PENDING.includes(approval.status);
  const decided = approval.decidedAt !== undefined;

  // ── SLA, measured on the demo clock every other SLA surface uses ──
  const createdMs = Date.parse(approval.createdAt);
  const dueMs = Date.parse(approval.slaDueAt);
  const decidedMs = approval.decidedAt ? Date.parse(approval.decidedAt) : Number.NaN;
  /* A decided approval's clock stopped when it was decided; a pending one is
     still running against the demo now. Measuring a closed approval against
     "now" would report months of waiting on something settled in a day. */
  const asOfMs = decided && !Number.isNaN(decidedMs) ? decidedMs : DEMO_NOW_MS;
  const waitedDays = daysBetween(createdMs, asOfMs);
  const breached = !Number.isNaN(dueMs) && dueMs < asOfMs;
  const overdueDays = breached ? daysBetween(dueMs, asOfMs) : 0;
  const remainingDays = !breached && !Number.isNaN(dueMs) ? daysBetween(asOfMs, dueMs) : 0;
  const slaWindowMs = dueMs - createdMs;
  const elapsedPct =
    Number.isFinite(slaWindowMs) && slaWindowMs > 0
      ? Math.min(100, Math.max(0, ((asOfMs - createdMs) / slaWindowMs) * 100))
      : 0;

  /* The header blocker. `blockerFor(db, 'Approval', …)` has no rule for an
     approval's own statuses and correctly returns null, so where the subject's
     blocker resolves to THIS approval it is used instead — that string ("
     awaiting Legal review · Ingrid Halvorsen · 3 days · SLA breached") is
     precisely the state of this record. Its deep link is stripped, because it
     would point at the page you are already on. Where the subject's blocker
     resolves to a different approval, the record's own (null) blocker stands
     rather than borrowing another approval's story. */
  const subjectBlocker = blockerFor(db, approval.subjectEntity, approval.subjectId);
  const headerBlocker =
    subjectBlocker?.approvalId === approval.id
      ? { ...subjectBlocker, approvalId: undefined }
      : blockerFor(db, "Approval", approval.id, approval.status);

  const facts: { label: string; value: string }[] = [
    { label: "Subject type", value: approval.subjectEntity },
    { label: "Stage", value: stage?.name ?? approval.workflowStageId },
    {
      label: "Workflow",
      value: workflow ? `${workflow.name} v${workflow.version}` : "Not resolved",
    },
    { label: "Approver", value: approverName(approval.approverStakeholderId) },
    { label: "Requested", value: fmtDate(approval.createdAt) },
    { label: "SLA due", value: fmtDate(approval.slaDueAt) },
  ];
  if (approval.decidedAt) {
    facts.push({ label: "Decided", value: fmtDate(approval.decidedAt) });
  }

  const subjectOwnerId = subjectOwnerStakeholderId(approval);
  const subjectOwnerName = subjectOwnerId ? approverName(subjectOwnerId) : null;

  /* Decision rights, in the order they are checked:
       1. the approval must still be open,
       2. it must be assigned to the signed-in stakeholder,
       3. GR-09 — they must not own the subject.
     `decide()` re-applies (3) itself, so the buttons and the mutation cannot
     drift apart. */
  const canDecide = pending && isMine && !ownsThisSubject;

  const runDecision = (status: Approval["status"], verb: string): void => {
    // Back to the inbox on success: the queue is where the effect of the
    // decision shows — this row leaves it, and the subject's new status is
    // already live in the store the list reads.
    if (decide(approval, status, verb)) navigate("/approvals");
  };

  // ── AI review findings on the subject ──
  /* Which version was reviewed: the one the approval names, or — when the
     subject IS a version — the subject itself. */
  const reviewedVersionId =
    approval.subjectVersionId ??
    (approval.subjectEntity === "ContentVersion" ? approval.subjectId : undefined);
  /* Reviews are stored against the CONTENT id with the version in
     `subjectVersionId`, so a ContentVersion approval has to resolve its parent
     before it can find its own findings. */
  const reviewContentId =
    approval.subjectEntity === "Content" ? approval.subjectId : parentContentId;
  const subjectReviews = reviews.records
    .filter((r) => r.subjectId === (reviewContentId ?? approval.subjectId))
    .slice()
    .sort((a, b) => b.ranAt.localeCompare(a.ranAt, DEFAULT_LOCALE));
  const latestReview =
    (reviewedVersionId
      ? subjectReviews.find((r) => r.subjectVersionId === reviewedVersionId)
      : undefined) ?? subjectReviews[0];
  const reviewedVersion = latestReview?.subjectVersionId
    ? db.contentVersions.find((v) => v.id === latestReview.subjectVersionId)
    : undefined;
  const reviewedContent = latestReview
    ? db.contents.find((c) => c.id === latestReview.subjectId)
    : undefined;
  const reviewIsAboutContent =
    approval.subjectEntity === "Content" || approval.subjectEntity === "ContentVersion";
  const blockingFindings =
    latestReview?.findings.filter((f) => f.severity === "block").length ?? 0;

  // ── Related records ──
  /** Every other approval raised on the same subject, oldest stage first. */
  const siblingApprovals = approvals.records
    .filter(
      (a) =>
        a.id !== approval.id &&
        a.subjectEntity === approval.subjectEntity &&
        a.subjectId === approval.subjectId,
    )
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt, DEFAULT_LOCALE));

  /** The stages of the workflow this approval sits in, in running order. */
  const workflowStages = workflow
    ? db.workflowStages
        .filter((s) => s.workflowId === workflow.id)
        .slice()
        .sort((a, b) => a.order - b.order)
    : [];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={liveDb}
        entity="Approval"
        id={approval.id}
        title={title}
        description={`${approval.subjectEntity} · ${stage?.name ?? approval.workflowStageId}`}
        status={approval.status}
        blocker={headerBlocker}
        backTo="/approvals"
        backLabel="Approvals"
        chipPrefix={<OriginChip info={origin} />}
      />

      {/* Key facts */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 md:grid-cols-3 lg:grid-cols-6">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {f.label}
              </div>
              <div className="mt-0.5 truncate text-sm" title={f.value}>
                {f.value}
              </div>
            </div>
          ))}
          <div className="col-span-2 flex flex-wrap items-center gap-2 border-t pt-3 md:col-span-3 lg:col-span-6">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Under review
            </span>
            {route ? (
              <Link
                to={route}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
                {title}
              </Link>
            ) : (
              <span className="text-sm" title={approval.subjectId}>
                {title}{" "}
                <span className="text-muted-foreground">
                  ({approval.subjectEntity} {approval.subjectId} has no record page yet)
                </span>
              </span>
            )}
            {parentCampaign && (
              <Link
                to={`/campaigns/${parentCampaign.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Megaphone className="h-3 w-3" aria-hidden="true" />
                on {parentCampaign.name}
              </Link>
            )}
            {subjectOwnerName && (
              <span className="text-xs text-muted-foreground">
                owned by {subjectOwnerName}
              </span>
            )}
            {/* Only when something OTHER than this approval is holding the
                subject up. When it is this one, the line already sits in the
                header and its deep link would point at this very page. */}
            {subjectBlocker?.approvalId !== approval.id && (
              <BlockerLine blocker={subjectBlocker} className="ml-auto" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── SLA ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Service level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="tabular-nums">
              {waitedDays === 1 ? "1 day" : `${waitedDays} days`}{" "}
              <span className="text-muted-foreground">
                {decided ? "from request to decision" : "waiting so far"}
              </span>
            </span>
            {/* A closed approval's SLA is history, an open one's is a
                deadline. Saying "1 day of SLA left" about something decided
                three months ago reads as though it were still running. */}
            {breached ? (
              <span className="text-xs font-medium tabular-nums text-destructive">
                {decided
                  ? `Decided ${overdueDays === 1 ? "1 day" : `${overdueDays} days`} past SLA`
                  : `SLA breached by ${overdueDays === 1 ? "1 day" : `${overdueDays} days`}`}
              </span>
            ) : (
              <span className="text-xs tabular-nums text-muted-foreground">
                {decided
                  ? remainingDays === 0
                    ? "Decided on the due day"
                    : `Decided with ${remainingDays === 1 ? "1 day" : `${remainingDays} days`} to spare`
                  : remainingDays === 0
                    ? "Due today"
                    : `${remainingDays === 1 ? "1 day" : `${remainingDays} days`} of SLA left`}
              </span>
            )}
          </div>
          <Progress value={elapsedPct} className="h-2" />
          <div className="flex flex-wrap justify-between gap-2 text-xs tabular-nums text-muted-foreground">
            <span>Requested {fmtStamp(approval.createdAt)}</span>
            <span>Due {fmtStamp(approval.slaDueAt)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {decided
              ? `Decided ${fmtStamp(approval.decidedAt ?? approval.updatedAt)}; the SLA clock stopped there.`
              : `Measured against the demo clock, ${fmtDate(DEMO_NOW_ISO)} — the same instant the inbox SLA board and every blocker chip use.`}
            {stage ? ` Stage SLA is ${stage.slaHours} hours from request.` : ""}
          </p>
        </CardContent>
      </Card>

      {/* ── Decision ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          {decided || !pending ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <StatusBadge status={approval.status} />
              <span className="text-muted-foreground">
                {approval.decidedAt
                  ? `recorded ${fmtStamp(approval.decidedAt)}`
                  : `no decision timestamp was recorded against this ${approval.status.toLowerCase()} approval`}
                . This approval is closed — a further decision on{" "}
                {title} needs a new request raised by its workflow stage.
              </span>
            </div>
          ) : canDecide ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => runDecision("Approved", "Approved")}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    runDecision("Changes Requested", "Requested changes on")
                  }
                >
                  <MessageSquareWarning className="mr-1 h-3.5 w-3.5" />
                  Request changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => runDecision("Rejected", "Rejected")}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {blockingFindings > 0
                  ? `The check below holds ${blockingFindings} blocking finding${blockingFindings === 1 ? "" : "s"} against this ${approval.subjectEntity.toLowerCase()} — weigh them before approving. `
                  : ""}
                Deciding moves {title} on and returns you to the queue.
              </p>
            </>
          ) : ownsThisSubject ? (
            <div className="flex items-start gap-2 text-sm">
              <ShieldAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-muted-foreground">
                {SOD_NOTE}. This approval is assigned to{" "}
                {approverName(approval.approverStakeholderId)}
                {isMine ? ", which is you — so it cannot be decided at all until it is reassigned" : ""}
                .
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This approval is waiting on{" "}
              {approverName(approval.approverStakeholderId)}
              {stage ? ` at the ${stage.name} stage (${stage.assigneeRole})` : ""}, not
              on you. You can read it because{" "}
              {ownsThisSubject
                ? "you own the subject"
                : hasBoardView
                  ? `${role} carries org-wide SLA visibility`
                  : "it is in your scope"}
              , but only the assigned approver decides it.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Comment ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Comment</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {approval.comment ? (
            <p className="whitespace-pre-wrap text-sm">{approval.comment}</p>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No comment recorded"
              hint={`A comment is written when the request is raised or the decision is taken, and neither carried one on ${approval.id}. ${
                pending
                  ? "One can still be added with the decision."
                  : "The decision was recorded without a note."
              }`}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Brand & compliance check on the subject ──────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Brand &amp; compliance check
            {reviewedVersion ? ` — ${reviewedVersion.versionNumber}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {latestReview ? (
            <ReviewFindings
              review={latestReview}
              policies={db.policies}
              reviewedText={
                reviewedContent && reviewedVersion
                  ? `${reviewedContent.title}\n${reviewedVersion.body}`
                  : undefined
              }
            />
          ) : (
            <EmptyState
              icon={ScanSearch}
              title="No check has been run"
              hint={
                reviewIsAboutContent
                  ? "The brand and compliance check is run on demand from the content record and is never seeded, so an item can reach approval without one. Run it on the content item and the findings appear here."
                  : `The check reads content copy against the policy set, and this approval's subject is a ${approval.subjectEntity.toLowerCase()}, which carries none — so there are no findings to weigh, only the record itself.`
              }
              actionSlot={
                reviewIsAboutContent && route ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={route}>Open the content record</Link>
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      {/* ── Related records ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Other approvals on this subject
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {siblingApprovals.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="No other approvals"
                hint={`${approval.id} is the only approval raised against ${title} — it has passed through no other stage of ${workflow ? workflow.name : "a workflow"}.`}
              />
            ) : (
              <ul className="space-y-2">
                {siblingApprovals.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="min-w-0">
                      <Link
                        to={`/approvals/${a.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {stageName(a.workflowStageId)}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {a.id} · {approverName(a.approverStakeholderId)} · due{" "}
                        <span className="tabular-nums">{fmtDate(a.slaDueAt)}</span>
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {workflow ? `${workflow.name} · stages` : "Workflow"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {workflowStages.length === 0 ? (
              <EmptyState
                icon={WorkflowIcon}
                title="No workflow resolved"
                hint={`Stage ${approval.workflowStageId} does not resolve to a stage in this workspace, so the route this approval belongs to cannot be drawn. The approval still stands on its own record.`}
              />
            ) : (
              <ol className="space-y-2">
                {workflowStages.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5",
                      s.id === approval.workflowStageId && "bg-muted",
                    )}
                  >
                    <span className="min-w-0 text-sm">
                      <span className="tabular-nums text-muted-foreground">
                        {s.order}.
                      </span>{" "}
                      {s.name}
                      {s.id === approval.workflowStageId && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          this approval
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {s.assigneeRole} · {s.slaHours}h SLA ·{" "}
                        {s.automation ? `${s.automation} gate` : "manual stage"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <RecordAuditTrail entity="Approval" id={approval.id} />
    </RecordDetailPage>
  );
}
