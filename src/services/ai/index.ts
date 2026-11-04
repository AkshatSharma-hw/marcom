/**
 * AI service seam (BLUEPRINT.md Part 10 §3).
 *
 * One `aiService` interface fronts every AI-assisted surface — no feature
 * calls a model directly. The demo binds the deterministic simulated
 * provider (`./simulated`); swapping in a real LLM backend is a provider
 * change behind this same seam, touching zero feature code.
 */

import type {
  AIReview,
  Brand,
  Brief,
  ChannelKind,
  Classification,
  Content,
  EntityName,
  Idea,
  Policy,
  SeedDB,
} from "@/data/types";
import type { InclusiveTermRule } from "./simulated";
import { simulatedAIService } from "./simulated";

/** Scope the acting request carries into every AI call. */
export interface AIContext {
  /** The full seed graph the provider composes from. */
  db: SeedDB;
}

/** Result of a draft-generation call — always a draft, never auto-published. */
export interface AIDraft {
  title: string;
  body: string;
}

/** Structured campaign proposal derived from an Idea — proposal only. */
export interface CampaignProposal {
  name: string;
  objective: string;
  /** Channel ids resolved against the Channel registry. */
  channels: string[];
  audienceId: string;
  budgetEstimate: number;
  kpiSuggestions: string[];
  /**
   * Mean historical campaignRoi across the brand's measured campaigns
   * (a fraction, e.g. 0.42 = +42%), or null when the brand has no campaigns
   * with attributed business value yet.
   */
  estimatedRoi: number | null;
  /** Provenance note for estimatedRoi (which campaigns it derives from). */
  roiNote: string;
}

/** Subject copy plus the joins the rule engine needs to evaluate it. */
export interface ReviewInput {
  title: string;
  body: string;
  brand: Brand;
  channelKind?: ChannelKind;
  classification: Classification;
  /**
   * Region codes the content targets (its campaign's regions). 'EMEA' makes
   * unsubstantiated performance claims block-level (POL-002) instead of warn.
   */
  regionCodes?: string[];
  /** ISO date the linked campaign starts — the POL-003 embargo reference. */
  campaignStartDate?: string;
  /**
   * ISO date the review runs "as of" (callers pass today). Kept as an input so
   * the engine stays a pure function: same input object → same findings.
   * Also the "as of" date for legal-clause currency (FR-BG-16).
   */
  reviewDate?: string;
  /**
   * Region ids the content targets (its campaign's `regionIds`). Jurisdictions
   * resolve from these via `db.jurisdictions` (FR-BG-19). When omitted the
   * engine falls back to resolving `regionCodes` through `db.regions`, and
   * failing that to the GLOBAL jurisdiction alone.
   */
  regionIds?: string[];
  /** BCP-47 locale of the reviewed version, e.g. 'ar-SA'. Defaults to 'en-US'. */
  locale?: string;
  /**
   * Product category of the subject, matching `LegalClause.productCategory`
   * (e.g. 'smartphone'). Category-restricted clauses are only required when
   * this is supplied — the engine never guesses a category.
   */
  productCategory?: string;
  /**
   * Override for the FR-BG-23 inclusive-language list. Omit to use
   * `DEFAULT_INCLUSIVE_TERMS` from the provider.
   */
  inclusiveTerms?: InclusiveTermRule[];
}

/**
 * The rule-engine verdict — an AIReview minus its persistence envelope.
 * `scores` and `context` are always produced by a run (they are optional on
 * the persisted AIReview only because runs recorded before A1 lack them).
 */
export type AIReviewResult = Pick<AIReview, "findings" | "overallSeverity"> &
  Required<Pick<AIReview, "scores" | "context">>;

/* ------------------------------------------------------------------ */
/* A4 · Content Studio generation (FR-CS-02/06/08/09/10)               */
/* ------------------------------------------------------------------ */

/** What a variant run is scoped to: which personas, which channels, one db. */
export interface VariantRequest extends AIContext {
  /** CustomerPersona ids — one persona variant each (FR-CS-02). */
  personas?: string[];
  /** Channel ids — one channel variant each (FR-CS-02). */
  channels?: string[];
}

/**
 * One generated variant. `withinConstraints` + `violations` are the FR-CS-06
 * verdict, computed at generation time against the channel's ChannelConstraint
 * — a variant is never returned without its constraint check already run.
 */
export interface ContentVariant {
  /** Deterministic id, stable for the same (input, persona/channel) pair. */
  id: string;
  /** Readable label for the card header, e.g. 'Upgrade-ready Uma'. */
  label: string;
  /** Set on persona variants (FR-CS-02). */
  personaId?: string;
  /** Set on channel variants (FR-CS-02). */
  channelId?: string;
  /** The A/B rationale — what this variant is testing and why (FR-CS-08). */
  hypothesis: string;
  /** Subject / headline line, already trimmed to `subjectMaxChars`. */
  subject: string;
  /** Body copy, already truncated to `maxChars` where the channel caps it. */
  body: string;
  /** False when any constraint was breached before truncation/flagging. */
  withinConstraints: boolean;
  /** One line per breach, naming the limit and the channel it comes from. */
  violations: string[];
  /** Characters the composed body ran over `maxChars`; 0 when within limits. */
  overBy: number;
  /** True when `body` was cut to fit the channel cap. */
  truncated: boolean;
  /** Channel whose ChannelConstraint was applied (a persona's lead channel
   *  on persona variants, the variant's own channel on channel variants). */
  constrainedByChannelId?: string;
  /** The ChannelConstraint id the check ran against, when one exists. */
  constraintId?: string;
  /** Prompt-ish provenance line recorded on any version saved from this variant. */
  basis: string;
}

/** Result of an FR-CS-09 refinement pass. */
export interface RefinedDraft {
  /** The regenerated body. Every `preserve` fragment appears in it verbatim. */
  body: string;
  /** The fragments carried through untouched, in output order. */
  preserved: string[];
  /** Preserved fragments that were not found in the source body and were re-appended. */
  reattached: string[];
  /** What the refinement did, one line per applied instruction. */
  changes: string[];
  /** Prompt-ish provenance line for the resulting version. */
  basis: string;
}

/** One thing the design team has to produce, with its hard spec. */
export interface CreativeDeliverable {
  format: string;
  spec: string;
}

/** FR-CS-10 — a design-team brief derived from the content record. */
export interface CreativeBrief {
  objective: string;
  audience: string;
  deliverables: CreativeDeliverable[];
  mandatories: string[];
}

export interface AIService {
  /** Draft copy from a Brief or an existing Content item. */
  generateDraft(input: Brief | Content, ctx: AIContext): AIDraft;
  /** Idea → structured, editable campaign proposal — never an auto-launched campaign. */
  proposeCampaign(idea: Idea, ctx: AIContext): CampaignProposal;
  /** One-line narrative summary over a homogeneous record set. */
  summarize(entityKind: EntityName, records: ReadonlyArray<Record<string, unknown>>): string;
  /**
   * Deterministic brand & compliance rule engine. Runs only the rule groups
   * whose policy appears in `policies`; every finding cites its ruleId,
   * policyId, a confidence, and — where the offending text is locatable — a
   * span into the reviewed text `${title}\n${body}`. Findings advise the reviewer
   * reviewer: block-level findings hold approval, they never auto-reject.
   *
   * `ctx` supplies the reference data the library-backed groups read
   * (`db.jurisdictions`, `db.legalClauses`, `db.glossaryTerms`). Without it
   * those groups report themselves as not evaluated rather than guessing.
   */
  reviewContent(input: ReviewInput, policies: Policy[], ctx?: AIContext): AIReviewResult;
  /**
   * One variant per selected persona and one per selected channel, from a
   * single Brief or Content item (FR-CS-02). Each variant carries the
   * hypothesis it is testing (FR-CS-08) and has already been checked — and
   * where necessary truncated — against the channel's ChannelConstraint
   * (FR-CS-06). Deterministic: same input + same selection → same variants.
   */
  generateVariants(input: Brief | Content, req: VariantRequest): ContentVariant[];
  /**
   * Regenerate a body against reviewer feedback while carrying the approved
   * fragments through verbatim (FR-CS-09). Every string in `preserve` is
   * guaranteed to appear in the returned body unchanged.
   */
  refineDraft(body: string, feedback: string, preserve: string[]): RefinedDraft;
  /** Design-team creative brief with asset specifications (FR-CS-10). */
  generateCreativeBrief(content: Content, ctx: AIContext): CreativeBrief;
}

/* ------------------------------------------------------------------ */
/* Async shape over the same deterministic engine                      */
/* ------------------------------------------------------------------ */

/**
 * `AIService`, method for method, with every return type wrapped in a Promise.
 *
 * This exists so a caller can `await` a call, show a running state while it is
 * in flight, and record an `AgentRun` around it — the things a real backend
 * would force on them anyway. It does NOT exist to make the engine asynchronous.
 *
 * The determinism contract is unchanged and non-negotiable: the same input
 * still produces byte-identical output, because these methods call the very same
 * synchronous functions and hand back what they return. There is no timer, no
 * clock, no randomness and no network anywhere in this seam — an awaited call
 * resolves on the microtask queue with a value that was already computed
 * synchronously. Swapping in a real provider later replaces the implementation
 * behind this interface; it does not change its shape.
 */
export interface AsyncAIService {
  generateDraft(input: Brief | Content, ctx: AIContext): Promise<AIDraft>;
  proposeCampaign(idea: Idea, ctx: AIContext): Promise<CampaignProposal>;
  summarize(
    entityKind: EntityName,
    records: ReadonlyArray<Record<string, unknown>>,
  ): Promise<string>;
  reviewContent(
    input: ReviewInput,
    policies: Policy[],
    ctx?: AIContext,
  ): Promise<AIReviewResult>;
  generateVariants(input: Brief | Content, req: VariantRequest): Promise<ContentVariant[]>;
  refineDraft(body: string, feedback: string, preserve: string[]): Promise<RefinedDraft>;
  generateCreativeBrief(content: Content, ctx: AIContext): Promise<CreativeBrief>;
}

/**
 * Wraps a synchronous `AIService` in the async shape without altering a single
 * value it returns. Each wrapper computes eagerly and resolves with the result,
 * so `await asyncAIService.x(...)` and `aiService.x(...)` are always equal.
 *
 * A thrown error stays a rejected promise rather than a synchronous throw, which
 * is what an `await`ing caller expects — the value on the success path is
 * untouched either way.
 */
export function toAsyncAIService(service: AIService): AsyncAIService {
  return {
    async generateDraft(input, ctx) {
      return service.generateDraft(input, ctx);
    },
    async proposeCampaign(idea, ctx) {
      return service.proposeCampaign(idea, ctx);
    },
    async summarize(entityKind, records) {
      return service.summarize(entityKind, records);
    },
    async reviewContent(input, policies, ctx) {
      return service.reviewContent(input, policies, ctx);
    },
    async generateVariants(input, req) {
      return service.generateVariants(input, req);
    },
    async refineDraft(body, feedback, preserve) {
      return service.refineDraft(body, feedback, preserve);
    },
    async generateCreativeBrief(content, ctx) {
      return service.generateCreativeBrief(content, ctx);
    },
  };
}

/**
 * The awaitable seam bound to the same deterministic provider as `aiService`.
 * Prefer this in surfaces that want to show a running state or record an
 * `AgentRun`; keep using `aiService` where a synchronous value is wanted. The
 * two never disagree.
 */
export const asyncAIService: AsyncAIService = toAsyncAIService(simulatedAIService);

export { simulatedAIService as aiService } from "./simulated";
export { DEFAULT_INCLUSIVE_TERMS, contentParagraphs } from "./simulated";
export type { InclusiveTermRule } from "./simulated";
