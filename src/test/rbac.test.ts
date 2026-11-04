/**
 * RBAC test suite — role→nav visibility and demo-identity integrity.
 *
 * NAV_RESTRICTIONS is module-private in src/lib/rbac.ts, so the expected
 * restriction table is mirrored here; if the source table changes, these
 * tests flag the drift.
 */

import { describe, it, expect } from 'vitest';
import {
  APP_ROLES,
  NAV_KEYS,
  canSeeNav,
  visibleNavKeys,
  DEMO_USERS,
  type AppRole,
  type NavKey,
} from '@/lib/rbac';
import { getSeedDB } from '@/data/seed';

// Whichever pack is active: DEMO_USERS must agree with that pack's roster.
const seedStakeholders = getSeedDB().stakeholders;

/** Mirror of the private NAV_RESTRICTIONS table in src/lib/rbac.ts. */
const EXPECTED_RESTRICTIONS: Partial<Record<NavKey, readonly AppRole[]>> = {
  internal: ['Internal Comms Manager', 'Corporate Comms Manager', 'CMO', 'Executive', 'Platform Admin'],
  journeys: ['Campaign Manager', 'Internal Comms Manager', 'PR Manager', 'Platform Admin'],
  audiences: ['CMO', 'Campaign Manager', 'Internal Comms Manager', 'Legal/Compliance Reviewer', 'Platform Admin'],
  budget: ['CMO', 'Campaign Manager', 'Executive', 'Platform Admin'],
  pr: ['PR Manager', 'Corporate Comms Manager', 'CMO', 'Platform Admin'],
  agencies: ['CMO', 'Campaign Manager', 'Platform Admin'],
  rulebook: [
    'Brand Manager',
    'Legal/Compliance Reviewer',
    'Corporate Comms Manager',
    'CMO',
    'Content Manager',
    'Platform Admin',
  ],
  governance: ['Legal/Compliance Reviewer', 'Corporate Comms Manager', 'CMO', 'Platform Admin'],
  reports: ['CMO', 'Executive', 'Corporate Comms Manager', 'Platform Admin'],
  admin: ['Platform Admin'],
  // Agency users are hard-scoped to assigned records — no KPI, market
  // intelligence, or graph-wide access.
  performance: APP_ROLES.filter((r) => r !== 'Agency User'),
  market: APP_ROLES.filter((r) => r !== 'Agency User'),
  graph: APP_ROLES.filter((r) => r !== 'Agency User'),
};

describe('nav visibility', () => {
  it('every role sees the dashboard', () => {
    for (const role of APP_ROLES) {
      expect(canSeeNav(role, 'dashboard'), `${role} should see dashboard`).toBe(true);
      expect(visibleNavKeys(role)).toContain('dashboard');
    }
  });

  it("'admin' is visible only to Platform Admin", () => {
    for (const role of APP_ROLES) {
      expect(canSeeNav(role, 'admin'), `admin visibility for ${role}`).toBe(
        role === 'Platform Admin',
      );
    }
  });

  it('each restricted nav key is visible to exactly its listed roles', () => {
    for (const [navKey, allowed] of Object.entries(EXPECTED_RESTRICTIONS) as [
      NavKey,
      readonly AppRole[],
    ][]) {
      for (const role of allowed) {
        expect(canSeeNav(role, navKey), `${role} should see ${navKey}`).toBe(true);
      }
      const unlisted = APP_ROLES.filter((r) => !allowed.includes(r));
      expect(unlisted.length, `${navKey} restriction should exclude someone`).toBeGreaterThan(0);
      for (const role of unlisted) {
        expect(canSeeNav(role, navKey), `${role} should NOT see ${navKey}`).toBe(false);
      }
    }
  });

  it('unrestricted nav keys are visible to every role', () => {
    const restricted = new Set(Object.keys(EXPECTED_RESTRICTIONS));
    for (const key of NAV_KEYS.filter((k) => !restricted.has(k))) {
      for (const role of APP_ROLES) {
        expect(canSeeNav(role, key), `${role} should see unrestricted ${key}`).toBe(true);
      }
    }
  });

  it('visibleNavKeys preserves NAV_KEYS order for every role', () => {
    for (const role of APP_ROLES) {
      const visible = visibleNavKeys(role);
      const indices = visible.map((k) => NAV_KEYS.indexOf(k));
      expect(indices, `${role} nav order`).toEqual([...indices].sort((a, b) => a - b));
      // No duplicates and no unknown keys.
      expect(new Set(visible).size).toBe(visible.length);
      expect(indices.every((i) => i >= 0)).toBe(true);
    }
  });
});

describe('demo identities', () => {
  it('has 11 roles', () => {
    expect(APP_ROLES).toHaveLength(11);
  });

  it('DEMO_USERS has a non-empty name and initials for all 11 roles', () => {
    for (const role of APP_ROLES) {
      const user = DEMO_USERS[role];
      expect(user, `DEMO_USERS[${role}]`).toBeDefined();
      expect(user.name.trim().length, `${role} name`).toBeGreaterThan(0);
      expect(user.initials.trim().length, `${role} initials`).toBeGreaterThan(0);
      expect(user.title).toBe(role);
    }
  });

  /**
   * Every role must be represented, but a pack may seat more than one person
   * in a role — the life-sciences pack seats three Legal/Compliance Reviewers
   * because its MLR chain needs Medical, Legal and Regulatory to be genuinely
   * independent, and `AppRole` has no member for the first and third.
   *
   * KNOWN LIMITATION this pins rather than hides: `DEMO_USERS` resolves a role
   * to ONE identity, so when a pack seats several people in a role, approvals
   * routed to the others do not appear in the signed-in person's queue. Real
   * approval routing needs pools and delegation rather than role→first-match.
   */
  it('every AppRole maps to at least one seed stakeholder', () => {
    for (const role of APP_ROLES) {
      const matches = seedStakeholders.filter((s) => s.role === role);
      expect(
        matches.length,
        `no stakeholder holds the role ${role} in the active pack`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('resolves a role to one identity deterministically', () => {
    // Same input, same identity — otherwise the signed-in name could differ
    // between renders on a pack that seats several people in one role.
    for (const role of APP_ROLES) {
      const first = seedStakeholders.find((s) => s.role === role);
      const again = seedStakeholders.find((s) => s.role === role);
      expect(first?.id).toBe(again?.id);
      expect(DEMO_USERS[role].name).toBe(first?.name);
    }
  });

  it('demo identities agree with the seed stakeholder join', () => {
    for (const role of APP_ROLES) {
      const stakeholder = seedStakeholders.find((s) => s.role === role)!;
      expect(DEMO_USERS[role].name).toBe(stakeholder.name);
    }
  });
});
