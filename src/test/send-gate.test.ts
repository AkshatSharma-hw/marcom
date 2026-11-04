/**
 * The pre-send gate: the three checks it always had, plus the three it claimed
 * to have and did not — consent, suppression, and a frequency cap counted over
 * a real send ledger.
 *
 * These tests are written against the shipped seed rather than hand-built
 * fixtures wherever the seed can carry the case, because the defect being
 * guarded against was never "the function computes wrongly in the abstract" —
 * it was "the function never looked at these collections at all". A fixture
 * proves the arithmetic; the seed proves the wiring.
 */

import { describe, expect, it } from 'vitest';
import { getSeedDB } from '@/data/seed';
import { DEMO_NOW_ISO, DEMO_NOW_MS } from '@/data/selectors/campaignSelectors';
import {
  CONSENT_GOVERNED_KINDS,
  FREQUENCY_CAP_PER_WINDOW,
  FREQUENCY_WINDOW_DAYS,
  MIN_CONSENT_PCT,
  consentPosture,
  evaluateSendGate,
  ledgerEntryForPush,
  mergeSendLedger,
  openingSendLedger,
  sendLedgerId,
  sendsInWindow,
  suppressionMatches,
  type SendLedgerEntry,
} from '@/data/selectors/sendGate';
import type { ChannelExecution, ChannelKind, Communication, SeedDB } from '@/data/types';

const db: SeedDB = getSeedDB();

interface Pair {
  execution: ChannelExecution;
  communication: Communication;
  kind: ChannelKind;
}

/** Every execution that resolves to both a communication and a channel. */
const pairs: Pair[] = db.channelExecutions.flatMap((execution) => {
  const communication = db.communications.find((c) => c.id === execution.communicationId);
  const channel = db.channels.find((c) => c.id === execution.channelId);
  if (!communication || !channel) return [];
  return [{ execution, communication, kind: channel.channelKind }];
});

const gate = (p: Pair, ledger: readonly SendLedgerEntry[] = []) =>
  evaluateSendGate(db, p.execution, p.communication, ledger);

describe('send gate — the three original checks still hold', () => {
  it('blocks a paused communication as a send freeze', () => {
    const paused = pairs.find((p) => p.communication.status === 'Paused');
    expect(paused, 'seed should contain a paused communication').toBeDefined();
    const decision = gate(paused!);
    expect(decision.allowed).toBe(false);
    expect(decision.blockers.some((b) => b.includes('paused'))).toBe(true);
    expect(decision.findings.some((f) => f.rule === 'send-freeze')).toBe(true);
  });

  it('blocks a communication returned to rework', () => {
    const rework = pairs.find((p) => p.communication.status === 'Rework');
    expect(rework, 'seed should contain a communication in rework').toBeDefined();
    const decision = gate(rework!);
    expect(decision.findings.some((f) => f.rule === 'rework')).toBe(true);
    expect(decision.allowed).toBe(false);
  });

  it('names the approver behind an undecided approval', () => {
    const pending = db.approvals.find(
      (a) =>
        a.subjectEntity === 'Communication' &&
        ['Requested', 'In Review', 'Changes Requested', 'Escalated'].includes(a.status),
    );
    expect(pending, 'seed should contain a pending approval on a communication').toBeDefined();
    const p = pairs.find((x) => x.communication.id === pending!.subjectId);
    expect(p, 'the approval subject should have an execution').toBeDefined();

    const decision = gate(p!);
    const finding = decision.findings.find((f) => f.rule === 'approval');
    expect(finding).toBeDefined();
    expect(finding!.reason).toContain(pending!.id);
    const approver = db.stakeholders.find((s) => s.id === pending!.approverStakeholderId);
    if (approver) expect(finding!.reason).toContain(approver.name);
  });

  it('does not block a clear execution on any of the three original grounds', () => {
    const clear = pairs.filter((p) => {
      const d = gate(p);
      return !d.findings.some(
        (f) => f.rule === 'send-freeze' || f.rule === 'rework' || f.rule === 'approval',
      );
    });
    expect(clear.length, 'not every execution can be frozen, reworked or pending').toBeGreaterThan(0);
  });
});

describe('send gate — consent', () => {
  it('reads ConsentSummary and puts the actual percentage in the reason', () => {
    /* The whole point of the change: a segment recorded below the floor must
       stop the send AND say what the recorded figure was, so the reader can go
       and check the ConsentSummary row rather than take the gate's word. */
    const failing = pairs.find((p) => {
      const posture = consentPosture(db, p.communication.audienceId, p.kind);
      return (
        posture.length > 0 &&
        posture.every((s) => !s.addressable) &&
        posture.some((s) => s.summary !== null)
      );
    });
    expect(
      failing,
      'seed should contain an audience whose only consent record is below the floor',
    ).toBeDefined();

    const decision = gate(failing!);
    const finding = decision.findings.find((f) => f.rule === 'consent');
    expect(finding).toBeDefined();
    expect(finding!.effect).toBe('block');

    const posture = consentPosture(db, failing!.communication.audienceId, failing!.kind);
    for (const s of posture) {
      if (!s.summary) continue;
      expect(s.summary.optedInPct).toBeLessThan(MIN_CONSENT_PCT);
      expect(finding!.reason).toContain(`${s.summary.optedInPct}%`);
      expect(finding!.reason).toContain(s.segmentId);
    }
    expect(finding!.reason).toContain(`${MIN_CONSENT_PCT}%`);
    expect(decision.allowed).toBe(false);
  });

  it('treats a missing record on an addressed channel as no consent, not as consent', () => {
    const missing = pairs.find((p) => {
      if (!CONSENT_GOVERNED_KINDS.has(p.kind)) return false;
      const posture = consentPosture(db, p.communication.audienceId, p.kind);
      return posture.length > 0 && posture.every((s) => s.summary === null);
    });
    expect(
      missing,
      'seed should contain an addressed send to an audience with no consent record',
    ).toBeDefined();

    const decision = gate(missing!);
    const finding = decision.findings.find((f) => f.rule === 'consent');
    expect(finding?.effect).toBe('block');
    expect(finding!.reason).toContain('absence of consent is not consent');
    expect(decision.recipients).toBe(0);
  });

  it('holds back only the failing segments when the audience still has a consented one', () => {
    const mixed = pairs.find((p) => {
      const posture = consentPosture(db, p.communication.audienceId, p.kind);
      return posture.some((s) => s.addressable) && posture.some((s) => !s.addressable);
    });
    if (!mixed) return; // seed-dependent; the block/pass cases above carry the rule
    const decision = gate(mixed);
    const finding = decision.findings.find((f) => f.rule === 'consent');
    expect(finding?.effect).toBe('reduce');
    // A reduction is not a block — the send still goes, to fewer people.
    expect(decision.blockers.some((b) => b.includes('may be addressed'))).toBe(false);
  });

  it('does not demand an individual opt-in on a published surface', () => {
    /* Publishing a page or issuing a release reaches people who came to the
       surface. Blocking those for a missing per-person consent record would be
       enforcement theatre, and would stop most of the pipeline. */
    for (const p of pairs) {
      if (CONSENT_GOVERNED_KINDS.has(p.kind)) continue;
      const posture = consentPosture(db, p.communication.audienceId, p.kind);
      for (const s of posture) {
        if (s.summary === null) {
          expect(s.addressable, `${s.segmentId} on ${p.kind}`).toBe(true);
          expect(s.reach).toBe(s.population);
        }
      }
    }
  });

  it('still enforces the floor on a published surface that does record consent', () => {
    for (const summary of db.consentSummaries) {
      if (CONSENT_GOVERNED_KINDS.has(summary.channelKind)) continue;
      const audience = db.audiences.find((a) => a.segmentIds.includes(summary.segmentId));
      if (!audience) continue;
      const seg = consentPosture(db, audience.id, summary.channelKind).find(
        (s) => s.segmentId === summary.segmentId,
      );
      expect(seg).toBeDefined();
      expect(seg!.addressable).toBe(summary.optedInPct >= MIN_CONSENT_PCT);
    }
  });
});

describe('send gate — suppression', () => {
  it('applies org-wide entries as well as scoped ones, and nothing else', () => {
    for (const audience of db.audiences) {
      for (const kind of ['email', 'SMS', 'social', 'intranet'] as ChannelKind[]) {
        for (const entry of suppressionMatches(db, audience.id, kind)) {
          expect(!entry.audienceId || entry.audienceId === audience.id).toBe(true);
          expect(!entry.channelKind || entry.channelKind === kind).toBe(true);
        }
      }
    }
  });

  it('picks up the org-wide rows for an audience that has none of its own', () => {
    const orgWide = db.suppressionEntries.filter((e) => !e.audienceId && !e.channelKind);
    expect(orgWide.length, 'seed should carry org-wide suppression entries').toBeGreaterThan(0);
    for (const audience of db.audiences) {
      const matches = suppressionMatches(db, audience.id, 'email');
      for (const e of orgWide) expect(matches.map((m) => m.id)).toContain(e.id);
    }
  });

  it('removes each suppressed profile once from the audience, not once per segment', () => {
    /* The segment handoff manifest computes one suppression scalar and then
       subtracts it from every segment row, so eight suppressed profiles across
       four segments read as thirty-two removals. The gate must not repeat it:
       a suppressed profile is one profile, sitting in exactly one place. */
    const multi = pairs.find((p) => {
      const posture = consentPosture(db, p.communication.audienceId, p.kind);
      return (
        posture.filter((s) => s.addressable).length > 1 &&
        suppressionMatches(db, p.communication.audienceId, p.kind).length > 0
      );
    });
    expect(multi, 'seed should contain a multi-segment audience with suppression').toBeDefined();

    const decision = gate(multi!);
    const consentedReach = decision.consent
      .filter((s) => s.addressable)
      .reduce((sum, s) => sum + s.reach, 0);
    const segments = decision.consent.filter((s) => s.addressable).length;
    const removed = consentedReach - decision.recipients;

    expect(removed).toBe(decision.suppression.length);
    expect(removed, 'per-segment subtraction would multiply the removals').toBeLessThan(
      decision.suppression.length * segments,
    );
  });

  it('names the reason codes and the org-wide share in the finding', () => {
    const withSuppression = pairs.find(
      (p) => suppressionMatches(db, p.communication.audienceId, p.kind).length > 0,
    );
    expect(withSuppression).toBeDefined();
    const finding = gate(withSuppression!).findings.find((f) => f.rule === 'suppression');
    expect(finding).toBeDefined();
    const reasons = new Set(
      suppressionMatches(db, withSuppression!.communication.audienceId, withSuppression!.kind).map(
        (e) => e.reason,
      ),
    );
    for (const r of reasons) expect(finding!.reason).toContain(r);
  });

  it('never reports a negative recipient count', () => {
    for (const p of pairs) expect(gate(p).recipients).toBeGreaterThanOrEqual(0);
  });
});

describe('send ledger and frequency capping', () => {
  it('opens the ledger from delivery history, counting only what actually landed', () => {
    const ledger = openingSendLedger(db);
    expect(ledger.length).toBeGreaterThan(0);
    const sent = db.channelExecutions.filter((e) => e.status === 'sent');
    expect(ledger.length).toBeLessThanOrEqual(sent.length);
    for (const line of ledger) {
      const execution = db.channelExecutions.find((e) => e.id === line.executionId);
      expect(execution?.status, 'a failed or in-flight send is not a contact').toBe('sent');
      const communication = db.communications.find((c) => c.id === line.communicationId);
      expect(line.audienceId).toBe(communication!.audienceId);
      const channel = db.channels.find((c) => c.id === line.channelId);
      expect(line.channelKind).toBe(channel!.channelKind);
    }
  });

  it('counts a window that closes on the pinned demo clock, not on wall time', () => {
    const ledger = openingSendLedger(db);
    for (const line of sendsInWindow(ledger, db.audiences[0].id, 'email')) {
      const t = Date.parse(line.pushedAt);
      expect(t).toBeLessThanOrEqual(DEMO_NOW_MS);
      expect(t).toBeGreaterThan(DEMO_NOW_MS - FREQUENCY_WINDOW_DAYS * 86_400_000);
    }
    // Everything ever recorded sits inside a window wide enough to hold it, so
    // the filter is a window and not an accidental "recent N".
    const wide = sendsInWindow(ledger, db.audiences[0].id, 'email', { windowDays: 3650 });
    const narrow = sendsInWindow(ledger, db.audiences[0].id, 'email');
    expect(wide.length).toBeGreaterThanOrEqual(narrow.length);
  });

  it('blocks once the cap is reached, and says by how much', () => {
    const ledger = openingSendLedger(db);
    const capped = pairs.find(
      (p) =>
        sendsInWindow(ledger, p.communication.audienceId, p.kind).filter(
          (e) => e.executionId !== p.execution.id,
        ).length >= FREQUENCY_CAP_PER_WINDOW,
    );
    expect(
      capped,
      `delivery history should put at least one audience/channel at the cap of ${FREQUENCY_CAP_PER_WINDOW}`,
    ).toBeDefined();

    const decision = gate(capped!, ledger);
    const finding = decision.findings.find((f) => f.rule === 'frequency-cap');
    expect(finding?.effect).toBe('block');
    expect(finding!.reason).toContain(capped!.communication.audienceId);
    expect(finding!.reason).toContain(String(FREQUENCY_CAP_PER_WINDOW));
    expect(finding!.reason).toContain(String(FREQUENCY_WINDOW_DAYS));
    expect(decision.allowed).toBe(false);
  });

  it('does not fire below the cap, and an empty ledger caps nothing', () => {
    for (const p of pairs) {
      expect(gate(p).findings.some((f) => f.rule === 'frequency-cap')).toBe(false);
    }
  });

  it('never lets an execution cap itself', () => {
    const ledger = openingSendLedger(db);
    for (const p of pairs) {
      const decision = gate(p, ledger);
      expect(decision.recentSends.every((e) => e.executionId !== p.execution.id)).toBe(true);
    }
  });

  it('stamps a push with the demo clock and collapses onto its history line', () => {
    const p = pairs[0];
    const entry = ledgerEntryForPush(db, p.execution, p.communication, 1234, 'Ada Lovelace');
    expect(entry).not.toBeNull();
    expect(entry!.pushedAt).toBe(DEMO_NOW_ISO);
    expect(entry!.id).toBe(sendLedgerId(p.execution.id));
    expect(entry!.recipients).toBe(1234);
    expect(entry!.source).toBe('push');

    const merged = mergeSendLedger(openingSendLedger(db), [entry!]);
    expect(merged.filter((e) => e.executionId === p.execution.id)).toHaveLength(1);
    expect(merged.find((e) => e.id === entry!.id)?.source).toBe('push');
  });

  it('makes the cap bite once enough pushes are recorded', () => {
    const p = pairs.find((x) => x.communication.status !== 'Paused');
    expect(p).toBeDefined();
    const synthetic: SendLedgerEntry[] = Array.from(
      { length: FREQUENCY_CAP_PER_WINDOW },
      (_, i) => ({
        id: `SLG-TEST-${i}`,
        executionId: `CHX-TEST-${i}`,
        communicationId: p!.communication.id,
        audienceId: p!.communication.audienceId,
        channelId: p!.execution.channelId,
        channelKind: p!.kind,
        pushedAt: DEMO_NOW_ISO,
        recipients: 10,
        actorName: 'Test Actor',
        source: 'push',
      }),
    );
    const decision = gate(p!, synthetic);
    expect(decision.findings.some((f) => f.rule === 'frequency-cap')).toBe(true);
    expect(decision.allowed).toBe(false);
  });
});

describe('send gate — determinism', () => {
  it('returns the same verdict twice for every execution', () => {
    const ledger = openingSendLedger(db);
    for (const p of pairs) {
      expect(JSON.stringify(gate(p, ledger))).toBe(JSON.stringify(gate(p, ledger)));
    }
  });

  it('leaves at least one execution pushable — the gate is a gate, not a wall', () => {
    const ledger = openingSendLedger(db);
    const pushable = pairs.filter((p) => p.execution.status === 'draft' && gate(p, ledger).allowed);
    expect(pushable.length).toBeGreaterThan(0);
  });
});
