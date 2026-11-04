/**
 * Agency scoping for the Agency User persona.
 *
 * An Agency User must only see the slice of the org assigned to their agency,
 * derived through CampaignActivity.agencyId lineage:
 *
 *   Stakeholder.agencyId (explicit join, email-domain fallback) → Agency
 *     → CampaignActivity.agencyId → Campaign
 *     → Content (campaignId) → ContentVersion.assetIds → Asset
 *
 * Blueprint: agency users are hard-scoped to assigned Campaign/Brief/Asset
 * records — no Audience, Budget, KPI, Policy, or crisis visibility. List pages
 * apply `agencyScopeForRole` before their existing brand/BU/region filters;
 * route-level gating is handled separately by <RequireRole>.
 */

import type { AppRole, SeedDB, Stakeholder } from "@/data/types";

export interface AgencyScope {
  /** The resolved agency id, or null when no agency could be matched. */
  agencyId: string | null;
  /** Display name of the resolved agency (for scoping captions). */
  agencyName: string | null;
  campaignIds: Set<string>;
  /** Activities the agency itself executes (activity.agencyId match). */
  activityIds: Set<string>;
  contentIds: Set<string>;
  assetIds: Set<string>;
}

/** Whether a role's data visibility is limited to its own agency's work. */
export function isAgencyRestricted(role: AppRole): boolean {
  return role === "Agency User";
}

/** Lowercased alphanumeric form used to match agency names to email domains. */
function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolve the stakeholder's agency. The explicit `Stakeholder.agencyId` join
 * (seeded on agency personas) wins; otherwise fall back to matching the email
 * domain against seeded agency names (lena.kovacs@brightnorth.agency →
 * "Bright North Creative").
 */
function resolveAgencyId(db: SeedDB, stakeholder: Stakeholder): string | null {
  if (
    stakeholder.agencyId &&
    db.agencies.some((agency) => agency.id === stakeholder.agencyId)
  ) {
    return stakeholder.agencyId;
  }
  const domain = stakeholder.email.split("@")[1];
  if (!domain) return null;
  // "brightnorth.agency" → "brightnorth" (drop TLD segments)
  const domainSlug = slug(domain.split(".")[0]);
  if (!domainSlug) return null;
  const match = db.agencies.find((agency) => {
    const nameSlug = slug(agency.name);
    return nameSlug.includes(domainSlug) || domainSlug.includes(nameSlug);
  });
  return match?.id ?? null;
}

function emptyScope(): AgencyScope {
  return {
    agencyId: null,
    agencyName: null,
    campaignIds: new Set<string>(),
    activityIds: new Set<string>(),
    contentIds: new Set<string>(),
    assetIds: new Set<string>(),
  };
}

/**
 * Compute the ids an Agency User is allowed to see.
 *
 * - campaignIds: campaigns with at least one activity assigned to the agency
 * - activityIds: the agency's own activities
 * - contentIds: contents attached to those campaigns
 * - assetIds: assets embedded in versions of those contents
 *
 * Returns empty sets when the stakeholder cannot be matched to an agency
 * (fail closed: an unmatched agency user sees nothing, not everything).
 */
export function scopeForAgencyUser(db: SeedDB, stakeholder: Stakeholder): AgencyScope {
  const agencyId = resolveAgencyId(db, stakeholder);
  const scope = emptyScope();
  if (!agencyId) return scope;

  scope.agencyId = agencyId;
  scope.agencyName = db.agencies.find((a) => a.id === agencyId)?.name ?? null;

  for (const activity of db.campaignActivities) {
    if (activity.agencyId === agencyId) {
      scope.activityIds.add(activity.id);
      scope.campaignIds.add(activity.campaignId);
    }
  }

  for (const content of db.contents) {
    if (content.campaignId && scope.campaignIds.has(content.campaignId)) {
      scope.contentIds.add(content.id);
    }
  }

  for (const version of db.contentVersions) {
    if (!scope.contentIds.has(version.contentId)) continue;
    for (const id of version.assetIds ?? []) scope.assetIds.add(id);
  }

  return scope;
}

/**
 * Convenience for pages: the agency scope for the signed-in role, or null when
 * the role is not agency-restricted (callers then skip agency filtering).
 * Fails closed when no seeded stakeholder holds the role.
 */
export function agencyScopeForRole(db: SeedDB, role: AppRole): AgencyScope | null {
  if (!isAgencyRestricted(role)) return null;
  const stakeholder = db.stakeholders.find((s) => s.role === role);
  if (!stakeholder) return emptyScope();
  return scopeForAgencyUser(db, stakeholder);
}
