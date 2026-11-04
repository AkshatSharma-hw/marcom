/**
 * Asset rights-window arithmetic, shared by the `/assets` library row and the
 * `/assets/:id` record page.
 *
 * One definition of "expiring soon" so a row and a record can never disagree
 * about the same asset. Every day figure on either surface comes from here —
 * none is written into a string.
 */

import { TODAY } from "@/data/selectors";

/** Rights expiring within this many days of the demo clock get an amber warning. */
export const EXPIRY_WARNING_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days from the demo clock (`TODAY`) until the given ISO date; negative
 * once the window has closed.
 */
export function daysUntil(isoDate: string): number {
  return Math.round((Date.parse(isoDate) - Date.parse(TODAY)) / DAY_MS);
}
