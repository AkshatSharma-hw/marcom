/**
 * Wave 2+3 entity integrity tests — CustomerPersona, Competitor, MarketTrend,
 * ShareOfVoice (SEED_MANIFEST.md "Wave 2+3 additions").
 *
 * Everything derives from the frozen SeedDB; no UI.
 */

import { describe, expect, it } from 'vitest';
import { assertAllLinksResolve, getSeedDB } from '@/data/seed';

const db = getSeedDB();

describe('seed graph referential integrity (Wave 2+3)', () => {
  it('assertAllLinksResolve returns zero errors for the full seed DB', () => {
    expect(assertAllLinksResolve(db)).toEqual([]);
  });
});

describe('CustomerPersona links', () => {
  it('has at least one persona', () => {
    expect(db.customerPersonas.length).toBeGreaterThan(0);
  });

  it('every CustomerPersona.audienceId resolves to a seeded Audience', () => {
    const audienceIds = new Set(db.audiences.map((a) => a.id));
    for (const persona of db.customerPersonas) {
      expect(audienceIds, `${persona.id} audienceId '${persona.audienceId}'`).toContain(
        persona.audienceId,
      );
    }
  });
});

describe('Competitor links and moves', () => {
  it('has at least one competitor', () => {
    expect(db.competitors.length).toBeGreaterThan(0);
  });

  it('every Competitor.focusBrandIds entry resolves to a seeded Brand', () => {
    const brandIds = new Set(db.brands.map((b) => b.id));
    for (const competitor of db.competitors) {
      expect(competitor.focusBrandIds.length).toBeGreaterThan(0);
      for (const brandId of competitor.focusBrandIds) {
        expect(brandIds, `${competitor.id} focusBrandId '${brandId}'`).toContain(brandId);
      }
    }
  });

  it('every competitor move date parses and falls in 2026', () => {
    for (const competitor of db.competitors) {
      expect(competitor.moves.length).toBeGreaterThan(0);
      for (const move of competitor.moves) {
        const parsed = new Date(move.date);
        expect(
          Number.isNaN(parsed.getTime()),
          `${competitor.id} move '${move.title}' date '${move.date}' should parse`,
        ).toBe(false);
        expect(
          move.date.startsWith('2026-'),
          `${competitor.id} move '${move.title}' date '${move.date}' should be in 2026`,
        ).toBe(true);
        expect(parsed.getUTCFullYear()).toBe(2026);
      }
    }
  });
});

describe('MarketTrend links', () => {
  it('has at least one trend', () => {
    expect(db.marketTrends.length).toBeGreaterThan(0);
  });

  it('every MarketTrend.businessUnitId resolves to a seeded BusinessUnit', () => {
    const buIds = new Set(db.businessUnits.map((bu) => bu.id));
    for (const trend of db.marketTrends) {
      expect(buIds, `${trend.id} businessUnitId '${trend.businessUnitId}'`).toContain(
        trend.businessUnitId,
      );
    }
  });

  it('every trend has a non-empty series', () => {
    for (const trend of db.marketTrends) {
      expect(trend.series.length).toBeGreaterThan(0);
    }
  });
});

describe('ShareOfVoice links and per-period sums', () => {
  it('has at least one observation', () => {
    expect(db.shareOfVoice.length).toBeGreaterThan(0);
  });

  it('every ShareOfVoice.brandId resolves to a seeded Brand', () => {
    const brandIds = new Set(db.brands.map((b) => b.id));
    for (const sov of db.shareOfVoice) {
      expect(brandIds, `${sov.id} brandId '${sov.brandId}'`).toContain(sov.brandId);
    }
  });

  it('pcts per period sum to <= 100', () => {
    const totalsByPeriod = new Map<string, number>();
    for (const sov of db.shareOfVoice) {
      expect(sov.pct, `${sov.id} pct`).toBeGreaterThanOrEqual(0);
      expect(sov.pct, `${sov.id} pct`).toBeLessThanOrEqual(100);
      totalsByPeriod.set(sov.period, (totalsByPeriod.get(sov.period) ?? 0) + sov.pct);
    }
    expect(totalsByPeriod.size).toBeGreaterThan(0);
    for (const [period, total] of totalsByPeriod) {
      expect(total, `period ${period} total pct`).toBeLessThanOrEqual(100);
    }
  });
});
