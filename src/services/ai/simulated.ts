/**
 * Deterministic simulated AI provider (BLUEPRINT.md Part 10 §3).
 *
 * Template strings composed from the actual seed record fields — same input,
 * same output. No randomness, no network. The interface in `./index.ts` is
 * the contract; a real LLM provider slots behind the same seam later.
 */

import type {
  Brief,
  Channel,
  ChannelConstraint,
  ChannelKind,
  Content,
  ContentType,
  CustomerPersona,
  Idea,
  Jurisdiction,
  JurisdictionCode,
  LegalClause,
  LegalClauseKind,
  Policy,
  ReviewContext,
  ReviewFinding,
  ReviewScores,
  ReviewSpan,
  SeedDB,
} from "@/data/types";
import { campaignRoi } from "@/data/selectors";
import type {
  AIContext,
  AIDraft,
  AIReviewResult,
  AIService,
  CampaignProposal,
  ContentVariant,
  CreativeBrief,
  CreativeDeliverable,
  RefinedDraft,
  ReviewInput,
  VariantRequest,
} from "./index";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** First sentence of a block of copy, period included. */
function firstSentence(text: string): string {
  const idx = text.indexOf(". ");
  return idx === -1 ? text.trim() : text.slice(0, idx + 1).trim();
}

function isBrief(input: Brief | Content): input is Brief {
  return "objective" in input && "keyMessages" in input;
}

/** Channel-appropriate closing line per content type — fixed vocabulary. */
const CLOSING_BY_TYPE: Record<ContentType, string> = {
  email: "Tap through to claim the offer before the window closes.",
  post: "Follow along and share your take — the conversation starts now.",
  PR: "Full details and media assets are available in the online newsroom.",
  script: "Thank you for everything you do — more updates to follow soon.",
  page: "Explore the full story and next steps on the page below.",
};

/* ------------------------------------------------------------------ */
/* Draft generation                                                    */
/* ------------------------------------------------------------------ */

function draftFromBrief(brief: Brief, ctx: AIContext): AIDraft {
  const campaign = ctx.db.campaigns.find((c) => c.id === brief.campaignId);
  const messages = brief.keyMessages.slice(0, 2).join(" ");
  const body = [
    `${firstSentence(brief.objective)}`,
    messages,
    `Drafted for ${campaign?.name ?? brief.title} — refine and route for approval.`,
  ]
    .filter(Boolean)
    .join(" ");
  return { title: `AI draft — ${brief.title}`, body };
}

function draftFromContent(content: Content, ctx: AIContext): AIDraft {
  const brief = content.briefId
    ? ctx.db.briefs.find((b) => b.id === content.briefId)
    : undefined;
  if (brief) {
    const campaign = ctx.db.campaigns.find((c) => c.id === brief.campaignId);
    const body = [
      firstSentence(brief.objective),
      brief.keyMessages[0] ?? "",
      brief.keyMessages[1] ?? "",
      CLOSING_BY_TYPE[content.contentType],
    ]
      .filter(Boolean)
      .join(" ");
    return {
      title: `AI draft — ${content.title}${campaign ? ` (${campaign.name})` : ""}`,
      body,
    };
  }
  const brand = ctx.db.brands.find((b) => b.id === content.brandId);
  const body = [
    `${content.title} — a fresh ${content.contentType} draft for ${brand?.name ?? content.brandId}.`,
    "This draft restates the current approved messaging in a tighter, channel-ready form.",
    CLOSING_BY_TYPE[content.contentType],
  ].join(" ");
  return { title: `AI draft — ${content.title}`, body };
}

/* ------------------------------------------------------------------ */
/* Campaign proposal                                                   */
/* ------------------------------------------------------------------ */

/** Keyword → channel-kind rules, applied to the idea's own text. */
function recommendChannelKinds(text: string): ChannelKind[] {
  const kinds: ChannelKind[] = ["email", "social"];
  if (/employee|internal|volunteer|leadership session/.test(text)) kinds.push("intranet");
  if (/launch|press|announce/.test(text)) kinds.push("press");
  if (/webinar|roundtable|event|conference/.test(text)) kinds.push("event");
  if (/pre-order|newsroom|support channel|online/.test(text)) kinds.push("web");
  return kinds;
}

function resolveChannels(kinds: ChannelKind[], channels: Channel[]): string[] {
  const ids: string[] = [];
  for (const kind of kinds) {
    const match = channels.find((c) => c.channelKind === kind);
    if (match && !ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

function proposeCampaign(idea: Idea, ctx: AIContext): CampaignProposal {
  const { db } = ctx;
  const text = `${idea.title} ${idea.description}`.toLowerCase();
  const brand = db.brands.find((b) => b.id === idea.brandId);
  const region = db.regions.find((r) => r.id === idea.regionId);

  const channelIds = resolveChannels(recommendChannelKinds(text), db.channels);

  const audienceKind = /employee|internal/.test(text)
    ? "employee"
    : /press|media/.test(text)
      ? "press"
      : "customer";
  const audience =
    db.audiences.find(
      (a) => a.audienceKind === audienceKind && a.regionIds.includes(idea.regionId),
    ) ??
    db.audiences.find((a) => a.audienceKind === audienceKind) ??
    db.audiences[0];

  // Budget: brand's average campaign allocation, scaled by the idea score.
  const brandCampaigns = db.campaigns.filter((c) => c.brandId === idea.brandId);
  const avgAllocation =
    brandCampaigns.length > 0
      ? brandCampaigns.reduce((sum, c) => sum + c.budgetAllocation, 0) /
        brandCampaigns.length
      : 300000;
  const budgetEstimate =
    Math.round((avgAllocation * (0.5 + idea.score / 200)) / 5000) * 5000;

  // ROI: mean historical campaignRoi across the brand's measured campaigns
  // (same selector the Performance and Budget pages read — one join, one truth).
  const brandName = brand?.name ?? idea.brandId;
  const measured = brandCampaigns
    .map((campaign) => ({ campaign, roi: campaignRoi(db, campaign.id).roi }))
    .filter((m): m is { campaign: (typeof brandCampaigns)[number]; roi: number } => m.roi !== null);
  const estimatedRoi =
    measured.length > 0
      ? Math.round(
          (measured.reduce((sum, m) => sum + m.roi, 0) / measured.length) * 100,
        ) / 100
      : null;
  const measuredStatuses = [...new Set(measured.map((m) => m.campaign.status.toLowerCase()))]
    .sort()
    .join(" and ");
  const roiNote =
    estimatedRoi !== null
      ? `Based on ${brandName}'s ${measured.length} ${measuredStatuses} campaign${
          measured.length === 1 ? "" : "s"
        } with attributed business value`
      : `No ${brandName} campaigns with attributed business value yet — ROI not estimable`;

  const kpiSuggestions = [
    `Reach — ${(Math.max(idea.score, 40) * 100000).toLocaleString("en-US")} impressions across ${channelIds.length} recommended channels in the first 8 weeks`,
    `Engagement — ${Math.max(20, Math.round(idea.score / 3))}% interaction rate on the primary channel`,
    `Conversion — ${(Math.max(idea.score, 40) * 25).toLocaleString("en-US")} tracked conversions against the campaign goal`,
  ];

  return {
    name: `${idea.title} campaign`,
    objective: `${firstSentence(idea.description)} Proposed for ${brand?.name ?? idea.brandId} in ${region?.code ?? idea.regionId}, seeded from ideation score ${idea.score}/100.`,
    channels: channelIds,
    audienceId: audience?.id ?? "",
    budgetEstimate,
    kpiSuggestions,
    estimatedRoi,
    roiNote,
  };
}

/* ------------------------------------------------------------------ */
/* Summaries                                                           */
/* ------------------------------------------------------------------ */

function summarize(
  entityKind: string,
  records: ReadonlyArray<Record<string, unknown>>,
): string {
  const kind = entityKind.toLowerCase();
  if (records.length === 0) return `No ${kind} records in scope.`;

  const byStatus = new Map<string, number>();
  let latest = "";
  for (const r of records) {
    const status = typeof r.status === "string" ? r.status : undefined;
    if (status) byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    const updated = typeof r.updatedAt === "string" ? r.updatedAt : "";
    if (updated > latest) latest = updated;
  }
  const breakdown = [...byStatus.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], DEFAULT_LOCALE))
    .map(([status, count]) => `${count} ${status.toLowerCase()}`)
    .join(", ");

  return [
    `${records.length} ${kind} record${records.length === 1 ? "" : "s"} in scope`,
    breakdown ? ` — ${breakdown}` : "",
    latest ? `. Last updated ${latest.slice(0, 10)}.` : ".",
  ].join("");
}

/* ------------------------------------------------------------------ */
/* Brand & compliance rule engine (deterministic)                      */
/* ------------------------------------------------------------------ */

/** Hype vocabulary POL-001 bans outright. */
const BANNED_HYPE = ["revolutionary", "world-class", "best ever", "#1"] as const;

/** Product names POL-005 requires the ™ mark on at first mention. */
const TRADEMARKED_PRODUCTS = ["Volt 5G", "GridWorks Edge"] as const;

const SEVERITY_RANK: Record<ReviewFinding["severity"], number> = {
  pass: 0,
  warn: 1,
  block: 2,
};

/** Locale a review runs as when the caller supplies none. */
const DEFAULT_LOCALE = "en-US";

/**
 * Jurisdiction precedence, narrowest first (FR-BG-19).
 *
 * National jurisdictions lead, then the blocs they sit inside, then the global
 * floor — so KSA outranks GCC and FR outranks EU. Every JurisdictionCode must
 * appear here: `indexOf` returns -1 for anything missing, which would sort an
 * unlisted jurisdiction ahead of the narrowest real one.
 */
const JURISDICTION_PRECEDENCE: JurisdictionCode[] = [
  "KSA",
  "FR",
  "JP",
  "GCC",
  "EU",
  "GLOBAL",
];

/** Sentences longer than this read as dense in every channel (FR-BG-21). */
const LONG_SENTENCE_WORDS = 30;

/** Short quoted excerpt around a match — the "offending fragment". */
function excerptAt(text: string, index: number, matchLength: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + matchLength + 24);
  const head = start > 0 ? "…" : "";
  const tail = end < text.length ? "…" : "";
  return `${head}${text.slice(start, end).replace(/\s+/g, " ").trim()}${tail}`;
}

function span(start: number, end: number): ReviewSpan {
  return { start, end };
}

/** Escape a literal for embedding in a RegExp source. */
function escapeRe(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-term matcher for a literal: letters/digits either side disqualify the
 * hit, so 'manned' never fires inside 'unmanned'. Unicode-aware so the Arabic
 * lexicon matches on the same rule as the English one.
 */
function wholeTermRe(literal: string, caseInsensitive: boolean): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRe(literal)}(?![\\p{L}\\p{N}])`,
    caseInsensitive ? "giu" : "gu",
  );
}

/* -- FR-BG-23 · inclusive language --------------------------------- */

/** One non-inclusive phrasing and the wording that replaces it. */
export interface InclusiveTermRule {
  /** The phrasing to flag — matched as a whole term, case-insensitively. */
  match: string;
  /** The inclusive wording the reviewer should use instead. */
  suggest: string;
  /** Why the substitution matters, shown with the finding. */
  note?: string;
}

/**
 * The default FR-BG-23 list: gendered job and collective nouns, ableist
 * idioms, and age-coded phrasing. Callers may pass their own list through
 * `ReviewInput.inclusiveTerms`; the engine never adds to it at runtime.
 */
export const DEFAULT_INCLUSIVE_TERMS: InclusiveTermRule[] = [
  { match: "manpower", suggest: "workforce", note: "Gendered collective noun." },
  { match: "man-hours", suggest: "work hours", note: "Gendered unit of effort." },
  { match: "manned", suggest: "staffed", note: "Gendered verb form." },
  { match: "mankind", suggest: "people", note: "Gendered collective noun." },
  { match: "chairman", suggest: "chair", note: "Gendered job title." },
  { match: "chairmen", suggest: "chairs", note: "Gendered job title." },
  { match: "spokesman", suggest: "spokesperson", note: "Gendered job title." },
  { match: "salesman", suggest: "salesperson", note: "Gendered job title." },
  { match: "salesmen", suggest: "salespeople", note: "Gendered job title." },
  { match: "businessman", suggest: "business leader", note: "Gendered job title." },
  { match: "he or she", suggest: "they", note: "Binary phrasing; the singular 'they' covers everyone." },
  { match: "guys", suggest: "everyone", note: "Gendered address for a mixed group." },
  { match: "crazy", suggest: "remarkable", note: "Ableist idiom drawn from mental health." },
  { match: "insane", suggest: "striking", note: "Ableist idiom drawn from mental health." },
  { match: "lame", suggest: "weak", note: "Ableist idiom drawn from disability." },
  { match: "crippled", suggest: "weakened", note: "Ableist idiom drawn from disability." },
  { match: "tone deaf", suggest: "out of touch", note: "Ableist idiom drawn from disability." },
  { match: "blind spot", suggest: "unseen risk", note: "Ableist idiom drawn from disability." },
  { match: "young and dynamic", suggest: "energetic", note: "Age-coded description of a team." },
  { match: "digital native", suggest: "digitally fluent", note: "Age-coded proxy for a generation." },
  { match: "recent grads", suggest: "early-career colleagues", note: "Age-coded audience label." },
];

/* -- FR-BG-21 · readability & mechanics ---------------------------- */

/**
 * Be-verb + past participle is the passive marker. The stoplist holds the
 * adjectives that merely end in -ed / -en ('is open', 'are green') so the
 * heuristic does not fire on them.
 */
const PASSIVE_MARKER_RE =
  /(?<![\p{L}\p{N}])(is|are|was|were|be|been|being)\s+(\p{L}{2,}(?:ed|en))(?![\p{L}])/giu;

const PASSIVE_STOPWORDS = new Set([
  "open",
  "even",
  "often",
  "seven",
  "eleven",
  "green",
  "keen",
  "screen",
  "women",
  "children",
  "golden",
  "sudden",
  "garden",
  "kitchen",
  "wooden",
  "citizen",
  "dozen",
  "speed",
  "need",
  "indeed",
  "seed",
  "feed",
  "red",
]);

interface SentenceSpan {
  text: string;
  start: number;
  end: number;
  words: number;
}

/** Words as the metrics count them — Unicode letters/digits, apostrophes and hyphens. */
function countWords(text: string): string[] {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
}

/**
 * Sentence boundaries with offsets, so a long-sentence finding can point at
 * the exact run of text. A newline ends a sentence too, which makes the title
 * its own unit rather than the head of the first body sentence.
 */
function sentenceSpans(text: string): SentenceSpan[] {
  const out: SentenceSpan[] = [];
  let start = 0;
  const push = (end: number) => {
    const raw = text.slice(start, end);
    if (raw.trim().length > 0) {
      out.push({ text: raw, start, end, words: countWords(raw).length });
    }
    start = end;
  };
  for (let i = 0; i < text.length; i += 1) {
    if (".!?\n۔؟".includes(text[i])) push(i + 1);
  }
  push(text.length);
  return out;
}

interface CopyMetrics {
  words: number;
  sentences: number;
  avgSentenceWords: number;
  longWordRatio: number;
}

function copyMetrics(text: string): CopyMetrics {
  const words = countWords(text);
  const sentences = Math.max(1, sentenceSpans(text).length);
  const long = words.filter((w) => w.length >= 9).length;
  return {
    words: words.length,
    sentences,
    avgSentenceWords: words.length / sentences,
    longWordRatio: words.length === 0 ? 0 : long / words.length,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/* -- FR-BG-15 / 16 · legal clause library -------------------------- */

/** Region ids the content targets, and the jurisdictions they resolve to. */
interface ResolvedScope {
  regionIds: string[];
  jurisdictions: Jurisdiction[];
}

function resolveScope(input: ReviewInput, db?: SeedDB): ResolvedScope {
  const codes = input.regionCodes ?? [];
  const regionIds =
    input.regionIds && input.regionIds.length > 0
      ? [...input.regionIds]
      : db && codes.length > 0
        ? db.regions.filter((r) => codes.includes(r.code)).map((r) => r.id)
        : [];
  if (!db) return { regionIds, jurisdictions: [] };
  const matched = db.jurisdictions.filter((j) =>
    j.regionIds.some((rid) => regionIds.includes(rid)),
  );
  // No region signal at all → the GLOBAL floor still applies.
  const scope =
    matched.length > 0 ? matched : db.jurisdictions.filter((j) => j.code === "GLOBAL");
  return {
    regionIds,
    jurisdictions: [...scope].sort(
      (a, b) =>
        JURISDICTION_PRECEDENCE.indexOf(a.code) - JURISDICTION_PRECEDENCE.indexOf(b.code) ||
        a.id.localeCompare(b.id, DEFAULT_LOCALE),
    ),
  };
}

/** Normalised form both sides of a clause-presence test are reduced to. */
function normalizeForMatch(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * A clause counts as present when the copy carries its opening eight words.
 * Mandated clauses are pasted verbatim, so the opening is a stable fingerprint
 * that survives the trailing edits reviewers make (and works in any script).
 * Eight words is the width at which successive versions of the same clause
 * diverge — five would let a superseded version satisfy its replacement.
 */
function clauseFingerprint(clause: LegalClause): string {
  return normalizeForMatch(clause.text).split(" ").slice(0, 8).join(" ");
}

/** Clauses in force for this jurisdiction + locale + channel (+ category). */
function clauseCandidates(db: SeedDB, jurisdictionIds: string[], input: ReviewInput, locale: string) {
  const asOf = input.reviewDate ? input.reviewDate.slice(0, 10) : "";
  return db.legalClauses
    .filter(
      (c) =>
        jurisdictionIds.includes(c.jurisdictionId) &&
        c.locale === locale &&
        (input.channelKind === undefined || c.channelKinds.includes(input.channelKind)) &&
        // Category-restricted clauses apply only when the caller names a category.
        (c.productCategory === undefined || c.productCategory === input.productCategory) &&
        (asOf === "" || c.effectiveFrom <= asOf),
    )
    .sort((a, b) => a.id.localeCompare(b.id, DEFAULT_LOCALE));
}

/** The in-force clause that replaced `clause`, if it is already effective. */
function successorOf(db: SeedDB, clause: LegalClause, asOf: string): LegalClause | undefined {
  return db.legalClauses.find(
    (c) => c.supersedesId === clause.id && (asOf === "" || c.effectiveFrom <= asOf),
  );
}

const CLAUSE_KIND_LABEL: Record<LegalClauseKind, string> = {
  disclaimer: "disclaimer",
  trademark: "trademark attribution",
  regulatory: "regulatory statement",
};

/**
 * Deterministic rule engine behind `reviewContent`. Pure function of its
 * inputs — no clock, no randomness: same input object → same findings. Each
 * POL-00x rule group runs only when that policy is in the supplied set, and a
 * group with zero violations contributes an explicit pass finding so the
 * reviewer sees what was checked, not just what failed.
 *
 * Rule groups, by gating policy:
 *   POL-001  brand voice (sentence case, banned hype, tone)
 *            FR-BG-23 inclusive language
 *            FR-BG-21 readability & mechanics
 *            FR-BG-25 approved terminology            [needs ctx]
 *   POL-002  claims substantiation
 *   POL-003  press embargo
 *   POL-004  accessibility alt text
 *   POL-005  FR-BG-15/16 legal clause library         [needs ctx]
 *            forward-looking disclaimer, trademark first use
 *
 * `ctx` carries the reference libraries (`db.jurisdictions`,
 * `db.legalClauses`, `db.glossaryTerms`). Without it the library-backed groups
 * report themselves as not evaluated rather than guessing, and the
 * forward-looking check falls back to its phrase heuristic.
 */
function reviewContent(
  input: ReviewInput,
  policies: Policy[],
  ctx?: AIContext,
): AIReviewResult {
  const policyById = new Map(policies.map((p) => [p.id, p]));
  const findings: ReviewFinding[] = [];
  const text = `${input.title}\n${input.body}`;
  /** Body offsets are title-relative; spans are always into `text`. */
  const bodyOffset = input.title.length + 1;
  const locale = input.locale ?? DEFAULT_LOCALE;
  const db = ctx?.db;
  const asOf = input.reviewDate ? input.reviewDate.slice(0, 10) : "";

  const scope = resolveScope(input, db);
  const jurisdictionIds = scope.jurisdictions.map((j) => j.id);
  const jurisdictionCodes = scope.jurisdictions.map((j) => j.code);
  const scopeLabel =
    jurisdictionCodes.length > 0 ? jurisdictionCodes.join(" · ") : "no jurisdiction resolved";

  // Deduction counters feeding toneScore (FR-BG-22).
  let hypeHits = 0;
  let titleCaseHits = 0;
  let inclusiveHits = 0;
  let terminologyHits = 0;

  /* -- POL-001 · brand voice ---------------------------------------- */
  if (policyById.has("POL-001")) {
    let voiceViolations = 0;

    // (a) Sentence-case: a run of >2 Title Case Words inside body copy.
    const titleCaseRun = /\b[A-Z][a-z]+(?: [A-Z][a-z]+){2,}\b/g;
    for (const m of input.body.matchAll(titleCaseRun)) {
      voiceViolations += 1;
      titleCaseHits += 1;
      const at = bodyOffset + (m.index ?? 0);
      findings.push({
        ruleId: "brand-voice-sentence-case",
        confidence: 0.72,
        policyId: "POL-001",
        severity: "warn",
        message: `Title Case run breaks the sentence-case rule: "${m[0]}".`,
        span: span(at, at + m[0].length),
        remediation: `Lower-case the run to "${m[0].charAt(0)}${m[0].slice(1).toLowerCase()}", keeping only proper nouns capitalised.`,
      });
    }

    // (b) Banned hype vocabulary — whole terms only ("best ever" must not
    // fire inside "best everyday", "#1" not inside "#10"), every occurrence.
    for (const term of BANNED_HYPE) {
      const termRe = new RegExp(`(?<![A-Za-z0-9])${escapeRe(term)}(?![A-Za-z0-9])`, "gi");
      for (const m of text.matchAll(termRe)) {
        voiceViolations += 1;
        hypeHits += 1;
        const at = m.index ?? 0;
        findings.push({
          ruleId: "brand-voice-banned-hype",
          confidence: 0.96,
          policyId: "POL-001",
          severity: "warn",
          message: `Banned hype term "${term}" found: "${excerptAt(text, at, term.length)}".`,
          span: span(at, at + term.length),
          remediation: `Delete "${term}" and state the concrete benefit it stands in for.`,
        });
      }
    }

    // (c) Tone adherence note — pass when the voice checks are clean.
    const toneClause = input.brand.tone
      ? firstSentence(input.brand.tone)
      : "no documented tone";
    findings.push({
      ruleId: "brand-voice-tone",
      confidence: 0.68,
      policyId: "POL-001",
      severity: voiceViolations > 0 ? "warn" : "pass",
      message:
        voiceViolations > 0
          ? `Tone drift — ${voiceViolations} voice violation${voiceViolations === 1 ? "" : "s"} against the ${input.brand.name} voice ("${toneClause}").`
          : `Copy holds the ${input.brand.name} voice ("${toneClause}").`,
      remediation:
        voiceViolations > 0
          ? `Rewrite the flagged fragments against the ${input.brand.name} voice guide before re-running the check.`
          : "No action — the voice checks are clean.",
    });

    /* -- FR-BG-23 · inclusive language ------------------------------ */
    const inclusiveRules = input.inclusiveTerms ?? DEFAULT_INCLUSIVE_TERMS;
    for (const rule of inclusiveRules) {
      for (const m of text.matchAll(wholeTermRe(rule.match, true))) {
        inclusiveHits += 1;
        const at = m.index ?? 0;
        findings.push({
          ruleId: "inclusive-language",
          confidence: 0.86,
          policyId: "POL-001",
          severity: "warn",
          message: `"${m[0]}" is not inclusive — use "${rule.suggest}" instead${rule.note ? ` (${rule.note.replace(/\.$/, "").toLowerCase()})` : ""}.`,
          span: span(at, at + m[0].length),
          remediation: `Replace "${m[0]}" with "${rule.suggest}".`,
        });
      }
    }
    if (inclusiveHits === 0) {
      findings.push({
        ruleId: "inclusive-language",
        confidence: 0.86,
        policyId: "POL-001",
        severity: "pass",
        message: `No non-inclusive phrasing found across ${inclusiveRules.length} checked term${inclusiveRules.length === 1 ? "" : "s"}.`,
        remediation: "No action — the inclusive-language list is clean.",
      });
    }

    /* -- FR-BG-21 · readability & mechanics ------------------------- */
    let mechanicsIssues = 0;

    for (const sentence of sentenceSpans(text)) {
      if (sentence.words <= LONG_SENTENCE_WORDS) continue;
      mechanicsIssues += 1;
      findings.push({
        ruleId: "readability-long-sentence",
        confidence: 0.78,
        policyId: "POL-001",
        severity: "warn",
        message: `Sentence runs to ${sentence.words} words (limit ${LONG_SENTENCE_WORDS}): "${excerptAt(text, sentence.start, 0)}".`,
        span: span(sentence.start, sentence.end),
        remediation: `Split the sentence at its first clause break — aim for ${LONG_SENTENCE_WORDS} words or fewer.`,
      });
    }

    for (const m of text.matchAll(PASSIVE_MARKER_RE)) {
      if (PASSIVE_STOPWORDS.has(m[2].toLowerCase())) continue;
      mechanicsIssues += 1;
      const at = m.index ?? 0;
      findings.push({
        ruleId: "readability-passive-voice",
        confidence: 0.64,
        policyId: "POL-001",
        severity: "warn",
        message: `Passive construction "${m[0]}" slows the line down.`,
        span: span(at, at + m[0].length),
        remediation: `Name the actor and use the active verb — "${m[2].toLowerCase()}" becomes something the subject does.`,
      });
    }

    for (const m of text.matchAll(/(?<!\n) {2,}/g)) {
      mechanicsIssues += 1;
      const at = m.index ?? 0;
      findings.push({
        ruleId: "mechanics-double-space",
        confidence: 0.99,
        policyId: "POL-001",
        severity: "warn",
        message: `${m[0].length} consecutive spaces at character ${at} — copy uses single spacing.`,
        span: span(at, at + m[0].length),
        remediation: "Collapse the run to a single space.",
      });
    }

    for (const m of text.matchAll(
      /(?<![\p{L}\p{N}])(\p{L}{2,})(\s+)\1(?![\p{L}\p{N}])/giu,
    )) {
      mechanicsIssues += 1;
      const at = m.index ?? 0;
      findings.push({
        ruleId: "mechanics-repeated-word",
        confidence: 0.97,
        policyId: "POL-001",
        severity: "warn",
        message: `Repeated word "${m[1]}": "${excerptAt(text, at, m[0].length)}".`,
        span: span(at, at + m[0].length),
        remediation: `Delete the second "${m[1]}".`,
      });
    }

    const metrics = copyMetrics(text);
    if (mechanicsIssues === 0) {
      findings.push({
        ruleId: "readability-mechanics",
        confidence: 0.78,
        policyId: "POL-001",
        severity: "pass",
        message: `Sentence length, voice and mechanics are clean — ${metrics.avgSentenceWords.toFixed(1)} words per sentence across ${metrics.sentences} sentence${metrics.sentences === 1 ? "" : "s"}.`,
        remediation: "No action — the copy reads cleanly.",
      });
    }

    /* -- FR-BG-25 · approved terminology ---------------------------- */
    if (!db) {
      findings.push({
        ruleId: "terminology-approved-term",
        confidence: 0.5,
        policyId: "POL-001",
        severity: "pass",
        message: "Terminology not evaluated — no glossary library supplied to the run.",
        remediation: "Re-run the check with the glossary library attached to pick up lexicon drift.",
      });
    } else {
      const terms = db.glossaryTerms.filter((t) => t.locale === locale);
      for (const term of terms) {
        for (const variant of term.avoid) {
          // Case-sensitive: the lexicon encodes casing, so 'VOLT 5g' is a
          // distinct (banned) rendering from the approved 'Volt 5G'.
          for (const m of text.matchAll(wholeTermRe(variant, false))) {
            terminologyHits += 1;
            const at = m.index ?? 0;
            const approved = term.transliteration
              ? `${term.approved} (${term.transliteration})`
              : term.approved;
            findings.push({
              ruleId: "terminology-approved-term",
              confidence: 0.95,
              policyId: "POL-001",
              severity: "warn",
              message: `"${variant}" is a non-approved rendering of ${term.term} — the approved form is "${approved}".`,
              span: span(at, at + variant.length),
              remediation: `Replace "${variant}" with "${term.approved}".`,
            });
          }
        }
      }
      if (terminologyHits === 0) {
        findings.push({
          ruleId: "terminology-approved-term",
          confidence: 0.95,
          policyId: "POL-001",
          severity: "pass",
          message: `Terminology matches the approved lexicon — ${terms.length} ${locale} entr${terms.length === 1 ? "y" : "ies"} checked.`,
          remediation: "No action — every controlled term uses its approved rendering.",
        });
      }
    }
  }

  /* -- POL-002 · claims substantiation ------------------------------ */
  if (policyById.has("POL-002")) {
    const isEU = (input.regionCodes ?? []).includes("EMEA");
    const claimRe = /(\d+(?:\.\d+)?)\s*(x|%)\s*(faster|longer|better)/gi;
    const substantiation = /based on|tested|certified/i;
    let claims = 0;
    let unsubstantiated = 0;
    for (const m of text.matchAll(claimRe)) {
      claims += 1;
      // "Nearby" = a fixed window around the claim.
      const windowStart = Math.max(0, (m.index ?? 0) - 140);
      const windowEnd = Math.min(text.length, (m.index ?? 0) + m[0].length + 140);
      if (!substantiation.test(text.slice(windowStart, windowEnd))) {
        unsubstantiated += 1;
        const at = m.index ?? 0;
        findings.push({
          ruleId: "claims-substantiation",
          confidence: 0.88,
          policyId: "POL-002",
          severity: isEU ? "block" : "warn",
          message: `Performance claim "${m[0]}" has no substantiation ('based on', 'tested', or 'certified') nearby${
            isEU ? " — blocking for EU-region content" : ""
          }.`,
          span: span(at, at + m[0].length),
          remediation: `Add the substantiation source beside "${m[0]}" — for example "based on certified lab testing, July 2026" — or drop the figure.`,
        });
      }
    }
    if (unsubstantiated === 0) {
      findings.push({
        ruleId: "claims-substantiation",
        confidence: 0.88,
        policyId: "POL-002",
        severity: "pass",
        message:
          claims > 0
            ? `All ${claims} performance claim${claims === 1 ? "" : "s"} carry substantiation language.`
            : "No performance claims detected.",
        remediation: "No action — every performance claim is substantiated.",
      });
    }
  }

  /* -- POL-003 · press embargo -------------------------------------- */
  if (policyById.has("POL-003")) {
    const launchMatch = /\blaunch\w*/i.exec(text);
    const start = input.campaignStartDate ?? "";
    const asOf = input.reviewDate ?? "";
    const datesKnown = Boolean(start && asOf);
    if (launchMatch && datesKnown && asOf.slice(0, 10) < start.slice(0, 10)) {
      findings.push({
        ruleId: "embargo-launch-reference",
        confidence: 0.8,
        policyId: "POL-003",
        severity: "warn",
        message: `References the launch ("${excerptAt(text, launchMatch.index, launchMatch[0].length)}") before the campaign start date ${start.slice(0, 10)} — hold until the embargo lifts.`,
        span: span(launchMatch.index, launchMatch.index + launchMatch[0].length),
        remediation: `Hold distribution until ${start.slice(0, 10)}, or strip the launch reference from this version.`,
      });
    } else {
      findings.push({
        ruleId: "embargo-launch-reference",
        confidence: 0.8,
        policyId: "POL-003",
        severity: "pass",
        message: launchMatch
          ? datesKnown
            ? "Launch reference falls on or after the campaign start date."
            : "Launch reference found, but no campaign start/review date supplied — embargo timing not evaluated."
          : "No pre-embargo launch reference detected.",
        remediation: launchMatch && !datesKnown
          ? "Link the content to its campaign so the embargo window can be checked."
          : "No action — the embargo window is respected.",
      });
    }
  }

  /* -- POL-004 · accessibility alt-text ----------------------------- */
  if (policyById.has("POL-004")) {
    const mediaMention = /\b(image|chart|graph|infographic|photo|diagram)s?\b/i.exec(
      input.body,
    );
    const hasAltNote = /alt[ -]?text/i.test(input.body);
    if (mediaMention && !hasAltNote) {
      findings.push({
        ruleId: "a11y-alt-text",
        confidence: 0.7,
        policyId: "POL-004",
        severity: "warn",
        message: `Body references a ${mediaMention[1].toLowerCase()} ("${excerptAt(input.body, mediaMention.index, mediaMention[0].length)}") without an alt-text note.`,
        span: span(
          bodyOffset + mediaMention.index,
          bodyOffset + mediaMention.index + mediaMention[0].length,
        ),
        remediation: `Add an alt-text line describing the ${mediaMention[1].toLowerCase()} for screen-reader users.`,
      });
    } else {
      findings.push({
        ruleId: "a11y-alt-text",
        confidence: 0.7,
        policyId: "POL-004",
        severity: "pass",
        message: mediaMention
          ? "Visual media reference carries an alt-text note."
          : "No visual media references requiring alt text.",
        remediation: "No action — every referenced visual carries alt text.",
      });
    }
  }

  /* -- FR-BG-15 / 16 · clause resolution ----------------------------- */
  // Resolved outside the policy gate: the returned context reports which
  // clauses apply to this piece even when POL-005 is not in the run.
  const candidates = db ? clauseCandidates(db, jurisdictionIds, input, locale) : [];
  const requiredClauses = db
    ? candidates.filter((c) => successorOf(db, c, asOf) === undefined)
    : [];
  const requiredClauseIds = requiredClauses.map((c) => c.id);

  /* -- POL-005 · disclaimers, trademarks & clause library ------------ */
  if (policyById.has("POL-005")) {
    let disclaimersClean = true;

    if (!db) {
      findings.push({
        ruleId: "legal-clause-library",
        confidence: 0.5,
        policyId: "POL-005",
        severity: "pass",
        message: "Clause library not evaluated — no legal reference data supplied to the run.",
        remediation:
          "Re-run the check with the clause library attached to resolve mandated clauses by jurisdiction.",
      });
    } else {
      const missing: LegalClause[] = [];
      for (const clause of requiredClauses) {
        const jurisdiction = db.jurisdictions.find((j) => j.id === clause.jurisdictionId);
        const present = normalizeForMatch(text).includes(clauseFingerprint(clause));
        if (present) continue;
        missing.push(clause);
        disclaimersClean = false;
        findings.push({
          ruleId: "legal-clause-required",
          confidence: 0.92,
          policyId: "POL-005",
          // Disclaimers and regulatory statements are legally mandated —
          // shipping without them is a hold. Trademark attribution is a warn.
          severity: clause.kind === "trademark" ? "warn" : "block",
          message: `Required ${CLAUSE_KIND_LABEL[clause.kind]} ${clause.id} (v${clause.version}, ${jurisdiction?.code ?? clause.jurisdictionId} · ${clause.locale}, effective ${clause.effectiveFrom}) is missing from the copy.`,
          remediation: `Paste clause ${clause.id} verbatim: "${firstSentence(clause.text)}"`,
        });
      }

      // FR-BG-16 — the copy carries a version that a newer one has replaced.
      for (const clause of candidates) {
        const successor = successorOf(db, clause, asOf);
        if (!successor) continue;
        const at = normalizeForMatch(text).indexOf(clauseFingerprint(clause));
        if (at === -1) continue;
        disclaimersClean = false;
        findings.push({
          ruleId: "legal-clause-superseded",
          confidence: 0.9,
          policyId: "POL-005",
          severity: "warn",
          message: `Clause ${clause.id} (v${clause.version}) is in the copy but superseded by v${successor.version}, effective ${successor.effectiveFrom}.`,
          remediation: `Swap ${clause.id} for ${successor.id}: "${firstSentence(successor.text)}"`,
        });
      }

      if (missing.length === 0) {
        findings.push({
          ruleId: "legal-clause-library",
          confidence: 0.92,
          policyId: "POL-005",
          severity: "pass",
          message:
            requiredClauses.length > 0
              ? `All ${requiredClauses.length} mandated clause${requiredClauses.length === 1 ? "" : "s"} for ${scopeLabel} · ${locale} are present (${requiredClauseIds.join(", ")}).`
              : `No mandated clauses for ${scopeLabel} · ${locale}${input.channelKind ? ` · ${input.channelKind}` : ""}.`,
          remediation: "No action — the mandated clause set is complete.",
        });
      }
    }

    // (a) Forward-looking disclaimer on Restricted / investor material.
    // Skipped when the clause library already speaks for this jurisdiction —
    // the library finding names the exact clause instead of a bare phrase.
    const libraryCoversDisclaimers = requiredClauses.some((c) => c.kind === "disclaimer");
    const investorMatch = /\b(investors?|earnings)\b/i.exec(text);
    const needsDisclaimer = input.classification === "Restricted" || investorMatch !== null;
    if (!libraryCoversDisclaimers && needsDisclaimer && !/forward-looking/i.test(text)) {
      disclaimersClean = false;
      findings.push({
        ruleId: "disclaimer-forward-looking",
        confidence: 0.94,
        policyId: "POL-005",
        severity: "block",
        message: `${
          input.classification === "Restricted"
            ? `Classification '${input.classification}'`
            : `Investor-facing language ("${excerptAt(text, investorMatch?.index ?? 0, investorMatch?.[0].length ?? 0)}")`
        } requires the 'forward-looking statements' disclaimer — none found.`,
        ...(investorMatch && input.classification !== "Restricted"
          ? { span: span(investorMatch.index, investorMatch.index + investorMatch[0].length) }
          : {}),
        remediation:
          "Append the forward-looking statements disclaimer before routing for approval.",
      });
    }

    // (b) ™ on first mention of trademarked product names.
    for (const product of TRADEMARKED_PRODUCTS) {
      const idx = text.indexOf(product);
      if (idx !== -1 && text[idx + product.length] !== "™") {
        disclaimersClean = false;
        findings.push({
          ruleId: "trademark-first-use",
          confidence: 0.9,
          policyId: "POL-005",
          severity: "warn",
          message: `First mention of ${product} is missing the ™ mark: "${excerptAt(text, idx, product.length)}".`,
          span: span(idx, idx + product.length),
          remediation: `Write "${product}™" at this first mention; later mentions stay unmarked.`,
        });
      }
    }

    if (disclaimersClean) {
      findings.push({
        ruleId: "disclaimer-trademark",
        confidence: 0.9,
        policyId: "POL-005",
        severity: "pass",
        message: "Disclaimer and trademark requirements satisfied.",
        remediation: "No action — disclaimers and trademark marks are in place.",
      });
    }
  }

  const overallSeverity = findings.reduce<ReviewFinding["severity"]>(
    (worst, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst] ? f.severity : worst),
    "pass",
  );

  /* -- FR-BG-22 · scores -------------------------------------------- */
  const metrics = copyMetrics(text);
  // Compliance = every non-brand policy in the run (legal, regulatory, a11y).
  const isCompliance = (f: ReviewFinding) =>
    f.policyId !== undefined && policyById.get(f.policyId)?.policyKind !== "brand";
  const complianceBlocks = findings.filter(
    (f) => f.severity === "block" && isCompliance(f),
  ).length;
  const complianceWarns = findings.filter(
    (f) => f.severity === "warn" && isCompliance(f),
  ).length;

  const scores: ReviewScores = {
    toneScore: clampScore(
      100 - 10 * hypeHits - 6 * titleCaseHits - 8 * inclusiveHits - 5 * terminologyHits,
    ),
    readabilityScore: clampScore(
      100 -
        3 * Math.max(0, metrics.avgSentenceWords - 18) -
        120 * Math.max(0, metrics.longWordRatio - 0.1),
    ),
    complianceScore: clampScore(100 - 25 * complianceBlocks - 10 * complianceWarns),
  };

  const context: ReviewContext = {
    jurisdictionCodes,
    jurisdictionIds,
    regionIds: scope.regionIds,
    locale,
    ...(input.channelKind ? { channelKind: input.channelKind } : {}),
    requiredClauseIds,
  };

  return { findings, overallSeverity, scores, context };
}

/* ------------------------------------------------------------------ */
/* A4 · variants, refinement, creative brief                           */
/* ------------------------------------------------------------------ */
/*
 * Everything below is additive to the rule engine above and shares none of
 * its state: `reviewContent` stays the pure function it always was. These
 * three generators are pure in the same way — no clock, no randomness, no
 * network — so a given (content, persona, channel) triple always produces
 * byte-identical copy, which is what makes the saved versions reproducible.
 */

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function stripTerminator(text: string): string {
  return text.replace(/\s*[.!?]+\s*$/, "");
}

/** Sentences of a block of copy, terminator included, in order. */
function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Everything after the first sentence, as one run of copy. */
function restAfterFirstSentence(text: string): string {
  return sentencesOf(text).slice(1).join(" ");
}

/**
 * Cut to `max` characters on a word boundary, the ellipsis counted inside the
 * budget — a "truncated to fit" variant that still overruns is not a fit.
 */
function truncateTo(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= 1) return text.slice(0, Math.max(0, max));
  const hard = text.slice(0, max - 1);
  const lastSpace = hard.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? hard.slice(0, lastSpace) : hard;
  return `${cut.replace(/\s*[,;:—-]?\s*$/, "")}…`;
}

const ALT_TEXT_RE = /alt[ -]?text/i;

/** How copy is shaped per channel kind, and the metric its A/B runs on. */
const CHANNEL_FRAMING: Record<
  ChannelKind,
  { opener: string; closer: string; metric: string }
> = {
  email: {
    opener: "In one line:",
    closer: "One link, one action — everything else moves below the fold.",
    metric: "click-to-open rate",
  },
  social: {
    opener: "Hook first:",
    closer: "The full detail lives on the linked page.",
    metric: "engagement rate",
  },
  web: {
    opener: "Above the fold:",
    closer: "The page carries the proof points the short forms cannot.",
    metric: "scroll depth",
  },
  press: {
    opener: "Wire headline:",
    closer: "Boilerplate and the forward-looking statements clause follow the body.",
    metric: "pickup rate",
  },
  intranet: {
    opener: "For colleagues:",
    closer: "Questions go to the internal comms channel, not the public one.",
    metric: "read-through rate",
  },
  event: {
    opener: "Session listing:",
    closer: "Registration closes when the room fills.",
    metric: "registration rate",
  },
  SMS: {
    opener: "Direct:",
    closer: "Reply STOP to opt out.",
    metric: "reply rate",
  },
  print: {
    opener: "Headline:",
    closer: "The printed piece carries the short URL, not the click.",
    metric: "recall",
  },
  ads: {
    opener: "Ad copy:",
    closer: "The landing page has to repeat this promise word for word.",
    metric: "conversion rate",
  },
};

/** Outcome of running one ChannelConstraint over a composed variant. */
interface ConstraintVerdict {
  subject: string;
  body: string;
  withinConstraints: boolean;
  violations: string[];
  overBy: number;
  truncated: boolean;
}

/**
 * FR-CS-06 — enforce a channel's ChannelConstraint at generation time.
 *
 * Three limits, three behaviours:
 *   `requiresAltText`  the alt-text note is written into the copy *before* the
 *                      length check, so it competes for the same budget the
 *                      real copy does rather than being a footnote nobody sized.
 *   `subjectMaxChars`  subject is trimmed to the cap and the trim is flagged.
 *   `maxChars`         body is truncated *and* flagged — a variant is shippable
 *                      and its overage is on the record. Never one or the other.
 */
function applyConstraint(
  subject: string,
  body: string,
  channel: Channel | undefined,
  constraint: ChannelConstraint | undefined,
): ConstraintVerdict {
  if (!constraint) {
    return {
      subject,
      body,
      withinConstraints: true,
      violations: [],
      overBy: 0,
      truncated: false,
    };
  }

  const where = channel?.name ?? "the target channel";
  const violations: string[] = [];
  let outSubject = subject;
  let outBody = body;
  let overBy = 0;
  let truncated = false;

  if (constraint.requiresAltText && !ALT_TEXT_RE.test(outBody)) {
    outBody = `${outBody} Alt text: describe the lead visual for screen-reader users.`;
  }

  if (
    constraint.subjectMaxChars !== undefined &&
    outSubject.length > constraint.subjectMaxChars
  ) {
    violations.push(
      `Subject ran to ${outSubject.length} characters against the ${constraint.subjectMaxChars}-character subject limit on ${where} — trimmed to fit.`,
    );
    outSubject = truncateTo(outSubject, constraint.subjectMaxChars);
  }

  if (constraint.maxChars !== undefined && outBody.length > constraint.maxChars) {
    overBy = outBody.length - constraint.maxChars;
    violations.push(
      `Body ran to ${outBody.length} characters against the ${constraint.maxChars}-character limit on ${where} — over by ${overBy}, truncated to fit.`,
    );
    outBody = truncateTo(outBody, constraint.maxChars);
    truncated = true;
  }

  // The cut can take the alt-text note with it; that is a violation, not a
  // silent loss — the note has to move onto the asset record instead.
  if (constraint.requiresAltText && !ALT_TEXT_RE.test(outBody)) {
    violations.push(
      `${where} requires alt text on every image, and the alt-text note did not survive the ${constraint.maxChars}-character cut — record it on the asset instead.`,
    );
  }

  return {
    subject: outSubject,
    body: outBody,
    withinConstraints: violations.length === 0,
    violations,
    overBy,
    truncated,
  };
}

/** The constraint registered for a channel, if the library holds one. */
function constraintFor(db: SeedDB, channelId: string | undefined) {
  return channelId
    ? db.channelConstraints.find((c) => c.channelId === channelId)
    : undefined;
}

/**
 * The channel a persona variant is sized against: the first of the persona's
 * preferred channel kinds that the Channel registry actually carries. A
 * persona variant is copy, not a send — but it still has to fit somewhere,
 * and the persona itself says where it will be read.
 */
function leadChannelFor(persona: CustomerPersona, channels: Channel[]): Channel | undefined {
  for (const kind of persona.preferredChannelKinds) {
    const match = channels.find((c) => c.channelKind === kind);
    if (match) return match;
  }
  return undefined;
}

/** The draft every variant is cut from — the same copy 'Generate draft' shows. */
function baseDraft(input: Brief | Content, ctx: AIContext): AIDraft {
  return isBrief(input) ? draftFromBrief(input, ctx) : draftFromContent(input, ctx);
}

/** Closing line for the source item: content types have one, briefs do not. */
function closingFor(input: Brief | Content): string {
  return isBrief(input) ? "" : CLOSING_BY_TYPE[input.contentType];
}

function personaVariant(
  input: Brief | Content,
  base: AIDraft,
  persona: CustomerPersona,
  db: SeedDB,
): ContentVariant {
  const need = stripTerminator(persona.needs[0] ?? "the outcome they came for");
  const channel = leadChannelFor(persona, db.channels);
  const constraint = constraintFor(db, channel?.id);
  const metric = channel
    ? CHANNEL_FRAMING[channel.channelKind].metric
    : "conversion rate";

  const composed = [
    firstSentence(base.body),
    `Written for ${persona.name} — ${firstSentence(persona.demographics)}`,
    `Lead with what they ask for first: ${lowerFirst(need)}.`,
    `Their pattern: ${lowerFirst(firstSentence(persona.behavioral))}`,
    closingFor(input),
  ]
    .filter(Boolean)
    .join(" ");

  const verdict = applyConstraint(input.title, composed, channel, constraint);

  return {
    id: `VAR-${persona.id}`,
    label: persona.name,
    personaId: persona.id,
    hypothesis: `Opening on "${need}" for ${persona.name} beats the generic draft on ${metric} — ${persona.cohortSize.toLocaleString("en-US")} addressable, ${persona.consentedPct}% consented, persona confidence ${persona.confidence.toFixed(2)}.`,
    subject: verdict.subject,
    body: verdict.body,
    withinConstraints: verdict.withinConstraints,
    violations: verdict.violations,
    overBy: verdict.overBy,
    truncated: verdict.truncated,
    constrainedByChannelId: channel?.id,
    constraintId: constraint?.id,
    basis: `Persona variant of "${input.title}" for ${persona.name} (${persona.id}); lead need "${need}"; sized against ${channel ? `${channel.name} (${channel.id})` : "no registered channel"}.`,
  };
}

function channelVariant(
  input: Brief | Content,
  base: AIDraft,
  channel: Channel,
  db: SeedDB,
): ContentVariant {
  const framing = CHANNEL_FRAMING[channel.channelKind];
  const constraint = constraintFor(db, channel.id);

  const composed = [
    `${framing.opener} ${firstSentence(base.body)}`,
    restAfterFirstSentence(base.body),
    framing.closer,
  ]
    .filter(Boolean)
    .join(" ");

  const verdict = applyConstraint(input.title, composed, channel, constraint);

  const capNote =
    constraint?.maxChars !== undefined
      ? `inside the ${constraint.maxChars}-character body limit`
      : constraint?.subjectMaxChars !== undefined
        ? `inside the ${constraint.subjectMaxChars}-character subject limit`
        : "with no hard character limit on this channel";

  return {
    id: `VAR-${channel.id}`,
    label: channel.name,
    channelId: channel.id,
    hypothesis: `Cutting the draft to ${channel.channelKind} shape ${capNote} lifts ${framing.metric} against the long-form original.`,
    subject: verdict.subject,
    body: verdict.body,
    withinConstraints: verdict.withinConstraints,
    violations: verdict.violations,
    overBy: verdict.overBy,
    truncated: verdict.truncated,
    constrainedByChannelId: channel.id,
    constraintId: constraint?.id,
    basis: `Channel variant of "${input.title}" for ${channel.name} (${channel.id}, ${channel.channelKind}); constraint ${constraint?.id ?? "none registered"} applied at generation.`,
  };
}

/**
 * FR-CS-02 / 06 / 08 — one variant per selected persona and one per selected
 * channel, each carrying its own hypothesis and its constraint verdict.
 *
 * Output order is by id, not by the order the user ticked the boxes, so the
 * same selection always renders the same deck.
 */
function generateVariants(input: Brief | Content, req: VariantRequest): ContentVariant[] {
  const { db } = req;
  const base = baseDraft(input, req);

  const personas = (req.personas ?? [])
    .map((id) => db.customerPersonas.find((p) => p.id === id))
    .filter((p): p is CustomerPersona => p !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id, DEFAULT_LOCALE));

  const channels = (req.channels ?? [])
    .map((id) => db.channels.find((c) => c.id === id))
    .filter((c): c is Channel => c !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id, DEFAULT_LOCALE));

  return [
    ...personas.map((p) => personaVariant(input, base, p, db)),
    ...channels.map((c) => channelVariant(input, base, c, db)),
  ];
}

/* -- FR-CS-09 · iterative refinement -------------------------------- */

/** Marketing abstractions the 'plain language' instruction swaps out. */
const JARGON_SWAPS: ReadonlyArray<readonly [string, string]> = [
  ["leverage", "use"],
  ["utilise", "use"],
  ["utilize", "use"],
  ["synergies", "shared gains"],
  ["best-in-class", "proven"],
  ["seamless", "smooth"],
  ["innovative", "new"],
  ["cutting-edge", "current"],
  ["robust", "reliable"],
];

/**
 * The instruction set the feedback is matched against. Every rule is either a
 * transform on the unpreserved copy or a line appended after it — never an
 * edit inside a preserved fragment.
 */
const REFINE_RULES: ReadonlyArray<{
  id: "shorten" | "plain" | "cta" | "proof" | "compliance" | "warmth";
  match: RegExp;
  change: string;
  append?: string;
}> = [
  {
    id: "shorten",
    match: /shorter|shorten|tighten|trim|concise|too long|cut it down/i,
    change: "Cut each unpreserved paragraph to its first sentence.",
  },
  {
    id: "plain",
    match: /jargon|plain|simpl|clearer|clarity|buzzword/i,
    change: "Swapped marketing abstractions for plain wording.",
  },
  {
    id: "cta",
    match: /call to action|\bcta\b|convert|conversion|click|next step/i,
    change: "Added an explicit call to action.",
    append: "Ready when you are — the next step takes one click.",
  },
  {
    id: "proof",
    match: /proof|evidence|substantiat|\bclaim|\bdata\b|source/i,
    change: "Attached a substantiation line to the performance figures.",
    append:
      "Every figure above is based on tested results published in the linked technical note.",
  },
  {
    id: "compliance",
    match: /legal|complian|disclaimer|regulat|risk/i,
    change: "Appended the forward-looking statements line.",
    append:
      "Forward-looking statements: this copy describes plans and expectations, not commitments.",
  },
  {
    id: "warmth",
    match: /warm|friendl|personal|softer|stiff|corporate speak/i,
    change: "Closed on a personal note rather than a corporate one.",
    append: "Tell us how this lands — we read every reply and it shapes the next one.",
  },
];

/**
 * The units a refinement preserves and rewrites: blank-line blocks where the
 * copy has them, sentences where it does not (most seeded bodies are one
 * block). Exported because the Content Studio's "preserve" picker has to offer
 * exactly the units the refinement will honour — two different splits would
 * mean ticking a paragraph that the engine never sees.
 */
export function contentParagraphs(body: string): string[] {
  const blocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.length > 1 ? blocks : sentencesOf(body);
}

function applyJargonSwaps(text: string): string {
  let out = text;
  for (const [from, to] of JARGON_SWAPS) {
    out = out.replace(wholeTermRe(from, true), (m) =>
      m[0] === m[0].toUpperCase() ? `${to.charAt(0).toUpperCase()}${to.slice(1)}` : to,
    );
  }
  return out;
}

/**
 * FR-CS-09 — regenerate a body against reviewer feedback while carrying the
 * approved fragments through *verbatim*.
 *
 * The guarantee is structural, not best-effort: a paragraph the reviewer
 * ticked is emitted byte-for-byte, and a fragment that no longer matches any
 * paragraph (the copy moved under it) is re-appended rather than dropped, so
 * `preserve.every(f => result.body.includes(f))` always holds.
 */
function refineDraft(body: string, feedback: string, preserve: string[]): RefinedDraft {
  const wanted = preserve.map((p) => p.trim()).filter(Boolean);
  const paragraphs = contentParagraphs(body);
  const blockMode = body.split(/\n{2,}/).filter((b) => b.trim()).length > 1;
  const joiner = blockMode ? "\n\n" : " ";

  const matched = REFINE_RULES.filter((r) => r.match.test(feedback));
  // Nothing named → tighten, which is what "make it better" always means here.
  const rules = matched.length > 0 ? matched : [REFINE_RULES[0]];
  const ids = new Set(rules.map((r) => r.id));

  const preserved: string[] = [];
  const out: string[] = [];
  let keptUnpreserved = 0;
  for (const paragraph of paragraphs) {
    const held = wanted.find((f) => f === paragraph || paragraph.includes(f));
    if (held !== undefined) {
      preserved.push(held);
      out.push(paragraph);
      continue;
    }
    // Shortening means different cuts at different granularities: in block
    // mode each block loses everything after its first sentence; in sentence
    // mode only the first unpreserved sentence survives at all.
    if (ids.has("shorten") && !blockMode && keptUnpreserved >= 1) continue;
    let next = paragraph;
    if (ids.has("shorten") && blockMode) next = firstSentence(next);
    if (ids.has("plain")) next = applyJargonSwaps(next);
    keptUnpreserved += 1;
    out.push(next);
  }

  for (const rule of rules) {
    if (rule.append) out.push(rule.append);
  }

  // A fragment whose paragraph no longer exists still has to survive.
  const reattached = wanted.filter((f) => !preserved.includes(f));
  out.push(...reattached);
  preserved.push(...reattached);

  const changes = rules.map((r) =>
    r.id === "shorten" && !blockMode
      ? "Dropped every unpreserved sentence after the first."
      : r.change,
  );
  if (reattached.length > 0) {
    changes.push(
      `Re-attached ${reattached.length} approved fragment${reattached.length === 1 ? "" : "s"} that no longer matched a paragraph.`,
    );
  }

  return {
    body: out.join(joiner),
    preserved,
    reattached,
    changes,
    basis: `Refinement on feedback "${stripTerminator(firstSentence(feedback))}" — applied ${rules.map((r) => r.id).join(", ")}; ${preserved.length} approved fragment${preserved.length === 1 ? "" : "s"} held verbatim.`,
  };
}

/* -- FR-CS-10 · creative brief -------------------------------------- */

/** The visual deliverable each channel kind needs, and its hard spec. */
const CHANNEL_ASSET_SPEC: Record<ChannelKind, CreativeDeliverable> = {
  email: {
    format: "Email hero image",
    spec: "1200 × 600 px RGB, under 200 KB, legible at 320 px wide",
  },
  social: {
    format: "Social card set",
    spec: "1080 × 1080 px and 1080 × 1920 px, 120 px safe area on every edge",
  },
  web: {
    format: "Page hero and inline figures",
    spec: "2400 × 1200 px at 2×, WebP with a JPEG fallback, under 400 KB",
  },
  press: {
    format: "Press-kit imagery",
    spec: "300 dpi, 3000 px on the long edge, caption embedded in the IPTC fields",
  },
  intranet: {
    format: "Intranet card image",
    spec: "1600 × 900 px, safe-cropping to 4:3 for the mobile card",
  },
  event: {
    format: "Session banner and stage slide",
    spec: "1920 × 1080 px 16:9, 5% title-safe margin",
  },
  SMS: {
    format: "No visual asset",
    spec: "Text only — the handset generates any link preview",
  },
  print: {
    format: "Print artwork",
    spec: "CMYK, 300 dpi, 3 mm bleed, fonts outlined",
  },
  ads: {
    format: "Ad creative set",
    spec: "1200 × 628 px, 1080 × 1080 px and 320 × 50 px; text under 20% of the frame",
  },
};

/** Channel kind a content type ships on when nothing is scheduled yet. */
const DEFAULT_CHANNEL_KIND: Record<ContentType, ChannelKind> = {
  email: "email",
  post: "social",
  PR: "press",
  script: "event",
  page: "web",
};

/** The channels this content is actually scheduled on, else its type default. */
function channelsForContent(content: Content, db: SeedDB): Channel[] {
  const versionIds = new Set(
    db.contentVersions.filter((v) => v.contentId === content.id).map((v) => v.id),
  );
  const scheduled = db.channelExecutions
    .filter((x) => x.contentVersionId !== undefined && versionIds.has(x.contentVersionId))
    .map((x) => db.channels.find((c) => c.id === x.channelId))
    .filter((c): c is Channel => c !== undefined);
  const unique = [...new Map(scheduled.map((c) => [c.id, c])).values()].sort((a, b) =>
    a.id.localeCompare(b.id, DEFAULT_LOCALE),
  );
  if (unique.length > 0) return unique;
  const fallback = db.channels.find(
    (c) => c.channelKind === DEFAULT_CHANNEL_KIND[content.contentType],
  );
  return fallback ? [fallback] : [];
}

/** The constraint line a designer needs beside the pixel spec. */
function constraintSpecLine(constraint: ChannelConstraint | undefined): string {
  if (!constraint) return "No registered channel constraint.";
  const parts: string[] = [];
  if (constraint.maxChars !== undefined) parts.push(`body ≤ ${constraint.maxChars} chars`);
  if (constraint.subjectMaxChars !== undefined)
    parts.push(`subject ≤ ${constraint.subjectMaxChars} chars`);
  parts.push(constraint.requiresAltText ? "alt text required" : "alt text not enforced");
  return `${parts.join(", ")} (${constraint.id})`;
}

/**
 * FR-CS-10 — the brief a design team can actually work from: what the piece
 * has to achieve, who it is for, the deliverables with their specs, and the
 * mandatories nobody may quietly drop.
 *
 * Every line resolves from the graph — the linked Brief, the audience the
 * Communication targets, the channels the content is scheduled on, the brand's
 * guardrail policies and the clause library for the campaign's jurisdictions.
 * Nothing is invented.
 */
function generateCreativeBrief(content: Content, ctx: AIContext): CreativeBrief {
  const { db } = ctx;
  const brand = db.brands.find((b) => b.id === content.brandId);
  const campaign = content.campaignId
    ? db.campaigns.find((c) => c.id === content.campaignId)
    : undefined;
  const brief = content.briefId
    ? db.briefs.find((b) => b.id === content.briefId)
    : undefined;

  const objective = brief
    ? `${firstSentence(brief.objective)} The ${content.contentType} carries ${brief.keyMessages.length > 0 ? `"${stripTerminator(brief.keyMessages[0])}"` : "the campaign's lead message"} as its lead message${campaign ? `, inside the ${campaign.name} window ${campaign.startDate} to ${campaign.endDate}` : ""}.`
    : `Produce the creative for "${content.title}" — a ${content.contentType} for ${brand?.name ?? content.brandId}${campaign ? ` on ${campaign.name}` : ""}. No brief is linked, so the objective is drawn from the content record and needs confirming with the owner.`;

  const communication = db.communications.find((c) => c.contentId === content.id);
  const audienceRecord = communication
    ? db.audiences.find((a) => a.id === communication.audienceId)
    : undefined;
  const personas = audienceRecord
    ? db.customerPersonas.filter((p) => p.audienceId === audienceRecord.id)
    : [];
  const audience = audienceRecord
    ? `${audienceRecord.name} (${audienceRecord.audienceKind})${personas.length > 0 ? ` — personas ${personas.map((p) => p.name).join(", ")}` : ""}`
    : "No audience linked to this content yet — confirm the target with the campaign manager before production starts.";

  const channels = channelsForContent(content, db);
  const deliverables: CreativeDeliverable[] = [];

  const currentVersion =
    db.contentVersions.find((v) => v.id === content.currentVersionId) ??
    db.contentVersions.find((v) => v.contentId === content.id);
  const tightestBody = channels
    .map((c) => constraintFor(db, c.id)?.maxChars)
    .filter((n): n is number => n !== undefined)
    .sort((a, b) => a - b)[0];
  deliverables.push({
    format: "Copy deck",
    spec: `${content.contentType} body in ${currentVersion?.locale ?? "en-US"}${tightestBody !== undefined ? `, longest form ≤ ${tightestBody} characters to clear every selected channel` : ""}; headline, body and CTA supplied as separate fields.`,
  });

  for (const channel of channels) {
    const asset = CHANNEL_ASSET_SPEC[channel.channelKind];
    deliverables.push({
      format: `${asset.format} — ${channel.name}`,
      spec: `${asset.spec}. ${constraintSpecLine(constraintFor(db, channel.id))}`,
    });
  }

  const versionAssets = db.contentVersions
    .filter((v) => v.contentId === content.id)
    .flatMap((v) => v.assetIds ?? []);
  const expiring = db.assets.filter(
    (a) => versionAssets.includes(a.id) && a.rightsExpiry !== undefined,
  );
  if (expiring.length > 0) {
    deliverables.push({
      format: "Rights-cleared replacements",
      spec: `${expiring.map((a) => `${a.filename} (rights end ${a.rightsExpiry})`).join(", ")} — supply a cleared alternative or a renewed licence before the window closes.`,
    });
  }

  const mandatories: string[] = [];
  if (brand?.tone) mandatories.push(`Hold the ${brand.name} voice: "${firstSentence(brand.tone)}"`);
  for (const policyId of brand?.guardrailPolicyIds ?? []) {
    const policy = db.policies.find((p) => p.id === policyId);
    if (policy) mandatories.push(`${policy.name} (${policy.id}, ${policy.enforcement})`);
  }
  if (brand) {
    const scope = resolveScope(
      {
        title: content.title,
        body: currentVersion?.body ?? "",
        brand,
        classification: content.classification,
        regionIds: campaign?.regionIds,
      },
      db,
    );
    const clauses = clauseCandidates(
      db,
      scope.jurisdictions.map((j) => j.id),
      {
        title: content.title,
        body: currentVersion?.body ?? "",
        brand,
        classification: content.classification,
        regionIds: campaign?.regionIds,
      },
      currentVersion?.locale ?? DEFAULT_LOCALE,
    ).filter((c) => successorOf(db, c, "") === undefined);
    for (const clause of clauses) {
      const kindLabel = CLAUSE_KIND_LABEL[clause.kind];
      mandatories.push(
        `${kindLabel.charAt(0).toUpperCase()}${kindLabel.slice(1)} ${clause.id} v${clause.version} must appear verbatim (${scope.jurisdictions.find((j) => j.id === clause.jurisdictionId)?.code ?? clause.jurisdictionId})`,
      );
    }
  }
  for (const product of TRADEMARKED_PRODUCTS) {
    if (content.title.includes(product) || (currentVersion?.body ?? "").includes(product)) {
      mandatories.push(`${product}™ on first mention, unmarked afterwards`);
    }
  }
  if (channels.some((c) => constraintFor(db, c.id)?.requiresAltText)) {
    mandatories.push("Alt text on every image, supplied with the artwork rather than after it");
  }
  mandatories.push(
    `Classification ${content.classification} — handle and circulate the working files accordingly`,
  );

  return { objective, audience, deliverables, mandatories };
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

/**
 * The deterministic provider. Every method is a pure function of its arguments:
 * no clock, no randomness, no network — same input, byte-identical output.
 *
 * Callers that want to `await`, show a running state, or record an `AgentRun`
 * should use `asyncAIService` from `./index`, which wraps exactly these methods
 * and resolves with exactly these values. It adds the async shape and nothing
 * else; do not add asynchrony here, because that is where determinism would go.
 */
export const simulatedAIService: AIService = {
  generateDraft(input, ctx) {
    return isBrief(input) ? draftFromBrief(input, ctx) : draftFromContent(input, ctx);
  },
  proposeCampaign,
  summarize,
  reviewContent,
  generateVariants,
  refineDraft,
  generateCreativeBrief,
};
