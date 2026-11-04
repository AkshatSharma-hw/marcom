/**
 * Calendar selectors — unified calendar entries and audience conflict
 * detection (BLUEPRINT.md Part 5, module 10).
 *
 * A conflict is a day on which 2+ CampaignActivities or Communications
 * target the same Audience. Activities target the audiences of their
 * linked Communications across their whole date window; a Communication
 * targets its audience on its scheduled day. A Communication never
 * conflicts with its own parent activity — collisions require items
 * from independent lineages.
 */

import type { CampaignActivity, ChannelKind, Communication, SeedDB } from '../types';
import { campaignsInScope, type Scope } from './campaignSelectors';
import { DEFAULT_LOCALE } from "@/lib/i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Date part of an ISO timestamp ('2026-08-13T08:00:00Z' → '2026-08-13'). */
export function isoDateOf(timestamp: string): string {
  return timestamp.slice(0, 10);
}

/** Every ISO date from start to end inclusive. */
function eachDay(rangeStart: string, rangeEnd: string): string[] {
  const days: string[] = [];
  for (let t = Date.parse(rangeStart); t <= Date.parse(rangeEnd); t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}

/* ------------------------------------------------------------------ */
/* Calendar entries                                                    */
/* ------------------------------------------------------------------ */

/** In-scope activities whose window overlaps [rangeStart, rangeEnd] (inclusive). */
export function activitiesInRange(
  db: SeedDB,
  scope: Scope,
  rangeStart: string,
  rangeEnd: string,
): CampaignActivity[] {
  const campaignIds = new Set(campaignsInScope(db, scope).map((c) => c.id));
  return db.campaignActivities
    .filter(
      (a) =>
        campaignIds.has(a.campaignId) && a.startDate <= rangeEnd && a.endDate >= rangeStart,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE));
}

/**
 * Scheduled communications landing inside [rangeStart, rangeEnd].
 * Comms tied to an activity follow that activity's campaign scope;
 * comms without one (corporate/internal sends) are org-wide and
 * visible in every scope.
 */
export function communicationsInRange(
  db: SeedDB,
  scope: Scope,
  rangeStart: string,
  rangeEnd: string,
): Communication[] {
  const campaignIds = new Set(campaignsInScope(db, scope).map((c) => c.id));
  const campaignOfActivity = new Map(db.campaignActivities.map((a) => [a.id, a.campaignId]));
  return db.communications
    .filter((c) => {
      if (!c.scheduledAt) return false;
      const day = isoDateOf(c.scheduledAt);
      if (day < rangeStart || day > rangeEnd) return false;
      if (!c.campaignActivityId) return true;
      const campaignId = campaignOfActivity.get(c.campaignActivityId);
      return campaignId !== undefined && campaignIds.has(campaignId);
    })
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '', DEFAULT_LOCALE));
}

/**
 * Channel kind a communication ships through: its first ChannelExecution's
 * channel, else its parent activity's channel, else null.
 */
export function communicationChannelKind(
  db: SeedDB,
  communicationId: string,
): ChannelKind | null {
  const kindOf = (channelId: string): ChannelKind | null =>
    db.channels.find((c) => c.id === channelId)?.channelKind ?? null;

  const execution = db.channelExecutions.find((x) => x.communicationId === communicationId);
  if (execution) return kindOf(execution.channelId);

  const comm = db.communications.find((c) => c.id === communicationId);
  if (comm?.campaignActivityId) {
    const activity = db.campaignActivities.find((a) => a.id === comm.campaignActivityId);
    if (activity) return kindOf(activity.channelId);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Conflict detection                                                  */
/* ------------------------------------------------------------------ */

export interface ConflictItem {
  entity: 'CampaignActivity' | 'Communication';
  id: string;
  /** Activity name or communication subject. */
  label: string;
}

export interface AudienceConflict {
  audienceId: string;
  /** Distinct colliding items across the run, first-seen order. */
  items: ConflictItem[];
  /** Consecutive conflict days within the queried range, ascending. */
  days: string[];
  startDay: string;
  endDay: string;
}

/**
 * Audience collisions inside [rangeStart, rangeEnd], grouped per audience
 * into runs of consecutive conflict days with their colliding items.
 */
export function audienceConflicts(
  db: SeedDB,
  scope: Scope,
  rangeStart: string,
  rangeEnd: string,
): AudienceConflict[] {
  const activities = activitiesInRange(db, scope, rangeStart, rangeEnd);
  const comms = communicationsInRange(db, scope, rangeStart, rangeEnd);

  // Structural link: an activity targets the audiences of all its comms.
  const activityAudiences = new Map<string, Set<string>>();
  for (const c of db.communications) {
    if (!c.campaignActivityId) continue;
    const set = activityAudiences.get(c.campaignActivityId) ?? new Set<string>();
    set.add(c.audienceId);
    activityAudiences.set(c.campaignActivityId, set);
  }

  // day → audienceId → items targeting that audience that day, with the
  // lineage key used to ignore comm-vs-own-parent-activity pairs.
  type Hit = ConflictItem & { lineage: string };
  const conflictsByAudience = new Map<string, Map<string, ConflictItem[]>>();

  for (const day of eachDay(rangeStart, rangeEnd)) {
    const byAudience = new Map<string, Hit[]>();
    const add = (audienceId: string, hit: Hit): void => {
      const hits = byAudience.get(audienceId) ?? [];
      hits.push(hit);
      byAudience.set(audienceId, hits);
    };

    for (const a of activities) {
      if (a.startDate > day || a.endDate < day) continue;
      for (const audienceId of activityAudiences.get(a.id) ?? []) {
        add(audienceId, { entity: 'CampaignActivity', id: a.id, label: a.name, lineage: a.id });
      }
    }
    for (const c of comms) {
      if (isoDateOf(c.scheduledAt ?? '') !== day) continue;
      add(c.audienceId, {
        entity: 'Communication',
        id: c.id,
        label: c.subject,
        lineage: c.campaignActivityId ?? `comm:${c.id}`,
      });
    }

    for (const [audienceId, hits] of byAudience) {
      const lineages = new Set(hits.map((h) => h.lineage));
      if (lineages.size < 2) continue;
      const perDay = conflictsByAudience.get(audienceId) ?? new Map<string, ConflictItem[]>();
      perDay.set(
        day,
        hits.map(({ entity, id, label }) => ({ entity, id, label })),
      );
      conflictsByAudience.set(audienceId, perDay);
    }
  }

  // Compress each audience's conflict days into consecutive runs,
  // unioning the colliding items across the run.
  const runs: AudienceConflict[] = [];
  for (const [audienceId, perDay] of conflictsByAudience) {
    const days = [...perDay.keys()].sort();
    let run: string[] = [];
    const flush = (): void => {
      if (run.length === 0) return;
      const items: ConflictItem[] = [];
      const seen = new Set<string>();
      for (const day of run) {
        for (const item of perDay.get(day) ?? []) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          items.push(item);
        }
      }
      runs.push({
        audienceId,
        items,
        days: [...run],
        startDay: run[0],
        endDay: run[run.length - 1],
      });
      run = [];
    };
    for (const day of days) {
      if (run.length > 0 && Date.parse(day) - Date.parse(run[run.length - 1]) !== DAY_MS) {
        flush();
      }
      run.push(day);
    }
    flush();
  }

  return runs.sort(
    (a, b) => a.startDay.localeCompare(b.startDay, DEFAULT_LOCALE) || a.audienceId.localeCompare(b.audienceId, DEFAULT_LOCALE),
  );
}
