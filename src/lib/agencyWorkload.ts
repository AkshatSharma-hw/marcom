/**
 * Agency workload derivations, shared by the `/agencies` card grid and the
 * `/agencies/:id` record page.
 *
 * These lived in `AgenciesPage.tsx` while it was the only surface that needed
 * them. Once the routed record page wanted the same answers, exporting them
 * from a component module made every consumer pay a fast-refresh penalty and
 * made a page file the home of shared logic. They are pure functions over
 * `SeedDB` with no React in them, so they belong here.
 */

import type { Agency, Campaign, CampaignActivity, SeedDB, Stakeholder } from "@/data/types";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/**
 * Activities this agency executes, ordered by start date.
 *
 * One definition of "what this agency is on the hook for", not two that can
 * drift between the card and the record.
 */
export function activitiesOf(db: SeedDB, agencyId: string): CampaignActivity[] {
  return db.campaignActivities
    .filter((a) => a.agencyId === agencyId)
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE));
}

/** Distinct campaigns touched by a set of activities, in name order. */
export function campaignsTouched(db: SeedDB, activities: CampaignActivity[]): Campaign[] {
  const ids = new Set(activities.map((a) => a.campaignId));
  return db.campaigns
    .filter((c) => ids.has(c.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE));
}

/**
 * Contact stakeholders for an agency:
 * - external members — Agency User stakeholders whose email domain matches
 *   the agency name (e.g. lena.kovacs@brightnorth.agency ↔ Bright North Creative);
 * - internal owners — the Aureon stakeholders who own its activities.
 */
export function agencyContacts(
  db: SeedDB,
  agency: Agency,
  activities: CampaignActivity[],
): { external: Stakeholder[]; internal: Stakeholder[] } {
  /* `Stakeholder.agencyId` is an explicit seeded join and is what
     `lib/agencyScope.ts` already prefers; the email-domain comparison is only a
     fallback for a record that carries no agencyId. Matching on a domain
     fragment alone would attach a contact to the wrong agency as soon as two
     agency names share one. */
  const compactName = agency.name.toLowerCase().replace(/[^a-z]/g, "");
  const external = db.stakeholders.filter((s) => {
    if (s.role !== "Agency User") return false;
    if (s.agencyId) return s.agencyId === agency.id;
    const domainLabel = s.email.split("@")[1]?.split(".")[0]?.toLowerCase() ?? "";
    return domainLabel.length > 0 && compactName.includes(domainLabel);
  });
  const ownerIds = new Set(activities.map((a) => a.ownerStakeholderId));
  const internal = db.stakeholders.filter((s) => ownerIds.has(s.id));
  return { external, internal };
}
