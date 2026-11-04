/**
 * FR-CO-08 · The pre-send gate — pure functions over the frozen SeedDB.
 *
 * This module exists because the gate used to live inside the delivery table on
 * the journeys & channels page, where it could only ever be as good as one
 * render pass and could not be tested at all. It checked three things — a
 * paused communication, a rework status, an undecided approval — while consent
 * and suppression sat in the graph, recorded and unread, and no frequency cap
 * or send ledger existed anywhere in the app. The page said otherwise, which
 * was the worse half of the problem.
 *
 * Everything here is a pure function of (db, …). Nothing is stored except the
 * send ledger, which is deliberately a record of *what was pushed* rather than
 * a derived number: a cap you cannot audit is not a cap.
 *
 * Two vocabulary decisions run through the whole file:
 *
 * - A finding is `block` or `reduce`. Blocking stops the push. Reducing lets it
 *   go with a smaller recipient set and says by how much and why. Suppression
 *   and partial consent are genuinely reductions — collapsing them into "you
 *   may not send" would be as inaccurate as ignoring them, in the other
 *   direction.
 * - Every reason string carries the record id and the actual number it was
 *   derived from. A blocker that says "consent too low" is a rumour; one that
 *   says "SEG-007 is 66% opted in on email, below the 70% floor" is a fact
 *   somebody can go and check.
 */

import type {
  ApprovalStatus,
  ChannelExecution,
  ChannelKind,
  Communication,
  ConsentSummary,
  SeedDB,
  SuppressionEntry,
} from '../types';
import { DEMO_NOW_ISO, DEMO_NOW_MS } from './campaignSelectors';
import { segmentSize } from './graphSelectors';
import { DEFAULT_LOCALE } from '@/lib/i18n';

/* ------------------------------------------------------------------ */
/* Stated policy constants                                             */
/* ------------------------------------------------------------------ */

/**
 * The consent floor, as a percentage of a segment's population with an active
 * opt-in on the channel kind in question.
 *
 * This is a stated demo policy, not a derived number: `Policy` rows in the seed
 * carry `ruleText` and an enforcement mode but no thresholds, so there is
 * nothing in the graph to read it from. A real deployment would source it from
 * the consent platform per jurisdiction. It is named and exported precisely so
 * that the page can print the figure it is enforcing rather than implying a
 * threshold exists somewhere the reader cannot see.
 */
export const MIN_CONSENT_PCT = 70;

/**
 * Channel kinds where a send is addressed to an identified individual, and a
 * missing consent record therefore blocks rather than passes.
 *
 * The distinction is not decorative. Publishing a page, issuing a press release
 * or posting to the intranet reaches people who came to the surface; there is
 * no per-recipient permission to look up, and demanding one would block most of
 * the pipeline for a permission that was never applicable. Putting a message in
 * someone's inbox, on their handset or in their ad feed is the opposite case,
 * and there the absence of a ConsentSummary is treated exactly like a failing
 * one — absence of consent is never read as consent.
 *
 * Where a ConsentSummary *does* exist for a published surface, it is still
 * enforced against the floor. Somebody recorded consent for that segment on
 * that channel; ignoring the record would be the same defect this module was
 * written to fix, one channel kind over.
 */
export const CONSENT_GOVERNED_KINDS: ReadonlySet<ChannelKind> = new Set<ChannelKind>([
  'email',
  'SMS',
  'ads',
]);

/** Marketing touches one audience may receive on one channel kind per window. */
export const FREQUENCY_CAP_PER_WINDOW = 3;

/** Length of the rolling counting window the cap is evaluated over, in days. */
export const FREQUENCY_WINDOW_DAYS = 30;

/** Approval states that still hold a send — anything not yet decided. */
export const PENDING_APPROVAL: ReadonlySet<ApprovalStatus> = new Set<ApprovalStatus>([
  'Requested',
  'In Review',
  'Changes Requested',
  'Escalated',
]);

/* ------------------------------------------------------------------ */
/* Send ledger                                                         */
/* ------------------------------------------------------------------ */

/**
 * Collection id the ledger persists under, in the same client-side store every
 * other mutable collection in the app uses (`useCollection` → localStorage).
 * Exported so the page and the tests cannot drift apart on the string.
 */
export const SEND_LEDGER_COLLECTION = 'sendLedger';

/**
 * One line in the send ledger: a push that actually happened.
 *
 * The cap is counted over these rows rather than over ChannelExecution
 * statuses, because a status is a *current* state — recalling a draft flips it
 * back and the send would vanish from history, which is the one thing a
 * frequency cap must not allow. A ledger line is append-only and keeps the
 * audience, the channel kind and the recipient count as they were at push
 * time, so re-scoping an audience later cannot retroactively change how many
 * times it was contacted.
 */
export interface SendLedgerEntry {
  id: string;
  executionId: string;
  communicationId: string;
  audienceId: string;
  channelId: string;
  channelKind: ChannelKind;
  /** ISO 8601 instant the push was recorded, on the demo clock. */
  pushedAt: string;
  /** Addressable recipients the gate let through at push time. */
  recipients: number;
  /** Who authorised it; the gate never pushes on nobody's behalf. */
  actorName: string;
  /** How the line got here — derived from delivery history, or pushed here. */
  source: 'history' | 'push';
}

/**
 * Deterministic ledger id for an execution.
 *
 * Derived rather than sequential so that a line reconstructed from delivery
 * history and a line written by a push of the same execution collapse to one
 * row in `mergeSendLedger`. Counting the same contact twice would make the cap
 * bite early and for no reason a user could see.
 */
export function sendLedgerId(executionId: string): string {
  return `SLG-${executionId}`;
}

/**
 * The ledger the app opens with, reconstructed from delivery history.
 *
 * A frequency cap that starts from an empty ledger is not a cap — it says every
 * audience is untouched, which is contradicted by the ninety-odd executions the
 * graph already records as sent. So the opening ledger is *derived*, not
 * seeded: every ChannelExecution already in a `sent` state is one recorded
 * contact, dated by its own `scheduledAt` (falling back to its last movement),
 * scoped to the communication's audience and the channel's kind. No record is
 * invented — if it is not in the graph it is not in the ledger.
 *
 * `failed` executions are excluded on purpose: nothing reached anybody, so
 * counting them against the cap would suppress a legitimate retry. `sending`
 * is excluded for the same reason it is still recallable — it has not landed.
 */
export function openingSendLedger(db: SeedDB): SendLedgerEntry[] {
  const entries: SendLedgerEntry[] = [];
  for (const execution of db.channelExecutions) {
    if (execution.status !== 'sent') continue;
    const communication = db.communications.find((c) => c.id === execution.communicationId);
    const channel = db.channels.find((c) => c.id === execution.channelId);
    if (!communication || !channel) continue;
    entries.push({
      id: sendLedgerId(execution.id),
      executionId: execution.id,
      communicationId: communication.id,
      audienceId: communication.audienceId,
      channelId: channel.id,
      channelKind: channel.channelKind,
      pushedAt: execution.scheduledAt ?? execution.updatedAt ?? execution.createdAt,
      recipients: 0,
      actorName: communication.ownerStakeholderId,
      source: 'history',
    });
  }
  return entries;
}

/**
 * History plus anything pushed in this session, de-duplicated by id.
 *
 * Stored rows win over derived ones: if a push has been recorded for an
 * execution, that row carries the recipient count and the named actor, which
 * the reconstruction cannot know.
 */
export function mergeSendLedger(
  history: readonly SendLedgerEntry[],
  recorded: readonly SendLedgerEntry[],
): SendLedgerEntry[] {
  const byId = new Map<string, SendLedgerEntry>();
  for (const e of history) byId.set(e.id, e);
  for (const e of recorded) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => b.pushedAt.localeCompare(a.pushedAt, DEFAULT_LOCALE));
}

/**
 * Ledger lines for one audience on one channel kind inside the counting window.
 *
 * The window closes on the demo clock, never on `Date.now()` — a pinned clock
 * that a single call quietly un-pins produces a cap that counts differently
 * every day the demo is opened.
 */
export function sendsInWindow(
  ledger: readonly SendLedgerEntry[],
  audienceId: string,
  channelKind: ChannelKind,
  options: { nowIso?: string; windowDays?: number } = {},
): SendLedgerEntry[] {
  const nowMs = options.nowIso ? Date.parse(options.nowIso) : DEMO_NOW_MS;
  const windowDays = options.windowDays ?? FREQUENCY_WINDOW_DAYS;
  const openedMs = nowMs - windowDays * 86_400_000;
  return ledger
    .filter((e) => e.audienceId === audienceId && e.channelKind === channelKind)
    .filter((e) => {
      const t = Date.parse(e.pushedAt);
      return !Number.isNaN(t) && t > openedMs && t <= nowMs;
    })
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt, DEFAULT_LOCALE));
}

/* ------------------------------------------------------------------ */
/* Suppression                                                         */
/* ------------------------------------------------------------------ */

/**
 * The suppression rows that apply to one audience on one channel kind.
 *
 * Scoping is by omission, which is how the seed records it: an entry with no
 * `audienceId` is org-wide and applies to every audience, and one with no
 * `channelKind` applies on every channel. Both are unions with the scoped
 * entries, not alternatives to them.
 *
 * This returns the *rows*, not a count, and that is the point. The segment
 * handoff manifest on the journeys page computes one scalar for the whole
 * audience set and then subtracts it from every segment row, so eight
 * suppressed profiles across four segments read as thirty-two removals. Handing
 * callers the matching entries makes that mistake harder to repeat: a suppressed
 * profile is one profile, removed once from the audience, wherever it happens to
 * sit.
 */
export function suppressionMatches(
  db: SeedDB,
  audienceId: string,
  channelKind: ChannelKind,
): SuppressionEntry[] {
  return db.suppressionEntries
    .filter((e) => !e.audienceId || e.audienceId === audienceId)
    .filter((e) => !e.channelKind || e.channelKind === channelKind)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id, DEFAULT_LOCALE));
}

/* ------------------------------------------------------------------ */
/* Consent                                                            */
/* ------------------------------------------------------------------ */

/** One segment of the target audience, judged on the sending channel kind. */
export interface SegmentConsent {
  segmentId: string;
  segmentName: string;
  population: number;
  /** The matching ConsentSummary, or null when none is recorded. */
  summary: ConsentSummary | null;
  /** Whether this segment may be addressed on this channel kind at all. */
  addressable: boolean;
  /** People inside the segment the send may reach, before suppression. */
  reach: number;
  /** Why the segment was excluded; null when it was not. */
  exclusion: string | null;
}

/**
 * Consent posture for every segment of an audience on one channel kind.
 *
 * ConsentSummary carries exactly four fields — segmentId, channelKind,
 * optedInPct, lastRefreshedAt — so this reads a percentage and a date and
 * nothing else. There is no per-person consent record in this graph and this
 * function does not pretend there is: `reach` is the segment's population
 * scaled by the recorded opt-in share, which is an estimate of an addressable
 * count, not a list of addressable people.
 *
 * A segment is excluded when its recorded share is below `MIN_CONSENT_PCT`, or
 * when it has no record at all on a channel kind that addresses individuals.
 * A segment with no record on a published surface is left addressable at its
 * full population, because on those surfaces there is no individual permission
 * that could have been withheld.
 */
export function consentPosture(
  db: SeedDB,
  audienceId: string,
  channelKind: ChannelKind,
): SegmentConsent[] {
  const audience = db.audiences.find((a) => a.id === audienceId);
  const segmentIds = audience?.segmentIds ?? [];
  const governed = CONSENT_GOVERNED_KINDS.has(channelKind);

  return segmentIds.map((segmentId) => {
    const segment = db.segments.find((s) => s.id === segmentId);
    const population = segmentSize(db, segmentId);
    const summary =
      db.consentSummaries.find(
        (c) => c.segmentId === segmentId && c.channelKind === channelKind,
      ) ?? null;

    if (!summary) {
      return {
        segmentId,
        segmentName: segment?.name ?? segmentId,
        population,
        summary: null,
        addressable: !governed,
        reach: governed ? 0 : population,
        exclusion: governed
          ? `${segmentId} has no consent record on ${channelKind} — absence of consent is not consent`
          : null,
      };
    }

    const below = summary.optedInPct < MIN_CONSENT_PCT;
    return {
      segmentId,
      segmentName: segment?.name ?? segmentId,
      population,
      summary,
      addressable: !below,
      reach: below ? 0 : Math.floor((population * summary.optedInPct) / 100),
      exclusion: below
        ? `${segmentId} is ${summary.optedInPct}% opted in on ${channelKind} (${summary.id}, refreshed ${summary.lastRefreshedAt.slice(0, 10)}) — below the ${MIN_CONSENT_PCT}% floor`
        : null,
    };
  });
}

/* ------------------------------------------------------------------ */
/* The gate                                                            */
/* ------------------------------------------------------------------ */

export type SendGateRule =
  | 'send-freeze'
  | 'rework'
  | 'approval'
  | 'consent'
  | 'suppression'
  | 'frequency-cap';

export interface SendGateFinding {
  rule: SendGateRule;
  /** `block` stops the push outright; `reduce` shrinks the recipient set. */
  effect: 'block' | 'reduce';
  /** Human-readable, and carrying the ids and numbers it was derived from. */
  reason: string;
}

export interface SendGateDecision {
  findings: SendGateFinding[];
  /** Reasons with effect `block`, de-duplicated — what the table renders. */
  blockers: string[];
  /** Findings with effect `reduce` — the send goes, smaller. */
  reductions: SendGateFinding[];
  /** True when nothing blocks. Reductions do not stop a push. */
  allowed: boolean;
  /** Per-segment consent posture behind the consent findings. */
  consent: SegmentConsent[];
  /** Suppression rows that apply to this audience and channel kind. */
  suppression: SuppressionEntry[];
  /** Ledger lines already counted against this audience and channel kind. */
  recentSends: SendLedgerEntry[];
  /**
   * Addressable recipients after consent and suppression, never below zero.
   *
   * Reported whether or not the send is allowed: a frequency-capped send has a
   * perfectly good recipient count and is being held back for a reason that has
   * nothing to do with who is in it, and zeroing the number would hide that.
   * Consent-blocked sends reach zero on their own, because a block means no
   * segment was addressable in the first place.
   */
  recipients: number;
}

/**
 * Everything standing between one execution and its launch, named.
 *
 * Derived on every call from the live graph plus the ledger — a finding is
 * never stored, so clearing the underlying record (resuming the comms,
 * approving the content, refreshing consent) clears the chip with no extra
 * write. The order of the checks is the order a reader would want to read them
 * in: the reasons a person stopped this send, then the reasons the data says it
 * cannot go, then the reason it has gone often enough already.
 *
 * `ledger` defaults to empty so a caller that only wants the graph checks can
 * omit it; the page always passes the merged ledger.
 */
export function evaluateSendGate(
  db: SeedDB,
  execution: ChannelExecution,
  communication: Communication,
  ledger: readonly SendLedgerEntry[] = [],
): SendGateDecision {
  const findings: SendGateFinding[] = [];

  /* ---- 1. Send freeze (unchanged) --------------------------------- */
  if (communication.status === 'Paused') {
    findings.push({
      rule: 'send-freeze',
      effect: 'block',
      reason: `Communication ${communication.id} paused — send freeze in force`,
    });
  }

  /* ---- 2. Rework (unchanged) -------------------------------------- */
  const version = execution.contentVersionId
    ? db.contentVersions.find((v) => v.id === execution.contentVersionId)
    : undefined;
  const content = version ? db.contents.find((c) => c.id === version.contentId) : undefined;

  if (content?.status === 'Rework') {
    findings.push({
      rule: 'rework',
      effect: 'block',
      reason: `Content ${content.id} returned to rework`,
    });
  } else if (communication.status === 'Rework') {
    findings.push({
      rule: 'rework',
      effect: 'block',
      reason: `Communication ${communication.id} returned to rework`,
    });
  }

  /* ---- 3. Undecided approvals (unchanged) ------------------------- */
  for (const approval of db.approvals) {
    if (!PENDING_APPROVAL.has(approval.status)) continue;
    const onContent =
      approval.subjectEntity === 'Content' && content && approval.subjectId === content.id;
    const onComms =
      approval.subjectEntity === 'Communication' && approval.subjectId === communication.id;
    if (!onContent && !onComms) continue;
    const approver =
      db.stakeholders.find((s) => s.id === approval.approverStakeholderId)?.name ??
      approval.approverStakeholderId;
    findings.push({
      rule: 'approval',
      effect: 'block',
      reason: `Approval ${approval.id} ${approval.status.toLowerCase()} with ${approver}`,
    });
  }

  /* ---- 4. Consent -------------------------------------------------- */
  // The channel decides which consent records are even relevant, so an
  // execution whose channel has gone missing gets no consent, suppression or
  // frequency verdict at all — silently passing those three checks would be
  // worse than saying nothing, so the missing channel is itself the blocker.
  const channel = db.channels.find((c) => c.id === execution.channelId);
  if (!channel) {
    findings.push({
      rule: 'consent',
      effect: 'block',
      reason: `Execution ${execution.id} names channel ${execution.channelId}, which does not resolve — consent, suppression and frequency cannot be evaluated`,
    });
    return decide(findings, [], [], [], 0);
  }

  const kind = channel.channelKind;
  const consent = consentPosture(db, communication.audienceId, kind);
  const excluded = consent.filter((c) => !c.addressable);
  const addressable = consent.filter((c) => c.addressable);

  if (consent.length === 0) {
    // An audience with no segments has nobody to consent on anyone's behalf.
    findings.push({
      rule: 'consent',
      effect: 'block',
      reason: `Audience ${communication.audienceId} resolves to no segments — there is no consent posture to check on ${kind}`,
    });
  } else if (addressable.length === 0) {
    findings.push({
      rule: 'consent',
      effect: 'block',
      reason: `No segment of ${communication.audienceId} may be addressed on ${kind}: ${excluded
        .map((c) => c.exclusion)
        .filter(Boolean)
        .join('; ')}`,
    });
  } else if (excluded.length > 0) {
    findings.push({
      rule: 'consent',
      effect: 'reduce',
      reason: `${excluded.length} of ${consent.length} segments held back on ${kind}: ${excluded
        .map((c) => c.exclusion)
        .filter(Boolean)
        .join('; ')}`,
    });
  }

  /* ---- 5. Suppression ---------------------------------------------- */
  const suppression = suppressionMatches(db, communication.audienceId, kind);
  const consentedReach = addressable.reduce((sum, c) => sum + c.reach, 0);
  // One suppression row is one masked profile, removed once from the audience.
  // It is NOT subtracted per segment: the profile sits in exactly one place.
  const recipients = Math.max(0, consentedReach - suppression.length);

  if (suppression.length > 0) {
    const byReason = new Map<string, number>();
    for (const e of suppression) byReason.set(e.reason, (byReason.get(e.reason) ?? 0) + 1);
    const breakdown = [...byReason]
      .sort((a, b) => a[0].localeCompare(b[0], DEFAULT_LOCALE))
      .map(([reason, n]) => `${reason} ×${n}`)
      .join(', ');
    const orgWide = suppression.filter((e) => !e.audienceId).length;
    const detail = orgWide > 0 ? `${breakdown}; ${orgWide} org-wide` : breakdown;

    if (consentedReach > 0 && recipients === 0) {
      findings.push({
        rule: 'suppression',
        effect: 'block',
        reason: `Suppression removes every remaining profile on ${kind} (${suppression.length} entries — ${detail}) — nothing left to send to`,
      });
    } else {
      findings.push({
        rule: 'suppression',
        effect: 'reduce',
        reason: `${suppression.length} suppressed profile${suppression.length === 1 ? '' : 's'} removed on ${kind} (${detail})`,
      });
    }
  }

  /* ---- 6. Frequency cap -------------------------------------------- */
  // Counted over the ledger, not over execution statuses: a recalled draft must
  // not un-count a contact that already happened. The execution's own line is
  // excluded so that re-evaluating a push cannot block itself.
  const recentSends = sendsInWindow(ledger, communication.audienceId, kind).filter(
    (e) => e.executionId !== execution.id,
  );
  if (recentSends.length >= FREQUENCY_CAP_PER_WINDOW) {
    const last = recentSends[0];
    findings.push({
      rule: 'frequency-cap',
      effect: 'block',
      reason: `Frequency cap reached — ${recentSends.length} sends to ${communication.audienceId} on ${kind} in the ${FREQUENCY_WINDOW_DAYS} days to ${DEMO_NOW_ISO.slice(0, 10)} (cap ${FREQUENCY_CAP_PER_WINDOW}); most recent ${last.executionId} on ${last.pushedAt.slice(0, 10)}`,
    });
  }

  return decide(findings, consent, suppression, recentSends, recipients);
}

function decide(
  findings: SendGateFinding[],
  consent: SegmentConsent[],
  suppression: SuppressionEntry[],
  recentSends: SendLedgerEntry[],
  recipients: number,
): SendGateDecision {
  const blockers = [
    ...new Set(findings.filter((f) => f.effect === 'block').map((f) => f.reason)),
  ];
  return {
    findings,
    blockers,
    reductions: findings.filter((f) => f.effect === 'reduce'),
    allowed: blockers.length === 0,
    consent,
    suppression,
    recentSends,
    recipients,
  };
}

/**
 * The ledger line a push writes.
 *
 * Dated on the demo clock rather than the wall clock so that a push made during
 * a demo lands inside the same counting window everything else is measured in —
 * a line stamped with a real 2027 timestamp would sit outside every window and
 * silently never count.
 */
export function ledgerEntryForPush(
  db: SeedDB,
  execution: ChannelExecution,
  communication: Communication,
  recipients: number,
  actorName: string,
): SendLedgerEntry | null {
  const channel = db.channels.find((c) => c.id === execution.channelId);
  if (!channel) return null;
  return {
    id: sendLedgerId(execution.id),
    executionId: execution.id,
    communicationId: communication.id,
    audienceId: communication.audienceId,
    channelId: channel.id,
    channelKind: channel.channelKind,
    pushedAt: DEMO_NOW_ISO,
    recipients,
    actorName,
    source: 'push',
  };
}
