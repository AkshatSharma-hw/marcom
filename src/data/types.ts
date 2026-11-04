/**
 * MarComm MVP seed graph — entity type definitions.
 *
 * Matches the BLUEPRINT.md domain model (Part "Domain Model & Seed Architecture").
 * Every entity carries `id`, `createdAt`, `updatedAt` (ISO 8601 strings).
 * Foreign keys are plain string ids with readable prefixes (see SEED_MANIFEST.md
 * for the binding ID universe). The frozen `SeedDB` aggregates every seed array.
 */

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export type EntityName =
  | 'Organization'
  | 'BusinessUnit'
  | 'Brand'
  | 'Region'
  | 'Stakeholder'
  | 'Agency'
  | 'Idea'
  | 'Strategy'
  | 'Campaign'
  | 'CampaignActivity'
  | 'Brief'
  | 'Communication'
  | 'ChannelExecution'
  | 'Channel'
  | 'Content'
  | 'ContentVersion'
  | 'Asset'
  | 'Audience'
  | 'Segment'
  | 'Workflow'
  | 'WorkflowStage'
  | 'Approval'
  | 'Policy'
  | 'Notification'
  | 'Budget'
  | 'KPI'
  | 'MetricResult'
  | 'AuditRecord'
  | 'Journey'
  | 'Event'
  | 'CrisisIncident'
  | 'MediaContact'
  | 'CoverageItem'
  | 'SuppressionEntry'
  | 'ConsentSummary'
  | 'CustomerPersona'
  | 'Competitor'
  | 'AIReview'
  | 'LifecycleStage'
  | 'MarcomAgent'
  | 'Jurisdiction'
  | 'LegalClause'
  | 'GlossaryTerm'
  | 'PositioningFramework'
  | 'MessagingHouse'
  | 'MarketSizing'
  | 'BudgetScenario'
  | 'ChannelConstraint'
  | 'Benchmark'
  | 'PlaybookPattern'
  | 'AgentRun';

export interface TypedLink {
  rel: string;
  entity: EntityName;
  id: string;
}

export type Classification = 'Public' | 'Internal' | 'Confidential' | 'Restricted';

/* ------------------------------------------------------------------ */
/* Status unions                                                       */
/* ------------------------------------------------------------------ */

export type CampaignStatus =
  | 'Draft'
  | 'Planned'
  | 'In Approval'
  | 'Approved'
  | 'Live'
  | 'Paused'
  | 'Completed'
  | 'Archived'
  | 'Cancelled';

export type ContentStatus =
  | 'Draft'
  | 'In Review'
  | 'Rework'
  | 'Approved'
  | 'Published'
  | 'Retired'
  | 'Archived'
  | 'Discarded';

export type CommunicationStatus =
  | 'Idea'
  | 'Briefed'
  | 'Drafting'
  | 'In Review'
  | 'Rework'
  | 'Approved'
  | 'Scheduled'
  | 'Live'
  | 'Paused'
  | 'Completed'
  | 'Archived'
  | 'Killed';

export type ApprovalStatus =
  | 'Requested'
  | 'In Review'
  | 'Changes Requested'
  | 'Escalated'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired';

export type IdeaStatus = 'Draft' | 'Scored' | 'Approved' | 'Promoted' | 'Parked' | 'Archived';

export type ChannelExecutionStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'failed';

export type AssetStatus =
  | 'Uploaded'
  | 'Cataloged'
  | 'Approved'
  | 'In Use'
  | 'Expired'
  | 'Archived'
  | 'Rejected';

export type CampaignActivityStatus = 'Planned' | 'In Progress' | 'Completed' | 'Blocked';

export type BriefStatus = 'Draft' | 'In Review' | 'Approved';

export type CrisisSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type CrisisStatus = 'Monitoring' | 'Active' | 'Resolved' | 'Post-mortem';

/** The ten personas + Platform Admin — the one role vocabulary. */
export type AppRole =
  | 'CMO'
  | 'Campaign Manager'
  | 'Corporate Comms Manager'
  | 'Content Manager'
  | 'Brand Manager'
  | 'PR Manager'
  | 'Internal Comms Manager'
  | 'Legal/Compliance Reviewer'
  | 'Executive'
  | 'Agency User'
  | 'Platform Admin';

/* ------------------------------------------------------------------ */
/* Controlled vocabularies (blueprint-defined kinds)                   */
/* ------------------------------------------------------------------ */

export type CommsType = 'internal' | 'external' | 'corporate' | 'investor';

export type CampaignType = 'product-launch' | 'seasonal' | 'always-on' | 'internal' | 'thought-leadership';

export type ContentType = 'email' | 'post' | 'PR' | 'script' | 'page';

export type ChannelKind =
  | 'email'
  | 'social'
  | 'web'
  | 'press'
  | 'intranet'
  | 'event'
  | 'SMS'
  | 'print'
  | 'ads';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type AudienceKind = 'customer' | 'employee' | 'investor' | 'press' | 'regulator';

export type PolicyKind = 'brand' | 'legal' | 'regulatory' | 'accessibility';

export type NotifKind = 'approval-due' | 'sla-breach' | 'asset-expiry' | 'crisis';

export type WorkflowAppliesTo = 'Communication' | 'Campaign' | 'Content' | 'Asset' | 'CrisisIncident';

export type KpiTier = 'reach' | 'engagement' | 'conversion' | 'business' | 'brand';

/* ------------------------------------------------------------------ */
/* Base                                                                */
/* ------------------------------------------------------------------ */

export interface BaseEntity {
  id: string;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Org backbone                                                        */
/* ------------------------------------------------------------------ */

export interface Organization extends BaseEntity {
  name: string;
}

export interface BusinessUnit extends BaseEntity {
  name: string;
  organizationId: string;
}

export interface Brand extends BaseEntity {
  name: string;
  organizationId: string;
  /** Voice/tone description shown in the brand center. */
  tone?: string;
  /** Policies enforced as brand guardrails (resolve into seed policies). */
  guardrailPolicyIds?: string[];
  /** One-sentence description of the logo mark. */
  logoDescription?: string;
  /**
   * Named brand colors. `value` is a raw CSS color string (e.g. '#0f62fe').
   * `cmyk` / `pantone` carry the print-production equivalents so the same
   * swatch answers both screen and print questions.
   * This is brand DATA rendered as swatches, NOT UI theming — it is exempt
   * from the UI no-hex rule.
   */
  colorPalette?: { name: string; value: string; cmyk?: string; pantone?: string }[];
  /** Type stack summary, e.g. 'Poppins — geometric sans'. */
  typography?: string;
  /** Photography / illustration direction for the brand. */
  imageryGuidelines?: string;
  /** Minimum exclusion zone around the logo, e.g. 'Clear space = height of the A on all sides.' */
  clearSpaceRule?: string;
  /** Smallest permitted reproduction size, e.g. 'Digital: 24px height. Print: 10mm.' */
  minSizeRule?: string;
  /**
   * Parent brand this brand inherits from (sub-brand relationship). A sub-brand
   * adopts the parent's guardrails unless it overrides them locally.
   */
  parentBrandId?: string;
}

export interface Region extends BaseEntity {
  name: string;
  /** Short region code, e.g. 'AMER' | 'EMEA' | 'APAC' */
  code: string;
}

export interface Stakeholder extends BaseEntity {
  name: string;
  role: AppRole;
  businessUnitId: string;
  regionId: string;
  brandIds: string[];
  email: string;
  /** Avatar initials, e.g. 'MC' */
  avatar: string;
  /** Explicit agency affiliation for agency personas (hard scoping join). */
  agencyId?: string;
}

export interface Agency extends BaseEntity {
  name: string;
  capabilities: string[];
  regionIds: string[];
}

/* ------------------------------------------------------------------ */
/* Strategy & ideation                                                 */
/* ------------------------------------------------------------------ */

export interface Idea extends BaseEntity {
  title: string;
  description: string;
  /** e.g. 'workshop' | 'field' | 'ai-suggested' | 'customer-feedback' */
  source: string;
  /** 0–100 composite score */
  score: number;
  status: IdeaStatus;
  brandId: string;
  businessUnitId: string;
  regionId: string;
  promotedToCampaignId?: string;
}

export interface Strategy extends BaseEntity {
  title: string;
  /** e.g. 'FY2026' | 'FY2026-H2' */
  horizon: string;
  objectives: string[];
  kpiIds: string[];
  businessUnitId: string;
  /** One-sentence market positioning statement for this strategy. */
  positioning?: string;
  /** Customer-facing value propositions the strategy leads with. */
  valuePropositions?: string[];
}

/** The four positioning frameworks the planner can work in. */
export type PositioningFrameworkKey =
  | 'positioning-statement'
  | 'value-proposition-canvas'
  | 'messaging-house'
  | 'jobs-to-be-done';

/**
 * Reference data — the shape of one positioning framework. `fields` is the
 * canonical prompt list a strategist fills in; the framework itself holds no
 * campaign content.
 */
export interface PositioningFramework extends BaseEntity {
  key: PositioningFrameworkKey;
  name: string;
  description: string;
  fields: { label: string; hint: string }[];
}

/** The filled-in messaging house for one strategy. */
export interface MessagingHouse extends BaseEntity {
  strategyId: string;
  /** The roof: the one thing the market must remember. */
  primaryMessage: string;
  /** The supporting pillars, each with the evidence that holds it up. */
  pillars: { title: string; proofPoints: string[] }[];
  /** Known pushback and the approved response. */
  objections: { objection: string; response: string }[];
}

/** TAM / SAM / SOM sizing for one business unit. */
export interface MarketSizing extends BaseEntity {
  businessUnitId: string;
  /** Total addressable market, in `currency`. */
  tam: number;
  /** Serviceable addressable market, in `currency`. */
  sam: number;
  /** Serviceable obtainable market, in `currency`. */
  som: number;
  /** ISO 4217 code, e.g. 'USD'. */
  currency: string;
  /** How the numbers were derived, in one or two sentences. */
  methodology: string;
  assumptions: string[];
  sourceLabel: string;
  /** Certainty in the sizing, 0–1. */
  confidence: number;
}

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

export interface Campaign extends BaseEntity {
  name: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  classification: Classification;
  strategyId?: string;
  ideaId?: string;
  brandId: string;
  businessUnitId: string;
  regionIds: string[];
  budgetAllocation: number;
  ownerStakeholderId: string;
  /** ISO date */
  startDate: string;
  /** ISO date */
  endDate: string;
  kpiIds: string[];
  workflowId: string;
}

export interface CampaignActivity extends BaseEntity {
  name: string;
  campaignId: string;
  channelId: string;
  /** ISO date */
  startDate: string;
  /** ISO date */
  endDate: string;
  agencyId?: string;
  status: CampaignActivityStatus;
  spendAllocated: number;
  ownerStakeholderId: string;
}

export interface Brief extends BaseEntity {
  title: string;
  objective: string;
  keyMessages: string[];
  campaignId: string;
  campaignActivityId?: string;
  authorStakeholderId: string;
  approvalId?: string;
  status: BriefStatus;
}

/* ------------------------------------------------------------------ */
/* Communications & channels                                           */
/* ------------------------------------------------------------------ */

export interface Communication extends BaseEntity {
  subject: string;
  commsType: CommsType;
  status: CommunicationStatus;
  classification: Classification;
  campaignActivityId?: string;
  audienceId: string;
  contentId?: string;
  /** ISO 8601 timestamp */
  scheduledAt?: string;
  ownerStakeholderId: string;
  /** 2–3 sentences of the actual message copy (high-profile comms only). */
  body?: string;
}

/** One delivery record per (Communication x Channel). Channel-agnostic core. */
export interface ChannelExecution extends BaseEntity {
  communicationId: string;
  channelId: string;
  contentVersionId?: string;
  /** ISO 8601 timestamp */
  scheduledAt?: string;
  status: ChannelExecutionStatus;
}

export interface Channel extends BaseEntity {
  name: string;
  channelKind: ChannelKind;
  /** Resolves to a ChannelAdapter implementation, e.g. 'email-sendgrid' */
  adapterKey: string;
  capabilities: string[];
  regionIds: string[];
  ownerStakeholderId: string;
}

/** Hard delivery limits one channel imposes on the copy it carries. */
export interface ChannelConstraint extends BaseEntity {
  channelId: string;
  /** Max characters in the body; omitted = no hard cap. */
  maxChars?: number;
  /** Max characters in the subject line; email-like channels only. */
  subjectMaxChars?: number;
  /** Whether images shipped on this channel must carry alt text. */
  requiresAltText: boolean;
  /** Anything a writer must know that the numbers don't say. */
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Content & assets                                                    */
/* ------------------------------------------------------------------ */

export interface Content extends BaseEntity {
  title: string;
  contentType: ContentType;
  status: ContentStatus;
  classification: Classification;
  briefId?: string;
  campaignId?: string;
  brandId: string;
  ownerStakeholderId: string;
  currentVersionId?: string;
  workflowId: string;
}

/** How a ContentVersion came into existence (FR-CS-12). */
export type ProvenanceSource =
  | 'ai-draft'
  | 'variant'
  | 'refinement'
  | 'localization'
  | 'manual';

/**
 * Where a version came from and what produced it (FR-CS-12). `aiGenerated`
 * says only *whether* a machine was involved; this says which surface asked,
 * which generator answered, and on what basis — the prompt-ish line a reviewer
 * needs to judge an AI-produced version.
 */
export interface ContentProvenance {
  source: ProvenanceSource;
  /** Generator identity, e.g. 'simulated-ai · deterministic'. Absent for manual edits. */
  generator?: string;
  /** The prompt-ish basis line: what the generator was asked to produce. */
  basis?: string;
  /** Version this one was derived from. */
  derivedFromVersionId?: string;
  /** CustomerPersona the variant was written for. */
  personaId?: string;
  /** Channel whose constraints the variant was written against. */
  channelId?: string;
  /** Fragments a refinement carried through verbatim. */
  preservedFragments?: string[];
  /** Reviewer feedback that drove a refinement. */
  feedback?: string;
}

export interface ContentVersion extends BaseEntity {
  contentId: string;
  /** e.g. 'V1', 'V1.1', 'V2' */
  versionNumber: string;
  /** BCP-47 locale, e.g. 'en-US' */
  locale: string;
  /** Target region for localized variants; omitted = global/default */
  regionId?: string;
  /** 2–4 sentences of actual copy */
  body: string;
  /** Assets embedded in this version (drives asset impact analysis) */
  assetIds?: string[];
  approvalId?: string;
  aiGenerated: boolean;
  /** FR-CS-12 — origin trail. Absent on versions authored before A4. */
  provenance?: ContentProvenance;
}

export interface Asset extends BaseEntity {
  filename: string;
  mediaType: MediaType;
  brandId: string;
  /** ISO date — rights window end; expiry is a compliance event */
  rightsExpiry?: string;
  status: AssetStatus;
}

/* ------------------------------------------------------------------ */
/* Audiences                                                           */
/* ------------------------------------------------------------------ */

export interface Audience extends BaseEntity {
  name: string;
  audienceKind: AudienceKind;
  segmentIds: string[];
  regionIds: string[];
}

export interface Segment extends BaseEntity {
  name: string;
  /** Readable targeting criteria expression */
  criteria: string;
  /** Raw seeded population used by the segmentSize selector */
  population: number;
}

export type SuppressionReason = 'opt-out' | 'legal-complaint' | 'do-not-contact' | 'bounce';

/** A masked contact excluded from outreach (org-wide or scoped to one audience/channel). */
export interface SuppressionEntry extends BaseEntity {
  /** Masked contact key, e.g. 'u***@example.com' or 'employee-4821' */
  subjectKey: string;
  reason: SuppressionReason;
  /** Restricts the suppression to one channel kind; omitted = all channels */
  channelKind?: ChannelKind;
  /** Restricts the suppression to one audience; omitted = org-wide */
  audienceId?: string;
  /** ISO 8601 timestamp the entry was added */
  addedAt: string;
  addedByStakeholderId: string;
}

/** Marketing persona layered on top of an Audience (Wave 2+3). */
export interface CustomerPersona extends BaseEntity {
  name: string;
  audienceId: string;
  /** e.g. '28–42, urban, dual-income households' */
  demographics: string;
  /** Observed behaviors, e.g. 'researches heavily before purchase' */
  behavioral: string;
  /** Purchase/transaction profile, e.g. 'upgrades every 2 years' */
  transactional: string;
  needs: string[];
  preferredChannelKinds: ChannelKind[];
  /** Addressable people in the persona cohort. */
  cohortSize: number;
  /** Share of the cohort with active marketing consent, 0–100. */
  consentedPct: number;
  /** How complete/usable the underlying profile data is, 0–100. */
  dataReadiness: number;
  /** Certainty in the persona definition itself, 0–1. */
  confidence: number;
  /** Bumped whenever the persona definition is re-cut. */
  version: number;
  /** ISO 8601 timestamp of the last cohort refresh from the CDP. */
  lastRefreshedAt: string;
  /** Set when observed behavior has moved away from the definition. */
  driftSignal?: string;
  /** Lifecycle stages this persona is actively worked in. */
  journeyStages: string[];
}

/** Aggregated consent posture for a segment on a channel kind. */
export interface ConsentSummary extends BaseEntity {
  segmentId: string;
  channelKind: ChannelKind;
  /** Share of the segment population with active opt-in, 0–100 */
  optedInPct: number;
  /** ISO 8601 timestamp of the last consent-platform sync */
  lastRefreshedAt: string;
}

/* ------------------------------------------------------------------ */
/* Market intelligence (Wave 2+3)                                      */
/* ------------------------------------------------------------------ */

export type CompetitorMoveType = 'launch' | 'campaign' | 'pricing' | 'partnership';

/** A tracked market competitor and its recent moves. */
export interface Competitor extends BaseEntity {
  name: string;
  /** Which of our brands this competitor pressures most. */
  focusBrandIds: string[];
  summary: string;
  moves: {
    /** ISO date */
    date: string;
    moveType: CompetitorMoveType;
    title: string;
    note?: string;
  }[];
  /** Observable events that should raise a competitive alert for this rival. */
  alertTriggers?: string[];
}

/** A market trend time series scoped to one business unit. */
export interface MarketTrend extends BaseEntity {
  label: string;
  businessUnitId: string;
  series: { period: string; value: number }[];
  /** e.g. '%', 'index', 'USD B' */
  unit: string;
  /** One-sentence takeaway rendered next to the chart. */
  insight: string;
  /**
   * Where the series comes from, e.g. 'Ipsos syndicated tracker, Jul 2026'.
   * Optional on the type so older rows stay valid; every seeded trend fills it.
   */
  sourceLabel?: string;
  /** Certainty in the series, 0–1. Optional for the same reason as sourceLabel. */
  confidence?: number;
}

/** Share-of-voice observation for one brand in one period. */
export interface ShareOfVoice extends BaseEntity {
  brandId: string;
  /** e.g. '2026-Q3' */
  period: string;
  /** 0–100; per-period sums stay <= 100 (remainder = untracked competitors) */
  pct: number;
}

/* ------------------------------------------------------------------ */
/* Governance                                                          */
/* ------------------------------------------------------------------ */

export interface Workflow extends BaseEntity {
  name: string;
  appliesTo: WorkflowAppliesTo;
  version: number;
  stageIds: string[];
  slaHours: number;
}

export interface WorkflowStage extends BaseEntity {
  workflowId: string;
  /** 1-based position within the workflow */
  order: number;
  name: string;
  mode: 'sequential' | 'parallel-group';
  assigneeRole: AppRole;
  slaHours: number;
  /** AI gate automation, or null for manual stages */
  automation?: 'brand-ai' | 'compliance-ai' | null;
}

export interface Approval extends BaseEntity {
  subjectEntity: EntityName;
  subjectId: string;
  subjectVersionId?: string;
  workflowStageId: string;
  approverStakeholderId: string;
  status: ApprovalStatus;
  /** ISO 8601 timestamp */
  slaDueAt: string;
  /** ISO 8601 timestamp */
  decidedAt?: string;
  comment?: string;
}

/**
 * Character offsets locating a finding's offending fragment inside the
 * reviewed text. The reviewed text is always `${title}\n${body}` — the exact
 * string the engine scanned — so a surface holding both can highlight the
 * fragment in place (FR-BG-12 / NFR-26).
 */
export interface ReviewSpan {
  start: number;
  end: number;
}

/** One rule outcome inside an AIReview run. */
export interface ReviewFinding {
  /** Stable rule identifier, e.g. 'disclaimer-forward-looking' */
  ruleId: string;
  /** Policy the rule derives from, when applicable. */
  policyId?: string;
  severity: 'pass' | 'warn' | 'block';
  message: string;
  /**
   * Deterministic certainty in the finding, 0–1. Exact literal/regex matches
   * score >= 0.95; heuristics that infer intent from surface form score
   * 0.6–0.8. A constant per rule — never sampled.
   */
  confidence: number;
  /** Where the offending fragment sits in the reviewed text, when locatable. */
  span?: ReviewSpan;
  /** One-line 'how to fix' guidance for the reviewer (NFR-27). */
  remediation?: string;
}

/**
 * Deterministic 0–100 scores for one review run (FR-BG-21 / FR-BG-22).
 * Each is a pure function of the copy and the findings — see
 * `services/ai/simulated.ts` for the formulas.
 */
export interface ReviewScores {
  /** Brand-voice adherence: 100 minus weighted voice/inclusiveness deductions. */
  toneScore: number;
  /** Derived from average sentence length and long-word ratio. */
  readabilityScore: number;
  /** 100 minus 25 per compliance block and 10 per compliance warn. */
  complianceScore: number;
}

/**
 * Which rule set ran (FR-BG-19) — the reviewer must be able to see the
 * jurisdictions, locale and channel the run resolved before trusting it.
 */
export interface ReviewContext {
  /** Jurisdictions resolved from the content's regions, narrowest first. */
  jurisdictionCodes: JurisdictionCode[];
  jurisdictionIds: string[];
  /** Region ids the resolution started from. */
  regionIds: string[];
  /** BCP-47 locale the copy was reviewed as. */
  locale: string;
  channelKind?: ChannelKind;
  /** LegalClause ids the run required of this piece. */
  requiredClauseIds: string[];
}

/** One AI compliance/brand review run over a subject entity (runtime-only). */
export interface AIReview extends BaseEntity {
  subjectEntity: EntityName;
  subjectId: string;
  subjectVersionId?: string;
  findings: ReviewFinding[];
  overallSeverity: 'pass' | 'warn' | 'block';
  /** Deterministic tone / readability / compliance scores for this run. */
  scores?: ReviewScores;
  /** Jurisdiction + locale + channel the run resolved (FR-BG-19). */
  context?: ReviewContext;
  /** ISO 8601 timestamp */
  ranAt: string;
  ranByStakeholderId: string;
}

export interface Policy extends BaseEntity {
  name: string;
  policyKind: PolicyKind;
  ruleText: string;
  enforcement: 'block' | 'warn';
}

export interface Notification extends BaseEntity {
  recipientStakeholderId: string;
  notifKind: NotifKind;
  subjectEntity: EntityName;
  subjectId: string;
  message: string;
  read: boolean;
  /** ISO 8601 timestamp */
  at: string;
}

export interface AuditRecord extends BaseEntity {
  actorStakeholderId: string;
  /** e.g. 'campaign.launched', 'approval.approved' */
  action: string;
  entityType: EntityName;
  entityId: string;
  /** ISO 8601 timestamp */
  at: string;
  detail: string;
}

/* ------------------------------------------------------------------ */
/* Crisis management                                                   */
/* ------------------------------------------------------------------ */

export interface CrisisIncident extends BaseEntity {
  title: string;
  severity: CrisisSeverity;
  status: CrisisStatus;
  classification: Classification;
  summary: string;
  /** Approved Content serving as the public holding statement, if one exists */
  holdingStatementContentId?: string;
  /** Stakeholders assembled into the incident war room */
  warRoomStakeholderIds: string[];
  affectedBrandIds: string[];
  affectedRegionIds: string[];
  /** ISO 8601 timestamp */
  declaredAt: string;
  /** ISO 8601 timestamp */
  resolvedAt?: string;
}

/* ------------------------------------------------------------------ */
/* PR & media relations                                                */
/* ------------------------------------------------------------------ */

export type MediaRelationship = 'Strong' | 'Warm' | 'New';

export type CoverageSentiment = 'Positive' | 'Neutral' | 'Negative';

export interface MediaContact extends BaseEntity {
  name: string;
  /** Publication the journalist writes for, e.g. 'The Signal Post' */
  outlet: string;
  /** Coverage beat, e.g. 'Consumer electronics', 'Enterprise security' */
  beat: string;
  regionId: string;
  relationship: MediaRelationship;
  email: string;
  /** ISO 8601 timestamp of the most recent touchpoint */
  lastInteractionAt: string;
}

/** A single piece of earned media coverage (article, mention, feature). */
export interface CoverageItem extends BaseEntity {
  headline: string;
  outlet: string;
  mediaContactId?: string;
  campaignId?: string;
  communicationId?: string;
  /** ISO 8601 timestamp */
  publishedAt: string;
  sentiment: CoverageSentiment;
  /** Estimated audience reach (impressions) */
  reach: number;
  url?: string;
}

/* ------------------------------------------------------------------ */
/* Measurement & money                                                 */
/* ------------------------------------------------------------------ */

export interface Budget extends BaseEntity {
  name: string;
  /** e.g. 'FY2026' */
  fiscalYear: string;
  businessUnitId: string;
  amountPlanned: number;
  /** Per-campaign sub-allocations; sum must stay below amountPlanned */
  allocations: { campaignId: string; amount: number }[];
}

export type BudgetScenarioKind = 'conservative' | 'base' | 'aggressive';

/** One what-if spend case for a campaign. Three kinds per campaign. */
export interface BudgetScenario extends BaseEntity {
  campaignId: string;
  kind: BudgetScenarioKind;
  spend: number;
  expectedConversions: number;
  /** Expected return on investment as a multiple, e.g. 3.4 = 3.4x. */
  expectedRoi: number;
  assumptions: string[];
}

export interface KPI extends BaseEntity {
  name: string;
  /** Stable metric identifier joining KPI to MetricResults, e.g. 'preorders' */
  metricKey: string;
  tier: KpiTier;
  /** e.g. 'USD', 'count', '%' */
  unit: string;
  direction: 'up' | 'down';
  target: number;
  /** e.g. 'Q3-2026', 'FY2026' */
  period: string;
  attachedTo: { strategyId?: string; campaignId?: string };
}

/** Time-series fact row; all dashboard numbers roll up from these. */
export interface MetricResult extends BaseEntity {
  kpiId?: string;
  metricKey: string;
  value: number;
  /** ISO week start date (Monday), e.g. '2026-08-10' */
  period: string;
  dimensions: {
    campaignId?: string;
    communicationId?: string;
    channelId?: string;
    brandId?: string;
    businessUnitId?: string;
    regionId?: string;
  };
}

/**
 * External performance benchmark for one metric, optionally scoped to a
 * channel kind. Reference data — nothing in the app writes these.
 */
export interface Benchmark extends BaseEntity {
  /** Joins to KPI.metricKey / MetricResult.metricKey. */
  metricKey: string;
  /** Omitted = the benchmark is channel-agnostic. */
  channelKind?: ChannelKind;
  industryMedian: number;
  topQuartile: number;
  /** e.g. '%', 'count', 'USD'. */
  unit: string;
  sourceLabel: string;
}

/** A repeatable "this worked" pattern, evidenced by real campaigns. */
export interface PlaybookPattern extends BaseEntity {
  title: string;
  /** When to reach for this pattern. */
  situation: string;
  /** What to do, in order. */
  actions: string[];
  /** Campaigns whose results back the pattern. */
  evidenceCampaignIds: string[];
  /** Observed lift over the comparable baseline, in percent. */
  liftPct: number;
}

/* ------------------------------------------------------------------ */
/* Journeys & events                                                   */
/* ------------------------------------------------------------------ */

export type JourneyNodeType = 'trigger' | 'audience' | 'condition' | 'wait' | 'send' | 'branch' | 'exit';

export interface JourneyNode {
  id: string;
  type: JourneyNodeType;
  label: string;
  config?: {
    audienceId?: string;
    segmentId?: string;
    communicationId?: string;
    waitDays?: number;
    condition?: string;
    splitPct?: number;
  };
}

export interface JourneyEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Journey extends BaseEntity {
  name: string;
  audienceId: string;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  version: number;
  status: 'Draft' | 'Active' | 'Paused' | 'Completed';
}

export type EventType = 'launch' | 'townhall' | 'webinar' | 'conference';

export interface Event extends BaseEntity {
  name: string;
  eventType: EventType;
  venue: string;
  /** ISO date */
  startDate: string;
  /** ISO date */
  endDate: string;
  campaignId?: string;
  regionId: string;
  ownerStakeholderId: string;
}

/* ------------------------------------------------------------------ */
/* Operating model — lifecycle stages & MarCom agents                  */
/* ------------------------------------------------------------------ */

/** The eight stages of the MarCom operating lifecycle. */
export type LifecycleStageKey =
  | 'govern'
  | 'understand'
  | 'plan'
  | 'create'
  | 'comply'
  | 'activate'
  | 'measure'
  | 'learn';

/**
 * One stage of the marketing & communication lifecycle. The stage table is
 * reference data: it names who owns the stage, what it must produce, and where
 * an approver decision is mandatory.
 */
export interface LifecycleStage extends BaseEntity {
  /** 1-based position in the lifecycle. */
  order: number;
  key: LifecycleStageKey;
  name: string;
  /** Why the stage exists, in one sentence. */
  purpose: string;
  /** Agents (MarcomAgent ids) accountable for the stage. */
  owningAgentIds: string[];
  /** The artifact the stage is done when it has produced. */
  keyOutput: string;
  /** The decision an approver must make; AI prepares, a person signs. */
  approvalGate: string;
}

/** Agent codes A1..A8 — the MarCom agent roster. */
export type MarcomAgentCode = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8';

/**
 * How much of an agent is actually demonstrable in this build.
 * - `live`     — the agent's core loop runs end-to-end on seeded data.
 * - `partial`  — some capabilities are demonstrable, others are described only.
 * - `roadmap`  — described in the operating model, not yet built.
 */
export type MarcomAgentStatus = 'live' | 'partial' | 'roadmap';

/** One agent in the MarCom operating model. */
export interface MarcomAgent extends BaseEntity {
  code: MarcomAgentCode;
  name: string;
  /** What the agent is for, in one sentence. */
  purpose: string;
  /** The value the agent creates for the business. */
  coreValue: string;
  /** Lifecycle stages this agent operates in (LifecycleStage.key values). */
  stageKeys: string[];
  status: MarcomAgentStatus;
  capabilities: string[];
  /**
   * Where the agent is visible in the app. `to` is a router path (NOT an entity
   * id) — link resolution deliberately skips these.
   */
  surfaces: { label: string; to: string }[];
}

/* ------------------------------------------------------------------ */
/* Agent execution                                                     */
/* ------------------------------------------------------------------ */

/**
 * Lifecycle of one agent execution.
 * - `queued`    — accepted, not started. Nothing has been computed yet.
 * - `running`   — in flight. No outcome exists to report.
 * - `succeeded` — finished and produced an outcome.
 * - `failed`    — finished without an outcome; `error` says why.
 */
export type AgentRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/**
 * One execution of one agent against one record — the execution ledger behind
 * every "the agent did this" claim in the product.
 *
 * The point of the entity is accountability, not decoration. A surface that
 * wants to say an agent proposed, checked or produced something must be able to
 * name the run that did it, when it ran, which rule set it ran, and whether a
 * person subsequently accepted the result. `producedEntity`/`producedId` are the
 * hard join: a run may only claim a produced record that genuinely exists, and
 * `acceptanceRate` in `selectors/agentRunSelectors.ts` is derived from what
 * happened to those records afterwards — never from a stored score.
 *
 * Fields are deliberately optional where the state cannot honestly fill them:
 * a `running` run has no `finishedAt`, `outcomeSummary` or `confidence`, and a
 * `failed` run has an `error` instead of an outcome.
 */
export interface AgentRun extends BaseEntity {
  /** MarcomAgent this run executed (`AGT-A1`..`AGT-A8`). */
  agentId: string;
  /** The record the agent ran against. */
  subjectEntity: EntityName;
  subjectId: string;
  status: AgentRunStatus;
  /**
   * ISO 8601 timestamp execution began. On a `queued` run nothing has begun —
   * this is the moment the run entered the queue.
   */
  startedAt: string;
  /** ISO 8601 timestamp execution ended. Absent while `queued` or `running`. */
  finishedAt?: string;
  /** One line stating what the run concluded. Absent unless it finished with an outcome. */
  outcomeSummary?: string;
  /**
   * The generator's self-reported certainty in its own outcome, 0–1, recorded
   * at run time — the same kind of value `ReviewFinding.confidence` carries.
   * Absent whenever there is no outcome to be certain about (`queued`,
   * `running`, `failed`) and on runs whose output is not a judgement call.
   * It is NOT a quality score: `acceptanceRate` measures that, from evidence.
   */
  confidence?: number;
  /** Which rule set / generator revision ran, e.g. 'brand-guardrails-2026.07'. */
  ruleSetVersion?: string;
  /** Why a `failed` run failed, in the words the execution surfaced. */
  error?: string;
  /** What the run created, when it created something persisted. */
  producedEntity?: EntityName;
  producedId?: string;
  /** The person who asked for the run, when a person did. */
  triggeredByStakeholderId?: string;
}

/* ------------------------------------------------------------------ */
/* Legal, regulatory & language                                        */
/* ------------------------------------------------------------------ */

export type JurisdictionCode = 'KSA' | 'GCC' | 'EU' | 'FR' | 'JP' | 'GLOBAL';

/** A legal/regulatory territory that clauses attach to. */
export interface Jurisdiction extends BaseEntity {
  code: JurisdictionCode;
  name: string;
  /** Our operating regions this jurisdiction falls inside. */
  regionIds: string[];
  notes: string;
}

export type LegalClauseKind = 'disclaimer' | 'trademark' | 'regulatory';

/**
 * A reusable, versioned piece of mandated legal copy. Clauses are matched to
 * content by jurisdiction + locale + channel (+ optional product category) and
 * superseded rather than edited in place.
 */
export interface LegalClause extends BaseEntity {
  kind: LegalClauseKind;
  jurisdictionId: string;
  /** BCP-47 locale the clause text is written in, e.g. 'ar-SA'. */
  locale: string;
  /** Restricts the clause to one product category; omitted = all categories. */
  productCategory?: string;
  /** Channels the clause is mandatory on. */
  channelKinds: ChannelKind[];
  text: string;
  version: number;
  /** ISO date the version becomes mandatory. */
  effectiveFrom: string;
  /** The clause version this one replaces. */
  supersedesId?: string;
}

/** One controlled term in the brand/product lexicon. */
export interface GlossaryTerm extends BaseEntity {
  term: string;
  /** The one approved rendering of the term. */
  approved: string;
  /** Renderings that must never ship. */
  avoid: string[];
  /** BCP-47 locale the entry governs. */
  locale: string;
  /** Latin transliteration for non-Latin-script entries. */
  transliteration?: string;
}

/* ------------------------------------------------------------------ */
/* SeedDB aggregate                                                    */
/* ------------------------------------------------------------------ */

export interface SeedDB {
  org: Organization;
  businessUnits: BusinessUnit[];
  brands: Brand[];
  regions: Region[];
  stakeholders: Stakeholder[];
  agencies: Agency[];
  ideas: Idea[];
  strategies: Strategy[];
  campaigns: Campaign[];
  campaignActivities: CampaignActivity[];
  briefs: Brief[];
  communications: Communication[];
  channelExecutions: ChannelExecution[];
  channels: Channel[];
  contents: Content[];
  contentVersions: ContentVersion[];
  assets: Asset[];
  audiences: Audience[];
  segments: Segment[];
  workflows: Workflow[];
  workflowStages: WorkflowStage[];
  approvals: Approval[];
  policies: Policy[];
  notifications: Notification[];
  budgets: Budget[];
  kpis: KPI[];
  metricResults: MetricResult[];
  auditRecords: AuditRecord[];
  journeys: Journey[];
  events: Event[];
  crisisIncidents: CrisisIncident[];
  mediaContacts: MediaContact[];
  coverageItems: CoverageItem[];
  suppressionEntries: SuppressionEntry[];
  consentSummaries: ConsentSummary[];
  customerPersonas: CustomerPersona[];
  competitors: Competitor[];
  marketTrends: MarketTrend[];
  shareOfVoice: ShareOfVoice[];
  /** Runtime-only collection — seeded empty, populated by AI review runs. */
  aiReviews: AIReview[];
  /** Reference data — the eight lifecycle stages, in order. */
  lifecycleStages: LifecycleStage[];
  /** Reference data — the A1..A8 agent roster. */
  marcomAgents: MarcomAgent[];
  /** Execution ledger — one row per agent run. Every agent claim resolves here. */
  agentRuns: AgentRun[];
  /** Reference data — legal territories clauses attach to. */
  jurisdictions: Jurisdiction[];
  legalClauses: LegalClause[];
  glossaryTerms: GlossaryTerm[];
  /** Reference data — the four positioning frameworks. */
  positioningFrameworks: PositioningFramework[];
  messagingHouses: MessagingHouse[];
  marketSizings: MarketSizing[];
  budgetScenarios: BudgetScenario[];
  /** Reference data — per-channel delivery limits. */
  channelConstraints: ChannelConstraint[];
  /** Reference data — external performance benchmarks. */
  benchmarks: Benchmark[];
  playbookPatterns: PlaybookPattern[];
}
