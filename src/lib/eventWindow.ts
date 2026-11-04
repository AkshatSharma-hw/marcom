/**
 * Event-window derivations, shared by the `/events` list and the `/events/:id`
 * record page.
 *
 * Both surfaces answer the same two questions — what is scheduled inside the
 * event's dates, and which campaign activities overlap it — and a second
 * implementation of a date-window overlap is exactly the kind of thing that
 * quietly drifts. Pure functions over `SeedDB`, so they live outside the
 * component modules that consume them.
 */

import type { CampaignActivity, Communication, Event, SeedDB } from "@/data/types";
import { fmtDate, fmtDateShort } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/** 'Sep 1, 2026' for single-day events, 'Sep 1 – Sep 3, 2026' otherwise. */
export function fmtEventRange(event: Event): string {
  if (event.startDate === event.endDate) return fmtDate(event.startDate);
  return `${fmtDateShort(event.startDate)} – ${fmtDate(event.endDate)}`;
}

/** The linked campaign's communications scheduled inside the event window. */
export function communicationsInEventWindow(db: SeedDB, event: Event): Communication[] {
  if (!event.campaignId) return [];
  const activityIds = new Set(
    db.campaignActivities
      .filter((a) => a.campaignId === event.campaignId)
      .map((a) => a.id),
  );
  return db.communications
    .filter((c) => {
      if (!c.scheduledAt) return false;
      if (!c.campaignActivityId || !activityIds.has(c.campaignActivityId))
        return false;
      const day = c.scheduledAt.slice(0, 10);
      return day >= event.startDate && day <= event.endDate;
    })
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "", DEFAULT_LOCALE));
}

/**
 * The linked campaign's activities whose window overlaps the event dates.
 *
 * This is a DATE OVERLAP, not an agenda — no record in the model holds a
 * running order, and nothing here invents one.
 */
export function runOfShow(db: SeedDB, event: Event): CampaignActivity[] {
  if (!event.campaignId) return [];
  return db.campaignActivities
    .filter(
      (a) =>
        a.campaignId === event.campaignId &&
        a.startDate <= event.endDate &&
        a.endDate >= event.startDate,
    )
    .sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE) ||
        a.name.localeCompare(b.name, DEFAULT_LOCALE),
    );
}
