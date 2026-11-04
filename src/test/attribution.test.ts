/**
 * Attribution test suite — model math over seed-derived touchpoints.
 *
 * Campaigns are found dynamically from the frozen SeedDB (no hardcoded ids):
 * conservation of credit, single-touch degeneracy, first/last-touch placement,
 * linear splitting, deterministic touchpoint derivation, failed-execution
 * exclusion, and the zero-conversion edge.
 */

import { describe, it, expect } from 'vitest';
import {
  ATTRIBUTION_MODELS,
  deriveTouchpoints,
  attributeCampaign,
  campaignConversionTotal,
  type Conversion,
  type Touchpoint,
} from '@/services/attribution';
import { getSeedDB } from '@/data/seed';
import { DEFAULT_LOCALE } from "@/lib/i18n";

const db = getSeedDB();

/** Campaigns that have both a positive conversion total and touchpoints. */
const convertingCampaigns = db.campaigns.filter(
  (c) =>
    campaignConversionTotal(db, c.id) > 0 && deriveTouchpoints(db, c.id).length > 0,
);

/** All executions reachable from a campaign (including failed ones). */
function executionsForCampaign(campaignId: string) {
  const activityIds = new Set(
    db.campaignActivities.filter((a) => a.campaignId === campaignId).map((a) => a.id),
  );
  const commIds = new Set(
    db.communications
      .filter((c) => c.campaignActivityId && activityIds.has(c.campaignActivityId))
      .map((c) => c.id),
  );
  return db.channelExecutions.filter((x) => commIds.has(x.communicationId));
}

describe('seed preconditions', () => {
  it('the seed contains at least one campaign with conversions and touchpoints', () => {
    expect(convertingCampaigns.length).toBeGreaterThan(0);
  });

  it('there are exactly five attribution models', () => {
    expect(ATTRIBUTION_MODELS.map((m) => m.key).sort()).toEqual([
      'first-touch',
      'last-touch',
      'linear',
      'position-based',
      'time-decay',
    ]);
  });
});

describe('credit conservation', () => {
  it("every model's allocations sum to the campaign conversion total within 0.01", () => {
    for (const campaign of convertingCampaigns) {
      const total = campaignConversionTotal(db, campaign.id);
      for (const model of ATTRIBUTION_MODELS) {
        const { allocations, conversion } = attributeCampaign(db, campaign.id, model.key);
        expect(conversion.value).toBe(total);
        const sumValue = allocations.reduce((s, a) => s + a.value, 0);
        expect(sumValue, `${model.key} value sum for ${campaign.id}`).toBeCloseTo(total, 2);
        const sumWeight = allocations.reduce((s, a) => s + a.weight, 0);
        expect(sumWeight, `${model.key} weight sum for ${campaign.id}`).toBeCloseTo(1, 6);
      }
    }
  });
});

describe('model placement rules', () => {
  const conversion: Conversion = { campaignId: 'test', value: 1000 };

  it('a single touchpoint receives 100% of the credit under all five models', () => {
    const single: Touchpoint[] = [{ channelId: 'CH-only', at: '2026-01-05T10:00:00Z' }];
    for (const model of ATTRIBUTION_MODELS) {
      const allocations = model.attribute(conversion, single);
      expect(allocations, model.key).toHaveLength(1);
      expect(allocations[0].channelId).toBe('CH-only');
      expect(allocations[0].weight).toBeCloseTo(1, 6);
      expect(allocations[0].value).toBeCloseTo(1000, 6);
    }
  });

  const sequence: Touchpoint[] = [
    { channelId: 'CH-early', at: '2026-01-01T08:00:00Z' },
    { channelId: 'CH-mid', at: '2026-01-03T08:00:00Z' },
    { channelId: 'CH-late', at: '2026-01-06T08:00:00Z' },
  ];

  it('first-touch puts all credit on the earliest touchpoint channel', () => {
    const allocations = ATTRIBUTION_MODELS.find((m) => m.key === 'first-touch')!.attribute(
      conversion,
      sequence,
    );
    const byChannel = new Map(allocations.map((a) => [a.channelId, a]));
    expect(byChannel.get('CH-early')?.weight).toBeCloseTo(1, 6);
    expect(byChannel.get('CH-early')?.value).toBeCloseTo(1000, 6);
    expect(byChannel.get('CH-mid')?.weight ?? 0).toBeCloseTo(0, 6);
    expect(byChannel.get('CH-late')?.weight ?? 0).toBeCloseTo(0, 6);
  });

  it('last-touch puts all credit on the latest touchpoint channel', () => {
    const allocations = ATTRIBUTION_MODELS.find((m) => m.key === 'last-touch')!.attribute(
      conversion,
      sequence,
    );
    const byChannel = new Map(allocations.map((a) => [a.channelId, a]));
    expect(byChannel.get('CH-late')?.weight).toBeCloseTo(1, 6);
    expect(byChannel.get('CH-late')?.value).toBeCloseTo(1000, 6);
    expect(byChannel.get('CH-early')?.weight ?? 0).toBeCloseTo(0, 6);
    expect(byChannel.get('CH-mid')?.weight ?? 0).toBeCloseTo(0, 6);
  });

  it('first/last-touch place credit correctly on real seed touchpoints', () => {
    for (const campaign of convertingCampaigns) {
      const touchpoints = deriveTouchpoints(db, campaign.id);
      const total = campaignConversionTotal(db, campaign.id);
      const first = attributeCampaign(db, campaign.id, 'first-touch');
      const firstWinner = first.allocations.find((a) => a.weight > 0.999);
      expect(firstWinner?.channelId, `first-touch ${campaign.id}`).toBe(
        touchpoints[0].channelId,
      );
      expect(firstWinner?.value).toBeCloseTo(total, 2);
      const last = attributeCampaign(db, campaign.id, 'last-touch');
      const lastWinner = last.allocations.find((a) => a.weight > 0.999);
      expect(lastWinner?.channelId, `last-touch ${campaign.id}`).toBe(
        touchpoints[touchpoints.length - 1].channelId,
      );
      expect(lastWinner?.value).toBeCloseTo(total, 2);
    }
  });

  it('linear splits credit equally across distinct-channel touchpoints (no weight hints)', () => {
    const allocations = ATTRIBUTION_MODELS.find((m) => m.key === 'linear')!.attribute(
      conversion,
      sequence,
    );
    expect(allocations).toHaveLength(3);
    for (const a of allocations) {
      expect(a.weight, a.channelId).toBeCloseTo(1 / 3, 6);
      expect(a.value, a.channelId).toBeCloseTo(1000 / 3, 6);
    }
  });
});

describe('deriveTouchpoints', () => {
  it('is deterministic — two calls are deep-equal', () => {
    for (const campaign of db.campaigns) {
      const a = deriveTouchpoints(db, campaign.id);
      const b = deriveTouchpoints(db, campaign.id);
      expect(a).toEqual(b);
    }
  });

  it('is sorted ascending by timestamp', () => {
    for (const campaign of db.campaigns) {
      const tps = deriveTouchpoints(db, campaign.id);
      for (let i = 1; i < tps.length; i++) {
        expect(tps[i - 1].at.localeCompare(tps[i].at, DEFAULT_LOCALE)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('excludes failed executions', () => {
    let sawFailed = false;
    for (const campaign of db.campaigns) {
      const executions = executionsForCampaign(campaign.id);
      const nonFailed = executions.filter((x) => x.status !== 'failed');
      const tps = deriveTouchpoints(db, campaign.id);
      expect(tps, campaign.id).toHaveLength(nonFailed.length);
      if (nonFailed.length < executions.length) sawFailed = true;
    }
    // The seed contains at least one failed execution, so the exclusion
    // branch is genuinely exercised, not vacuously true.
    expect(sawFailed).toBe(true);
  });
});

describe('zero-conversion campaigns', () => {
  it('yield zero-value allocations without NaN for every model', () => {
    // Prefer a real zero-conversion campaign that still has touchpoints;
    // otherwise reuse a converting campaign's touchpoints with a zero-value
    // conversion so the division path is still exercised.
    const zeroCampaign = db.campaigns.find(
      (c) =>
        campaignConversionTotal(db, c.id) === 0 &&
        deriveTouchpoints(db, c.id).length > 0,
    );

    if (zeroCampaign) {
      for (const model of ATTRIBUTION_MODELS) {
        const { allocations, conversion } = attributeCampaign(db, zeroCampaign.id, model.key);
        expect(conversion.value).toBe(0);
        expect(allocations.length).toBeGreaterThan(0);
        for (const a of allocations) {
          expect(Number.isNaN(a.weight), `${model.key} weight NaN`).toBe(false);
          expect(Number.isNaN(a.value), `${model.key} value NaN`).toBe(false);
          expect(a.value).toBe(0);
        }
      }
    } else {
      const touchpoints = deriveTouchpoints(db, convertingCampaigns[0].id);
      const zero: Conversion = { campaignId: convertingCampaigns[0].id, value: 0 };
      for (const model of ATTRIBUTION_MODELS) {
        const allocations = model.attribute(zero, touchpoints);
        expect(allocations.length).toBeGreaterThan(0);
        for (const a of allocations) {
          expect(Number.isNaN(a.weight), `${model.key} weight NaN`).toBe(false);
          expect(Number.isNaN(a.value), `${model.key} value NaN`).toBe(false);
          expect(a.value).toBe(0);
        }
      }
    }
  });

  it('a campaign with no touchpoints yields empty allocations, never NaN', () => {
    const result = attributeCampaign(db, 'CMP-nonexistent', 'linear');
    expect(result.touchpoints).toEqual([]);
    expect(result.allocations).toEqual([]);
    expect(Number.isNaN(result.conversion.value)).toBe(false);
  });
});
