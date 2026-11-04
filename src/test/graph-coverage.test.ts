/**
 * Knowledge-graph coverage tests.
 *
 * The graph traversal is driven by two hand-maintained tables in
 * src/data/selectors/graphSelectors.ts — an id-prefix regex and a collection
 * list. Both fail SILENTLY when they fall behind the seed: an id whose prefix
 * is missing is simply never matched, so an empty "Referenced by" panel is
 * indistinguishable from "nothing references this record". That is a confident
 * wrong answer, which is worse than an error.
 *
 * These tests make that drift fail loudly instead.
 */

import { describe, expect, it } from 'vitest';
import { getSeedDB } from '@/data/seed';
import { linksFrom, linksTo } from '@/data/selectors/graphSelectors';

const db = getSeedDB();

/** Every collection on the DB that holds prefixed records, by SeedDB key. */
const COLLECTION_KEYS = [
  'businessUnits',
  'brands',
  'regions',
  'stakeholders',
  'agencies',
  'ideas',
  'strategies',
  'campaigns',
  'campaignActivities',
  'briefs',
  'communications',
  'channelExecutions',
  'channels',
  'contents',
  'contentVersions',
  'assets',
  'audiences',
  'segments',
  'approvals',
  'policies',
  'budgets',
  'kpis',
  'customerPersonas',
  'journeys',
  'events',
  'crisisIncidents',
  'mediaContacts',
  'coverageItems',
  'competitors',
  'jurisdictions',
  'legalClauses',
] as const;

describe('graph id coverage', () => {
  it('resolves at least one edge for a record in every major collection', () => {
    const blind: string[] = [];
    for (const key of COLLECTION_KEYS) {
      const rows = db[key] as unknown as { id: string }[] | undefined;
      if (!rows?.length) continue;
      // A record is "visible" if the graph finds any edge in either direction.
      const visible = rows.some(
        (r) => linksTo(db, r.id).length > 0 || linksFrom(db, r.id).length > 0,
      );
      if (!visible) blind.push(key);
    }
    expect(blind, `collections invisible to the graph: ${blind.join(', ')}`).toEqual([]);
  });
});

describe('persona edges (review item 16)', () => {
  it('answers "what targets this persona" for at least one persona', () => {
    // The reviewer's stated need: which campaigns and content target this
    // persona, and what is affected if we retire it.
    const withEdges = db.customerPersonas.filter((p) => linksTo(db, p.id).length > 0);
    expect(
      withEdges.length,
      'no persona is referenced by anything — personas are still isolated from the graph',
    ).toBeGreaterThan(0);
  });

  it('surfaces the referencing entity types rather than a bare id list', () => {
    const persona = db.customerPersonas.find((p) => linksTo(db, p.id).length > 0)!;
    const entities = new Set(linksTo(db, persona.id).map((l) => l.entity));
    expect(entities.size).toBeGreaterThan(0);
    for (const link of linksTo(db, persona.id)) {
      expect(link.rel, 'every edge names the referencing field').toBeTruthy();
      expect(link.id, 'every edge names the referencing record').toBeTruthy();
    }
  });
});

describe('graph symmetry', () => {
  it('every outbound edge has a matching inbound edge on the target', () => {
    // linksFrom(A) containing B implies linksTo(B) contains A. Asymmetry means
    // one of the two traversals is skipping a collection.
    const campaign = db.campaigns[0];
    for (const out of linksFrom(db, campaign.id).slice(0, 15)) {
      const back = linksTo(db, out.id);
      expect(
        back.some((l) => l.id === campaign.id),
        `${campaign.id} -> ${out.id} has no reverse edge`,
      ).toBe(true);
    }
  });

  it('does not report a record as referencing itself', () => {
    for (const c of db.campaigns.slice(0, 10)) {
      expect(linksFrom(db, c.id).every((l) => l.id !== c.id)).toBe(true);
      expect(linksTo(db, c.id).every((l) => l.id !== c.id)).toBe(true);
    }
  });
});
