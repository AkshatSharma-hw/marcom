/**
 * Tests for the idea scoring rubric (src/lib/ideaScoring.ts).
 *
 * Two things matter more here than any individual number:
 *
 * 1. The composite must be *decomposable*. The whole point of the rubric is
 *    that a user can see which criteria produced the score, so the invariant
 *    "the contributions add up to the total" is the load-bearing assertion —
 *    if it ever fails, the breakdown on screen is a lie about the number
 *    beside it.
 * 2. It must not read the wall clock. The dataset is pinned to 2026-08-13; a
 *    `Date.now()` anywhere in the freshness maths would make these tests decay
 *    silently over days rather than fail.
 */

import { describe, expect, it } from "vitest";
import { getSeedDB } from "@/data/seed";
import { DEMO_NOW_MS, TODAY } from "@/data/selectors/campaignSelectors";
import {
  ARTICULATION_BANDS,
  FRESHNESS_FULL_DAYS,
  FRESHNESS_ZERO_DAYS,
  IDEA_CRITERIA,
  OUTCOME_SIGNALS_FOR_FULL_MARKS,
  SOURCE_CREDIBILITY,
  UNKNOWN_SOURCE_CREDIBILITY,
  ageInDays,
  outcomeSignals,
  scoreIdea,
  scoreOrigin,
  type ScorableIdea,
} from "@/lib/ideaScoring";

/** A fully-specified idea: every criterion at or near full marks. */
const strong: ScorableIdea = {
  title: "Volt trade-in conversion push",
  description:
    "Rebuild the trade-in flow with instant valuations and a shareable savings meter, then run it as a always-on performance flight across lifecycle email and paid social. Field interviews put trade-in friction ahead of price as the blocker to upgrades, and the target is a 12% lift in upgrade conversion inside two quarters.",
  source: "customer-feedback",
  brandId: "BRD-003",
  businessUnitId: "BU-001",
  regionId: "REG-APAC",
  createdAt: `${TODAY}T09:00:00Z`,
};

/** The opposite: nothing filled in that the rubric can credit. */
const weak: ScorableIdea = {
  title: "Do something",
  description: "",
  source: "",
  brandId: "",
  businessUnitId: "",
  regionId: "",
  createdAt: "2024-01-01T00:00:00Z",
};

describe("rubric definition", () => {
  it("weights sum to 100, so the composite needs no normalisation", () => {
    const total = IDEA_CRITERIA.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBe(100);
  });

  it("every criterion is named and justified for the breakdown UI", () => {
    for (const c of IDEA_CRITERIA) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.rationale.length).toBeGreaterThan(20);
    }
  });

  it("has no duplicate criterion keys", () => {
    const keys = IDEA_CRITERIA.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("scoreIdea composite", () => {
  it("contributions add up to the reported total", () => {
    for (const idea of [strong, weak]) {
      const result = scoreIdea(idea);
      const summed = result.criteria.reduce((s, c) => s + c.points, 0);
      expect(result.total).toBe(Math.round(summed));
    }
  });

  it("returns one entry per rubric criterion, in rubric order", () => {
    const result = scoreIdea(strong);
    expect(result.criteria.map((c) => c.key)).toEqual(
      IDEA_CRITERIA.map((c) => c.key),
    );
  });

  it("stays inside 0–100 for both extremes", () => {
    expect(scoreIdea(weak).total).toBeGreaterThanOrEqual(0);
    expect(scoreIdea(strong).total).toBeLessThanOrEqual(100);
  });

  it("scores a complete, evidenced, recent idea near the top", () => {
    expect(scoreIdea(strong).total).toBeGreaterThanOrEqual(90);
  });

  it("scores an empty, stale, unscoped idea near the bottom", () => {
    expect(scoreIdea(weak).total).toBeLessThanOrEqual(15);
  });

  it("is pure — the same input scores the same twice", () => {
    expect(scoreIdea(strong)).toEqual(scoreIdea(strong));
  });

  it("every criterion carries a detail string naming its actual input", () => {
    for (const c of scoreIdea(strong).criteria) {
      expect(c.detail.length).toBeGreaterThan(0);
    }
  });

  it("points equal weight × ratio for every criterion", () => {
    for (const c of scoreIdea(strong).criteria) {
      expect(c.points).toBeCloseTo(c.weight * c.ratio, 10);
    }
  });
});

describe("evidence criterion", () => {
  const evidenceOf = (source: string): number =>
    scoreIdea({ ...strong, source }).criteria.find((c) => c.key === "evidence")!
      .ratio;

  it("ranks customer evidence above internal opinion above agent suggestion", () => {
    expect(evidenceOf("customer-feedback")).toBeGreaterThan(evidenceOf("field"));
    expect(evidenceOf("field")).toBeGreaterThan(evidenceOf("workshop"));
    expect(evidenceOf("workshop")).toBeGreaterThan(evidenceOf("ai-suggested"));
  });

  it("is case-insensitive about the source string", () => {
    expect(evidenceOf("Customer-Feedback")).toBe(evidenceOf("customer-feedback"));
  });

  it("floors an unrecognised source instead of zeroing it", () => {
    expect(evidenceOf("hackathon")).toBe(UNKNOWN_SOURCE_CREDIBILITY);
    expect(UNKNOWN_SOURCE_CREDIBILITY).toBeGreaterThan(0);
  });

  it("covers every source value the shipped seed actually uses", () => {
    const sources = new Set(getSeedDB().ideas.map((i) => i.source.toLowerCase()));
    for (const s of sources) {
      expect(SOURCE_CREDIBILITY[s]).toBeDefined();
    }
  });

  it("names the source in its detail line", () => {
    const detail = scoreIdea({ ...strong, source: "workshop" }).criteria.find(
      (c) => c.key === "evidence",
    )!.detail;
    expect(detail).toContain("workshop");
  });
});

describe("articulation criterion", () => {
  const ratioFor = (chars: number): number =>
    scoreIdea({ ...strong, description: "x".repeat(chars) }).criteria.find(
      (c) => c.key === "articulation",
    )!.ratio;

  it("gives nothing for an empty description", () => {
    expect(ratioFor(0)).toBe(0);
  });

  it("never decreases as the description gets longer", () => {
    const lengths = [0, 1, 39, 40, 119, 120, 239, 240, 1000];
    for (let i = 1; i < lengths.length; i += 1) {
      expect(ratioFor(lengths[i])).toBeGreaterThanOrEqual(ratioFor(lengths[i - 1]));
    }
  });

  it("caps at 1 — verbosity beyond the top band earns nothing extra", () => {
    const top = ARTICULATION_BANDS[0].minChars;
    expect(ratioFor(top)).toBe(1);
    expect(ratioFor(top * 10)).toBe(1);
  });

  it("ignores surrounding whitespace", () => {
    expect(
      scoreIdea({ ...strong, description: "     " }).criteria.find(
        (c) => c.key === "articulation",
      )!.ratio,
    ).toBe(0);
  });
});

describe("outcome criterion", () => {
  it("finds outcome vocabulary in the idea's own words", () => {
    expect(outcomeSignals("Lift upgrade conversion")).toContain("conversion");
    expect(outcomeSignals("Lift upgrade conversion")).toContain("upgrade");
  });

  it("counts a bare figure as a signal in its own right", () => {
    expect(outcomeSignals("cut bills by 30%")).toContain("a figure");
  });

  it("finds nothing in a description that names no result", () => {
    expect(outcomeSignals("A nice thing for the brand")).toEqual([]);
  });

  it("reaches full marks at the documented number of signals", () => {
    const c = scoreIdea({
      ...strong,
      title: "Conversion push",
      description: "Improve retention.",
    }).criteria.find((x) => x.key === "outcome")!;
    expect(OUTCOME_SIGNALS_FOR_FULL_MARKS).toBe(2);
    expect(c.ratio).toBe(1);
  });

  it("half-credits a single signal", () => {
    const c = scoreIdea({
      ...strong,
      title: "Roundtable series",
      description: "Quarterly invite-only sessions to build pipeline.",
    }).criteria.find((x) => x.key === "outcome")!;
    expect(c.ratio).toBe(0.5);
  });

  it("zeroes an idea that names no outcome at all", () => {
    const c = scoreIdea({
      ...strong,
      title: "New thing",
      description: "A pleasant idea about the brand and its personality.",
    }).criteria.find((x) => x.key === "outcome")!;
    expect(c.ratio).toBe(0);
  });
});

describe("scope criterion", () => {
  it("credits each of brand, business unit and region equally", () => {
    const full = scoreIdea(strong).criteria.find((c) => c.key === "scope")!;
    const noRegion = scoreIdea({ ...strong, regionId: "" }).criteria.find(
      (c) => c.key === "scope",
    )!;
    const noBu = scoreIdea({ ...strong, businessUnitId: "" }).criteria.find(
      (c) => c.key === "scope",
    )!;
    expect(full.ratio).toBe(1);
    expect(noRegion.ratio).toBeCloseTo(2 / 3, 10);
    expect(noBu.ratio).toBe(noRegion.ratio);
  });

  it("names what is missing rather than just deducting", () => {
    const c = scoreIdea({ ...strong, regionId: "" }).criteria.find(
      (x) => x.key === "scope",
    )!;
    expect(c.detail.toLowerCase()).toContain("region");
  });
});

describe("freshness criterion", () => {
  it("measures age against the pinned demo clock, not the wall clock", () => {
    // Ten days before the demo's TODAY — a fixed answer forever.
    expect(ageInDays("2026-08-03T23:59:59Z")).toBe(10);
    expect(ageInDays(`${TODAY}T23:59:59Z`)).toBe(0);
  });

  const ratioAtAge = (days: number): number => {
    const created = new Date(DEMO_NOW_MS - days * 24 * 60 * 60 * 1000).toISOString();
    return scoreIdea({ ...strong, createdAt: created }).criteria.find(
      (c) => c.key === "freshness",
    )!.ratio;
  };

  it("holds full marks through the grace window, then decays to zero", () => {
    expect(ratioAtAge(0)).toBe(1);
    expect(ratioAtAge(FRESHNESS_FULL_DAYS)).toBe(1);
    expect(ratioAtAge(FRESHNESS_ZERO_DAYS)).toBe(0);
    expect(ratioAtAge(FRESHNESS_ZERO_DAYS + 400)).toBe(0);
  });

  it("never increases with age", () => {
    const ages = [0, 30, 60, 120, 200, 364, 365, 900];
    for (let i = 1; i < ages.length; i += 1) {
      expect(ratioAtAge(ages[i])).toBeLessThanOrEqual(ratioAtAge(ages[i - 1]));
    }
  });

  it("treats an unsaved draft (no createdAt) as captured now", () => {
    const { createdAt: _drop, ...draft } = strong;
    const c = scoreIdea(draft).criteria.find((x) => x.key === "freshness")!;
    expect(c.ratio).toBe(1);
    expect(c.detail).toMatch(/now/i);
  });

  it("earns nothing for an unreadable capture date instead of throwing", () => {
    const c = scoreIdea({ ...strong, createdAt: "not-a-date" }).criteria.find(
      (x) => x.key === "freshness",
    )!;
    expect(c.ratio).toBe(0);
  });
});

describe("seeded vs rubric provenance", () => {
  const seededIds = new Set(getSeedDB().ideas.map((i) => i.id));

  it("marks every shipped idea as hand-authored", () => {
    for (const idea of getSeedDB().ideas) {
      expect(scoreOrigin(idea.id, seededIds)).toBe("seeded");
    }
  });

  it("marks an id the seed never shipped as rubric-scored", () => {
    expect(scoreOrigin("IDE-999", seededIds)).toBe("rubric");
  });

  it("does not mutate the seeded score — scoring is read-only", () => {
    const before = getSeedDB().ideas.map((i) => i.score);
    getSeedDB().ideas.forEach((i) => scoreIdea(i));
    expect(getSeedDB().ideas.map((i) => i.score)).toEqual(before);
  });

  it("produces a comparable 0–100 recompute for every seeded idea", () => {
    // The recompute is only ever *shown beside* the seeded number, never
    // written over it — but it still has to be a valid score to show.
    for (const idea of getSeedDB().ideas) {
      const { total } = scoreIdea(idea);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(100);
    }
  });
});
