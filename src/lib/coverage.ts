/**
 * Coverage scoping and tone mapping — one rule, two pages.
 *
 * The `/pr` Coverage tab and the routed `/pr/contacts/:id` record show the same
 * items under the same top-bar filters. If the record page re-implemented the
 * predicate, the two could disagree about the same item under the same filters
 * — precisely the bug the sheet this replaced used to have (it read
 * `db.coverageItems` whole, so its count could exceed the table behind it).
 */

import type { ChipTone } from "@/components/marcomm/Chip";
import { TODAY } from "@/data/selectors";
import type {
  CoverageItem,
  CoverageSentiment,
  MediaRelationship,
  SeedDB,
} from "@/data/types";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export const sentimentTone: Record<CoverageSentiment, ChipTone> = {
  Positive: "success",
  Neutral: "muted",
  Negative: "destructive",
};

export const relationshipTone: Record<MediaRelationship, ChipTone> = {
  Strong: "success",
  Warm: "warning",
  New: "muted",
};

/**
 * 'today' | 'yesterday' | 'N days ago' | 'N weeks ago' relative to TODAY.
 *
 * Counted in whole calendar days (the date part of the timestamp against
 * TODAY), not in elapsed 24-hour blocks: an interaction logged yesterday
 * evening is fewer than 24 hours old but is still "yesterday".
 */
export function relativeToToday(iso: string): string {
  const days = Math.round(
    (Date.parse(`${TODAY}T00:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)) /
      86_400_000,
  );
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

/** The brand / BU / region filters from the top bar, as the tab reads them. */
export interface CoverageScope {
  brandId?: string;
  businessUnitId?: string;
  regionId?: string;
}

/**
 * The coverage list the Coverage tab renders, newest first.
 *
 * Scope travels through the linked campaign where one exists. Crisis-adjacent
 * items belong to no campaign and can only express the *contact's* region, so
 * they stay visible under brand/BU filters they have no way of answering.
 */
export function scopedCoverage(db: SeedDB, scope: CoverageScope): CoverageItem[] {
  const { brandId, businessUnitId, regionId } = scope;
  const campaignById = new Map(db.campaigns.map((c) => [c.id, c]));
  const contactById = new Map(db.mediaContacts.map((m) => [m.id, m]));

  return db.coverageItems
    .filter((item) => {
      const campaign = item.campaignId ? campaignById.get(item.campaignId) : undefined;
      if (campaign) {
        if (brandId && campaign.brandId !== brandId) return false;
        if (businessUnitId && campaign.businessUnitId !== businessUnitId) return false;
        if (regionId && !campaign.regionIds.includes(regionId)) return false;
        return true;
      }
      // No campaign: only the contact's region is filterable.
      if (regionId) {
        const contact = item.mediaContactId
          ? contactById.get(item.mediaContactId)
          : undefined;
        if (contact && contact.regionId !== regionId) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt, DEFAULT_LOCALE));
}
