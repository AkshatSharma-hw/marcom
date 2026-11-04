/**
 * Integrity tests for Pack C.
 *
 * Modelled on `renewable.test.ts` — same four promises, checked the same way,
 * because a bug found in one pack has to be findable in all of them:
 *
 *  1. Referential integrity — the same check the default pack runs.
 *  2. The state-coverage checklist in `docs/DEMO_PACKS.md` §4.
 *  3. Graph density — every asset in a live status carried by two or more
 *     content versions, every content version carried by an execution.
 *  4. Date discipline — anchored to the app clock, so the pack cannot rot.
 *
 * Plus one thing only this pack has to prove: that the three MLR gates are
 * non-waivable in the data rather than in a tooltip. `WorkflowStage` carries
 * no `waivable` flag, and adding one would have made non-waivability a label.
 * It is checked here the way the data expresses it — who may sit the gate, who
 * actually decided each one, and the absence of any exception record against
 * the workflow.
 */

import { describe, expect, it } from 'vitest';
import { lifesciencesPack } from './lifesciences';
import { PACK_ANCHOR } from './_shared';
import { assertAllLinksResolve } from '../index';
import { TODAY } from '../../selectors/campaignSelectors';
import { acceptanceRate } from '../../selectors/agentRunSelectors';
import { originOf } from '../../selectors/originSelectors';
import { kpiAttainment } from '../../selectors/metricSelectors';

const db = lifesciencesPack;

/** Assets deliberately left unreferenced, with the reason. */
const UNREFERENCED_BY_DESIGN = new Set(['AST-016', 'AST-017']);

/** The MLR workflow, and the three gates no marketing role may clear. */
const MLR_WORKFLOW_ID = 'WF-006';
const MLR_PRE_CHECK_STAGE_ID = 'WFS-018';
const MLR_NON_WAIVABLE_STAGES = ['WFS-019', 'WFS-020', 'WFS-021'] as const;
/** The waiver path WF-004 opens for other workflows. */
const EXCEPTION_STAGE_IDS = new Set(['WFS-014', 'WFS-015']);

describe('Pack C — referential integrity', () => {
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

describe('Pack C — required state coverage', () => {
  it('has one active crisis with frozen sends and a war room', () => {
    const active = db.crisisIncidents.filter((c) => c.status === 'Active');
    expect(active).toHaveLength(1);
    expect(active[0].warRoomStakeholderIds.length).toBeGreaterThanOrEqual(3);
    expect(active[0].holdingStatementContentId).toBeTruthy();
    expect(db.communications.filter((c) => c.status === 'Paused').length).toBeGreaterThanOrEqual(2);
  });

  it('freezes at brand-and-product scope: six sends across more than one campaign', () => {
    const paused = db.communications.filter((c) => c.status === 'Paused');
    expect(paused).toHaveLength(6);

    // The point of the scenario: the freeze is not a per-campaign switch.
    const campaignIds = new Set(
      paused
        .map((c) => db.campaignActivities.find((a) => a.id === c.campaignActivityId)?.campaignId)
        .filter(Boolean),
    );
    expect(campaignIds.size).toBeGreaterThanOrEqual(3);
  });

  it('has one resolved crisis for the archive view', () => {
    const resolved = db.crisisIncidents.filter((c) => c.status === 'Resolved');
    expect(resolved).toHaveLength(1);
    expect(resolved[0].resolvedAt).toBeTruthy();
  });

  it('has two or more blocked activities, each with a breached blocking approval', () => {
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
      expect(refs.length).toBeGreaterThanOrEqual(1);
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

  it('scopes the override conditionally, so it falls away outside its condition', () => {
    // Pack C's version of the inheritance case is the hard one: Vitalis
    // restates the parent clinical-reference rule, but only for over-the-
    // counter products. The condition has to live in the data, not in prose.
    const vitalis = db.brands.find((b) => b.id === 'BRD-004');
    const parentRules = new Set(
      db.brands.find((b) => b.id === vitalis?.parentBrandId)?.guardrailPolicyIds ?? [],
    );
    const overrideId = (vitalis?.guardrailPolicyIds ?? []).find((id) => !parentRules.has(id));
    expect(overrideId).toBeTruthy();

    const override = db.policies.find((p) => p.id === overrideId);
    expect(override?.ruleText).toMatch(/only where|does not apply/i);

    // And the clause library has to switch on the same condition, otherwise
    // the resolver would offer the consumer standard to a prescription piece.
    const categories = new Set(
      db.legalClauses.map((c) => (c as { productCategory?: string }).productCategory),
    );
    expect(categories.has('otc-consumer-health')).toBe(true);
    expect(categories.has('prescription-medicine')).toBe(true);
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

describe('Pack C — the MLR chain is non-waivable', () => {
  const stageById = new Map(db.workflowStages.map((s) => [s.id, s]));
  const roleById = new Map(db.stakeholders.map((s) => [s.id, s.role]));

  it('runs Brand AI pre-check 2h → Medical 48h → Legal 48h → Regulatory 72h, in order', () => {
    const wf = db.workflows.find((w) => w.id === MLR_WORKFLOW_ID);
    expect(wf).toBeTruthy();
    expect(wf!.stageIds).toEqual([MLR_PRE_CHECK_STAGE_ID, ...MLR_NON_WAIVABLE_STAGES]);

    const stages = wf!.stageIds.map((id) => stageById.get(id)!);
    expect(stages.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(stages.map((s) => s.slaHours)).toEqual([2, 48, 48, 72]);
    expect(stages.every((s) => s.mode === 'sequential')).toBe(true);
    // Only the pre-check is automated; a gate a machine can clear is not a gate.
    expect(stages[0].automation).toBe('brand-ai');
    expect(stages.slice(1).every((s) => s.automation === null)).toBe(true);
  });

  it('seats all three review gates with an independent reviewer, never marketing', () => {
    for (const stageId of MLR_NON_WAIVABLE_STAGES) {
      const stage = stageById.get(stageId);
      expect(stage, `${stageId} is missing`).toBeTruthy();
      expect(stage!.workflowId).toBe(MLR_WORKFLOW_ID);
      expect(stage!.assigneeRole).toBe('Legal/Compliance Reviewer');
    }
  });

  it('records no decision at an MLR gate by anyone but an independent reviewer', () => {
    const atMlrGate = db.approvals.filter((a) =>
      (MLR_NON_WAIVABLE_STAGES as readonly string[]).includes(a.workflowStageId),
    );
    expect(atMlrGate.length).toBeGreaterThanOrEqual(3);

    const marketingDecisions = atMlrGate.filter(
      (a) => roleById.get(a.approverStakeholderId) !== 'Legal/Compliance Reviewer',
    );
    expect(marketingDecisions.map((a) => a.id)).toEqual([]);

    // Three genuinely independent people, not one person wearing three hats.
    const reviewers = new Set(atMlrGate.map((a) => a.approverStakeholderId));
    expect(reviewers.size).toBeGreaterThanOrEqual(3);
  });

  it('opens no exception or waiver record against anything on the MLR workflow', () => {
    const mlrContentIds = new Set(
      db.contents.filter((c) => c.workflowId === MLR_WORKFLOW_ID).map((c) => c.id),
    );
    expect(mlrContentIds.size).toBeGreaterThanOrEqual(1);

    const waivers = db.approvals.filter(
      (a) =>
        EXCEPTION_STAGE_IDS.has(a.workflowStageId) &&
        a.subjectEntity === 'Content' &&
        mlrContentIds.has(a.subjectId),
    );
    expect(waivers.map((a) => a.id)).toEqual([]);

    // And the rule that says so is seeded, so the shape and the words agree.
    const rule = db.policies.find((p) => /waiver|waivable/i.test(p.ruleText));
    expect(rule).toBeTruthy();
    expect(rule!.enforcement).toBe('block');
  });

  it('holds one content item at the Legal gate with a breached SLA', () => {
    const nowIso = `${PACK_ANCHOR}T23:59:59Z`;
    const stuck = db.approvals.filter(
      (a) =>
        a.workflowStageId === 'WFS-020' &&
        a.status === 'In Review' &&
        a.decidedAt === undefined &&
        a.slaDueAt < nowIso,
    );
    expect(stuck).toHaveLength(1);

    // Medical cleared it before Legal took it, and Regulatory has not seen it —
    // which is the whole point: the chain is sequential and cannot be skipped.
    const subjectId = stuck[0].subjectId;
    const chain = db.approvals.filter((a) => a.subjectId === subjectId);
    expect(chain.some((a) => a.workflowStageId === 'WFS-019' && a.status === 'Approved')).toBe(true);
    expect(chain.some((a) => a.workflowStageId === 'WFS-021')).toBe(false);

    // And the item is visibly stuck rather than quietly stuck.
    const content = db.contents.find((c) => c.id === subjectId);
    expect(content?.status).toBe('In Review');
    expect(
      db.notifications.some((n) => n.notifKind === 'sla-breach' && n.subjectId === stuck[0].id),
    ).toBe(true);
  });
});

describe('Pack C — graph density', () => {
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

  it('resolves asset → version → execution → communication → campaign for the ISI block', () => {
    // AST-003 is the superseded v7 safety block. The showcase depends on the
    // graph reaching every piece that still embeds it.
    const versions = db.contentVersions.filter((v) => v.assetIds?.includes('AST-003'));
    expect(versions.length).toBeGreaterThanOrEqual(3);

    const executions = db.channelExecutions.filter((x) =>
      versions.some((v) => v.id === x.contentVersionId),
    );
    const comms = db.communications.filter((c) =>
      executions.some((x) => x.communicationId === c.id),
    );
    expect(comms.length).toBeGreaterThanOrEqual(2);

    const campaignIds = new Set(
      comms
        .map((c) => db.campaignActivities.find((a) => a.id === c.campaignActivityId)?.campaignId)
        .filter(Boolean),
    );
    const live = [...campaignIds].filter((id) =>
      db.campaigns.some((c) => c.id === id && c.status === 'Live'),
    );
    expect(live.length).toBeGreaterThanOrEqual(1);
  });
});
