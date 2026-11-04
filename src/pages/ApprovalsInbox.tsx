import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Check,
  CheckSquare,
  Filter,
  Gauge,
  MessageSquareWarning,
  ShieldAlert,
  X,
} from "lucide-react";
import type { Approval } from "@/data/types";
import { useRole } from "@/lib/rbac";
import {
  PENDING,
  SLA_BOARD_ROLES,
  SOD_NOTE,
  useApprovalDecisions,
} from "@/lib/useApprovalDecisions";
import { fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { DEMO_NOW_MS, isPastOnDemoClock } from "@/data/selectors/campaignSelectors";
import { originOf, type OriginInfo } from "@/data/selectors/originSelectors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/**
 * Queue filter over derived record origin. Origin is read from the subject's
 * provenance chain, never stored, so "Proposed" means an agent produced the
 * subject and nobody has confirmed it yet.
 */
type OriginFilter = "all" | "proposed" | "authored";

const ORIGIN_FILTER_LABELS: Record<OriginFilter, string> = {
  all: "All",
  proposed: "Proposed",
  authored: "Authored",
};

/**
 * Demo "now" — the shared instant every SLA surface measures against.
 *
 * This page used to anchor on midnight of the demo day while `blockerSelectors`
 * used the end of it, so an approval could carry a "SLA breached" blocker chip
 * on a campaign page and still be counted on-time here. Midnight also put the
 * five approvals created during the demo day in the *future*, contributing
 * negative values to the median-wait tile.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysOverdue(a: Approval): number {
  return Math.floor((DEMO_NOW_MS - Date.parse(a.slaDueAt)) / MS_PER_DAY);
}

/**
 * Whether an approval has passed its SLA — the same test `blockerSelectors`
 * applies for the "SLA breached" chip, so the two can never disagree. A
 * whole-day threshold would call a deadline that passed this morning "on time"
 * while the campaign page beside it already flags it breached.
 */
function isOverdue(a: Approval): boolean {
  return isPastOnDemoClock(a.slaDueAt);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function ApprovalsInbox() {
  const { role, currentUser } = useRole();
  const { db, stakeholder, approvals, subjectTitle, approverName, stageName, ownsSubject, decide } =
    useApprovalDecisions();
  // `?focus=<approvalId>` is where BlockerLine deep-links from: the named
  // blocker on another screen lands on the exact approval holding the record up.
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("focus");
  const [tab, setTab] = useState("my-queue");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");

  const queue = approvals.records
    .filter(
      (a) =>
        stakeholder !== undefined &&
        a.approverStakeholderId === stakeholder.id &&
        PENDING.includes(a.status),
    )
    .slice()
    .sort((a, b) => a.slaDueAt.localeCompare(b.slaDueAt, DEFAULT_LOCALE));

  /** Origin of the approval's *subject* — that is the thing a person reviews. */
  const subjectOrigin = (approval: Approval): OriginInfo =>
    originOf(db, approval.subjectEntity, approval.subjectId);

  /**
   * What is holding the subject up. For most rows this resolves back to the
   * approval itself, which is the point: the row states the stage, the owner,
   * the age and the SLA position rather than only "In Review".
   */
  const subjectBlocker = (approval: Approval) =>
    blockerFor(db, approval.subjectEntity, approval.subjectId);

  const proposedInQueue = queue.filter(
    (a) => subjectOrigin(a).origin === "agent",
  ).length;

  const visibleQueue = queue.filter((a) => {
    if (originFilter === "all") return true;
    const proposed = subjectOrigin(a).origin === "agent";
    return originFilter === "proposed" ? proposed : !proposed;
  });

  // ── SLA board (org-wide, live off the same collection) ──
  const showSlaBoard = SLA_BOARD_ROLES.includes(role);

  const pendingAll = approvals.records
    .filter((a) => PENDING.includes(a.status))
    .slice()
    .sort((a, b) => a.slaDueAt.localeCompare(b.slaDueAt, DEFAULT_LOCALE));

  const overdueCount = pendingAll.filter(isOverdue).length;
  const escalatedCount = pendingAll.filter((a) => a.status === "Escalated").length;
  const medianWaitDays = median(
    pendingAll.map((a) => (DEMO_NOW_MS - Date.parse(a.createdAt)) / MS_PER_DAY),
  );

  // ── Deep-link focus ──
  const focusedApproval = focusId
    ? (approvals.records.find((a) => a.id === focusId) ?? null)
    : null;
  const focusInQueue = focusedApproval !== null && queue.some((a) => a.id === focusId);
  const focusInSlaBoard =
    focusedApproval !== null && pendingAll.some((a) => a.id === focusId);

  // A blocker link may point at an approval that belongs to someone else's
  // queue; when the SLA board can show it, open that tab instead of leaving the
  // link looking broken.
  useEffect(() => {
    if (focusId && !focusInQueue && focusInSlaBoard && showSlaBoard) {
      setTab("sla-board");
    }
  }, [focusId, focusInQueue, focusInSlaBoard, showSlaBoard]);

  useEffect(() => {
    if (!focusId) return;
    document
      .getElementById(`approval-${focusId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, tab, originFilter]);

  /** Why a deep link did not land on a row, when it did not. */
  const focusNotice = ((): string | null => {
    if (!focusId || focusInQueue || (focusInSlaBoard && showSlaBoard)) return null;
    if (!focusedApproval) {
      return `Approval ${focusId} is not in this workspace, so nothing is highlighted.`;
    }
    if (!PENDING.includes(focusedApproval.status)) {
      return `Approval ${focusId} has already been decided (${focusedApproval.status}), so it is no longer in a pending queue.`;
    }
    return `Approval ${focusId} is waiting on ${approverName(
      focusedApproval.approverStakeholderId,
    )}, not on you, so it is not in your queue.`;
  })();

  /* A notice used to be the end of the road: the deep link explained itself and
     then left the user on a list the record is not in. The routed record page
     is somewhere to go — offered only when this role may actually open it (its
     own item, an item it owns, or org-wide SLA visibility), so the link never
     leads to a refusal screen. */
  const focusRecordReachable =
    focusedApproval !== null &&
    (showSlaBoard ||
      ownsSubject(focusedApproval) ||
      (stakeholder !== undefined &&
        focusedApproval.approverStakeholderId === stakeholder.id));

  const workload = Array.from(
    pendingAll.reduce((acc, a) => {
      const entry = acc.get(a.approverStakeholderId) ?? { open: 0, overdue: 0 };
      entry.open += 1;
      if (isOverdue(a)) entry.overdue += 1;
      return acc.set(a.approverStakeholderId, entry);
    }, new Map<string, { open: number; overdue: number }>()),
  ).sort((a, b) => b[1].open - a[1].open);

  const originFilterControl = (
    <Tabs value={originFilter} onValueChange={(v) => setOriginFilter(v as OriginFilter)}>
      <TabsList>
        {(Object.keys(ORIGIN_FILTER_LABELS) as OriginFilter[]).map((key) => (
          <TabsTrigger key={key} value={key}>
            {ORIGIN_FILTER_LABELS[key]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const myQueue =
    queue.length === 0 ? (
      <EmptyState
        icon={CheckSquare}
        title="No approvals waiting"
        hint={
          stakeholder === undefined
            ? `No seeded stakeholder holds the ${role} role, so no approval queue can be resolved for this identity. Sign in as a role that has one.`
            : pendingAll.length > 0
              ? `Nothing is assigned to ${stakeholder.name}. ${pendingAll.length} ${pendingAll.length === 1 ? "approval is" : "approvals are"} open across the org, each waiting on a different approver.`
              : "Nothing is assigned to you, and no approval anywhere in the org is still open. New requests appear here as they are raised."
        }
        action={
          showSlaBoard && pendingAll.length > 0
            ? { label: "View SLA board", onClick: () => setTab("sla-board") }
            : undefined
        }
      />
    ) : (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Segregation of duties: an approval whose subject you own or authored is
          locked for you — another approver must decide it.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Origin</span>
          {originFilterControl}
          <span className="text-xs text-muted-foreground">
            {visibleQueue.length} of {queue.length} shown
          </span>
        </div>
        {visibleQueue.length === 0 ? (
          <EmptyState
            icon={Filter}
            title={`No ${ORIGIN_FILTER_LABELS[originFilter].toLowerCase()} items in your queue`}
            hint={
              originFilter === "proposed"
                ? `None of your ${queue.length} open ${queue.length === 1 ? "approval" : "approvals"} has a subject an agent produced — origin is read from the subject's provenance, so this stays empty until an agent-produced record reaches you.`
                : `Every one of your ${queue.length} open ${queue.length === 1 ? "approval" : "approvals"} has an agent-produced subject.`
            }
            action={{ label: "Show all", onClick: () => setOriginFilter("all") }}
          />
        ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-36">SLA due</TableHead>
                  <TableHead className="w-40">Status</TableHead>
                  <TableHead className="w-72 text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleQueue.map((a) => {
                  const locked = ownsSubject(a);
                  const origin = subjectOrigin(a);
                  return (
                    <TableRow
                      key={a.id}
                      id={`approval-${a.id}`}
                      className={cn(
                        proposedRowClass(origin.origin),
                        a.id === focusId && "bg-accent",
                      )}
                    >
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* The row's primary cell is the link to the routed
                              approval, so the drill-down is keyboard reachable
                              and opens in a new tab on cmd-click. Titled
                              explicitly so tests and assistive tech can read
                              the subject without picking up the origin chip
                              that shares this row. */}
                          <Link
                            to={`/approvals/${a.id}`}
                            className="font-medium text-primary hover:underline"
                            data-testid="approval-subject"
                          >
                            {subjectTitle(a.subjectEntity, a.subjectId)}
                          </Link>
                          <OriginChip info={origin} />
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{a.id}</div>
                      </TableCell>
                      <TableCell className="text-sm">{a.subjectEntity}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">
                        {fmtDate(a.slaDueAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                        <BlockerLine
                          blocker={subjectBlocker(a)}
                          className="mt-1 flex max-w-[16rem]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={locked}
                            onClick={() => decide(a, "Approved", "Approved")}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={locked}
                            onClick={() =>
                              decide(a, "Changes Requested", "Requested changes on")
                            }
                          >
                            <MessageSquareWarning className="mr-1 h-3.5 w-3.5" />
                            Request changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            disabled={locked}
                            onClick={() => decide(a, "Rejected", "Rejected")}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                        {locked && (
                          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                            <span>{SOD_NOTE}</span>
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
      </div>
    );

  const slaBoard = (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Open approvals" value={pendingAll.length} sub="Org-wide, pending decision" />
        <KpiTile
          label="Overdue"
          value={
            <span className={overdueCount > 0 ? "text-rose-500" : undefined}>
              {overdueCount}
            </span>
          }
          sub="Past SLA due date"
        />
        <KpiTile label="Escalated" value={escalatedCount} sub="Raised past the assigned stage" />
        <KpiTile
          label="Median days waiting"
          value={medianWaitDays.toFixed(1)}
          sub="Since approval was requested"
        />
      </div>

      {pendingAll.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="No open approvals"
          hint={`The board lists approvals still awaiting a decision, and all ${approvals.records.length} approvals in the org have been decided. New requests appear here as workflow stages raise them — there is nothing to unblock.`}
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-44">Approver</TableHead>
                    <TableHead className="w-44">Stage</TableHead>
                    <TableHead className="w-36">SLA due</TableHead>
                    <TableHead className="w-32 text-right">Days overdue</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAll.map((a) => {
                    const overdueBy = daysOverdue(a);
                    const origin = subjectOrigin(a);
                    return (
                      <TableRow
                        key={a.id}
                        id={`approval-${a.id}`}
                        className={cn(
                          proposedRowClass(origin.origin),
                          a.id === focusId && "bg-accent",
                        )}
                      >
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/approvals/${a.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {subjectTitle(a.subjectEntity, a.subjectId)}
                            </Link>
                            <OriginChip info={origin} />
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{a.id}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {approverName(a.approverStakeholderId)}
                        </TableCell>
                        <TableCell className="text-sm">{stageName(a.workflowStageId)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {fmtDate(a.slaDueAt)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {overdueBy > 0 ? (
                            <span className="font-medium text-rose-500">{overdueBy}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="border-b px-4 py-3 text-sm font-medium">
                Workload by approver
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Approver</TableHead>
                    <TableHead className="w-32 text-right">Open</TableHead>
                    <TableHead className="w-32 text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workload.map(([stakeholderId, counts]) => (
                    <TableRow key={stakeholderId}>
                      <TableCell className="text-sm font-medium">
                        {approverName(stakeholderId)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {counts.open}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {counts.overdue > 0 ? (
                          <span className="font-medium text-rose-500">{counts.overdue}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Approvals"
        description={`Items waiting on ${currentUser.name} (${role})`}
        actions={
          proposedInQueue > 0 ? (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {proposedInQueue} proposed awaiting review
            </span>
          ) : undefined
        }
      />

      {focusNotice && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">{focusNotice}</p>
          {focusRecordReachable && focusedApproval && (
            <Button asChild size="sm" variant="outline" className="h-6 px-2 text-xs">
              <Link to={`/approvals/${focusedApproval.id}`}>
                Open {focusedApproval.id}
              </Link>
            </Button>
          )}
        </div>
      )}

      {showSlaBoard ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="my-queue">My queue</TabsTrigger>
            <TabsTrigger value="sla-board">SLA board</TabsTrigger>
          </TabsList>
          <TabsContent value="my-queue" className="mt-4">
            {myQueue}
          </TabsContent>
          <TabsContent value="sla-board" className="mt-4">
            {slaBoard}
          </TabsContent>
        </Tabs>
      ) : (
        myQueue
      )}
    </div>
  );
}
