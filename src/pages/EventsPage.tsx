/**
 * Events workspace — launches, webinars, townhalls, and conferences tied to
 * campaign lineages.
 *
 * Layout:
 *  - KPI strip: upcoming events, events this quarter, linked campaigns — all
 *    derived from the scoped event list.
 *  - Event cards grouped Upcoming (endDate >= TODAY) then Past, each showing
 *    the type chip, venue, date range, region, owner, linked campaign, and the
 *    campaign's communications scheduled inside the event window.
 *  - Per-card expand: a simple run-of-show derived from the campaign's
 *    activities overlapping the event dates.
 *
 * Scope: region filters directly on the event; brand and business unit filter
 * through the linked campaign. Events without a campaign cannot express
 * brand/BU and stay visible under those filters.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  ListOrdered,
  MapPin,
  Megaphone,
  User,
} from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { TODAY } from "@/data/selectors";
import type { Campaign, Event, SeedDB } from "@/data/types";
import { useScope } from "@/lib/scope";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { fmtDate, fmtDateShort } from "@/lib/format";
import {
  communicationsInEventWindow,
  fmtEventRange,
  runOfShow,
} from "@/lib/eventWindow";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { EventTypeChip } from "@/components/marcomm/EventTypeChip";

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

/** True when `isoDate` falls inside the calendar quarter containing TODAY. */
function inCurrentQuarter(isoDate: string): boolean {
  const today = new Date(`${TODAY}T00:00:00Z`);
  const qStartMonth = Math.floor(today.getUTCMonth() / 3) * 3;
  const start = Date.UTC(today.getUTCFullYear(), qStartMonth, 1);
  const end = Date.UTC(today.getUTCFullYear(), qStartMonth + 3, 1);
  const t = Date.parse(`${isoDate}T00:00:00Z`);
  return t >= start && t < end;
}

/* ------------------------------------------------------------------ */
/* Event card                                                          */
/* ------------------------------------------------------------------ */

function EventCard({
  db,
  event,
  campaign,
}: {
  db: SeedDB;
  event: Event;
  campaign?: Campaign;
}) {
  const [open, setOpen] = useState(false);

  const regionName =
    db.regions.find((r) => r.id === event.regionId)?.name ?? event.regionId;
  const owner = db.stakeholders.find((s) => s.id === event.ownerStakeholderId);
  const comms = communicationsInEventWindow(db, event);
  const activities = runOfShow(db, event);
  const channelName = (channelId: string): string =>
    db.channels.find((c) => c.id === channelId)?.name ?? channelId;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* The name is the card's primary cell and the way into
                  /events/:id — a real link, so it is keyboard reachable and
                  cmd-click opens a new tab. */}
              <Link
                to={`/events/${event.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {event.name}
              </Link>
              <EventTypeChip type={event.eventType} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {fmtEventRange(event)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.venue}
              </span>
              <span>{regionName}</span>
              {owner && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {owner.name}
                </span>
              )}
            </div>
          </div>
          <div className="text-sm">
            {campaign ? (
              <Link
                to={`/campaigns/${campaign.id}`}
                className="text-primary hover:underline"
              >
                {campaign.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">No linked campaign</span>
            )}
          </div>
        </div>

        {/* Campaign communications scheduled inside the event window */}
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Communications in event window ({comms.length})
          </div>
          {comms.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No campaign communications scheduled during this event.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {comms.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <Megaphone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">{c.subject}</span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(c.scheduledAt ?? "")}
                  </span>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Run-of-show expand */}
        <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  open && "rotate-180",
                )}
              />
              Run of show ({activities.length})
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {activities.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No campaign activities overlap this event&apos;s dates.
              </p>
            ) : (
              <ol className="mt-2 space-y-1.5 border-l pl-4">
                {activities.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <ListOrdered className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {channelName(a.channelId)} · {fmtDateShort(a.startDate)} –{" "}
                      {fmtDateShort(a.endDate)}
                    </span>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ol>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function EventsPage() {
  const db = useLiveDB();
  const { brandId, businessUnitId, regionId } = useScope();
  const { role } = useRole();

  const campaignById = useMemo(
    () => new Map(db.campaigns.map((c) => [c.id, c])),
    [db],
  );

  // Agency users only see events tied to their assigned campaigns.
  const agencyScope = useMemo(() => agencyScopeForRole(db, role), [db, role]);

  /* Scope: region on the event itself; brand/BU via the linked campaign. */
  const events = useMemo(() => {
    return db.events
      .filter((event) => {
        if (
          agencyScope &&
          !(
            event.campaignId !== undefined &&
            agencyScope.campaignIds.has(event.campaignId)
          )
        )
          return false;
        if (regionId && event.regionId !== regionId) return false;
        if (brandId || businessUnitId) {
          const campaign = event.campaignId
            ? campaignById.get(event.campaignId)
            : undefined;
          if (campaign) {
            if (brandId && campaign.brandId !== brandId) return false;
            if (businessUnitId && campaign.businessUnitId !== businessUnitId)
              return false;
          }
          // Events without a campaign cannot express brand/BU; keep visible.
        }
        return true;
      })
      .slice()
      .sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE) || a.name.localeCompare(b.name, DEFAULT_LOCALE),
      );
  }, [db, campaignById, agencyScope, brandId, businessUnitId, regionId]);

  const upcoming = events.filter((e) => e.endDate >= TODAY);
  const past = events
    .filter((e) => e.endDate < TODAY)
    .sort(
      (a, b) =>
        b.startDate.localeCompare(a.startDate, DEFAULT_LOCALE) || a.name.localeCompare(b.name, DEFAULT_LOCALE),
    );
  const eventsThisQuarter = events.filter((e) =>
    inCurrentQuarter(e.startDate),
  ).length;
  const linkedCampaignCount = new Set(
    events.flatMap((e) => (e.campaignId ? [e.campaignId] : [])),
  ).size;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Events"
        description="Launches, webinars, townhalls, and conferences across the portfolio"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile
          label="Upcoming events"
          value={upcoming.length}
          sub={`running on or after ${fmtDate(TODAY)}`}
        />
        <KpiTile
          label="Events this quarter"
          value={eventsThisQuarter}
          sub="starting this calendar quarter"
        />
        <KpiTile
          label="Linked campaigns"
          value={linkedCampaignCount}
          sub="distinct campaigns with an event"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Events also appear on the{" "}
        <Link to="/calendar" className="text-primary hover:underline">
          unified calendar
        </Link>
        .
      </p>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events in this scope"
          hint={
            agencyScope
              ? `Events are limited to those on campaigns assigned to ${agencyScope.agencyName ?? "your agency"}, and none of those campaigns has one — the top-bar filters are not what is holding this empty.`
              : "Widen the brand, business unit, or region filters in the top bar to see more events."
          }
        />
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events in this scope.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    db={db}
                    event={event}
                    campaign={
                      event.campaignId
                        ? campaignById.get(event.campaignId)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Past ({past.length})
            </h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No past events in this scope.
              </p>
            ) : (
              <div className="space-y-3">
                {past.map((event) => (
                  <EventCard
                    key={event.id}
                    db={db}
                    event={event}
                    campaign={
                      event.campaignId
                        ? campaignById.get(event.campaignId)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
