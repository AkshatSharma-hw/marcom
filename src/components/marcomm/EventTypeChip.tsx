/**
 * One distinct muted tone per event kind, worn by the `/events` card and the
 * `/events/:id` record it opens — the same chip either way.
 */

import type { EventType } from "@/data/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Event-type chips — one distinct muted tone per kind                 */
/* ------------------------------------------------------------------ */

const eventTypeChip: Record<EventType, { label: string; className: string }> = {
  launch: {
    label: "Launch",
    className: "border-sky-600/20 bg-sky-600/10 text-sky-700 dark:text-sky-400",
  },
  webinar: {
    label: "Webinar",
    className:
      "border-violet-600/20 bg-violet-600/10 text-violet-700 dark:text-violet-400",
  },
  townhall: {
    // Matches `eventTypeLabel` on the calendar — one event type, one label.
    label: "Town hall",
    className:
      "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:text-amber-400",
  },
  conference: {
    label: "Conference",
    className:
      "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  },
};

export function EventTypeChip({ type }: { type: EventType }) {
  const chip = eventTypeChip[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        chip.className,
      )}
    >
      {chip.label}
    </span>
  );
}
