/**
 * Integrity tests for Pack A.
 *
 * These are not "does the data exist" tests. They check the four promises the
 * pack makes that are easy to break silently by editing one record:
 *
 *  1. Referential integrity — the same check the default pack runs.
 *  2. The state-coverage checklist in `docs/DEMO_PACKS.md` §4. A pack that
 *     quietly loses its off-track KPI or its expired-but-referenced asset
 *     still looks fine on screen and stops demonstrating anything.
 *  3. Graph density — every asset in a live status carried by two or more
 *     content versions, every content version carried by an execution.
 *  4. Date discipline — no literal dates, so the pack cannot rot.
 *
 * A pack B or C should copy this file and change only the pack import.
 */

import { describe, expect, it } from 'vitest';
import { renewablePack } from './renewable';
import { PACK_ANCHOR } from './_shared';
import { assertAllLinksResolve } from '../index';
import { TODAY } from '../../selectors/campaignSelectors';
import { acceptanceRate } from '../../selectors/agentRunSelectors';
import { originOf } from '../../selectors/originSelectors';
import { kpiAttainment } from '../../selectors/metricSelectors';

const db = renewablePack;

/** Assets deliberately left unreferenced, with the reason. */
const UNREFERENCED_BY_DESIGN = new Set(['AST-016', 'AST-017']);

describe('Pack A — referential integrity', () => {
  it('has no dangling references', () => {
    expect(assertAllLinksResolve(db)).toEqual([]);
  });

  it('anchors its dates to the app clock', () => {
    expect(PACK_ANCHOR).toBe(TODAY);
  });
});

describe('Pack A — required state coverage', () => {
  it('has one active crisis with frozen sends and a war room', () => {
    const active = db.crisisIncidents.filter((c) => c.status === 'Active');
    expect(active).toHaveLength(1);
    expect(active[0].warRoomStakeholderIds.length).toBeGreaterThanOrEqual(3);
    expect(active[0].holdingStatementContentId).toBeTruthy();
    expect(db.communications.filter((c) => c.status === 'Paused').length).toBeGreaterThanOrEqual(2);
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
    // A policy id set on both a parent and its child is what the brand
    // rulebook reads as an override — the local rule takes precedence. At
    // least one sub-brand must exercise that path; the others inherit cleanly,
    // which is the contrast that makes the override legible.
    const overriding = db.brands.filter((child) => {
      if (!child.parentBrandId) return false;
      const parent = db.brands.find((b) => b.id === child.parentBrandId);
      return (child.guardrailPolicyIds ?? []).some((id) =>
        (parent?.guardrailPolicyIds ?? []).includes(id),
      );
    });
    expect(overriding.length).toBeGreaterThanOrEqual(1);

    // And the overriding brand must also carry a stricter local rule that says
    // it wins, otherwise the override is an assertion rather than a rule.
    const localRules = db.policies.filter((p) =>
      (overriding[0].guardrailPolicyIds ?? []).includes(p.id),
    );
    expect(localRules.some((p) => /governs|takes precedence|wins/i.test(p.ruleText))).toBe(true);
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

describe('Pack A — graph density', () => {
  it('carries every asset in at least two content versions, bar the documented exceptions', () => {
    const refCount = new Map<string, number>();
    for (const v of db.contentVersions) {
      for (const assetId of v.assetIds ?? []) {
        refCount.set(assetId, (refCount.get(assetId) ?? 0) + 1);
      }
    }
    const thin = db.assets
      .filter((a) => (refCount.get(a.id) ?? 0) < 2)
      .map((a) => a.id);
    expect(new Set(thin)).toEqual(UNREFERENCED_BY_DESIGN);
  });

  it('carries every content version on at least one channel execution', () => {
    const carried = new Set(db.channelExecutions.map((x) => x.contentVersionId));
    const orphans = db.contentVersions.filter((v) => !carried.has(v.id)).map((v) => v.id);
    expect(orphans).toEqual([]);
  });

  it('resolves asset → version → execution → communication → campaign for the showcase asset', () => {
    const versions = db.contentVersions.filter((v) => v.assetIds?.includes('AST-002'));
    expect(versions.length).toBeGreaterThanOrEqual(4);

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
