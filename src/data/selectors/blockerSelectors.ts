/**
 * Named blockers (UI change instructions item 9).
 *
 * "Blocked" and "At risk" are the most action-worthy states in the product, and
 * today they require hunting. This resolves a blocked record to the thing
 * actually blocking it, the person who owns that thing, how long it has been
 * waiting, and whether the SLA is breached — so the badge can say
 * "awaiting Legal approval · Ingrid Halvorsen · 3 days · SLA breached"
 * and link straight to the approval.
 *
 * Every field is derived from records that exist. Nothing here is seeded.
 */

import type { Approval, ApprovalStatus, EntityName, SeedDB } from '@/data/types';
import { DEMO_NOW_ISO } from './campaignSelectors';

const PENDING: ReadonlySet<ApprovalStatus> = new Set<ApprovalStatus>([
  'Requested',
  'In Review',
  'Changes Requested',
  'Escalated',
]);

export interface BlockerInfo {
  /** Short reason, e.g. 'awaiting Legal approval'. */
  reason: string;
  /** Person the record is waiting on, when there is one. */
  ownerName?: string;
  /** Whole days the record has been in this state. */
  ageDays: number;
  /** True when a pending approval is past its SLA. */
  slaBreached: boolean;
  /** Approval this resolves to, for deep-linking. */
  approvalId?: string;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

/** The demo clock, as a full ISO timestamp. */
function nowIso(): string {
  return DEMO_NOW_ISO;
}

/**
 * The record a bare status blocker is measured from.
 *
 * `blockerFor` is called with seven entity names — Campaign, CampaignActivity,
 * Brief, Content, ContentVersion, Communication and Idea. Scanning only
 * campaigns, contents and communications meant every blocked *activity* fell
 * through to no record at all and reported "blocked · 0 days", even though
 * `CampaignActivity` carries `updatedAt` like everything else. Resolving by
 * entity name also stops an id colliding across two collections.
 */
function recordFor(
  db: SeedDB,
  entity: EntityName,
  id: string,
): { updatedAt?: string; createdAt?: string } | undefined {
  const rows: Record<string, readonly { id: string; updatedAt?: string; createdAt?: string }[]> = {
    Campaign: db.campaigns,
    CampaignActivity: db.campaignActivities,
    Brief: db.briefs,
    Content: db.contents,
    ContentVersion: db.contentVersions,
    Communication: db.communications,
    Idea: db.ideas,
    // blockerFor is called with 13 entity names; every one it cannot resolve
    // here falls back to `undefined`, which makes `since` undefined and the age
    // read as 0 — a paused journey rendering "paused today" no matter how long
    // it has actually sat. These five were the missing half.
    Asset: db.assets,
    Audience: db.audiences,
    Event: db.events,
    Journey: db.journeys,
    MediaContact: db.mediaContacts,
  };
  return rows[entity]?.find((r) => r.id === id);
}

function approvalBlocker(db: SeedDB, approval: Approval): BlockerInfo {
  const approver = db.stakeholders.find((s) => s.id === approval.approverStakeholderId);
  const stage = db.workflowStages?.find((s) => s.id === approval.workflowStageId);
  const stageName = stage?.name ?? 'approval';
  return {
    reason: `awaiting ${stageName}`,
    ownerName: approver?.name,
    ageDays: daysBetween(approval.createdAt, nowIso()),
    slaBreached: Date.parse(approval.slaDueAt) < Date.parse(nowIso()),
    approvalId: approval.id,
  };
}

/**
 * What is blocking this record right now, or null when nothing is.
 *
 * Precedence: a pending approval is the most specific and most actionable
 * blocker, so it wins over a bare status.
 */
export function blockerFor(
  db: SeedDB,
  entity: EntityName,
  id: string,
  status?: string,
): BlockerInfo | null {
  const approval = db.approvals.find(
    (a) => a.subjectEntity === entity && a.subjectId === id && PENDING.has(a.status),
  );
  if (approval) return approvalBlocker(db, approval);

  const normalised = status?.trim().toLowerCase();
  if (!normalised) return null;

  const record = recordFor(db, entity, id);
  const since = record?.updatedAt ?? record?.createdAt;

  if (normalised === 'rework') {
    return {
      // Kept short: this renders inside a table status column, where a longer
      // reason is clipped rather than read.
      reason: 'returned for rework',
      ageDays: since ? daysBetween(since, nowIso()) : 0,
      slaBreached: false,
    };
  }
  if (normalised === 'paused') {
    const incident = db.crisisIncidents.find((c) => c.status === 'Active');
    return {
      reason: incident ? `paused by send freeze · ${incident.title}` : 'paused',
      ageDays: since ? daysBetween(since, nowIso()) : 0,
      slaBreached: false,
    };
  }
  if (normalised === 'blocked') {
    return {
      reason: 'blocked',
      ageDays: since ? daysBetween(since, nowIso()) : 0,
      slaBreached: false,
    };
  }
  return null;
}

/** One-line rendering of a blocker, for badges and tooltips. */
export function blockerSummary(blocker: BlockerInfo): string {
  const parts = [blocker.reason];
  if (blocker.ownerName) parts.push(blocker.ownerName);
  parts.push(blocker.ageDays === 1 ? '1 day' : `${blocker.ageDays} days`);
  if (blocker.slaBreached) parts.push('SLA breached');
  return parts.join(' · ');
}
