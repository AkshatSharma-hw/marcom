/**
 * The lifecycle stepper on a record page.
 *
 * It used to link every stage to the org-wide Brand to Demand page, which threw
 * away the record the user was reading. It now opens what THAT record holds at
 * that stage, derived from the relationship graph. These tests guard the two
 * ways that can go wrong quietly: a bucket disagreeing with the badge on the
 * record it lists, and a row linking to a route that does not exist.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSeedDB } from '@/data/seed';
import { stageBreakdown } from '@/data/selectors/stageSelectors';
import { linksFrom, linksTo } from '@/data/selectors/graphSelectors';
import { lifecycleStageFor, LIFECYCLE_ORDER } from '@/lib/lifecycle';
import { recordHref, ROUTED_ENTITIES } from '@/lib/recordRoute';
import { ENTITY_NOUNS } from '@/lib/entityNouns';
import type { EntityName } from '@/data/types';

const db = getSeedDB();

/** Vitest runs from the package root, so App.tsx is a plain relative path. */
const APP_TSX = resolve(process.cwd(), 'src/App.tsx');

/** Records with enough neighbours to exercise several stages at once. */
const SUBJECTS: [EntityName, string][] = [
  ['Campaign', 'CMP-001'],
  ['Content', 'CNT-014'],
  ['Communication', 'COM-001'],
  ['Audience', 'AUD-001'],
  ['Asset', 'AST-029'],
  ['Approval', 'APR-006'],
];

describe('stage breakdown', () => {
  it('buckets a neighbour under the stage its own status derives', () => {
    // The bucket is the only thing on screen claiming a record is at a stage.
    // If it disagreed with lifecycleStageFor, the panel and the status badge on
    // the very same row would be telling the user two different things.
    for (const [entity, id] of SUBJECTS) {
      const breakdown = stageBreakdown(db, entity, id);
      for (const stage of LIFECYCLE_ORDER) {
        for (const n of breakdown[stage] ?? []) {
          expect(
            lifecycleStageFor(n.entity, n.status),
            `${entity} ${id}: ${n.entity} ${n.id} is listed under "${stage}"`,
          ).toBe(stage);
        }
      }
    }
  });

  it('never lists the record itself, or a sibling of its own type', () => {
    for (const [entity, id] of SUBJECTS) {
      const all = Object.values(stageBreakdown(db, entity, id)).flat();
      expect(all.some((n) => n.id === id), `${id} lists itself`).toBe(false);
      expect(
        all.some((n) => n.entity === entity),
        `${entity} ${id} lists a sibling ${entity}`,
      ).toBe(false);
    }
  });

  it('lists each neighbour once, even when the relation is reciprocal', () => {
    // A record named in both directions appears in linksTo AND linksFrom. The
    // graph counts edges; this panel counts records.
    for (const [entity, id] of SUBJECTS) {
      const all = Object.values(stageBreakdown(db, entity, id)).flat();
      const ids = all.map((n) => n.id);
      expect(new Set(ids).size, `${entity} ${id} has duplicate rows`).toBe(ids.length);
    }
  });

  it('never invents a neighbour that is not in the graph', () => {
    for (const [entity, id] of SUBJECTS) {
      const real = new Set([...linksTo(db, id), ...linksFrom(db, id)].map((l) => l.id));
      for (const n of Object.values(stageBreakdown(db, entity, id)).flat()) {
        expect(real.has(n.id), `${entity} ${id}: ${n.id} is not a graph neighbour`).toBe(true);
      }
    }
  });

  it('never renders a row as a bare record id', () => {
    /* An id is not a name. Two entity types reached the panel with no `title`
       or `name` field and rendered as "APR-006" / "COV-026", which tells a user
       nothing about what they are being shown. */
    for (const [entity, id] of SUBJECTS) {
      for (const n of Object.values(stageBreakdown(db, entity, id)).flat()) {
        expect(n.title, `${entity} ${id}: ${n.entity} ${n.id} has no readable name`).not.toBe(
          n.id,
        );
      }
    }
  });

  it('places every entity the relationship chips already count', () => {
    /* The chips and the stepper sit two lines apart on the same header and
       describe the same neighbourhood. A record counted as "3 coverage items"
       above, but absent from every stage below, reads as data going missing. */
    for (const [entity, id] of SUBJECTS) {
      const placed = new Set(
        Object.values(stageBreakdown(db, entity, id))
          .flat()
          .map((n) => n.id),
      );
      const counted = [...linksTo(db, id), ...linksFrom(db, id)].filter(
        (l) => l.entity !== entity && l.id !== id && ENTITY_NOUNS[l.entity],
      );
      for (const l of counted) {
        expect(
          placed.has(l.id),
          `${entity} ${id}: ${l.entity} ${l.id} is counted by the chips but sits at no stage`,
        ).toBe(true);
      }
    }
  });

  it('names an approval by its workflow stage rather than its id', () => {
    // "APR-006" tells a user nothing; the stage it sits at is what identifies it.
    const comply = stageBreakdown(db, 'Campaign', 'CMP-001').comply ?? [];
    const approvals = comply.filter((n) => n.entity === 'Approval');
    expect(approvals.length).toBeGreaterThan(0);
    for (const a of approvals) {
      expect(a.title, `${a.id} falls back to its id`).not.toBe(a.id);
      expect(a.title).not.toMatch(/^APR-/);
    }
  });
});

describe('record routes', () => {
  it('only offers a link for entities App.tsx actually routes', () => {
    /* The failure this prevents is a row that looks openable and lands on a
       blank page. Read from App.tsx rather than a second hand-kept list,
       because a duplicated list is exactly what drifts. */
    const app = readFileSync(APP_TSX, 'utf8');
    for (const entity of ROUTED_ENTITIES) {
      const href = recordHref(entity, 'X-1');
      expect(href, `${entity} claims a route`).toBeTruthy();
      // "/pr/contacts/X-1" -> "/pr/contacts/:id"
      const pattern = href!.replace(/X-1$/, ':id');
      expect(app, `${entity} -> ${pattern} is not registered in App.tsx`).toContain(
        `path="${pattern}"`,
      );
    }
  });

  it('returns null for entities with no page, so callers render text', () => {
    for (const entity of ['Brief', 'CampaignActivity', 'Segment', 'KPI'] as EntityName[]) {
      expect(recordHref(entity, 'X-1'), `${entity} should have no route`).toBeNull();
    }
  });

  it('every neighbour the panel can link to resolves to a registered route', () => {
    const app = readFileSync(APP_TSX, 'utf8');
    for (const [entity, id] of SUBJECTS) {
      for (const n of Object.values(stageBreakdown(db, entity, id)).flat()) {
        const href = recordHref(n.entity, n.id);
        if (!href) continue;
        const pattern = href.replace(new RegExp(`${n.id}$`), ':id');
        expect(app, `${n.entity} ${n.id} -> ${href}`).toContain(`path="${pattern}"`);
      }
    }
  });
});
