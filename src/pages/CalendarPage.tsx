import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { useLiveDB } from "@/data/useLiveDB";
import {
  TODAY,
  activitiesInRange,
  audienceConflicts,
  communicationChannelKind,
  communicationsInRange,
  isoDateOf,
} from "@/data/selectors";
import { blockerFor, blockerSummary } from "@/data/selectors/blockerSelectors";
import { originOf } from "@/data/selectors/originSelectors";
import type {
  CampaignActivity,
  ChannelKind,
  Communication,
  Event,
  EventType,
} from "@/data/types";
import { useScope } from "@/lib/scope";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { cn } from "@/lib/utils";
import { fmtDate, fmtDateShort } from "@/lib/format";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/** August 2026 — the demo month around TODAY (2026-08-13). */
const MONTH_START = "2026-08-01";
const MONTH_END = "2026-08-31";
/**
 * Both derived from the window above rather than restated, so the heading and
 * the grid can never disagree with the range the page actually queries.
 */
const MONTH_LABEL = new Date(`${MONTH_START}T00:00:00Z`).toLocaleDateString(
  DEFAULT_LOCALE,
  { month: "long", year: "numeric", timeZone: "UTC" },
);
const DAYS_IN_MONTH =
  Math.round(
    (Date.parse(`${MONTH_END}T00:00:00Z`) - Date.parse(`${MONTH_START}T00:00:00Z`)) /
      86_400_000,
  ) + 1;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Muted chip styling per channel kind (NST palette, 400–500 accents used sparingly). */
const channelChip: Record<ChannelKind, string> = {
  email: "bg-sky-600/10 text-sky-700 dark:text-sky-400",
  social: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  web: "bg-amber-600/10 text-amber-700 dark:text-amber-500",
  press: "bg-rose-600/10 text-rose-700 dark:text-rose-400",
  intranet: "bg-muted text-muted-foreground",
  event: "bg-primary/10 text-primary",
  SMS: "bg-sky-600/10 text-sky-700 dark:text-sky-400",
  print: "bg-muted text-muted-foreground",
  ads: "bg-amber-600/10 text-amber-700 dark:text-amber-500",
};

const fallbackChip = "bg-muted text-muted-foreground";

/** Event chips use a violet accent so they read apart from activity/comm chips. */
const eventChipClass = "bg-violet-600/10 text-violet-700 dark:text-violet-400";

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

const eventTypeLabel: Record<EventType, string> = {
  launch: "Launch",
  townhall: "Town hall",
  webinar: "Webinar",
  conference: "Conference",
};

function isoDay(dayOfMonth: number): string {
  return `2026-08-${String(dayOfMonth).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

type CalendarView = "month" | "week";

export default function CalendarPage() {
  const db = useLiveDB();
  const { brandId, businessUnitId, regionId } = useScope();
  const scope = useMemo(
    () => ({ brandId, businessUnitId, regionId }),
    [brandId, businessUnitId, regionId],
  );
  const [view, setView] = useState<CalendarView>("month");
  const [showEvents, setShowEvents] = useState(true);

  const { role } = useRole();
  const canReadRestricted = (RESTRICTED_READ_ROLES as readonly string[]).includes(role);
  const subjectOf = (c: Communication): string =>
    c.classification === "Restricted" && !canReadRestricted ? MASKED_SUBJECT : c.subject;
  // Agency users only see calendar items on their agency's assigned work
  // (blueprint hard scoping); audience conflicts are hidden entirely
  // (no Audience visibility).
  const agencyScope = useMemo(() => agencyScopeForRole(db, role), [db, role]);
  const agencyActivity = (a: CampaignActivity): boolean =>
    !agencyScope || agencyScope.activityIds.has(a.id);
  const agencyComm = (c: Communication): boolean =>
    !agencyScope ||
    (c.campaignActivityId !== undefined &&
      agencyScope.activityIds.has(c.campaignActivityId));

  // Monday-start week containing TODAY.
  const weekStart = useMemo(() => {
    const offset = (new Date(`${TODAY}T00:00:00Z`).getUTCDay() + 6) % 7;
    return addDays(TODAY, -offset);
  }, []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const weekEnd = weekDays[6];

  const [rangeStart, rangeEnd] =
    view === "month" ? [MONTH_START, MONTH_END] : [weekStart, weekEnd];

  const activities = activitiesInRange(db, scope, rangeStart, rangeEnd).filter(agencyActivity);
  const comms = communicationsInRange(db, scope, rangeStart, rangeEnd).filter(agencyComm);
  const conflicts = useMemo(
    () => (agencyScope ? [] : audienceConflicts(db, scope, rangeStart, rangeEnd)),
    [agencyScope, db, scope, rangeStart, rangeEnd],
  );
  const conflictDays = useMemo(
    () => new Set(conflicts.flatMap((c) => c.days)),
    [conflicts],
  );

  // Month-wide activity list for the table below, independent of the view.
  const monthActivities = activitiesInRange(db, scope, MONTH_START, MONTH_END).filter(
    agencyActivity,
  );

  // Events carry their own regionId, so region is the only scope axis that applies.
  // Agency users only see events tied to their assigned campaigns.
  const scopedEvents = useMemo(
    () =>
      db.events
        .filter((e) => !regionId || e.regionId === regionId)
        .filter(
          (e) =>
            !agencyScope ||
            (e.campaignId !== undefined && agencyScope.campaignIds.has(e.campaignId)),
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE)),
    [db, regionId, agencyScope],
  );
  const rangeEvents = showEvents
    ? scopedEvents.filter((e) => e.startDate <= rangeEnd && e.endDate >= rangeStart)
    : [];

  const kindOf = (channelId: string): ChannelKind =>
    db.channels.find((c) => c.id === channelId)?.channelKind ?? "web";
  const campaignName = (cid: string): string =>
    db.campaigns.find((c) => c.id === cid)?.name ?? cid;
  const channelName = (cid: string): string =>
    db.channels.find((c) => c.id === cid)?.name ?? cid;
  const audienceName = (aid: string): string =>
    db.audiences.find((a) => a.id === aid)?.name ?? aid;
  const stakeholderName = (sid: string): string =>
    db.stakeholders.find((s) => s.id === sid)?.name ?? sid;

  // Preconditions behind an empty calendar: the window in view, the scope in
  // force, and events hidden by the toggle. Each is stated rather than implied.
  const rangeLabel =
    view === "month" ? MONTH_LABEL : `the week of ${fmtDate(weekStart)}`;
  const activeScope = [
    brandId ? db.brands.find((b) => b.id === brandId)?.name ?? brandId : null,
    businessUnitId
      ? db.businessUnits.find((b) => b.id === businessUnitId)?.name ?? businessUnitId
      : null,
    regionId ? db.regions.find((r) => r.id === regionId)?.code ?? regionId : null,
  ].filter((part): part is string => part !== null);
  const scopeSuffix = [
    activeScope.length > 0 ? ` for ${activeScope.join(" · ")}` : "",
    agencyScope ? ` assigned to ${agencyScope.agencyName ?? "your agency"}` : "",
  ].join("");
  const hiddenEventCount = showEvents
    ? 0
    : scopedEvents.filter((e) => e.startDate <= rangeEnd && e.endDate >= rangeStart).length;

  const activitiesOnDay = (day: string): CampaignActivity[] =>
    activities.filter((a) => a.startDate <= day && a.endDate >= day);
  const commsOnDay = (day: string): Communication[] =>
    comms.filter((c) => isoDateOf(c.scheduledAt ?? "") === day);
  const eventsOnDay = (day: string): Event[] =>
    rangeEvents.filter((e) => e.startDate <= day && e.endDate >= day);

  // Monday-start grid: leading blanks before Aug 1.
  const firstWeekday = (new Date(`${MONTH_START}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  /** Tooltip text that names the blocker when a chip's record has one. */
  const chipTitle = (parts: (string | null)[]): string =>
    parts.filter((part): part is string => Boolean(part)).join(" · ");

  const activityChip = (a: CampaignActivity) => (
    <div
      key={a.id}
      title={chipTitle([
        a.name,
        campaignName(a.campaignId),
        (() => {
          const blocker = blockerFor(db, "CampaignActivity", a.id, a.status);
          return blocker ? blockerSummary(blocker) : null;
        })(),
      ])}
      className={cn(
        "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
        channelChip[kindOf(a.channelId)],
      )}
    >
      {a.name}
    </div>
  );

  const commChip = (c: Communication) => {
    const kind = communicationChannelKind(db, c.id);
    const subject = subjectOf(c);
    const blocker = blockerFor(db, "Communication", c.id, c.status);
    return (
      <div
        key={c.id}
        title={chipTitle([
          subject,
          `send to ${audienceName(c.audienceId)}`,
          blocker ? blockerSummary(blocker) : null,
        ])}
        className={cn(
          "truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight",
          kind ? channelChip[kind] : fallbackChip,
        )}
      >
        {subject}
      </div>
    );
  };

  const eventChip = (e: Event) => (
    <div
      key={e.id}
      title={`${e.name} · ${eventTypeLabel[e.eventType]} · ${e.venue}`}
      className={cn(
        "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight",
        eventChipClass,
      )}
    >
      <CalendarDays className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{e.name}</span>
    </div>
  );

  const conflictDot = (day: string) =>
    conflictDays.has(day) ? (
      <span
        title="Audience conflict"
        className="ml-auto mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
      />
    ) : null;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Calendar"
        description={`Campaign activities, scheduled communications, and events across ${MONTH_LABEL}`}
      />

      {agencyScope && (
        <p className="text-xs text-muted-foreground">
          Showing records assigned to {agencyScope.agencyName ?? "your agency"}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Events
          <Switch checked={showEvents} onCheckedChange={setShowEvents} />
        </label>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {conflicts.length === 1
              ? "1 audience conflict in view"
              : `${conflicts.length} audience conflicts in view`}
          </div>
          <ul className="mt-1.5 space-y-1 pl-6 text-sm text-muted-foreground">
            {conflicts.map((c) => (
              <li key={`${c.audienceId}-${c.startDay}`}>
                <span className="font-medium text-foreground">
                  {audienceName(c.audienceId)}
                </span>{" "}
                is targeted by {c.items.map((i) => i.label).join(", ")}{" "}
                <span className="whitespace-nowrap tabular-nums">
                  ({c.startDay === c.endDay
                    ? fmtDateShort(c.startDay)
                    : `${fmtDateShort(c.startDay)} – ${fmtDateShort(c.endDay)}`})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activities.length === 0 && comms.length === 0 && rangeEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled in this view"
          hint={
            hiddenEventCount > 0
              ? `No activity or communication falls in ${rangeLabel}${scopeSuffix}. ${
                  hiddenEventCount === 1
                    ? "1 event does, but the Events toggle is off."
                    : `${hiddenEventCount} events do, but the Events toggle is off.`
                }`
              : `No activity, communication or event falls in ${rangeLabel}${scopeSuffix}.${
                  activeScope.length > 0
                    ? " Widen the brand, business unit, or region filters in the top bar to see more."
                    : ""
                }`
          }
          action={
            hiddenEventCount > 0
              ? { label: "Show events", onClick: () => setShowEvents(true) }
              : undefined
          }
        />
      ) : view === "month" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{MONTH_LABEL}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="bg-muted px-2 py-1.5 text-center text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`blank-${i}`} className="min-h-24 bg-background/60" />;
                }
                const iso = isoDay(day);
                const dayActivities = activitiesOnDay(iso);
                const dayComms = commsOnDay(iso);
                const dayEvents = eventsOnDay(iso);
                const shownEvents = dayEvents.slice(0, 1);
                const shownActivities = dayActivities.slice(0, 2);
                const shownComms = dayComms.slice(0, 1);
                const extra =
                  dayEvents.length - shownEvents.length +
                  dayActivities.length - shownActivities.length +
                  dayComms.length - shownComms.length;
                const isToday = iso === TODAY;
                return (
                  <div key={iso} className="min-h-24 bg-card p-1.5">
                    <div className="flex items-start">
                      <div
                        className={cn(
                          "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs tabular-nums",
                          isToday
                            ? "bg-primary font-medium text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {day}
                      </div>
                      {conflictDot(iso)}
                    </div>
                    <div className="space-y-0.5">
                      {shownEvents.map(eventChip)}
                      {shownActivities.map(activityChip)}
                      {shownComms.map(commChip)}
                      {extra > 0 && (
                        <div className="px-1 text-[10px] tabular-nums text-muted-foreground">
                          +{extra} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Week of {fmtDate(weekStart)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
              {weekDays.map((iso, i) => {
                const isToday = iso === TODAY;
                return (
                  <div
                    key={`head-${iso}`}
                    className={cn(
                      "flex items-center justify-center gap-1.5 bg-muted px-2 py-1.5 text-[11px] uppercase tracking-wider",
                      isToday ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {WEEKDAYS[i]}
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full tabular-nums",
                        isToday && "bg-primary font-medium text-primary-foreground",
                      )}
                    >
                      {Number(iso.slice(8, 10))}
                    </span>
                  </div>
                );
              })}
              {weekDays.map((iso) => {
                const dayActivities = activitiesOnDay(iso);
                const dayComms = commsOnDay(iso);
                const dayEvents = eventsOnDay(iso);
                return (
                  <div key={iso} className="min-h-48 bg-card p-1.5">
                    <div className="flex items-start">{conflictDot(iso)}</div>
                    <div className="space-y-0.5">
                      {dayEvents.map(eventChip)}
                      {dayActivities.map(activityChip)}
                      {dayComms.map(commChip)}
                      {dayActivities.length === 0 &&
                        dayComms.length === 0 &&
                        dayEvents.length === 0 && (
                          <div className="px-1 text-[10px] text-muted-foreground">—</div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {scopedEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            {/* Named for what it is. This register is the whole scope, not the
                month or week drawn above it, and it does not answer to the
                Events switch — a card headed plain "Events" beside a grid
                showing August read as the month's events. */}
            <CardTitle className="text-sm font-medium">
              All events in scope
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedEvents.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                          eventChipClass,
                        )}
                      >
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {eventTypeLabel[e.eventType]}
                      </span>
                    </TableCell>
                    {/* The column is capped at max-w-56, and every venue in
                        the seed is longer than that — "Tokyo International
                        Forum + global livestream" needs 353px in a 224px box.
                        Without the tooltip the tail of every venue was
                        unreachable. */}
                    <TableCell
                      className="max-w-56 truncate text-sm text-muted-foreground"
                      title={e.venue}
                    >
                      {e.venue}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {e.startDate === e.endDate
                        ? fmtDate(e.startDate)
                        : `${fmtDate(e.startDate)} – ${fmtDate(e.endDate)}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.campaignId ? (
                        <Link
                          to={`/campaigns/${e.campaignId}`}
                          className="text-primary hover:underline"
                        >
                          {campaignName(e.campaignId)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stakeholderName(e.ownerStakeholderId)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* List fallback */}
      {monthActivities.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            {/* Always the month, including while the Week tab is selected —
                say so, rather than letting it read as the week above. */}
            <CardTitle className="text-sm font-medium">
              Activity list — {MONTH_LABEL}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-56">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthActivities.map((a) => {
                  const origin = originOf(db, "CampaignActivity", a.id);
                  return (
                    <TableRow key={a.id} className={proposedRowClass(origin.origin)}>
                      <TableCell className="font-medium">
                        <span className="flex flex-wrap items-center gap-2">
                          {a.name}
                          <OriginChip info={origin} />
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{campaignName(a.campaignId)}</TableCell>
                      <TableCell className="text-sm">{channelName(a.channelId)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">
                        {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                        <BlockerLine
                          blocker={blockerFor(db, "CampaignActivity", a.id, a.status)}
                          className="mt-1 flex"
                        />
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
}
