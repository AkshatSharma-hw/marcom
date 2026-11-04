/**
 * Integrity tests for Pack B.
 *
 * Modelled on `renewable.test.ts` and `lifesciences.test.ts` — same promises,
 * checked the same way, because a bug found in one pack has to be findable in
 * all of them:
 *
 *  1. Referential integrity — the same check the default pack runs.
 *  2. The state-coverage checklist in `docs/DEMO_PACKS.md` §4.
 *  3. Graph density — every asset in a live status carried by two or more
 *     content versions, every content version carried by an execution.
 *  4. Date discipline — anchored to the app clock, so the pack cannot rot.
 *
 * Plus the one thing only this pack has to prove: that CRI-002 froze the
 * campaign whose core claim it contradicts, and that the reason is a fact in
 * the data rather than a caption on a screenshot. A freeze that shows up only
 * as a status change is indistinguishable from someone pausing a campaign
 * because they went on holiday, so the audit trail has to name the incident
 * and the contradiction, and the timeline has to run in the right order.
 */

import { describe, expect, it } from 'vitest';
import { cloudPack } from './cloud';
import { PACK_ANCHOR } from './_shared';
import { assertAllLinksResolve } from '../index';
import { TODAY } from '../../selectors/campaignSelectors';
import { acceptanceRate } from '../../selectors/agentRunSelectors';
import { originOf } from '../../selectors/originSelectors';
import { kpiAttainment } from '../../selectors/metricSelectors';

const db = cloudPack;

/**
 * Assets deliberately left unreferenced, with the reason. AST-016 is
 * `Uploaded` and AST-017 is `Rejected`; referencing either from live content
 * would make its status a lie.
 */
const UNREFERENCED_BY_DESIGN = new Set(['AST-016', 'AST-017']);

/** The incident and the campaign whose core claim it contradicts. */
const INCIDENT_ID = 'CRI-002';
const CONTRADICTED_CAMPAIGN_ID = 'CMP-005';

describe('Pack B — referential integrity', () => {
  it('has no dangling references', () => {
    expect(assertAllLinksResolve(db)).toEqual([]);
  });

  it('anchors its dates to the app clock', () => {
    expect(PACK_ANCHOR).toBe(TODAY);
  });

  it('never records a row as updated before it was created', () => {
    const rows: { id: string; createdAt: string; updatedAt: string }[] = [
      db.org,
      ...db.businessUnits,
      ...db.brands,
      ...db.stakeholders,
      ...db.campaigns,
      ...db.campaignActivities,
      ...db.communications,
      ...db.channelExecutions,
      ...db.contents,
      ...db.contentVersions,
      ...db.assets,
      ...db.approvals,
      ...db.notifications,
      ...db.auditRecords,
      ...db.agentRuns,
      ...db.kpis,
      ...db.metricResults,
      ...db.crisisIncidents,
      ...db.journeys,
      ...db.mediaContacts,
      ...db.coverageItems,
      ...db.competitors,
      ...db.marketTrends,
      ...db.benchmarks,
      ...db.playbookPatterns,
    ];
    const inverted = rows.filter((r) => r.updatedAt < r.createdAt).map((r) => r.id);
    expect(inverted).toEqual([]);
  });

  it('keeps every campaign and activity window ordered and inside a year of the clock', () => {
    const lower = new Date(Date.parse(`${PACK_ANCHOR}T00:00:00Z`) - 366 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const upper = new Date(Date.parse(`${PACK_ANCHOR}T00:00:00Z`) + 366 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    for (const row of [...db.campaigns, ...db.campaignActivities]) {
      expect(row.startDate <= row.endDate, `${row.id} ends before it starts`).toBe(true);
      expect(row.startDate >= lower, `${row.id} starts more than a year back`).toBe(true);
      expect(row.endDate <= upper, `${row.id} ends more than a year out`).toBe(true);
    }
  });
});

describe('Pack B — required state coverage', () => {
  it('has one active crisis with frozen sends and a war room', () => {
    const active = db.crisisIncidents.filter((c) => c.status === 'Active');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(INCIDENT_ID);
    expect(active[0].warRoomStakeholderIds.length).toBeGreaterThanOrEqual(3);
    expect(active[0].holdingStatementContentId).toBeTruthy();
    expect(db.communications.filter((c) => c.status === 'Paused').length).toBeGreaterThanOrEqual(2);
  });

  it('has one resolved crisis for the archive view', () => {
    const resolved = db.crisisIncidents.filter((c) => c.status === 'Resolved');
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedAt).toBeTruthy();
  });

  it('has two or more blocked activities and a breached open approval', () => {
    const blocked = db.campaignActivities.filter((a) => a.status === 'Blocked');
    expect(blocked.length).toBeGreaterThanOrEqual(2);

    const nowIso = `${PACK_ANCHOR}T23:59:59Z`;
    const breached = db.approvals.filter(
      (a) =>
        ['Requested', 'In Review', 'Changes Requested', 'Escalated'].includes(a.status) &&
        a.slaDueAt < nowIso,
    );
    expect(breached.length).toBeGreaterThanOrEqual(1);
  });

  it('has an item in Rework after a failed check', () => {
    expect(db.contents.some((c) => c.status === 'Rework')).toBe(true);
  });

  it('has an asset expiring within 60 days and one already expired but still referenced', () => {
    const horizon = new Date(Date.parse(`${PACK_ANCHOR}T00:00:00Z`) + 60 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const expiringSoon = db.assets.filter(
      (a) => a.rightsExpiry && a.rightsExpiry > PACK_ANCHOR && a.rightsExpiry <= horizon,
    );
    expect(expiringSoon.length).toBeGreaterThanOrEqual(1);

    const expired = db.assets.filter((a) => a.status === 'Expired');
    expect(expired.length).toBeGreaterThanOrEqual(1);
    for (const asset of expired) {
      const refs = db.contentVersions.filter((v) => v.assetIds?.includes(asset.id));
      expect(refs.length, `${asset.id} is expired and referenced by nothing`).toBeGreaterThanOrEqual(
        1,
      );
    }
  });

  it('has two KPIs with no data, two at risk and one off track', () => {
    const results = db.kpis.map((k) => ({ kpi: k, r: kpiAttainment(db, k.id) }));
    const noData = results.filter((x) => x.r === null);
    const atRisk = results.filter((x) => x.r && x.r.attainment >= 0.6 && x.r.attainment < 0.9);
    const offTrack = results.filter((x) => x.r && x.r.attainment < 0.6);

    expect(noData.length).toBeGreaterThanOrEqual(2);
    expect(atRisk.length).toBeGreaterThanOrEqual(2);
    expect(offTrack.length).toBeGreaterThanOrEqual(1);
  });

  it('has a failed channel execution', () => {
    expect(db.channelExecutions.some((x) => x.status === 'failed')).toBe(true);
  });

  it('has a non-waivable legal failure blocking a launch', () => {
    const rejected = db.approvals.filter((a) => a.status === 'Rejected');
    expect(rejected.length).toBeGreaterThanOrEqual(1);
    // The rejection has to name the rule; "rejected" on its own is a taste
    // decision wearing a governance badge.
    expect(rejected.some((a) => /POL-\d{3}|LGL-\d{3}/.test(a.comment ?? ''))).toBe(true);
  });

  it('has an inherited-rule conflict resolved by override precedence', () => {
    const overriding = db.brands.filter((child) => {
      if (!child.parentBrandId) return false;
      const parent = db.brands.find((b) => b.id === child.parentBrandId);
      return (child.guardrailPolicyIds ?? []).some((id) =>
        (parent?.guardrailPolicyIds ?? []).includes(id),
      );
    });
    expect(overriding.length).toBeGreaterThanOrEqual(1);

    const localRules = db.policies.filter((p) =>
      (overriding[0].guardrailPolicyIds ?? []).includes(p.id),
    );
    expect(localRules.some((p) => /governs|takes precedence|wins/i.test(p.ruleText))).toBe(true);
  });

  it('makes the stricter local rule strictly stricter, not merely different', () => {
    // Kestrel Intelligence restates POL-001 and adds POL-005. The parent
    // permits a comparative where a benchmark methodology is linked; the child
    // forbids the comparative outright. If POL-005 ever stops saying that, the
    // inheritance demo becomes two rules that happen to disagree.
    const intelligence = db.brands.find((b) => b.id === 'BRD-003');
    expect(intelligence?.parentBrandId).toBe('BRD-001');

    const parentRules = new Set(
      db.brands.find((b) => b.id === intelligence?.parentBrandId)?.guardrailPolicyIds ?? [],
    );
    const shared = (intelligence?.guardrailPolicyIds ?? []).filter((id) => parentRules.has(id));
    expect(shared.length).toBeGreaterThanOrEqual(1);

    const localOnly = (intelligence?.guardrailPolicyIds ?? []).filter((id) => !parentRules.has(id));
    const stricter = db.policies.filter((p) => localOnly.includes(p.id));
    expect(stricter.some((p) => /must not be comparative|not be comparative/i.test(p.ruleText))).toBe(
      true,
    );
    expect(stricter.some((p) => p.enforcement === 'block')).toBe(true);
  });

  it('has Arabic content and an Arabic rulebook variant', () => {
    expect(db.contentVersions.some((v) => v.locale === 'ar-SA')).toBe(true);
    expect(db.legalClauses.some((c) => c.locale === 'ar-SA')).toBe(true);
    expect(db.glossaryTerms.some((t) => t.locale === 'ar-SA')).toBe(true);
  });

  it('has agent output awaiting review', () => {
    const pending = db.contentVersions.filter(
      (v) => originOf(db, 'ContentVersion', v.id).origin === 'agent',
    );
    expect(pending.length).toBeGreaterThanOrEqual(1);

    // And the acceptance rate is evidence, not a stored score.
    const a4 = acceptanceRate(db, 'AGT-A4');
    expect(a4).not.toBeNull();
    expect(a4!.produced).toBe(a4!.accepted + a4!.pendingIds.length);
  });

  it('covers every status value the taxonomy defines for the busy entities', () => {
    const statuses = <T extends { status: string }>(rows: T[]): Set<string> =>
      new Set(rows.map((r) => r.status));

    expect(statuses(db.communications).size).toBe(12);
    expect(statuses(db.contents).size).toBe(8);
    expect(statuses(db.approvals).size).toBe(8);
    expect(statuses(db.channelExecutions).size).toBe(5);
  });
});

describe('Pack B — the incident freezes the claim it contradicts', () => {
  const incident = db.crisisIncidents.find((c) => c.id === INCIDENT_ID)!;
  /**
   * The incident's trail: rows that point at the incident record itself, plus
   * rows that name it as the reason for what they did. Both forms have to
   * count — the declaration is about the incident, and the freezes are caused
   * by it, and a check that reads only one of them misses half the story.
   */
  const trail = db.auditRecords.filter(
    (r) =>
      (r.entityType === 'CrisisIncident' && r.entityId === INCIDENT_ID) ||
      r.detail.includes(INCIDENT_ID),
  );

  it('pauses the benchmark campaign and nothing else that is live', () => {
    const paused = db.campaigns.filter((c) => c.status === 'Paused');
    expect(paused.map((c) => c.id)).toEqual([CONTRADICTED_CAMPAIGN_ID]);

    // The other live campaigns keep running: a blanket stop would be a
    // different, and much less interesting, product behaviour.
    expect(db.campaigns.filter((c) => c.status === 'Live').length).toBeGreaterThanOrEqual(3);
  });

  it('freezes every send beneath that campaign', () => {
    const activityIds = new Set(
      db.campaignActivities
        .filter((a) => a.campaignId === CONTRADICTED_CAMPAIGN_ID)
        .map((a) => a.id),
    );
    expect(activityIds.size).toBeGreaterThanOrEqual(2);

    const sends = db.communications.filter(
      (c) => c.campaignActivityId && activityIds.has(c.campaignActivityId),
    );
    expect(sends.length).toBeGreaterThanOrEqual(2);
    expect(sends.every((c) => c.status === 'Paused')).toBe(true);
  });

  it('records why, in the audit trail, naming the incident', () => {
    const campaignFreeze = trail.find(
      (r) => r.entityType === 'Campaign' && r.entityId === CONTRADICTED_CAMPAIGN_ID,
    );
    expect(campaignFreeze, 'no audit record explains the campaign freeze').toBeTruthy();
    expect(campaignFreeze!.action).toBe('campaign.paused');
    // The reason has to be the contradiction, not "paused by request".
    expect(campaignFreeze!.detail).toMatch(/contradict/i);

    const sendFreezes = trail.filter((r) => r.action === 'communication.paused');
    expect(sendFreezes.length).toBeGreaterThanOrEqual(2);
  });

  it('runs the trail in the order it could actually have happened', () => {
    const declared = trail.find((r) => r.action === 'crisis.declared')!;
    expect(declared.entityId).toBe(INCIDENT_ID);
    expect(declared.at).toBe(incident.declaredAt);

    const holding = trail.find((r) => r.action === 'communication.published');
    const freezes = trail.filter((r) => /\.paused$/.test(r.action));
    expect(freezes.length).toBeGreaterThanOrEqual(3);

    // Declared, then stated, then frozen. A freeze timestamped before the
    // declaration is the exact bug this ordering check exists to catch.
    for (const row of freezes) {
      expect(row.at >= declared.at, `${row.id} freezes before the incident was declared`).toBe(true);
    }
    if (holding) {
      expect(holding.at >= declared.at).toBe(true);
    }
  });

  it('tells the owners, and tells them the reason rather than the status', () => {
    const crisisNotes = db.notifications.filter((n) => n.notifKind === 'crisis');
    expect(crisisNotes.length).toBeGreaterThanOrEqual(3);
    expect(crisisNotes.some((n) => n.subjectId === INCIDENT_ID)).toBe(true);
    expect(crisisNotes.some((n) => /conflict|contradict/i.test(n.message))).toBe(true);

    // Every crisis notification lands on a stakeholder who exists.
    const stakeholderIds = new Set(db.stakeholders.map((s) => s.id));
    for (const note of crisisNotes) {
      expect(stakeholderIds.has(note.recipientStakeholderId), `${note.id} has no recipient`).toBe(
        true,
      );
    }
  });

  it('has an agent that surfaced the conflict without deciding it', () => {
    const runs = db.agentRuns.filter(
      (r) => r.subjectEntity === 'CrisisIncident' && r.subjectId === INCIDENT_ID,
    );
    expect(runs.length).toBeGreaterThanOrEqual(1);
    // The agent recommends; the crisis lead decides. The run must not claim to
    // have produced the freeze.
    expect(runs.every((r) => r.producedEntity === undefined)).toBe(true);
    expect(runs.some((r) => r.triggeredByStakeholderId !== undefined)).toBe(true);
  });
});

describe('Pack B — the agent ledger is accountable', () => {
  const agentIds = new Set(db.marcomAgents.map((a) => a.id));

  it('references a real agent and a real subject on every run', () => {
    for (const run of db.agentRuns) {
      expect(agentIds.has(run.agentId), `${run.id} names an unknown agent`).toBe(true);
      expect(run.subjectId, `${run.id} has no subject`).toBeTruthy();
    }
  });

  it('produces only records that exist', () => {
    const versionIds = new Set(db.contentVersions.map((v) => v.id));
    const produced = db.agentRuns.filter((r) => r.producedId);
    expect(produced.length).toBeGreaterThanOrEqual(1);
    for (const run of produced) {
      expect(run.producedEntity).toBe('ContentVersion');
      expect(versionIds.has(run.producedId!), `${run.id} produced a version nobody has`).toBe(true);
    }
  });

  it('covers all four run states, and keeps each one honest about its fields', () => {
    const byStatus = new Map<string, number>();
    for (const run of db.agentRuns) byStatus.set(run.status, (byStatus.get(run.status) ?? 0) + 1);
    expect([...byStatus.keys()].sort()).toEqual(['failed', 'queued', 'running', 'succeeded']);

    for (const run of db.agentRuns) {
      if (run.status === 'queued' || run.status === 'running') {
        // Nothing has finished, so nothing may claim an outcome.
        expect(run.finishedAt, `${run.id} is ${run.status} but finished`).toBeUndefined();
        expect(run.outcomeSummary, `${run.id} is ${run.status} but has an outcome`).toBeUndefined();
        expect(run.confidence, `${run.id} is ${run.status} but is confident`).toBeUndefined();
      }
      if (run.status === 'failed') {
        expect(run.error, `${run.id} failed without saying why`).toBeTruthy();
        expect(run.outcomeSummary, `${run.id} failed and also succeeded`).toBeUndefined();
      }
      if (run.status === 'succeeded') {
        expect(run.finishedAt, `${run.id} succeeded without finishing`).toBeTruthy();
        expect(run.finishedAt! >= run.startedAt, `${run.id} finished before it started`).toBe(true);
      }
    }
  });
});

describe('Pack B — graph density', () => {
  it('carries every asset in at least two content versions, bar the documented exceptions', () => {
    const refCount = new Map<string, number>();
    for (const v of db.contentVersions) {
      for (const assetId of v.assetIds ?? []) {
        refCount.set(assetId, (refCount.get(assetId) ?? 0) + 1);
      }
    }
    const thin = db.assets.filter((a) => (refCount.get(a.id) ?? 0) < 2).map((a) => a.id);
    expect(new Set(thin)).toEqual(UNREFERENCED_BY_DESIGN);
  });

  it('carries every content version on at least one channel execution', () => {
    const carried = new Set(db.channelExecutions.map((x) => x.contentVersionId));
    const orphans = db.contentVersions.filter((v) => !carried.has(v.id)).map((v) => v.id);
    expect(orphans).toEqual([]);
  });

  it('resolves version → execution → communication → activity → campaign for the frozen sends', () => {
    const paused = db.communications.filter((c) => c.status === 'Paused');
    expect(paused.length).toBeGreaterThanOrEqual(3);

    const executions = db.channelExecutions.filter((x) =>
      paused.some((c) => c.id === x.communicationId),
    );
    expect(executions.length).toBeGreaterThanOrEqual(3);

    const campaignIds = new Set(
      paused
        .map((c) => db.campaignActivities.find((a) => a.id === c.campaignActivityId)?.campaignId)
        .filter(Boolean),
    );
    // The freeze reaches past the contradicted campaign — a send in an
    // unrelated live campaign is held too, because it was going into the
    // degraded region while the status page was red.
    expect(campaignIds.size).toBeGreaterThanOrEqual(2);
    expect(campaignIds.has(CONTRADICTED_CAMPAIGN_ID)).toBe(true);
  });
});
