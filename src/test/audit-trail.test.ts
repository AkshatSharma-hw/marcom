/**
 * Durable audit trail suite.
 *
 * The gap this covers: the store used to log mutations into React state that
 * was capped, unpersisted and gone on reload, so a crisis declared in-app had a
 * permanently empty timeline. These tests pin the three properties that make
 * the trail usable as evidence rather than as decoration —
 *
 *   1. every create/update/delete writes a full `AuditRecord`, with an actor
 *      and a before/after diff,
 *   2. the trail round-trips through localStorage,
 *   3. it is append-only: nothing edits or removes an entry, and the one
 *      operation that drops anything (the storage cap) drops only the oldest
 *      and says so in the trail itself.
 *
 * The pure-function half runs against src/lib/auditTrail.ts directly; the
 * behavioural half drives the real provider, because "does the store write an
 * audit record" is exactly the question that a hand-rolled fake would answer
 * wrongly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';

import * as auditTrail from '@/lib/auditTrail';
import {
  AUDIT_CAP,
  actorIdForRole,
  appendAudit,
  auditStamp,
  collectionForEntity,
  describeCollection,
  diffFields,
  nextAuditSequence,
  parseAuditLog,
  type AuditDraft,
} from '@/lib/auditTrail';
import {
  DataProvider,
  useAuditRecords,
  useCollection,
  useAuditTrail,
} from '@/store/DataStore';
import { RoleProvider } from '@/lib/rbac';
import { activeDemoPackId } from '@/lib/demoPack';
import { getSeedDB } from '@/data/seed';
import { TODAY } from '@/data/selectors/campaignSelectors';
import type { AuditRecord, Campaign } from '@/data/types';

const STORAGE_KEY = `marcomm-store:${activeDemoPackId()}`;

/**
 * The jsdom build this repo pins exposes a `localStorage` global with no
 * methods on it, which the store tolerates (every access is wrapped) but this
 * suite cannot: surviving a reload is the property under test, and a store
 * that silently kept everything in memory would pass a durability test that
 * proves nothing. So the test supplies a real one.
 */
function installLocalStorage(): void {
  let cells = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return cells.size;
    },
    clear: () => {
      cells = new Map();
    },
    getItem: (key: string) => cells.get(key) ?? null,
    key: (index: number) => [...cells.keys()][index] ?? null,
    removeItem: (key: string) => {
      cells.delete(key);
    },
    setItem: (key: string, value: string) => {
      cells.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

installLocalStorage();

const draft = (over: Partial<AuditDraft> = {}): AuditDraft => ({
  actorStakeholderId: 'STK-001',
  action: 'campaign.updated',
  entityType: 'Campaign',
  entityId: 'CMP-003',
  detail: 'status: "Approved" → "Live"',
  ...over,
});

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(RoleProvider, null, createElement(DataProvider, null, children));

beforeEach(() => {
  localStorage.clear();
});

/* ------------------------------------------------------------------ */
/* Record shape                                                        */
/* ------------------------------------------------------------------ */

describe('audit record shape', () => {
  it('maps every store collection to a real entity type, reversibly', () => {
    /* The reverse lookup is what lets a stored record name the collection it
       came from, so a collision or a gap here silently misfiles events. */
    const ids = [
      'agentRuns',
      'aiReviews',
      'approvals',
      'assets',
      'brands',
      'briefs',
      'budgets',
      'campaigns',
      'channelExecutions',
      'communications',
      'contents',
      'contentVersions',
      'crisisIncidents',
      'customerPersonas',
      'glossaryTerms',
      'ideas',
      'journeys',
      'legalClauses',
      'notifications',
      'suppressionEntries',
      'workflows',
      'workflowStages',
    ];
    for (const id of ids) {
      const { entity } = describeCollection(id);
      expect(collectionForEntity(entity), `${id} does not round-trip`).toBe(id);
    }
  });

  it('resolves the signed-in role to a seeded stakeholder id', () => {
    const actor = actorIdForRole('CMO');
    expect(getSeedDB().stakeholders.some((s) => s.id === actor)).toBe(true);
  });

  it('stamps entries on the pinned demo clock, not the wall clock', () => {
    const stamp = auditStamp(1);
    expect(stamp.startsWith(TODAY)).toBe(true);
    // Strictly ordered within the pinned instant, so timelines that sort by
    // `at` do not fall back to array order.
    expect(auditStamp(2) > stamp).toBe(true);
    // And saturating rather than rolling into the next day.
    expect(auditStamp(50_000).startsWith(TODAY)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Diffs                                                               */
/* ------------------------------------------------------------------ */

describe('diffFields', () => {
  it('reports only what changed, as before → after', () => {
    const out = diffFields(
      { id: 'CMP-003', status: 'Approved', name: 'Volt5' },
      { id: 'CMP-003', status: 'Live', name: 'Volt5' },
    );
    expect(out).toBe('status: "Approved" → "Live"');
  });

  it('renders an absent side as an em dash, so creates and deletes read', () => {
    expect(diffFields({}, { status: 'Draft' })).toBe('status: — → "Draft"');
    expect(diffFields({ status: 'Draft' }, {})).toBe('status: "Draft" → —');
  });

  it('says so rather than lying when nothing changed', () => {
    expect(diffFields({ a: 1 }, { a: 1 })).toBe('no field values changed');
  });

  it('bounds a wide diff instead of writing the whole record into storage', () => {
    const before = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`f${String(i).padStart(2, '0')}`, i]),
    );
    const after = Object.fromEntries(
      Object.entries(before).map(([k, v]) => [k, (v as number) + 1]),
    );
    const out = diffFields(before, after);
    expect(out).toContain('+12 more fields');
  });
});

/* ------------------------------------------------------------------ */
/* Append-only behaviour                                               */
/* ------------------------------------------------------------------ */

describe('appendAudit', () => {
  it('appends without mutating the log it was given', () => {
    const log: AuditRecord[] = [];
    const next = appendAudit(log, draft());
    expect(log).toHaveLength(0);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      actorStakeholderId: 'STK-001',
      action: 'campaign.updated',
      entityType: 'Campaign',
      entityId: 'CMP-003',
    });
    expect(next[0].at).toBe(next[0].createdAt);
  });

  it('never reuses an id and keeps entries in append order', () => {
    let log: AuditRecord[] = [];
    for (let i = 0; i < 5; i += 1) log = appendAudit(log, draft());
    const ids = log.map((r) => r.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toEqual([...ids].sort());
    expect(nextAuditSequence(log)).toBe(6);
  });

  it('trims the oldest entries at the cap and records that it did', () => {
    let log: AuditRecord[] = [];
    for (let i = 0; i < AUDIT_CAP; i += 1) {
      log = appendAudit(log, draft({ detail: `entry ${i}` }));
    }
    const oldestBefore = log[0].id;
    log = appendAudit(log, draft({ detail: 'the one that overflows' }));

    expect(log).toHaveLength(AUDIT_CAP);
    // The trim came off the front, never the middle or the end.
    expect(log.some((r) => r.id === oldestBefore)).toBe(false);
    expect(log.some((r) => r.detail === 'the one that overflows')).toBe(true);

    // ...and the drop is itself an entry, not a silent loss.
    const marker = log[log.length - 1];
    expect(marker.action).toBe('auditTrail.trimmed');
    expect(marker.detail).toContain('Trimmed 2 oldest entries');
    expect(marker.entityId).toBe(marker.id);
  });

  it('exports no way to edit or remove a single entry', () => {
    /* An append-only guarantee that lives only in a comment is not one. If a
       mutator is ever added to the module this fails and whoever adds it has to
       argue for it explicitly. */
    const mutators = Object.keys(auditTrail).filter((name) =>
      /^(update|delete|remove|edit|set|clear|purge)/.test(name),
    );
    expect(mutators).toEqual([]);
  });
});

describe('parseAuditLog', () => {
  it('drops anything that is not a complete record', () => {
    const good = appendAudit([], draft())[0];
    expect(parseAuditLog([good])).toHaveLength(1);
    expect(parseAuditLog([{ ...good, at: undefined }])).toHaveLength(0);
    expect(parseAuditLog([{ ...good, actorStakeholderId: 42 }])).toHaveLength(0);
    expect(parseAuditLog('not an array')).toEqual([]);
    expect(parseAuditLog(undefined)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* The store actually writes                                           */
/* ------------------------------------------------------------------ */

function mountStore() {
  return renderHook(
    () => ({
      campaigns: useCollection<Campaign>('campaigns', getSeedDB().campaigns),
      records: useAuditRecords(),
      entries: useAuditTrail(),
    }),
    { wrapper },
  );
}

describe('DataStore writes the trail', () => {
  it('records a create, an update and a delete with actor, ids and a diff', () => {
    const { result } = mountStore();
    const target = getSeedDB().campaigns[0].id;

    act(() => {
      result.current.campaigns.updateIn(target, { status: 'Paused' });
    });
    act(() => {
      result.current.campaigns.removeFrom(target);
    });

    const [updated, deleted] = result.current.records;
    expect(result.current.records).toHaveLength(2);

    expect(updated.action).toBe('campaign.updated');
    expect(updated.entityType).toBe('Campaign');
    expect(updated.entityId).toBe(target);
    expect(updated.at.startsWith(TODAY)).toBe(true);
    expect(getSeedDB().stakeholders.some((s) => s.id === updated.actorStakeholderId)).toBe(
      true,
    );
    // The before/after diff, not just "something changed".
    expect(updated.detail).toContain('status:');
    expect(updated.detail).toContain('→ "Paused"');

    expect(deleted.action).toBe('campaign.deleted');
    // A deleted record's field values survive only here.
    expect(deleted.detail).toContain('→ —');
  });

  it('gives a record created in-session a non-empty trail of its own', () => {
    /* The reported symptom: declare something in-app, open its timeline, find
       nothing. Keyed on entityId because that is what every timeline filters
       on. */
    const { result } = mountStore();
    let newId = '';
    act(() => {
      newId = result.current.campaigns.createIn(
        { name: 'Runtime campaign' } as Omit<Campaign, 'id'>,
        'CMP-',
      );
    });

    const mine = result.current.records.filter((r) => r.entityId === newId);
    expect(mine).toHaveLength(1);
    expect(mine[0].action).toBe('campaign.created');
    expect(mine[0].detail).toContain('— → "Runtime campaign"');

    // ...and the flat projection the audit surfaces consume agrees.
    const entry = result.current.entries.find((e) => e.recordId === newId);
    expect(entry).toBeDefined();
    expect(entry?.collection).toBe('campaigns');
    expect(entry?.action).toBe('create');
    expect(Number.isNaN(entry?.ts ?? NaN)).toBe(false);
  });

  it('exposes the newest entry first, so merged timelines order correctly', () => {
    const { result } = mountStore();
    const [a, b] = getSeedDB().campaigns;
    act(() => {
      result.current.campaigns.updateIn(a.id, { status: 'Paused' });
    });
    act(() => {
      result.current.campaigns.updateIn(b.id, { status: 'Paused' });
    });
    expect(result.current.entries[0].recordId).toBe(b.id);
    expect(result.current.records[0].entityId).toBe(a.id);
  });
});

/* ------------------------------------------------------------------ */
/* Durability                                                          */
/* ------------------------------------------------------------------ */

describe('the trail survives a reload', () => {
  it('persists alongside the records and reloads with them', () => {
    const first = mountStore();
    const target = getSeedDB().campaigns[0].id;
    act(() => {
      first.result.current.campaigns.updateIn(target, { status: 'Paused' });
    });

    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    expect(parseAuditLog((saved as { audit?: unknown }).audit)).toHaveLength(1);
    first.unmount();

    // A fresh provider is what a page reload amounts to here.
    const second = mountStore();
    expect(second.result.current.records).toHaveLength(1);
    expect(second.result.current.records[0].entityId).toBe(target);
  });

  it('keeps appending after a reload instead of restarting the sequence', () => {
    const first = mountStore();
    const [a, b] = getSeedDB().campaigns;
    act(() => {
      first.result.current.campaigns.updateIn(a.id, { status: 'Paused' });
    });
    const firstId = first.result.current.records[0].id;
    first.unmount();

    const second = mountStore();
    act(() => {
      second.result.current.campaigns.updateIn(b.id, { status: 'Paused' });
    });
    const ids = second.result.current.records.map((r) => r.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(firstId);
    expect(ids[1] > firstId).toBe(true);
  });

  it('survives a full store reset, and records the reset', () => {
    /* An audit log any user can clear with one button is not evidence. The
       records go; the account of them going stays. */
    const { result } = mountStore();
    const target = getSeedDB().campaigns[0].id;
    act(() => {
      result.current.campaigns.updateIn(target, { status: 'Paused' });
    });
    act(() => {
      result.current.campaigns.resetAll();
    });

    expect(result.current.records).toHaveLength(2);
    expect(result.current.records[0].entityId).toBe(target);
    expect(result.current.records[1].action).toBe('store.reset');
    // Reset entries are filed against the trail, so they cannot show up inside
    // a record's own timeline.
    expect(result.current.records[1].entityId).toBe('');
  });
});
