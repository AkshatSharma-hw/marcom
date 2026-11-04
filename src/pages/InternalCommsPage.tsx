/**
 * Internal comms workspace — employee-facing campaigns, internal messages and
 * leadership messages riding the same Campaign/Communication spine
 * (blueprint Part 5, module 13). Everything on this page is derived from the
 * seed graph: employee audiences, intranet-kind channels and commsType joins.
 */

import { Link } from "react-router-dom";
import { Building2, CalendarDays, Megaphone, MessagesSquare } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { getSeedDB } from "@/data/seed";
import type { Campaign, Communication, SeedDB } from "@/data/types";
import { useCollection } from "@/store/DataStore";
import { useRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { applyScope, segmentSize, TODAY } from "@/data/selectors";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Derivations (pure over SeedDB)                                      */
/* ------------------------------------------------------------------ */

/** Lifecycle states that no longer count as "in flight". */
const INACTIVE_STATUSES: readonly Communication["status"][] = [
  "Completed",
  "Archived",
  "Killed",
];

/** Channel kinds that reach employees rather than external audiences. */
const INTERNAL_CHANNEL_KINDS: readonly string[] = ["intranet"];

/* ------------------------------------------------------------------ */
/* ABAC — restricted-subject masking (same rule as CommunicationsPage) */
/* ------------------------------------------------------------------ */

const RESTRICTED_READ_ROLES = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
] as const;

const MASKED_SUBJECT = "Restricted communication";

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

/** True when the channel an activity executes on reaches employees. */
function isInternalChannel(db: SeedDB, channelId: string): boolean {
  const kind = db.channels.find((c) => c.id === channelId)?.channelKind;
  return kind !== undefined && INTERNAL_CHANNEL_KINDS.includes(kind);
}

/**
 * A campaign is employee-facing when it is typed 'internal' or when any of its
 * activities executes on an internal-kind channel (e.g. the intranet).
 *
 * Note the asymmetry this creates, which the KPI below has to respect: a
 * campaign qualifying through one intranet activity still carries its external
 * activities (corporate web, press wire), and those are not internal comms.
 */
function isEmployeeCampaign(db: SeedDB, campaign: Campaign): boolean {
  if (campaign.campaignType === "internal") return true;
  return db.campaignActivities.some(
    (a) => a.campaignId === campaign.id && isInternalChannel(db, a.channelId),
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InternalCommsPage() {
  const db = useLiveDB();
  const { brandId, businessUnitId, regionId } = useScope();
  const { role } = useRole();
  const communications = useCollection<Communication>(
    "communications",
    getSeedDB().communications,
  );

  const canReadRestricted = (RESTRICTED_READ_ROLES as readonly string[]).includes(role);
  const subjectFor = (comm: Communication): string =>
    comm.classification === "Restricted" && !canReadRestricted
      ? MASKED_SUBJECT
      : comm.subject;
  const isMasked = (comm: Communication): boolean =>
    comm.classification === "Restricted" && !canReadRestricted;

  // Scope: brand/BU/region live on the campaign reached via the communication's
  // activity. A communication without campaign lineage cannot match an active
  // scope filter (same convention as the communications workspace).
  const inScope = (comm: Communication): boolean => {
    if (!brandId && !businessUnitId && !regionId) return true;
    const { campaign } = lineageOf(db, comm);
    if (!campaign) return false;
    if (brandId && campaign.brandId !== brandId) return false;
    if (businessUnitId && campaign.businessUnitId !== businessUnitId) return false;
    if (regionId && !campaign.regionIds.includes(regionId)) return false;
    return true;
  };

  const internalComms = communications.records
    .filter((c) => c.commsType === "internal")
    .filter(inScope)
    .slice()
    .sort((a, b) => (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999", DEFAULT_LOCALE));

  // Leadership messages: corporate comms addressed to an employee audience.
  const leadershipComms = communications.records
    .filter((c) => {
      if (c.commsType !== "corporate") return false;
      const audience = db.audiences.find((a) => a.id === c.audienceId);
      return audience?.audienceKind === "employee";
    })
    .filter(inScope)
    .slice()
    .sort((a, b) => (a.scheduledAt ?? "9999").localeCompare(b.scheduledAt ?? "9999", DEFAULT_LOCALE));

  const employeeCampaigns = applyScope(db.campaigns, {
    brandId,
    businessUnitId,
    regionId,
  }).filter((c) => isEmployeeCampaign(db, c));

  /* ---- KPI derivations ---- */

  /* Employee segment reach: the summed population of the distinct segments
     behind employee-kind audiences.

     It is a sum of segment sizes, NOT a headcount, and the tile now says so.
     The segments are independent criteria and overlap heavily: "All employees",
     "People managers" and "Field & frontline employees" all select from the
     same active workforce, and "Graduate & early-careers talent" selects a
     recruitment pipeline. A Segment carries a population figure and a criteria
     string, not a membership list, so there is nothing to deduplicate people
     against — and deciding which segments "really" count would be a hand-made
     rule about particular rows. The number therefore stays derived and the
     label carries the caveat, instead of a headline that reads as several
     times the workforce. */
  const employeeAudiences = db.audiences.filter(
    (a) =>
      a.audienceKind === "employee" && (!regionId || a.regionIds.includes(regionId)),
  );
  const employeeSegmentIds = [
    ...new Set(employeeAudiences.flatMap((a) => a.segmentIds)),
  ];
  const employeeSegmentReach = employeeSegmentIds.reduce(
    (sum, id) => sum + segmentSize(db, id),
    0,
  );

  const inFlightCount = internalComms.filter(
    (c) => !INACTIVE_STATUSES.includes(c.status),
  ).length;

  /* Upcoming 30 days: things that START in the window, on this page's own
     subject matter — internal-channel activities of employee campaigns, events
     on those campaigns, and scheduled internal/leadership sends.

     Both halves of the predicate were wrong before. An overlap test
     (start < windowEnd && end >= windowStart) counts work that began weeks ago
     as "upcoming", and taking every activity of an employee campaign counted
     external ones: a campaign qualifies as employee-facing through a single
     intranet activity, and its corporate-web and press-wire activities are not
     internal comms. */
  const windowStart = Date.parse(TODAY);
  const windowEnd = windowStart + 30 * 24 * 60 * 60 * 1000;
  const withinWindow = (iso?: string): boolean => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return t >= windowStart && t < windowEnd;
  };
  const employeeCampaignIds = new Set(employeeCampaigns.map((c) => c.id));
  const upcomingActivityCount = db.campaignActivities.filter(
    (a) =>
      employeeCampaignIds.has(a.campaignId) &&
      isInternalChannel(db, a.channelId) &&
      withinWindow(a.startDate),
  ).length;
  const upcomingEventCount = db.events.filter(
    (e) =>
      e.campaignId !== undefined &&
      employeeCampaignIds.has(e.campaignId) &&
      withinWindow(e.startDate),
  ).length;
  const upcomingSendCount = [...internalComms, ...leadershipComms].filter(
    (c) => withinWindow(c.scheduledAt) && !INACTIVE_STATUSES.includes(c.status),
  ).length;
  const upcomingCount = upcomingActivityCount + upcomingEventCount + upcomingSendCount;

  /* ---- Row helpers ---- */

  const audienceName = (id: string): string =>
    db.audiences.find((a) => a.id === id)?.name ?? id;
  const ownerName = (id: string): string =>
    db.stakeholders.find((s) => s.id === id)?.name ?? id;
  const executionsFor = (commId: string) =>
    db.channelExecutions
      .filter((x) => x.communicationId === commId)
      .slice()
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "", DEFAULT_LOCALE));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Internal comms"
        description="Employee campaigns, internal messages and leadership updates"
      />

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile
          label="Employee segment reach"
          value={employeeSegmentReach.toLocaleString("en-US")}
          sub={`Sum of ${employeeSegmentIds.length} segment population${employeeSegmentIds.length === 1 ? "" : "s"} across ${employeeAudiences.length} employee audience${employeeAudiences.length === 1 ? "" : "s"}. Each segment is its own criteria over the people directory, and the definitions overlap — this is a total of segment sizes, not a headcount.`}
        />
        <KpiTile
          label="Internal messages in flight"
          value={inFlightCount}
          sub="Internal communications not yet completed"
        />
        <KpiTile
          label="Upcoming in 30 days"
          value={upcomingCount}
          sub={`Starting within 30 days of ${fmtDate(TODAY)}: ${upcomingActivityCount} internal-channel activit${upcomingActivityCount === 1 ? "y" : "ies"} · ${upcomingEventCount} event${upcomingEventCount === 1 ? "" : "s"} · ${upcomingSendCount} scheduled send${upcomingSendCount === 1 ? "" : "s"}`}
        />
      </div>

      {/* Shared calendar note */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm">
            Internal and external sends share one calendar — conflicts surface
            automatically.{" "}
            <Link to="/calendar" className="font-medium text-primary hover:underline">
              Open calendar
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Employee campaigns */}
      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-medium">Employee campaigns</h2>
          <p className="text-xs text-muted-foreground">
            Campaigns typed internal or executing on internal channels such as the
            intranet
          </p>
        </div>
        {employeeCampaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No employee campaigns in this scope"
            hint="Widen the brand, business unit, or region filters in the top bar."
          />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {employeeCampaigns.map((campaign) => {
                const activities = db.campaignActivities.filter(
                  (a) => a.campaignId === campaign.id,
                );
                const internalActivityCount = activities.filter((a) => {
                  const kind = db.channels.find((c) => c.id === a.channelId)?.channelKind;
                  return kind !== undefined && INTERNAL_CHANNEL_KINDS.includes(kind);
                }).length;
                return (
                  <div
                    key={campaign.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {fmtDate(campaign.startDate)} – {fmtDate(campaign.endDate)}
                        {" · "}
                        {activities.length} activit{activities.length === 1 ? "y" : "ies"}
                        {internalActivityCount > 0 && (
                          <> ({internalActivityCount} on internal channels)</>
                        )}
                        {" · "}
                        {ownerName(campaign.ownerStakeholderId)}
                      </div>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Internal messages */}
      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-medium">Internal messages</h2>
          <p className="text-xs text-muted-foreground">
            Communications of type internal, with their channel executions
          </p>
        </div>
        {internalComms.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No internal messages in this scope"
            hint="Widen the brand, business unit, or region filters in the top bar."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-44">Audience</TableHead>
                    <TableHead className="w-32">Scheduled</TableHead>
                    <TableHead className="w-64">Channel executions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internalComms.map((comm) => {
                    const executions = executionsFor(comm.id);
                    return (
                      <TableRow key={comm.id}>
                        <TableCell>
                          <span
                            className={cn(
                              "font-medium",
                              isMasked(comm) && "italic text-muted-foreground",
                            )}
                          >
                            {subjectFor(comm)}
                          </span>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {comm.id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={comm.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {audienceName(comm.audienceId)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {comm.scheduledAt ? fmtDate(comm.scheduledAt) : "—"}
                        </TableCell>
                        <TableCell>
                          {executions.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              None planned
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {executions.map((x) => {
                                const channel = db.channels.find(
                                  (c) => c.id === x.channelId,
                                );
                                return (
                                  <div
                                    key={x.id}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className="min-w-0 truncate">
                                      {channel?.name ?? x.channelId}
                                    </span>
                                    <StatusBadge status={x.status} />
                                  </div>
                                );
                              })}
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
      </section>

      {/* Leadership messages */}
      <section className="space-y-2">
        <div>
          <h2 className="text-sm font-medium">Leadership messages</h2>
          <p className="text-xs text-muted-foreground">
            Corporate communications addressed to employee audiences
          </p>
        </div>
        {leadershipComms.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No leadership messages in this scope"
            hint="Corporate messages targeting employee audiences appear here."
          />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {leadershipComms.map((comm) => (
                <div
                  key={comm.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "font-medium",
                        isMasked(comm) && "italic text-muted-foreground",
                      )}
                    >
                      {subjectFor(comm)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {audienceName(comm.audienceId)}
                      {" · "}
                      {comm.scheduledAt ? fmtDate(comm.scheduledAt) : "Not scheduled"}
                      {" · "}
                      {ownerName(comm.ownerStakeholderId)}
                    </div>
                  </div>
                  <StatusBadge status={comm.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
