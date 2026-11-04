/**
 * Journey record page — /journeys/:id.
 *
 * Journeys & channels selects a journey into a panel on a page that also holds
 * the channel registry, the execution planner and the delivery pipeline. The
 * selection has no URL, so a journey could not be linked, bookmarked or opened
 * in a new tab, and the back button never returned to it. This is the record.
 *
 * Two things this page is deliberate about:
 *
 *  1. MASKING. Restricted communications are masked everywhere else, and the
 *     roles that can reach /journeys — Campaign Manager, Internal Comms
 *     Manager, PR Manager — are exactly the ones the masking rule excludes. So
 *     every surface here that renders a subject goes through `subjectOf`, the
 *     canvas included, exactly as JourneysChannels does.
 *  2. HONESTY ABOUT WHAT A JOURNEY IS HERE. The graph is a DEFINITION. The
 *     dataset holds no membership, entry or run record for any journey — no
 *     entity in the model even carries a journeyId — so nothing on this page
 *     can report who is in the journey, where they are in it, or what it has
 *     sent. The page says so rather than implying a live population.
 */

import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GitBranch, History, Info, Send, Users } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { segmentSize } from "@/data/selectors";
import { blockerFor, type BlockerInfo } from "@/data/selectors/blockerSelectors";
import { canSeeNav, useRole } from "@/lib/rbac";
import { fmtCompact, fmtDate, plural } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { Communication, Journey, JourneyNode } from "@/data/types";

import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { JourneyCanvas } from "@/components/marcomm/JourneyCanvas";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function JourneyDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useLiveDB();
  const { role } = useRole();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const journey = db.journeys.find((j) => j.id === id) ?? null;

  /* Published journeys are immutable — a lineage is every version sharing a
     name, newest first. Same rule as the journeys page, so the two cannot
     disagree about which version is current. */
  const versions = useMemo<Journey[]>(() => {
    if (!journey) return [];
    return db.journeys
      .filter((j) => j.name === journey.name)
      .slice()
      .sort((a, b) => b.version - a.version);
  }, [db.journeys, journey]);

  if (!journey) {
    return (
      <RecordNotFound
        icon={GitBranch}
        noun="journey"
        id={id}
        backTo="/journeys"
        backLabel="journeys"
      />
    );
  }

  // ABAC: identical rule and identical wording to JourneysChannels.
  const canReadRestricted = (
    ["Corporate Comms Manager", "CMO", "Executive", "Platform Admin"] as readonly string[]
  ).includes(role);
  const subjectOf = (c: { subject: string; classification: string }): string =>
    c.classification === "Restricted" && !canReadRestricted
      ? "Restricted communication"
      : c.subject;

  const audience = db.audiences.find((a) => a.id === journey.audienceId) ?? null;
  const audienceName = audience?.name ?? journey.audienceId;
  const audienceNameOf = (aid: string): string =>
    db.audiences.find((a) => a.id === aid)?.name ?? aid;
  const stakeholderName = (sid: string): string =>
    db.stakeholders.find((s) => s.id === sid)?.name ?? sid;

  const sendNodes = journey.nodes.filter((n) => n.type === "send");
  const waitNodes = journey.nodes.filter((n) => n.type === "wait");
  const waitDays = waitNodes.reduce((sum, n) => sum + (n.config?.waitDays ?? 0), 0);

  /* The communications this journey REFERENCES. A send node names a
     communication id; the row exists only when that id resolves to a record,
     and unresolved ids are reported separately rather than silently dropped. */
  const referenced = sendNodes.map((node) => ({
    node,
    communication:
      db.communications.find((c) => c.id === node.config?.communicationId) ?? null,
  }));
  const unresolved = referenced.filter((r) => r.communication === null);

  const campaignForCommunication = (communication: Communication) => {
    const activity = communication.campaignActivityId
      ? db.campaignActivities.find((a) => a.id === communication.campaignActivityId)
      : undefined;
    return activity ? db.campaigns.find((c) => c.id === activity.campaignId) ?? null : null;
  };

  const blocker: BlockerInfo | null = blockerFor(db, "Journey", journey.id, journey.status);

  const selectedNode: JourneyNode | null =
    journey.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedCommunication: Communication | null =
    selectedNode?.type === "send" && selectedNode.config?.communicationId
      ? db.communications.find((c) => c.id === selectedNode.config?.communicationId) ?? null
      : null;

  const isCurrent = versions[0]?.id === journey.id;

  const facts: { label: string; value: string }[] = [
    { label: "Audience", value: audienceName },
    { label: "Version", value: `v${journey.version}` },
    {
      label: "Steps",
      value: `${journey.nodes.length} ${journey.nodes.length === 1 ? "node" : "nodes"} · ${journey.edges.length} ${journey.edges.length === 1 ? "edge" : "edges"}`,
    },
    {
      label: "Sends",
      value: `${sendNodes.length} ${sendNodes.length === 1 ? "step" : "steps"}`,
    },
    {
      label: "Elapsed time built in",
      value:
        waitNodes.length === 0
          ? "No wait steps"
          : `${waitDays} ${waitDays === 1 ? "day" : "days"} across ${waitNodes.length} ${waitNodes.length === 1 ? "wait" : "waits"}`,
    },
    { label: "Published", value: fmtDate(journey.createdAt) },
  ];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="Journey"
        id={journey.id}
        title={journey.name}
        description={`v${journey.version} · ${audienceName}`}
        status={journey.status}
        blocker={blocker}
        backTo="/journeys"
        backLabel={"Journeys & channels"}
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
        </CardContent>
      </Card>

      {/* What this record is — and is not. */}
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              This is the journey definition, not a run.
            </span>{" "}
            The graph below is the orchestration as authored: {journey.nodes.length}{" "}
            {journey.nodes.length === 1 ? "step" : "steps"} wired by{" "}
            {journey.edges.length} {journey.edges.length === 1 ? "edge" : "edges"}, and{" "}
            {journey.status === "Active"
              ? "the version new entrants would be placed on."
              : `currently ${journey.status}.`}{" "}
            No member ever enters it here — this workspace holds no membership,
            entry or completion record for any journey, so nothing on this page can
            say who is in it, which step they reached, or what it has sent. Delivery
            that has actually happened is on the channel executions, not here.
          </p>
        </CardContent>
      </Card>

      {/* Version lineage. Published journeys are immutable, so an older version
          is not stale — it is pinned to whoever entered on it. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <History className="h-3.5 w-3.5" />
            Version history
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {versions.length < (versions[0]?.version ?? 0) && (
            <p className="mb-2 text-xs tabular-nums text-muted-foreground">
              {versions.length} of {versions[0]?.version} versions on file — the rest
              were published before this workspace was seeded.
            </p>
          )}
          <ul className="divide-y divide-border">
            {versions.map((v, i) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Badge
                    variant={i === 0 ? "default" : "secondary"}
                    className="h-5 shrink-0 px-1.5 text-[10px] font-normal"
                  >
                    v{v.version}
                  </Badge>
                  {v.id === journey.id ? (
                    <span className="text-sm font-medium">{v.id}</span>
                  ) : (
                    <Link
                      to={`/journeys/${v.id}`}
                      className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {v.id}
                    </Link>
                  )}
                  <span className="truncate text-xs text-muted-foreground">
                    published {fmtDate(v.createdAt)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {i === 0
                      ? "current — new entrants would use this version"
                      : "pinned to anyone who entered on it"}
                  </span>
                  <StatusBadge status={v.status} />
                </span>
              </li>
            ))}
          </ul>
          {!isCurrent && (
            <p className="mt-2 text-xs text-muted-foreground">
              You are looking at v{journey.version}. It is immutable: v
              {versions[0]?.version} superseded it and is what a new entrant would be
              placed on.
            </p>
          )}
        </CardContent>
      </Card>

      {/* The graph, plus the inspector for the selected step. */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <JourneyCanvas
          className="min-w-0 flex-1"
          journey={journey}
          selectedNodeId={selectedNodeId}
          onNodeSelect={(node) =>
            setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
          }
          resolveCommunication={(cid) => {
            const c = db.communications.find((x) => x.id === cid);
            return c ? subjectOf(c) : undefined;
          }}
          resolveSegment={(sid) => db.segments.find((s) => s.id === sid)?.name}
        />

        <Card className="shrink-0 lg:w-80">
          <CardHeader className="pb-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selectedNode ? "Selected step" : "Step inspector"}
            </div>
            <CardTitle className="text-base font-medium">
              {selectedNode
                ? selectedCommunication
                  ? subjectOf(selectedCommunication)
                  : selectedNode.label
                : "Nothing selected"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {!selectedNode ? (
              <p className="text-sm text-muted-foreground">
                Select a step in the graph to see what it is configured to do. A send
                step resolves to its communication; a wait step to its duration.
              </p>
            ) : (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Step</span>
                  <span className="capitalize">{selectedNode.type}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Node</span>
                  <span className="tabular-nums">{selectedNode.id}</span>
                </div>
                {selectedNode.config?.waitDays !== undefined && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Wait</span>
                    <span className="tabular-nums">
                      {selectedNode.config.waitDays}{" "}
                      {selectedNode.config.waitDays === 1 ? "day" : "days"}
                    </span>
                  </div>
                )}
                {selectedNode.config?.condition && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Condition</span>
                    <span className="truncate">{selectedNode.config.condition}</span>
                  </div>
                )}
                {selectedNode.config?.splitPct !== undefined && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Split</span>
                    <span className="tabular-nums">{selectedNode.config.splitPct}%</span>
                  </div>
                )}
                {selectedNode.config?.segmentId && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Segment</span>
                    <span className="truncate">
                      {db.segments.find((s) => s.id === selectedNode.config?.segmentId)
                        ?.name ?? selectedNode.config.segmentId}
                    </span>
                  </div>
                )}
                {selectedNode.type === "send" && !selectedCommunication && (
                  <p className="text-sm text-muted-foreground">
                    This send step names{" "}
                    {selectedNode.config?.communicationId ?? "no communication"}, which
                    does not resolve to a communication in this workspace — the step
                    would have nothing to send.
                  </p>
                )}
                {selectedCommunication && (
                  <>
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
                        title={audienceNameOf(selectedCommunication.audienceId)}
                      >
                        {audienceNameOf(selectedCommunication.audienceId)}
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
                        title={stakeholderName(selectedCommunication.ownerStakeholderId)}
                      >
                        {stakeholderName(selectedCommunication.ownerStakeholderId)}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Communications this journey references. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Communications referenced</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {referenced.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Send}
                title="No send steps"
                hint={`A journey references a communication through a send step, and this definition has none — its ${plural(journey.nodes.length, "step")} ${
                  journey.nodes.length === 1
                    ? "is a trigger, wait, condition or exit"
                    : "are triggers, waits, conditions or exits"
                }, so it would move members through the graph without sending anything.`}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Send step</TableHead>
                    <TableHead>Communication</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="w-56">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referenced.map(({ node, communication }) => {
                    const campaign = communication
                      ? campaignForCommunication(communication)
                      : null;
                    return (
                      <TableRow key={node.id}>
                        <TableCell className="font-medium">
                          {node.label}
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {node.id}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {communication ? (
                            <>
                              {/* The masked label is what gets linked — the
                                  record page masks the same way, so following
                                  the link never reveals a Restricted subject
                                  this role cannot read. */}
                              <Link
                                to={`/communications/${communication.id}`}
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                {subjectOf(communication)}
                              </Link>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {communication.id} · {communication.classification}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              {node.config?.communicationId ?? "no communication set"} —
                              does not resolve
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {campaign ? (
                            <Link
                              to={`/campaigns/${campaign.id}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {campaign.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {communication
                                ? "Not tied to a campaign activity"
                                : "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {communication?.scheduledAt
                            ? fmtDate(communication.scheduledAt)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {communication ? (
                            <>
                              <StatusBadge status={communication.status} />
                              <BlockerLine
                                blocker={blockerFor(
                                  db,
                                  "Communication",
                                  communication.id,
                                  communication.status,
                                )}
                                className="mt-1 flex"
                              />
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="px-4 pb-4 pt-3 text-xs text-muted-foreground">
                A send step names a communication; the communication carries its own
                status, approvals and schedule, and none of that is changed by being
                referenced here.
                {unresolved.length > 0 && (
                  <>
                    {" "}
                    {unresolved.length}{" "}
                    {unresolved.length === 1 ? "step names an id" : "steps name ids"}{" "}
                    that no communication in this workspace matches.
                  </>
                )}
                {!canReadRestricted && (
                  <>
                    {" "}
                    Subjects classified Restricted are masked for the {role} role —
                    the step, its schedule and its status are still shown, the wording
                    is not.
                  </>
                )}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Audience the definition targets. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Audience</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {!audience ? (
            <EmptyState
              icon={Users}
              title="Audience does not resolve"
              hint={`This journey targets '${journey.audienceId}', which is not an audience in this workspace — so the definition has no population to draw from.`}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  {canSeeNav(role, "audiences") ? (
                    <Link
                      to="/audiences"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {audience.name}
                    </Link>
                  ) : (
                    audience.name
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {audience.id} · {audience.segmentIds.length}{" "}
                  {audience.segmentIds.length === 1 ? "segment" : "segments"}
                </span>
              </div>
              {audience.segmentIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {audience.name} resolves to no segments, so there is no population
                  behind this definition.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {audience.segmentIds
                    .map((sid) => db.segments.find((s) => s.id === sid) ?? null)
                    .filter((s): s is NonNullable<typeof s> => s !== null)
                    .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE))
                    .map((segment) => (
                      <li
                        key={segment.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{segment.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {segment.id} · {segment.criteria}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-sm tabular-nums">
                          {fmtCompact(segmentSize(db, segment.id))}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Segment sizes are the recorded populations, not an entry count —
                consent and suppression are applied at handoff on the journeys page,
                and no member has entered this definition.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordAuditTrail entity="Journey" id={journey.id} />
    </RecordDetailPage>
  );
}
