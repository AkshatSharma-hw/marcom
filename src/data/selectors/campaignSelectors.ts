/**
 * Campaign selectors — pure functions over the frozen SeedDB.
 * Every displayed campaign number derives from these; nothing is hard-coded.
 */

import type {
  Agency,
  Audience,
  Campaign,
  CampaignActivity,
  CampaignActivityStatus,
  CampaignStatus,
  ChannelExecution,
  Communication,
  SeedDB,
  Stakeholder,
} from '../types';
import { kpiAttainment } from './metricSelectors';
import { DEFAULT_LOCALE } from "@/lib/i18n";

/** Anchor date for all schedule math — the demo's "today". */
export const TODAY = '2026-08-13';

/**
 * The demo clock as an *instant*, for anything comparing timestamps rather
 * than dates: the end of TODAY.
 *
 * Three surfaces had each picked their own instant for the same clock —
 * `blockerSelectors` used end of day, the approvals inbox used midnight, the
 * governance risk list rounded a day difference — so the same approval could
 * read "SLA breached" on one page and "on time" on another, and an approval
 * created at 08:05 today produced a *negative* "days waiting". Midnight is the
 * wrong instant for a clock that is meant to mean "now, on the demo's today":
 * it puts every event of the current day in the future.
 */
export const DEMO_NOW_ISO = `${TODAY}T23:59:59Z`;

/** `DEMO_NOW_ISO` as epoch ms. */
export const DEMO_NOW_MS = Date.parse(DEMO_NOW_ISO);

/** Whether an ISO timestamp is already in the past on the demo clock. */
export function isPastOnDemoClock(iso: string): boolean {
  const t = Date.parse(iso);
  return !Number.isNaN(t) && t < DEMO_NOW_MS;
}

export interface Scope {
  brandId?: string;
  businessUnitId?: string;
  regionId?: string;
}

export type Rag = 'green' | 'amber' | 'red';

export interface CampaignHealth {
  campaignId: string;
  rag: Rag;
  /** Elapsed fraction of the campaign window, clamped to [0, 1]. */
  scheduleProgress: number;
  /** Committed spend (completed + prorated in-progress activities) / budgetAllocation. */
  budgetBurn: number;
  /** Mean attainment ratio across the campaign's KPIs with metric data, or null. */
  kpiAttainment: number | null;
  blockedActivities: number;
  reasons: string[];
}

/* ------------------------------------------------------------------ */
/* Scope filtering                                                     */
/* ------------------------------------------------------------------ */

/** Filters campaigns by any combination of brand, business unit, and region. */
export function applyScope(campaigns: Campaign[], scope: Scope): Campaign[] {
  return campaigns.filter((c) => {
    if (scope.brandId && c.brandId !== scope.brandId) return false;
    if (scope.businessUnitId && c.businessUnitId !== scope.businessUnitId) return false;
    if (scope.regionId && !c.regionIds.includes(scope.regionId)) return false;
    return true;
  });
}

/** All campaigns matching the given scope. */
export function campaignsInScope(db: SeedDB, scope: Scope): Campaign[] {
  return applyScope(db.campaigns, scope);
}

/* ------------------------------------------------------------------ */
/* Health (RAG)                                                        */
/* ------------------------------------------------------------------ */

function elapsedFraction(startDate: string, endDate: string, asOf: string): number {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  const now = Date.parse(asOf);
  if (!(end > start)) return now >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Spend considered committed as of TODAY for one activity. */
function committedSpend(activity: CampaignActivity): number {
  switch (activity.status) {
    case 'Completed':
      return activity.spendAllocated;
    case 'In Progress':
      return activity.spendAllocated * elapsedFraction(activity.startDate, activity.endDate, TODAY);
    default:
      return 0;
  }
}

/**
 * Every KPI belonging to a campaign, from both directions of the relation.
 *
 * `Campaign.kpiIds` and `KPI.attachedTo.campaignId` are two halves of one
 * association and the seed does not keep them in step: CMP-009 lists KPI-007
 * (a strategy KPI whose fact rows belong to other campaigns) while KPI-019 to
 * KPI-022 name CMP-009 as their campaign and carry all of its measurements.
 * Reading one side alone made a campaign page list a KPI it has no data for
 * and hide the four it is actually measured on, under a relationship chip that
 * counted the graph and said "5 KPIs".
 */
export function campaignKpiIds(db: SeedDB, campaignId: string): string[] {
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  const ids = new Set<string>(campaign?.kpiIds ?? []);
  for (const kpi of db.kpis) {
    if (kpi.attachedTo?.campaignId === campaignId) ids.add(kpi.id);
  }
  return [...ids];
}

/**
 * RAG health for one campaign, derived from budget burn vs schedule progress
 * vs KPI attainment (plus blocked activities).
 */
export function campaignHealth(db: SeedDB, campaignId: string): CampaignHealth | null {
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return null;

  const activities = db.campaignActivities.filter((a) => a.campaignId === campaignId);
  const scheduleProgress = elapsedFraction(campaign.startDate, campaign.endDate, TODAY);
  const committed = activities.reduce((sum, a) => sum + committedSpend(a), 0);
  const budgetBurn = campaign.budgetAllocation > 0 ? committed / campaign.budgetAllocation : 0;
  const blockedActivities = activities.filter((a) => a.status === 'Blocked').length;

  /* Scoped to this campaign, per the contract on `kpiAttainment`. Without the
     campaign id a KPI listed by several campaigns handed every one of them the
     org-wide total: CMP-012 has no fact rows of its own and still reported
     "KPI attainment 66% lags schedule 100%" on the command center and in the
     board pack — a number invented from another campaign's pipeline. A KPI
     with no measurements for this campaign now contributes nothing rather than
     something untrue. */
  const attainments = campaignKpiIds(db, campaignId)
    .map((kpiId) => kpiAttainment(db, kpiId, campaignId))
    .filter((a): a is NonNullable<ReturnType<typeof kpiAttainment>> => a !== null)
    .map((a) => a.attainment);
  const avgAttainment =
    attainments.length > 0
      ? attainments.reduce((s, v) => s + v, 0) / attainments.length
      : null;

  const reasons: string[] = [];
  let rag: Rag = 'green';
  const raise = (level: Rag, reason: string): void => {
    reasons.push(reason);
    if (level === 'red' || (level === 'amber' && rag === 'green')) rag = level;
  };

  const burnDelta = budgetBurn - scheduleProgress;
  if (burnDelta > 0.2) {
    raise('red', `Budget burn ${Math.round(budgetBurn * 100)}% is far ahead of schedule ${Math.round(scheduleProgress * 100)}%`);
  } else if (burnDelta > 0.05) {
    raise('amber', `Budget burn ${Math.round(budgetBurn * 100)}% is ahead of schedule ${Math.round(scheduleProgress * 100)}%`);
  }

  if (avgAttainment !== null && scheduleProgress > 0.25) {
    const attainmentGap = scheduleProgress - avgAttainment;
    if (attainmentGap > 0.35) {
      raise('red', `KPI attainment ${Math.round(avgAttainment * 100)}% trails schedule by ${Math.round(attainmentGap * 100)} points`);
    } else if (attainmentGap > 0.15) {
      raise('amber', `KPI attainment ${Math.round(avgAttainment * 100)}% lags schedule ${Math.round(scheduleProgress * 100)}%`);
    }
  }

  if (blockedActivities > 0) {
    const level: Rag = campaign.status === 'Live' ? 'red' : 'amber';
    raise(level, `${blockedActivities} blocked ${blockedActivities === 1 ? 'activity' : 'activities'}`);
  }

  if (reasons.length === 0) reasons.push('On budget, on schedule');

  return {
    campaignId,
    rag,
    scheduleProgress,
    budgetBurn,
    kpiAttainment: avgAttainment,
    blockedActivities,
    reasons,
  };
}

/** Campaigns in scope whose health is amber or red, with their health detail. */
export function atRiskCampaigns(
  db: SeedDB,
  scope: Scope,
): { campaign: Campaign; health: CampaignHealth }[] {
  return campaignsInScope(db, scope)
    .map((campaign) => ({ campaign, health: campaignHealth(db, campaign.id) }))
    .filter(
      (row): row is { campaign: Campaign; health: CampaignHealth } =>
        row.health !== null && row.health.rag !== 'green',
    )
    .sort((a, b) => {
      const rank = { red: 0, amber: 1, green: 2 } as const;
      return (
        rank[a.health.rag] - rank[b.health.rag] ||
        a.campaign.name.localeCompare(b.campaign.name, DEFAULT_LOCALE)
      );
    });
}

/* ------------------------------------------------------------------ */
/* Counts                                                              */
/* ------------------------------------------------------------------ */

/** Activity counts per status for one campaign (all statuses present, zero-filled). */
export function activityCountsByStatus(
  db: SeedDB,
  campaignId: string,
): Record<CampaignActivityStatus, number> {
  const counts: Record<CampaignActivityStatus, number> = {
    Planned: 0,
    'In Progress': 0,
    Completed: 0,
    Blocked: 0,
  };
  for (const a of db.campaignActivities) {
    if (a.campaignId === campaignId) counts[a.status] += 1;
  }
  return counts;
}

/** Campaign counts per lifecycle status within scope (all statuses present, zero-filled). */
export function pipelineByStatus(db: SeedDB, scope: Scope): Record<CampaignStatus, number> {
  const counts: Record<CampaignStatus, number> = {
    Draft: 0,
    Planned: 0,
    'In Approval': 0,
    Approved: 0,
    Live: 0,
    Paused: 0,
    Completed: 0,
    Archived: 0,
    Cancelled: 0,
  };
  for (const c of campaignsInScope(db, scope)) counts[c.status] += 1;
  return counts;
}

/* ------------------------------------------------------------------ */
/* Campaign detail rollups                                             */
/* ------------------------------------------------------------------ */

export interface CampaignTeamMember {
  stakeholder: Stakeholder;
  /** How the stakeholder touches the campaign, e.g. 'Campaign owner', 'Approver'. */
  involvement: string[];
}

/**
 * Owner plus every stakeholder referenced by the campaign's activities,
 * briefs, and approvals (approvals whose subject is the campaign, one of its
 * activities or briefs, or an approval a brief links to). Owner first, then
 * alphabetical.
 */
export function campaignTeam(db: SeedDB, campaignId: string): CampaignTeamMember[] {
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  if (!campaign) return [];

  const activities = db.campaignActivities.filter((a) => a.campaignId === campaignId);
  const briefs = db.briefs.filter((b) => b.campaignId === campaignId);
  const subjectIds = new Set<string>([
    campaignId,
    ...activities.map((a) => a.id),
    ...briefs.map((b) => b.id),
  ]);
  const briefApprovalIds = new Set(
    briefs.map((b) => b.approvalId).filter((id): id is string => Boolean(id)),
  );
  const approvals = db.approvals.filter(
    (a) => subjectIds.has(a.subjectId) || briefApprovalIds.has(a.id),
  );

  const involvementById = new Map<string, Set<string>>();
  const add = (stakeholderId: string, label: string): void => {
    const set = involvementById.get(stakeholderId) ?? new Set<string>();
    set.add(label);
    involvementById.set(stakeholderId, set);
  };

  add(campaign.ownerStakeholderId, 'Campaign owner');
  for (const a of activities) add(a.ownerStakeholderId, 'Activity owner');
  for (const b of briefs) add(b.authorStakeholderId, 'Brief author');
  for (const a of approvals) add(a.approverStakeholderId, 'Approver');

  return [...involvementById.entries()]
    .map(([stakeholderId, labels]) => {
      const stakeholder = db.stakeholders.find((s) => s.id === stakeholderId);
      return stakeholder ? { stakeholder, involvement: [...labels] } : null;
    })
    .filter((row): row is CampaignTeamMember => row !== null)
    .sort((a, b) => {
      const aOwner = a.stakeholder.id === campaign.ownerStakeholderId ? 0 : 1;
      const bOwner = b.stakeholder.id === campaign.ownerStakeholderId ? 0 : 1;
      return aOwner - bOwner || a.stakeholder.name.localeCompare(b.stakeholder.name, DEFAULT_LOCALE);
    });
}

export interface CampaignAgencyWork {
  agency: Agency;
  /** The campaign activities this agency executes, in start-date order. */
  activities: CampaignActivity[];
}

/** Agencies executing the campaign's activities, each with its activity list. */
export function campaignAgencies(db: SeedDB, campaignId: string): CampaignAgencyWork[] {
  const byAgencyId = new Map<string, CampaignActivity[]>();
  for (const a of db.campaignActivities) {
    if (a.campaignId !== campaignId || !a.agencyId) continue;
    const list = byAgencyId.get(a.agencyId) ?? [];
    list.push(a);
    byAgencyId.set(a.agencyId, list);
  }
  return [...byAgencyId.entries()]
    .map(([agencyId, activities]) => {
      const agency = db.agencies.find((ag) => ag.id === agencyId);
      return agency
        ? {
            agency,
            activities: activities.slice().sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE)),
          }
        : null;
    })
    .filter((row): row is CampaignAgencyWork => row !== null)
    .sort((a, b) => a.agency.name.localeCompare(b.agency.name, DEFAULT_LOCALE));
}

export interface CampaignCommunicationRow {
  communication: Communication;
  /** The campaign activity the communication belongs to. */
  activity: CampaignActivity;
  audience: Audience | null;
  /** Per-channel delivery records for the communication. */
  executions: ChannelExecution[];
}

/**
 * The campaign's communications, joined via its activities, each with its
 * audience and channel executions. Ordered by scheduled (falling back to
 * created) time.
 */
export function campaignCommunications(
  db: SeedDB,
  campaignId: string,
): CampaignCommunicationRow[] {
  const activitiesById = new Map(
    db.campaignActivities.filter((a) => a.campaignId === campaignId).map((a) => [a.id, a]),
  );
  return db.communications
    .flatMap((communication) => {
      const activity = communication.campaignActivityId
        ? activitiesById.get(communication.campaignActivityId)
        : undefined;
      if (!activity) return [];
      return [
        {
          communication,
          activity,
          audience: db.audiences.find((a) => a.id === communication.audienceId) ?? null,
          executions: db.channelExecutions.filter(
            (x) => x.communicationId === communication.id,
          ),
        },
      ];
    })
    .sort((a, b) =>
      (a.communication.scheduledAt ?? a.communication.createdAt).localeCompare(
        b.communication.scheduledAt ?? b.communication.createdAt,
        DEFAULT_LOCALE,
      ),
    );
}
