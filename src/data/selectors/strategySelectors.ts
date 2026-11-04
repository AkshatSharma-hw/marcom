/**
 * Strategy selectors — pure functions over the frozen SeedDB.
 * Alignment mapping: Campaigns ladder to a Strategy via `strategyId`;
 * Ideas reference a Strategy through the campaign they were promoted into
 * (idea.promotedToCampaignId / campaign.ideaId → campaign.strategyId).
 */

import type { Campaign, Idea, SeedDB, Strategy } from '../types';
import { campaignsInScope, type Scope } from './campaignSelectors';

/** Strategies matching the scope (strategies carry only a business unit). */
export function strategiesInScope(db: SeedDB, scope: Scope): Strategy[] {
  return db.strategies.filter(
    (s) => !scope.businessUnitId || s.businessUnitId === scope.businessUnitId,
  );
}

/** Ideas matching the scope by brand, business unit, and region. */
export function ideasInScope(db: SeedDB, scope: Scope): Idea[] {
  return db.ideas.filter((i) => {
    if (scope.brandId && i.brandId !== scope.brandId) return false;
    if (scope.businessUnitId && i.businessUnitId !== scope.businessUnitId) return false;
    if (scope.regionId && i.regionId !== scope.regionId) return false;
    return true;
  });
}

/** The campaign an idea was promoted into, resolved from either side of the link. */
function promotedCampaignOf(db: SeedDB, idea: Idea): Campaign | undefined {
  if (idea.promotedToCampaignId) {
    return db.campaigns.find((c) => c.id === idea.promotedToCampaignId);
  }
  return db.campaigns.find((c) => c.ideaId === idea.id);
}

export interface StrategyAlignment {
  /** In-scope ideas whose promoted campaign ladders to the strategy. */
  ideas: Idea[];
  /** In-scope campaigns laddering to the strategy via strategyId. */
  campaigns: Campaign[];
}

/** Alignment map for one strategy: referencing ideas and laddering campaigns, in scope. */
export function strategyAlignment(
  db: SeedDB,
  strategyId: string,
  scope: Scope,
): StrategyAlignment {
  const campaigns = campaignsInScope(db, scope).filter((c) => c.strategyId === strategyId);
  const ideas = ideasInScope(db, scope).filter(
    (i) => promotedCampaignOf(db, i)?.strategyId === strategyId,
  );
  return { ideas, campaigns };
}

/** In-scope campaigns that ladder to no strategy (missing strategyId). */
export function orphanCampaigns(db: SeedDB, scope: Scope): Campaign[] {
  return campaignsInScope(db, scope).filter((c) => !c.strategyId);
}
