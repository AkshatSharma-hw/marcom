/**
 * Routed detail page for one Event — /events/:id.
 *
 * The events workspace renders every event as a card with an inline expand, so
 * an event had no address of its own: no URL, no back button, nothing to send
 * someone. This is that address.
 *
 * Both derived lists on this page — the communications inside the event window
 * and the "run of show" — come from `lib/eventWindow.ts` rather than rewritten,
 * because they are date-window overlaps and two implementations of the same
 * overlap drift silently. The run of show in particular is *not* an agenda:
 * nothing in the model holds a running order, and the page says so where it
 * renders it.
 *
 * Event carries no status field, so the header shows no status badge and no
 * lifecycle stepper — `lifecycleStageFor("Event", undefined)` returns null and
 * the stepper renders nothing. What the page does show instead is where the
 * event sits against the demo clock (TODAY), which is the split the events list
 * groups by.
 */

import { Link, useParams } from "react-router-dom";
import {
  CalendarDays,
  ListOrdered,
  MapPin,
  Megaphone,
  User,
} from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { TODAY } from "@/data/selectors";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { fmtDate, fmtDateShort } from "@/lib/format";

import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  communicationsInEventWindow,
  fmtEventRange,
  runOfShow,
} from "@/lib/eventWindow";
import { EventTypeChip } from "@/components/marcomm/EventTypeChip";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useLiveDB();
  const { role } = useRole();

  /* Agency users see an event only when it hangs off a campaign assigned to
     them — the exact filter the events list applies before its scope filters. */
  const agencyScope = agencyScopeForRole(db, role);
  const event = db.events.find((e) => e.id === id);
  const inAgencyScope =
    !agencyScope ||
    (event?.campaignId !== undefined && agencyScope.campaignIds.has(event.campaignId));

  if (!event || !inAgencyScope) {
    return (
      <RecordNotFound
        icon={CalendarDays}
        noun="event"
        id={id}
        backTo="/events"
        backLabel="events"
        outOfScope={event !== undefined}
        scopeHint={agencyScope?.agencyName ?? "your agency"}
      />
    );
  }

  const campaign = event.campaignId
    ? db.campaigns.find((c) => c.id === event.campaignId)
    : undefined;
  const region = db.regions.find((r) => r.id === event.regionId);
  const owner = db.stakeholders.find((s) => s.id === event.ownerStakeholderId);

  const comms = communicationsInEventWindow(db, event);
  const activities = runOfShow(db, event);

  const channelName = (channelId: string): string =>
    db.channels.find((c) => c.id === channelId)?.name ?? channelId;

  // The same split the events list groups by: an event is upcoming until the
  // day after it ends, measured against the dataset's fixed clock.
  const upcoming = event.endDate >= TODAY;

  const facts: { label: string; value: string }[] = [
    { label: "Type", value: event.eventType },
    { label: "Dates", value: fmtEventRange(event) },
    { label: "Venue", value: event.venue },
    { label: "Region", value: region?.name ?? event.regionId },
    { label: "Owner", value: owner?.name ?? event.ownerStakeholderId },
    { label: "Timing", value: upcoming ? "Upcoming" : "Past" },
  ];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="Event"
        id={event.id}
        title={event.name}
        description={event.venue}
        /* Event has no status column. Passing one would mean inventing it, so
           the header shows the type chip beside the title instead and the
           blocker line still resolves any approval raised against the event. */
        blocker={blockerFor(db, "Event", event.id)}
        backTo="/events"
        backLabel="Events"
        actions={<EventTypeChip type={event.eventType} />}
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
              Campaign
            </span>
            {campaign ? (
              <span className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {campaign.name}
                </Link>
                <StatusBadge status={campaign.status} />
                <BlockerLine
                  blocker={blockerFor(db, "Campaign", campaign.id, campaign.status)}
                />
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Not linked to a campaign — everything below this line is derived
                through that link, so it stays empty until one is set.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Communications inside the event window */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Communications in the event window ({comms.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {comms.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Nothing scheduled during this event"
              hint={
                campaign
                  ? `A communication lands here when it is scheduled on one of ${campaign.name}'s activities between ${fmtDate(event.startDate)} and ${fmtDate(event.endDate)}. None of that campaign's communications carries a send date inside those days.`
                  : "Communications reach an event through its linked campaign's activities. This event has no linked campaign, so there is nothing to match against its dates."
              }
            />
          ) : (
            <ul className="space-y-2">
              {comms.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Megaphone
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate text-sm">{c.subject}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {fmtDate(c.scheduledAt ?? "")}
                      </span>
                      <StatusBadge status={c.status} />
                    </span>
                    <BlockerLine
                      blocker={blockerFor(db, "Communication", c.id, c.status)}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Run of show */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Run of show ({activities.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Not an agenda. This is the linked campaign&rsquo;s activities whose own
            start and end dates overlap {fmtDate(event.startDate)} –{" "}
            {fmtDate(event.endDate)}, ordered by start date. No record in the model
            holds a running order for an event, so none is shown.
          </p>
          {activities.length === 0 ? (
            <EmptyState
              icon={ListOrdered}
              title="No overlapping activities"
              hint={
                campaign
                  ? `None of ${campaign.name}'s activities runs across any of this event's days. An activity appears here when its window touches the event window — it does not have to be about the event.`
                  : "Activities reach an event through its linked campaign. This event has no linked campaign, so there is no activity set to overlap with."
              }
            />
          ) : (
            <ol className="space-y-2 border-l pl-4">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <ListOrdered
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate text-sm">{a.name}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {channelName(a.channelId)} · {fmtDateShort(a.startDate)} –{" "}
                        {fmtDateShort(a.endDate)}
                      </span>
                      <StatusBadge status={a.status} />
                    </span>
                    <BlockerLine
                      blocker={blockerFor(db, "CampaignActivity", a.id, a.status)}
                    />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Where else this event shows up */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Elsewhere</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 text-sm">
          <Link to="/calendar" className="inline-flex items-center gap-1.5 text-primary hover:underline">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Unified calendar
          </Link>
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {event.venue}
          </span>
          {owner && (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              {owner.name} · {owner.role}
            </span>
          )}
        </CardContent>
      </Card>

      <RecordAuditTrail entity="Event" id={event.id} />
    </RecordDetailPage>
  );
}
