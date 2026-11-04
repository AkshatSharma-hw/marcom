/**
 * The amber/red pill a row or a record shows for a closing rights window.
 *
 * Shared by the `/assets` library table and the `/assets/:id` record so both
 * express the same window with the same words. The arithmetic behind it lives
 * in `lib/assetRights.ts`.
 */

import { EXPIRY_WARNING_DAYS, daysUntil } from "@/lib/assetRights";

/** The amber/red chip a row or a record shows for a closing rights window. */
export function ExpiryChip({ isoDate }: { isoDate: string }) {
  const days = daysUntil(isoDate);
  if (days < 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
        Rights expired
      </span>
    );
  }
  if (days <= EXPIRY_WARNING_DAYS) {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
        {days === 0 ? "Expires today" : `Expires in ${days} ${days === 1 ? "day" : "days"}`}
      </span>
    );
  }
  return null;
}
