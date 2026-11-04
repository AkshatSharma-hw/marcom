/**
 * AI review rule-engine tests — `aiService.reviewContent` (deterministic
 * brand & compliance engine, BLUEPRINT.md Part 10 §3).
 *
 * Inputs are crafted against the actual rule implementation in
 * src/services/ai/simulated.ts; policies and brands come from the seed DB.
 */

import { describe, expect, it } from 'vitest';
import { getPackDB } from '@/data/seed';
import { aiService } from '@/services/ai';
import type { ReviewInput } from '@/services/ai';
import type { ReviewFinding } from '@/data/types';

// Pinned to the default pack: every assertion below names a specific seeded
// record (CNT-011's finding mix, the KSA->GCC->EU clause chain). Packs share
// record shapes and state coverage, not content, so these are only meaningful
// against the pack they were written for.
const db = getPackDB('default');
const brand = db.brands[0];
const allPolicies = db.policies;

const SEVERITY_RANK: Record<ReviewFinding['severity'], number> = {
  pass: 0,
  warn: 1,
  block: 2,
};

function worstOf(findings: ReviewFinding[]): ReviewFinding['severity'] {
  return findings.reduce<ReviewFinding['severity']>(
    (worst, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst] ? f.severity : worst),
    'pass',
  );
}

/** Base input free of every rule trigger; tests override single fields. */
function baseInput(overrides: Partial<ReviewInput> = {}): ReviewInput {
  return {
    title: 'Autumn savings preview',
    body: 'Autumn savings arrive next week with simple offers for every home.',
    brand,
    classification: 'Public',
    ...overrides,
  };
}

describe('reviewContent determinism', () => {
  it('returns deep-equal results when called twice with identical input', () => {
    const input = baseInput({
      body: 'Our revolutionary charger is 3x faster than anything before it.',
      classification: 'Restricted',
      regionCodes: ['EMEA'],
      campaignStartDate: '2026-09-01',
      reviewDate: '2026-08-14',
    });
    const first = aiService.reviewContent(input, allPolicies);
    const second = aiService.reviewContent(input, allPolicies);
    expect(first.findings.length).toBeGreaterThan(0);
    expect(second).toEqual(first);

    // Also deep-equal for a structurally identical but distinct input object.
    const third = aiService.reviewContent(
      baseInput({
        body: 'Our revolutionary charger is 3x faster than anything before it.',
        classification: 'Restricted',
        regionCodes: ['EMEA'],
        campaignStartDate: '2026-09-01',
        reviewDate: '2026-08-14',
      }),
      allPolicies,
    );
    expect(third).toEqual(first);
  });
});

describe('POL-001 brand voice', () => {
  it("a body with 'revolutionary' triggers a warn finding citing POL-001", () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'This revolutionary charger cuts wait times at home.' }),
      allPolicies,
    );
    const hype = result.findings.find((f) => f.ruleId === 'brand-voice-banned-hype');
    expect(hype).toBeDefined();
    expect(hype?.policyId).toBe('POL-001');
    expect(hype?.severity).toBe('warn');
    expect(hype?.message).toContain('revolutionary');
    expect(result.overallSeverity).toBe('warn');
  });

  it('banned terms match whole words only — "best everyday" and "#10" do not fire', () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'Our best everyday prices are here, ranked #10 by reviewers.' }),
      allPolicies,
    );
    expect(result.findings.filter((f) => f.ruleId === 'brand-voice-banned-hype')).toEqual([]);
    expect(result.overallSeverity).toBe('pass');
  });

  it('every occurrence of a banned term is flagged, not just the first', () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'A revolutionary design meets a revolutionary battery.' }),
      allPolicies,
    );
    const hype = result.findings.filter((f) => f.ruleId === 'brand-voice-banned-hype');
    expect(hype).toHaveLength(2);
  });

  it('a clean body yields a pass-level tone finding for POL-001', () => {
    const result = aiService.reviewContent(baseInput(), allPolicies);
    const tone = result.findings.find((f) => f.ruleId === 'brand-voice-tone');
    expect(tone?.policyId).toBe('POL-001');
    expect(tone?.severity).toBe('pass');
  });
});

describe('POL-002 claims substantiation', () => {
  it("a body with '3x faster' and no substantiation triggers the claims finding (warn outside EU)", () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'The new charger is 3x faster than the previous generation.' }),
      allPolicies,
    );
    const claim = result.findings.find(
      (f) => f.ruleId === 'claims-substantiation' && f.severity !== 'pass',
    );
    expect(claim).toBeDefined();
    expect(claim?.policyId).toBe('POL-002');
    expect(claim?.severity).toBe('warn');
    expect(claim?.message).toContain('3x faster');
  });

  it('the same unsubstantiated claim is block-level for EMEA-region content', () => {
    const result = aiService.reviewContent(
      baseInput({
        body: 'The new charger is 3x faster than the previous generation.',
        regionCodes: ['EMEA'],
      }),
      allPolicies,
    );
    const claim = result.findings.find(
      (f) => f.ruleId === 'claims-substantiation' && f.severity !== 'pass',
    );
    expect(claim?.severity).toBe('block');
    expect(result.overallSeverity).toBe('block');
  });

  it('a substantiated claim passes', () => {
    const result = aiService.reviewContent(
      baseInput({
        body: 'The new charger is 3x faster, based on certified lab benchmarks from July.',
      }),
      allPolicies,
    );
    const claim = result.findings.find((f) => f.ruleId === 'claims-substantiation');
    expect(claim?.severity).toBe('pass');
  });
});

describe('POL-003 embargo', () => {
  it('a launch reference with no dates supplied passes but says timing was not evaluated', () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'The launch story lands soon.' }),
      allPolicies,
    );
    const embargo = result.findings.find((f) => f.ruleId === 'embargo-launch-reference');
    expect(embargo?.severity).toBe('pass');
    expect(embargo?.message).toContain('not evaluated');
  });
});

describe('POL-005 disclaimers', () => {
  it('a Restricted body without the forward-looking phrase triggers a block finding on POL-005', () => {
    const result = aiService.reviewContent(
      baseInput({
        classification: 'Restricted',
        body: 'Guidance for the second half will be shared at the briefing.',
      }),
      allPolicies,
    );
    const disclaimer = result.findings.find((f) => f.ruleId === 'disclaimer-forward-looking');
    expect(disclaimer).toBeDefined();
    expect(disclaimer?.policyId).toBe('POL-005');
    expect(disclaimer?.severity).toBe('block');
    expect(result.overallSeverity).toBe('block');
  });

  it('investor-facing language also requires the disclaimer even when not Restricted', () => {
    const result = aiService.reviewContent(
      baseInput({
        classification: 'Internal',
        body: 'A note for investors on the half-year numbers goes out on Friday.',
      }),
      allPolicies,
    );
    const disclaimer = result.findings.find((f) => f.ruleId === 'disclaimer-forward-looking');
    expect(disclaimer?.severity).toBe('block');
  });

  it('a Restricted body carrying the forward-looking phrase does not trigger the block', () => {
    const result = aiService.reviewContent(
      baseInput({
        classification: 'Restricted',
        body: 'Guidance will be shared at the briefing. This communication contains forward-looking statements; actual results may differ materially.',
      }),
      allPolicies,
    );
    expect(
      result.findings.find((f) => f.ruleId === 'disclaimer-forward-looking'),
    ).toBeUndefined();
  });

  it('the disclaimer phrase counts wherever it appears in title+body, matching detection scope', () => {
    const result = aiService.reviewContent(
      baseInput({
        classification: 'Restricted',
        title: 'Forward-looking statements notice',
        body: 'Guidance will be shared at the briefing.',
      }),
      allPolicies,
    );
    expect(
      result.findings.find((f) => f.ruleId === 'disclaimer-forward-looking'),
    ).toBeUndefined();
  });
});

describe('clean content', () => {
  it("a clean body returns overallSeverity 'pass' with all-pass findings", () => {
    const result = aiService.reviewContent(baseInput(), allPolicies);
    expect(result.findings.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(finding.severity, `${finding.ruleId} should pass`).toBe('pass');
    }
    expect(result.overallSeverity).toBe('pass');
  });
});

describe('overallSeverity aggregation', () => {
  const cases: [string, ReviewInput][] = [
    ['clean', baseInput()],
    ['warn-only', baseInput({ body: 'This revolutionary charger cuts wait times.' })],
    [
      'warn+block',
      baseInput({
        classification: 'Restricted',
        body: 'Our revolutionary charger is 3x faster than the ND-9.',
        regionCodes: ['EMEA'],
      }),
    ],
    [
      'block via disclaimer',
      baseInput({
        classification: 'Restricted',
        body: 'Guidance for the second half will be shared at the briefing.',
      }),
    ],
  ];

  it.each(cases)('overallSeverity equals the worst finding severity (%s)', (_label, input) => {
    const result = aiService.reviewContent(input, allPolicies);
    expect(result.overallSeverity).toBe(worstOf(result.findings));
  });

  it('with an empty policy set there are no findings and overallSeverity is pass', () => {
    const result = aiService.reviewContent(baseInput(), []);
    expect(result.findings).toEqual([]);
    expect(result.overallSeverity).toBe('pass');
  });
});

/* ------------------------------------------------------------------ */
/* Deepened rule groups — FR-BG-15/16, 21, 23, 25 and the scores        */
/* ------------------------------------------------------------------ */

/** The reference libraries the library-backed groups read. */
const ctx = { db };

/** Reviewed text is always `${title}\n${body}` — spans index into it. */
function reviewedText(input: ReviewInput): string {
  return `${input.title}\n${input.body}`;
}

describe('FR-BG-23 inclusive language', () => {
  it('flags a gendered collective noun and names the inclusive alternative', () => {
    const input = baseInput({ body: 'Our manpower covers every region around the clock.' });
    const result = aiService.reviewContent(input, allPolicies);
    const finding = result.findings.find(
      (f) => f.ruleId === 'inclusive-language' && f.severity === 'warn',
    );
    expect(finding?.policyId).toBe('POL-001');
    expect(finding?.message).toContain('workforce');
    expect(finding?.remediation).toContain('workforce');
    expect(reviewedText(input).slice(finding!.span!.start, finding!.span!.end)).toBe('manpower');
  });

  it('matches whole terms only — "chairman" does not fire inside "chairmanship"', () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'Her chairmanship of the committee ends in June.' }),
      allPolicies,
    );
    expect(
      result.findings.filter((f) => f.ruleId === 'inclusive-language' && f.severity === 'warn'),
    ).toEqual([]);
  });

  it('honours a caller-supplied term list instead of the defaults', () => {
    const result = aiService.reviewContent(
      baseInput({
        body: 'Our manpower covers every region, and the rollout is a synergy play.',
        inclusiveTerms: [{ match: 'synergy', suggest: 'shared benefit' }],
      }),
      allPolicies,
    );
    const warns = result.findings.filter(
      (f) => f.ruleId === 'inclusive-language' && f.severity === 'warn',
    );
    expect(warns).toHaveLength(1);
    expect(warns[0].message).toContain('shared benefit');
  });
});

describe('FR-BG-21 readability & mechanics', () => {
  it('flags a sentence over 30 words with a span covering it', () => {
    const long = `The ${'quiet '.repeat(34)}season begins.`;
    const input = baseInput({ body: long });
    const result = aiService.reviewContent(input, allPolicies);
    const finding = result.findings.find((f) => f.ruleId === 'readability-long-sentence');
    expect(finding?.severity).toBe('warn');
    expect(finding?.span).toBeDefined();
    expect(reviewedText(input).slice(finding!.span!.start, finding!.span!.end)).toContain('quiet');
  });

  it('flags passive constructions but not adjectives that merely end in -en', () => {
    const passive = aiService.reviewContent(
      baseInput({ body: 'Availability details will be confirmed at the event.' }),
      allPolicies,
    );
    expect(
      passive.findings.find((f) => f.ruleId === 'readability-passive-voice')?.severity,
    ).toBe('warn');

    const adjective = aiService.reviewContent(
      baseInput({ body: 'Pre-orders are open and the hotline is green across every region.' }),
      allPolicies,
    );
    expect(adjective.findings.find((f) => f.ruleId === 'readability-passive-voice')).toBeUndefined();
  });

  it('flags double spaces and repeated words', () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'Autumn savings  arrive with with simple offers.' }),
      allPolicies,
    );
    expect(result.findings.find((f) => f.ruleId === 'mechanics-double-space')?.severity).toBe(
      'warn',
    );
    const repeat = result.findings.find((f) => f.ruleId === 'mechanics-repeated-word');
    expect(repeat?.severity).toBe('warn');
    expect(repeat?.message).toContain('with');
  });

  it('clean mechanics contribute one pass finding naming the sentence length', () => {
    const result = aiService.reviewContent(baseInput(), allPolicies);
    const finding = result.findings.find((f) => f.ruleId === 'readability-mechanics');
    expect(finding?.severity).toBe('pass');
    expect(finding?.message).toContain('words per sentence');
  });
});

describe('FR-BG-25 approved terminology', () => {
  it('without the glossary library the group reports itself as not evaluated', () => {
    const result = aiService.reviewContent(baseInput(), allPolicies);
    const finding = result.findings.find((f) => f.ruleId === 'terminology-approved-term');
    expect(finding?.severity).toBe('pass');
    expect(finding?.message).toContain('not evaluated');
  });

  it('flags an avoided variant and names the approved rendering', () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'Preorder now — every preorder ships on launch day.' }),
      allPolicies,
      ctx,
    );
    const finding = result.findings.find(
      (f) => f.ruleId === 'terminology-approved-term' && f.severity === 'warn',
    );
    expect(finding?.message).toContain('pre-order');
    expect(finding?.remediation).toContain('pre-order');
  });

  it('only glossary entries for the reviewed locale are applied', () => {
    const body = 'كل عملية شراء تشملها الكفالة لمدة عامين.';
    const enUS = aiService.reviewContent(baseInput({ body }), allPolicies, ctx);
    expect(
      enUS.findings.filter((f) => f.ruleId === 'terminology-approved-term' && f.severity === 'warn'),
    ).toEqual([]);

    const arSA = aiService.reviewContent(
      baseInput({ body, locale: 'ar-SA' }),
      allPolicies,
      ctx,
    );
    const finding = arSA.findings.find(
      (f) => f.ruleId === 'terminology-approved-term' && f.severity === 'warn',
    );
    // GLS-010 avoids 'الكفالة'; the approved form carries a transliteration.
    expect(finding?.message).toContain('الضمان المحدود');
    expect(finding?.message).toContain('al-daman al-mahdud');
  });
});

describe('FR-BG-15/16 legal clause library', () => {
  const clauseInput = (overrides: Partial<ReviewInput> = {}) =>
    baseInput({
      regionIds: ['REG-EMEA'],
      locale: 'en-GB',
      channelKind: 'press',
      reviewDate: '2026-08-13',
      ...overrides,
    });

  it('resolves jurisdictions narrowest-first and records the required clause ids', () => {
    const result = aiService.reviewContent(clauseInput(), allPolicies, ctx);
    // Narrowest first: the national jurisdictions (KSA, FR) precede the blocs
    // they sit inside (GCC, EU), and GLOBAL is always the floor. JP is absent
    // because it maps to REG-APAC, which this input does not scope to.
    expect(result.context.jurisdictionCodes).toEqual(['KSA', 'FR', 'GCC', 'EU', 'GLOBAL']);
    expect(result.context.jurisdictionIds).toEqual([
      'JUR-KSA',
      'JUR-FR',
      'JUR-GCC',
      'JUR-EU',
      'JUR-GLOBAL',
    ]);
    expect(result.context.regionIds).toEqual(['REG-EMEA']);
    expect(result.context.locale).toBe('en-GB');
    expect(result.context.channelKind).toBe('press');
    // LGL-001 is superseded by LGL-002, so only the current version is required.
    expect(result.context.requiredClauseIds).toEqual(['LGL-002']);
  });

  it('a missing mandated disclaimer blocks and names the clause', () => {
    const result = aiService.reviewContent(clauseInput(), allPolicies, ctx);
    const finding = result.findings.find((f) => f.ruleId === 'legal-clause-required');
    expect(finding?.severity).toBe('block');
    expect(finding?.policyId).toBe('POL-005');
    expect(finding?.message).toContain('LGL-002');
    expect(finding?.remediation).toContain('forward-looking statements');
    expect(result.overallSeverity).toBe('block');
  });

  it('the mandated clause pasted into the copy satisfies the requirement', () => {
    const clause = db.legalClauses.find((c) => c.id === 'LGL-002')!;
    const result = aiService.reviewContent(
      clauseInput({ body: `Autumn savings arrive next week. ${clause.text}` }),
      allPolicies,
      ctx,
    );
    expect(result.findings.find((f) => f.ruleId === 'legal-clause-required')).toBeUndefined();
    const pass = result.findings.find((f) => f.ruleId === 'legal-clause-library');
    expect(pass?.severity).toBe('pass');
    expect(pass?.message).toContain('LGL-002');
  });

  it('a superseded clause version in the copy warns with the replacing version and date', () => {
    const superseded = db.legalClauses.find((c) => c.id === 'LGL-001')!;
    const result = aiService.reviewContent(
      clauseInput({ body: `Autumn savings arrive next week. ${superseded.text}` }),
      allPolicies,
      ctx,
    );
    const finding = result.findings.find((f) => f.ruleId === 'legal-clause-superseded');
    expect(finding?.severity).toBe('warn');
    expect(finding?.message).toContain('superseded by v2, effective 2026-07-01');
    expect(finding?.remediation).toContain('LGL-002');
  });

  it('category-restricted clauses are only required when a product category is supplied', () => {
    const withoutCategory = aiService.reviewContent(
      clauseInput({ channelKind: 'web' }),
      allPolicies,
      ctx,
    );
    expect(withoutCategory.context.requiredClauseIds).not.toContain('LGL-007');

    const withCategory = aiService.reviewContent(
      clauseInput({ channelKind: 'web', productCategory: 'enterprise-network' }),
      allPolicies,
      ctx,
    );
    expect(withCategory.context.requiredClauseIds).toContain('LGL-007');
  });

  it('without ctx the clause group reports itself as not evaluated and records no clause ids', () => {
    const result = aiService.reviewContent(clauseInput(), allPolicies);
    const finding = result.findings.find((f) => f.ruleId === 'legal-clause-library');
    expect(finding?.severity).toBe('pass');
    expect(finding?.message).toContain('not evaluated');
    expect(result.context.requiredClauseIds).toEqual([]);
    expect(result.context.jurisdictionCodes).toEqual([]);
  });

  it('is deterministic with the reference libraries attached', () => {
    const input = clauseInput({ body: 'Our revolutionary charger is 3x faster. Preorder today.' });
    const first = aiService.reviewContent(input, allPolicies, ctx);
    const second = aiService.reviewContent(input, allPolicies, ctx);
    expect(second).toEqual(first);
    const third = aiService.reviewContent(
      clauseInput({ body: 'Our revolutionary charger is 3x faster. Preorder today.' }),
      allPolicies,
      ctx,
    );
    expect(third).toEqual(first);
  });
});

describe('FR-BG-22 scores', () => {
  it('clean copy scores 100 across tone, readability and compliance', () => {
    const result = aiService.reviewContent(baseInput(), allPolicies);
    expect(result.scores).toEqual({
      toneScore: 100,
      readabilityScore: 100,
      complianceScore: 100,
    });
  });

  it('toneScore deducts per voice and inclusiveness hit', () => {
    const result = aiService.reviewContent(
      baseInput({ body: 'This revolutionary rollout doubles our manpower.' }),
      allPolicies,
    );
    // 100 − 10 (one banned hype term) − 8 (one non-inclusive term).
    expect(result.scores.toneScore).toBe(82);
  });

  it('complianceScore deducts 25 per compliance block and 10 per compliance warn', () => {
    const result = aiService.reviewContent(
      baseInput({
        body: 'The new charger is 3x faster than the previous generation.',
        regionCodes: ['EMEA'],
      }),
      allPolicies,
    );
    // One POL-002 block, no compliance warns.
    expect(result.scores.complianceScore).toBe(75);
  });

  it('readabilityScore falls for long, dense sentences and stays a clamped integer', () => {
    const dense = `${'Interoperability considerations notwithstanding, '.repeat(12)}the transformation continues.`;
    const result = aiService.reviewContent(baseInput({ body: dense }), allPolicies);
    expect(Number.isInteger(result.scores.readabilityScore)).toBe(true);
    expect(result.scores.readabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.scores.readabilityScore).toBeLessThan(60);
  });
});

describe('finding spans', () => {
  it('a banned-hype span slices the offending fragment out of the reviewed text', () => {
    const input = baseInput({ body: 'This revolutionary charger cuts wait times.' });
    const result = aiService.reviewContent(input, allPolicies);
    const finding = result.findings.find((f) => f.ruleId === 'brand-voice-banned-hype');
    expect(reviewedText(input).slice(finding!.span!.start, finding!.span!.end)).toBe(
      'revolutionary',
    );
  });

  it('a claims span slices the claim, and an alt-text span is title-offset correctly', () => {
    const claimInput = baseInput({ body: 'The charger is 3x faster than before.' });
    const claim = aiService
      .reviewContent(claimInput, allPolicies)
      .findings.find((f) => f.ruleId === 'claims-substantiation' && f.severity !== 'pass');
    expect(reviewedText(claimInput).slice(claim!.span!.start, claim!.span!.end)).toBe('3x faster');

    const mediaInput = baseInput({ body: 'The chart below shows the savings.' });
    const media = aiService
      .reviewContent(mediaInput, allPolicies)
      .findings.find((f) => f.ruleId === 'a11y-alt-text' && f.severity === 'warn');
    expect(reviewedText(mediaInput).slice(media!.span!.start, media!.span!.end)).toBe('chart');
  });

  it('every finding carries a confidence in 0–1 and a remediation line', () => {
    const result = aiService.reviewContent(
      baseInput({
        body: 'Our revolutionary charger is 3x faster. The chart shows more.',
        classification: 'Restricted',
      }),
      allPolicies,
      ctx,
    );
    for (const finding of result.findings) {
      expect(finding.confidence, finding.ruleId).toBeGreaterThan(0);
      expect(finding.confidence, finding.ruleId).toBeLessThanOrEqual(1);
      expect(finding.remediation, finding.ruleId).toBeTruthy();
    }
  });
});

/**
 * Mirrors ContentDetail.handleRunReview: brand guardrails unioned with every
 * block-enforced policy, run against the content's current version and its
 * campaign's regions — and, like that caller, with no `ctx`, so the
 * library-backed groups report themselves as not evaluated. Keeps the demo
 * beats honest — the warn/block counts below are quoted in
 * docs/DEMO_SCRIPT.md step 5.
 */
function reviewSeededContent(contentId: string, reviewDate: string) {
  const content = db.contents.find((c) => c.id === contentId);
  if (!content) throw new Error(`seed content ${contentId} is missing`);
  const contentBrand = db.brands.find((b) => b.id === content.brandId);
  if (!contentBrand) throw new Error(`brand ${content.brandId} is missing`);
  const version =
    db.contentVersions.find((v) => v.id === content.currentVersionId) ??
    db.contentVersions.find((v) => v.contentId === content.id);
  if (!version) throw new Error(`no version for ${contentId}`);
  const campaign = content.campaignId
    ? db.campaigns.find((c) => c.id === content.campaignId)
    : undefined;

  const ids = new Set<string>(contentBrand.guardrailPolicyIds ?? []);
  for (const p of db.policies) if (p.enforcement === 'block') ids.add(p.id);

  return aiService.reviewContent(
    {
      title: content.title,
      body: version.body,
      brand: contentBrand,
      classification: content.classification,
      regionCodes: campaign
        ? campaign.regionIds
            .map((rid) => db.regions.find((r) => r.id === rid)?.code)
            .filter((code): code is string => Boolean(code))
        : undefined,
      campaignStartDate: campaign?.startDate,
      reviewDate,
    },
    db.policies.filter((p) => ids.has(p.id)),
  );
}

function tally(findings: ReviewFinding[]) {
  return {
    pass: findings.filter((f) => f.severity === 'pass').length,
    warn: findings.filter((f) => f.severity === 'warn').length,
    block: findings.filter((f) => f.severity === 'block').length,
  };
}

/** The dataset's "today"; the engine is pure, so the date must be fixed here. */
const DEMO_REVIEW_DATE = '2026-08-13';

describe('seeded demo content review results', () => {
  it('CNT-011 is the enforcement beat — 5 pass, 3 warn, 2 block, all blocks from POL-002', () => {
    const content = db.contents.find((c) => c.id === 'CNT-011');
    // Status must be In Review for the check to flip it to Rework.
    expect(content?.status).toBe('In Review');

    const result = reviewSeededContent('CNT-011', DEMO_REVIEW_DATE);
    expect(tally(result.findings)).toEqual({ pass: 5, warn: 3, block: 2 });
    expect(result.overallSeverity).toBe('block');
    expect(
      result.findings
        .filter((f) => f.severity === 'block')
        .every((f) => f.policyId === 'POL-002'),
    ).toBe(true);
  });

  it('CNT-004 is the warn-only beat — 7 pass, 1 warn, no blocks', () => {
    const result = reviewSeededContent('CNT-004', DEMO_REVIEW_DATE);
    expect(tally(result.findings)).toEqual({ pass: 7, warn: 1, block: 0 });
    expect(result.overallSeverity).toBe('warn');
  });

  it('CNT-009 passes cleanly — no warn or block findings', () => {
    const result = reviewSeededContent('CNT-009', DEMO_REVIEW_DATE);
    expect(result.overallSeverity).toBe('pass');
    expect(tally(result.findings).warn + tally(result.findings).block).toBe(0);
  });
});
