/**
 * Budget selectors — pure functions over the frozen SeedDB.
 * Spend is always derived from CampaignActivity.spendAllocated; planned money
 * comes from Budget rows and Campaign.budgetAllocation. No literals.
 */

import type { SeedDB } from '../types';
import { applyScope, campaignsInScope, type Scope } from './campaignSelectors';

export interface BudgetUtilization {
  businessUnitId: string;
  budgetId: string | null;
  /** Budget.amountPlanned for the BU's fiscal-year budget. */
  amountPlanned: number;
  /** Sum of the budget's per-campaign allocations. */
  allocated: number;
  /** Sum of activity spendAllocated across the BU's campaigns. */
  committed: number;
  /** committed / amountPlanned, as a 0–100 percentage (0 when no budget). */
  utilizationPct: number;
}

export interface PlannedVsCommitted {
  /** Sum of Campaign.budgetAllocation across campaigns in scope. */
  planned: number;
  /** Sum of activity spendAllocated across campaigns in scope. */
  committed: number;
  campaignCount: number;
}

/** Total spend ALLOCATED across a campaign's activities, whatever their status. */
export function campaignSpend(db: SeedDB, campaignId: string): number {
  return db.campaignActivities
    .filter((a) => a.campaignId === campaignId)
    .reduce((sum, a) => sum + a.spendAllocated, 0);
}

/**
 * Spend actually COMMITTED — activities that have started or finished. Planned
 * activities are money earmarked, not money owed, so a campaign whose work has
 * not begun reads 0% committed rather than fully burnt.
 */
export function campaignCommittedSpend(db: SeedDB, campaignId: string): number {
  return db.campaignActivities
    .filter(
      (a) =>
        a.campaignId === campaignId &&
        (a.status === 'In Progress' || a.status === 'Completed'),
    )
    .reduce((sum, a) => sum + a.spendAllocated, 0);
}

/** Planned vs allocated vs committed money for one business unit's budget. */
export function budgetUtilization(db: SeedDB, businessUnitId: string): BudgetUtilization {
  const budget = db.budgets.find((b) => b.businessUnitId === businessUnitId) ?? null;
  const amountPlanned = budget?.amountPlanned ?? 0;
  const allocated = budget?.allocations.reduce((sum, a) => sum + a.amount, 0) ?? 0;
  const committed = applyScope(db.campaigns, { businessUnitId }).reduce(
    (sum, c) => sum + campaignSpend(db, c.id),
    0,
  );
  return {
    businessUnitId,
    budgetId: budget?.id ?? null,
    amountPlanned,
    allocated,
    committed,
    utilizationPct: amountPlanned > 0 ? (committed / amountPlanned) * 100 : 0,
  };
}

/**
 * Σ Budget.amountPlanned across business units in scope — the finance-plan
 * denominator. This is THE denominator for every utilization percentage in
 * the app (Command Center tile, board pack, Budget page): utilization =
 * committed activity spend / budgetsPlannedTotal. Budgets are BU-scoped, so
 * only scope.businessUnitId narrows the total (brand/region do not).
 */
export function budgetsPlannedTotal(db: SeedDB, scope: Scope): number {
  return db.budgets
    .filter((b) => !scope.businessUnitId || b.businessUnitId === scope.businessUnitId)
    .reduce((sum, b) => sum + b.amountPlanned, 0);
}

/** Aggregate planned budget vs committed activity spend across campaigns in scope. */
export function totalPlannedVsCommitted(db: SeedDB, scope: Scope): PlannedVsCommitted {
  const campaigns = campaignsInScope(db, scope);
  return {
    planned: campaigns.reduce((sum, c) => sum + c.budgetAllocation, 0),
    committed: campaigns.reduce((sum, c) => sum + campaignSpend(db, c.id), 0),
    campaignCount: campaigns.length,
  };
}
