/**
 * Campaign create / edit / lifecycle — the rules, not the widgets.
 *
 * The audit's finding was that `CampaignDetail.tsx` contained no mutation call
 * and that Live, Completed, Cancelled and Archived were unreachable even
 * though the seed ships campaigns in exactly those states
 * (docs/MARKET_READINESS_AUDIT_PASS2.md). Two things therefore have to be
 * true and stay true: every declared status must be reachable, and no
 * authoring path may write a record the rest of the app cannot explain — in
 * particular the "no campaign ends before it starts" invariant that
 * src/test/detail-facts.test.ts asserts across all four demo packs.
 *
 * Everything under test is pure and exported from the detail page, so this
 * suite runs the real rules rather than a restatement of them.
 */

import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_TRANSITIONS,
  CAMPAIGN_WRITE_ROLES,
  allowedTransitions,
  campaignApprovalRoute,
  campaignDraftFields,
  campaignTransitionPatch,
  canWriteCampaigns,
  draftFromCampaign,
  parseBudget,
  transitionBlockReason,
  validateCampaignDraft,
  type CampaignDraft,
} from '@/pages/CampaignDetail';
import { DEMO_NOW_ISO, TODAY } from '@/data/selectors/campaignSelectors';
import { getPackDB, getSeedDB } from '@/data/seed';
import { APP_ROLES, canSeeNav, type AppRole } from '@/lib/rbac';
import { scopeForAgencyUser } from '@/lib/agencyScope';
import type { CampaignStatus } from '@/data/types';

const PACKS = ['default', 'renewable', 'cloud', 'lifesciences'] as const;

const ALL_STATUSES: CampaignStatus[] = [
  'Draft',
  'Planned',
  'In Approval',
  'Approved',
  'Live',
  'Paused',
  'Completed',
  'Archived',
  'Cancelled',
];

/** A guard input with nothing blocking, so a test can isolate one rule. */
const unblocked = (over: Partial<Parameters<typeof transitionBlockReason>[2]> = {}) => ({
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  hasPendingApproval: false,
  ...over,
});

describe('transition map', () => {
  it('keys every declared CampaignStatus and targets only declared statuses', () => {
    expect(Object.keys(CAMPAIGN_TRANSITIONS).sort()).toEqual([...ALL_STATUSES].sort());
    for (const status of ALL_STATUSES) {
      for (const target of allowedTransitions(status)) {
        expect(ALL_STATUSES, `${status} → ${target}`).toContain(target);
        expect(target, `${status} → itself`).not.toBe(status);
      }
    }
  });

  it('makes every status the seed ships reachable from Draft', () => {
    /* Breadth-first over the map plus the ONE edge this page does not own:
       `useApprovalDecisions` writes In Approval → Approved when an approver
       decides, and → Planned when they reject. Modelling it explicitly is the
       point — the campaign page raises the approval (`campaignApprovalRoute`)
       and the inbox decides it, and only together do the two cover the whole
       status union. This is the audit finding, as an assertion. */
    const APPROVALS_INBOX_EDGES: Partial<Record<CampaignStatus, CampaignStatus[]>> = {
      'In Approval': ['Approved', 'Planned'],
    };
    const seen = new Set<CampaignStatus>(['Draft']);
    const queue: CampaignStatus[] = ['Draft'];
    while (queue.length > 0) {
      const current = queue.shift() as CampaignStatus;
      const next = [
        ...allowedTransitions(current),
        ...(APPROVALS_INBOX_EDGES[current] ?? []),
      ];
      for (const target of next) {
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    for (const status of ALL_STATUSES) {
      expect([...seen], `${status} unreachable from Draft`).toContain(status);
    }
    // The four the audit named explicitly.
    for (const status of ['Live', 'Completed', 'Cancelled', 'Archived'] as const) {
      expect(seen.has(status)).toBe(true);
    }
    // And every status a seeded campaign is actually in, in every pack.
    for (const pack of PACKS) {
      for (const c of getPackDB(pack).campaigns) {
        expect([...seen], `${pack}: ${c.id} is ${c.status}`).toContain(c.status);
      }
    }
  });

  it('treats Archived as terminal and routes closed campaigns only to it', () => {
    expect(allowedTransitions('Archived')).toEqual([]);
    expect(allowedTransitions('Completed')).toEqual(['Archived']);
    expect(allowedTransitions('Cancelled')).toEqual(['Archived']);
  });

  it('never lets a campaign self-approve — Approved comes from the approvals inbox', () => {
    expect(allowedTransitions('In Approval')).not.toContain('Approved');
    expect(
      transitionBlockReason('In Approval', 'Approved', unblocked()),
      'approving from the record must be refused',
    ).toMatch(/not a legal transition/);
  });
});

describe('transition guards', () => {
  it('refuses any pair the map does not contain', () => {
    for (const from of ALL_STATUSES) {
      const legal = new Set(allowedTransitions(from));
      for (const to of ALL_STATUSES) {
        if (legal.has(to)) continue;
        expect(transitionBlockReason(from, to, unblocked()), `${from} → ${to}`).not.toBeNull();
      }
    }
  });

  it('holds In Approval still while an approval is open', () => {
    expect(
      transitionBlockReason('In Approval', 'Planned', unblocked({ hasPendingApproval: true })),
    ).toMatch(/approval is still open/);
    expect(
      transitionBlockReason('In Approval', 'Cancelled', unblocked({ hasPendingApproval: true })),
    ).toMatch(/approval is still open/);
    // Decided or withdrawn, the same moves are available.
    expect(transitionBlockReason('In Approval', 'Planned', unblocked())).toBeNull();
  });

  it('will not put a campaign Live before its window opens', () => {
    expect(
      transitionBlockReason('Approved', 'Live', unblocked({ startDate: '2099-01-01' })),
    ).toMatch(/starts on 2099-01-01/);
    expect(
      transitionBlockReason('Approved', 'Live', unblocked({ startDate: TODAY })),
    ).toBeNull();
  });

  it('will not complete a campaign that never started', () => {
    expect(
      transitionBlockReason('Live', 'Completed', unblocked({ startDate: '2099-01-01' })),
    ).toMatch(/has not started/);
    expect(transitionBlockReason('Live', 'Completed', unblocked())).toBeNull();
    expect(transitionBlockReason('Paused', 'Completed', unblocked())).toBeNull();
  });
});

describe('submitting for approval', () => {
  it('refuses the move when no approval can be routed', () => {
    expect(
      transitionBlockReason(
        'Planned',
        'In Approval',
        unblocked({ approvalRouteAvailable: false }),
      ),
    ).toMatch(/no approver is configured/);
    expect(
      transitionBlockReason('Planned', 'In Approval', unblocked({ approvalRouteAvailable: true })),
    ).toBeNull();
  });

  it.each(PACKS)('routes to a stage approver who is not the owner [%s]', (pack) => {
    // Segregation of duties: useApprovalDecisions refuses a decision by the
    // subject's owner, so an approval routed to them could never be decided.
    const db = getPackDB(pack);
    for (const c of db.campaigns) {
      const route = campaignApprovalRoute(db, c);
      expect(route, `${pack}: ${c.id} has no approval route`).not.toBeNull();
      expect(route!.approver.id, `${pack}: ${c.id} routed to its own owner`).not.toBe(
        c.ownerStakeholderId,
      );
      expect(route!.stage.workflowId).toBe(c.workflowId);
      expect(route!.approver.role).toBe(route!.stage.assigneeRole);
    }
  });
});

describe('transition patch', () => {
  it('stamps the pinned demo clock, never the wall clock', () => {
    const patch = campaignTransitionPatch(
      { startDate: '2026-01-01', endDate: '2026-12-31' },
      'Paused',
    );
    expect(patch).toEqual({ status: 'Paused', updatedAt: DEMO_NOW_ISO });
  });

  it('closes an unfinished window when a campaign completes early', () => {
    const patch = campaignTransitionPatch(
      { startDate: '2026-01-01', endDate: '2026-12-31' },
      'Completed',
    );
    expect(patch.endDate).toBe(TODAY);
  });

  it('leaves an already-finished window alone', () => {
    const patch = campaignTransitionPatch(
      { startDate: '2026-01-01', endDate: '2026-06-30' },
      'Completed',
    );
    expect(patch.endDate).toBeUndefined();
  });

  it.each(PACKS)(
    'never writes a campaign that ends before it starts [%s]',
    (pack) => {
      // The invariant detail-facts.test.ts asserts, checked against every
      // legal, unblocked transition of every seeded campaign in the pack.
      const db = getPackDB(pack);
      for (const c of db.campaigns) {
        for (const to of allowedTransitions(c.status)) {
          const blocked = transitionBlockReason(c.status, to, {
            startDate: c.startDate,
            endDate: c.endDate,
            hasPendingApproval: false,
          });
          if (blocked !== null) continue;
          const next = { ...c, ...campaignTransitionPatch(c, to) };
          expect(
            Date.parse(next.endDate) >= Date.parse(next.startDate),
            `${pack}: ${c.id} ${c.status} → ${to} ends before it starts`,
          ).toBe(true);
        }
      }
    },
  );
});

describe('draft validation', () => {
  const db = getSeedDB();
  const valid = (): CampaignDraft => ({
    name: 'Test campaign',
    campaignType: 'product-launch',
    classification: 'Internal',
    brandId: db.brands[0].id,
    businessUnitId: db.businessUnits[0].id,
    regionIds: [db.regions[0].id],
    ownerStakeholderId: db.stakeholders[0].id,
    budget: '250000',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    kpiIds: [],
  });

  it('accepts a complete draft', () => {
    expect(validateCampaignDraft(valid())).toEqual([]);
  });

  it('requires the fields the detail page renders as facts', () => {
    expect(validateCampaignDraft({ ...valid(), name: '   ' })).toContain('Name is required.');
    expect(validateCampaignDraft({ ...valid(), brandId: '' })).toContain('Brand is required.');
    expect(validateCampaignDraft({ ...valid(), businessUnitId: '' })).toContain(
      'Business unit is required.',
    );
    expect(validateCampaignDraft({ ...valid(), regionIds: [] })).toContain(
      'At least one region is required.',
    );
    expect(validateCampaignDraft({ ...valid(), ownerStakeholderId: '' })).toContain(
      'Owner is required.',
    );
  });

  it('rejects an end date before the start date', () => {
    const errors = validateCampaignDraft({
      ...valid(),
      startDate: '2026-11-30',
      endDate: '2026-09-01',
    });
    expect(errors).toContain('End date cannot be before the start date.');
    // Equal dates are a one-day campaign, not an error.
    expect(
      validateCampaignDraft({ ...valid(), startDate: '2026-09-01', endDate: '2026-09-01' }),
    ).toEqual([]);
  });

  it('rejects dates that are not dates', () => {
    expect(validateCampaignDraft({ ...valid(), startDate: 'soon' })).toContain(
      'Start date must be a date (yyyy-mm-dd).',
    );
    expect(validateCampaignDraft({ ...valid(), endDate: '' })).toContain(
      'End date must be a date (yyyy-mm-dd).',
    );
  });

  it('rejects a budget that is not a usable amount', () => {
    for (const budget of ['', '   ', 'lots', '-1']) {
      expect(
        validateCampaignDraft({ ...valid(), budget }),
        `budget '${budget}'`,
      ).toContain('Budget must be a number of 0 or more.');
    }
    expect(validateCampaignDraft({ ...valid(), budget: '0' })).toEqual([]);
    expect(parseBudget('1200.6')).toBe(1201);
  });

  it('carries a valid draft into the persisted field shape', () => {
    const fields = campaignDraftFields({ ...valid(), name: '  Spaced  ', budget: ' 500 ' });
    expect(fields.name).toBe('Spaced');
    expect(fields.budgetAllocation).toBe(500);
    expect(fields.kpiIds).toEqual([]);
  });
});

describe('editing a seeded campaign', () => {
  it.each(PACKS)('is a no-op round trip when nothing is changed [%s]', (pack) => {
    // An edit dialog opened and saved without a change must not alter the
    // record — otherwise every derived surface (spend, attainment, stage)
    // moves for a user who touched nothing.
    const db = getPackDB(pack);
    for (const c of db.campaigns) {
      const draft = draftFromCampaign(c);
      expect(validateCampaignDraft(draft), `${pack}: ${c.id} seeded invalid`).toEqual([]);
      expect(campaignDraftFields(draft), `${pack}: ${c.id}`).toEqual({
        name: c.name,
        campaignType: c.campaignType,
        classification: c.classification,
        brandId: c.brandId,
        businessUnitId: c.businessUnitId,
        regionIds: c.regionIds,
        budgetAllocation: c.budgetAllocation,
        ownerStakeholderId: c.ownerStakeholderId,
        startDate: c.startDate,
        endDate: c.endDate,
        kpiIds: c.kpiIds,
      });
    }
  });

  it('keeps the foreign keys the facts grid resolves', () => {
    // The same checks detail-facts.test.ts runs over the seed, applied to what
    // an edit would write: the dialogs only offer live ids, so a saved draft
    // must still resolve.
    const db = getSeedDB();
    const fields = campaignDraftFields(draftFromCampaign(db.campaigns[0]));
    expect(db.brands.some((b) => b.id === fields.brandId)).toBe(true);
    expect(db.businessUnits.some((b) => b.id === fields.businessUnitId)).toBe(true);
    expect(db.stakeholders.some((s) => s.id === fields.ownerStakeholderId)).toBe(true);
    for (const rid of fields.regionIds) {
      expect(db.regions.some((r) => r.id === rid)).toBe(true);
    }
  });
});

describe('who may author campaigns', () => {
  it('allows exactly the declared write roles when unscoped', () => {
    for (const role of APP_ROLES) {
      const expected = CAMPAIGN_WRITE_ROLES.includes(role);
      expect(canWriteCampaigns(role, null), role).toBe(expected);
    }
  });

  it('never lets an agency-scoped session write, whatever the role', () => {
    const db = getSeedDB();
    const agencyStakeholder = db.stakeholders.find((s) => s.role === 'Agency User');
    expect(agencyStakeholder, 'seed must ship an Agency User').toBeDefined();
    const scope = scopeForAgencyUser(db, agencyStakeholder!);
    // Even a CMO handed an agency scope is read-only: the scope means the
    // session is looking at someone else's assigned work.
    for (const role of APP_ROLES) {
      expect(canWriteCampaigns(role, scope), role).toBe(false);
    }
    expect(canWriteCampaigns('Agency User', null)).toBe(false);
  });

  it('only names roles that can open the campaigns section', () => {
    for (const role of CAMPAIGN_WRITE_ROLES as readonly AppRole[]) {
      expect(canSeeNav(role, 'campaigns'), role).toBe(true);
    }
  });
});
