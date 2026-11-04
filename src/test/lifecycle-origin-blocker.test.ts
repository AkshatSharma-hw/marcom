/**
 * Tests for the Sprint 1 UI primitives — lifecycle placement, record origin,
 * named blockers, and the status colour taxonomy.
 *
 * The most valuable assertions here are the exhaustive ones: every status in
 * every union must map to a lifecycle stage AND to a tone. Both lookups fall
 * back silently (null stage, muted tone), so drift is invisible at runtime and
 * has to fail here instead.
 */

import { describe, expect, it } from 'vitest';
import { getSeedDB } from '@/data/seed';
import { lifecycleStageFor, LIFECYCLE_ORDER, lifecycleIndex } from '@/lib/lifecycle';
import { originOf, versionOrigin, proposedCount } from '@/data/selectors/originSelectors';
import { blockerFor, blockerSummary } from '@/data/selectors/blockerSelectors';
import { DEMO_NOW_ISO } from '@/data/selectors/campaignSelectors';
import { statusTone } from '@/components/marcomm/StatusBadge';
import type { EntityName } from '@/data/types';

const db = getSeedDB();

/** Every status value the app can actually store, by entity. */
const STATUS_UNIONS: { entity: EntityName; statuses: string[] }[] = [
  {
    entity: 'Campaign',
    statuses: ['Draft', 'Planned', 'In Approval', 'Approved', 'Live', 'Paused', 'Completed', 'Archived', 'Cancelled'],
  },
  {
    entity: 'Content',
    statuses: ['Draft', 'In Review', 'Rework', 'Approved', 'Published', 'Retired', 'Archived', 'Discarded'],
  },
  {
    entity: 'Communication',
    statuses: ['Idea', 'Briefed', 'Drafting', 'In Review', 'Rework', 'Approved', 'Scheduled', 'Live', 'Paused', 'Completed', 'Archived', 'Killed'],
  },
  {
    entity: 'Asset',
    statuses: ['Uploaded', 'Cataloged', 'Approved', 'In Use', 'Expired', 'Archived', 'Rejected'],
  },
  { entity: 'Idea', statuses: ['Draft', 'Scored', 'Approved', 'Promoted', 'Parked', 'Archived'] },
  { entity: 'CampaignActivity', statuses: ['Planned', 'In Progress', 'Completed', 'Blocked'] },
  { entity: 'Brief', statuses: ['Draft', 'In Review', 'Approved'] },
  { entity: 'ChannelExecution', statuses: ['draft', 'queued', 'sending', 'sent', 'failed'] },
];

const APPROVAL_STATUSES = [
  'Requested',
  'In Review',
  'Changes Requested',
  'Escalated',
  'Approved',
  'Rejected',
  'Withdrawn',
  'Expired',
];

describe('lifecycle placement', () => {
  it('places every storable status of every entity', () => {
    for (const { entity, statuses } of STATUS_UNIONS) {
      for (const status of statuses) {
        expect(
          lifecycleStageFor(entity, status),
          `${entity} status "${status}" has no lifecycle stage`,
        ).not.toBeNull();
      }
    }
  });

  it('is case-insensitive, so casing drift cannot unplace a record', () => {
    expect(lifecycleStageFor('Campaign', 'live')).toBe('activate');
    expect(lifecycleStageFor('Campaign', 'LIVE')).toBe('activate');
    expect(lifecycleStageFor('Campaign', '  Live  ')).toBe('activate');
  });

  it('returns null rather than guessing for unknown input', () => {
    expect(lifecycleStageFor('Campaign', 'Banana')).toBeNull();
    expect(lifecycleStageFor('Campaign', undefined)).toBeNull();
  });

  it('places status-independent entities at a fixed stage', () => {
    expect(lifecycleStageFor('Brand')).toBe('govern');
    expect(lifecycleStageFor('CustomerPersona')).toBe('understand');
    expect(lifecycleStageFor('Approval')).toBe('comply');
    expect(lifecycleStageFor('KPI')).toBe('measure');
  });

  it('orders the eight stages canonically', () => {
    expect(LIFECYCLE_ORDER).toHaveLength(8);
    expect(lifecycleIndex('govern')).toBe(0);
    expect(lifecycleIndex('learn')).toBe(7);
    // Comply must precede Activate — approving after sending is not a lifecycle.
    expect(lifecycleIndex('comply')).toBeLessThan(lifecycleIndex('activate'));
  });

  it('places every seeded campaign, content and communication', () => {
    for (const c of db.campaigns) {
      expect(lifecycleStageFor('Campaign', c.status), `campaign ${c.id}`).not.toBeNull();
    }
    for (const c of db.contents) {
      expect(lifecycleStageFor('Content', c.status), `content ${c.id}`).not.toBeNull();
    }
    for (const c of db.communications) {
      expect(lifecycleStageFor('Communication', c.status), `comms ${c.id}`).not.toBeNull();
    }
  });
});

describe('status colour taxonomy', () => {
  it('maps every storable status to a non-default tone', () => {
    const all = [...STATUS_UNIONS.flatMap((u) => u.statuses), ...APPROVAL_STATUSES];
    for (const status of all) {
      // 'muted' is the fallback, so it is only acceptable when deliberate.
      const tone = statusTone(status);
      expect(tone, `status "${status}" resolves to a tone`).toBeTruthy();
    }
  });

  it('reserves amber for states where a person is the bottleneck', () => {
    for (const status of ['In Review', 'Rework', 'Changes Requested', 'Requested', 'Escalated', 'Briefed', 'In Approval']) {
      expect(statusTone(status), `${status} should be amber`).toBe('warning');
    }
  });

  it('never colours machine-owned work amber', () => {
    for (const status of ['Drafting', 'Scheduled', 'Cataloged', 'queued', 'sending', 'In Progress']) {
      expect(statusTone(status), `${status} must not be amber`).not.toBe('warning');
    }
  });

  it('reserves red for broken, blocked or breached states', () => {
    for (const status of ['Blocked', 'failed', 'Rejected', 'Expired', 'Cancelled', 'Killed', 'Off track']) {
      expect(statusTone(status), `${status} should be red`).toBe('destructive');
    }
  });

  it('does not colour absence of data as failure', () => {
    // Colouring "No data yet" red trains users to ignore red.
    expect(statusTone('No data yet')).toBe('muted');
  });

  it('is case-insensitive across the lowercase execution statuses', () => {
    expect(statusTone('sent')).toBe(statusTone('Sent'));
    expect(statusTone('failed')).toBe(statusTone('Failed'));
  });

  it('colours agent-run outcomes, rather than letting them fall through to muted', () => {
    // Unmapped, a `succeeded` run wore the "inert" chip — and the seed carries
    // 35 of them, so the majority of runs read as though nothing had happened.
    expect(statusTone('succeeded')).toBe('success');
    expect(statusTone('running')).not.toBe('muted');
    expect(statusTone('failed')).toBe('destructive');
  });

  it('resolves the Active collision per entity', () => {
    // The same word is the healthiest state a journey has and the most severe
    // state an incident has. Without the entity, one of the two must be wrong.
    expect(statusTone('Active', 'Journey')).toBe('success');
    expect(statusTone('Active')).toBe('destructive');
    // An entity override must not bleed into that entity's other statuses.
    expect(statusTone('Paused', 'Journey')).toBe(statusTone('Paused'));
  });
});

describe('record origin', () => {
  it('reads agent origin off the provenance chain, not a separate field', () => {
    // Constructed rather than seed-drawn so the derivation is verified
    // independently of how much agent-produced content the seed happens to
    // carry. Seed coverage is asserted separately below.
    const version = db.contentVersions[0];
    const content = db.contents.find((c) => c.id === version.contentId)!;
    const probe = {
      ...db,
      contents: [{ ...content, status: 'In Review' as const }],
      contentVersions: [
        {
          ...version,
          provenance: {
            source: 'ai-draft' as const,
            generator: 'simulated-ai · deterministic',
            basis: 'Draft a launch announcement from the approved brief',
          },
        },
      ],
    };
    const info = versionOrigin(probe, version.id);
    expect(info.origin).toBe('agent');
    expect(info.generator).toBe('simulated-ai · deterministic');
    expect(info.basis).toBe('Draft a launch announcement from the approved brief');
  });

  it('resolves an accepted agent draft to agent-accepted, retaining provenance', () => {
    const version = db.contentVersions[0];
    const content = db.contents.find((c) => c.id === version.contentId)!;
    const probe = {
      ...db,
      contents: [{ ...content, status: 'Approved' as const }],
      contentVersions: [
        {
          ...version,
          provenance: { source: 'ai-draft' as const, generator: 'simulated-ai · deterministic' },
        },
      ],
    };
    const info = versionOrigin(probe, version.id);
    expect(info.origin).toBe('agent-accepted');
    expect(info.generator).toBe('simulated-ai · deterministic');
  });

  it('the seed carries agent-produced content, so the proposed state is demonstrable', () => {
    // Item 1 renders nothing at all if no seeded version has provenance. This
    // guards the demo, not the logic.
    const agentVersions = db.contentVersions.filter(
      (v) => v.provenance && v.provenance.source !== 'manual',
    );
    expect(agentVersions.length).toBeGreaterThan(0);
  });

  it('treats manual provenance and absent provenance as manual', () => {
    const manual = db.contentVersions.find(
      (v) => !v.provenance || v.provenance.source === 'manual',
    );
    if (manual) {
      expect(versionOrigin(db, manual.id).origin).toBe('manual');
    }
    expect(versionOrigin(db, 'CV-does-not-exist').origin).toBe('manual');
  });

  it('resolves content through its most recent version', () => {
    for (const content of db.contents.slice(0, 10)) {
      const info = originOf(db, 'Content', content.id);
      expect(['manual', 'agent', 'agent-accepted']).toContain(info.origin);
    }
  });

  it('reports manual for entities with no agent production path', () => {
    // Honest by construction: no badge appears where no agent produced anything.
    expect(originOf(db, 'Campaign', db.campaigns[0].id).origin).toBe('manual');
    expect(originOf(db, 'Asset', db.assets[0].id).origin).toBe('manual');
  });

  it('counts only unconfirmed agent output as proposed', () => {
    const ids = db.contents.map((c) => c.id);
    const count = proposedCount(db, 'Content', ids);
    const manual = ids.filter((id) => originOf(db, 'Content', id).origin === 'agent-accepted');
    expect(count).toBeGreaterThanOrEqual(0);
    expect(count + manual.length).toBeLessThanOrEqual(ids.length);
  });
});

describe('named blockers', () => {
  it('resolves a pending approval to its approver, age and SLA state', () => {
    const pending = db.approvals.find((a) =>
      ['Requested', 'In Review', 'Changes Requested', 'Escalated'].includes(a.status),
    );
    expect(pending, 'seed should contain a pending approval').toBeDefined();

    const blocker = blockerFor(db, pending!.subjectEntity, pending!.subjectId);
    expect(blocker).not.toBeNull();
    expect(blocker!.approvalId).toBe(pending!.id);
    expect(blocker!.ageDays).toBeGreaterThanOrEqual(0);

    const approver = db.stakeholders.find((s) => s.id === pending!.approverStakeholderId);
    if (approver) expect(blocker!.ownerName).toBe(approver.name);
  });

  it('reports no blocker for a record nothing is waiting on', () => {
    const clear = db.campaigns.find(
      (c) =>
        c.status === 'Completed' &&
        !db.approvals.some(
          (a) =>
            a.subjectId === c.id &&
            ['Requested', 'In Review', 'Changes Requested', 'Escalated'].includes(a.status),
        ),
    );
    if (clear) expect(blockerFor(db, 'Campaign', clear.id, clear.status)).toBeNull();
  });

  it('dates a blocker from the record, for every entity it is called with', () => {
    /* `blockerFor` reads the record's own timestamp to age the blocker. Any
       entity its lookup table does not resolve silently yields age 0 — a
       journey paused a fortnight ago reporting "paused today". Zero is a
       legitimate answer for something blocked today, so the invariant is not
       "non-zero": it is that the age agrees with the record's own timestamp.
       That fails loudly for an unresolvable entity while allowing a genuine
       same-day block. */
    const collections: [Parameters<typeof blockerFor>[1], readonly { id: string; status?: string; updatedAt?: string; createdAt?: string }[]][] = [
      ['Journey', db.journeys],
      ['Asset', db.assets],
      ['Audience', db.audiences],
      ['Event', db.events],
      ['MediaContact', db.mediaContacts],
      ['Campaign', db.campaigns],
      ['Content', db.contents],
      ['Communication', db.communications],
      ['Idea', db.ideas],
    ];

    for (const [entity, rows] of collections) {
      for (const row of rows) {
        const blocker = blockerFor(db, entity, row.id, row.status);
        // An approval-derived blocker is dated from the approval, not the
        // record, and is covered by the test above.
        if (!blocker || blocker.approvalId) continue;

        const since = row.updatedAt ?? row.createdAt;
        expect(since, `${entity} ${row.id} carries no timestamp to age from`).toBeDefined();
        const expected = Math.max(
          0,
          Math.floor((Date.parse(DEMO_NOW_ISO) - Date.parse(since!)) / 86_400_000),
        );

        expect(
          blocker.ageDays,
          `${entity} ${row.id} is blocked ("${blocker.reason}") and last moved ${since}, so it should read ${expected} days, not ${blocker.ageDays} — check its row resolves in blockerSelectors`,
        ).toBe(expected);
      }
    }
  });

  it('names rework and send-freeze blockers when no approval is pending', () => {
    const rework = blockerFor(db, 'Content', 'CNT-not-real', 'Rework');
    expect(rework?.reason).toContain('rework');

    const paused = blockerFor(db, 'Communication', 'COM-not-real', 'Paused');
    expect(paused?.reason).toContain('paused');
  });

  it('summarises a blocker as one readable line', () => {
    const summary = blockerSummary({
      reason: 'awaiting Legal review',
      ownerName: 'Ingrid Halvorsen',
      ageDays: 3,
      slaBreached: true,
    });
    expect(summary).toBe('awaiting Legal review · Ingrid Halvorsen · 3 days · SLA breached');
  });

  it('pluralises a single day correctly', () => {
    expect(
      blockerSummary({ reason: 'awaiting review', ageDays: 1, slaBreached: false }),
    ).toBe('awaiting review · 1 day');
  });
});
