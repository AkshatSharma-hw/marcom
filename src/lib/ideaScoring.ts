/**
 * The idea scoring rubric — the answer to "why is this idea 88 and that one 61?".
 *
 * Before this file, `Idea.score` was a hand-authored integer in the seed and
 * nothing else. The Ideation hub sorted on it, the Agents page claimed an agent
 * "scores and ranks ideas", and no surface could say what the number was made
 * of, because nothing made it — a person typed it. A composite that cannot be
 * decomposed is not a score, it is a label.
 *
 * So the rubric here is deliberately *small, named and boring*: five weighted
 * criteria that add up to 100, each computed from a field that genuinely exists
 * on `Idea` (see src/data/types.ts). No hidden model, no learned weights,
 * nothing derived from data the record does not carry.
 *
 * ── What is NOT a criterion, and why ────────────────────────────────────────
 * `status` is not scored. It is tempting (Approved > Scored > Draft), and it
 * would make seeded ideas rank the way the seed already ranks them — which is
 * exactly the problem. Status is the *outcome* of review; scoring it makes the
 * rubric circular: an idea would score highly because someone promoted it, and
 * be promoted because it scored highly. The score has to be something a
 * reviewer can disagree with, so it is computed only from what the person who
 * captured the idea actually wrote down.
 *
 * `promotedToCampaignId` is excluded for the same reason, one step worse: it is
 * the decision the score is supposed to inform.
 *
 * ── Seeded scores vs rubric scores ─────────────────────────────────────────
 * DECISION: the rubric is authoritative **only for ideas captured through the
 * app**. Seeded ideas keep their hand-authored `score` exactly as shipped.
 *
 * Why not recompute over the seed? Because the seeded numbers are load-bearing
 * fiction: SEED_MANIFEST.md binds them, other surfaces quote them, and the seed
 * narrative ("this 88 is why we promoted it") was written around them. Silently
 * replacing 88 with whatever this file computes would rewrite the demo's
 * history and, worse, present a machine number as if a human had reasoned to
 * it. Equally, hiding the recompute would waste the one honest thing the rubric
 * can offer on seeded rows.
 *
 * So both numbers are kept and both are labelled: the column shows the seeded
 * number for seeded ideas and the rubric composite for captured ones, and the
 * breakdown states which of the two the user is looking at. On a seeded row the
 * rubric result is shown as an explicit *comparison* — "what this rubric would
 * score it" — never as the row's score. `scoreOrigin()` below is the single
 * place that decides which is which; the UI must not re-derive it.
 */

import type { Idea } from "@/data/types";
import { DEMO_NOW_MS } from "@/data/selectors/campaignSelectors";

/** The fields the rubric reads. A full `Idea` satisfies it, and so does an
 *  unsaved capture form — the New idea dialog scores its draft live. */
export type ScorableIdea = Pick<
  Idea,
  "title" | "description" | "source" | "brandId" | "businessUnitId" | "regionId"
> & {
  /** ISO timestamp. Absent on a draft that has not been saved yet. */
  createdAt?: string;
};

export type IdeaCriterionKey =
  | "evidence"
  | "articulation"
  | "outcome"
  | "scope"
  | "freshness";

export interface IdeaCriterion {
  key: IdeaCriterionKey;
  /** Column label in the breakdown. */
  label: string;
  /** Maximum points this criterion can contribute; the five sum to 100. */
  weight: number;
  /** Why this criterion is in the rubric at all — shown in the breakdown. */
  rationale: string;
}

/**
 * The rubric. Weights sum to 100 and a test asserts it, so the composite is
 * always on a 0–100 scale without a normalisation step to get wrong.
 */
export const IDEA_CRITERIA: readonly IdeaCriterion[] = [
  {
    key: "evidence",
    label: "Evidence",
    weight: 25,
    rationale:
      "Where the idea came from. Something a customer told us outranks something a room agreed on, and an agent suggestion is a hypothesis until a person validates it.",
  },
  {
    key: "articulation",
    label: "Articulation",
    weight: 20,
    rationale:
      "Whether the idea is written down well enough for someone else to act on. A one-line idea cannot be briefed, staffed or costed.",
  },
  {
    key: "outcome",
    label: "Stated outcome",
    weight: 20,
    rationale:
      "Whether the description names something measurable. An idea with no intended result cannot be judged after it runs.",
  },
  {
    key: "scope",
    label: "Scope set",
    weight: 20,
    rationale:
      "Brand, business unit and region. An idea missing any of the three cannot be routed to an owner or a budget.",
  },
  {
    key: "freshness",
    label: "Freshness",
    weight: 15,
    rationale:
      "How long the idea has sat uncaptured-on. Market context decays; a year-old idea is a different bet than the one that was written.",
  },
] as const;

/** One criterion's outcome for one idea. */
export interface CriterionScore {
  key: IdeaCriterionKey;
  label: string;
  weight: number;
  /** 0–1. What fraction of `weight` this idea earned. */
  ratio: number;
  /** `weight * ratio`, unrounded. The five points sum to the raw composite. */
  points: number;
  /** The actual input that produced `ratio`, for the breakdown UI. */
  detail: string;
}

export interface IdeaScore {
  /** 0–100, rounded. This is what gets written to `Idea.score`. */
  total: number;
  criteria: CriterionScore[];
}

/* ------------------------------------------------------------------ */
/* Criterion 1 — Evidence                                              */
/* ------------------------------------------------------------------ */

/**
 * Source → credibility, over the `source` values the seed actually uses
 * ('workshop' | 'field' | 'ai-suggested' | 'customer-feedback').
 *
 * An unrecognised source scores the floor rather than zero: an idea from an
 * unlisted origin is unverified, not worthless, and zeroing it would let one
 * unmapped string dominate the whole composite.
 */
export const SOURCE_CREDIBILITY: Readonly<Record<string, number>> = {
  "customer-feedback": 1,
  field: 0.85,
  workshop: 0.6,
  "ai-suggested": 0.35,
};

/** What an unrecognised `source` earns on the Evidence criterion. */
export const UNKNOWN_SOURCE_CREDIBILITY = 0.3;

function evidenceRatio(source: string): number {
  const key = source.trim().toLowerCase();
  return SOURCE_CREDIBILITY[key] ?? UNKNOWN_SOURCE_CREDIBILITY;
}

/* ------------------------------------------------------------------ */
/* Criterion 2 — Articulation                                          */
/* ------------------------------------------------------------------ */

/**
 * Description length bands, not a continuous curve.
 *
 * Bands are honest about what character count can actually tell us: it
 * separates "one line" from "a paragraph someone could brief from", and past
 * that it measures nothing. A linear ratio would keep paying for verbosity.
 */
export const ARTICULATION_BANDS: readonly { minChars: number; ratio: number }[] = [
  { minChars: 240, ratio: 1 },
  { minChars: 120, ratio: 0.75 },
  { minChars: 40, ratio: 0.4 },
  { minChars: 1, ratio: 0.15 },
];

function articulationRatio(description: string): number {
  const len = description.trim().length;
  for (const band of ARTICULATION_BANDS) {
    if (len >= band.minChars) return band.ratio;
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Criterion 3 — Stated outcome                                        */
/* ------------------------------------------------------------------ */

/**
 * Outcome vocabulary. A keyword match is a blunt instrument, which is why the
 * list is exported and the breakdown names the terms it matched: the user can
 * see the evidence and discount it. A hidden classifier scoring the same 20
 * points would be strictly worse — same crudeness, no recourse.
 */
export const OUTCOME_TERMS: readonly string[] = [
  "adoption",
  "attendance",
  "awareness",
  "bookings",
  "churn",
  "consideration",
  "conversion",
  "demand",
  "engagement",
  "leads",
  "lift",
  "participation",
  "pipeline",
  "pre-order",
  "reach",
  "recall",
  "referral",
  "retention",
  "revenue",
  "roi",
  "savings",
  "sentiment",
  "share",
  "signup",
  "sign-up",
  "spend",
  "subscription",
  "traffic",
  "upgrade",
  "uplift",
];

/** Distinct outcome signals needed for full marks on the Outcome criterion. */
export const OUTCOME_SIGNALS_FOR_FULL_MARKS = 2;

/** Which outcome terms (and whether a figure) appear in an idea's own words. */
export function outcomeSignals(text: string): string[] {
  const haystack = text.toLowerCase();
  const hits = OUTCOME_TERMS.filter((term) => haystack.includes(term));
  // A bare number is itself a signal — "cut bills by 30%" states a target even
  // with none of the nouns above. Listed last so the breakdown reads naturally.
  if (/\d/.test(haystack)) hits.push("a figure");
  return hits;
}

/* ------------------------------------------------------------------ */
/* Criterion 4 — Scope                                                 */
/* ------------------------------------------------------------------ */

const SCOPE_FIELDS = [
  { key: "brandId", label: "brand" },
  { key: "businessUnitId", label: "business unit" },
  { key: "regionId", label: "region" },
] as const;

/* ------------------------------------------------------------------ */
/* Criterion 5 — Freshness                                             */
/* ------------------------------------------------------------------ */

/** Days an idea stays fully fresh before the criterion starts decaying. */
export const FRESHNESS_FULL_DAYS = 30;
/** Days at which freshness reaches zero. */
export const FRESHNESS_ZERO_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole days between an idea's capture timestamp and the demo clock.
 *
 * `DEMO_NOW_MS`, never `Date.now()`: the dataset is pinned to 2026-08-13, and a
 * wall-clock reading would make every seeded idea's freshness drift by a point
 * a week and make this file's tests expire.
 */
export function ageInDays(createdAt: string, now: number = DEMO_NOW_MS): number {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return Number.NaN;
  return Math.floor((now - t) / DAY_MS);
}

function freshnessRatio(days: number): number {
  if (Number.isNaN(days)) return 0;
  // Future-dated capture (a draft being scored live, before it is saved with
  // the demo clock) is as fresh as it gets rather than out of range.
  if (days <= FRESHNESS_FULL_DAYS) return 1;
  if (days >= FRESHNESS_ZERO_DAYS) return 0;
  return (
    (FRESHNESS_ZERO_DAYS - days) / (FRESHNESS_ZERO_DAYS - FRESHNESS_FULL_DAYS)
  );
}

/* ------------------------------------------------------------------ */
/* The composite                                                       */
/* ------------------------------------------------------------------ */

const weightOf = (key: IdeaCriterionKey): number =>
  IDEA_CRITERIA.find((c) => c.key === key)?.weight ?? 0;

const labelOf = (key: IdeaCriterionKey): string =>
  IDEA_CRITERIA.find((c) => c.key === key)?.label ?? key;

function criterion(
  key: IdeaCriterionKey,
  ratio: number,
  detail: string,
): CriterionScore {
  const weight = weightOf(key);
  const clamped = Math.min(1, Math.max(0, ratio));
  return {
    key,
    label: labelOf(key),
    weight,
    ratio: clamped,
    points: weight * clamped,
    detail,
  };
}

/**
 * Score an idea against the rubric. Pure: same input, same output, no clock
 * read beyond the pinned demo instant and no store access.
 */
export function scoreIdea(idea: ScorableIdea, now: number = DEMO_NOW_MS): IdeaScore {
  const source = (idea.source ?? "").trim();
  const description = idea.description ?? "";

  const evidence = criterion(
    "evidence",
    evidenceRatio(source),
    source
      ? `Source: ${source}${
          SOURCE_CREDIBILITY[source.toLowerCase()] === undefined
            ? " (unrecognised source — scored at the floor)"
            : ""
        }`
      : "No source recorded",
  );

  const chars = description.trim().length;
  const articulation = criterion(
    "articulation",
    articulationRatio(description),
    chars === 0
      ? "No description"
      : `${chars} characters of description`,
  );

  const signals = outcomeSignals(`${idea.title ?? ""} ${description}`);
  const outcome = criterion(
    "outcome",
    signals.length / OUTCOME_SIGNALS_FOR_FULL_MARKS,
    signals.length === 0
      ? "No outcome or metric named"
      : `Names ${signals.slice(0, 4).join(", ")}`,
  );

  const present = SCOPE_FIELDS.filter((f) => String(idea[f.key] ?? "").trim() !== "");
  const missing = SCOPE_FIELDS.filter(
    (f) => String(idea[f.key] ?? "").trim() === "",
  );
  const scope = criterion(
    "scope",
    present.length / SCOPE_FIELDS.length,
    missing.length === 0
      ? "Brand, business unit and region all set"
      : `Missing ${missing.map((f) => f.label).join(", ")}`,
  );

  const days = idea.createdAt ? ageInDays(idea.createdAt, now) : 0;
  const freshness = criterion(
    "freshness",
    idea.createdAt ? freshnessRatio(days) : 1,
    !idea.createdAt
      ? "Captured now"
      : Number.isNaN(days)
        ? "Capture date unreadable"
        : days <= 0
          ? "Captured today"
          : `Captured ${days} day${days === 1 ? "" : "s"} ago`,
  );

  const criteria = [evidence, articulation, outcome, scope, freshness];
  const raw = criteria.reduce((sum, c) => sum + c.points, 0);
  return { total: Math.round(raw), criteria };
}

/* ------------------------------------------------------------------ */
/* Which number is the user looking at                                 */
/* ------------------------------------------------------------------ */

/**
 * Where a displayed score came from.
 *
 * - `seeded`: the hand-authored number the dataset shipped. The rubric has no
 *   claim on it and must never overwrite it.
 * - `rubric`: computed by `scoreIdea` when the idea was captured in the app, so
 *   the breakdown fully explains the number in the column.
 */
export type ScoreOrigin = "seeded" | "rubric";

/**
 * Decide which of the two an idea's `score` is.
 *
 * Membership of the shipped seed is the test, not `source` or `status`: an idea
 * captured in-session can carry any source, and a seeded idea's status changes
 * the moment somebody promotes it. Identity is the only thing that does not
 * move. Callers pass the seed's ids (`getSeedDB().ideas`) so this stays pure.
 */
export function scoreOrigin(
  ideaId: string,
  seededIdeaIds: ReadonlySet<string>,
): ScoreOrigin {
  return seededIdeaIds.has(ideaId) ? "seeded" : "rubric";
}
