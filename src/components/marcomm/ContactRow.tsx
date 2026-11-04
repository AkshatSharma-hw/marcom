/**
 * A stakeholder line — avatar, name, and what they are to this record.
 *
 * Shared by the `/agencies` card and the `/agencies/:id` record so a contact
 * reads identically on both.
 */

import type { Stakeholder } from "@/data/types";

export function ContactRow({ person, note }: { person: Stakeholder; note: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
        {person.avatar}
      </span>
      <div className="min-w-0">
        <div className="truncate font-medium">{person.name}</div>
        <div className="truncate text-xs text-muted-foreground">{note}</div>
      </div>
    </div>
  );
}
