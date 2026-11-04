/**
 * MarCom Copilot — the deterministic intent router behind agent A8
 * (BLUEPRINT.md FR-CP-01..06).
 *
 * This is a SIMULATION, not a model call. Same query + same db + same ctx
 * always produces the same answer: there is no randomness, no clock, and no
 * network. Schedule math anchors on the seed graph's `TODAY` (2026-08-13),
 * exactly like every other selector, so answers reconcile with the pages they
 * cite.
 *
 * The contract every intent honours:
 *   - answers are DERIVED from the live SeedDB through the shared selectors —
 *     nothing is authored here, no record is ever invented;
 *   - an unmatched query returns the capability list, never a guess;
 *   - every answer carries citations that resolve to a real record route or a
 *     real page, filtered by what the signed-in role may actually open;
 *   - every answer carries an `explanation` naming the rule that fired, the
 *     source records it read, and why the confidence is what it is (FR-CP-05).
 *
 * Answers are org-wide on purpose: the topbar Brand/BU/Region scope is a page
 * filter, and silently applying it here would make the copilot disagree with
 * itself between two questions. Where that matters the answer says so.
 *
 * Two later additions keep that contract intact:
 *
 *   - PAGE AWARENESS. The caller hands in the route it is on
 *     (`pageContextForPath`). When a query names no record, the record open on
 *     the page resolves it — and the answer says so, so a reader always knows
 *     which subject was assumed. A named record in the query still wins.
 *   - ACTIONS. The router never performs one: it *plans* it. An answer may
 *     carry a `CopilotActionPlan` describing exactly which records the action
 *     would create and where they would appear. The calling surface executes
 *     it (that is where the clock and the record store live) and hands the
 *     resulting ids back to `buildActionReceipt`, which formats the receipt
 *     with a link to every record written. Prose is never the artifact.
 */

import {
  TODAY,
  atRiskCampaigns,
  campaignHealth,
  campaignRoi,
  campaignSpend,
  budgetsPlannedTotal,
  totalPlannedVsCommitted,
  kpiSummary,
  roiSummary,
  assetImpact,
  myApprovals,
} from "@/data/selectors";
import { fmtCompact, fmtCurrency, fmtDate } from "@/lib/format";
import { canSeeNav, type NavKey } from "@/lib/rbac";
import type {
  AppRole,
  Asset,
  Brand,
  Campaign,
  Channel,
  Content,
  ContentVersion,
  EntityName,
  Policy,
  SeedDB,
  Stakeholder,
} from "@/data/types";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Public shape                                                        */
/* ------------------------------------------------------------------ */

/** Every question the copilot can answer. `capabilities` is the honest fallback. */
export type CopilotIntent =
  | "approvals-pending"
  | "launching-soon"
  | "campaign-risk"
  | "budget-roi"
  | "policy-blocked"
  | "brand-guidelines"
  | "crisis-status"
  | "asset-expiry"
  | "explain-decision"
  | "guided-launch"
  | "record-context"
  | "draft-variants"
  | "compliance-review"
  | "capabilities";

/**
 * The two intents that end in written records rather than prose. They are the
 * only intents that may carry a `CopilotActionPlan`.
 */
export type CopilotActionKind = "draft-variants" | "compliance-review";

export type CopilotConfidence = "high" | "medium" | "low";

/** A pointer at a real record or a real route. `to` omitted = named, not linked. */
export interface CopilotCitation {
  label: string;
  to?: string;
}

export interface CopilotAction {
  label: string;
  to: string;
}

export interface CopilotAnswer {
  /** Which intent handled the query — carried back so follow-ups can resolve. */
  intent: CopilotIntent;
  answer: string;
  citations: CopilotCitation[];
  confidence: CopilotConfidence;
  /** FR-CP-05 — which rule fired, which source, why this confidence. */
  explanation: string;
  suggestedActions: CopilotAction[];
  /** Record the answer resolved to (campaign, brand, asset…), when it did. */
  subjectId?: string;
  /**
   * An action the router is willing to perform, fully described before
   * anything is written. Present only when a subject resolved and the acting
   * role can open the surface the records would land on. The router does not
   * execute it — the calling surface does, then reports back through
   * `buildActionReceipt`.
   */
  action?: CopilotActionPlan;
}

/* ------------------------------------------------------------------ */
/* Actions — planned here, executed by the caller, receipted here       */
/* ------------------------------------------------------------------ */

/** Everything the executing surface needs, and everything a reader needs
 *  in order to judge the action before it runs. */
export interface CopilotActionPlan {
  kind: CopilotActionKind;
  /** Button label — names the action and its size, never a category. */
  label: string;
  /** MarcomAgent the run is booked against (`AGT-A1`..`AGT-A8`). */
  agentId: string;
  subjectEntity: EntityName;
  subjectId: string;
  subjectLabel: string;
  /** What will exist afterwards, stated before anything is written. */
  creates: string;
  /** Route the created records become visible on. */
  to: string;
  /** Channel ids the variant run writes one variant against each. */
  channelIds?: string[];
  /** ContentVersion the review reads (compliance-review). */
  versionId?: string;
  /** Policy ids the review evaluates (compliance-review). */
  policyIds?: string[];
}

/** One record an action actually wrote, with the route that opens it. */
export interface CopilotCreatedRecord {
  entity: EntityName;
  id: string;
  label: string;
  to: string;
}

/**
 * What happened when the caller ran the plan. `created` is the evidence: an
 * empty `created` with an `error` is reported as a failed run, never dressed
 * up as a success.
 */
export interface CopilotActionReceipt {
  plan: CopilotActionPlan;
  created: CopilotCreatedRecord[];
  /** AgentRun ids written — one per produced record, per the ledger convention. */
  runIds: string[];
  /** Detail the generator surfaced (constraint breaches, finding severities). */
  notes: string[];
  /** Set when the run produced nothing. */
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Page awareness                                                      */
/* ------------------------------------------------------------------ */

/** The route the asking surface is on, and the record open on it (if any). */
export interface CopilotPageContext {
  path: string;
  /** Entity of the record the route opens. Absent on list and index routes. */
  entity?: EntityName;
  id?: string;
}

/** Routes that open exactly one record. Everything else is a list or an index. */
const RECORD_ROUTES: readonly (readonly [RegExp, EntityName])[] = [
  [/^\/campaigns\/([A-Za-z]{2,5}-[0-9]{2,})$/, "Campaign"],
  [/^\/content\/([A-Za-z]{2,5}-[0-9]{2,})$/, "Content"],
];

/**
 * Parse a pathname into page context. Pure and total: an unknown route yields
 * a context with a path and no record, which is exactly what "I am on a list
 * page" means. Only routes that genuinely carry a record id are claimed —
 * inventing a subject from a list page would be a guess.
 */
export function pageContextForPath(pathname: string): CopilotPageContext {
  const path = pathname.replace(/\/+$/, "") || "/";
  for (const [pattern, entity] of RECORD_ROUTES) {
    const match = path.match(pattern);
    if (match) return { path, entity, id: match[1] };
  }
  return { path };
}

/** Acting context. The prior* fields carry session memory (FR-CP-02). */
export interface CopilotContext {
  role: AppRole;
  /** Explicit acting stakeholder; falls back to the seeded holder of `role`. */
  stakeholderId?: string;
  /** Intent of the previous agent turn — lets "why?" resolve. */
  priorIntent?: CopilotIntent;
  /** Subject the previous turn resolved to (campaign id, brand id, …). */
  priorSubjectId?: string;
  /** Verbatim previous user query, replayed when a follow-up defers to it. */
  priorQuery?: string;
  /** Explanation the previous turn carried — quoted verbatim by "explain". */
  priorExplanation?: string;
  /** Confidence the previous turn carried. */
  priorConfidence?: CopilotConfidence;
  /** Citations the previous turn carried, so "explain" points at the same records. */
  priorCitations?: CopilotCitation[];
  /** Route the asker is on. Resolves "this campaign" / "this content". */
  page?: CopilotPageContext;
}

/* ------------------------------------------------------------------ */
/* Constants derived from the seed graph                               */
/* ------------------------------------------------------------------ */

const TODAY_MS = Date.parse(`${TODAY}T00:00:00Z`);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Horizon for "launching soon" — a calendar month ahead of TODAY. */
const LAUNCH_HORIZON_DAYS = 30;

/** Horizon for "expiring rights" — a rights window closing inside two quarters. */
const EXPIRY_HORIZON_DAYS = 180;

/** Roles cleared to read `Restricted` subjects (matches GlobalSearch). */
const RESTRICTED_VIEWERS: readonly AppRole[] = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
];

/** Route prefix → nav key, longest prefix wins. Used to hide locked doors. */
const ROUTE_NAV_KEYS: readonly [string, NavKey][] = [
  ["/dashboard", "dashboard"],
  ["/ideas", "ideas"],
  ["/campaigns", "campaigns"],
  ["/communications", "communications"],
  ["/internal", "internal"],
  ["/content", "content"],
  ["/calendar", "calendar"],
  ["/events", "events"],
  ["/approvals", "approvals"],
  ["/assets", "assets"],
  ["/journeys", "journeys"],
  ["/performance", "performance"],
  ["/reports", "reports"],
  ["/budget", "budget"],
  ["/audiences", "audiences"],
  ["/pr", "pr"],
  ["/agencies", "agencies"],
  ["/governance", "governance"],
  ["/admin", "admin"],
  ["/graph", "graph"],
];

/* ------------------------------------------------------------------ */
/* Small deterministic helpers                                         */
/* ------------------------------------------------------------------ */

/** Whole days from the seed's TODAY (negative = in the past). */
function daysFromToday(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return Number.POSITIVE_INFINITY;
  return Math.floor((ms - TODAY_MS) / MS_PER_DAY);
}

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Exported so the copilot surface counts records the same way its answers do. */
export function plural(count: number, noun: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? noun : (pluralForm ?? `${noun}s`)}`;
}

function bullets(lines: string[]): string {
  return lines.map((l) => `• ${l}`).join("\n");
}

function navKeyForRoute(to: string): NavKey | undefined {
  let match: NavKey | undefined;
  let matchedLength = 0;
  for (const [prefix, key] of ROUTE_NAV_KEYS) {
    if ((to === prefix || to.startsWith(`${prefix}/`)) && prefix.length > matchedLength) {
      match = key;
      matchedLength = prefix.length;
    }
  }
  return match;
}

/** A destination the signed-in role can actually open. */
function reachable(role: AppRole, to: string): boolean {
  const key = navKeyForRoute(to);
  return key === undefined || canSeeNav(role, key);
}

function filterCitations(role: AppRole, citations: CopilotCitation[]): CopilotCitation[] {
  return citations.map((c) =>
    c.to && !reachable(role, c.to) ? { label: c.label } : c,
  );
}

function filterActions(role: AppRole, actions: CopilotAction[]): CopilotAction[] {
  return actions.filter((a) => reachable(role, a.to));
}

/** Route for the subject of an approval / a cited record. */
function routeForSubject(db: SeedDB, entity: EntityName, id: string): string {
  switch (entity) {
    case "Campaign":
      return `/campaigns/${id}`;
    case "CampaignActivity": {
      const activity = db.campaignActivities.find((a) => a.id === id);
      return activity ? `/campaigns/${activity.campaignId}` : "/campaigns";
    }
    case "Brief": {
      const brief = db.briefs.find((b) => b.id === id);
      return brief ? `/campaigns/${brief.campaignId}` : "/campaigns";
    }
    case "Content":
      return `/content/${id}`;
    case "ContentVersion": {
      const version = db.contentVersions.find((v) => v.id === id);
      return version ? `/content/${version.contentId}` : "/content";
    }
    case "Communication":
      return "/communications";
    case "Asset":
      return "/assets";
    case "CrisisIncident":
      return "/governance";
    case "Idea":
      return "/ideas";
    case "Policy":
    case "Workflow":
    case "WorkflowStage":
      return "/governance";
    case "Budget":
      return "/budget";
    case "KPI":
    case "MetricResult":
      return "/performance";
    case "Event":
      return "/events";
    case "Journey":
      return "/journeys";
    case "Audience":
    case "Segment":
      return "/audiences";
    case "Agency":
      return "/agencies";
    case "MediaContact":
    case "CoverageItem":
      return "/pr";
    default:
      return "/graph";
  }
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "is", "are",
  "was", "were", "why", "what", "when", "where", "which", "who", "how", "do",
  "does", "did", "my", "our", "we", "us", "it", "its", "at", "risk", "status",
  "campaign", "campaigns", "brand", "asset", "assets", "show", "me", "tell",
  "about", "with", "that", "this", "any", "all",
]);

function normalize(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9%.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function significantTokens(text: string): string[] {
  return normalize(text)
    .split(/[\s.-]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Best record whose name the query names. Match ratio = share of the record's
 * significant name tokens present in the query; ties break on the longer name
 * then the lower id, so the result never depends on array order.
 */
function matchByName<T extends { id: string }>(
  query: string,
  items: T[],
  nameOf: (item: T) => string,
  minRatio = 0.5,
): T | undefined {
  const queryTokens = new Set(significantTokens(query));
  if (queryTokens.size === 0) return undefined;

  let best: { item: T; ratio: number; hits: number; length: number } | undefined;
  for (const item of items) {
    const nameTokens = significantTokens(nameOf(item));
    if (nameTokens.length === 0) continue;
    const hits = nameTokens.filter((t) => queryTokens.has(t)).length;
    if (hits === 0) continue;
    const ratio = hits / nameTokens.length;
    if (ratio < minRatio) continue;
    const length = nameOf(item).length;
    const better =
      !best ||
      hits > best.hits ||
      (hits === best.hits && ratio > best.ratio) ||
      (hits === best.hits &&
        ratio === best.ratio &&
        (length > best.length ||
          (length === best.length && item.id < best.item.id)));
    if (better) best = { item, ratio, hits, length };
  }
  return best?.item;
}

function resolveStakeholder(db: SeedDB, ctx: CopilotContext): Stakeholder | undefined {
  if (ctx.stakeholderId) {
    const explicit = db.stakeholders.find((s) => s.id === ctx.stakeholderId);
    if (explicit) return explicit;
  }
  return db.stakeholders.find((s) => s.role === ctx.role);
}

function nameById<T extends { id: string }>(items: T[], nameOf: (i: T) => string) {
  return (id: string): string => {
    const found = items.find((i) => i.id === id);
    return found ? nameOf(found) : id;
  };
}

/* ------------------------------------------------------------------ */
/* Page-context resolvers                                              */
/* ------------------------------------------------------------------ */

/** The Campaign open on the page — directly, or via the open Content's campaign. */
function campaignFromPage(db: SeedDB, ctx: CopilotContext): Campaign | undefined {
  const page = ctx.page;
  if (!page?.id) return undefined;
  if (page.entity === "Campaign") return db.campaigns.find((c) => c.id === page.id);
  if (page.entity === "Content") {
    const content = db.contents.find((c) => c.id === page.id);
    return content?.campaignId
      ? db.campaigns.find((c) => c.id === content.campaignId)
      : undefined;
  }
  return undefined;
}

/** The Content open on the page. A campaign page owns many — none is implied. */
function contentFromPage(db: SeedDB, ctx: CopilotContext): Content | undefined {
  const page = ctx.page;
  if (page?.entity !== "Content" || !page.id) return undefined;
  return db.contents.find((c) => c.id === page.id);
}

/** The Brand the open record belongs to — the one field both records carry. */
function brandFromPage(db: SeedDB, ctx: CopilotContext): Brand | undefined {
  const brandId =
    contentFromPage(db, ctx)?.brandId ?? campaignFromPage(db, ctx)?.brandId;
  return brandId ? db.brands.find((b) => b.id === brandId) : undefined;
}

/** Sentence appended when the subject came from the page rather than the query. */
function scopedToPageNote(label: string): string {
  return `Scoped to ${label}, the record open on this page — say a name to ask about a different one.`;
}

/**
 * Content the action intents act on: a title named in the query wins, then the
 * record on the page, then the subject of the previous turn.
 */
function resolveContent(
  query: string,
  db: SeedDB,
  ctx: CopilotContext,
): { content: Content; viaPage: boolean } | undefined {
  const named = matchByName<Content>(query, db.contents, (c) => c.title, 0.6);
  if (named) return { content: named, viaPage: false };
  const onPage = contentFromPage(db, ctx);
  if (onPage) return { content: onPage, viaPage: true };
  const prior = ctx.priorSubjectId
    ? db.contents.find((c) => c.id === ctx.priorSubjectId)
    : undefined;
  return prior ? { content: prior, viaPage: false } : undefined;
}

/** Version a review would read: the pinned current version, else the newest. */
function currentVersionOf(db: SeedDB, content: Content): ContentVersion | undefined {
  const versions = db.contentVersions
    .filter((v) => v.contentId === content.id)
    .slice()
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt, DEFAULT_LOCALE) ||
        b.id.localeCompare(a.id, DEFAULT_LOCALE),
    );
  return versions.find((v) => v.id === content.currentVersionId) ?? versions[0];
}

/** Max channels one variant run writes for, so a click cannot flood the history. */
const MAX_VARIANT_CHANNELS = 3;

/**
 * Channels a variant run writes against: the channels the subject's campaign
 * already runs activities on. Nothing is chosen for the campaign — if it runs
 * no channel activities there is nothing to derive, and the run is not offered.
 */
function variantChannels(db: SeedDB, content: Content): { picked: Channel[]; total: number } {
  if (!content.campaignId) return { picked: [], total: 0 };
  const ids = new Set(
    db.campaignActivities
      .filter((a) => a.campaignId === content.campaignId)
      .map((a) => a.channelId),
  );
  const all = db.channels
    .filter((c) => ids.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id, DEFAULT_LOCALE));
  return { picked: all.slice(0, MAX_VARIANT_CHANNELS), total: all.length };
}

/** Policy set a review runs: the brand's guardrails plus every block-enforced policy. */
function reviewPoliciesFor(db: SeedDB, brand: Brand | undefined): Policy[] {
  const ids = new Set<string>(brand?.guardrailPolicyIds ?? []);
  for (const p of db.policies) if (p.enforcement === "block") ids.add(p.id);
  return db.policies.filter((p) => ids.has(p.id));
}

/* ------------------------------------------------------------------ */
/* Intent matching (deterministic, weighted keyword scoring)           */
/* ------------------------------------------------------------------ */

interface IntentMatcher {
  intent: CopilotIntent;
  /** [phrase, weight] — phrase presence in the normalized query adds weight. */
  phrases: readonly (readonly [string, number])[];
  /**
   * Whole-query forms that score `EXACT_WEIGHT`. Used for deictics too short
   * to match as substrings safely: "what is this" must not fire inside
   * "what is this month's spend".
   */
  exact?: readonly string[];
}

/** Weight an `exact` whole-query match contributes — same as a strong phrase. */
const EXACT_WEIGHT = 12;

/**
 * Order matters only for ties: the first matcher with the top score wins, so
 * two queries scoring identically always resolve the same way.
 * Multi-word phrases carry higher weight than bare words, which is how
 * "how do I launch a product campaign" (guided journey) stays distinct from
 * "what launches this month" (schedule lookup).
 */
const MATCHERS: readonly IntentMatcher[] = [
  {
    intent: "guided-launch",
    phrases: [
      ["how do i launch", 12], ["how to launch", 12], ["how do i run", 10],
      ["how do i start", 10], ["walk me through", 10], ["step by step", 9],
      ["get started", 8], ["guide me", 8], ["playbook", 7], ["what are the steps", 10],
      ["steps", 4], ["process", 3], ["launch a product", 8], ["product launch process", 10],
      ["new campaign", 4], ["set up a campaign", 8],
    ],
  },
  {
    intent: "explain-decision",
    phrases: [
      ["explain this", 12], ["explain that", 12], ["explain your", 12],
      ["explain the answer", 12], ["how did you", 10], ["how do you know", 10],
      ["which rule", 10], ["what rule", 10], ["show your work", 10],
      ["where did that come from", 10], ["what is your source", 10],
      ["how confident", 9], ["why do you say", 9], ["justify", 6],
      ["provenance", 6], ["source", 3], ["citation", 4],
    ],
  },
  {
    // Acts: writes ContentVersions. Phrased around "variant" so it cannot
    // steal a plain "draft" or "content" question from another matcher.
    intent: "draft-variants",
    phrases: [
      ["draft variants", 12], ["draft some variants", 12], ["generate variants", 12],
      ["create variants", 12], ["write variants", 12], ["make variants", 12],
      ["draft a variant", 11], ["variant", 7], ["variants", 8],
      ["alternative version", 9], ["alternate version", 9], ["ab test", 8],
      ["a b test", 8], ["split test", 8], ["channel versions", 9],
    ],
  },
  {
    // Acts: writes an AIReview. "compliance check" outscores the bare
    // "compliance" that policy-blocked carries, which is the intended split:
    // one asks what is blocked, the other asks to run the check.
    intent: "compliance-review",
    phrases: [
      ["compliance check", 12], ["brand check", 12], ["brand and compliance", 12],
      ["run the check", 11], ["run a check", 11], ["run the review", 11],
      ["run a review", 11], ["run the compliance", 12], ["check this content", 12],
      ["review this content", 12], ["check this copy", 12], ["check this draft", 12],
      ["review this draft", 12], ["screen this", 9], ["vet this", 9],
    ],
  },
  {
    // Reads the record on the open route. The bare deictics ("what is this")
    // are `exact` rather than substrings, so "what is this month's spend"
    // still resolves to budget — a substring match there would be a hijack.
    intent: "record-context",
    phrases: [
      ["what am i looking at", 12], ["tell me about this", 12],
      ["about this record", 12], ["brief me on this", 12],
      ["summarize this record", 12], ["summarise this record", 12],
      ["what is this record", 12], ["what is on this page", 12],
      ["where does this stand", 12], ["this record", 9],
    ],
    exact: [
      "what is this", "whats this", "what am i on", "summarize this",
      "summarise this", "catch me up", "this page", "status of this",
      "where does this stand", "what is open",
    ],
  },
  {
    intent: "approvals-pending",
    phrases: [
      ["pending approval", 10], ["approvals pending", 10], ["waiting on me", 10],
      ["waiting for me", 10], ["my approvals", 10], ["approval queue", 9],
      ["sign off", 8], ["sign-off", 8], ["my inbox", 7], ["awaiting", 6],
      ["approve", 5], ["approval", 5], ["approvals", 5], ["overdue", 4], ["sla", 4],
    ],
  },
  {
    intent: "launching-soon",
    phrases: [
      ["launching soon", 10], ["launching this month", 10], ["going live", 8],
      ["next 30 days", 8], ["this month", 7], ["upcoming", 7], ["coming up", 7],
      ["what is scheduled", 8], ["schedule", 5], ["calendar", 5],
      ["starts", 4], ["starting", 4], ["launches", 5], ["launching", 5], ["soon", 4],
    ],
  },
  {
    intent: "campaign-risk",
    phrases: [
      ["at risk", 10], ["off track", 10], ["behind schedule", 9], ["in trouble", 8],
      ["red campaign", 8], ["amber", 6], ["health", 6], ["rag", 5], ["risk", 6],
      ["risky", 6], ["slipping", 6], ["underperforming", 7], ["overspend", 6],
      ["burn", 4], ["failing", 6],
    ],
  },
  {
    intent: "budget-roi",
    phrases: [
      ["budget status", 10], ["roi", 9], ["return on investment", 10],
      ["utilization", 8], ["utilisation", 8], ["how much have we spent", 10],
      ["spend", 6], ["spending", 6], ["budget", 6], ["cost", 5], ["money", 5],
      ["financial", 5], ["committed", 4],
    ],
  },
  {
    intent: "policy-blocked",
    phrases: [
      ["blocked by policy", 12], ["policy block", 10], ["what is blocked", 10],
      ["compliance issue", 9], ["non compliant", 9], ["rework", 8],
      ["changes requested", 8], ["violation", 8], ["blocked", 7], ["blocker", 7],
      ["compliance", 6], ["policy", 6], ["policies", 6], ["stuck", 5], ["legal", 4],
    ],
  },
  {
    intent: "brand-guidelines",
    phrases: [
      ["brand guideline", 12], ["brand guidelines", 12], ["brand rules", 10],
      ["clear space", 10], ["minimum size", 9], ["colour palette", 9],
      ["color palette", 9], ["tone of voice", 10], ["brand voice", 10],
      ["typography", 8], ["logo", 8], ["imagery", 7], ["palette", 7],
      ["guardrail", 7], ["tone", 5], ["font", 6], ["swatch", 6],
    ],
  },
  {
    intent: "crisis-status",
    phrases: [
      ["crisis status", 12], ["crisis", 9], ["incident", 8], ["war room", 10],
      ["holding statement", 10], ["escalation", 6], ["outage", 6], ["emergency", 7],
    ],
  },
  {
    intent: "asset-expiry",
    phrases: [
      ["rights expiry", 12], ["rights expire", 12], ["asset expiry", 12],
      ["expiring", 9], ["expires", 9], ["expire", 8], ["expiry", 8],
      ["licence", 7], ["license", 7], ["rights", 6], ["what does it affect", 9],
      ["impact analysis", 9], ["usage", 4],
    ],
  },
];

/** Short deferrals that mean "keep talking about the last answer" (FR-CP-02). */
const FOLLOW_UPS: readonly string[] = [
  "why", "why that", "why is that", "how so", "how come", "and", "so",
  "tell me more", "more", "more detail", "more details", "go on", "elaborate",
  "explain", "explain it", "what about it", "says who", "really", "ok and",
];

/** True when the follow-up is asking for provenance rather than more of the same. */
const PROVENANCE_FOLLOW_UPS: readonly string[] = [
  "why", "why that", "why is that", "how so", "how come", "says who",
  "explain", "explain it", "really",
];

interface MatchResult {
  intent: CopilotIntent;
  score: number;
}

/** Highest-scoring matcher; ties resolve to the earlier matcher. */
export function scoreIntent(query: string): MatchResult {
  const q = normalize(query);
  if (q === "") return { intent: "capabilities", score: 0 };

  let best: MatchResult = { intent: "capabilities", score: 0 };
  for (const matcher of MATCHERS) {
    let score = 0;
    for (const [phrase, weight] of matcher.phrases) {
      if (q.includes(phrase)) score += weight;
    }
    if (matcher.exact?.includes(q)) score += EXACT_WEIGHT;
    if (score > best.score) best = { intent: matcher.intent, score };
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Rule registry (FR-CP-05 — every answer can name the rule that fired) */
/* ------------------------------------------------------------------ */

const INTENT_RULES: Record<CopilotIntent, { rule: string; source: string }> = {
  "approvals-pending": {
    rule: "Approval.approverStakeholderId = the acting stakeholder AND status ∈ {Requested, In Review, Escalated}, ordered by slaDueAt; overdue = slaDueAt before 2026-08-13.",
    source: "myApprovals() over the live Approval collection, joined to subject titles.",
  },
  "launching-soon": {
    rule: `Campaign.startDate, Communication.scheduledAt and Event.startDate inside [2026-08-13, +${LAUNCH_HORIZON_DAYS}d], excluding Cancelled and Archived campaigns.`,
    source: "campaigns, communications and events collections; date math anchored on the seed's TODAY.",
  },
  "campaign-risk": {
    rule: "campaignHealth(): RAG raised from budget burn vs schedule progress, KPI attainment vs schedule, and blocked activities. Amber/red campaigns come from atRiskCampaigns().",
    source: "Campaign, CampaignActivity, KPI and MetricResult records — the same selector the campaign pages render.",
  },
  "budget-roi": {
    rule: "Utilization = committed activity spend / Σ Budget.amountPlanned. ROI = (attributed business-tier value − spend) / spend over measured campaigns only.",
    source: "kpiSummary(), totalPlannedVsCommitted(), roiSummary(), campaignRoi() over Budget, CampaignActivity and MetricResult rows.",
  },
  "policy-blocked": {
    rule: "Blocked work = Content/Communication in Rework + AIReview.overallSeverity 'block' (and block-severity findings) + Approval status 'Changes Requested'/'Escalated' + CampaignActivity status 'Blocked'; governing rules = Policy.enforcement 'block'.",
    source: "contents, communications, aiReviews, approvals, campaignActivities and policies collections.",
  },
  "brand-guidelines": {
    rule: "Brand record named in the query resolved by name-token match; guardrails resolved through Brand.guardrailPolicyIds → Policy; sub-brands inherit the parent brand's guardrails.",
    source: "Brand and Policy records as shown in Asset library → Brand center.",
  },
  "crisis-status": {
    rule: "CrisisIncident ordered Active → Monitoring → Post-mortem → Resolved, then by declaredAt descending. Restricted incidents are masked for roles outside the restricted-viewer list.",
    source: "crisisIncidents, stakeholders, brands, regions and contents collections.",
  },
  "asset-expiry": {
    rule: `Asset.rightsExpiry compared with 2026-08-13; impact = assetImpact() traversal Asset ← ContentVersion → Content → Campaign. Horizon ${EXPIRY_HORIZON_DAYS} days.`,
    source: "assets, contentVersions, contents, campaigns, approvals and notifications collections.",
  },
  "explain-decision": {
    rule: "Replays the previous turn's rule, source records and confidence basis — provenance is stored with the answer, never re-derived from a model.",
    source: "the previous answer in this conversation.",
  },
  "guided-launch": {
    rule: "Fixed operating-model journey: Idea → Campaign → Brief/Activities → Content → AI + policy review → Approval → Calendar → Channels → Measure. Steps the signed-in role cannot open are dropped.",
    source: "the lifecycle stage and workflow reference data, plus a worked example from the campaign collection.",
  },
  "record-context": {
    rule: "Reads the record the open route names — /campaigns/:id or /content/:id, the only two routes that carry a record id — and reports its stored fields plus the same selectors that page renders. A list route carries no record, and none is inferred from one.",
    source: "the route the asking surface is on, joined to campaigns, contents, contentVersions, aiReviews, approvals and campaignActivities.",
  },
  "draft-variants": {
    rule: "One variant per channel the subject's campaign already runs activities on (capped at 3, ordered by channel id), generated by the deterministic content generator and checked against that channel's ChannelConstraint before it is saved. Each saved variant becomes a ContentVersion with `variant` provenance and books one AgentRun against AGT-A4.",
    source: "contents, campaignActivities, channels and channelConstraints; the run writes to contentVersions and agentRuns.",
  },
  "compliance-review": {
    rule: "The brand & compliance rule engine runs over the content's current version against the brand's guardrail policies plus every block-enforced policy. The run writes one AIReview record and books one AgentRun against AGT-A1. Findings advise the reviewer — a block-severity finding holds approval, it never rejects or reworks a record on its own.",
    source: "contents, contentVersions, brands, policies, campaigns and regions; the run writes to aiReviews and agentRuns.",
  },
  capabilities: {
    rule: "No intent matcher scored above zero, so the router declines to answer and lists what it can answer instead.",
    source: "the intent matcher table.",
  },
};

function explain(
  intent: CopilotIntent,
  confidence: CopilotConfidence,
  because: string,
  readCount?: string,
): string {
  const { rule, source } = INTENT_RULES[intent];
  const read = readCount ? `\nRecords read: ${readCount}` : "";
  return `Rule: ${rule}\nSource: ${source}${read}\nConfidence ${confidence} — ${because}\nDeterministic: same question, same workspace data, same answer. No model call.`;
}

/* ------------------------------------------------------------------ */
/* Intent builders                                                     */
/* ------------------------------------------------------------------ */

function buildApprovals(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const me = resolveStakeholder(db, ctx);
  if (!me) {
    return {
      intent: "approvals-pending",
      answer: `No seeded stakeholder holds the ${ctx.role} role, so there is no personal approval queue to read. The shared inbox still shows every pending approval in the workspace.`,
      citations: [{ label: "Approvals inbox", to: "/approvals" }],
      confidence: "low",
      explanation: explain(
        "approvals-pending",
        "low",
        "the acting identity could not be resolved to a Stakeholder record, so the queue cannot be filtered to you.",
      ),
      suggestedActions: [{ label: "Open approvals inbox", to: "/approvals" }],
    };
  }

  const items = myApprovals(db, me.id);
  const overdue = items.filter((i) => daysFromToday(i.approval.slaDueAt) < 0);
  const shown = items.slice(0, 5);

  const header =
    items.length === 0
      ? `Nothing is waiting on you. ${me.name} (${me.role}) has no approvals in Requested, In Review or Escalated.`
      : `${plural(items.length, "approval")} ${items.length === 1 ? "is" : "are"} waiting on you as ${me.name} (${me.role})${
          overdue.length > 0 ? `, and ${overdue.length} ${overdue.length === 1 ? "is" : "are"} past SLA` : ", all inside SLA"
        }.`;

  const lines = shown.map((item) => {
    const days = daysFromToday(item.approval.slaDueAt);
    const due =
      days < 0
        ? `${plural(-days, "day")} overdue`
        : days === 0
          ? "due today"
          : `due in ${plural(days, "day")}`;
    return `${item.subjectTitle} — ${item.approval.subjectEntity} · ${item.approval.status} · ${due} (${fmtDate(item.approval.slaDueAt)})`;
  });

  const answer =
    items.length === 0
      ? header
      : `${header}\n\n${bullets(lines)}${items.length > shown.length ? `\n\n…and ${items.length - shown.length} more in the inbox.` : ""}`;

  const citations: CopilotCitation[] = shown.map((item) => ({
    label: `${item.subjectTitle} (${item.approval.id})`,
    to: routeForSubject(db, item.approval.subjectEntity, item.approval.subjectId),
  }));
  citations.push({ label: "Approvals inbox", to: "/approvals" });

  return {
    intent: "approvals-pending",
    answer,
    citations: filterCitations(ctx.role, citations),
    confidence: "high",
    explanation: explain(
      "approvals-pending",
      "high",
      "this is a direct record lookup on your stakeholder id, not an inference.",
      `${db.approvals.length} Approval records scanned, ${items.length} matched.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open approvals inbox", to: "/approvals" },
      { label: "Back to command center", to: "/dashboard" },
    ]),
    subjectId: me.id,
  };
}

function buildLaunching(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const inWindow = (iso: string): boolean => {
    const d = daysFromToday(iso);
    return d >= 0 && d <= LAUNCH_HORIZON_DAYS;
  };

  const campaigns = db.campaigns
    .filter((c) => c.status !== "Cancelled" && c.status !== "Archived")
    .filter((c) => inWindow(c.startDate))
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE) || a.id.localeCompare(b.id, DEFAULT_LOCALE));

  const comms = db.communications
    .filter((c) => c.scheduledAt !== undefined && inWindow(c.scheduledAt))
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "", DEFAULT_LOCALE) || a.id.localeCompare(b.id, DEFAULT_LOCALE));

  const events = db.events
    .filter((e) => inWindow(e.startDate))
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE) || a.id.localeCompare(b.id, DEFAULT_LOCALE));

  const canSeeRestricted = RESTRICTED_VIEWERS.includes(ctx.role);
  const commLabel = (subject: string, classification: string): string =>
    classification === "Restricted" && !canSeeRestricted ? "Restricted communication" : subject;

  const total = campaigns.length + comms.length + events.length;

  if (total === 0) {
    const next = db.campaigns
      .filter((c) => daysFromToday(c.startDate) > LAUNCH_HORIZON_DAYS)
      .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE))[0];
    return {
      intent: "launching-soon",
      answer: `Nothing starts in the next ${LAUNCH_HORIZON_DAYS} days (window ${fmtDate(TODAY)} → +${LAUNCH_HORIZON_DAYS}d).${
        next ? ` The next campaign to start is ${next.name} on ${fmtDate(next.startDate)}.` : ""
      }`,
      citations: filterCitations(ctx.role, [
        next ? { label: next.name, to: `/campaigns/${next.id}` } : { label: "Campaign list", to: "/campaigns" },
        { label: "Unified calendar", to: "/calendar" },
      ]),
      confidence: "high",
      explanation: explain(
        "launching-soon",
        "high",
        "the window is a date comparison over the whole campaign, communication and event set — nothing is estimated.",
        `${db.campaigns.length} campaigns, ${db.communications.length} communications, ${db.events.length} events scanned.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: "Open calendar", to: "/calendar" },
        { label: "Open campaign list", to: "/campaigns" },
      ]),
    };
  }

  const sections: string[] = [];
  if (campaigns.length > 0) {
    sections.push(
      `Campaigns starting (${campaigns.length}):\n${bullets(
        campaigns.map(
          (c) => `${c.name} — ${fmtDate(c.startDate)} · ${c.status} · ${c.campaignType}`,
        ),
      )}`,
    );
  }
  if (comms.length > 0) {
    sections.push(
      `Communications scheduled (${comms.length}):\n${bullets(
        comms.slice(0, 6).map(
          (c) => `${commLabel(c.subject, c.classification)} — ${fmtDate(c.scheduledAt as string)} · ${c.commsType} · ${c.status}`,
        ),
      )}`,
    );
  }
  if (events.length > 0) {
    sections.push(
      `Events (${events.length}):\n${bullets(
        events.map((e) => `${e.name} — ${fmtDate(e.startDate)} · ${e.eventType} · ${e.venue}`),
      )}`,
    );
  }

  const citations: CopilotCitation[] = [
    ...campaigns.slice(0, 4).map((c) => ({ label: c.name, to: `/campaigns/${c.id}` })),
    ...(comms.length > 0 ? [{ label: "Communications register", to: "/communications" }] : []),
    ...(events.length > 0 ? [{ label: "Events", to: "/events" }] : []),
    { label: "Unified calendar", to: "/calendar" },
  ];

  return {
    intent: "launching-soon",
    answer: `${plural(total, "item")} land in the next ${LAUNCH_HORIZON_DAYS} days (from ${fmtDate(TODAY)}), across the whole workspace — the topbar scope filter is not applied.\n\n${sections.join("\n\n")}`,
    citations: filterCitations(ctx.role, citations),
    confidence: "high",
    explanation: explain(
      "launching-soon",
      "high",
      "every row is a stored start or scheduled date inside the window; no forecasting is involved.",
      `${campaigns.length} campaigns, ${comms.length} communications, ${events.length} events matched.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open calendar", to: "/calendar" },
      ...(campaigns[0] ? [{ label: `Open ${campaigns[0].name}`, to: `/campaigns/${campaigns[0].id}` }] : []),
    ]),
    subjectId: campaigns[0]?.id,
  };
}

function buildRisk(query: string, db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  // A campaign named in the query wins; failing that the campaign open on the
  // page resolves it (and the answer says so); failing that, the last subject.
  const byName = matchByName<Campaign>(query, db.campaigns, (c) => c.name);
  const onPage = byName ? undefined : campaignFromPage(db, ctx);
  const named =
    byName ??
    onPage ??
    (ctx.priorSubjectId
      ? db.campaigns.find((c) => c.id === ctx.priorSubjectId)
      : undefined);

  const ownerName = nameById(db.stakeholders, (s) => s.name);

  if (named) {
    const health = campaignHealth(db, named.id);
    if (!health) {
      return buildCapabilities(ctx, `No health record could be derived for ${named.name}.`);
    }
    const ragWord = health.rag === "green" ? "green (on track)" : health.rag === "amber" ? "amber (watch)" : "red (at risk)";
    const attain =
      health.kpiAttainment === null ? "no KPI data yet" : `KPI attainment ${pct(health.kpiAttainment)}`;
    const answer = [
      `${named.name} is ${ragWord}.`,
      "",
      bullets([
        `Schedule progress ${pct(health.scheduleProgress)} (${fmtDate(named.startDate)} → ${fmtDate(named.endDate)})`,
        `Budget burn ${pct(health.budgetBurn)} of ${fmtCurrency(named.budgetAllocation)} allocated`,
        attain,
        `${plural(health.blockedActivities, "blocked activity", "blocked activities")}`,
        `Owner ${ownerName(named.ownerStakeholderId)} · status ${named.status}`,
      ]),
      "",
      `Why the RAG is ${health.rag}:`,
      bullets(health.reasons),
      ...(onPage ? ["", scopedToPageNote(named.name)] : []),
    ].join("\n");

    return {
      intent: "campaign-risk",
      answer,
      citations: filterCitations(ctx.role, [
        { label: named.name, to: `/campaigns/${named.id}` },
        { label: "Performance", to: "/performance" },
        { label: "Budget", to: "/budget" },
      ]),
      confidence: health.kpiAttainment === null ? "medium" : "high",
      explanation: explain(
        "campaign-risk",
        health.kpiAttainment === null ? "medium" : "high",
        health.kpiAttainment === null
          ? "budget and schedule are measured, but this campaign has no MetricResult rows yet, so the KPI leg of the rule could not fire."
          : "all three legs of the health rule (budget, schedule, KPI) had data.",
        `1 Campaign, ${db.campaignActivities.filter((a) => a.campaignId === named.id).length} activities, ${named.kpiIds.length} KPIs.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: `Open ${named.name}`, to: `/campaigns/${named.id}` },
        { label: "Open performance", to: "/performance" },
      ]),
      subjectId: named.id,
    };
  }

  const rows = atRiskCampaigns(db, {});
  if (rows.length === 0) {
    return {
      intent: "campaign-risk",
      answer: `No campaign is amber or red. All ${plural(db.campaigns.length, "campaign")} in the workspace read green against budget burn, schedule progress and KPI attainment as of ${fmtDate(TODAY)}.`,
      citations: filterCitations(ctx.role, [
        { label: "Campaign list", to: "/campaigns" },
        { label: "Performance", to: "/performance" },
      ]),
      confidence: "high",
      explanation: explain("campaign-risk", "high", "the health rule ran over every campaign and raised nothing.", `${db.campaigns.length} campaigns evaluated.`),
      suggestedActions: filterActions(ctx.role, [{ label: "Open campaign list", to: "/campaigns" }]),
    };
  }

  const red = rows.filter((r) => r.health.rag === "red");
  const amber = rows.filter((r) => r.health.rag === "amber");
  const answer = [
    `${plural(rows.length, "campaign")} ${rows.length === 1 ? "needs" : "need"} attention — ${red.length} red, ${amber.length} amber. Name one and I will break down its RAG.`,
    "",
    bullets(
      rows.map(
        (r) =>
          `${r.campaign.name} — ${r.health.rag} · ${r.health.reasons[0]}`,
      ),
    ),
  ].join("\n");

  return {
    intent: "campaign-risk",
    answer,
    citations: filterCitations(ctx.role, [
      ...rows.slice(0, 5).map((r) => ({ label: r.campaign.name, to: `/campaigns/${r.campaign.id}` })),
      { label: "Performance", to: "/performance" },
    ]),
    confidence: "high",
    explanation: explain(
      "campaign-risk",
      "high",
      "every listed reason is the literal output of the health rule for that campaign.",
      `${db.campaigns.length} campaigns evaluated, ${rows.length} amber or red.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: `Open ${rows[0].campaign.name}`, to: `/campaigns/${rows[0].campaign.id}` },
      { label: "Open campaign list", to: "/campaigns" },
    ]),
    subjectId: rows[0].campaign.id,
  };
}

function buildBudget(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  if (!canSeeNav(ctx.role, "budget")) {
    return {
      intent: "budget-roi",
      answer: `Budget and ROI figures are restricted. The ${ctx.role} identity cannot open the budget module, so I will not report spend, utilization or return here. A CMO, Campaign Manager, Executive or Platform Admin identity can.`,
      citations: filterCitations(ctx.role, [{ label: "Campaign list", to: "/campaigns" }]),
      confidence: "high",
      explanation: explain(
        "budget-roi",
        "high",
        "the access rule is explicit in the RBAC matrix — this is a refusal, not a missing answer.",
      ),
      suggestedActions: filterActions(ctx.role, [{ label: "Open campaign list", to: "/campaigns" }]),
    };
  }

  const summary = kpiSummary(db, {});
  const planned = budgetsPlannedTotal(db, {});
  const { committed } = totalPlannedVsCommitted(db, {});
  const roi = roiSummary(db, {});

  const topSpend = db.campaigns
    .map((c) => ({ campaign: c, spend: campaignSpend(db, c.id), roi: campaignRoi(db, c.id).roi }))
    .filter((r) => r.spend > 0)
    .sort((a, b) => b.spend - a.spend || a.campaign.id.localeCompare(b.campaign.id, DEFAULT_LOCALE))
    .slice(0, 4);

  const answer = [
    `Budget: ${fmtCurrency(committed)} committed against ${fmtCurrency(planned)} planned — ${Math.round(summary.budgetUtilizationPct)}% utilization across ${plural(db.budgets.length, "budget")}.`,
    roi.roi === null
      ? `ROI is not estimable yet: no campaign carries both spend and business-tier metric rows.`
      : `ROI: ${fmtCurrency(roi.attributedValue)} attributed business value on ${fmtCurrency(roi.spend)} measured spend — ${pct(roi.roi)} return across ${plural(roi.measuredCampaignCount, "measured campaign")}. Unmeasured spend is excluded so the ratio compares value against the spend that produced it.`,
    "",
    `Reach ${fmtCompact(summary.totalReach)} · conversions ${fmtCompact(summary.conversions)}${
      summary.avgEngagementRate === null ? "" : ` · mean engagement rate ${summary.avgEngagementRate.toFixed(1)}%`
    }.`,
    "",
    topSpend.length > 0 ? `Largest committed spend:\n${bullets(
      topSpend.map(
        (r) => `${r.campaign.name} — ${fmtCurrency(r.spend)}${r.roi === null ? " · ROI not measurable" : ` · ROI ${pct(r.roi)}`}`,
      ),
    )}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    intent: "budget-roi",
    answer,
    citations: filterCitations(ctx.role, [
      { label: "Budget", to: "/budget" },
      { label: "Performance", to: "/performance" },
      ...topSpend.slice(0, 3).map((r) => ({ label: r.campaign.name, to: `/campaigns/${r.campaign.id}` })),
    ]),
    confidence: roi.roi === null ? "medium" : "high",
    explanation: explain(
      "budget-roi",
      roi.roi === null ? "medium" : "high",
      roi.roi === null
        ? "utilization is exact, but no campaign has business-tier fact rows, so the return leg has nothing to divide."
        : "both legs are sums over stored records — the same selectors the Budget and Performance pages render, so the numbers reconcile.",
      `${db.budgets.length} budgets, ${db.campaignActivities.length} activities, ${db.metricResults.length} metric rows.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open budget", to: "/budget" },
      { label: "Open performance", to: "/performance" },
    ]),
  };
}

function buildPolicyBlocked(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const reworkContents = db.contents.filter((c) => c.status === "Rework");
  const reworkComms = db.communications.filter((c) => c.status === "Rework");
  const blockingReviews = db.aiReviews.filter((r) => r.overallSeverity === "block");
  const blockFindings = db.aiReviews.flatMap((r) =>
    r.findings.filter((f) => f.severity === "block").map((f) => ({ review: r, finding: f })),
  );
  const changesRequested = db.approvals.filter(
    (a) => a.status === "Changes Requested" || a.status === "Escalated",
  );
  const blockedActivities = db.campaignActivities.filter((a) => a.status === "Blocked");
  const blockPolicies = db.policies.filter((p) => p.enforcement === "block");
  const policyName = nameById(db.policies, (p) => p.name);
  const contentTitle = nameById(db.contents, (c) => c.title);

  const total =
    reworkContents.length + reworkComms.length + blockingReviews.length +
    changesRequested.length + blockedActivities.length;

  const sections: string[] = [];
  if (reworkContents.length > 0) {
    sections.push(
      `Content in Rework (${reworkContents.length}):\n${bullets(
        reworkContents.map((c) => `${c.title} — ${c.contentType} · ${c.classification}`),
      )}`,
    );
  }
  if (reworkComms.length > 0) {
    sections.push(
      `Communications in Rework (${reworkComms.length}):\n${bullets(
        reworkComms.map((c) => `${c.subject} — ${c.commsType}`),
      )}`,
    );
  }
  if (blockFindings.length > 0) {
    sections.push(
      `Block-severity AI review findings (${blockFindings.length}):\n${bullets(
        blockFindings.map(
          ({ review, finding }) =>
            `${finding.ruleId} on ${review.subjectEntity} ${review.subjectId}${
              finding.policyId ? ` (${policyName(finding.policyId)})` : ""
            } — ${finding.message}`,
        ),
      )}`,
    );
  } else {
    sections.push(
      `Block-severity AI review findings: none recorded. AIReview rows are produced when a reviewer runs the compliance check on a content version — the collection is empty until one runs in this session.`,
    );
  }
  if (changesRequested.length > 0) {
    sections.push(
      `Approvals holding work back (${changesRequested.length}):\n${bullets(
        changesRequested.map(
          (a) =>
            `${a.subjectEntity} ${a.subjectId}${
              a.subjectEntity === "Content" ? ` — ${contentTitle(a.subjectId)}` : ""
            } · ${a.status}${a.comment ? ` — ${a.comment}` : ""}`,
        ),
      )}`,
    );
  }
  if (blockedActivities.length > 0) {
    const campaignName = nameById(db.campaigns, (c) => c.name);
    sections.push(
      `Blocked campaign activities (${blockedActivities.length}):\n${bullets(
        blockedActivities.map((a) => `${a.name} — ${campaignName(a.campaignId)}`),
      )}`,
    );
  }
  sections.push(
    `Policies that can hard-block (${blockPolicies.length}):\n${bullets(
      blockPolicies.map((p) => `${p.name} (${p.policyKind}) — ${p.ruleText}`),
    )}`,
  );

  const citations: CopilotCitation[] = [
    ...reworkContents.slice(0, 3).map((c) => ({ label: c.title, to: `/content/${c.id}` })),
    ...blockingReviews.slice(0, 2).map((r) => ({
      label: `AI review ${r.id}`,
      to: routeForSubject(db, r.subjectEntity, r.subjectId),
    })),
    { label: "Governance & crisis", to: "/governance" },
    { label: "Approvals inbox", to: "/approvals" },
  ];

  return {
    intent: "policy-blocked",
    answer: `${total === 0 ? "Nothing is currently blocked by policy." : `${plural(total, "item")} ${total === 1 ? "is" : "are"} blocked or held for policy reasons.`}\n\n${sections.join("\n\n")}`,
    citations: filterCitations(ctx.role, citations),
    confidence: "high",
    explanation: explain(
      "policy-blocked",
      "high",
      "every line is a stored status or a stored review finding; the empty AI-review case is reported as empty rather than filled in.",
      `${db.contents.length} contents, ${db.communications.length} communications, ${db.aiReviews.length} AI reviews, ${db.approvals.length} approvals, ${db.policies.length} policies.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open governance", to: "/governance" },
      { label: "Open content studio", to: "/content" },
    ]),
    subjectId: reworkContents[0]?.id,
  };
}

function buildBrand(query: string, db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const byName = matchByName<Brand>(query, db.brands, (b) => b.name, 1);
  // The record on the page carries a brandId — that is a join, not a guess.
  const onPage = byName ? undefined : brandFromPage(db, ctx);
  const brand =
    byName ??
    onPage ??
    (ctx.priorSubjectId ? db.brands.find((b) => b.id === ctx.priorSubjectId) : undefined);

  if (!brand) {
    return {
      intent: "brand-guidelines",
      answer: `Which brand? The workspace governs ${plural(db.brands.length, "brand")}: ${db.brands
        .map((b) => b.name)
        .join(", ")}. Ask again naming one — for example "what are the Volt brand guidelines" — and I will read its voice, palette, typography, clear space, minimum size and guardrail policies.`,
      citations: filterCitations(ctx.role, [
        { label: "Asset library → Brand center", to: "/assets" },
        { label: "Governance & crisis", to: "/governance" },
      ]),
      confidence: "medium",
      explanation: explain(
        "brand-guidelines",
        "medium",
        "the intent is clear but no brand name in the query matched a Brand record, so nothing specific can be answered without guessing.",
        `${db.brands.length} Brand records checked by name.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: "Open brand center", to: "/assets" },
      ]),
    };
  }

  const guardrails = (brand.guardrailPolicyIds ?? [])
    .map((id) => db.policies.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const parent = brand.parentBrandId
    ? db.brands.find((b) => b.id === brand.parentBrandId)
    : undefined;
  const approvedAssets = db.assets.filter(
    (a) => a.brandId === brand.id && (a.status === "Approved" || a.status === "In Use"),
  );

  const lines: string[] = [];
  if (brand.tone) lines.push(`Voice — ${brand.tone}`);
  if (brand.typography) lines.push(`Typography — ${brand.typography}`);
  if (brand.logoDescription) lines.push(`Logo — ${brand.logoDescription}`);
  if (brand.clearSpaceRule) lines.push(`Clear space — ${brand.clearSpaceRule}`);
  if (brand.minSizeRule) lines.push(`Minimum size — ${brand.minSizeRule}`);
  if (brand.imageryGuidelines) lines.push(`Imagery — ${brand.imageryGuidelines}`);
  if (brand.colorPalette && brand.colorPalette.length > 0) {
    lines.push(
      `Palette — ${brand.colorPalette
        .map((c) => `${c.name} ${c.value}${c.pantone ? ` / ${c.pantone}` : ""}`)
        .join("; ")}`,
    );
  }
  lines.push(
    guardrails.length === 0
      ? "Guardrails — no policy is attached to this brand"
      : `Guardrails — ${guardrails.map((p) => `${p.name} (${p.policyKind}, ${p.enforcement})`).join("; ")}`,
  );
  lines.push(`Approved asset pool — ${plural(approvedAssets.length, "asset")} cleared for use`);

  const answer = [
    `${brand.name} brand guidelines${parent ? `, endorsed by ${parent.name} — it inherits ${parent.name}'s guardrails and layers its own voice on top` : ""}.`,
    "",
    bullets(lines),
    ...(onPage
      ? ["", `Resolved from the record open on this page, which belongs to ${brand.name}.`]
      : []),
  ].join("\n");

  return {
    intent: "brand-guidelines",
    answer,
    citations: filterCitations(ctx.role, [
      { label: `${brand.name} — brand center`, to: "/assets" },
      ...guardrails.map((p) => ({ label: `${p.name} (${p.id})`, to: "/governance" })),
      ...(parent ? [{ label: `${parent.name} (parent brand)`, to: "/assets" }] : []),
    ]),
    confidence: "high",
    explanation: explain(
      "brand-guidelines",
      "high",
      "every clause is read verbatim from the Brand record and its linked Policy records — nothing is paraphrased or generated.",
      `1 Brand, ${guardrails.length} guardrail policies, ${approvedAssets.length} approved assets.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open brand center", to: "/assets" },
      { label: "Open governance", to: "/governance" },
    ]),
    subjectId: brand.id,
  };
}

function buildCrisis(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const rank = (status: string): number =>
    status === "Active" ? 0 : status === "Monitoring" ? 1 : status === "Post-mortem" ? 2 : 3;
  const incidents = [...db.crisisIncidents].sort(
    (a, b) => rank(a.status) - rank(b.status) || b.declaredAt.localeCompare(a.declaredAt, DEFAULT_LOCALE),
  );

  if (incidents.length === 0) {
    return {
      intent: "crisis-status",
      answer: "No crisis incident exists in the workspace — nothing is declared, monitoring or in post-mortem.",
      citations: filterCitations(ctx.role, [{ label: "Governance & crisis", to: "/governance" }]),
      confidence: "high",
      explanation: explain("crisis-status", "high", "the CrisisIncident collection is empty; there is nothing to summarize.", "0 incidents."),
      suggestedActions: filterActions(ctx.role, [{ label: "Open crisis center", to: "/governance" }]),
    };
  }

  const canSeeRestricted = RESTRICTED_VIEWERS.includes(ctx.role);
  const brandName = nameById(db.brands, (b) => b.name);
  const regionName = nameById(db.regions, (r) => r.name);
  const person = nameById(db.stakeholders, (s) => s.name);

  const blocks = incidents.map((i) => {
    const masked = i.classification === "Restricted" && !canSeeRestricted;
    if (masked) {
      return `Restricted incident (${i.id}) — ${i.status} · ${i.severity}. Declared ${fmtDate(i.declaredAt)}. Details are withheld from the ${ctx.role} identity; the war room holds the record.`;
    }
    const holding = i.holdingStatementContentId
      ? db.contents.find((c) => c.id === i.holdingStatementContentId)
      : undefined;
    const age = -daysFromToday(i.declaredAt);
    return [
      `${i.title} — ${i.status} · ${i.severity} severity · ${i.classification}`,
      `  Declared ${fmtDate(i.declaredAt)} (${plural(age, "day")} ago)${i.resolvedAt ? `, resolved ${fmtDate(i.resolvedAt)}` : ""}`,
      `  Brands ${i.affectedBrandIds.map(brandName).join(", ") || "none"} · regions ${i.affectedRegionIds.map(regionName).join(", ") || "none"}`,
      `  War room ${i.warRoomStakeholderIds.map(person).join(", ")}`,
      `  Holding statement ${holding ? `${holding.title} (${holding.status})` : "none in the content library"}`,
      `  ${i.summary}`,
    ].join("\n");
  });

  const active = incidents.filter((i) => i.status === "Active");
  const header =
    active.length === 0
      ? `No incident is active. ${plural(incidents.length, "incident")} on record.`
      : `${plural(active.length, "incident")} active of ${incidents.length} on record.`;

  const citations: CopilotCitation[] = [
    { label: "Crisis center", to: "/governance" },
    ...incidents
      .filter((i) => !(i.classification === "Restricted" && !canSeeRestricted))
      .slice(0, 3)
      .map((i) => ({ label: `${i.title} (${i.id})`, to: "/governance" })),
  ];

  return {
    intent: "crisis-status",
    answer: `${header}\n\n${blocks.join("\n\n")}`,
    citations: filterCitations(ctx.role, citations),
    confidence: canSeeRestricted ? "high" : "medium",
    explanation: explain(
      "crisis-status",
      canSeeRestricted ? "high" : "medium",
      canSeeRestricted
        ? "every field is read from the CrisisIncident record and its resolved stakeholder, brand, region and content joins."
        : `the ${ctx.role} identity is outside the restricted-viewer list, so Restricted incidents are reported as masked rather than described.`,
      `${db.crisisIncidents.length} incidents, ${db.stakeholders.length} stakeholders joined.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open crisis center", to: "/governance" },
      { label: "Open communications", to: "/communications" },
    ]),
    subjectId: incidents[0].id,
  };
}

function buildAssetExpiry(query: string, db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const named =
    matchByName<Asset>(query, db.assets, (a) => a.filename, 0.6) ??
    (ctx.priorSubjectId ? db.assets.find((a) => a.id === ctx.priorSubjectId) : undefined);

  const describeImpact = (asset: Asset): string => {
    const impact = assetImpact(db, asset.id);
    const parts = [
      `${plural(impact.contentVersions.length, "content version")} embed it`,
      `${plural(impact.contents.length, "content record")} affected`,
      `${plural(impact.campaigns.length, "campaign")} downstream`,
    ];
    if (impact.approvals.length > 0) parts.push(`${plural(impact.approvals.length, "approval")} on the asset`);
    if (impact.notifications.length > 0) parts.push(`${plural(impact.notifications.length, "notification")} raised`);
    const detail =
      impact.contents.length > 0
        ? `\n  Affected: ${impact.contents.map((c) => c.title).join(", ")}${
            impact.campaigns.length > 0 ? ` → ${impact.campaigns.map((c) => c.name).join(", ")}` : ""
          }`
        : "\n  Nothing downstream references it yet.";
    return `${parts.join(" · ")}${detail}`;
  };

  if (named) {
    const days = named.rightsExpiry ? daysFromToday(named.rightsExpiry) : undefined;
    const when =
      named.rightsExpiry === undefined
        ? "carries no rights expiry — it is not time-limited"
        : days !== undefined && days < 0
          ? `expired ${plural(-days, "day")} ago on ${fmtDate(named.rightsExpiry)}`
          : `expires ${fmtDate(named.rightsExpiry)} (${plural(days ?? 0, "day")} away)`;
    const impact = assetImpact(db, named.id);
    return {
      intent: "asset-expiry",
      answer: `${named.filename} (${named.mediaType}, ${named.status}) ${when}.\n\nImpact if the rights lapse: ${describeImpact(named)}`,
      citations: filterCitations(ctx.role, [
        { label: `${named.filename} (${named.id})`, to: "/assets" },
        ...impact.contents.slice(0, 3).map((c) => ({ label: c.title, to: `/content/${c.id}` })),
        ...impact.campaigns.slice(0, 2).map((c) => ({ label: c.name, to: `/campaigns/${c.id}` })),
      ]),
      confidence: "high",
      explanation: explain(
        "asset-expiry",
        "high",
        "the expiry is a stored date and the blast radius is the graph traversal, not an estimate.",
        `1 Asset, ${impact.contentVersions.length} versions, ${impact.contents.length} contents, ${impact.campaigns.length} campaigns.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: "Open asset library", to: "/assets" },
        ...(impact.contents[0] ? [{ label: `Open ${impact.contents[0].title}`, to: `/content/${impact.contents[0].id}` }] : []),
      ]),
      subjectId: named.id,
    };
  }

  const dated = db.assets
    .filter((a) => a.rightsExpiry !== undefined)
    .map((a) => ({ asset: a, days: daysFromToday(a.rightsExpiry as string) }))
    .filter((r) => r.days <= EXPIRY_HORIZON_DAYS)
    .sort((a, b) => a.days - b.days || a.asset.id.localeCompare(b.asset.id, DEFAULT_LOCALE));

  if (dated.length === 0) {
    const next = db.assets
      .filter((a) => a.rightsExpiry !== undefined)
      .sort((a, b) => (a.rightsExpiry as string).localeCompare(b.rightsExpiry as string, DEFAULT_LOCALE))[0];
    return {
      intent: "asset-expiry",
      answer: `No asset's rights lapse inside the next ${EXPIRY_HORIZON_DAYS} days.${
        next ? ` The nearest is ${next.filename} on ${fmtDate(next.rightsExpiry as string)}.` : ""
      } ${plural(db.assets.filter((a) => a.rightsExpiry === undefined).length, "asset")} carry no expiry at all.`,
      citations: filterCitations(ctx.role, [{ label: "Asset library", to: "/assets" }]),
      confidence: "high",
      explanation: explain("asset-expiry", "high", "a date comparison over every asset with a rights window.", `${db.assets.length} assets scanned.`),
      suggestedActions: filterActions(ctx.role, [{ label: "Open asset library", to: "/assets" }]),
    };
  }

  const nearest = dated[0];
  const lines = dated.map(({ asset, days }) =>
    days < 0
      ? `${asset.filename} — EXPIRED ${fmtDate(asset.rightsExpiry as string)} (${plural(-days, "day")} ago) · ${asset.status}`
      : `${asset.filename} — ${fmtDate(asset.rightsExpiry as string)} (${plural(days, "day")}) · ${asset.status}`,
  );

  const impact = assetImpact(db, nearest.asset.id);
  const answer = [
    `${plural(dated.length, "asset")} ${dated.length === 1 ? "has" : "have"} rights lapsing inside ${EXPIRY_HORIZON_DAYS} days of ${fmtDate(TODAY)}.`,
    "",
    bullets(lines),
    "",
    `Nearest — ${nearest.asset.filename}: ${describeImpact(nearest.asset)}`,
  ].join("\n");

  return {
    intent: "asset-expiry",
    answer,
    citations: filterCitations(ctx.role, [
      { label: "Asset library", to: "/assets" },
      ...impact.contents.slice(0, 3).map((c) => ({ label: c.title, to: `/content/${c.id}` })),
      ...impact.campaigns.slice(0, 2).map((c) => ({ label: c.name, to: `/campaigns/${c.id}` })),
    ]),
    confidence: "high",
    explanation: explain(
      "asset-expiry",
      "high",
      "expiry dates and the impact traversal are both stored graph facts.",
      `${db.assets.length} assets scanned, ${dated.length} inside the horizon.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open asset library", to: "/assets" },
      { label: "Open content studio", to: "/content" },
    ]),
    subjectId: nearest.asset.id,
  };
}

/** FR-CP-06 — the guided journey, as an ordered step list with real links. */
function buildGuidedLaunch(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const steps: { label: string; to: string; detail: string }[] = [
    { label: "Capture and score the idea", to: "/ideas", detail: "Log it in the ideation hub, score it, and promote the winner — the campaign keeps the idea's lineage." },
    { label: "Open the campaign workspace", to: "/campaigns", detail: "Set brand, business unit, regions, dates, budget allocation and the KPIs it will be judged on." },
    { label: "Break it into activities and briefs", to: "/campaigns", detail: "One activity per channel with an owner and spend; a brief per activity carries the objective and key messages." },
    { label: "Draft the content", to: "/content", detail: "Author against the brief in the content studio; every version is an immutable snapshot with its own locale and assets." },
    { label: "Clear brand, legal and policy review", to: "/governance", detail: "Run the AI review, resolve block-severity findings, and check the clause and glossary requirements for the target jurisdictions." },
    { label: "Route the approvals", to: "/approvals", detail: "The workflow decides where the gates sit; approvers act inside SLA and every decision lands in the audit trail." },
    { label: "Schedule it on the calendar", to: "/calendar", detail: "Confirm there is no audience collision with another campaign or a corporate send on the same day." },
    { label: "Wire the channels and journey", to: "/journeys", detail: "One channel execution per channel; sequence multi-step sends in the journey designer." },
    { label: "Measure against the KPIs", to: "/performance", detail: "Attainment, channel mix and ROI reconcile against the KPI targets you set in step 2." },
  ];

  const visible = steps.filter((s) => reachable(ctx.role, s.to));

  const example = db.campaigns
    .filter((c) => c.campaignType === "product-launch")
    .sort((a, b) => b.startDate.localeCompare(a.startDate, DEFAULT_LOCALE) || a.id.localeCompare(b.id, DEFAULT_LOCALE))[0];
  const exampleBrief = example
    ? db.briefs.find((b) => b.campaignId === example.id)
    : undefined;
  const exampleContent = example
    ? db.contents.find((c) => c.campaignId === example.id)
    : undefined;

  const answer = [
    `Launching a product campaign runs through ${plural(visible.length, "step")}${
      visible.length < steps.length ? ` visible to the ${ctx.role} identity` : ""
    }:`,
    "",
    visible.map((s, i) => `${i + 1}. ${s.label} — ${s.detail}`).join("\n"),
    example
      ? `\nWorked example in this workspace: ${example.name} (${example.status}, ${fmtDate(example.startDate)} → ${fmtDate(example.endDate)}, ${fmtCurrency(example.budgetAllocation)} allocated)${
          exampleBrief ? `, brief "${exampleBrief.title}"` : ""
        }${exampleContent ? `, content "${exampleContent.title}"` : ""}. Open it to see each step already populated.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const citations: CopilotCitation[] = [
    ...(example ? [{ label: `${example.name} (worked example)`, to: `/campaigns/${example.id}` }] : []),
    ...(exampleContent ? [{ label: exampleContent.title, to: `/content/${exampleContent.id}` }] : []),
    { label: "Approvals inbox", to: "/approvals" },
    { label: "Unified calendar", to: "/calendar" },
  ];

  return {
    intent: "guided-launch",
    answer,
    citations: filterCitations(ctx.role, citations),
    confidence: "high",
    explanation: explain(
      "guided-launch",
      "high",
      "the sequence is the platform's own operating model, and the worked example is a real campaign record rather than an illustration.",
      `${steps.length} lifecycle steps, ${visible.length} open to this role; example resolved from ${db.campaigns.filter((c) => c.campaignType === "product-launch").length} product-launch campaigns.`,
    ),
    suggestedActions: visible.map((s) => ({ label: s.label, to: s.to })),
    subjectId: example?.id,
  };
}

/* ------------------------------------------------------------------ */
/* Page-aware intents                                                  */
/* ------------------------------------------------------------------ */

/** What the record on the open route is, and where it stands. */
function buildRecordContext(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const person = nameById(db.stakeholders, (s) => s.name);
  const content = contentFromPage(db, ctx);
  const campaign = content ? undefined : campaignFromPage(db, ctx);

  if (content) {
    const brand = db.brands.find((b) => b.id === content.brandId);
    const parentCampaign = content.campaignId
      ? db.campaigns.find((c) => c.id === content.campaignId)
      : undefined;
    const versions = db.contentVersions.filter((v) => v.contentId === content.id);
    const current = currentVersionOf(db, content);
    const review = db.aiReviews
      .filter((r) => r.subjectEntity === "Content" && r.subjectId === content.id)
      .slice()
      .sort((a, b) => b.ranAt.localeCompare(a.ranAt, DEFAULT_LOCALE))[0];
    const openApprovals = db.approvals.filter(
      (a) =>
        a.subjectEntity === "Content" &&
        a.subjectId === content.id &&
        a.status !== "Approved" &&
        a.status !== "Rejected" &&
        a.status !== "Withdrawn",
    );

    const lines = [
      `Status ${content.status} · ${content.contentType} · ${content.classification}`,
      `Brand ${brand?.name ?? content.brandId}${parentCampaign ? ` · campaign ${parentCampaign.name}` : " · not attached to a campaign"}`,
      `Owner ${person(content.ownerStakeholderId)}`,
      current
        ? `Current version ${current.versionNumber} (${current.locale}${current.provenance ? `, ${current.provenance.source}` : ""}) of ${plural(versions.length, "version")}`
        : "No version has been written yet",
      review
        ? `Last brand & compliance check ${fmtDate(review.ranAt)} — ${review.overallSeverity}, ${plural(review.findings.filter((f) => f.severity === "block").length, "block finding")}, ${plural(review.findings.filter((f) => f.severity === "warn").length, "warn finding")}`
        : "No brand & compliance check has been run on it — the AIReview collection holds none for this record",
      openApprovals.length === 0
        ? "No approval is open on it"
        : `${plural(openApprovals.length, "open approval")}: ${openApprovals.map((a) => a.status).join(", ")}`,
    ];

    return {
      intent: "record-context",
      answer: [
        `You have ${content.title} open (${content.id}).`,
        "",
        bullets(lines),
        "",
        "I can act on it: ask me to draft variants, or to run the brand & compliance check. Both write records you can open — nothing is published or approved by either.",
      ].join("\n"),
      citations: filterCitations(ctx.role, [
        { label: `${content.title} (${content.id})`, to: `/content/${content.id}` },
        ...(parentCampaign
          ? [{ label: parentCampaign.name, to: `/campaigns/${parentCampaign.id}` }]
          : []),
        ...(openApprovals.length > 0
          ? [{ label: "Approvals inbox", to: "/approvals" }]
          : []),
      ]),
      confidence: "high",
      explanation: explain(
        "record-context",
        "high",
        "every line is a stored field or a count over records joined to this one — the page and the answer read the same rows.",
        `1 Content, ${versions.length} versions, ${db.aiReviews.filter((r) => r.subjectId === content.id).length} reviews, ${openApprovals.length} open approvals.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: "Open content studio", to: "/content" },
        ...(parentCampaign
          ? [{ label: `Open ${parentCampaign.name}`, to: `/campaigns/${parentCampaign.id}` }]
          : []),
      ]),
      subjectId: content.id,
    };
  }

  if (campaign) {
    const health = campaignHealth(db, campaign.id);
    const activities = db.campaignActivities.filter((a) => a.campaignId === campaign.id);
    const blocked = activities.filter((a) => a.status === "Blocked");
    const contents = db.contents.filter((c) => c.campaignId === campaign.id);
    const briefs = db.briefs.filter((b) => b.campaignId === campaign.id);
    const brand = db.brands.find((b) => b.id === campaign.brandId);

    const lines = [
      `Status ${campaign.status} · ${campaign.campaignType} · ${campaign.classification}`,
      `Brand ${brand?.name ?? campaign.brandId} · owner ${person(campaign.ownerStakeholderId)}`,
      `Runs ${fmtDate(campaign.startDate)} → ${fmtDate(campaign.endDate)} · ${fmtCurrency(campaign.budgetAllocation)} allocated`,
      health
        ? `Health ${health.rag} — ${health.reasons[0]}`
        : "No health record could be derived for it",
      `${plural(activities.length, "activity", "activities")}${blocked.length > 0 ? ` (${blocked.length} blocked)` : ""} · ${plural(contents.length, "content record")} · ${plural(briefs.length, "brief")} · ${plural(campaign.kpiIds.length, "KPI")}`,
    ];

    return {
      intent: "record-context",
      answer: [
        `You have ${campaign.name} open (${campaign.id}).`,
        "",
        bullets(lines),
        "",
        'Ask "why is this at risk" for the full RAG breakdown, or open one of its content records and I can draft variants or run the compliance check against it.',
      ].join("\n"),
      citations: filterCitations(ctx.role, [
        { label: `${campaign.name} (${campaign.id})`, to: `/campaigns/${campaign.id}` },
        ...contents.slice(0, 3).map((c) => ({ label: c.title, to: `/content/${c.id}` })),
        { label: "Performance", to: "/performance" },
      ]),
      confidence: health ? "high" : "medium",
      explanation: explain(
        "record-context",
        health ? "high" : "medium",
        health
          ? "the fields are stored values and the RAG is the same health rule the campaign page renders."
          : "the stored fields are exact, but no health could be derived, so the risk line is reported as missing rather than filled in.",
        `1 Campaign, ${activities.length} activities, ${contents.length} contents, ${briefs.length} briefs.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: `Open ${campaign.name}`, to: `/campaigns/${campaign.id}` },
        { label: "Open content studio", to: "/content" },
      ]),
      subjectId: campaign.id,
    };
  }

  const path = ctx.page?.path;
  return {
    intent: "record-context",
    answer: [
      path
        ? `No record is open. ${path} is a list or index route — it carries no record id, so there is nothing specific for me to read, and I will not pick one of its rows for you.`
        : "I was not told which page you are on, so there is no record for me to read.",
      "",
      "The two routes that open a single record are the campaign detail page (/campaigns/…) and the content detail page (/content/…). Open one and ask again, or name the record in your question.",
    ].join("\n"),
    citations: filterCitations(ctx.role, [
      { label: "Campaign list", to: "/campaigns" },
      { label: "Content studio", to: "/content" },
    ]),
    confidence: "low",
    explanation: explain(
      "record-context",
      "low",
      "the route carries no record id, so there is no subject — declining is the correct answer.",
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open campaign list", to: "/campaigns" },
      { label: "Open content studio", to: "/content" },
    ]),
  };
}

/* ------------------------------------------------------------------ */
/* Action intents — plan only; the caller executes and receipts        */
/* ------------------------------------------------------------------ */

/** Shared refusal when an action intent could not resolve a Content subject. */
function needContentSubject(
  intent: CopilotActionKind,
  what: string,
  db: SeedDB,
  ctx: CopilotContext,
): CopilotAnswer {
  const recent = db.contents
    .slice()
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt, DEFAULT_LOCALE) ||
        a.id.localeCompare(b.id, DEFAULT_LOCALE),
    )
    .slice(0, 4);

  return {
    intent,
    answer: [
      `${what} needs one content record, and I could not resolve one: your question named none and no content record is open on this page.`,
      "",
      "Open a content record and ask again, or name one. Most recently updated:",
      bullets(recent.map((c) => `${c.title} — ${c.status} · ${c.contentType}`)),
    ].join("\n"),
    citations: filterCitations(ctx.role, [
      ...recent.slice(0, 3).map((c) => ({ label: c.title, to: `/content/${c.id}` })),
      { label: "Content studio", to: "/content" },
    ]),
    confidence: "medium",
    explanation: explain(
      intent,
      "medium",
      "the intent is unambiguous but no subject resolved from the query or the open route, so there is nothing to act on — I will not pick a record for you.",
      `${db.contents.length} content records checked by title.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open content studio", to: "/content" },
    ]),
  };
}

/** FR-CS-02/06 — plans a variant run over the channels the campaign already runs. */
function buildDraftVariants(query: string, db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  if (!reachable(ctx.role, "/content")) {
    return {
      intent: "draft-variants",
      answer: `Drafting variants writes new versions into the content studio, and the ${ctx.role} identity cannot open it. I will not write records into a module you cannot see. A Content Manager, Campaign Manager, CMO or Platform Admin identity can run this.`,
      citations: filterCitations(ctx.role, [{ label: "Command center", to: "/dashboard" }]),
      confidence: "high",
      explanation: explain(
        "draft-variants",
        "high",
        "the access rule is explicit in the RBAC matrix — this is a refusal, not a missing answer.",
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: "Open command center", to: "/dashboard" },
      ]),
    };
  }

  const resolved = resolveContent(query, db, ctx);
  if (!resolved) return needContentSubject("draft-variants", "Drafting variants", db, ctx);
  const { content, viaPage } = resolved;

  const { picked, total } = variantChannels(db, content);
  const to = `/content/${content.id}`;

  if (picked.length === 0) {
    return {
      intent: "draft-variants",
      answer: [
        `I cannot derive what to write variants against for ${content.title}.`,
        "",
        content.campaignId
          ? `Its campaign runs no activity with a channel, so there is no channel constraint to write to — and I will not invent a channel for it.`
          : `It is not attached to a campaign, so there are no channel activities to take the channels from — and I will not invent a channel for it.`,
        "",
        "What I can do instead: the content studio's own variant dialog lets a person pick the personas and channels directly, and it runs the same generator I would.",
      ].join("\n"),
      citations: filterCitations(ctx.role, [
        { label: `${content.title} (${content.id})`, to },
        { label: "Content studio", to: "/content" },
      ]),
      confidence: "high",
      explanation: explain(
        "draft-variants",
        "high",
        "the selection rule had no rows to run on; reporting that is exact, guessing a channel would not be.",
        `1 Content, ${content.campaignId ? db.campaignActivities.filter((a) => a.campaignId === content.campaignId).length : 0} campaign activities scanned.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: `Open ${content.title}`, to },
      ]),
      subjectId: content.id,
    };
  }

  const constrained = picked.filter((c) =>
    db.channelConstraints.some((k) => k.channelId === c.id),
  ).length;

  const plan: CopilotActionPlan = {
    kind: "draft-variants",
    label: `Draft ${picked.length} variant${picked.length === 1 ? "" : "s"}`,
    agentId: "AGT-A4",
    subjectEntity: "Content",
    subjectId: content.id,
    subjectLabel: content.title,
    creates: `${plural(picked.length, "ContentVersion")} on ${content.title}, each flagged AI-generated with its basis line, plus ${plural(picked.length, "AgentRun")} in the agent ledger`,
    to,
    channelIds: picked.map((c) => c.id),
  };

  return {
    intent: "draft-variants",
    answer: [
      `I can draft ${plural(picked.length, "variant")} of ${content.title} — one per channel its campaign already runs${total > picked.length ? ` (the first ${picked.length} of ${total} by channel id)` : ""}:`,
      "",
      bullets(picked.map((c) => `${c.name} — ${c.channelKind}`)),
      "",
      `Each becomes a new version in the version history, marked AI-generated, carrying the hypothesis it tests and its constraint check — ${constrained} of ${picked.length} of those channels declare a hard limit, and any body over it is truncated with the overage recorded. The run is booked in the agent ledger as ${plural(picked.length, "AgentRun")} against A4 Content Studio Agent.`,
      "",
      "Nothing is published, approved or routed by this: the versions land as drafts, same as any other.",
      ...(viaPage ? ["", scopedToPageNote(content.title)] : []),
    ].join("\n"),
    citations: filterCitations(ctx.role, [
      { label: `${content.title} (${content.id})`, to },
      ...(content.campaignId
        ? [{ label: "Campaign", to: `/campaigns/${content.campaignId}` }]
        : []),
    ]),
    confidence: "high",
    explanation: explain(
      "draft-variants",
      "high",
      "the channel selection is a join over the campaign's activities and the generator is deterministic — the same click on the same record produces the same copy.",
      `1 Content, ${content.campaignId ? db.campaignActivities.filter((a) => a.campaignId === content.campaignId).length : 0} activities, ${total} distinct channels, ${constrained} channel constraints.`,
    ),
    suggestedActions: filterActions(ctx.role, [{ label: `Open ${content.title}`, to }]),
    subjectId: content.id,
    action: plan,
  };
}

/** FR-BG — plans a brand & compliance run over the content's current version. */
function buildComplianceReview(query: string, db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const resolved = resolveContent(query, db, ctx);
  if (!resolved) {
    return needContentSubject("compliance-review", "The brand & compliance check", db, ctx);
  }
  const { content, viaPage } = resolved;
  const to = `/content/${content.id}`;
  const version = currentVersionOf(db, content);
  const brand = db.brands.find((b) => b.id === content.brandId);

  if (!version || !brand) {
    return {
      intent: "compliance-review",
      answer: [
        `I cannot run the check on ${content.title}.`,
        "",
        !version
          ? "It has no content version yet — the rule engine reads a version's body, and there is none to read."
          : `Its brand (${content.brandId}) does not resolve to a Brand record, so there are no guardrails to check it against.`,
        "",
        "What I can do instead: tell you what the check would evaluate once there is a version — brand voice, banned hype terms, unsubstantiated performance claims, required legal clauses for the target jurisdictions, and the approved lexicon.",
      ].join("\n"),
      citations: filterCitations(ctx.role, [
        { label: `${content.title} (${content.id})`, to },
        { label: "Governance & crisis", to: "/governance" },
      ]),
      confidence: "high",
      explanation: explain(
        "compliance-review",
        "high",
        "the precondition is a stored record that does not exist; saying so is exact.",
        `1 Content, ${db.contentVersions.filter((v) => v.contentId === content.id).length} versions.`,
      ),
      suggestedActions: filterActions(ctx.role, [{ label: `Open ${content.title}`, to }]),
      subjectId: content.id,
    };
  }

  const policies = reviewPoliciesFor(db, brand);
  const guardrails = (brand.guardrailPolicyIds ?? []).length;
  const previous = db.aiReviews.filter(
    (r) => r.subjectEntity === "Content" && r.subjectId === content.id,
  ).length;

  const plan: CopilotActionPlan = {
    kind: "compliance-review",
    label: "Run brand & compliance check",
    agentId: "AGT-A1",
    subjectEntity: "Content",
    subjectId: content.id,
    subjectLabel: content.title,
    creates: `1 AIReview record on ${content.title} ${version.versionNumber}, plus 1 AgentRun in the agent ledger`,
    to,
    versionId: version.id,
    policyIds: policies.map((p) => p.id),
  };

  return {
    intent: "compliance-review",
    answer: [
      `I can run the brand & compliance check on ${content.title} ${version.versionNumber} (${version.locale}) against ${plural(policies.length, "policy", "policies")} — ${brand.name}'s ${plural(guardrails, "guardrail")} plus every block-enforced policy in the workspace.`,
      "",
      bullets(policies.slice(0, 6).map((p) => `${p.name} — ${p.policyKind} · ${p.enforcement}`)),
      policies.length > 6 ? `…and ${policies.length - 6} more.` : "",
      "",
      `It writes one AIReview record — findings with their rule, policy, severity, confidence and the span of the offending text — visible on the content record and booked in the agent ledger as an AgentRun against A1 Brand Governance Agent. ${previous === 0 ? "No check has been run on this record before." : `${plural(previous, "check")} already on record.`}`,
      "",
      "Findings advise the reviewer. A block-severity finding holds approval; I do not reject, rework or change the record's status.",
      ...(viaPage ? ["", scopedToPageNote(content.title)] : []),
    ]
      .filter(Boolean)
      .join("\n"),
    citations: filterCitations(ctx.role, [
      { label: `${content.title} (${content.id})`, to },
      { label: `${brand.name} — brand center`, to: "/assets" },
      { label: "Governance & crisis", to: "/governance" },
    ]),
    confidence: "high",
    explanation: explain(
      "compliance-review",
      "high",
      "the policy set is a join over the brand's guardrails and the block-enforced policies, and the rule engine is deterministic — the same version yields the same findings every run.",
      `1 Content, 1 version, ${policies.length} policies, ${db.legalClauses.length} legal clauses and ${db.glossaryTerms.length} glossary terms available to the engine.`,
    ),
    suggestedActions: filterActions(ctx.role, [{ label: `Open ${content.title}`, to }]),
    subjectId: content.id,
    action: plan,
  };
}

/**
 * The receipt an executed action produces: what was written, where it is, and
 * which ledger entries record it. Pure — the caller supplies the ids it got
 * back from the record store, so the receipt can only ever name records that
 * genuinely exist.
 */
export function buildActionReceipt(
  receipt: CopilotActionReceipt,
  ctx: CopilotContext,
): CopilotAnswer {
  const { plan, created, runIds, notes, error } = receipt;
  const runLine =
    runIds.length === 0
      ? "No agent run was recorded."
      : `Booked in the agent ledger as ${plural(runIds.length, "run")} against ${plan.agentId}: ${runIds.join(", ")}.`;

  if (created.length === 0) {
    return {
      intent: plan.kind,
      answer: [
        `${plan.label} produced nothing on ${plan.subjectLabel}.`,
        "",
        error ?? "The generator returned no output, so no record was written.",
        "",
        `${runLine} It is recorded as failed — a run that produced nothing is not reported as a success.`,
      ].join("\n"),
      citations: filterCitations(ctx.role, [
        { label: plan.subjectLabel, to: plan.to },
        { label: "Agents", to: "/agents" },
      ]),
      confidence: "high",
      explanation: explain(
        plan.kind,
        "high",
        "the outcome is what the record store actually contains after the run: no new record, and a failed ledger entry saying why.",
        `0 records written, ${runIds.length} AgentRun recorded.`,
      ),
      suggestedActions: filterActions(ctx.role, [
        { label: `Open ${plan.subjectLabel}`, to: plan.to },
      ]),
      subjectId: plan.subjectId,
    };
  }

  const headline =
    plan.kind === "draft-variants"
      ? `Drafted ${plural(created.length, "variant")} of ${plan.subjectLabel}.`
      : `Ran the brand & compliance check on ${plan.subjectLabel}.`;

  return {
    intent: plan.kind,
    answer: [
      headline,
      "",
      `Written just now:\n${bullets(created.map((c) => `${c.label} — ${c.entity} ${c.id}`))}`,
      notes.length > 0 ? `\n${bullets(notes)}` : "",
      "",
      runLine,
    ]
      .filter(Boolean)
      .join("\n"),
    citations: filterCitations(ctx.role, [
      ...created.map((c) => ({ label: `${c.label} (${c.id})`, to: c.to })),
      { label: plan.subjectLabel, to: plan.to },
    ]),
    confidence: "high",
    explanation: explain(
      plan.kind,
      "high",
      "every id above is a record that now exists in this workspace — the receipt is built from what the store returned, not from what the action intended to do.",
      `${created.length} records written, ${runIds.length} AgentRun recorded.`,
    ),
    suggestedActions: filterActions(ctx.role, [
      {
        label:
          plan.kind === "draft-variants"
            ? "Open in content studio"
            : `Open ${plan.subjectLabel}`,
        to: plan.to,
      },
      { label: "Open agent activity", to: "/agents" },
    ]),
    subjectId: plan.subjectId,
  };
}

function buildCapabilities(ctx: CopilotContext, preamble?: string): CopilotAnswer {
  const answer = [
    preamble ??
      "I could not match that to anything I can answer from this workspace's data, and I will not invent an answer.",
    "",
    "What I can answer:",
    bullets([
      "Approvals pending on me, with SLA status",
      "What is launching or scheduled in the next 30 days",
      "Why a named campaign is at risk (budget burn, schedule, KPI attainment, blockers)",
      "Budget utilization and ROI across the workspace",
      "What is blocked by policy — rework, block-severity reviews, held approvals",
      "Brand guidelines for a named brand — voice, palette, typography, clear space, guardrails",
      "Crisis status — incidents, severity, war room, holding statements",
      "When an asset's rights expire and what it affects downstream",
      "How to launch a product campaign, step by step",
      "What the record open on this page is and where it stands",
      "Why I gave an answer — the rule, the source records and the confidence",
    ]),
    "",
    "What I can do — each one writes records you can open, and books the run in the agent ledger:",
    bullets([
      "Draft variants of a content record — one per channel its campaign runs, saved as new versions",
      "Run the brand & compliance check on a content record — saved as an AIReview with its findings",
    ]),
  ].join("\n");

  return {
    intent: "capabilities",
    answer,
    citations: filterCitations(ctx.role, [
      { label: "Command center", to: "/dashboard" },
      { label: "Campaign list", to: "/campaigns" },
      { label: "Approvals inbox", to: "/approvals" },
      { label: "Governance & crisis", to: "/governance" },
    ]),
    confidence: "low",
    explanation: explain(
      "capabilities",
      "low",
      "no rule fired, so there is nothing derived to stand behind — declining is the correct answer.",
    ),
    suggestedActions: filterActions(ctx.role, [
      { label: "Open command center", to: "/dashboard" },
    ]),
  };
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

function build(intent: CopilotIntent, query: string, db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  switch (intent) {
    case "approvals-pending":
      return buildApprovals(db, ctx);
    case "launching-soon":
      return buildLaunching(db, ctx);
    case "campaign-risk":
      return buildRisk(query, db, ctx);
    case "budget-roi":
      return buildBudget(db, ctx);
    case "policy-blocked":
      return buildPolicyBlocked(db, ctx);
    case "brand-guidelines":
      return buildBrand(query, db, ctx);
    case "crisis-status":
      return buildCrisis(db, ctx);
    case "asset-expiry":
      return buildAssetExpiry(query, db, ctx);
    case "guided-launch":
      return buildGuidedLaunch(db, ctx);
    case "record-context":
      return buildRecordContext(db, ctx);
    case "draft-variants":
      return buildDraftVariants(query, db, ctx);
    case "compliance-review":
      return buildComplianceReview(query, db, ctx);
    case "explain-decision":
      return buildExplain(db, ctx);
    case "capabilities":
    default:
      return buildCapabilities(ctx);
  }
}

/**
 * FR-CP-05 — surfaces the provenance of the previous answer: which rule fired,
 * which source records it read, and why that confidence.
 *
 * The provenance the previous turn actually carried is preferred (the caller
 * hands it back through `priorExplanation`), so the explanation can never
 * drift from the answer it explains. When a caller supplies only the intent,
 * the router replays it — deterministic, so the replay is faithful — but that
 * path cannot see which branch the original answer took, so the stored
 * explanation always wins.
 */
function buildExplain(db: SeedDB, ctx: CopilotContext): CopilotAnswer {
  const prior = ctx.priorIntent;
  if (!prior || prior === "explain-decision") {
    return {
      intent: "explain-decision",
      answer:
        "There is no previous answer to explain yet. Ask me something first — every answer I give carries the rule that fired, the records it read, and why its confidence is what it is.",
      citations: [{ label: "Command center", to: "/dashboard" }],
      confidence: "low",
      explanation: explain("explain-decision", "low", "nothing has been answered in this conversation yet."),
      suggestedActions: filterActions(ctx.role, [{ label: "Open command center", to: "/dashboard" }]),
    };
  }

  const stored = ctx.priorExplanation;
  const replay = stored
    ? undefined
    : build(prior, ctx.priorQuery ?? "", db, {
        ...ctx,
        priorIntent: undefined,
        priorSubjectId: undefined,
      });
  const provenance = stored ?? (replay as CopilotAnswer).explanation;
  const confidence = ctx.priorConfidence ?? replay?.confidence ?? "medium";
  const citations = ctx.priorCitations ?? replay?.citations ?? [];

  return {
    intent: "explain-decision",
    answer: `That answer came from the "${prior}" rule.\n\n${provenance}`,
    citations: filterCitations(ctx.role, citations),
    confidence,
    explanation: explain(
      "explain-decision",
      confidence,
      stored
        ? "the provenance is quoted from the answer itself, so it cannot drift from what was said."
        : "the provenance is replayed from the same deterministic rule that produced the answer.",
    ),
    suggestedActions: filterActions(ctx.role, replay?.suggestedActions ?? []),
    subjectId: ctx.priorSubjectId ?? replay?.subjectId,
  };
}

/**
 * Route a natural-language question to an intent and answer it from the graph.
 *
 * Deterministic by construction: identical (query, db, ctx) always yields an
 * identical answer. Unmatched queries return the capability list at low
 * confidence — the router never fabricates a record.
 */
export function routeIntent(
  query: string,
  db: SeedDB,
  ctx: { role: AppRole; stakeholderId?: string } & Partial<CopilotContext>,
): CopilotAnswer {
  const context: CopilotContext = { ...ctx, role: ctx.role };
  const normalized = normalize(query);
  const { intent, score } = scoreIntent(query);

  // FR-CP-02 — a bare follow-up defers to the previous turn instead of
  // falling through to the capability list.
  if (score === 0 && context.priorIntent) {
    if (PROVENANCE_FOLLOW_UPS.includes(normalized)) {
      return buildExplain(db, context);
    }
    if (FOLLOW_UPS.includes(normalized)) {
      return build(context.priorIntent, context.priorQuery ?? query, db, context);
    }
  }

  return build(intent, query, db, context);
}

/** Starter prompts shown in the panel — each one matches a real intent. */
export const COPILOT_STARTERS: readonly string[] = [
  "What approvals are pending on me?",
  "What is launching this month?",
  "Which campaigns are at risk and why?",
  "How do I launch a product campaign?",
];

/**
 * Starters for the route the asker is on. A record route offers the things
 * that record can actually answer or produce; every other route falls back to
 * the workspace-wide set, because offering "draft variants" where nothing can
 * receive them would be an empty promise.
 */
export function startersFor(page: CopilotPageContext | undefined): readonly string[] {
  if (page?.entity === "Content") {
    return [
      "What is this?",
      "Draft variants for this content",
      "Run the brand & compliance check",
      "What are the brand guidelines here?",
    ];
  }
  if (page?.entity === "Campaign") {
    return [
      "What is this?",
      "Why is this at risk?",
      "What are the brand guidelines here?",
      "What approvals are pending on me?",
    ];
  }
  return COPILOT_STARTERS;
}
