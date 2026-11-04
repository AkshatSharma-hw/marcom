/**
 * PACK C — Pharmaceutical & life sciences.
 *
 * Caldera Therapeutics Group: a prescription oncology portfolio (Caldera
 * Oncology), a public-health vaccines and immunisation business (Caldera
 * Vaccines) and a consumer over-the-counter range (Vitalis), under one
 * corporate and investor parent.
 *
 * Why this vertical: it is the governance showcase. Nothing demonstrates the
 * value of a non-waivable approval gate like promotional review in pharma,
 * where Medical, Legal and Regulatory each hold an independent veto and no
 * marketing role may override any of them. The legal library, the approval
 * chain and the crisis freeze all do real work here rather than decorate a
 * screen.
 *
 * ---------------------------------------------------------------------------
 * RULES THIS FILE HOLDS ITSELF TO
 * ---------------------------------------------------------------------------
 *
 * 1. **Same shapes, same states as Pack A and the default pack.** Every record
 *    is an unmodified type from `../../types`, every id uses the same prefix
 *    scheme, and the state-coverage checklist in `docs/DEMO_PACKS.md` §4 is met
 *    item for item. A bug found in one pack is findable in all of them.
 *
 * 2. **Dates are offsets, never literals.** `d()` / `at()` below resolve
 *    against `PACK_ANCHOR`, which is the app's demo clock. Nothing in this
 *    file reads the wall clock, so the data is deterministic in CI and in the
 *    browser, and moving the anchor moves the whole world with it.
 *
 * 3. **Fictional brands, real regulators.** Caldera, Caldera Oncology, Caldera
 *    Vaccines, Vitalis and the two product names used here — Calvexa
 *    (prescription oncology) and Vitalis Daily (over-the-counter) — are
 *    invented, and should be trademark-checked before any public use. The FDA,
 *    the EMA, the SFDA, the MHLW and the pharmacovigilance obligations named in
 *    the clause library are real, and are named because that is what makes the
 *    governance content credible. No real company or product name appears
 *    anywhere in this pack.
 *
 * 4. **Market sizing is flagged, not asserted.** Every `MarketSizing` row
 *    carries the illustrative-placeholder caveat in its own `sourceLabel` and
 *    first assumption, so the caveat travels with the number onto the screen
 *    instead of living in a document nobody opens.
 *
 * 5. **Graph density.** Every asset except two deliberate exceptions is
 *    embedded in at least two content versions, and every content version is
 *    carried by at least one channel execution — so asset → version →
 *    execution → communication → activity → campaign is a real path for almost
 *    every record, not a lucky one.
 *
 *    The two exceptions are stated rather than hidden: `AST-016` is `Uploaded`
 *    and `AST-017` is `Rejected`. Referencing either from live content would
 *    make its status a lie, and an honest hole beats a convenient link.
 *
 * ---------------------------------------------------------------------------
 * THE THREE MOMENTS THIS PACK EXISTS TO REACH
 * ---------------------------------------------------------------------------
 *
 * **The ISI block.** `AST-003` is `isi-block-current-v7.pdf`; `AST-018` is v8,
 * in force since `d(-12)` as `LGL-002`. Three currently-published pieces still
 * embed v7 — the congress press release, the congress invitation and the
 * real-world evidence hub report — and one, the HCP launch email, was
 * re-versioned onto v8. The graph shows the difference; nothing else does.
 *
 * **The conditional override.** Vitalis restates the Caldera clinical-reference
 * rule (POL-001) with a consumer substantiation standard (POL-005) — but the
 * override is scoped to over-the-counter products. The condition lives in the
 * data rather than in prose: the consumer clauses carry
 * `productCategory: 'otc-consumer-health'` and the clinical-reference clauses
 * carry `productCategory: 'prescription-medicine'`, and the clause resolver
 * only offers a category-restricted clause when the piece is in that category.
 * `CNT-002` is the case that proves it: a Vitalis social cut that named a
 * prescription product, so the override fell away and the parent rule governed
 * the whole piece.
 *
 * **The crisis at brand-and-product scope.** `CRI-003` suspends promotional
 * activity for one product, not one campaign: six sends across three campaigns
 * are frozen and two campaigns are paused, because the scope of the freeze is
 * the product the signal concerns.
 *
 * ---------------------------------------------------------------------------
 * DELIBERATE DEVIATIONS, RECORDED RATHER THAN HIDDEN
 * ---------------------------------------------------------------------------
 *
 * - **Thirteen stakeholders, not eleven.** Every one of the eleven `AppRole`
 *   values is filled exactly once by `STK-001`..`STK-011`, in the same order
 *   Pack A uses, so the persona switcher is complete and role → id is stable
 *   across packs (`.find()` resolves the canonical holder first). `STK-012` and
 *   `STK-013` are added on top because MLR review needs three *independent*
 *   reviewers and the role vocabulary has one reviewer role: Medical Affairs
 *   and Regulatory Affairs both ride on `Legal/Compliance Reviewer`, with the
 *   real function carried in the stage they own and the records they decide.
 *   Collapsing all three gates onto one person would have been the one thing a
 *   pharma buyer would notice immediately.
 *
 * - **`WF-006`, the MLR workflow, is defined here rather than in `_shared.ts`.**
 *   MLR review is a pharmaceutical workflow, not a product-invariant one, and
 *   `_shared.ts` is byte-identical across packs by design. Every shared
 *   workflow is still exported unchanged; this one is appended.
 *
 * - **No US jurisdiction code.** `JurisdictionCode` is
 *   `'KSA' | 'GCC' | 'EU' | 'FR' | 'JP' | 'GLOBAL'`, so the FDA fair-balance
 *   and prescribing-information obligations ride on `JUR-GLOBAL` scoped to the
 *   `prescription-medicine` product category, with the FDA named in the clause
 *   text. Adding a US code means editing the union, which affects every pack —
 *   recorded in `docs/DEMO_PACKS.md` §6 as a known gap rather than quietly
 *   mislabelled here.
 *
 * - **`NotifKind` has no "superseded" value.** The ISI v7 → v8 notification
 *   uses `asset-expiry`, which is the closest honest member — an asset that
 *   must not appear on anything published from a given date — and the message
 *   states the actual event rather than implying a rights lapse.
 *
 * ---------------------------------------------------------------------------
 * WIRING
 * ---------------------------------------------------------------------------
 * This module exports collections and one assembled `lifesciencesPack: SeedDB`.
 * It does NOT register itself — `src/data/seed/index.ts` owns pack selection
 * and `src/lib/demoPack.ts` owns the pack registry.
 */

import type {
  Agency,
  Approval,
  Asset,
  Audience,
  AuditRecord,
  AgentRun,
  Benchmark,
  Brand,
  Brief,
  Budget,
  BudgetScenario,
  BusinessUnit,
  Campaign,
  CampaignActivity,
  ChannelExecution,
  Communication,
  Competitor,
  ConsentSummary,
  Content,
  ContentVersion,
  CoverageItem,
  CrisisIncident,
  CustomerPersona,
  Event,
  GlossaryTerm,
  Idea,
  Journey,
  Jurisdiction,
  KPI,
  LegalClause,
  MarketSizing,
  MarketTrend,
  MediaContact,
  MessagingHouse,
  MetricResult,
  Notification,
  Organization,
  PlaybookPattern,
  Policy,
  SeedDB,
  Segment,
  ShareOfVoice,
  Stakeholder,
  Strategy,
  SuppressionEntry,
  Workflow,
  WorkflowStage,
} from '../../types';
import {
  ALL_REGION_IDS,
  CHANNEL_IDS,
  METRIC_ROLLUP_OFFSETS,
  METRIC_WEEK_OFFSETS,
  packAt,
  packDate,
  sharedChannelConstraints,
  sharedChannels,
  sharedLifecycleStages,
  sharedMarcomAgents,
  sharedPositioningFrameworks,
  sharedRegions,
  sharedWorkflows,
  sharedWorkflowStages,
} from './_shared';

/* ------------------------------------------------------------------ */
/* Date helpers — every date in this file is an offset from the anchor */
/* ------------------------------------------------------------------ */

/** ISO date, `n` days from the demo clock. */
const d = packDate;
/** ISO timestamp, `n` days from the demo clock at `hhmm` UTC. */
const at = packAt;

/**
 * The two product categories the clause resolver switches on. Named as
 * constants because the conditional override in §4 is expressed by which of
 * these a clause carries, not by prose in a rule text.
 */
const CAT_RX = 'prescription-medicine';
const CAT_OTC = 'otc-consumer-health';

/* ------------------------------------------------------------------ */
/* 1. Organization, business units, brands                             */
/* ------------------------------------------------------------------ */

export const organization: Organization = {
  id: 'ORG-001',
  name: 'Caldera Therapeutics Group',
  createdAt: at(-980, '09:00'),
  updatedAt: at(-214, '10:30'),
};

export const businessUnits: BusinessUnit[] = [
  {
    id: 'BU-001',
    name: 'Oncology',
    organizationId: 'ORG-001',
    createdAt: at(-980, '09:15'),
    updatedAt: at(-214, '10:30'),
  },
  {
    id: 'BU-002',
    name: 'Vaccines & Public Health',
    organizationId: 'ORG-001',
    createdAt: at(-980, '09:15'),
    updatedAt: at(-214, '10:30'),
  },
  {
    id: 'BU-003',
    name: 'Consumer Health',
    organizationId: 'ORG-001',
    createdAt: at(-980, '09:15'),
    updatedAt: at(-214, '10:30'),
  },
  {
    id: 'BU-004',
    name: 'Corporate & Investor',
    organizationId: 'ORG-001',
    createdAt: at(-980, '09:15'),
    updatedAt: at(-214, '10:30'),
  },
];

/**
 * Brand architecture — a branded house with one root and three endorsed
 * sub-brands, each owning exactly one coherent market.
 *
 * The inheritance showcase lives in `guardrailPolicyIds`. Vitalis lists
 * `POL-001` — the same policy id its parent lists — which is what the brand
 * rulebook reads as an override rather than an inheritance, and adds `POL-005`,
 * the consumer restatement. What makes this the hard case rather than the easy
 * one is that POL-005 is *conditional*: it governs only where every product
 * named in the piece is over-the-counter, and falls away entirely the moment a
 * prescription product is mentioned. Everything Vitalis does not restate —
 * embargo handling, alt text, executive quote approval — stays inherited.
 */
export const brands: Brand[] = [
  {
    id: 'BRD-001',
    name: 'Caldera',
    organizationId: 'ORG-001',
    tone: 'Formal, evidence-bound and conservative — the corporate voice for investors, regulators and policy audiences. Nothing is stated that the evidence does not already carry.',
    guardrailPolicyIds: ['POL-001', 'POL-003', 'POL-004', 'POL-006'],
    logoDescription:
      'Wordmark "CALDERA" in a narrow high-legibility sans, with a single hairline rule set above the baseline and broken beneath the "D".',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Caldera Ink', value: '#16233a', cmyk: '95 / 78 / 45 / 42', pantone: 'PANTONE 5395 C' },
      { name: 'Clinical Slate', value: '#46586b', cmyk: '75 / 58 / 42 / 18', pantone: 'PANTONE 7545 C' },
      { name: 'Paper', value: '#f4f6f8', cmyk: '3 / 2 / 2 / 0', pantone: 'PANTONE 11-4201 TCX' },
      { name: 'Evidence Black', value: '#0d1117', cmyk: '80 / 68 / 58 / 72', pantone: 'PANTONE Neutral Black C' },
    ],
    typography: 'Source Sans 3 for body; Lora for the chairman letter and the assurance statements in the annual report.',
    imageryGuidelines:
      'Laboratory, manufacturing and clinical settings photographed as they are, with people at working scale. No stock imagery of pills in cupped hands, and no patient depicted in a way that implies an outcome.',
    clearSpaceRule:
      'Clear space on all four sides equals the cap height of the "C". The hairline rule never crops.',
    minSizeRule: 'Minimum reproduction width: 130px on screen, 34mm in print. Below that, drop the hairline rule.',
    createdAt: at(-980, '09:30'),
    updatedAt: at(-72, '14:00'),
  },
  {
    id: 'BRD-002',
    name: 'Caldera Oncology',
    organizationId: 'ORG-001',
    tone: 'Clinical and data-led — written for treating oncologists who read the appendix first. Fair balance is not a footnote here; the safety information carries the same weight as the efficacy statement in every piece.',
    guardrailPolicyIds: ['POL-002', 'POL-007', 'POL-008', 'POL-011'],
    logoDescription:
      'Endorsed lockup: the Caldera wordmark with "ONCOLOGY" set beneath it at the same weight, separated by the hairline rule.',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Oncology Teal', value: '#0f6b6b', cmyk: '87 / 41 / 52 / 17', pantone: 'PANTONE 3298 C' },
      { name: 'Caldera Ink', value: '#16233a', cmyk: '95 / 78 / 45 / 42', pantone: 'PANTONE 5395 C' },
      { name: 'Chart Grey', value: '#d9dee3', cmyk: '13 / 8 / 7 / 0', pantone: 'PANTONE Cool Gray 2 C' },
    ],
    typography:
      'Engineered grotesque sans for body; a monospaced companion face for hazard ratios, confidence intervals and dosing tables.',
    imageryGuidelines:
      'Mechanism illustration and clinical-setting photography. No depiction of a patient responding to treatment, and no imagery that implies a survival outcome the data does not support.',
    clearSpaceRule:
      'Clear space equals the cap height of the "C" in the parent wordmark. The endorsement never separates from the parent mark.',
    minSizeRule: 'Minimum reproduction width: 140px on screen, 38mm in print — below that the endorsement is illegible.',
    parentBrandId: 'BRD-001',
    createdAt: at(-980, '09:30'),
    updatedAt: at(-40, '11:20'),
  },
  {
    id: 'BRD-003',
    name: 'Caldera Vaccines',
    organizationId: 'ORG-001',
    tone: 'Public-health register — written for ministries, procurement bodies and programme managers. Population outcomes, coverage and supply reliability lead; commercial language is absent.',
    guardrailPolicyIds: ['POL-002', 'POL-009'],
    logoDescription:
      'Endorsed lockup: the Caldera wordmark with "VACCINES" beneath it, the hairline rule extended to full lockup width.',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Programme Blue', value: '#1b4f9c', cmyk: '92 / 71 / 4 / 0', pantone: 'PANTONE 2144 C' },
      { name: 'Caldera Ink', value: '#16233a', cmyk: '95 / 78 / 45 / 42', pantone: 'PANTONE 5395 C' },
      { name: 'Cold Chain Mint', value: '#dff0ea', cmyk: '12 / 0 / 10 / 0', pantone: 'PANTONE 566 C' },
    ],
    typography:
      'Engineered grotesque sans throughout; a monospaced companion face for lot numbers, storage ranges and coverage percentages.',
    imageryGuidelines:
      'Programme delivery, cold-chain logistics and immunisation sessions, photographed with consent on file for every identifiable person. Children appear only with a guardian release attached to the asset record.',
    clearSpaceRule:
      'Clear space equals the cap height of the "C" in the parent wordmark, doubled on printed programme material.',
    minSizeRule: 'Minimum reproduction width: 140px on screen, 38mm in print.',
    parentBrandId: 'BRD-001',
    createdAt: at(-980, '09:30'),
    updatedAt: at(-96, '13:10'),
  },
  {
    id: 'BRD-004',
    name: 'Vitalis',
    organizationId: 'ORG-001',
    tone: 'Approachable and everyday — written for the shelf and the pharmacy counter, never for the clinic. Plain language, no clinical register, no implication that an over-the-counter product treats a diagnosed condition.',
    // POL-001 also sits on the parent: that shared id is what the rulebook
    // reads as an override. POL-005 is the conditional consumer restatement.
    guardrailPolicyIds: ['POL-001', 'POL-005'],
    logoDescription:
      'Lowercase "vitalis" wordmark with the dot of the "i" set as an open circle, unattached.',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Vitalis Coral', value: '#e2674f', cmyk: '5 / 71 / 71 / 0', pantone: 'PANTONE 7416 C' },
      { name: 'Shelf Cream', value: '#fdf3ec', cmyk: '1 / 4 / 7 / 0', pantone: 'PANTONE 9226 C' },
      { name: 'Everyday Grey', value: '#55606b', cmyk: '68 / 53 / 43 / 17', pantone: 'PANTONE 7546 C' },
    ],
    typography: 'Poppins — geometric sans; Regular and Medium only, sentence case everywhere.',
    imageryGuidelines:
      'Everyday domestic and pharmacy-counter settings. People are shown living, not recovering. No white coats, no clinical props, and no visual borrowing from the prescription portfolio.',
    clearSpaceRule:
      'Clear space equals the height of the open circle on all sides; double it in the endorsement lockup with the Caldera wordmark.',
    minSizeRule: 'Minimum reproduction width: 100px on screen, 26mm in print. The open circle must stay visible at size.',
    parentBrandId: 'BRD-001',
    createdAt: at(-980, '09:30'),
    updatedAt: at(-6, '11:00'),
  },
];

export const regions = [...sharedRegions];

/* ------------------------------------------------------------------ */
/* 2. People                                                           */
/*                                                                     */
/* STK-001..011 fill every AppRole exactly once, in the same order as  */
/* Pack A, so role → id is stable across packs and `.find(by role)`    */
/* resolves the canonical holder. STK-012 and STK-013 are the Medical  */
/* Affairs and Regulatory Affairs leads: MLR needs three independent   */
/* reviewers and the role vocabulary has one reviewer role, so both    */
/* ride on Legal/Compliance Reviewer with their real function carried  */
/* by the workflow stage they own. See the file header.                */
/* ------------------------------------------------------------------ */

const ALL_BRANDS = ['BRD-001', 'BRD-002', 'BRD-003', 'BRD-004'];

export const stakeholders: Stakeholder[] = [
  {
    id: 'STK-001',
    name: 'Dr Amara Nwosu',
    role: 'CMO',
    businessUnitId: 'BU-004',
    regionId: 'REG-AMER',
    brandIds: ALL_BRANDS,
    email: 'amara.nwosu@caldera.example',
    avatar: 'AN',
    createdAt: at(-940, '08:00'),
    updatedAt: at(-72, '09:15'),
  },
  {
    id: 'STK-002',
    name: 'Mateo Rossi',
    role: 'Content Manager',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    brandIds: ['BRD-003', 'BRD-004'],
    email: 'mateo.rossi@caldera.example',
    avatar: 'MR',
    createdAt: at(-940, '08:05'),
    updatedAt: at(-4, '10:40'),
  },
  {
    id: 'STK-003',
    name: 'Hélène Girard',
    role: 'Legal/Compliance Reviewer',
    businessUnitId: 'BU-004',
    regionId: 'REG-EMEA',
    brandIds: ALL_BRANDS,
    email: 'helene.girard@caldera.example',
    avatar: 'HG',
    createdAt: at(-940, '08:10'),
    updatedAt: at(-9, '15:25'),
  },
  {
    id: 'STK-004',
    name: 'Grace Whitfield',
    role: 'Corporate Comms Manager',
    businessUnitId: 'BU-004',
    regionId: 'REG-AMER',
    brandIds: ['BRD-001'],
    email: 'grace.whitfield@caldera.example',
    avatar: 'GW',
    createdAt: at(-940, '08:15'),
    updatedAt: at(-2, '12:00'),
  },
  {
    id: 'STK-005',
    name: 'Rahul Menon',
    role: 'Executive',
    businessUnitId: 'BU-004',
    regionId: 'REG-APAC',
    brandIds: ALL_BRANDS,
    email: 'rahul.menon@caldera.example',
    avatar: 'RM',
    createdAt: at(-940, '08:20'),
    updatedAt: at(-33, '09:50'),
  },
  {
    id: 'STK-006',
    name: 'Sofia Marchetti',
    role: 'Brand Manager',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    brandIds: ALL_BRANDS,
    email: 'sofia.marchetti@caldera.example',
    avatar: 'SM',
    createdAt: at(-940, '08:25'),
    updatedAt: at(-11, '16:30'),
  },
  {
    id: 'STK-007',
    name: 'Elena Duarte',
    role: 'Campaign Manager',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    brandIds: ['BRD-002', 'BRD-003'],
    email: 'elena.duarte@caldera.example',
    avatar: 'ED',
    createdAt: at(-940, '08:30'),
    updatedAt: at(-1, '09:00'),
  },
  {
    id: 'STK-008',
    name: 'Khalid Al-Muhanna',
    role: 'PR Manager',
    businessUnitId: 'BU-002',
    regionId: 'REG-MENA',
    brandIds: ['BRD-001', 'BRD-003'],
    email: 'khalid.almuhanna@caldera.example',
    avatar: 'KA',
    createdAt: at(-940, '08:35'),
    updatedAt: at(-5, '11:10'),
  },
  {
    id: 'STK-009',
    name: 'Nadia Fakhoury',
    role: 'Internal Comms Manager',
    businessUnitId: 'BU-004',
    regionId: 'REG-MENA',
    brandIds: ['BRD-001'],
    email: 'nadia.fakhoury@caldera.example',
    avatar: 'NF',
    createdAt: at(-940, '08:40'),
    updatedAt: at(-3, '14:45'),
  },
  {
    id: 'STK-010',
    name: 'Jonas Weber',
    role: 'Agency User',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    brandIds: ['BRD-004'],
    email: 'jonas.weber@northgatehealth.example',
    agencyId: 'AGY-001',
    avatar: 'JW',
    createdAt: at(-540, '09:00'),
    updatedAt: at(-69, '10:20'),
  },
  {
    id: 'STK-011',
    name: 'Priya Venkatesan',
    role: 'Platform Admin',
    businessUnitId: 'BU-004',
    regionId: 'REG-APAC',
    brandIds: ALL_BRANDS,
    email: 'priya.venkatesan@caldera.example',
    avatar: 'PV',
    createdAt: at(-980, '10:00'),
    updatedAt: at(-157, '08:30'),
  },
  {
    // Medical Affairs lead — owns WFS-019, the first non-waivable MLR gate.
    id: 'STK-012',
    name: 'Dr Ayaka Morimoto',
    role: 'Legal/Compliance Reviewer',
    businessUnitId: 'BU-001',
    regionId: 'REG-APAC',
    brandIds: ['BRD-002', 'BRD-003'],
    email: 'ayaka.morimoto@caldera.example',
    avatar: 'AM',
    createdAt: at(-900, '08:00'),
    updatedAt: at(-12, '14:20'),
  },
  {
    // Regulatory Affairs lead — owns WFS-021, the last non-waivable MLR gate.
    id: 'STK-013',
    name: 'Dr Samuel Adeyemi',
    role: 'Legal/Compliance Reviewer',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    brandIds: ['BRD-002', 'BRD-003'],
    email: 'samuel.adeyemi@caldera.example',
    avatar: 'SA',
    createdAt: at(-900, '08:05'),
    updatedAt: at(-9, '16:10'),
  },
];

export const agencies: Agency[] = [
  {
    id: 'AGY-001',
    name: 'Northgate Health Communications',
    capabilities: ['medical-education', 'creative', 'congress'],
    regionIds: ['REG-EMEA', 'REG-MENA'],
    createdAt: at(-550, '09:00'),
    updatedAt: at(-73, '11:00'),
  },
  {
    id: 'AGY-002',
    name: 'Lattice Media Partners',
    capabilities: ['media-buying', 'paid-social', 'hcp-programmatic'],
    regionIds: ['REG-AMER', 'REG-APAC'],
    createdAt: at(-510, '09:00'),
    updatedAt: at(-85, '13:40'),
  },
];

/* ------------------------------------------------------------------ */
/* 3. Channels (shared definitions, pack-owned operators)              */
/* ------------------------------------------------------------------ */

export const channels = sharedChannels(
  {
    [CHANNEL_IDS.email]: 'STK-002',
    [CHANNEL_IDS.social]: 'STK-007',
    [CHANNEL_IDS.web]: 'STK-004',
    [CHANNEL_IDS.press]: 'STK-008',
    [CHANNEL_IDS.intranet]: 'STK-009',
    [CHANNEL_IDS.event]: 'STK-007',
  },
  ALL_REGION_IDS,
);

export const channelConstraints = [...sharedChannelConstraints];

/* ------------------------------------------------------------------ */
/* 4. Policies — the brand & governance rulebook                       */
/*                                                                     */
/* POL-001 and POL-005 are the conditional-override showcase. Caldera  */
/* sets POL-001; Vitalis restates it (same id, so the rulebook renders */
/* it as an override) and adds POL-005 — which governs only inside its */
/* stated condition and falls away outside it. The precedence AND the  */
/* condition are written into POL-005's own rule text, and the         */
/* condition is enforced in the clause library by product category so  */
/* the resolver behaves the way the rule reads.                        */
/*                                                                     */
/* POL-011 is the one that makes the workflow real: it states that no  */
/* marketing role may waive, shorten or bypass an MLR stage, which is  */
/* what "non-waivable" means when it is a rule rather than a label.    */
/* ------------------------------------------------------------------ */

export const policies: Policy[] = [
  {
    id: 'POL-001',
    name: 'Clinical reference required for every product claim',
    policyKind: 'regulatory',
    ruleText:
      'Every statement about what a Caldera product does — efficacy, safety, tolerability, mechanism or duration — carries a reference to the clinical evidence that supports it, naming the study, the population studied and the endpoint the statement rests on. A "data on file" reference is acceptable only where the underlying data can be produced on request within the statutory window. No marketing role may decide that a claim is self-evident and therefore exempt.',
    enforcement: 'block',
    createdAt: at(-560, '10:00'),
    updatedAt: at(-64, '09:00'),
  },
  {
    id: 'POL-002',
    name: 'Comparative and superiority claims',
    policyKind: 'regulatory',
    ruleText:
      'A claim that one product performs better than another is made only where a head-to-head trial supports it, and the trial is cited beside the claim with its design, population and primary endpoint. Indirect comparison, network meta-analysis and cross-trial comparison are never presented as evidence of superiority. Absence of a reported difference is never presented as equivalence.',
    enforcement: 'block',
    createdAt: at(-560, '10:05'),
    updatedAt: at(-91, '11:00'),
  },
  {
    id: 'POL-003',
    name: 'Congress and publication embargo handling',
    policyKind: 'legal',
    ruleText:
      'Embargoed data stays Confidential until the embargo timestamp set by the congress or the journal. No channel execution may fire before it, and no investigator, executive or medical lead may confirm the substance of embargoed data in a background conversation ahead of the lift. An embargo break is reported to the congress secretariat by us, not discovered by them.',
    enforcement: 'block',
    createdAt: at(-560, '10:10'),
    updatedAt: at(-560, '10:10'),
  },
  {
    id: 'POL-004',
    name: 'Accessibility alt text and captions',
    policyKind: 'accessibility',
    ruleText:
      'Every image referenced by a content version carries alt text describing what the image shows, not what the campaign wants it to mean. Video assets ship with captions and a transcript. Body text holds a 4.5:1 contrast ratio, and safety information is never carried by colour, position or size alone.',
    enforcement: 'warn',
    createdAt: at(-560, '10:15'),
    updatedAt: at(-146, '09:00'),
  },
  {
    id: 'POL-005',
    name: 'Consumer substantiation standard — Vitalis, over-the-counter only',
    policyKind: 'regulatory',
    ruleText:
      'A Vitalis claim about an over-the-counter product is substantiated to the consumer standard: a named study or monograph held on file, stated in plain language, with the population and the duration it was observed over. This rule applies only where every product named, pictured or linked to in the piece is on the Vitalis over-the-counter register. Where a Vitalis piece names, pictures or links through to a prescription product — including a co-promotion, a counter card that carries one, or a page one click away — this rule does not apply at all and the Caldera group rule POL-001 governs the whole piece, clinical reference and fair balance included. The override is conditional, not general: it is narrower than POL-001 inside its condition and absent outside it, and satisfying the consumer standard alone never clears a piece that mentions a prescription product.',
    enforcement: 'block',
    createdAt: at(-500, '09:00'),
    updatedAt: at(-20, '10:30'),
  },
  {
    id: 'POL-006',
    name: 'Executive and investigator quote approval',
    policyKind: 'legal',
    ruleText:
      'A quote attributed to a named executive, investigator or advisory-board member is approved in writing by that person, or by a delegate they have named in advance, before the material leaves review. Paraphrase of an approved quote requires fresh approval. An investigator quote additionally states the investigator\'s relationship to the study and any financial interest.',
    enforcement: 'block',
    createdAt: at(-560, '10:20'),
    updatedAt: at(-121, '14:20'),
  },
  {
    id: 'POL-007',
    name: 'Fair balance and Important Safety Information',
    policyKind: 'regulatory',
    ruleText:
      'Important Safety Information appears with equal prominence to the efficacy message — same page, same reading order, same type size class, never behind an interaction. The current version of the ISI block is the only version that may appear; a superseded version is treated as absent. A link to the prescribing information is reachable within one click from every piece, and the adverse-event reporting contact is present on every piece addressed to a healthcare professional.',
    enforcement: 'block',
    createdAt: at(-560, '10:25'),
    updatedAt: at(-12, '11:00'),
  },
  {
    id: 'POL-008',
    name: 'Off-label promotion prohibition',
    policyKind: 'regulatory',
    ruleText:
      'No material promotes a product for an indication, population, dose or route outside its authorised label in the market the material reaches. This holds for congress material, disease-awareness material, social copy and anything an employee posts. A question about unapproved use is answered by Medical Information in response to an unsolicited request, never by marketing and never proactively. There is no waiver, no exception and no threshold below which this becomes a judgement call.',
    enforcement: 'block',
    createdAt: at(-560, '10:30'),
    updatedAt: at(-8, '09:45'),
  },
  {
    id: 'POL-009',
    name: 'Promotional material registration — Kingdom of Saudi Arabia',
    policyKind: 'regulatory',
    ruleText:
      'Promotional material distributed in the Kingdom of Saudi Arabia carries the Saudi Food and Drug Authority promotional-material registration number and the date it was issued. No material is distributed, presented at a congress or published on a local site before its registration number has been issued, and a number issued for one piece never travels to another. The Arabic text is the governing version.',
    enforcement: 'block',
    createdAt: at(-400, '09:20'),
    updatedAt: at(-6, '08:15'),
  },
  {
    id: 'POL-010',
    name: 'Adverse event capture, consent and outbound data handling',
    policyKind: 'regulatory',
    ruleText:
      'Any adverse event mentioned in an inbound message, a social reply or a survey response is forwarded to pharmacovigilance within one business day, whoever received it and whether or not it is well-formed. No outbound email or SMS executes against a segment that has not been reconciled against the live suppression list in the preceding 24 hours. Patient and healthcare-professional footage is used only inside the window of the signed release; an expired release is treated as an absent one. Personal data never appears in a tracking URL parameter.',
    enforcement: 'block',
    createdAt: at(-560, '10:35'),
    updatedAt: at(-4, '08:15'),
  },
  {
    id: 'POL-011',
    name: 'MLR review sequence and waiver prohibition',
    policyKind: 'regulatory',
    ruleText:
      'Promotional material naming a prescription product clears Medical, then Legal, then Regulatory review before it leaves the system. None of the three stages is waivable. No marketing role — including the CMO — may override, shorten, reorder or bypass a stage, and an expired SLA escalates the review rather than clearing it. A stage that has not been decided is not an approval: there is no implicit consent anywhere in this workflow, and a launch date is not a reason to create one.',
    enforcement: 'block',
    createdAt: at(-400, '09:30'),
    updatedAt: at(-30, '10:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 5. Jurisdictions & the legal library                                */
/*                                                                     */
/* This is the pack's deepest content, because promotional review in   */
/* pharma is genuinely the most regulated marketing there is and the   */
/* regulators named here are real.                                     */
/*                                                                     */
/* Two structural notes:                                               */
/*                                                                     */
/*  - LGL-001 → LGL-002 is the ISI supersession chain, and it is the   */
/*    pack's showcase: version 7 stays on record so material published */
/*    before the v8 effective date still resolves to the clause that   */
/*    was in force when it shipped, while anything published from that */
/*    date carrying v7 is non-compliant. AST-003 and AST-018 are the   */
/*    two PDFs behind those two clause versions.                       */
/*                                                                     */
/*  - `productCategory` is where the conditional override lives. The   */
/*    clause resolver only offers a category-restricted clause when    */
/*    the piece is in that category, so a Vitalis piece categorised    */
/*    as prescription-medicine resolves the clinical-reference and     */
/*    fair-balance clauses and never resolves the consumer standard.   */
/*    The condition is enforced by data, not described in prose.       */
/*                                                                     */
/* Coverage note: `JurisdictionCode` carries no US code, so the FDA    */
/* fair-balance and prescribing-information obligations ride on        */
/* GLOBAL scoped to prescription-medicine, with the FDA named in the   */
/* clause text. Recorded in docs/DEMO_PACKS.md §6 as a known gap.      */
/* ------------------------------------------------------------------ */

export const jurisdictions: Jurisdiction[] = [
  {
    id: 'JUR-KSA',
    code: 'KSA',
    name: 'Kingdom of Saudi Arabia',
    regionIds: ['REG-MENA'],
    notes:
      'Arabic is the governing language: where an Arabic and an English version differ, the Arabic text prevails. Promotional material carries a Saudi Food and Drug Authority registration number issued for that specific piece, shown with its issue date. Prescription-product material may be addressed only to healthcare professionals, and national immunisation programme communications require the programme owner to clear the wording before publication.',
    createdAt: at(-216, '09:00'),
    updatedAt: at(-56, '11:00'),
  },
  {
    id: 'JUR-GCC',
    code: 'GCC',
    name: 'Gulf Cooperation Council states',
    regionIds: ['REG-MENA'],
    notes:
      'Six-state bloc for material that travels across the Gulf without KSA-specific registration. Bilingual Arabic/English presentation is expected on printed and congress material. Per-state registration rules still override wherever they are stricter, and a KSA registration number is never presented as covering another state.',
    createdAt: at(-216, '09:00'),
    updatedAt: at(-101, '10:30'),
  },
  {
    id: 'JUR-EU',
    code: 'EU',
    name: 'European Union & United Kingdom',
    regionIds: ['REG-EMEA'],
    notes:
      'Prescription-only medicines may not be advertised to the general public at all, which makes audience targeting a compliance control rather than a media decision. Every promotional piece carries the abbreviated prescribing information and a route to the full SmPC within one click, and the adverse-event reporting statement is mandatory. The EU and UK regimes are close enough in substance that material is written once against the stricter of the two; the code list has no separate UK entry, so this jurisdiction covers both.',
    createdAt: at(-216, '09:00'),
    updatedAt: at(-42, '08:45'),
  },
  {
    id: 'JUR-FR',
    code: 'FR',
    name: 'France',
    regionIds: ['REG-EMEA'],
    notes:
      'Sits inside the EU baseline and adds French-specific duties: promotional material for a reimbursed medicine requires prior visa from the national agency before distribution, and the Toubon law requires French on every commercial communication aimed at the domestic market. The visa number and its validity period appear on the piece itself.',
    createdAt: at(-216, '09:00'),
    updatedAt: at(-42, '08:45'),
  },
  {
    id: 'JUR-JP',
    code: 'JP',
    name: 'Japan',
    regionIds: ['REG-APAC'],
    notes:
      'Promotional activity is governed by the Pharmaceuticals and Medical Devices Act and the sales-information-provision guidelines, which require that any efficacy statement be traceable to the approved package insert and to published evidence. Congress material must carry the Japanese approved indication rather than a global one, and off-label discussion in any promotional setting is treated as a serious compliance event.',
    createdAt: at(-216, '09:00'),
    updatedAt: at(-44, '10:15'),
  },
  {
    id: 'JUR-GLOBAL',
    code: 'GLOBAL',
    name: 'Global default',
    regionIds: ALL_REGION_IDS as string[],
    notes:
      'The baseline applied everywhere unless a narrower jurisdiction supplies a stricter clause. Fair balance, the adverse-event reporting contact, the prohibition on off-label promotion and the head-to-head requirement for comparative claims are global floors and are never waived by a regional exception. US Food and Drug Administration obligations ride here scoped to prescription material, because the code list has no US entry.',
    createdAt: at(-216, '09:00'),
    updatedAt: at(-115, '12:15'),
  },
];

export const legalClauses: LegalClause[] = [
  /* --- Important Safety Information: the v7 → v8 supersession ------- */
  {
    // Version 7 — the block `isi-block-current-v7.pdf` (AST-003) carries.
    // Superseded on d(-12); three published pieces still embed it.
    id: 'LGL-001',
    kind: 'regulatory',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    productCategory: CAT_RX,
    channelKinds: ['web', 'email', 'press', 'print', 'event', 'ads'],
    text: 'IMPORTANT SAFETY INFORMATION. Calvexa is contraindicated in patients with a known hypersensitivity to any component of the formulation. Serious immune-mediated reactions, including pneumonitis and colitis, have been reported; monitor for signs and symptoms and manage per the prescribing information. Hepatic laboratory values should be assessed before initiation and periodically during treatment. Please see the full Prescribing Information, including the boxed warning, at the link provided with this material. Report adverse events to your national reporting system and to Caldera Pharmacovigilance.',
    version: 7,
    effectiveFrom: d(-400),
    createdAt: at(-430, '10:00'),
    updatedAt: at(-120, '09:00'),
  },
  {
    // Version 8 — in force since d(-12). This is the showcase: everything
    // published from this date carrying v7 is non-compliant, and the graph is
    // the only place that shows which pieces those are.
    id: 'LGL-002',
    kind: 'regulatory',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    productCategory: CAT_RX,
    channelKinds: ['web', 'email', 'press', 'print', 'event', 'ads'],
    text: 'IMPORTANT SAFETY INFORMATION. Calvexa is contraindicated in patients with a known hypersensitivity to any component of the formulation. Serious immune-mediated reactions, including pneumonitis, colitis, hepatitis and nephritis, have been reported; monitor for signs and symptoms, interrupt or discontinue as directed and manage per the prescribing information. Cardiac events, including myocarditis, have been reported in post-marketing use and are added at this revision. Hepatic and renal laboratory values should be assessed before initiation and periodically during treatment. Please see the full Prescribing Information, including the boxed warning, at the link provided with this material. Report adverse events to your national reporting system and to Caldera Pharmacovigilance.',
    version: 8,
    effectiveFrom: d(-12),
    supersedesId: 'LGL-001',
    createdAt: at(-14, '09:00'),
    updatedAt: at(-12, '09:00'),
  },
  {
    id: 'LGL-003',
    kind: 'regulatory',
    jurisdictionId: 'JUR-FR',
    locale: 'fr-FR',
    productCategory: CAT_RX,
    channelKinds: ['web', 'email', 'press', 'print', 'event'],
    text: 'INFORMATIONS IMPORTANTES DE SÉCURITÉ. Calvexa est contre-indiqué chez les patients présentant une hypersensibilité connue à l\'un des composants. Des réactions à médiation immunitaire graves, notamment pneumopathie, colite, hépatite et néphrite, ont été rapportées ; surveiller les signes et symptômes et prendre en charge conformément au résumé des caractéristiques du produit. Des événements cardiaques, dont des myocardites, ont été rapportés après commercialisation. Veuillez consulter le résumé des caractéristiques du produit accessible depuis ce document. Déclarez tout effet indésirable au système national de déclaration et à la pharmacovigilance Caldera.',
    version: 1,
    effectiveFrom: d(-12),
    createdAt: at(-14, '09:10'),
    updatedAt: at(-14, '09:10'),
  },

  /* --- Off-label promotion (global floor) --------------------------- */
  {
    id: 'LGL-004',
    kind: 'regulatory',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    channelKinds: ['press', 'web', 'email', 'social', 'ads', 'print', 'event'],
    text: 'This material describes the product only within its authorised indication, population, dose and route in the market where it is distributed. Nothing in it should be read as recommending use outside the approved label. Unsolicited questions about unapproved use are answered by Medical Information on request and are not addressed in promotional material.',
    version: 1,
    effectiveFrom: d(-500),
    createdAt: at(-530, '13:00'),
    updatedAt: at(-8, '09:45'),
  },
  {
    id: 'LGL-005',
    kind: 'regulatory',
    jurisdictionId: 'JUR-JP',
    locale: 'ja-JP',
    channelKinds: ['press', 'web', 'email', 'print', 'event'],
    text: '本資料は、国内で承認された効能・効果、用法・用量および対象患者の範囲内でのみ製品を説明しています。承認外の使用を推奨するものではありません。承認外使用に関するお問い合わせは、医学情報部門が個別のご照会に応じて対応し、販売情報提供活動の資材では取り扱いません。',
    version: 1,
    effectiveFrom: d(-500),
    createdAt: at(-530, '13:10'),
    updatedAt: at(-530, '13:10'),
  },

  /* --- Adverse event reporting contact ------------------------------ */
  {
    id: 'LGL-006',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    channelKinds: ['press', 'web', 'email', 'social', 'ads', 'print', 'event'],
    text: 'Adverse events should be reported to your national reporting system. Adverse events and product quality complaints may also be reported to Caldera Pharmacovigilance at the contact details published on our safety reporting page. Reporting an adverse event does not affect any other course of action available to you.',
    version: 1,
    effectiveFrom: d(-500),
    createdAt: at(-530, '13:20'),
    updatedAt: at(-9, '10:00'),
  },
  {
    id: 'LGL-007',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-KSA',
    locale: 'ar-SA',
    channelKinds: ['press', 'web', 'email', 'print', 'event'],
    text: 'يُرجى الإبلاغ عن أي أعراض جانبية إلى المركز الوطني للتيقظ الدوائي التابع للهيئة العامة للغذاء والدواء، كما يمكن إبلاغ قسم التيقظ الدوائي في شركة كالديرا عبر بيانات التواصل المنشورة في صفحة الإبلاغ عن السلامة. ولا يؤثر الإبلاغ عن عرض جانبي على أي إجراء آخر متاح لكم. وفي حال وجود اختلاف بين النص العربي والنص الإنجليزي، يُعتد بالنص العربي.',
    version: 1,
    effectiveFrom: d(-380),
    createdAt: at(-410, '08:30'),
    updatedAt: at(-6, '08:15'),
  },
  {
    id: 'LGL-008',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-FR',
    locale: 'fr-FR',
    channelKinds: ['press', 'web', 'email', 'print', 'event'],
    text: 'Déclarez tout effet indésirable suspecté au portail national de signalement. Vous pouvez également le signaler à la pharmacovigilance Caldera aux coordonnées publiées sur notre page de déclaration de sécurité. La déclaration d\'un effet indésirable ne préjuge d\'aucune autre démarche.',
    version: 1,
    effectiveFrom: d(-380),
    createdAt: at(-410, '08:40'),
    updatedAt: at(-410, '08:40'),
  },

  /* --- Prescribing information within one click --------------------- */
  {
    id: 'LGL-009',
    kind: 'regulatory',
    jurisdictionId: 'JUR-EU',
    locale: 'en-GB',
    productCategory: CAT_RX,
    channelKinds: ['web', 'email', 'print', 'event', 'ads'],
    text: 'This material is intended for healthcare professionals only. Abbreviated prescribing information appears alongside this content and the full Summary of Product Characteristics is available from the link provided, reachable within one click from any page of this material. Prescribing information should be consulted before prescribing.',
    version: 1,
    effectiveFrom: d(-380),
    createdAt: at(-410, '09:00'),
    updatedAt: at(-410, '09:00'),
  },
  {
    id: 'LGL-010',
    kind: 'regulatory',
    jurisdictionId: 'JUR-FR',
    locale: 'fr-FR',
    productCategory: CAT_RX,
    channelKinds: ['web', 'email', 'print', 'event'],
    text: 'Document réservé aux professionnels de santé. Le résumé des caractéristiques du produit est accessible en un clic depuis toute page de ce document. Ce document a fait l\'objet d\'un visa de publicité dont le numéro et la période de validité figurent en pied de page ; il ne peut être diffusé en dehors de cette période.',
    version: 1,
    effectiveFrom: d(-380),
    createdAt: at(-410, '09:10'),
    updatedAt: at(-410, '09:10'),
  },

  /* --- Comparative efficacy: head-to-head only ---------------------- */
  {
    id: 'LGL-011',
    kind: 'regulatory',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    productCategory: CAT_RX,
    channelKinds: ['press', 'web', 'email', 'print', 'event', 'ads'],
    text: 'Comparative statements in this material refer to the head-to-head study named beside the claim, and are limited to the population, endpoint and analysis of that study. No comparison is drawn across separate trials, and no absence of a reported difference is presented as evidence of equivalence.',
    version: 1,
    effectiveFrom: d(-320),
    createdAt: at(-350, '11:00'),
    updatedAt: at(-91, '11:00'),
  },

  /* --- Forward-looking statements (investor) ------------------------ */
  {
    id: 'LGL-012',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    channelKinds: ['press', 'web', 'email', 'event'],
    text: 'This communication contains forward-looking statements about Caldera Therapeutics Group\'s strategy, development pipeline and expected performance. Actual results may differ materially, owing to factors outside the Group\'s control including clinical trial outcomes, regulatory decisions, pricing and reimbursement determinations, manufacturing supply and safety findings arising in post-marketing surveillance. No product under development is approved for use, and nothing here should be read as promotion of an unapproved product or an unapproved use. These statements speak only as at the date of publication and the Group undertakes no obligation to update them.',
    version: 1,
    effectiveFrom: d(-500),
    createdAt: at(-530, '10:00'),
    updatedAt: at(-530, '10:00'),
  },

  /* --- SFDA promotional registration (KSA) -------------------------- */
  {
    id: 'LGL-013',
    kind: 'regulatory',
    jurisdictionId: 'JUR-KSA',
    locale: 'ar-SA',
    channelKinds: ['press', 'web', 'email', 'print', 'event'],
    text: 'تحمل هذه المادة رقم تسجيل المواد الدعائية الصادر عن الهيئة العامة للغذاء والدواء، ويُذكر الرقم وتاريخ إصداره في أسفل كل صفحة. ولا يجوز توزيع أي مادة دعائية أو عرضها في المؤتمرات أو نشرها في المملكة قبل صدور رقم التسجيل الخاص بها، ولا يجوز استخدام رقم صادر لمادة أخرى.',
    version: 1,
    effectiveFrom: d(-260),
    createdAt: at(-290, '10:00'),
    updatedAt: at(-6, '08:15'),
  },
  {
    id: 'LGL-014',
    kind: 'regulatory',
    jurisdictionId: 'JUR-KSA',
    locale: 'en-US',
    channelKinds: ['press', 'web', 'email', 'print', 'event'],
    text: 'This material carries the Saudi Food and Drug Authority promotional-material registration number, shown with its issue date at the foot of every page. No promotional material is distributed, presented at a congress or published in the Kingdom before its own registration number has been issued, and a number issued for one piece is never applied to another.',
    version: 1,
    effectiveFrom: d(-260),
    createdAt: at(-290, '10:05'),
    updatedAt: at(-6, '08:15'),
  },

  /* --- Consumer substantiation: the conditional override ------------ */
  {
    // Category-scoped to OTC. The resolver only offers this clause when the
    // piece is categorised otc-consumer-health, which is exactly the condition
    // POL-005 states — the override is data, not prose.
    id: 'LGL-015',
    kind: 'regulatory',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    productCategory: CAT_OTC,
    channelKinds: ['web', 'email', 'social', 'ads', 'print'],
    text: 'Vitalis is a food supplement and is not intended to diagnose, treat, cure or prevent any disease. Claims in this material are supported by the study or monograph named beside them, in the population and over the period stated. A varied diet and a healthy lifestyle are the basis of good health.',
    version: 1,
    effectiveFrom: d(-300),
    createdAt: at(-330, '10:00'),
    updatedAt: at(-20, '10:30'),
  },
  {
    id: 'LGL-016',
    kind: 'regulatory',
    jurisdictionId: 'JUR-EU',
    locale: 'en-GB',
    productCategory: CAT_OTC,
    channelKinds: ['web', 'email', 'social', 'ads', 'print'],
    text: 'Vitalis is a food supplement and is not intended to diagnose, treat, cure or prevent any disease. Only health claims on the authorised register may be made, in the permitted wording, and every claim in this material states the study or monograph, the population and the period it was observed over. Food supplements should not be used as a substitute for a varied and balanced diet.',
    version: 1,
    effectiveFrom: d(-300),
    createdAt: at(-330, '10:10'),
    updatedAt: at(-20, '10:35'),
  },

  /* --- Patient-facing: no implied guaranteed outcome ---------------- */
  {
    id: 'LGL-017',
    kind: 'disclaimer',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    channelKinds: ['web', 'email', 'print', 'event'],
    text: 'Individual experience of any treatment varies. Nothing in this material predicts, promises or implies a particular outcome for any individual, and no experience described here should be taken as typical. Treatment decisions are made by a patient and their healthcare professional together, on the basis of the full prescribing information.',
    version: 1,
    effectiveFrom: d(-320),
    createdAt: at(-350, '11:10'),
    updatedAt: at(-350, '11:10'),
  },

  /* --- Congress material: local indication, not global -------------- */
  {
    id: 'LGL-018',
    kind: 'regulatory',
    jurisdictionId: 'JUR-JP',
    locale: 'ja-JP',
    productCategory: CAT_RX,
    channelKinds: ['event', 'print', 'web'],
    text: '本資材に記載する効能・効果および用法・用量は、日本国内で承認された内容です。海外で承認された効能・効果を国内資材に記載することはありません。詳細は最新の添付文書をご参照ください。',
    version: 1,
    effectiveFrom: d(-260),
    createdAt: at(-290, '10:20'),
    updatedAt: at(-44, '10:15'),
  },

  /* --- Trademark attribution ---------------------------------------- */
  {
    id: 'LGL-019',
    kind: 'trademark',
    jurisdictionId: 'JUR-GLOBAL',
    locale: 'en-US',
    channelKinds: ['press', 'web', 'social', 'ads', 'print', 'email'],
    text: 'Caldera™, Caldera Oncology™, Caldera Vaccines™, Calvexa™ and Vitalis™ are trademarks of Caldera Therapeutics Group. The trademark symbol is required on the first prominent mention in any piece. All other trademarks are the property of their respective owners.',
    version: 1,
    effectiveFrom: d(-500),
    createdAt: at(-530, '11:00'),
    updatedAt: at(-530, '11:00'),
  },
  {
    id: 'LGL-020',
    kind: 'trademark',
    jurisdictionId: 'JUR-GCC',
    locale: 'ar-SA',
    channelKinds: ['press', 'web', 'social', 'print'],
    text: 'كالديرا™ وكالديرا أونكولوجي™ وكالديرا للقاحات™ وكالفيكسا™ وفيتاليس™ علامات تجارية مملوكة لمجموعة كالديرا العلاجية. ويجب إدراج رمز العلامة التجارية عند أول ذكر بارز في أي مادة. وتبقى جميع العلامات التجارية الأخرى ملكاً لأصحابها.',
    version: 1,
    effectiveFrom: d(-500),
    createdAt: at(-530, '11:10'),
    updatedAt: at(-530, '11:10'),
  },
];

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: 'GLS-001',
    term: 'Calvexa',
    approved: 'Calvexa™ (first mention), Calvexa thereafter — always with the generic name on first mention',
    avoid: ['the Calvexa', 'Calvexa therapy', 'Calvexa treatment', 'CVX'],
    locale: 'en-US',
    createdAt: at(-300, '09:00'),
    updatedAt: at(-25, '14:00'),
  },
  {
    id: 'GLS-002',
    term: 'Caldera Therapeutics Group',
    approved: 'Caldera Therapeutics Group (first mention), Caldera thereafter',
    avoid: ['The Caldera Group', 'Caldera Pharma', 'Caldera Inc.', 'CTG'],
    locale: 'en-US',
    createdAt: at(-300, '09:05'),
    updatedAt: at(-300, '09:05'),
  },
  {
    id: 'GLS-003',
    term: 'Important Safety Information',
    approved: 'Important Safety Information (ISI) — capitalised, never abbreviated on first use',
    avoid: ['safety info', 'the small print', 'safety section', 'ISI block (in patient-facing copy)'],
    locale: 'en-US',
    createdAt: at(-300, '09:10'),
    updatedAt: at(-12, '09:30'),
  },
  {
    id: 'GLS-004',
    term: 'adverse event',
    approved: 'adverse event (technical and HCP material); "side effect" in patient-facing material',
    avoid: ['complication', 'issue', 'reaction (unqualified)', 'AE (in patient-facing material)'],
    locale: 'en-US',
    createdAt: at(-300, '09:15'),
    updatedAt: at(-6, '09:00'),
  },
  {
    id: 'GLS-005',
    term: 'Vitalis Daily',
    approved: 'Vitalis Daily (always with the range name; never abbreviated to Vitalis alone on pack copy)',
    avoid: ['Vitalis pills', 'the Vitalis', 'Vitalis medicine', 'Vitalis treatment'],
    locale: 'en-GB',
    createdAt: at(-300, '09:20'),
    updatedAt: at(-20, '10:10'),
  },
  {
    id: 'GLS-006',
    term: 'safety signal',
    approved: 'safety signal (regulatory and internal material only; patient-facing material says "a possible side effect we are investigating")',
    avoid: ['scare', 'safety scandal', 'recall (unless a recall has been issued)', 'crisis'],
    locale: 'en-US',
    createdAt: at(-300, '09:25'),
    updatedAt: at(-6, '09:05'),
  },
  {
    id: 'GLS-007',
    term: 'كالديرا',
    approved: 'كالديرا',
    avoid: ['كالدرا', 'كالديرة', 'Caldera (بالحروف اللاتينية داخل نص عربي)'],
    locale: 'ar-SA',
    transliteration: 'Caldera',
    createdAt: at(-290, '08:00'),
    updatedAt: at(-25, '14:05'),
  },
  {
    id: 'GLS-008',
    term: 'الأعراض الجانبية',
    approved: 'الأعراض الجانبية',
    avoid: ['المضاعفات', 'الآثار السلبية', 'الأضرار'],
    locale: 'ar-SA',
    transliteration: 'al-a`rad al-janibiyya',
    createdAt: at(-290, '08:05'),
    updatedAt: at(-6, '08:20'),
  },
  {
    id: 'GLS-009',
    term: 'التطعيم',
    approved: 'التطعيم',
    avoid: ['التلقيح', 'الحقنة', 'الجرعة الوقائية'],
    locale: 'ar-SA',
    transliteration: 'al-tat`eem',
    createdAt: at(-290, '08:10'),
    updatedAt: at(-290, '08:10'),
  },
  {
    id: 'GLS-010',
    term: 'فيتاليس',
    approved: 'فيتاليس',
    avoid: ['ڤيتاليس', 'فايتاليس', 'Vitalis (بالحروف اللاتينية داخل نص عربي)'],
    locale: 'ar-SA',
    transliteration: 'Vitalis',
    createdAt: at(-290, '08:15'),
    updatedAt: at(-290, '08:15'),
  },
  {
    id: 'GLS-011',
    term: 'effet indésirable',
    approved: 'effet indésirable',
    avoid: ['effet secondaire', 'complication', 'incident'],
    locale: 'fr-FR',
    createdAt: at(-290, '08:20'),
    updatedAt: at(-290, '08:20'),
  },
  {
    id: 'GLS-012',
    term: 'résumé des caractéristiques du produit',
    approved: 'résumé des caractéristiques du produit (RCP après première mention)',
    avoid: ['notice', 'fiche produit', 'monographie'],
    locale: 'fr-FR',
    createdAt: at(-290, '08:25'),
    updatedAt: at(-290, '08:25'),
  },
  {
    id: 'GLS-013',
    term: '副作用',
    approved: '副作用',
    avoid: ['合併症', '有害事象（患者向け資材において）', '不具合'],
    locale: 'ja-JP',
    transliteration: 'fukusayou',
    createdAt: at(-290, '08:30'),
    updatedAt: at(-290, '08:30'),
  },
  {
    id: 'GLS-014',
    term: '添付文書',
    approved: '添付文書',
    avoid: ['説明書', 'パンフレット', '製品資料'],
    locale: 'ja-JP',
    transliteration: 'tenpu bunsho',
    createdAt: at(-290, '08:35'),
    updatedAt: at(-44, '10:20'),
  },
];

/* ------------------------------------------------------------------ */
/* 6. Audiences, segments, personas, consent                           */
/* ------------------------------------------------------------------ */

export const segments: Segment[] = [
  {
    id: 'SEG-001',
    name: 'Treating oncologists, second-line eligible caseload',
    criteria: "specialty = 'medical_oncology' AND treats_indication = true AND hcp_verified = true",
    population: 28400,
    createdAt: at(-300, '09:00'),
    updatedAt: at(-12, '06:00'),
  },
  {
    id: 'SEG-002',
    name: 'Hospital formulary and HTA contacts',
    criteria: "account_type = 'hospital' AND role_family IN ('formulary','pharmacy','hta_submission')",
    population: 6100,
    createdAt: at(-260, '08:00'),
    updatedAt: at(-3, '06:00'),
  },
  {
    id: 'SEG-003',
    name: 'Community pharmacists, high recommendation volume',
    criteria: "channel = 'community_pharmacy' AND otc_recommendation_band >= 4",
    population: 74000,
    createdAt: at(-240, '10:00'),
    updatedAt: at(-10, '06:00'),
  },
  {
    id: 'SEG-004',
    name: 'Vitalis consumers opted into wellbeing updates',
    criteria: "brand_optin = 'vitalis' AND marketing_consent = true",
    population: 318000,
    createdAt: at(-320, '09:30'),
    updatedAt: at(-17, '06:00'),
  },
  {
    id: 'SEG-005',
    name: 'National immunisation programme contacts',
    criteria: "account_type = 'public_health' AND programme_role IN ('procurement','programme_management')",
    population: 4200,
    createdAt: at(-280, '09:00'),
    updatedAt: at(-24, '06:00'),
  },
  {
    id: 'SEG-006',
    name: 'MENA public health authorities',
    criteria: "region = 'MENA' AND account_type IN ('ministry_of_health','national_programme')",
    population: 340,
    createdAt: at(-210, '09:00'),
    updatedAt: at(-31, '06:00'),
  },
  {
    id: 'SEG-007',
    name: 'Healthcare institutional investors',
    criteria: "investor_type IN ('institutional','sovereign') AND sector_mandate = 'healthcare'",
    population: 1620,
    createdAt: at(-300, '09:00'),
    updatedAt: at(-19, '06:00'),
  },
  {
    id: 'SEG-008',
    name: 'Health, science and policy press',
    criteria: "list = 'press-health' AND status = 'active'",
    population: 880,
    createdAt: at(-400, '14:00'),
    updatedAt: at(-22, '06:00'),
  },
  {
    id: 'SEG-009',
    name: 'All employees',
    criteria: "employment_status = 'active'",
    population: 11400,
    createdAt: at(-400, '08:30'),
    updatedAt: at(-10, '06:00'),
  },
  {
    id: 'SEG-010',
    name: 'Field medical and customer-facing teams',
    criteria: "job_family IN ('medical_science_liaison','field_sales','medical_information')",
    population: 3100,
    createdAt: at(-400, '08:35'),
    updatedAt: at(-10, '06:00'),
  },
];

export const audiences: Audience[] = [
  {
    id: 'AUD-001',
    name: 'Treating oncologists',
    audienceKind: 'customer',
    segmentIds: ['SEG-001'],
    regionIds: ['REG-AMER', 'REG-EMEA', 'REG-APAC'],
    createdAt: at(-300, '10:00'),
    updatedAt: at(-24, '09:30'),
  },
  {
    id: 'AUD-002',
    name: 'Hospital formulary & payer contacts',
    audienceKind: 'customer',
    segmentIds: ['SEG-002'],
    regionIds: ['REG-AMER', 'REG-EMEA'],
    createdAt: at(-260, '10:00'),
    updatedAt: at(-8, '09:30'),
  },
  {
    id: 'AUD-003',
    name: 'Community pharmacists',
    audienceKind: 'customer',
    segmentIds: ['SEG-003'],
    regionIds: ['REG-AMER', 'REG-EMEA'],
    createdAt: at(-280, '11:00'),
    updatedAt: at(-29, '10:00'),
  },
  {
    id: 'AUD-004',
    name: 'Health & science press',
    audienceKind: 'press',
    segmentIds: ['SEG-008'],
    regionIds: ALL_REGION_IDS as string[],
    createdAt: at(-400, '14:00'),
    updatedAt: at(-22, '16:00'),
  },
  {
    id: 'AUD-005',
    name: 'Public health authorities (MENA)',
    audienceKind: 'regulator',
    segmentIds: ['SEG-005', 'SEG-006'],
    regionIds: ['REG-MENA'],
    createdAt: at(-210, '11:00'),
    updatedAt: at(-31, '10:00'),
  },
  {
    id: 'AUD-006',
    name: 'Healthcare institutional investors',
    audienceKind: 'investor',
    segmentIds: ['SEG-007'],
    regionIds: ['REG-AMER', 'REG-EMEA', 'REG-APAC'],
    createdAt: at(-300, '11:00'),
    updatedAt: at(-19, '10:00'),
  },
  {
    id: 'AUD-007',
    name: 'Vitalis consumers',
    audienceKind: 'customer',
    segmentIds: ['SEG-004'],
    regionIds: ['REG-AMER', 'REG-EMEA'],
    createdAt: at(-320, '10:00'),
    updatedAt: at(-17, '09:30'),
  },
  {
    id: 'AUD-008',
    name: 'All employees',
    audienceKind: 'employee',
    segmentIds: ['SEG-009', 'SEG-010'],
    regionIds: ALL_REGION_IDS as string[],
    createdAt: at(-400, '09:00'),
    updatedAt: at(-10, '12:00'),
  },
];

/** The five personas from the pack specification, one per buying situation. */
export const customerPersonas: CustomerPersona[] = [
  {
    id: 'PER-001',
    name: 'Treating Oncologist',
    audienceId: 'AUD-001',
    demographics: '38–60, academic and community practice across AMER, EMEA and APAC, 40–90 active patients on systemic therapy.',
    behavioral:
      'Time-poor and evidence-only. Reads the congress abstract before the brochure, discounts anything without a citation, and forms a view from peers and the data rather than from promotion. Deeply sceptical of anything that reads as marketing.',
    transactional:
      'No purchase event — the decision is a prescribing decision, repeated per patient and revisited when new data lands or a safety finding appears.',
    needs: [
      'The primary endpoint, the population and the hazard ratio, in that order',
      'Safety and tolerability with the same prominence as efficacy, not behind a link',
      'A straight answer to a Medical Information question within a working day',
    ],
    preferredChannelKinds: ['email', 'event', 'web'],
    cohortSize: 28400,
    consentedPct: 62,
    dataReadiness: 74,
    confidence: 0.78,
    version: 4,
    lastRefreshedAt: at(-3, '06:00'),
    journeyStages: ['awareness', 'consideration', 'decision', 'retention'],
    createdAt: at(-300, '09:00'),
    updatedAt: at(-10, '10:00'),
  },
  {
    id: 'PER-002',
    name: 'Hospital Formulary Payer',
    audienceId: 'AUD-002',
    demographics: '40–58, hospital pharmacy and formulary committees, regional and national HTA bodies across AMER and EMEA.',
    behavioral:
      'Works from budget-impact models and cost-effectiveness thresholds. Reads the HTA submission, not the campaign, and treats promotional material as an input to be verified rather than believed.',
    transactional:
      'Listing decisions on an annual or biannual committee cycle, with review triggered by new evidence, a price change or a safety finding.',
    needs: [
      'Budget-impact and cost-effectiveness inputs stated with their assumptions',
      'Real-world evidence that matches the local treated population',
      'Clear supply and continuity commitments before a listing decision',
    ],
    preferredChannelKinds: ['email', 'web', 'event'],
    cohortSize: 6100,
    consentedPct: 58,
    dataReadiness: 69,
    confidence: 0.72,
    version: 3,
    lastRefreshedAt: at(-10, '06:00'),
    journeyStages: ['consideration', 'decision'],
    // Observed behaviour has moved and the definition has not caught up.
    // Stated rather than smoothed over, because a stale persona quietly
    // misdirects every campaign built on it.
    driftSignal:
      'Committee questions in the last three cycles have shifted from cost-effectiveness to administration burden and monitoring cost, and two accounts now route the decision through a pathway board that did not exist when this persona was written. The definition still describes a purely economic buyer; the behaviour is increasingly operational.',
    createdAt: at(-260, '09:05'),
    updatedAt: at(-10, '10:05'),
  },
  {
    id: 'PER-003',
    name: 'Public Health Authority (MENA)',
    audienceId: 'AUD-005',
    demographics: 'MENA ministries of health and national immunisation programme offices, procurement-led.',
    behavioral:
      'Evaluates against a national programme mandate rather than a commercial case. Coverage targets, cold-chain feasibility, local supply commitments and Arabic-language documentation weigh as heavily as price.',
    transactional:
      'Multi-year programme tenders with pre-qualification gates, volume commitments and delivery-schedule penalties.',
    needs: [
      'Arabic documentation as the governing version, registered with the local authority',
      'Cold-chain and delivery evidence at national programme scale',
      'Supply continuity stated as a commitment with a remedy, not an intention',
    ],
    preferredChannelKinds: ['email', 'event', 'press'],
    cohortSize: 340,
    consentedPct: 91,
    dataReadiness: 55,
    confidence: 0.63,
    version: 2,
    lastRefreshedAt: at(-31, '06:00'),
    journeyStages: ['consideration', 'decision'],
    createdAt: at(-210, '09:15'),
    updatedAt: at(-31, '10:15'),
  },
  {
    id: 'PER-004',
    name: 'Community Pharmacist',
    audienceId: 'AUD-003',
    demographics: '28–55, community and chain pharmacy across AMER and EMEA, 60–200 counter conversations a day.',
    behavioral:
      'The single biggest driver of over-the-counter selection. Recommends what they can explain in twenty seconds and defend if the customer comes back. Will not stock a range whose claims they cannot substantiate at the counter.',
    transactional:
      'Stock and recommendation decisions reviewed seasonally; switches range readily when a claim is challenged or a supply gap appears.',
    needs: [
      'A one-line substantiation they can repeat accurately at the counter',
      'Clear separation between the consumer range and anything prescription-only',
      'Counter material that survives a customer question without a leaflet',
    ],
    preferredChannelKinds: ['email', 'print', 'event'],
    cohortSize: 74000,
    consentedPct: 81,
    dataReadiness: 77,
    confidence: 0.75,
    version: 3,
    lastRefreshedAt: at(-17, '06:00'),
    journeyStages: ['awareness', 'consideration', 'decision', 'retention'],
    createdAt: at(-280, '09:10'),
    updatedAt: at(-24, '10:10'),
  },
  {
    id: 'PER-005',
    name: 'Patient / Caregiver',
    audienceId: 'AUD-007',
    demographics: 'Adults managing their own or a family member\'s health across AMER and EMEA, wide age and literacy range.',
    behavioral:
      'Searches first, asks a pharmacist second, and reads other people\'s experiences more closely than any material we publish. Highly sensitive to anything that reads as a promise.',
    transactional:
      'Everyday over-the-counter purchase; for prescription products there is no purchase decision at all, only adherence and questions.',
    needs: [
      'Plain language with no clinical register and no implied outcome',
      'A clear route to report a side effect and to ask a question',
      'Honest limits — what the product does not do, said as plainly as what it does',
    ],
    preferredChannelKinds: ['web', 'email', 'social'],
    cohortSize: 318000,
    consentedPct: 69,
    dataReadiness: 64,
    confidence: 0.66,
    version: 2,
    lastRefreshedAt: at(-19, '06:00'),
    journeyStages: ['awareness', 'retention'],
    createdAt: at(-300, '09:20'),
    updatedAt: at(-19, '10:20'),
  },
];

export const consentSummaries: ConsentSummary[] = [
  {
    id: 'CNS-001',
    segmentId: 'SEG-001',
    channelKind: 'email',
    optedInPct: 62,
    lastRefreshedAt: at(-3, '06:00'),
    createdAt: at(-200, '09:00'),
    updatedAt: at(-3, '06:00'),
  },
  {
    id: 'CNS-002',
    segmentId: 'SEG-002',
    channelKind: 'email',
    optedInPct: 58,
    lastRefreshedAt: at(-3, '06:00'),
    createdAt: at(-200, '09:05'),
    updatedAt: at(-3, '06:00'),
  },
  {
    id: 'CNS-003',
    segmentId: 'SEG-004',
    channelKind: 'SMS',
    optedInPct: 34,
    lastRefreshedAt: at(-10, '06:00'),
    createdAt: at(-200, '09:10'),
    updatedAt: at(-10, '06:00'),
  },
  {
    id: 'CNS-004',
    segmentId: 'SEG-003',
    channelKind: 'email',
    optedInPct: 81,
    lastRefreshedAt: at(-17, '06:00'),
    createdAt: at(-200, '09:15'),
    updatedAt: at(-17, '06:00'),
  },
  {
    id: 'CNS-005',
    segmentId: 'SEG-005',
    channelKind: 'email',
    optedInPct: 74,
    lastRefreshedAt: at(-24, '06:00'),
    createdAt: at(-200, '09:20'),
    updatedAt: at(-24, '06:00'),
  },
  {
    id: 'CNS-006',
    segmentId: 'SEG-006',
    channelKind: 'email',
    optedInPct: 91,
    lastRefreshedAt: at(-31, '06:00'),
    createdAt: at(-200, '09:25'),
    updatedAt: at(-31, '06:00'),
  },
  {
    id: 'CNS-007',
    segmentId: 'SEG-009',
    channelKind: 'intranet',
    optedInPct: 98,
    lastRefreshedAt: at(-10, '06:00'),
    createdAt: at(-200, '09:30'),
    updatedAt: at(-10, '06:00'),
  },
  {
    id: 'CNS-008',
    segmentId: 'SEG-004',
    channelKind: 'social',
    optedInPct: 69,
    lastRefreshedAt: at(-10, '06:00'),
    createdAt: at(-200, '09:35'),
    updatedAt: at(-10, '06:00'),
  },
];

export const suppressionEntries: SuppressionEntry[] = [
  {
    id: 'SUP-001',
    subjectKey: 'm***@example.com',
    reason: 'opt-out',
    channelKind: 'email',
    audienceId: 'AUD-007',
    addedAt: at(-42, '08:15'),
    addedByStakeholderId: 'STK-002',
    createdAt: at(-42, '08:15'),
    updatedAt: at(-42, '08:15'),
  },
  {
    id: 'SUP-002',
    subjectKey: 'h***@example.org',
    reason: 'legal-complaint',
    addedAt: at(-35, '14:40'),
    addedByStakeholderId: 'STK-003',
    createdAt: at(-35, '14:40'),
    updatedAt: at(-35, '14:40'),
  },
  {
    id: 'SUP-003',
    subjectKey: '+44*******41',
    reason: 'opt-out',
    channelKind: 'SMS',
    audienceId: 'AUD-007',
    addedAt: at(-28, '10:05'),
    addedByStakeholderId: 'STK-002',
    createdAt: at(-28, '10:05'),
    updatedAt: at(-28, '10:05'),
  },
  {
    // Removed from HCP outreach because an adverse event arrived on the reply
    // path: the record is now a pharmacovigilance case, not a marketing one.
    id: 'SUP-004',
    subjectKey: 'hcp-40912',
    reason: 'do-not-contact',
    channelKind: 'email',
    audienceId: 'AUD-001',
    addedAt: at(-21, '06:30'),
    addedByStakeholderId: 'STK-012',
    createdAt: at(-21, '06:30'),
    updatedAt: at(-21, '06:30'),
  },
  {
    id: 'SUP-005',
    subjectKey: 'pharmacy-2214',
    reason: 'do-not-contact',
    audienceId: 'AUD-003',
    addedAt: at(-9, '11:20'),
    addedByStakeholderId: 'STK-003',
    createdAt: at(-9, '11:20'),
    updatedAt: at(-9, '11:20'),
  },
  {
    id: 'SUP-006',
    subjectKey: 'employee-1174',
    reason: 'bounce',
    channelKind: 'email',
    audienceId: 'AUD-008',
    addedAt: at(-5, '09:00'),
    addedByStakeholderId: 'STK-009',
    createdAt: at(-5, '09:00'),
    updatedAt: at(-5, '09:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 7. Strategy, ideation, market sizing                                */
/* ------------------------------------------------------------------ */

export const strategies: Strategy[] = [
  {
    id: 'STR-001',
    title: 'FY26 Oncology Evidence Leadership',
    horizon: 'FY2026',
    objectives: [
      'Convert second-line data into formulary listings rather than into awareness',
      'Make the real-world evidence hub the reference oncologists check before they ask us',
      'Hold fair balance as a competitive position, not a compliance cost',
    ],
    positioning:
      'Caldera Oncology is the portfolio whose safety information is as easy to find as its efficacy data — because the people who prescribe it read both.',
    valuePropositions: [
      'Primary endpoint, population and hazard ratio stated before any adjective',
      'Real-world evidence published on the same basis as the registrational data, including where it disagrees',
      'Safety findings communicated by us, at the point we know them, not at the point we are asked',
      'One named medical contact per account, reachable inside a working day',
    ],
    kpiIds: ['KPI-003'],
    businessUnitId: 'BU-001',
    createdAt: at(-560, '10:00'),
    updatedAt: at(-93, '14:30'),
  },
  {
    id: 'STR-002',
    title: 'FY26 Consumer Health Trust',
    horizon: 'FY2026',
    objectives: [
      'Win the pharmacist recommendation before the shelf decision',
      'Keep the consumer range visibly separate from the prescription portfolio',
      'Grow the pharmacist partner network without loosening what the range is allowed to claim',
    ],
    positioning:
      'Vitalis is the everyday range a pharmacist can defend at the counter — a plain claim, the study behind it, and nothing implied beyond it.',
    valuePropositions: [
      'Every claim states the study or monograph, the population and the period it was observed over',
      'One-line substantiation a pharmacist can repeat accurately without a leaflet',
      'No borrowed clinical authority — the consumer range never trades on the prescription portfolio',
      'Counter material that survives the customer\'s follow-up question',
    ],
    kpiIds: ['KPI-001', 'KPI-006', 'KPI-009'],
    businessUnitId: 'BU-003',
    createdAt: at(-560, '10:30'),
    updatedAt: at(-113, '11:15'),
  },
  {
    id: 'STR-003',
    title: 'FY26 Vaccines Programme Access',
    horizon: 'FY2026',
    objectives: [
      'Win national programme tenders on delivery evidence rather than on price alone',
      'Make Arabic-first documentation the standard for MENA programme bids',
      'Publish coverage and cold-chain performance where programme owners can check it',
    ],
    positioning:
      'Caldera Vaccines is the supplier whose programme evidence is published in the language the programme is run in, and whose supply commitments carry a remedy.',
    valuePropositions: [
      'Delivered coverage and cold-chain performance published per programme, not per market',
      'Arabic as the governing documentation language in the Kingdom, registered before distribution',
      'Supply continuity stated as a commitment with a stated remedy',
      'Programme-scale delivery evidence in comparable climates and comparable logistics',
    ],
    kpiIds: ['KPI-008'],
    businessUnitId: 'BU-002',
    createdAt: at(-560, '10:45'),
    updatedAt: at(-58, '11:00'),
  },
  {
    id: 'STR-004',
    title: 'FY26 Corporate Trust & Disclosure',
    horizon: 'FY2026',
    objectives: [
      'Raise corporate favourability among clinical, policy and institutional audiences',
      'Disclose safety findings on our own timetable rather than on the press\'s',
      'Hold one corporate voice across earned, owned and internal channels under pressure',
    ],
    positioning:
      'Caldera is the group that publishes the finding before it is asked for — trust earned through disclosure rather than through campaigns.',
    valuePropositions: [
      'Safety and pipeline disclosures on a published schedule, with the boundary of what is known stated',
      'Commitments reported against a published baseline every half year, including the missed ones',
      'Executives who take the follow-up question on the record',
      'The same numbers in the employee briefing as in the investor statement',
    ],
    kpiIds: ['KPI-012'],
    businessUnitId: 'BU-004',
    createdAt: at(-560, '11:00'),
    updatedAt: at(-73, '10:00'),
  },
];

export const ideas: Idea[] = [
  {
    id: 'IDE-001',
    title: 'Lead the winter range on what the pharmacist can defend, not on the claim',
    description:
      'Build the Vitalis winter campaign around the one-line substantiation a pharmacist can repeat at the counter, rather than around a benefit statement. Requires the monograph reference to be written into the creative rather than added at review.',
    source: 'workshop',
    score: 87,
    status: 'Promoted',
    brandId: 'BRD-004',
    businessUnitId: 'BU-003',
    regionId: 'REG-AMER',
    promotedToCampaignId: 'CMP-001',
    createdAt: at(-160, '10:30'),
    updatedAt: at(-96, '10:00'),
  },
  {
    id: 'IDE-002',
    title: 'Publish the SFDA registration number alongside the Al-Nakheel submission',
    description:
      'Rather than describing our regulatory standing in the bid narrative, put the registered material itself in the pack with its registration number visible. Turns a compliance artefact into the credential the programme office actually checks.',
    source: 'field',
    score: 84,
    status: 'Promoted',
    brandId: 'BRD-003',
    businessUnitId: 'BU-002',
    regionId: 'REG-MENA',
    promotedToCampaignId: 'CMP-002',
    createdAt: at(-190, '09:00'),
    updatedAt: at(-120, '11:00'),
  },
  {
    id: 'IDE-003',
    title: 'Publish the real-world evidence hub methodology in full',
    description:
      'Open the cohort definitions, the confounding adjustments and the code so a formulary committee can rerun the analysis on its own population. Authority comes from being reproducible, not from holding the dataset.',
    source: 'workshop',
    score: 81,
    status: 'Promoted',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    promotedToCampaignId: 'CMP-008',
    createdAt: at(-210, '11:00'),
    updatedAt: at(-140, '15:30'),
  },
  {
    id: 'IDE-004',
    title: 'Pharmacist-led recommendation programme instead of consumer advertising',
    description:
      'Spend the consumer budget on equipping the pharmacist who is already in the conversation rather than on reaching the customer before it. Cheaper, and the claim is defended at the point it is made.',
    source: 'field',
    score: 73,
    status: 'Approved',
    brandId: 'BRD-004',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    createdAt: at(-130, '14:20'),
    updatedAt: at(-30, '09:45'),
  },
  {
    id: 'IDE-005',
    title: 'H1 results as a pipeline dataset, not a narrative release',
    description:
      'Ship the pipeline and readout schedule as a downloadable dataset with the evidence boundary in the header, and let analysts build their own model. Reduces the reputational surface of the narrative.',
    source: 'workshop',
    score: 69,
    status: 'Approved',
    brandId: 'BRD-001',
    businessUnitId: 'BU-004',
    regionId: 'REG-EMEA',
    createdAt: at(-150, '09:15'),
    updatedAt: at(-45, '09:00'),
  },
  {
    id: 'IDE-006',
    title: 'Patient-support programme content for the second-line indication',
    description:
      'Plain-language adherence and side-effect material co-written with patient advocacy groups. Scored but not funded — the regulated limits on patient-facing communication mean the programme needs a compliance owner we have not appointed.',
    source: 'customer-feedback',
    score: 64,
    status: 'Scored',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-EMEA',
    createdAt: at(-110, '11:00'),
    updatedAt: at(-38, '15:30'),
  },
  {
    id: 'IDE-007',
    title: 'Run the congress symposium as a data session, not a product session',
    description:
      'Give the symposium slot to the investigators and the discussant rather than to a product narrative, with fair balance carried in the deck itself. The credibility is the point; the product follows.',
    source: 'workshop',
    score: 78,
    status: 'Promoted',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    promotedToCampaignId: 'CMP-003',
    createdAt: at(-175, '10:00'),
    updatedAt: at(-105, '10:00'),
  },
  {
    id: 'IDE-008',
    title: 'Arabic-first documentation for MENA programme and access material',
    description:
      'Write MENA material in Arabic first and derive the English, rather than the reverse. The Arabic text governs in the Kingdom anyway, and translating out of English produces the constructions the registration reviewers flag.',
    source: 'field',
    score: 76,
    status: 'Promoted',
    brandId: 'BRD-001',
    businessUnitId: 'BU-004',
    regionId: 'REG-MENA',
    promotedToCampaignId: 'CMP-009',
    createdAt: at(-165, '09:00'),
    updatedAt: at(-85, '09:00'),
  },
  {
    id: 'IDE-009',
    title: 'Live investigator Q&A after each congress data drop',
    description:
      'Offer oncologists an unscripted session with the trial investigators instead of a follow-up deck. Parked until Medical and Legal agree a workable protocol for handling an off-label question live — the current answer is that there is not one.',
    source: 'workshop',
    score: 58,
    status: 'Parked',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    createdAt: at(-140, '13:00'),
    updatedAt: at(-52, '13:00'),
  },
  {
    id: 'IDE-010',
    title: 'Cold-chain transparency portal for programme owners',
    description:
      'Publish live temperature-excursion and delivery-performance data per programme so a ministry can check us without asking. Scored; blocked on a data-sharing agreement with two logistics partners.',
    source: 'customer-feedback',
    score: 61,
    status: 'Scored',
    brandId: 'BRD-003',
    businessUnitId: 'BU-002',
    regionId: 'REG-MENA',
    createdAt: at(-99, '10:00'),
    updatedAt: at(-40, '10:00'),
  },
  {
    id: 'IDE-011',
    title: 'Spring wellbeing refresh on the lapsed Vitalis base',
    description:
      'Re-approach consumers who bought the winter range and did not repeat, in spring, when the seasonal motive has gone and the habit question is the only one left.',
    source: 'workshop',
    score: 66,
    status: 'Promoted',
    brandId: 'BRD-004',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    promotedToCampaignId: 'CMP-010',
    createdAt: at(-88, '09:00'),
    updatedAt: at(-33, '09:00'),
  },
  {
    id: 'IDE-012',
    title: 'Automated ISI re-version alerts for published material',
    description:
      'Notify content owners when the safety information block they embed is superseded, and list every piece that needs re-versioning. Proposed by the content agent from the v7 to v8 change; scoring failed because no reach or value input could be resolved, so the score is still 0.',
    source: 'ai-suggested',
    // Deliberately 0: the scoring run failed (see ARN-024) and nothing has
    // scored it since. A fabricated score here would be the one number on this
    // screen that nothing stands behind.
    score: 0,
    status: 'Draft',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    createdAt: at(-14, '11:00'),
    updatedAt: at(-14, '11:00'),
  },
];

/**
 * Market sizing.
 *
 * Every figure below is an illustrative placeholder. None has been verified
 * against a licensed source, and the caveat is written into `sourceLabel` and
 * the first assumption so it renders on screen beside the number rather than
 * living in a document the viewer never opens.
 */
const SIZING_CAVEAT =
  'ILLUSTRATIVE PLACEHOLDER — not verified against a licensed source. Confirm against IQVIA, EvaluatePharma or an equivalent licensed source before any client-facing use.';

export const marketSizings: MarketSizing[] = [
  {
    id: 'MSZ-001',
    businessUnitId: 'BU-001',
    tam: 214_000_000_000,
    sam: 38_500_000_000,
    som: 1_600_000_000,
    currency: 'USD',
    methodology:
      'Bottom-up from treated-patient estimates in the authorised indication across markets where the product holds a licence, narrowed to lines of therapy where the label applies and discounted for the share already under a competing pathway recommendation.',
    assumptions: [
      SIZING_CAVEAT,
      'TAM covers global systemic oncology therapeutics spend in the tumour types the portfolio addresses; supportive care and diagnostics are excluded.',
      'SAM limited to markets with a current marketing authorisation and an established reimbursement route.',
      'SOM assumes formulary listing conversion holds at the trailing four-cycle rate and no new safety restriction narrows the label.',
      'Currency held at the FY2026 planning rate; no FX sensitivity modelled.',
    ],
    sourceLabel: `${SIZING_CAVEAT} Basis: treated-patient estimates, Aug 2026.`,
    confidence: 0.61,
    createdAt: at(-500, '09:00'),
    updatedAt: at(-3, '08:00'),
  },
  {
    id: 'MSZ-002',
    businessUnitId: 'BU-002',
    tam: 71_000_000_000,
    sam: 14_800_000_000,
    som: 640_000_000,
    currency: 'USD',
    methodology:
      'Bottom-up from published national immunisation programme volumes and tender cycles in markets where we are pre-qualified, discounted for programmes already committed to an incumbent supplier for the current cycle.',
    assumptions: [
      SIZING_CAVEAT,
      'TAM covers global vaccine procurement across public and private channels; veterinary and travel-only products are excluded.',
      'SAM limited to national programmes where Caldera Vaccines is pre-qualified and holds current registration.',
      'SOM discounted for the share of programme volume under multi-year commitment to another supplier.',
      'Assumes no step change in cold-chain cost or in programme funding within the planning horizon.',
    ],
    sourceLabel: `${SIZING_CAVEAT} Basis: published programme volumes and tender cycles, Aug 2026.`,
    confidence: 0.66,
    createdAt: at(-500, '09:15'),
    updatedAt: at(-8, '08:00'),
  },
  {
    id: 'MSZ-003',
    businessUnitId: 'BU-003',
    tam: 148_000_000_000,
    sam: 26_400_000_000,
    som: 890_000_000,
    currency: 'USD',
    methodology:
      'Top-down from consumer health category value, narrowed to the sub-categories the Vitalis range competes in and to markets with an operating pharmacy distribution agreement.',
    assumptions: [
      SIZING_CAVEAT,
      'TAM covers global consumer health and food supplement retail value in the relevant sub-categories.',
      'SAM limited to markets with a distribution agreement and a permitted-claims register the range can work within.',
      'SOM assumes pharmacist recommendation share holds while the network grows.',
      'Excludes markets where the permitted-claims regime would require reformulating the range rather than rewriting the claim.',
    ],
    sourceLabel: `${SIZING_CAVEAT} Basis: consumer health category value, Aug 2026.`,
    confidence: 0.7,
    createdAt: at(-500, '09:30'),
    updatedAt: at(-5, '08:00'),
  },
  {
    id: 'MSZ-004',
    businessUnitId: 'BU-004',
    tam: 8_600_000_000,
    sam: 1_900_000_000,
    som: 96_000_000,
    currency: 'USD',
    methodology:
      'Influence-value proxy rather than bookable revenue: corporate affairs and disclosure investment sized from peer reporting, apportioned to the share of enterprise value credibly attributable to licence to operate and to trust with regulators.',
    assumptions: [
      SIZING_CAVEAT,
      'This figure is an influence-value proxy, NOT bookable revenue — it must never be added to the three business-unit figures above.',
      'Peer disclosures are self-reported and are not prepared on a common basis.',
      'SAM covers the markets where we hold a regulatory or reputational stake today.',
      'Assumes the corporate favourability reading recovers to its June level within two quarters.',
    ],
    sourceLabel: `${SIZING_CAVEAT} Basis: peer disclosure review, Aug 2026.`,
    confidence: 0.47,
    createdAt: at(-500, '09:45'),
    updatedAt: at(-1, '08:00'),
  },
];

export const messagingHouses: MessagingHouse[] = [
  {
    id: 'MSH-001',
    strategyId: 'STR-001',
    primaryMessage:
      'Caldera Oncology publishes the safety information as prominently as the efficacy data, and the real-world evidence on the same basis as the trial — including where they disagree.',
    pillars: [
      {
        title: 'The endpoint, before the adjective',
        proofPoints: [
          'Every efficacy statement names the study, the population and the primary endpoint it rests on.',
          'Comparative statements exist only where a head-to-head trial supports them, cited beside the claim.',
          'Where a subgroup result is shown, the pre-specification status of that subgroup is shown with it.',
        ],
      },
      {
        title: 'Fair balance as a position, not a cost',
        proofPoints: [
          'Important Safety Information appears in the same reading order and type size class as the efficacy message.',
          'Only the current version of the safety block may appear; a superseded version is treated as absent.',
          'The adverse-event reporting route is on every piece, including the ones nobody expects to generate a report.',
        ],
      },
      {
        title: 'Evidence you can rerun without us',
        proofPoints: [
          'Real-world evidence cohort definitions and adjustments are published in full.',
          'Findings that do not favour the product are published on the same schedule as findings that do.',
        ],
      },
    ],
    objections: [
      {
        objection: '"Every company shows me the trial that flatters them."',
        response:
          'Ask which endpoint, which population and whether the subgroup was pre-specified. We publish all three, and the real-world analysis that tests whether the trial result held outside the trial.',
      },
      {
        objection: '"A safety signal is being investigated — why should I keep prescribing?"',
        response:
          'We have published what is known and what is not, notified the regulator, and suspended promotion for the product while the assessment runs. The clinical guidance is in the safety notification and comes from Medical, not from marketing.',
      },
      {
        objection: '"Your real-world data is marketing dressed as research."',
        response:
          'The cohort definitions and the adjustments are public and the code is downloadable. Run it against your own population and compare — that is the reason for publishing it.',
      },
    ],
    createdAt: at(-540, '10:00'),
    updatedAt: at(-2, '15:00'),
  },
  {
    id: 'MSH-002',
    strategyId: 'STR-002',
    primaryMessage:
      'Vitalis makes a plain claim, names the study behind it, and implies nothing beyond it — so a pharmacist can defend it at the counter without a leaflet.',
    pillars: [
      {
        title: 'One line, one source',
        proofPoints: [
          'Every claim states the study or monograph, the population and the period observed.',
          'The claim on the pack, the counter card and the site is the same sentence, not three versions of it.',
        ],
      },
      {
        title: 'Consumer range, consumer standard',
        proofPoints: [
          'Vitalis is a food supplement range and says so on every piece.',
          'No piece borrows authority from the prescription portfolio, and any piece that names a prescription product is reviewed to the prescription standard instead.',
        ],
      },
      {
        title: 'Equipped, not advertised at',
        proofPoints: [
          'Pharmacist material is written to be repeated aloud, not read silently.',
          'Counter staff get the answer to the follow-up question, not only the opening claim.',
        ],
      },
    ],
    objections: [
      {
        objection: '"Supplement claims are all the same and none of them mean anything."',
        response:
          'Ours names the study, the population and the period, and says plainly what the product does not do. If a claim cannot carry that, we do not make it.',
      },
      {
        objection: '"Is this the same company that makes the cancer drug?"',
        response:
          'Same group, deliberately separate brands and separate standards. A Vitalis piece never trades on the prescription portfolio, and if it mentions one it is reviewed as prescription material.',
      },
    ],
    createdAt: at(-520, '10:00'),
    updatedAt: at(-20, '11:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 8. Campaigns, activities, briefs, events                            */
/*                                                                     */
/* Status note: the specification marks one campaign "Blocked", which  */
/* is not a CampaignStatus (see docs/STATE_TAXONOMY.md). CMP-002 is    */
/* seeded as `In Approval` — which is what it actually is — and its    */
/* blockage is carried where the taxonomy puts it: `Blocked`           */
/* activities with a named blocking approval and a breached SLA.       */
/*                                                                     */
/* Crisis note: CRI-003 suspends promotional activity for one PRODUCT, */
/* so CMP-004 and CMP-008 are `Paused` and six sends across three      */
/* campaigns are frozen. That scope — brand and product rather than    */
/* one campaign — is the thing this pack exists to show.               */
/* ------------------------------------------------------------------ */

export const campaigns: Campaign[] = [
  {
    id: 'CMP-001',
    name: 'Vitalis Winter Immunity Range',
    campaignType: 'seasonal',
    status: 'In Approval',
    classification: 'Internal',
    strategyId: 'STR-002',
    ideaId: 'IDE-001',
    brandId: 'BRD-004',
    businessUnitId: 'BU-003',
    regionIds: ['REG-AMER', 'REG-EMEA'],
    budgetAllocation: 220000,
    ownerStakeholderId: 'STK-007',
    startDate: d(32),
    endDate: d(141),
    kpiIds: ['KPI-011'],
    workflowId: 'WF-002',
    createdAt: at(-96, '09:15'),
    updatedAt: at(-3, '09:00'),
  },
  {
    id: 'CMP-002',
    name: 'Al-Nakheel National Immunisation Programme Bid',
    campaignType: 'product-launch',
    status: 'In Approval',
    classification: 'Confidential',
    strategyId: 'STR-003',
    ideaId: 'IDE-002',
    brandId: 'BRD-003',
    businessUnitId: 'BU-002',
    regionIds: ['REG-MENA'],
    budgetAllocation: 180000,
    ownerStakeholderId: 'STK-008',
    startDate: d(-52),
    endDate: d(60),
    kpiIds: [],
    workflowId: 'WF-002',
    createdAt: at(-120, '10:30'),
    updatedAt: at(-4, '08:00'),
  },
  {
    id: 'CMP-003',
    name: 'Oncology Congress Symposium Programme 2026',
    campaignType: 'thought-leadership',
    status: 'Live',
    classification: 'Public',
    strategyId: 'STR-001',
    ideaId: 'IDE-007',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionIds: ['REG-AMER', 'REG-EMEA'],
    budgetAllocation: 145000,
    ownerStakeholderId: 'STK-007',
    startDate: d(-74),
    endDate: d(47),
    kpiIds: [],
    workflowId: 'WF-002',
    createdAt: at(-105, '10:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Paused by CRI-003 on d(-6): promotional activity for Calvexa is
    // suspended while the safety signal is assessed.
    id: 'CMP-004',
    name: 'Calvexa Second-Line Indication Launch',
    campaignType: 'product-launch',
    status: 'Paused',
    classification: 'Internal',
    strategyId: 'STR-001',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionIds: ['REG-AMER'],
    budgetAllocation: 310000,
    ownerStakeholderId: 'STK-007',
    startDate: d(-40),
    endDate: d(51),
    kpiIds: ['KPI-002'],
    workflowId: 'WF-002',
    createdAt: at(-84, '10:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'CMP-005',
    // Nearest CampaignType to "investor" is thought-leadership; the investor
    // nature is carried by the communications' `commsType` and the audience,
    // which is where the app actually reads it.
    name: 'Caldera H1 Results & Pipeline Update',
    campaignType: 'thought-leadership',
    status: 'Planned',
    classification: 'Confidential',
    strategyId: 'STR-004',
    ideaId: 'IDE-005',
    brandId: 'BRD-001',
    businessUnitId: 'BU-004',
    regionIds: ALL_REGION_IDS as string[],
    budgetAllocation: 65000,
    ownerStakeholderId: 'STK-004',
    startDate: d(25),
    endDate: d(67),
    kpiIds: ['KPI-004'],
    workflowId: 'WF-002',
    createdAt: at(-70, '09:00'),
    updatedAt: at(-9, '10:00'),
  },
  {
    id: 'CMP-006',
    name: 'Vaccines Programme Evidence — always-on',
    campaignType: 'always-on',
    status: 'Live',
    classification: 'Internal',
    strategyId: 'STR-003',
    brandId: 'BRD-003',
    businessUnitId: 'BU-002',
    regionIds: ['REG-EMEA'],
    budgetAllocation: 130000,
    ownerStakeholderId: 'STK-007',
    startDate: d(-160),
    endDate: d(205),
    kpiIds: ['KPI-008'],
    workflowId: 'WF-002',
    createdAt: at(-190, '09:00'),
    updatedAt: at(-1, '11:00'),
  },
  {
    id: 'CMP-007',
    name: 'Vitalis Pharmacist Partner Drive',
    campaignType: 'always-on',
    status: 'Draft',
    classification: 'Internal',
    strategyId: 'STR-002',
    ideaId: 'IDE-004',
    brandId: 'BRD-004',
    businessUnitId: 'BU-003',
    regionIds: ['REG-AMER'],
    budgetAllocation: 95000,
    ownerStakeholderId: 'STK-002',
    startDate: d(46),
    endDate: d(165),
    kpiIds: ['KPI-006'],
    workflowId: 'WF-002',
    createdAt: at(-30, '09:45'),
    updatedAt: at(-5, '09:45'),
  },
  {
    // Also paused by CRI-003: the hub reports on the same product, so it sits
    // inside the freeze even though it is a different campaign with a
    // different owner and a different budget line.
    id: 'CMP-008',
    name: 'Calvexa Real-World Evidence Hub',
    campaignType: 'thought-leadership',
    status: 'Paused',
    classification: 'Public',
    strategyId: 'STR-001',
    ideaId: 'IDE-003',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionIds: ALL_REGION_IDS as string[],
    budgetAllocation: 175000,
    ownerStakeholderId: 'STK-007',
    startDate: d(-90),
    endDate: d(90),
    kpiIds: [],
    workflowId: 'WF-002',
    createdAt: at(-140, '15:30'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'CMP-009',
    name: 'Caldera Access Pledge KSA',
    campaignType: 'always-on',
    status: 'In Approval',
    classification: 'Internal',
    strategyId: 'STR-004',
    ideaId: 'IDE-008',
    brandId: 'BRD-001',
    businessUnitId: 'BU-004',
    regionIds: ['REG-MENA'],
    budgetAllocation: 85000,
    ownerStakeholderId: 'STK-008',
    startDate: d(18),
    endDate: d(110),
    kpiIds: ['KPI-005'],
    workflowId: 'WF-002',
    createdAt: at(-85, '09:00'),
    updatedAt: at(-3, '08:30'),
  },
  {
    id: 'CMP-010',
    name: 'Vitalis Spring Wellbeing Refresh',
    campaignType: 'always-on',
    status: 'Draft',
    classification: 'Internal',
    strategyId: 'STR-002',
    ideaId: 'IDE-011',
    brandId: 'BRD-004',
    businessUnitId: 'BU-003',
    regionIds: ['REG-EMEA'],
    budgetAllocation: 70000,
    ownerStakeholderId: 'STK-002',
    startDate: d(180),
    endDate: d(250),
    kpiIds: [],
    workflowId: 'WF-002',
    createdAt: at(-33, '09:00'),
    updatedAt: at(-12, '09:00'),
  },
  {
    id: 'CMP-011',
    name: 'Vitalis Summer Hydration Check-in',
    campaignType: 'seasonal',
    status: 'Completed',
    classification: 'Public',
    strategyId: 'STR-002',
    brandId: 'BRD-004',
    businessUnitId: 'BU-003',
    regionIds: ['REG-EMEA'],
    budgetAllocation: 140000,
    ownerStakeholderId: 'STK-002',
    startDate: d(-120),
    endDate: d(-10),
    kpiIds: ['KPI-007', 'KPI-010'],
    workflowId: 'WF-002',
    createdAt: at(-150, '10:00'),
    updatedAt: at(-10, '18:00'),
  },
];

export const campaignActivities: CampaignActivity[] = [
  {
    id: 'ACT-001',
    name: 'Winter range launch email',
    campaignId: 'CMP-001',
    channelId: 'CHN-001',
    startDate: d(32),
    endDate: d(95),
    status: 'Planned',
    spendAllocated: 45000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-95, '10:00'),
    updatedAt: at(-7, '11:15'),
  },
  {
    // Blocked: the social cut names a prescription product inside Vitalis
    // copy, so the OTC-scoped override (POL-005) falls away and the parent
    // clinical-reference rule (POL-001) governs the whole piece. Blocking
    // approval: APR-004, already past its SLA.
    id: 'ACT-002',
    name: 'Winter range social burst',
    campaignId: 'CMP-001',
    channelId: 'CHN-002',
    startDate: d(32),
    endDate: d(78),
    agencyId: 'AGY-001',
    status: 'Blocked',
    spendAllocated: 62000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-95, '10:05'),
    updatedAt: at(-6, '07:00'),
  },
  {
    id: 'ACT-003',
    name: 'Winter immunity landing page',
    campaignId: 'CMP-001',
    channelId: 'CHN-003',
    startDate: d(32),
    endDate: d(141),
    status: 'Planned',
    spendAllocated: 28000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-95, '10:10'),
    updatedAt: at(-7, '11:15'),
  },
  {
    // Blocked: the credentials pack carries promotional material with no SFDA
    // registration number — a non-waivable POL-009 / LGL-013 failure.
    // Blocking approval: APR-005 (Rejected), escalation: APR-006 (breached).
    id: 'ACT-004',
    name: 'Al-Nakheel programme credentials pack',
    campaignId: 'CMP-002',
    channelId: 'CHN-003',
    startDate: d(-52),
    endDate: d(21),
    status: 'Blocked',
    spendAllocated: 74000,
    ownerStakeholderId: 'STK-008',
    createdAt: at(-119, '09:30'),
    updatedAt: at(-4, '08:00'),
  },
  {
    id: 'ACT-005',
    name: 'Programme supply commitment statement',
    campaignId: 'CMP-002',
    channelId: 'CHN-004',
    startDate: d(-30),
    endDate: d(35),
    status: 'Blocked',
    spendAllocated: 41000,
    ownerStakeholderId: 'STK-008',
    createdAt: at(-119, '09:35'),
    updatedAt: at(-4, '08:05'),
  },
  {
    id: 'ACT-006',
    name: 'Congress abstract summary release',
    campaignId: 'CMP-003',
    channelId: 'CHN-003',
    startDate: d(-74),
    endDate: d(-30),
    status: 'Completed',
    spendAllocated: 38000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-104, '09:30'),
    updatedAt: at(-30, '18:00'),
  },
  {
    id: 'ACT-007',
    name: 'Congress symposium press release',
    campaignId: 'CMP-003',
    channelId: 'CHN-004',
    startDate: d(-72),
    endDate: d(-60),
    status: 'Completed',
    spendAllocated: 22000,
    ownerStakeholderId: 'STK-008',
    createdAt: at(-104, '09:35'),
    updatedAt: at(-60, '17:00'),
  },
  {
    // Frozen by CRI-003: the symposium programme presents the affected
    // product, so it sits inside the product-scoped freeze.
    id: 'ACT-008',
    name: 'Congress symposium invitation programme',
    campaignId: 'CMP-003',
    channelId: 'CHN-006',
    startDate: d(-45),
    endDate: d(47),
    status: 'Blocked',
    spendAllocated: 34000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-104, '09:40'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003.
    id: 'ACT-009',
    name: 'Second-line indication HCP email',
    campaignId: 'CMP-004',
    channelId: 'CHN-001',
    startDate: d(-40),
    endDate: d(20),
    status: 'Blocked',
    spendAllocated: 58000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-83, '09:30'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003.
    id: 'ACT-010',
    name: 'Second-line indication HCP social burst',
    campaignId: 'CMP-004',
    channelId: 'CHN-002',
    startDate: d(-12),
    endDate: d(18),
    agencyId: 'AGY-002',
    status: 'Blocked',
    spendAllocated: 96000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-83, '09:35'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003 — and separately stuck at the MLR Legal gate since
    // before the signal was declared. Two independent reasons this cannot
    // ship, which is exactly the case a single "blocked" badge hides.
    id: 'ACT-011',
    name: 'Second-line indication press release',
    campaignId: 'CMP-004',
    channelId: 'CHN-004',
    startDate: d(2),
    endDate: d(16),
    status: 'Blocked',
    spendAllocated: 26000,
    ownerStakeholderId: 'STK-008',
    createdAt: at(-83, '09:40'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // NOT frozen: the safety notification is the factual piece the freeze
    // exists to make room for. Silence is not the only signal.
    id: 'ACT-012',
    name: 'Safety signal HCP notification',
    campaignId: 'CMP-004',
    channelId: 'CHN-003',
    startDate: d(-6),
    endDate: d(51),
    status: 'In Progress',
    spendAllocated: 18000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-6, '17:00'),
    updatedAt: at(-1, '09:00'),
  },
  {
    id: 'ACT-013',
    name: 'H1 results investor statement',
    campaignId: 'CMP-005',
    channelId: 'CHN-004',
    startDate: d(25),
    endDate: d(32),
    status: 'Planned',
    spendAllocated: 24000,
    ownerStakeholderId: 'STK-004',
    createdAt: at(-69, '09:00'),
    updatedAt: at(-9, '10:00'),
  },
  {
    id: 'ACT-014',
    name: 'Pipeline summary page',
    campaignId: 'CMP-005',
    channelId: 'CHN-003',
    startDate: d(25),
    endDate: d(67),
    status: 'Planned',
    spendAllocated: 19000,
    ownerStakeholderId: 'STK-004',
    createdAt: at(-69, '09:05'),
    updatedAt: at(-9, '10:05'),
  },
  {
    id: 'ACT-015',
    name: 'Programme evidence pack mailing',
    campaignId: 'CMP-006',
    channelId: 'CHN-001',
    startDate: d(-60),
    endDate: d(60),
    status: 'In Progress',
    spendAllocated: 44000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-189, '09:00'),
    updatedAt: at(-1, '11:00'),
  },
  {
    id: 'ACT-016',
    name: 'Programme partner newsletter — August',
    campaignId: 'CMP-006',
    channelId: 'CHN-001',
    startDate: d(-40),
    endDate: d(-15),
    status: 'Completed',
    spendAllocated: 21000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-60, '09:00'),
    updatedAt: at(-15, '17:00'),
  },
  {
    id: 'ACT-017',
    name: 'Pharmacist partner newsletter',
    campaignId: 'CMP-007',
    channelId: 'CHN-001',
    startDate: d(46),
    endDate: d(120),
    status: 'Planned',
    spendAllocated: 34000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-29, '09:45'),
    updatedAt: at(-6, '16:25'),
  },
  {
    id: 'ACT-018',
    name: 'Pharmacist recruitment landing page',
    campaignId: 'CMP-007',
    channelId: 'CHN-003',
    startDate: d(46),
    endDate: d(165),
    status: 'Planned',
    spendAllocated: 27000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-29, '09:50'),
    updatedAt: at(-5, '09:50'),
  },
  {
    // Frozen by CRI-003.
    id: 'ACT-019',
    name: 'Real-world evidence hub publication',
    campaignId: 'CMP-008',
    channelId: 'CHN-003',
    startDate: d(-90),
    endDate: d(30),
    status: 'Blocked',
    spendAllocated: 72000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-139, '15:30'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003.
    id: 'ACT-020',
    name: 'Evidence hub social kit',
    campaignId: 'CMP-008',
    channelId: 'CHN-002',
    startDate: d(-60),
    endDate: d(30),
    agencyId: 'AGY-002',
    status: 'Blocked',
    spendAllocated: 58000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-139, '15:35'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'ACT-021',
    name: 'Access pledge announcement',
    campaignId: 'CMP-009',
    channelId: 'CHN-004',
    startDate: d(18),
    endDate: d(40),
    status: 'Planned',
    spendAllocated: 48000,
    ownerStakeholderId: 'STK-008',
    createdAt: at(-84, '09:00'),
    updatedAt: at(-3, '08:30'),
  },
  {
    id: 'ACT-022',
    name: 'Spring wellbeing teaser',
    campaignId: 'CMP-010',
    channelId: 'CHN-002',
    startDate: d(180),
    endDate: d(210),
    status: 'Planned',
    spendAllocated: 30000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-32, '09:00'),
    updatedAt: at(-12, '09:00'),
  },
  {
    id: 'ACT-023',
    name: 'Summer hydration check-in email',
    campaignId: 'CMP-011',
    channelId: 'CHN-001',
    startDate: d(-120),
    endDate: d(-10),
    status: 'Completed',
    spendAllocated: 92000,
    ownerStakeholderId: 'STK-002',
    createdAt: at(-149, '10:00'),
    updatedAt: at(-10, '18:00'),
  },
  {
    id: 'ACT-024',
    name: 'Congress symposium — EMEA session',
    campaignId: 'CMP-003',
    channelId: 'CHN-006',
    startDate: d(-4),
    endDate: d(24),
    status: 'In Progress',
    spendAllocated: 26000,
    ownerStakeholderId: 'STK-007',
    createdAt: at(-40, '09:00'),
    updatedAt: at(-1, '15:10'),
  },
];

export const briefs: Brief[] = [
  {
    id: 'BRF-001',
    title: 'Vitalis Winter Immunity Range brief',
    objective:
      'Win pharmacist recommendation for the winter range across AMER and EMEA by leading on the one-line substantiation a pharmacist can repeat at the counter, with every claim cleared to the consumer standard in POL-005.',
    keyMessages: [
      'The claim, the study behind it and the population it was observed in — in one sentence.',
      'A food supplement range that says plainly what it does not do.',
      'Counter material that survives the customer\'s follow-up question.',
    ],
    campaignId: 'CMP-001',
    campaignActivityId: 'ACT-001',
    authorStakeholderId: 'STK-007',
    status: 'In Review',
    createdAt: at(-94, '09:00'),
    updatedAt: at(-5, '15:40'),
  },
  {
    id: 'BRF-002',
    title: 'Al-Nakheel Programme Bid brief',
    objective:
      'Support pre-qualification for the Al-Nakheel national immunisation programme with credential material the programme office can review unaccompanied, led by delivered coverage evidence and registered Arabic documentation.',
    keyMessages: [
      'Delivered programme coverage and cold-chain performance, published per programme.',
      'Arabic is the governing version of every document in this pack, registered before distribution.',
      'Supply continuity stated as a commitment with a remedy, not as an intention.',
    ],
    campaignId: 'CMP-002',
    campaignActivityId: 'ACT-004',
    authorStakeholderId: 'STK-008',
    approvalId: 'APR-002',
    status: 'Approved',
    createdAt: at(-118, '10:15'),
    updatedAt: at(-100, '15:20'),
  },
  {
    id: 'BRF-003',
    title: 'Oncology Congress Symposium Programme brief',
    objective:
      'Give the congress symposium slot to the investigators and the discussant, with fair balance carried in the deck itself, so the session is quoted for its data rather than dismissed for its sponsorship.',
    keyMessages: [
      'Primary endpoint, population and pre-specification status, before any interpretation.',
      'Important Safety Information in the same reading order as the efficacy data.',
      'No comparative statement without the head-to-head study beside it.',
    ],
    campaignId: 'CMP-003',
    campaignActivityId: 'ACT-006',
    authorStakeholderId: 'STK-007',
    approvalId: 'APR-001',
    status: 'Approved',
    createdAt: at(-103, '09:30'),
    updatedAt: at(-90, '10:05'),
  },
  {
    id: 'BRF-004',
    title: 'Calvexa Second-Line Indication Launch brief',
    objective:
      'Establish the second-line indication with treating oncologists across AMER inside the first quarter of availability, working through MLR-cleared HCP material only and with the current ISI block on every piece.',
    keyMessages: [
      'The second-line data, stated by endpoint and population before anything else.',
      'Fair balance carried in the piece, not behind a link.',
      'One named medical contact per account for the questions marketing cannot answer.',
    ],
    campaignId: 'CMP-004',
    campaignActivityId: 'ACT-009',
    authorStakeholderId: 'STK-007',
    approvalId: 'APR-003',
    status: 'Approved',
    createdAt: at(-82, '09:30'),
    updatedAt: at(-70, '10:05'),
  },
  {
    id: 'BRF-005',
    title: 'Caldera H1 Results & Pipeline Update brief',
    objective:
      'Publish the half-year results and the pipeline as a dataset with the evidence boundary in the header, so institutional readers can build their own model without asking us for a reconciliation.',
    keyMessages: [
      'Readout schedule and evidence boundary stated up front, including what is not yet known.',
      'Every commitment reported against its published baseline, including the two we missed.',
      'The same figures in the employee briefing as in the investor statement.',
    ],
    campaignId: 'CMP-005',
    campaignActivityId: 'ACT-013',
    authorStakeholderId: 'STK-004',
    status: 'In Review',
    createdAt: at(-68, '09:00'),
    updatedAt: at(-9, '10:00'),
  },
  {
    id: 'BRF-006',
    title: 'Vaccines Programme Evidence brief',
    objective:
      'Keep a standing bank of programme evidence current across EMEA so a bid team never starts a submission from a blank page, and so a programme owner can check our delivery record without asking us for it.',
    keyMessages: [
      'Delivered coverage refreshed every quarter against programme records.',
      'Cold-chain performance stated as excursions and resolutions, not as an availability percentage.',
      'One named programme owner per market, reachable during the submission window.',
    ],
    campaignId: 'CMP-006',
    campaignActivityId: 'ACT-015',
    authorStakeholderId: 'STK-007',
    approvalId: 'APR-007',
    status: 'Approved',
    createdAt: at(-188, '09:00'),
    updatedAt: at(-170, '11:00'),
  },
  {
    id: 'BRF-007',
    title: 'Vitalis Pharmacist Partner Drive brief',
    objective:
      'Grow the pharmacist partner network to 800 active partners without loosening what the range is permitted to claim, using counter-level enablement rather than consumer advertising.',
    keyMessages: [
      'A substantiation a pharmacist can say out loud in twenty seconds.',
      'Clear separation between the consumer range and anything prescription-only.',
      'Training and stock allocation tied to partner status, not to volume alone.',
    ],
    campaignId: 'CMP-007',
    campaignActivityId: 'ACT-017',
    authorStakeholderId: 'STK-002',
    status: 'Draft',
    createdAt: at(-28, '09:45'),
    updatedAt: at(-5, '09:45'),
  },
  {
    id: 'BRF-008',
    title: 'Calvexa Real-World Evidence Hub brief',
    objective:
      'Make the evidence hub the analysis a formulary committee reruns rather than reads, by publishing the cohort definitions, the adjustments and the code in full.',
    keyMessages: [
      'The methodology is public; rerun it against your own population.',
      'Findings that do not favour the product are published on the same schedule as those that do.',
      'Real-world results are never presented as a substitute for the registrational data.',
    ],
    campaignId: 'CMP-008',
    campaignActivityId: 'ACT-019',
    authorStakeholderId: 'STK-007',
    approvalId: 'APR-008',
    status: 'Approved',
    createdAt: at(-138, '15:30'),
    updatedAt: at(-125, '09:00'),
  },
];

export const events: Event[] = [
  {
    id: 'EVT-001',
    name: 'Oncology congress symposium — AMER',
    eventType: 'conference',
    venue: 'Chicago congress centre',
    startDate: d(-45),
    endDate: d(-44),
    campaignId: 'CMP-003',
    regionId: 'REG-AMER',
    ownerStakeholderId: 'STK-007',
    createdAt: at(-90, '09:00'),
    updatedAt: at(-44, '18:00'),
  },
  {
    id: 'EVT-002',
    name: 'Oncology congress symposium — EMEA session',
    eventType: 'webinar',
    venue: 'Online',
    startDate: d(10),
    endDate: d(10),
    campaignId: 'CMP-003',
    regionId: 'REG-EMEA',
    ownerStakeholderId: 'STK-007',
    createdAt: at(-40, '09:00'),
    updatedAt: at(-1, '15:10'),
  },
  {
    id: 'EVT-003',
    name: 'Second-line indication medical launch meeting',
    eventType: 'launch',
    venue: 'Boston medical affairs centre + livestream',
    startDate: d(14),
    endDate: d(14),
    campaignId: 'CMP-004',
    regionId: 'REG-AMER',
    ownerStakeholderId: 'STK-007',
    createdAt: at(-60, '09:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'EVT-004',
    name: 'Al-Nakheel programme suppliers conference',
    eventType: 'conference',
    venue: 'Riyadh',
    startDate: d(29),
    endDate: d(30),
    campaignId: 'CMP-002',
    regionId: 'REG-MENA',
    ownerStakeholderId: 'STK-008',
    createdAt: at(-110, '09:00'),
    updatedAt: at(-4, '08:00'),
  },
  {
    id: 'EVT-005',
    name: 'H1 results & pipeline analyst briefing',
    eventType: 'webinar',
    venue: 'Online + London',
    startDate: d(25),
    endDate: d(25),
    campaignId: 'CMP-005',
    regionId: 'REG-EMEA',
    ownerStakeholderId: 'STK-004',
    createdAt: at(-69, '09:00'),
    updatedAt: at(-9, '10:00'),
  },
  {
    id: 'EVT-006',
    name: 'Safety signal response — all-employee town hall',
    eventType: 'townhall',
    venue: 'Intranet livestream',
    startDate: d(-4),
    endDate: d(-4),
    regionId: 'REG-AMER',
    ownerStakeholderId: 'STK-009',
    createdAt: at(-5, '18:00'),
    updatedAt: at(-4, '17:00'),
  },
];

export const budgets: Budget[] = [
  {
    id: 'BUD-001',
    name: 'FY2026 Oncology',
    fiscalYear: 'FY2026',
    businessUnitId: 'BU-001',
    amountPlanned: 780000,
    // Sum 630,000 < 780,000 (headroom 150,000)
    allocations: [
      { campaignId: 'CMP-003', amount: 145000 },
      { campaignId: 'CMP-004', amount: 310000 },
      { campaignId: 'CMP-008', amount: 175000 },
    ],
    createdAt: at(-600, '09:00'),
    updatedAt: at(-2, '10:40'),
  },
  {
    id: 'BUD-002',
    name: 'FY2026 Vaccines & Public Health',
    fiscalYear: 'FY2026',
    businessUnitId: 'BU-002',
    amountPlanned: 420000,
    // Sum 310,000 < 420,000 (headroom 110,000)
    allocations: [
      { campaignId: 'CMP-002', amount: 180000 },
      { campaignId: 'CMP-006', amount: 130000 },
    ],
    createdAt: at(-600, '09:05'),
    updatedAt: at(-2, '15:45'),
  },
  {
    id: 'BUD-003',
    name: 'FY2026 Consumer Health',
    fiscalYear: 'FY2026',
    businessUnitId: 'BU-003',
    amountPlanned: 620000,
    // Sum 525,000 < 620,000 (headroom 95,000)
    allocations: [
      { campaignId: 'CMP-001', amount: 220000 },
      { campaignId: 'CMP-007', amount: 95000 },
      { campaignId: 'CMP-010', amount: 70000 },
      { campaignId: 'CMP-011', amount: 140000 },
    ],
    createdAt: at(-600, '09:10'),
    updatedAt: at(-2, '13:15'),
  },
  {
    id: 'BUD-004',
    name: 'FY2026 Corporate & Investor',
    fiscalYear: 'FY2026',
    businessUnitId: 'BU-004',
    amountPlanned: 220000,
    // Sum 150,000 < 220,000 (headroom 70,000)
    allocations: [
      { campaignId: 'CMP-005', amount: 65000 },
      { campaignId: 'CMP-009', amount: 85000 },
    ],
    createdAt: at(-600, '09:15'),
    updatedAt: at(-2, '13:20'),
  },
];

export const budgetScenarios: BudgetScenario[] = [
  {
    id: 'BSC-001',
    campaignId: 'CMP-004',
    kind: 'conservative',
    spend: 210000,
    expectedConversions: 6200,
    expectedRoi: 3.1,
    assumptions: [
      'Medical-education channels only; the HCP social burst is not reinstated after the safety-signal freeze.',
      'Assumes the label is unchanged when the assessment closes.',
      'No incremental creative beyond the existing MLR-cleared launch kit.',
    ],
    createdAt: at(-80, '10:00'),
    updatedAt: at(-6, '09:00'),
  },
  {
    id: 'BSC-002',
    campaignId: 'CMP-004',
    kind: 'base',
    spend: 310000,
    expectedConversions: 11800,
    expectedRoi: 2.8,
    assumptions: [
      'Approved plan: HCP email, the launch social burst and the medical launch meeting.',
      'Consented reach on the oncologist file holds at the current 62% opt-in.',
      'The safety-signal freeze lifts before the medical launch meeting.',
    ],
    createdAt: at(-80, '10:05'),
    updatedAt: at(-6, '09:05'),
  },
  {
    id: 'BSC-003',
    campaignId: 'CMP-004',
    kind: 'aggressive',
    spend: 430000,
    expectedConversions: 15100,
    expectedRoi: 2.1,
    assumptions: [
      'Adds HCP programmatic and a second congress presence in the two highest-volume markets.',
      'Requires a second MLR cycle for the additional formats, at 170 hours of gate time each.',
      'Assumes the assessment closes without a label restriction.',
    ],
    createdAt: at(-80, '10:10'),
    updatedAt: at(-6, '09:10'),
  },
  {
    id: 'BSC-004',
    campaignId: 'CMP-001',
    kind: 'conservative',
    spend: 150000,
    expectedConversions: 32000,
    expectedRoi: 3.6,
    assumptions: [
      'AMER only; EMEA deferred to the following winter.',
      'Every claim re-cleared against the permitted-claims register before launch, as POL-005 requires.',
      'No paid social until the substantiation basis clears review.',
    ],
    createdAt: at(-70, '10:00'),
    updatedAt: at(-6, '09:15'),
  },
  {
    id: 'BSC-005',
    campaignId: 'CMP-001',
    kind: 'base',
    spend: 220000,
    expectedConversions: 50000,
    expectedRoi: 3.2,
    assumptions: [
      'Approved plan: AMER and EMEA, pharmacist-led with a supporting consumer flight.',
      'Counter material lands in pharmacies before the seasonal peak.',
      'The social cut is rewritten so that no prescription product is named.',
    ],
    createdAt: at(-70, '10:05'),
    updatedAt: at(-6, '09:20'),
  },
  {
    id: 'BSC-006',
    campaignId: 'CMP-001',
    kind: 'aggressive',
    spend: 340000,
    expectedConversions: 63000,
    expectedRoi: 2.4,
    assumptions: [
      'Adds two further EMEA markets, each with its own permitted-claims register and its own review cycle.',
      'Assumes pharmacy distribution can absorb the counter material in time for the peak.',
      'Higher production cost for market-specific claim wording.',
    ],
    createdAt: at(-70, '10:10'),
    updatedAt: at(-6, '09:25'),
  },
];

/* ------------------------------------------------------------------ */
/* 9. Assets                                                           */
/*                                                                     */
/* Three kinds of expiry live here and the differences are the point:  */
/*                                                                     */
/*  - AST-002 carries a KOL CONTRACT expiry. When the engagement ends  */
/*    the usage right ends with it; the interview cannot be re-licensed */
/*    by paying more, because the person has to agree again.           */
/*  - AST-008 is a RIGHTS expiry that has already passed and is still  */
/*    embedded in two content versions, one of them on a piece sitting  */
/*    in review right now.                                             */
/*  - AST-003 is neither: it is GOVERNED CONTENT that has been         */
/*    SUPERSEDED. isi-block-current-v7.pdf did not expire — v8 came    */
/*    into force on d(-12), which makes every piece still embedding v7 */
/*    non-compliant from that date. Three published pieces still do.   */
/* ------------------------------------------------------------------ */

export const assets: Asset[] = [
  {
    id: 'AST-001',
    filename: 'oncology-mechanism-animation.mp4',
    mediaType: 'video',
    brandId: 'BRD-002',
    // Owned outright — commissioned work, no third-party rights window.
    status: 'In Use',
    createdAt: at(-220, '12:00'),
    updatedAt: at(-30, '11:00'),
  },
  {
    // The KOL contract case. Usage runs with the engagement, not with a
    // licence: when the contract ends the interview comes down, and no amount
    // of budget re-licenses it without the investigator agreeing again.
    id: 'AST-002',
    filename: 'kol-prof-almansouri-interview.mp4',
    mediaType: 'video',
    brandId: 'BRD-002',
    rightsExpiry: d(41),
    status: 'In Use',
    createdAt: at(-260, '10:00'),
    updatedAt: at(-12, '11:30'),
  },
  {
    // Superseded governed content. Status is Archived because v8 replaced it,
    // NOT Expired: nothing about its rights changed. Three currently-published
    // content versions still embed it, which is the exposure the graph shows.
    id: 'AST-003',
    filename: 'isi-block-current-v7.pdf',
    mediaType: 'document',
    brandId: 'BRD-002',
    status: 'Archived',
    createdAt: at(-430, '10:00'),
    updatedAt: at(-12, '09:00'),
  },
  {
    id: 'AST-004',
    filename: 'caldera-annual-report-2026.pdf',
    mediaType: 'document',
    brandId: 'BRD-001',
    status: 'Approved',
    createdAt: at(-95, '11:30'),
    updatedAt: at(-11, '15:00'),
  },
  {
    id: 'AST-005',
    filename: 'vitalis-daily-immune-hero.jpg',
    mediaType: 'image',
    brandId: 'BRD-004',
    rightsExpiry: d(506),
    status: 'In Use',
    createdAt: at(-88, '10:00'),
    updatedAt: at(-8, '11:30'),
  },
  {
    id: 'AST-006',
    filename: 'congress-booth-panels-ar.pdf',
    mediaType: 'document',
    brandId: 'BRD-001',
    status: 'In Use',
    createdAt: at(-84, '09:00'),
    updatedAt: at(-6, '08:30'),
  },
  {
    id: 'AST-007',
    filename: 'patient-journey-photography-set.jpg',
    mediaType: 'image',
    brandId: 'BRD-002',
    // Model releases attached; the window runs with the releases.
    rightsExpiry: d(230),
    status: 'In Use',
    createdAt: at(-150, '10:00'),
    updatedAt: at(-29, '09:00'),
  },
  {
    // Expired and still embedded. This is the alarming case and it is
    // deliberately left in place: two content versions reference it, one of
    // them on a piece sitting in front of a reviewer right now. Silently
    // unlinking it would hide exactly the exposure the graph exists to show.
    id: 'AST-008',
    filename: 'oncology-congress-portraits-2024.jpg',
    mediaType: 'image',
    brandId: 'BRD-002',
    rightsExpiry: d(-13),
    status: 'Expired',
    createdAt: at(-620, '10:00'),
    updatedAt: at(-12, '07:00'),
  },
  {
    id: 'AST-009',
    filename: 'calvexa-hcp-detail-aid.pdf',
    mediaType: 'document',
    brandId: 'BRD-002',
    status: 'In Use',
    createdAt: at(-186, '09:00'),
    updatedAt: at(-6, '11:00'),
  },
  {
    id: 'AST-010',
    filename: 'vaccines-programme-evidence-deck.pdf',
    mediaType: 'document',
    brandId: 'BRD-003',
    status: 'In Use',
    createdAt: at(-180, '09:00'),
    updatedAt: at(-8, '09:45'),
  },
  {
    id: 'AST-011',
    filename: 'caldera-h1-pipeline-charts.pdf',
    mediaType: 'document',
    brandId: 'BRD-001',
    status: 'Approved',
    createdAt: at(-40, '11:00'),
    updatedAt: at(-9, '10:00'),
  },
  {
    id: 'AST-012',
    filename: 'vitalis-pharmacist-counter-card.jpg',
    mediaType: 'image',
    brandId: 'BRD-004',
    rightsExpiry: d(320),
    status: 'In Use',
    createdAt: at(-90, '10:00'),
    updatedAt: at(-6, '07:00'),
  },
  {
    id: 'AST-013',
    filename: 'vaccines-cold-chain-photography-fr.jpg',
    mediaType: 'image',
    brandId: 'BRD-003',
    rightsExpiry: d(96),
    status: 'In Use',
    createdAt: at(-170, '10:00'),
    updatedAt: at(-15, '17:00'),
  },
  {
    id: 'AST-014',
    filename: 'congress-symposium-cover.png',
    mediaType: 'image',
    brandId: 'BRD-002',
    status: 'In Use',
    createdAt: at(-135, '10:00'),
    updatedAt: at(-7, '09:00'),
  },
  {
    id: 'AST-015',
    filename: 'safety-signal-explainer-diagram.png',
    mediaType: 'image',
    brandId: 'BRD-002',
    status: 'Cataloged',
    createdAt: at(-6, '17:30'),
    updatedAt: at(-4, '09:00'),
  },
  {
    // Deliberately unreferenced: raw footage uploaded from a site visit and
    // neither catalogued nor cleared. Linking it into content to satisfy the
    // graph density target would make its status a lie.
    id: 'AST-016',
    filename: 'caldera-riyadh-site-visit-raw.mp4',
    mediaType: 'video',
    brandId: 'BRD-001',
    status: 'Uploaded',
    createdAt: at(-2, '16:20'),
    updatedAt: at(-2, '16:20'),
  },
  {
    // Deliberately unreferenced: rejected at catalogue review because the pack
    // shots place a Vitalis product beside a prescription pack, which pulls the
    // whole piece out of the OTC override and into the parent rule (POL-005 /
    // POL-001). A rejected asset that live content still embeds would be a bug,
    // not a demo.
    id: 'AST-017',
    filename: 'vitalis-range-shelf-composite.png',
    mediaType: 'image',
    brandId: 'BRD-004',
    status: 'Rejected',
    createdAt: at(-21, '14:00'),
    updatedAt: at(-19, '10:00'),
  },
  {
    // The replacement safety block. In force as LGL-002 from d(-12); two
    // content versions have been moved onto it and three have not.
    id: 'AST-018',
    filename: 'isi-block-current-v8.pdf',
    mediaType: 'document',
    brandId: 'BRD-002',
    status: 'Approved',
    createdAt: at(-14, '09:00'),
    updatedAt: at(-12, '09:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 10. Content                                                         */
/*                                                                     */
/* Three pieces run on WF-006, the MLR workflow: CNT-009, CNT-010 and  */
/* CNT-011. Everything else runs on the standard content or corporate  */
/* workflow, because MLR applies to promotional material naming a      */
/* prescription product and to nothing else.                           */
/* ------------------------------------------------------------------ */

export const contents: Content[] = [
  {
    id: 'CNT-001',
    title: 'Vitalis winter range launch email',
    contentType: 'email',
    status: 'In Review',
    classification: 'Internal',
    briefId: 'BRF-001',
    campaignId: 'CMP-001',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-002',
    workflowId: 'WF-001',
    createdAt: at(-40, '09:15'),
    updatedAt: at(-4, '09:05'),
  },
  {
    // The rework case, and the conditional-override case. The social cut
    // borrowed authority from the prescription portfolio by name, which pulled
    // the whole piece out of the Vitalis OTC override and back under the
    // parent clinical-reference rule.
    id: 'CNT-002',
    title: 'Vitalis winter range social kit',
    contentType: 'post',
    status: 'Rework',
    classification: 'Internal',
    briefId: 'BRF-001',
    campaignId: 'CMP-001',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-005',
    workflowId: 'WF-001',
    createdAt: at(-38, '10:00'),
    updatedAt: at(-6, '07:10'),
  },
  {
    id: 'CNT-003',
    title: 'Winter immunity landing page',
    contentType: 'page',
    status: 'Draft',
    classification: 'Internal',
    briefId: 'BRF-001',
    campaignId: 'CMP-001',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-006',
    workflowId: 'WF-001',
    createdAt: at(-22, '11:00'),
    updatedAt: at(-9, '11:00'),
  },
  {
    id: 'CNT-004',
    title: 'Al-Nakheel programme credentials pack',
    contentType: 'page',
    status: 'In Review',
    classification: 'Confidential',
    briefId: 'BRF-002',
    campaignId: 'CMP-002',
    brandId: 'BRD-003',
    ownerStakeholderId: 'STK-008',
    currentVersionId: 'CV-007',
    workflowId: 'WF-001',
    createdAt: at(-110, '09:00'),
    updatedAt: at(-4, '08:00'),
  },
  {
    id: 'CNT-005',
    title: 'Programme supply commitment statement',
    contentType: 'PR',
    status: 'Draft',
    classification: 'Confidential',
    briefId: 'BRF-002',
    campaignId: 'CMP-002',
    brandId: 'BRD-003',
    ownerStakeholderId: 'STK-008',
    currentVersionId: 'CV-009',
    workflowId: 'WF-001',
    createdAt: at(-60, '09:00'),
    updatedAt: at(-4, '08:05'),
  },
  {
    id: 'CNT-006',
    title: 'Congress abstract summary',
    contentType: 'page',
    status: 'Published',
    classification: 'Public',
    briefId: 'BRF-003',
    campaignId: 'CMP-003',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-012',
    workflowId: 'WF-001',
    createdAt: at(-100, '09:00'),
    updatedAt: at(-70, '10:00'),
  },
  {
    // Still embeds the v7 safety block (AST-003). Published before v8 came
    // into force and not re-versioned since — the exposure the graph shows.
    id: 'CNT-007',
    title: 'Congress symposium press release',
    contentType: 'PR',
    status: 'Published',
    classification: 'Public',
    briefId: 'BRF-003',
    campaignId: 'CMP-003',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-008',
    currentVersionId: 'CV-013',
    workflowId: 'WF-001',
    createdAt: at(-95, '09:00'),
    updatedAt: at(-72, '08:00'),
  },
  {
    // Also still on v7.
    id: 'CNT-008',
    title: 'Congress symposium invitation',
    contentType: 'email',
    status: 'Approved',
    classification: 'Public',
    briefId: 'BRF-003',
    campaignId: 'CMP-003',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-014',
    workflowId: 'WF-001',
    createdAt: at(-60, '09:00'),
    updatedAt: at(-9, '10:00'),
  },
  {
    // The full MLR chain, cleared: APR-029 → APR-030 → APR-031 → APR-032.
    // Also the one piece that HAS been re-versioned onto the v8 safety block.
    id: 'CNT-009',
    title: 'Second-line indication HCP email',
    contentType: 'email',
    status: 'Published',
    classification: 'Public',
    briefId: 'BRF-004',
    campaignId: 'CMP-004',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-017',
    workflowId: 'WF-006',
    createdAt: at(-70, '09:00'),
    updatedAt: at(-9, '16:10'),
  },
  {
    id: 'CNT-010',
    title: 'Second-line indication HCP social burst',
    contentType: 'post',
    status: 'Approved',
    classification: 'Public',
    briefId: 'BRF-004',
    campaignId: 'CMP-004',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-018',
    workflowId: 'WF-006',
    createdAt: at(-50, '09:00'),
    updatedAt: at(-14, '16:15'),
  },
  {
    // The stuck item. Medical cleared it on d(-12); Legal has held it since
    // d(-11) against a 48-hour SLA that expired on d(-9), and Regulatory has
    // not seen it. Neither the campaign owner nor the CMO can move it: POL-011
    // makes every one of the three gates non-waivable.
    id: 'CNT-011',
    title: 'Second-line indication press release',
    contentType: 'PR',
    status: 'In Review',
    classification: 'Confidential',
    briefId: 'BRF-004',
    campaignId: 'CMP-004',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-008',
    currentVersionId: 'CV-020',
    workflowId: 'WF-006',
    createdAt: at(-20, '11:00'),
    updatedAt: at(-11, '09:00'),
  },
  {
    id: 'CNT-012',
    title: 'Safety signal HCP notification',
    contentType: 'page',
    status: 'Published',
    classification: 'Public',
    campaignId: 'CMP-004',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-021',
    workflowId: 'WF-001',
    createdAt: at(-6, '17:00'),
    updatedAt: at(-4, '09:00'),
  },
  {
    id: 'CNT-013',
    title: 'H1 results & pipeline investor statement',
    contentType: 'PR',
    status: 'In Review',
    classification: 'Restricted',
    briefId: 'BRF-005',
    campaignId: 'CMP-005',
    brandId: 'BRD-001',
    ownerStakeholderId: 'STK-004',
    currentVersionId: 'CV-022',
    workflowId: 'WF-003',
    createdAt: at(-30, '09:00'),
    updatedAt: at(-2, '09:30'),
  },
  {
    id: 'CNT-014',
    title: 'Pipeline summary page',
    contentType: 'page',
    status: 'Draft',
    classification: 'Internal',
    briefId: 'BRF-005',
    campaignId: 'CMP-005',
    brandId: 'BRD-001',
    ownerStakeholderId: 'STK-004',
    currentVersionId: 'CV-024',
    workflowId: 'WF-001',
    createdAt: at(-25, '09:00'),
    updatedAt: at(-9, '10:05'),
  },
  {
    id: 'CNT-015',
    title: 'Vaccines programme evidence one-pager',
    contentType: 'page',
    status: 'Published',
    classification: 'Internal',
    briefId: 'BRF-006',
    campaignId: 'CMP-006',
    brandId: 'BRD-003',
    ownerStakeholderId: 'STK-007',
    currentVersionId: 'CV-025',
    workflowId: 'WF-001',
    createdAt: at(-150, '09:00'),
    updatedAt: at(-20, '11:00'),
  },
  {
    id: 'CNT-016',
    title: 'Programme partner newsletter — August',
    contentType: 'email',
    status: 'Published',
    classification: 'Internal',
    briefId: 'BRF-006',
    campaignId: 'CMP-006',
    brandId: 'BRD-003',
    ownerStakeholderId: 'STK-007',
    currentVersionId: 'CV-027',
    workflowId: 'WF-001',
    createdAt: at(-45, '09:00'),
    updatedAt: at(-16, '17:00'),
  },
  {
    id: 'CNT-017',
    title: 'Pharmacist partner newsletter',
    contentType: 'email',
    status: 'Approved',
    classification: 'Internal',
    briefId: 'BRF-007',
    campaignId: 'CMP-007',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-028',
    workflowId: 'WF-001',
    createdAt: at(-26, '09:00'),
    updatedAt: at(-6, '16:25'),
  },
  {
    id: 'CNT-018',
    title: 'Pharmacist recruitment landing page',
    contentType: 'page',
    status: 'Draft',
    classification: 'Internal',
    briefId: 'BRF-007',
    campaignId: 'CMP-007',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-029',
    workflowId: 'WF-001',
    createdAt: at(-24, '09:00'),
    updatedAt: at(-5, '09:50'),
  },
  {
    // Also still on v7.
    id: 'CNT-019',
    title: 'Real-world evidence hub 2026 report',
    contentType: 'page',
    status: 'Published',
    classification: 'Public',
    briefId: 'BRF-008',
    campaignId: 'CMP-008',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-030',
    workflowId: 'WF-001',
    createdAt: at(-130, '09:00'),
    updatedAt: at(-60, '10:00'),
  },
  {
    id: 'CNT-020',
    title: 'Real-world evidence hub social kit',
    contentType: 'post',
    status: 'Published',
    classification: 'Public',
    briefId: 'BRF-008',
    campaignId: 'CMP-008',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-032',
    workflowId: 'WF-001',
    createdAt: at(-120, '09:00'),
    updatedAt: at(-55, '10:00'),
  },
  {
    // Arabic-first: CV-033 is the source and CV-034 is the English derived
    // from it. In the Kingdom the Arabic text governs, so writing English
    // first and translating out of it is the wrong order.
    id: 'CNT-021',
    title: 'إعلان تعهد الإتاحة — Access pledge announcement',
    contentType: 'PR',
    status: 'In Review',
    classification: 'Internal',
    campaignId: 'CMP-009',
    brandId: 'BRD-001',
    ownerStakeholderId: 'STK-008',
    currentVersionId: 'CV-034',
    workflowId: 'WF-003',
    createdAt: at(-70, '09:00'),
    updatedAt: at(-3, '08:30'),
  },
  {
    id: 'CNT-022',
    title: 'Spring wellbeing teaser',
    contentType: 'post',
    status: 'Draft',
    classification: 'Internal',
    campaignId: 'CMP-010',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-035',
    workflowId: 'WF-001',
    createdAt: at(-30, '09:00'),
    updatedAt: at(-12, '09:00'),
  },
  {
    id: 'CNT-023',
    title: 'Summer hydration check-in email',
    contentType: 'email',
    status: 'Retired',
    classification: 'Public',
    campaignId: 'CMP-011',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-036',
    workflowId: 'WF-001',
    createdAt: at(-140, '09:00'),
    updatedAt: at(-10, '18:00'),
  },
  {
    id: 'CNT-024',
    title: 'Safety signal holding statement',
    contentType: 'PR',
    status: 'Approved',
    classification: 'Restricted',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-004',
    currentVersionId: 'CV-037',
    workflowId: 'WF-003',
    createdAt: at(-6, '15:00'),
    updatedAt: at(-5, '11:20'),
  },
  {
    id: 'CNT-025',
    title: 'Vitalis 2025 winter range page',
    contentType: 'page',
    status: 'Archived',
    classification: 'Public',
    brandId: 'BRD-004',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-039',
    workflowId: 'WF-001',
    createdAt: at(-420, '09:00'),
    updatedAt: at(-200, '09:00'),
  },
  {
    // Discarded rather than reworked: the piece was built on a use the label
    // does not carry, which POL-008 prohibits outright. There is no version of
    // it that clears review, so it was killed rather than sent back.
    id: 'CNT-026',
    title: 'Earlier-line positioning draft (discarded)',
    contentType: 'post',
    status: 'Discarded',
    classification: 'Internal',
    campaignId: 'CMP-004',
    brandId: 'BRD-002',
    ownerStakeholderId: 'STK-002',
    currentVersionId: 'CV-040',
    workflowId: 'WF-001',
    createdAt: at(-52, '09:00'),
    updatedAt: at(-48, '16:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 11. Content versions                                                */
/*                                                                     */
/* Fifteen versions carry agent provenance (the A4 runs in §23         */
/* produced exactly these, and each run's `finishedAt` equals its      */
/* version's `createdAt`). Seven of the fifteen sit on content a       */
/* person has since approved or published — that is what makes the     */
/* acceptance rate on the agent surface evidence rather than a score.  */
/* The other eight are still awaiting review and are meant to be.      */
/* ------------------------------------------------------------------ */

const GEN = 'simulated-ai · deterministic';

export const contentVersions: ContentVersion[] = [
  /* --- CNT-001 Vitalis winter range launch email -------------------- */
  {
    id: 'CV-001',
    contentId: 'CNT-001',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Winter asks more of you. Vitalis Daily Immune is a food supplement with vitamin D, zinc and vitamin C — the everyday basics, in one tablet. Ask your pharmacist whether it fits alongside what you already take.',
    assetIds: ['AST-012'],
    aiGenerated: true,
    provenance: {
      source: 'ai-draft',
      generator: GEN,
      basis: 'First draft of the Vitalis winter range launch email from BRF-001, written to lead on what a pharmacist can repeat at the counter rather than on a benefit claim.',
    },
    createdAt: at(-40, '09:20'),
    updatedAt: at(-40, '09:20'),
  },
  {
    id: 'CV-002',
    contentId: 'CNT-001',
    versionNumber: 'V1.1',
    locale: 'en-US',
    body: 'Winter asks more of you. Vitalis Daily Immune is a food supplement providing vitamin D, zinc and vitamin C, which contribute to the normal function of the immune system — the authorised claim, in the permitted wording, from the European register. It is not a medicine and does not treat or prevent illness. Ask your pharmacist whether it fits alongside what you already take.',
    assetIds: ['AST-012'],
    approvalId: 'APR-009',
    aiGenerated: false,
    createdAt: at(-18, '14:10'),
    updatedAt: at(-4, '09:05'),
  },
  {
    id: 'CV-003',
    contentId: 'CNT-001',
    versionNumber: 'V1.1-fr',
    locale: 'fr-FR',
    regionId: 'REG-EMEA',
    body: 'L\'hiver demande davantage. Vitalis Daily Immune est un complément alimentaire apportant vitamine D, zinc et vitamine C, qui contribuent au fonctionnement normal du système immunitaire — allégation autorisée, dans le libellé permis par le registre européen. Ce n\'est pas un médicament : il ne traite ni ne prévient aucune maladie. Demandez conseil à votre pharmacien.',
    assetIds: ['AST-012'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'French localization of the approved Vitalis winter email, with the claim taken from the French permitted-claims wording rather than translated from the English.',
      derivedFromVersionId: 'CV-002',
    },
    createdAt: at(-16, '10:00'),
    updatedAt: at(-16, '10:00'),
  },

  /* --- CNT-002 Vitalis winter social kit (Rework) ------------------- */
  {
    // The conditional-override failure. Naming Calvexa in a Vitalis piece
    // pulls the whole piece out of the OTC-scoped override and under the
    // parent clinical-reference rule, which this copy cannot satisfy.
    id: 'CV-004',
    contentId: 'CNT-002',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'From the team behind Calvexa — everyday immune support you can trust. Vitalis Daily Immune, now in pharmacies.',
    assetIds: ['AST-012'],
    aiGenerated: true,
    provenance: {
      source: 'ai-draft',
      generator: GEN,
      basis: 'Social cut-down of the Vitalis winter message for the 280-character paid and organic social limit.',
    },
    createdAt: at(-38, '10:05'),
    updatedAt: at(-38, '10:05'),
  },
  {
    id: 'CV-005',
    contentId: 'CNT-002',
    versionNumber: 'V1.1',
    locale: 'en-US',
    body: 'Vitalis Daily Immune is a food supplement with vitamin D, zinc and vitamin C, which contribute to the normal function of the immune system. Not a medicine. In pharmacies now — ask your pharmacist.',
    assetIds: ['AST-012'],
    approvalId: 'APR-010',
    aiGenerated: true,
    provenance: {
      source: 'refinement',
      generator: GEN,
      basis: 'Refined after the brand gate returned a conditional-override failure: the original named a prescription product inside consumer copy, which takes the piece out of POL-005 and under POL-001.',
      derivedFromVersionId: 'CV-004',
      feedback:
        '"From the team behind Calvexa" names a prescription product in a consumer piece. POL-005 is scoped to over-the-counter products only, so the override does not apply here and POL-001 governs the whole piece — which would require a clinical reference and fair balance in a social post, neither of which is possible. Remove the reference to the prescription portfolio.',
      preservedFragments: ['ask your pharmacist'],
    },
    createdAt: at(-6, '07:00'),
    updatedAt: at(-6, '07:10'),
  },

  /* --- CNT-003 Winter immunity landing page ------------------------ */
  {
    id: 'CV-006',
    contentId: 'CNT-003',
    versionNumber: 'V1',
    locale: 'en-GB',
    body: 'What the Vitalis winter range does, and what it does not. Each claim on this page names the authorised wording it is made under and the nutrient it rests on. Nothing here treats, prevents or cures illness — if you are unwell, speak to a pharmacist or a doctor.',
    assetIds: ['AST-005'],
    aiGenerated: false,
    createdAt: at(-22, '11:05'),
    updatedAt: at(-9, '11:00'),
  },

  /* --- CNT-004 Al-Nakheel credentials pack ------------------------- */
  {
    id: 'CV-007',
    contentId: 'CNT-004',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Caldera Vaccines has delivered 41 national immunisation programmes across four regions, with published coverage attainment and cold-chain excursion records for every one. This pack sets out the delivery record, the cold-chain performance and the supply commitments behind our Al-Nakheel submission.',
    assetIds: ['AST-010'],
    approvalId: 'APR-026',
    aiGenerated: false,
    createdAt: at(-110, '09:05'),
    updatedAt: at(-4, '08:00'),
  },
  {
    id: 'CV-008',
    contentId: 'CNT-004',
    versionNumber: 'V1-ar',
    locale: 'ar-SA',
    regionId: 'REG-MENA',
    body: 'نفّذت كالديرا للقاحات 41 برنامجاً وطنياً للتحصين في أربع مناطق، مع نشر نسب التغطية المحققة وسجلات انحرافات سلسلة التبريد لكل برنامج منها. وتعرض هذه الحزمة سجل التنفيذ وأداء سلسلة التبريد والتزامات الإمداد التي يستند إليها عرضنا في برنامج النخيل.',
    assetIds: ['AST-010', 'AST-006'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'Arabic localization of the Al-Nakheel credentials pack. In the Kingdom the Arabic text governs, so this version is the one the programme office reads.',
      derivedFromVersionId: 'CV-007',
    },
    createdAt: at(-108, '10:00'),
    updatedAt: at(-4, '08:00'),
  },

  /* --- CNT-005 Programme supply commitment statement --------------- */
  {
    id: 'CV-009',
    contentId: 'CNT-005',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Caldera Vaccines commits to the delivery schedule set out in the Al-Nakheel tender, with a stated remedy where a delivery window is missed and monthly published attainment against it. Cold-chain excursions are reported to the programme office by us within 24 hours of detection, whether or not product integrity is affected.',
    assetIds: ['AST-006'],
    aiGenerated: false,
    createdAt: at(-60, '09:05'),
    updatedAt: at(-4, '08:05'),
  },
  {
    id: 'CV-010',
    contentId: 'CNT-005',
    versionNumber: 'V1-ar',
    locale: 'ar-SA',
    regionId: 'REG-MENA',
    body: 'تلتزم كالديرا للقاحات بجدول التسليم المحدد في منافسة النخيل، مع تعويض منصوص عليه في حال تأخر أي دفعة، ونشر شهري لنسبة الالتزام المحققة. ويتم إبلاغ مكتب البرنامج بأي انحراف في سلسلة التبريد خلال 24 ساعة من اكتشافه، سواء تأثرت سلامة المنتج أم لم تتأثر.',
    assetIds: ['AST-006'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'Arabic localization of the supply commitment statement for the KSA programme office and the local press wire.',
      derivedFromVersionId: 'CV-009',
    },
    createdAt: at(-58, '10:00'),
    updatedAt: at(-4, '08:05'),
  },

  /* --- CNT-006 Congress abstract summary --------------------------- */
  {
    id: 'CV-011',
    contentId: 'CNT-006',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'The second-line cohort met its primary endpoint of progression-free survival in the pre-specified analysis population. This summary states the endpoint, the population and the analysis as presented at the congress, and links to the full abstract as published by the congress secretariat.',
    assetIds: ['AST-001'],
    aiGenerated: true,
    provenance: {
      source: 'ai-draft',
      generator: GEN,
      basis: 'First draft of the congress abstract summary from BRF-003, written to state endpoint and population before any interpretation and to avoid any comparative construction.',
    },
    createdAt: at(-100, '09:05'),
    updatedAt: at(-100, '09:05'),
  },
  {
    id: 'CV-012',
    contentId: 'CNT-006',
    versionNumber: 'V2',
    locale: 'en-US',
    body: 'The second-line cohort met its primary endpoint of progression-free survival in the pre-specified analysis population, with the hazard ratio, confidence interval and median follow-up stated beside it. Secondary endpoints are reported whether or not they reached significance, and subgroup results are labelled with their pre-specification status. Safety and tolerability are reported in the same section rather than in an appendix. This is a summary of data presented at a congress and is not a substitute for the prescribing information.',
    assetIds: ['AST-001', 'AST-014'],
    approvalId: 'APR-011',
    aiGenerated: false,
    createdAt: at(-88, '11:30'),
    updatedAt: at(-70, '10:00'),
  },

  /* --- CNT-007 Congress symposium press release -------------------- */
  {
    id: 'CV-013',
    contentId: 'CNT-007',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Caldera Oncology today presented second-line data at the congress, with the primary endpoint, the analysis population and the safety profile reported together. "The interesting result is the one in the safety table, and it should be read alongside the efficacy result, not after it," said Dr Ayaka Morimoto, Medical Affairs Lead at Caldera Therapeutics Group. Important Safety Information accompanies this release.',
    assetIds: ['AST-003', 'AST-014'],
    approvalId: 'APR-012',
    aiGenerated: false,
    createdAt: at(-95, '09:05'),
    updatedAt: at(-72, '08:00'),
  },

  /* --- CNT-008 Congress symposium invitation ----------------------- */
  {
    id: 'CV-014',
    contentId: 'CNT-008',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Join the investigators and an independent discussant for the second-line data session: what the primary endpoint showed, what the safety table showed, and where the analysis is limited. The session is for healthcare professionals; Important Safety Information and a link to the full Prescribing Information accompany this invitation.',
    assetIds: ['AST-003', 'AST-002'],
    approvalId: 'APR-013',
    aiGenerated: false,
    createdAt: at(-60, '09:05'),
    updatedAt: at(-9, '10:00'),
  },
  {
    id: 'CV-015',
    contentId: 'CNT-008',
    versionNumber: 'V1-fr',
    locale: 'fr-FR',
    regionId: 'REG-EMEA',
    body: 'Rejoignez les investigateurs et un discutant indépendant pour la session consacrée aux données de deuxième ligne : ce que montre le critère principal, ce que montre le tableau de tolérance, et où l\'analyse est limitée. Session réservée aux professionnels de santé ; les informations importantes de sécurité et le lien vers le résumé des caractéristiques du produit accompagnent cette invitation.',
    assetIds: ['AST-002'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'French localization of the congress symposium invitation for the EMEA session.',
      derivedFromVersionId: 'CV-014',
    },
    createdAt: at(-40, '10:00'),
    updatedAt: at(-9, '10:00'),
  },

  /* --- CNT-009 Second-line indication HCP email -------------------- */
  {
    // V1 carried the v7 safety block.
    id: 'CV-016',
    contentId: 'CNT-009',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'The second-line indication is now available. This email states the approved indication, the primary endpoint and the analysis population, and carries the Important Safety Information in full. A link to the complete Prescribing Information is one click away from every section.',
    assetIds: ['AST-009', 'AST-003'],
    aiGenerated: true,
    provenance: {
      source: 'ai-draft',
      generator: GEN,
      basis: 'First draft of the second-line HCP launch email from BRF-004, written for oncologists already treating in the indication rather than for a general HCP list.',
    },
    createdAt: at(-70, '09:05'),
    updatedAt: at(-70, '09:05'),
  },
  {
    // V2 is the re-version onto the v8 safety block (AST-018), written the day
    // v8 came into force and put through the full MLR chain again.
    id: 'CV-017',
    contentId: 'CNT-009',
    versionNumber: 'V2',
    locale: 'en-US',
    body: 'The second-line indication is now available. This email states the approved indication, the primary endpoint and the analysis population, and carries the current Important Safety Information in full, including the cardiac events added at the latest revision. A link to the complete Prescribing Information is one click away from every section, and the adverse-event reporting route is at the foot of this message.',
    assetIds: ['AST-009', 'AST-018'],
    approvalId: 'APR-032',
    aiGenerated: false,
    createdAt: at(-13, '09:00'),
    updatedAt: at(-9, '16:10'),
  },

  /* --- CNT-010 Second-line indication HCP social burst ------------- */
  {
    id: 'CV-018',
    contentId: 'CNT-010',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Second-line data, presented in full: endpoint, population, safety table. For healthcare professionals. Important Safety Information and Prescribing Information linked.',
    assetIds: ['AST-002'],
    approvalId: 'APR-036',
    aiGenerated: true,
    provenance: {
      source: 'variant',
      generator: GEN,
      basis: 'HCP social variant of the second-line launch email written for the Treating Oncologist, checked against the 280-character paid and organic social limit.',
      derivedFromVersionId: 'CV-017',
      personaId: 'PER-001',
      channelId: 'CHN-002',
    },
    createdAt: at(-50, '09:05'),
    updatedAt: at(-14, '16:15'),
  },
  {
    id: 'CV-019',
    contentId: 'CNT-010',
    versionNumber: 'V1-uk',
    locale: 'en-GB',
    regionId: 'REG-EMEA',
    body: 'Second-line data in full — endpoint, population and the safety table together. Intended for healthcare professionals only. Abbreviated prescribing information and the route to the full SmPC are linked.',
    assetIds: ['AST-002'],
    aiGenerated: true,
    provenance: {
      source: 'variant',
      generator: GEN,
      basis: 'UK HCP variant, written to the EMEA rule that prescription-only material may not be addressed to the general public.',
      derivedFromVersionId: 'CV-017',
      personaId: 'PER-001',
      channelId: 'CHN-002',
    },
    createdAt: at(-48, '09:05'),
    updatedAt: at(-14, '16:15'),
  },

  /* --- CNT-011 Second-line indication press release (stuck) -------- */
  {
    // Two exposures on one version: it is held at the MLR Legal gate past its
    // SLA, and it still embeds AST-008, whose rights lapsed on d(-13).
    id: 'CV-020',
    contentId: 'CNT-011',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Caldera Oncology today announced availability of the second-line indication, reporting the primary endpoint, the analysis population and the safety profile together. The release carries the current Important Safety Information and links to the full Prescribing Information. Investigator quotes are attributed with the investigator\'s relationship to the study stated.',
    assetIds: ['AST-009', 'AST-008'],
    approvalId: 'APR-035',
    aiGenerated: false,
    createdAt: at(-20, '11:05'),
    updatedAt: at(-11, '09:00'),
  },

  /* --- CNT-012 Safety signal HCP notification ---------------------- */
  {
    id: 'CV-021',
    contentId: 'CNT-012',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Post-marketing surveillance has identified a cluster of reports requiring assessment. This notification states what has been observed, what has not yet been established, and what we are asking prescribers to do while the assessment runs. The regulator has been notified and promotional activity for the product is suspended. The current Important Safety Information is reproduced in full below; please report any suspected adverse event through your national system.',
    assetIds: ['AST-015', 'AST-018'],
    approvalId: 'APR-014',
    aiGenerated: false,
    createdAt: at(-6, '17:05'),
    updatedAt: at(-4, '09:00'),
  },

  /* --- CNT-013 H1 results & pipeline investor statement ------------ */
  {
    id: 'CV-022',
    contentId: 'CNT-013',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Caldera Therapeutics Group today reported its results for the first half of 2026 alongside a pipeline update. The readout schedule and the evidence boundary are stated in the header of the dataset rather than in a footnote, and no product under development is described as approved. Commitments are reported against their published baselines, including the two the Group did not meet.',
    assetIds: ['AST-004', 'AST-011'],
    approvalId: 'APR-015',
    aiGenerated: false,
    createdAt: at(-30, '09:05'),
    updatedAt: at(-2, '09:30'),
  },
  {
    id: 'CV-023',
    contentId: 'CNT-013',
    versionNumber: 'V1-ar',
    locale: 'ar-SA',
    regionId: 'REG-MENA',
    body: 'أعلنت مجموعة كالديرا العلاجية اليوم نتائج النصف الأول من عام 2026 مع تحديث لمحفظة مشاريعها البحثية. ويُذكر جدول إعلان النتائج وحدود الأدلة المتاحة في مقدمة مجموعة البيانات لا في حاشية، ولا يوصف أي منتج قيد التطوير بأنه معتمد. وتُعرض الالتزامات مقارنةً بخطوط الأساس المنشورة، بما في ذلك الالتزامان اللذان لم تحققهما المجموعة.',
    assetIds: ['AST-004'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'Arabic localization of the H1 results and pipeline investor statement for MENA institutional readers.',
      derivedFromVersionId: 'CV-022',
    },
    createdAt: at(-28, '10:00'),
    updatedAt: at(-2, '09:30'),
  },

  /* --- CNT-014 Pipeline summary page -------------------------------- */
  {
    id: 'CV-024',
    contentId: 'CNT-014',
    versionNumber: 'V1',
    locale: 'en-GB',
    body: 'The 2026 pipeline is published as a dataset with the evidence boundary in the header, so it can be compared like for like against prior periods without asking us for a reconciliation. Each programme names the phase it is in and the next readout it is committed to, and nothing here should be read as promotion of an unapproved product.',
    assetIds: ['AST-004', 'AST-011'],
    approvalId: 'APR-027',
    aiGenerated: false,
    createdAt: at(-25, '09:05'),
    updatedAt: at(-9, '10:05'),
  },

  /* --- CNT-015 Vaccines programme evidence one-pager --------------- */
  {
    id: 'CV-025',
    contentId: 'CNT-015',
    versionNumber: 'V3',
    locale: 'en-GB',
    body: 'Caldera Vaccines has delivered 41 national immunisation programmes, with coverage attainment published per programme and cold-chain excursions reported as detected and resolved rather than as an availability percentage. Supply commitments are stated with the remedy that applies where a window is missed.',
    assetIds: ['AST-010', 'AST-013'],
    approvalId: 'APR-016',
    aiGenerated: false,
    createdAt: at(-150, '09:05'),
    updatedAt: at(-20, '11:00'),
  },
  {
    id: 'CV-026',
    contentId: 'CNT-015',
    versionNumber: 'V3-fr',
    locale: 'fr-FR',
    regionId: 'REG-EMEA',
    body: 'Caldera Vaccines a livré 41 programmes nationaux de vaccination, avec un taux de couverture publié par programme et des excursions de chaîne du froid déclarées telles que détectées et résolues, plutôt que sous forme d\'un pourcentage de disponibilité. Les engagements d\'approvisionnement sont assortis du recours applicable en cas de fenêtre de livraison manquée.',
    assetIds: ['AST-013'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'French localization of the vaccines programme evidence one-pager for the EMEA programme markets.',
      derivedFromVersionId: 'CV-025',
    },
    createdAt: at(-140, '10:00'),
    updatedAt: at(-20, '11:00'),
  },

  /* --- CNT-016 Programme partner newsletter ------------------------ */
  {
    id: 'CV-027',
    contentId: 'CNT-016',
    versionNumber: 'V1',
    locale: 'en-GB',
    body: 'This month: two programme coverage records were refreshed against ministry returns, the French cold-chain photography pack has been re-shot with current consent, and the evidence one-pager now carries attainment through June. Programme teams should pull the current version rather than the copy saved locally in March.',
    assetIds: ['AST-010', 'AST-013'],
    approvalId: 'APR-017',
    aiGenerated: false,
    createdAt: at(-45, '09:05'),
    updatedAt: at(-16, '17:00'),
  },

  /* --- CNT-017 Pharmacist partner newsletter ----------------------- */
  {
    id: 'CV-028',
    contentId: 'CNT-017',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Autumn partner cohorts open next month, with counter training allocated by partner status rather than by order volume. The winter range substantiation card is in the partner portal, and every claim on it names the register wording it is made under.',
    // AST-008 is EXPIRED and still embedded here. Left in place deliberately:
    // this piece is approved and the exposure is real.
    assetIds: ['AST-007', 'AST-008'],
    approvalId: 'APR-018',
    aiGenerated: false,
    createdAt: at(-26, '09:05'),
    updatedAt: at(-6, '16:25'),
  },

  /* --- CNT-018 Pharmacist recruitment landing page ----------------- */
  {
    id: 'CV-029',
    contentId: 'CNT-018',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Join the Vitalis pharmacist partner network. Partners get the substantiation behind every claim in the range, in a form they can say out loud at the counter, and training slots allocated by partner status rather than by order volume.',
    assetIds: ['AST-007'],
    approvalId: 'APR-028',
    aiGenerated: false,
    createdAt: at(-24, '09:05'),
    updatedAt: at(-5, '09:50'),
  },

  /* --- CNT-019 Real-world evidence hub report ---------------------- */
  {
    id: 'CV-030',
    contentId: 'CNT-019',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'The real-world evidence hub reports outcomes in the treated population using registry and claims data, with the cohort definitions, the confounding adjustments and the analysis code published in full so the analysis can be rerun without us. Real-world results are reported whether or not they agree with the registrational data, and are never presented as a substitute for it. Important Safety Information accompanies this report.',
    assetIds: ['AST-003', 'AST-001'],
    approvalId: 'APR-019',
    aiGenerated: false,
    createdAt: at(-130, '09:05'),
    updatedAt: at(-60, '10:00'),
  },
  {
    id: 'CV-031',
    contentId: 'CNT-019',
    versionNumber: 'V1-ja',
    locale: 'ja-JP',
    regionId: 'REG-APAC',
    body: 'リアルワールドエビデンス・ハブでは、レジストリおよびレセプトデータを用いて実臨床下の治療成績を報告しています。コホート定義、交絡調整、解析コードはすべて公開しており、第三者が同じ解析を再現できます。結果は承認申請時のデータと一致するか否かにかかわらず報告し、承認申請時データの代替としては提示しません。本資材に記載する効能・効果は国内で承認された内容です。',
    assetIds: ['AST-014'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'Japanese localization of the real-world evidence hub report, written to the local rule that the indication stated must be the Japanese approved indication rather than a global one.',
      derivedFromVersionId: 'CV-030',
    },
    createdAt: at(-120, '10:00'),
    updatedAt: at(-60, '10:00'),
  },

  /* --- CNT-020 Real-world evidence hub social kit ------------------ */
  {
    id: 'CV-032',
    contentId: 'CNT-020',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'The real-world evidence hub is live, and so is the code. Rerun the analysis on your own population — that is the point of publishing it. For healthcare professionals.',
    assetIds: ['AST-014'],
    approvalId: 'APR-020',
    aiGenerated: false,
    createdAt: at(-120, '09:05'),
    updatedAt: at(-55, '10:00'),
  },

  /* --- CNT-021 Access pledge (Arabic first) ------------------------ */
  {
    id: 'CV-033',
    contentId: 'CNT-021',
    versionNumber: 'V1',
    locale: 'ar-SA',
    regionId: 'REG-MENA',
    body: 'تلتزم مجموعة كالديرا العلاجية بنشر مواعيد إتاحة كل منتج تسجّله في المملكة، مقرونةً برقم تسجيل المادة الدعائية الصادر عن الهيئة العامة للغذاء والدواء وتاريخ إصداره. ولن تُوزَّع أي مادة قبل صدور رقم تسجيلها. ويشمل التعهد كذلك الإفصاح السنوي عن مواعيد الإتاحة المنجزة لا المستهدفة، وعن الحالات التي لم نلتزم فيها بالموعد المعلن.',
    assetIds: ['AST-006'],
    approvalId: 'APR-021',
    aiGenerated: false,
    createdAt: at(-70, '09:05'),
    updatedAt: at(-3, '08:30'),
  },
  {
    id: 'CV-034',
    contentId: 'CNT-021',
    versionNumber: 'V1-en',
    locale: 'en-US',
    body: 'Caldera Therapeutics Group commits to publishing the availability date for every product it registers in the Kingdom, alongside the Saudi Food and Drug Authority promotional-material registration number and its issue date. No material is distributed before its registration number has been issued. The pledge also covers annual disclosure of delivered availability dates rather than targeted ones, including the dates we did not meet.',
    assetIds: ['AST-006'],
    aiGenerated: true,
    provenance: {
      source: 'localization',
      generator: GEN,
      basis: 'English localization of the Arabic source pledge. Arabic is the governing version in the Kingdom, so English is derived from it rather than the other way round.',
      derivedFromVersionId: 'CV-033',
    },
    createdAt: at(-68, '10:00'),
    updatedAt: at(-3, '08:30'),
  },

  /* --- CNT-022 Spring wellbeing teaser ----------------------------- */
  {
    id: 'CV-035',
    contentId: 'CNT-022',
    versionNumber: 'V1',
    locale: 'en-GB',
    body: 'Winter is over and the habit is the only thing left to decide. From spring, the Vitalis range comes with a plain answer to the question your pharmacist gets most: do I still need this?',
    assetIds: ['AST-005'],
    aiGenerated: false,
    createdAt: at(-30, '09:05'),
    updatedAt: at(-12, '09:00'),
  },

  /* --- CNT-023 Summer hydration check-in --------------------------- */
  {
    id: 'CV-036',
    contentId: 'CNT-023',
    versionNumber: 'V1',
    locale: 'en-GB',
    body: 'Halfway through summer, here is what the range is for and what it is not. Each claim names the register wording it is made under. If you are managing a health condition, speak to your pharmacist before adding anything.',
    assetIds: ['AST-005', 'AST-012'],
    approvalId: 'APR-022',
    aiGenerated: false,
    createdAt: at(-140, '09:05'),
    updatedAt: at(-10, '18:00'),
  },

  /* --- CNT-024 Safety signal holding statement --------------------- */
  {
    id: 'CV-037',
    contentId: 'CNT-024',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Post-marketing surveillance has identified a cluster of reports concerning one of our products, which is now under formal assessment. The regulator has been notified and promotional activity for the product is suspended while the assessment runs. We will publish the assessment outcome when it concludes rather than in advance of it, and prescribers have been written to directly. Anyone with a suspected adverse event should report it through their national system.',
    assetIds: ['AST-015'],
    approvalId: 'APR-023',
    aiGenerated: false,
    createdAt: at(-6, '15:05'),
    updatedAt: at(-5, '11:20'),
  },
  {
    id: 'CV-038',
    contentId: 'CNT-024',
    versionNumber: 'V1-uk',
    locale: 'en-GB',
    regionId: 'REG-EMEA',
    body: 'Post-marketing surveillance has identified a cluster of reports concerning one of our products, now under formal assessment. The regulator has been notified and promotional activity for the product is suspended while the assessment runs. Prescribers in this region have been written to directly; the guidance in that letter comes from Medical Affairs and supersedes anything in earlier promotional material.',
    assetIds: ['AST-015'],
    aiGenerated: false,
    createdAt: at(-5, '12:00'),
    updatedAt: at(-5, '12:00'),
  },

  /* --- CNT-025 / CNT-026 archive and discard ----------------------- */
  {
    id: 'CV-039',
    contentId: 'CNT-025',
    versionNumber: 'V2',
    locale: 'en-GB',
    body: 'Last winter\'s Vitalis range page, retained for the substantiation record. The claims on it were made under the register wording in force at the time and are not current.',
    assetIds: ['AST-012'],
    aiGenerated: false,
    createdAt: at(-420, '09:05'),
    updatedAt: at(-200, '09:00'),
  },
  {
    id: 'CV-040',
    contentId: 'CNT-026',
    versionNumber: 'V1',
    locale: 'en-US',
    body: 'Draft that positioned the product for use earlier in the treatment sequence than the label carries. Discarded at review: POL-008 prohibits promotion outside the authorised indication outright, so there was no version of this line that could clear the gate.',
    assetIds: ['AST-009'],
    aiGenerated: false,
    createdAt: at(-52, '09:05'),
    updatedAt: at(-48, '16:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 12. Communications                                                  */
/*                                                                     */
/* SIX sends are frozen by CRI-003 — COM-008, COM-009, COM-010,        */
/* COM-011, COM-019 and COM-020 — across THREE campaigns owned by two  */
/* different people and funded from two different lines. None of them  */
/* was paused because someone changed their mind; all six were paused  */
/* because they promote the product the signal concerns. That is what  */
/* product scope means, and it is why the freeze is not a property of  */
/* a campaign.                                                         */
/*                                                                     */
/* COM-012 is deliberately NOT frozen: the factual notification is the */
/* piece the freeze exists to make room for.                           */
/*                                                                     */
/* Every one of the twelve CommunicationStatus values appears.         */
/* ------------------------------------------------------------------ */

export const communications: Communication[] = [
  {
    id: 'COM-001',
    subject: 'Vitalis winter range launch',
    commsType: 'external',
    status: 'Drafting',
    classification: 'Internal',
    campaignActivityId: 'ACT-001',
    audienceId: 'AUD-007',
    contentId: 'CNT-001',
    scheduledAt: at(32, '08:00'),
    ownerStakeholderId: 'STK-002',
    body: 'Winter asks more of you. Vitalis Daily Immune is a food supplement providing vitamin D, zinc and vitamin C, which contribute to the normal function of the immune system. It is not a medicine — ask your pharmacist whether it fits alongside what you already take.',
    createdAt: at(-40, '09:00'),
    updatedAt: at(-4, '09:05'),
  },
  {
    id: 'COM-002',
    subject: 'Vitalis winter range social burst',
    commsType: 'external',
    status: 'Rework',
    classification: 'Internal',
    campaignActivityId: 'ACT-002',
    audienceId: 'AUD-007',
    contentId: 'CNT-002',
    ownerStakeholderId: 'STK-007',
    createdAt: at(-38, '10:00'),
    updatedAt: at(-6, '07:10'),
  },
  {
    id: 'COM-003',
    subject: 'Winter immunity landing page publish',
    commsType: 'external',
    status: 'Idea',
    classification: 'Internal',
    campaignActivityId: 'ACT-003',
    audienceId: 'AUD-007',
    contentId: 'CNT-003',
    ownerStakeholderId: 'STK-002',
    createdAt: at(-22, '11:00'),
    updatedAt: at(-9, '11:00'),
  },
  {
    id: 'COM-004',
    subject: 'Al-Nakheel programme credentials submission',
    commsType: 'corporate',
    status: 'In Review',
    classification: 'Confidential',
    campaignActivityId: 'ACT-004',
    audienceId: 'AUD-005',
    contentId: 'CNT-004',
    ownerStakeholderId: 'STK-008',
    body: 'Caldera Vaccines has delivered 41 national immunisation programmes across four regions, with published coverage attainment and cold-chain excursion records for every one. This pack sets out the delivery record, the cold-chain performance and the supply commitments behind our submission.',
    createdAt: at(-110, '09:00'),
    updatedAt: at(-4, '08:00'),
  },
  {
    id: 'COM-005',
    subject: 'Programme supply commitment statement',
    commsType: 'corporate',
    status: 'Briefed',
    classification: 'Confidential',
    campaignActivityId: 'ACT-005',
    audienceId: 'AUD-005',
    contentId: 'CNT-005',
    ownerStakeholderId: 'STK-008',
    createdAt: at(-60, '09:00'),
    updatedAt: at(-4, '08:05'),
  },
  {
    id: 'COM-006',
    subject: 'Congress abstract summary published',
    commsType: 'external',
    status: 'Completed',
    classification: 'Public',
    campaignActivityId: 'ACT-006',
    audienceId: 'AUD-001',
    contentId: 'CNT-006',
    scheduledAt: at(-72, '08:00'),
    ownerStakeholderId: 'STK-002',
    createdAt: at(-100, '09:00'),
    updatedAt: at(-70, '10:00'),
  },
  {
    id: 'COM-007',
    subject: 'Congress symposium press release',
    commsType: 'external',
    status: 'Completed',
    classification: 'Public',
    campaignActivityId: 'ACT-007',
    audienceId: 'AUD-004',
    contentId: 'CNT-007',
    scheduledAt: at(-72, '06:00'),
    ownerStakeholderId: 'STK-008',
    body: 'Caldera Oncology today presented second-line data at the congress, with the primary endpoint, the analysis population and the safety profile reported together. Important Safety Information accompanies this release.',
    createdAt: at(-95, '09:00'),
    updatedAt: at(-72, '08:00'),
  },
  {
    // Frozen by CRI-003 — a different campaign, a different budget line and a
    // different owner from the launch, and inside the freeze all the same,
    // because the symposium presents the affected product.
    id: 'COM-008',
    subject: 'Congress symposium invitation — EMEA session',
    commsType: 'external',
    status: 'Paused',
    classification: 'Public',
    campaignActivityId: 'ACT-008',
    audienceId: 'AUD-001',
    contentId: 'CNT-008',
    scheduledAt: at(4, '15:00'),
    ownerStakeholderId: 'STK-002',
    body: 'Paused by the war room on the day the signal was declared. The AMER invitation had already gone; the EMEA session invitation is held while the assessment runs, because the session presents the product under review.',
    createdAt: at(-60, '09:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003. Two waves had already gone out before the freeze.
    id: 'COM-009',
    subject: 'Second-line indication is now available',
    commsType: 'external',
    status: 'Paused',
    classification: 'Public',
    campaignActivityId: 'ACT-009',
    audienceId: 'AUD-001',
    contentId: 'CNT-009',
    scheduledAt: at(-8, '08:00'),
    ownerStakeholderId: 'STK-002',
    body: 'The second-line indication is now available. Two waves shipped before the safety signal was declared; the remaining waves are paused and the replacement message is the safety notification, not this one.',
    createdAt: at(-70, '09:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003. Paused rather than killed: the assessment may close
    // without a label change, in which case this ships unchanged.
    id: 'COM-010',
    subject: 'Second-line indication HCP social burst',
    commsType: 'external',
    status: 'Paused',
    classification: 'Public',
    campaignActivityId: 'ACT-010',
    audienceId: 'AUD-001',
    contentId: 'CNT-010',
    scheduledAt: at(14, '09:00'),
    ownerStakeholderId: 'STK-007',
    body: 'Paused by the war room on the day the signal was declared — a launch burst running against an open safety assessment for the same product is the specific failure this freeze exists to prevent.',
    createdAt: at(-50, '09:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003 — and independently stuck at the MLR Legal gate since
    // d(-11). Two reasons, one record, and both are visible.
    id: 'COM-011',
    subject: 'Second-line indication press release',
    commsType: 'external',
    status: 'Paused',
    classification: 'Confidential',
    campaignActivityId: 'ACT-011',
    audienceId: 'AUD-004',
    contentId: 'CNT-011',
    scheduledAt: at(2, '06:00'),
    ownerStakeholderId: 'STK-008',
    createdAt: at(-20, '11:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'COM-012',
    subject: 'Safety signal HCP notification',
    commsType: 'external',
    status: 'Live',
    classification: 'Public',
    campaignActivityId: 'ACT-012',
    audienceId: 'AUD-001',
    contentId: 'CNT-012',
    scheduledAt: at(-4, '09:00'),
    ownerStakeholderId: 'STK-002',
    body: 'Post-marketing surveillance has identified a cluster of reports requiring assessment. This notification states what has been observed, what has not yet been established, and what we are asking prescribers to do while the assessment runs.',
    createdAt: at(-6, '17:00'),
    updatedAt: at(-4, '09:00'),
  },
  {
    id: 'COM-013',
    subject: 'H1 results & pipeline investor statement',
    commsType: 'investor',
    status: 'In Review',
    classification: 'Restricted',
    campaignActivityId: 'ACT-013',
    audienceId: 'AUD-006',
    contentId: 'CNT-013',
    scheduledAt: at(25, '06:00'),
    ownerStakeholderId: 'STK-004',
    body: 'Caldera Therapeutics Group today reported its results for the first half of 2026 alongside a pipeline update. The readout schedule and the evidence boundary are stated in the header of the dataset rather than in a footnote.',
    createdAt: at(-30, '09:00'),
    updatedAt: at(-2, '09:30'),
  },
  {
    id: 'COM-014',
    subject: 'Pipeline summary page publish',
    commsType: 'corporate',
    status: 'Drafting',
    classification: 'Internal',
    campaignActivityId: 'ACT-014',
    audienceId: 'AUD-006',
    contentId: 'CNT-014',
    ownerStakeholderId: 'STK-004',
    createdAt: at(-25, '09:00'),
    updatedAt: at(-9, '10:05'),
  },
  {
    id: 'COM-015',
    subject: 'Vaccines programme evidence pack — current version',
    commsType: 'external',
    status: 'Live',
    classification: 'Internal',
    campaignActivityId: 'ACT-015',
    audienceId: 'AUD-005',
    contentId: 'CNT-015',
    scheduledAt: at(-1, '11:00'),
    ownerStakeholderId: 'STK-007',
    createdAt: at(-150, '09:00'),
    updatedAt: at(-1, '11:00'),
  },
  {
    id: 'COM-016',
    subject: 'Programme partner newsletter — August',
    commsType: 'external',
    status: 'Completed',
    classification: 'Internal',
    campaignActivityId: 'ACT-016',
    audienceId: 'AUD-005',
    contentId: 'CNT-016',
    scheduledAt: at(-16, '09:00'),
    ownerStakeholderId: 'STK-007',
    createdAt: at(-45, '09:00'),
    updatedAt: at(-15, '17:00'),
  },
  {
    id: 'COM-017',
    subject: 'Pharmacist partner newsletter',
    commsType: 'external',
    status: 'Scheduled',
    classification: 'Internal',
    campaignActivityId: 'ACT-017',
    audienceId: 'AUD-003',
    contentId: 'CNT-017',
    scheduledAt: at(46, '08:00'),
    ownerStakeholderId: 'STK-002',
    createdAt: at(-26, '09:00'),
    updatedAt: at(-6, '16:25'),
  },
  {
    id: 'COM-018',
    subject: 'Pharmacist recruitment page publish',
    commsType: 'external',
    status: 'Idea',
    classification: 'Internal',
    campaignActivityId: 'ACT-018',
    audienceId: 'AUD-003',
    contentId: 'CNT-018',
    ownerStakeholderId: 'STK-002',
    createdAt: at(-24, '09:00'),
    updatedAt: at(-5, '09:50'),
  },
  {
    // Frozen by CRI-003 — third campaign, and the one that surprises people:
    // an evidence publication is not promotion in the everyday sense, but it
    // reports on the affected product, so it sits inside the freeze.
    id: 'COM-019',
    subject: 'Real-world evidence hub 2026 report',
    commsType: 'external',
    status: 'Paused',
    classification: 'Public',
    campaignActivityId: 'ACT-019',
    audienceId: 'AUD-002',
    contentId: 'CNT-019',
    scheduledAt: at(-60, '10:00'),
    ownerStakeholderId: 'STK-002',
    body: 'The hub reports outcomes in the treated population with the cohort definitions and the analysis code published in full. Updates are paused while the safety assessment runs; the published report stays available.',
    createdAt: at(-130, '09:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    // Frozen by CRI-003.
    id: 'COM-020',
    subject: 'Real-world evidence hub social kit',
    commsType: 'external',
    status: 'Paused',
    classification: 'Public',
    campaignActivityId: 'ACT-020',
    audienceId: 'AUD-002',
    contentId: 'CNT-020',
    scheduledAt: at(-55, '10:00'),
    ownerStakeholderId: 'STK-002',
    createdAt: at(-120, '09:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'COM-021',
    subject: 'إعلان تعهد الإتاحة — Access pledge announcement',
    commsType: 'corporate',
    status: 'In Review',
    classification: 'Internal',
    campaignActivityId: 'ACT-021',
    audienceId: 'AUD-005',
    contentId: 'CNT-021',
    scheduledAt: at(18, '07:00'),
    ownerStakeholderId: 'STK-008',
    createdAt: at(-70, '09:00'),
    updatedAt: at(-3, '08:30'),
  },
  {
    id: 'COM-022',
    subject: 'Spring wellbeing teaser',
    commsType: 'external',
    status: 'Idea',
    classification: 'Internal',
    campaignActivityId: 'ACT-022',
    audienceId: 'AUD-007',
    contentId: 'CNT-022',
    ownerStakeholderId: 'STK-002',
    createdAt: at(-30, '09:00'),
    updatedAt: at(-12, '09:00'),
  },
  {
    id: 'COM-023',
    subject: 'Summer hydration check-in',
    commsType: 'external',
    status: 'Completed',
    classification: 'Public',
    campaignActivityId: 'ACT-023',
    audienceId: 'AUD-007',
    contentId: 'CNT-023',
    scheduledAt: at(-30, '08:00'),
    ownerStakeholderId: 'STK-002',
    createdAt: at(-140, '09:00'),
    updatedAt: at(-10, '18:00'),
  },
  {
    id: 'COM-024',
    subject: 'Safety signal holding statement',
    commsType: 'corporate',
    status: 'Approved',
    classification: 'Restricted',
    audienceId: 'AUD-004',
    contentId: 'CNT-024',
    ownerStakeholderId: 'STK-004',
    body: 'Post-marketing surveillance has identified a cluster of reports concerning one of our products, now under formal assessment. The regulator has been notified and promotional activity for the product is suspended while the assessment runs.',
    createdAt: at(-6, '15:00'),
    updatedAt: at(-5, '11:20'),
  },
  {
    id: 'COM-025',
    subject: 'Employee brief: safety signal response',
    commsType: 'internal',
    status: 'Live',
    classification: 'Confidential',
    audienceId: 'AUD-008',
    contentId: 'CNT-024',
    scheduledAt: at(-5, '12:00'),
    ownerStakeholderId: 'STK-009',
    body: 'If a customer, a pharmacist or a prescriber asks you about the reports, point them to the safety notification and to Medical Information. Do not speculate about cause, do not comment on the assessment, and forward any adverse event you hear about to pharmacovigilance the same day.',
    createdAt: at(-5, '11:30'),
    updatedAt: at(-4, '17:00'),
  },
  {
    id: 'COM-026',
    subject: 'Vitalis 2025 winter range page',
    commsType: 'external',
    status: 'Archived',
    classification: 'Public',
    audienceId: 'AUD-007',
    contentId: 'CNT-025',
    scheduledAt: at(-420, '08:00'),
    ownerStakeholderId: 'STK-002',
    createdAt: at(-420, '09:00'),
    updatedAt: at(-200, '09:00'),
  },
  {
    id: 'COM-027',
    subject: 'Earlier-line positioning burst',
    commsType: 'external',
    status: 'Killed',
    classification: 'Internal',
    audienceId: 'AUD-001',
    contentId: 'CNT-026',
    ownerStakeholderId: 'STK-002',
    createdAt: at(-52, '09:00'),
    updatedAt: at(-48, '16:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 13. Channel executions                                              */
/*                                                                     */
/* One per content version, so every version is reachable from a       */
/* communication — the second half of the graph-density target.        */
/* CHX-026 is the failed send.                                         */
/* ------------------------------------------------------------------ */

export const channelExecutions: ChannelExecution[] = [
  { id: 'CHX-001', communicationId: 'COM-001', channelId: 'CHN-001', contentVersionId: 'CV-001', scheduledAt: at(32, '08:00'), status: 'draft', createdAt: at(-40, '09:30'), updatedAt: at(-40, '09:30') },
  { id: 'CHX-002', communicationId: 'COM-001', channelId: 'CHN-001', contentVersionId: 'CV-002', scheduledAt: at(32, '08:00'), status: 'draft', createdAt: at(-18, '14:30'), updatedAt: at(-4, '09:05') },
  { id: 'CHX-003', communicationId: 'COM-001', channelId: 'CHN-001', contentVersionId: 'CV-003', scheduledAt: at(34, '08:00'), status: 'draft', createdAt: at(-16, '10:30'), updatedAt: at(-4, '09:05') },
  { id: 'CHX-004', communicationId: 'COM-002', channelId: 'CHN-002', contentVersionId: 'CV-004', status: 'draft', createdAt: at(-38, '10:30'), updatedAt: at(-38, '10:30') },
  { id: 'CHX-005', communicationId: 'COM-002', channelId: 'CHN-002', contentVersionId: 'CV-005', status: 'draft', createdAt: at(-6, '07:05'), updatedAt: at(-6, '07:10') },
  { id: 'CHX-006', communicationId: 'COM-003', channelId: 'CHN-003', contentVersionId: 'CV-006', status: 'draft', createdAt: at(-22, '11:30'), updatedAt: at(-9, '11:00') },
  { id: 'CHX-007', communicationId: 'COM-004', channelId: 'CHN-003', contentVersionId: 'CV-007', status: 'draft', createdAt: at(-110, '09:30'), updatedAt: at(-4, '08:00') },
  { id: 'CHX-008', communicationId: 'COM-004', channelId: 'CHN-003', contentVersionId: 'CV-008', status: 'draft', createdAt: at(-108, '10:30'), updatedAt: at(-4, '08:00') },
  { id: 'CHX-009', communicationId: 'COM-005', channelId: 'CHN-004', contentVersionId: 'CV-009', status: 'draft', createdAt: at(-60, '09:30'), updatedAt: at(-4, '08:05') },
  { id: 'CHX-010', communicationId: 'COM-005', channelId: 'CHN-004', contentVersionId: 'CV-010', status: 'draft', createdAt: at(-58, '10:30'), updatedAt: at(-4, '08:05') },
  { id: 'CHX-011', communicationId: 'COM-006', channelId: 'CHN-003', contentVersionId: 'CV-011', scheduledAt: at(-88, '12:00'), status: 'sent', createdAt: at(-92, '09:00'), updatedAt: at(-88, '12:02') },
  { id: 'CHX-012', communicationId: 'COM-006', channelId: 'CHN-003', contentVersionId: 'CV-012', scheduledAt: at(-72, '08:00'), status: 'sent', createdAt: at(-80, '09:00'), updatedAt: at(-72, '08:03') },
  { id: 'CHX-013', communicationId: 'COM-007', channelId: 'CHN-004', contentVersionId: 'CV-013', scheduledAt: at(-72, '06:00'), status: 'sent', createdAt: at(-80, '09:00'), updatedAt: at(-72, '06:04') },
  // The AMER invitation shipped before the freeze; the EMEA one is queued
  // behind it and will not go while the assessment runs.
  { id: 'CHX-014', communicationId: 'COM-008', channelId: 'CHN-001', contentVersionId: 'CV-014', scheduledAt: at(-30, '15:00'), status: 'sent', createdAt: at(-40, '09:00'), updatedAt: at(-30, '15:02') },
  { id: 'CHX-015', communicationId: 'COM-008', channelId: 'CHN-001', contentVersionId: 'CV-015', scheduledAt: at(4, '15:00'), status: 'queued', createdAt: at(-20, '09:05'), updatedAt: at(-6, '16:20') },
  { id: 'CHX-016', communicationId: 'COM-009', channelId: 'CHN-001', contentVersionId: 'CV-016', scheduledAt: at(-38, '08:00'), status: 'sent', createdAt: at(-44, '09:00'), updatedAt: at(-38, '08:02') },
  { id: 'CHX-017', communicationId: 'COM-009', channelId: 'CHN-001', contentVersionId: 'CV-017', scheduledAt: at(-8, '08:00'), status: 'sent', createdAt: at(-9, '17:00'), updatedAt: at(-8, '08:03') },
  { id: 'CHX-018', communicationId: 'COM-010', channelId: 'CHN-002', contentVersionId: 'CV-018', scheduledAt: at(14, '09:00'), status: 'queued', createdAt: at(-20, '09:00'), updatedAt: at(-6, '16:20') },
  { id: 'CHX-019', communicationId: 'COM-010', channelId: 'CHN-002', contentVersionId: 'CV-019', scheduledAt: at(14, '09:00'), status: 'queued', createdAt: at(-20, '09:05'), updatedAt: at(-6, '16:20') },
  { id: 'CHX-020', communicationId: 'COM-011', channelId: 'CHN-004', contentVersionId: 'CV-020', scheduledAt: at(2, '06:00'), status: 'queued', createdAt: at(-11, '09:15'), updatedAt: at(-6, '16:20') },
  { id: 'CHX-021', communicationId: 'COM-012', channelId: 'CHN-003', contentVersionId: 'CV-021', scheduledAt: at(-4, '09:00'), status: 'sent', createdAt: at(-5, '09:00'), updatedAt: at(-4, '09:02') },
  { id: 'CHX-022', communicationId: 'COM-013', channelId: 'CHN-004', contentVersionId: 'CV-022', scheduledAt: at(25, '06:00'), status: 'draft', createdAt: at(-30, '09:30'), updatedAt: at(-2, '09:30') },
  { id: 'CHX-023', communicationId: 'COM-013', channelId: 'CHN-004', contentVersionId: 'CV-023', scheduledAt: at(25, '06:00'), status: 'draft', createdAt: at(-28, '10:30'), updatedAt: at(-2, '09:30') },
  { id: 'CHX-024', communicationId: 'COM-014', channelId: 'CHN-003', contentVersionId: 'CV-024', status: 'draft', createdAt: at(-25, '09:30'), updatedAt: at(-9, '10:05') },
  // In flight right now: the quarterly refresh of the evidence pack is going
  // out to the EMEA programme list as the demo clock reads.
  { id: 'CHX-025', communicationId: 'COM-015', channelId: 'CHN-001', contentVersionId: 'CV-025', scheduledAt: at(-1, '11:00'), status: 'sending', createdAt: at(-6, '09:00'), updatedAt: at(-1, '11:00') },
  {
    // The failed send. The French evidence pack bounced at the gateway because
    // the localized PDF exceeded the distribution partner's attachment ceiling
    // — a real failure mode, and the reason a failed execution needs a place to
    // be seen rather than a retry that quietly succeeds later.
    id: 'CHX-026',
    communicationId: 'COM-015',
    channelId: 'CHN-001',
    contentVersionId: 'CV-026',
    scheduledAt: at(-19, '11:00'),
    status: 'failed',
    createdAt: at(-25, '09:05'),
    updatedAt: at(-19, '11:04'),
  },
  { id: 'CHX-027', communicationId: 'COM-016', channelId: 'CHN-001', contentVersionId: 'CV-027', scheduledAt: at(-16, '09:00'), status: 'sent', createdAt: at(-20, '09:00'), updatedAt: at(-16, '09:02') },
  { id: 'CHX-028', communicationId: 'COM-017', channelId: 'CHN-001', contentVersionId: 'CV-028', scheduledAt: at(46, '08:00'), status: 'queued', createdAt: at(-12, '09:00'), updatedAt: at(-6, '16:25') },
  { id: 'CHX-029', communicationId: 'COM-018', channelId: 'CHN-003', contentVersionId: 'CV-029', status: 'draft', createdAt: at(-24, '09:30'), updatedAt: at(-5, '09:50') },
  { id: 'CHX-030', communicationId: 'COM-019', channelId: 'CHN-003', contentVersionId: 'CV-030', scheduledAt: at(-60, '10:00'), status: 'sent', createdAt: at(-66, '09:00'), updatedAt: at(-60, '10:02') },
  { id: 'CHX-031', communicationId: 'COM-019', channelId: 'CHN-003', contentVersionId: 'CV-031', scheduledAt: at(-58, '10:00'), status: 'sent', createdAt: at(-66, '09:05'), updatedAt: at(-58, '10:02') },
  { id: 'CHX-032', communicationId: 'COM-020', channelId: 'CHN-002', contentVersionId: 'CV-032', scheduledAt: at(-55, '10:00'), status: 'sent', createdAt: at(-60, '09:00'), updatedAt: at(-55, '10:02') },
  { id: 'CHX-033', communicationId: 'COM-021', channelId: 'CHN-004', contentVersionId: 'CV-033', scheduledAt: at(18, '07:00'), status: 'draft', createdAt: at(-70, '09:30'), updatedAt: at(-3, '08:30') },
  { id: 'CHX-034', communicationId: 'COM-021', channelId: 'CHN-004', contentVersionId: 'CV-034', scheduledAt: at(18, '07:00'), status: 'draft', createdAt: at(-68, '10:30'), updatedAt: at(-3, '08:30') },
  { id: 'CHX-035', communicationId: 'COM-022', channelId: 'CHN-002', contentVersionId: 'CV-035', status: 'draft', createdAt: at(-30, '09:30'), updatedAt: at(-12, '09:00') },
  { id: 'CHX-036', communicationId: 'COM-023', channelId: 'CHN-001', contentVersionId: 'CV-036', scheduledAt: at(-30, '08:00'), status: 'sent', createdAt: at(-36, '09:00'), updatedAt: at(-30, '08:02') },
  { id: 'CHX-037', communicationId: 'COM-024', channelId: 'CHN-004', contentVersionId: 'CV-037', status: 'queued', createdAt: at(-5, '11:30'), updatedAt: at(-5, '11:30') },
  { id: 'CHX-038', communicationId: 'COM-025', channelId: 'CHN-005', contentVersionId: 'CV-038', scheduledAt: at(-5, '12:00'), status: 'sent', createdAt: at(-5, '11:40'), updatedAt: at(-5, '12:01') },
  { id: 'CHX-039', communicationId: 'COM-026', channelId: 'CHN-003', contentVersionId: 'CV-039', scheduledAt: at(-420, '08:00'), status: 'sent', createdAt: at(-420, '07:30'), updatedAt: at(-420, '08:02') },
  { id: 'CHX-040', communicationId: 'COM-027', channelId: 'CHN-002', contentVersionId: 'CV-040', status: 'draft', createdAt: at(-52, '09:30'), updatedAt: at(-48, '16:00') },
];

/* ------------------------------------------------------------------ */
/* 14. Workflows — the MLR review chain                                */
/*                                                                     */
/* Every shared workflow is carried through unchanged. WF-006 is added */
/* on top because Medical/Legal/Regulatory review is a pharmaceutical  */
/* workflow rather than a product-invariant one.                       */
/*                                                                     */
/* Non-waivability is expressed in the data three ways at once,        */
/* because a boolean flag on a stage would be a label rather than a    */
/* rule:                                                               */
/*                                                                     */
/*  1. All three review stages are owned by `Legal/Compliance          */
/*     Reviewer`. No marketing role appears anywhere in WF-006, so     */
/*     there is no seat from which a marketer could clear a stage.     */
/*  2. Every approval recorded against WFS-019/020/021 was decided by  */
/*     one of the three independent reviewers (STK-012 Medical,        */
/*     STK-003 Legal, STK-013 Regulatory) and by nobody else.          */
/*  3. No WF-004 exception-approval record exists against any WF-006   */
/*     stage. The waiver path that exists for other workflows was      */
/*     never opened here, which is what "no override" means when it is */
/*     a fact about the ledger rather than a claim in a tooltip.       */
/*                                                                     */
/* POL-011 states the rule in words; this is the shape that enforces   */
/* it. `lifesciences.test.ts` checks all three.                        */
/* ------------------------------------------------------------------ */

const MLR_WF_CREATED = at(-400, '09:25');

/**
 * MLR review: Brand AI pre-check → Medical → Legal → Regulatory.
 *
 * `slaHours` is the sum of the four stage SLAs (2 + 48 + 48 + 72), not a
 * separate ceiling — the chain is sequential, so the workflow can be no faster
 * than its stages and claiming otherwise would put a number on screen that no
 * stage could deliver.
 */
export const MLR_WORKFLOW: Workflow = {
  id: 'WF-006',
  name: 'MLR review (Medical · Legal · Regulatory)',
  appliesTo: 'Content',
  version: 1,
  stageIds: ['WFS-018', 'WFS-019', 'WFS-020', 'WFS-021'],
  slaHours: 170,
  createdAt: MLR_WF_CREATED,
  updatedAt: MLR_WF_CREATED,
};

export const MLR_WORKFLOW_STAGES: readonly WorkflowStage[] = Object.freeze([
  {
    // The only automated gate in the chain. It does not clear anything: it
    // catches the mechanical failures — missing safety information, a
    // superseded ISI block, an absent adverse-event contact — before three
    // reviewers spend a week each finding the same thing.
    id: 'WFS-018',
    workflowId: 'WF-006',
    order: 1,
    name: 'Brand AI pre-check',
    mode: 'sequential',
    assigneeRole: 'Brand Manager',
    slaHours: 2,
    automation: 'brand-ai',
    createdAt: MLR_WF_CREATED,
    updatedAt: MLR_WF_CREATED,
  },
  {
    // Medical Affairs. Owns the question of whether the data says what the
    // copy says it says. Held by STK-012, who reports outside marketing.
    id: 'WFS-019',
    workflowId: 'WF-006',
    order: 2,
    name: 'Medical review',
    mode: 'sequential',
    assigneeRole: 'Legal/Compliance Reviewer',
    slaHours: 48,
    automation: null,
    createdAt: MLR_WF_CREATED,
    updatedAt: MLR_WF_CREATED,
  },
  {
    // Legal counsel. Owns fair balance, the prescribing-information route and
    // the off-label prohibition. This is the stage CNT-011 is stuck at.
    id: 'WFS-020',
    workflowId: 'WF-006',
    order: 3,
    name: 'Legal review',
    mode: 'sequential',
    assigneeRole: 'Legal/Compliance Reviewer',
    slaHours: 48,
    automation: null,
    createdAt: MLR_WF_CREATED,
    updatedAt: MLR_WF_CREATED,
  },
  {
    // Regulatory Affairs. Owns the local label, the market registration and
    // the indication as approved in the market the piece reaches. Longest SLA
    // in the chain because the answer often depends on a market authority.
    id: 'WFS-021',
    workflowId: 'WF-006',
    order: 4,
    name: 'Regulatory review',
    mode: 'sequential',
    assigneeRole: 'Legal/Compliance Reviewer',
    slaHours: 72,
    automation: null,
    createdAt: MLR_WF_CREATED,
    updatedAt: MLR_WF_CREATED,
  },
]);

export const workflows: Workflow[] = [...sharedWorkflows, MLR_WORKFLOW];
export const workflowStages: WorkflowStage[] = [
  ...sharedWorkflowStages,
  ...MLR_WORKFLOW_STAGES,
];

/** The three gates no marketing role may clear, waive, shorten or reorder. */
export const MLR_NON_WAIVABLE_STAGE_IDS: readonly string[] = Object.freeze([
  'WFS-019',
  'WFS-020',
  'WFS-021',
]);

/* ------------------------------------------------------------------ */
/* 15. Approvals                                                       */
/*                                                                     */
/* The governance ledger. Four things live here that nothing else in   */
/* the pack can express:                                               */
/*                                                                     */
/*  - APR-005: a launch rejected on a non-waivable regulatory failure. */
/*  - APR-029..032: an MLR chain cleared end to end, one decision per  */
/*    gate, each by a different independent reviewer.                  */
/*  - APR-033..035: the same chain stalled. Medical cleared it,        */
/*    Legal has held it 48 hours past its SLA, Regulatory has not      */
/*    seen it, and nobody in marketing can do anything about that.     */
/*  - APR-004 / 006 / 010 / 037: open decisions past their SLA, which  */
/*    is what a blocked activity looks like from the reviewer's side.  */
/*                                                                     */
/* All eight ApprovalStatus values appear.                             */
/* ------------------------------------------------------------------ */

export const approvals: Approval[] = [
  /* --- Brief sign-off (WF-002 stage 1, the CMO) -------------------- */
  {
    id: 'APR-001',
    subjectEntity: 'Brief',
    subjectId: 'BRF-003',
    workflowStageId: 'WFS-004',
    approverStakeholderId: 'STK-001',
    status: 'Approved',
    slaDueAt: at(-91, '17:00'),
    decidedAt: at(-90, '10:05'),
    comment:
      'Leading the symposium programme on the endpoint and the analysis population rather than on the interpretation is the right call. Approved.',
    createdAt: at(-93, '09:00'),
    updatedAt: at(-90, '10:05'),
  },
  {
    id: 'APR-002',
    subjectEntity: 'Brief',
    subjectId: 'BRF-002',
    workflowStageId: 'WFS-004',
    approverStakeholderId: 'STK-001',
    status: 'Approved',
    slaDueAt: at(-99, '17:00'),
    decidedAt: at(-100, '15:20'),
    createdAt: at(-102, '09:00'),
    updatedAt: at(-100, '15:20'),
  },
  {
    id: 'APR-003',
    subjectEntity: 'Brief',
    subjectId: 'BRF-004',
    workflowStageId: 'WFS-004',
    approverStakeholderId: 'STK-001',
    status: 'Approved',
    slaDueAt: at(-69, '17:00'),
    decidedAt: at(-70, '10:05'),
    comment:
      'Written for oncologists already treating in the indication rather than for a general list. Go — and the MLR chain runs in full on every piece under it.',
    createdAt: at(-72, '09:00'),
    updatedAt: at(-70, '10:05'),
  },

  /* --- The two blocked activities, from the reviewer's side --------- */
  {
    // The conditional-override failure. A Vitalis social cut named a
    // prescription product, which takes the piece out of POL-005's
    // over-the-counter scope and puts the parent rule POL-001 over the whole
    // of it. Due five days ago and still open — breached.
    id: 'APR-004',
    subjectEntity: 'CampaignActivity',
    subjectId: 'ACT-002',
    workflowStageId: 'WFS-006',
    approverStakeholderId: 'STK-003',
    status: 'Changes Requested',
    slaDueAt: at(-5, '17:00'),
    comment:
      'The social cut names a prescription product inside Vitalis consumer copy. That takes the piece outside POL-005, which is scoped to the over-the-counter register, and the Caldera group rule POL-001 governs the whole piece instead — clinical reference, fair balance and the adverse-event contact included. The consumer substantiation standard does not partially apply: it does not apply. I cannot clear this activity while the prescription mention stands.',
    createdAt: at(-9, '09:00'),
    updatedAt: at(-6, '07:10'),
  },
  {
    // The non-waivable legal failure blocking a launch.
    id: 'APR-005',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-002',
    workflowStageId: 'WFS-005',
    approverStakeholderId: 'STK-003',
    status: 'Rejected',
    slaDueAt: at(-12, '17:00'),
    decidedAt: at(-11, '16:40'),
    comment:
      'The credentials pack is promotional material distributed in the Kingdom and carries no Saudi Food and Drug Authority registration number. POL-009 and LGL-013 both require the number and its issue date on the piece, and neither is waivable — material distributed ahead of its registration is a regulatory exposure, not a presentational one. There is no sign-off I can give in the meantime and no marketing decision that changes it. Produce the number or withdraw the pack.',
    createdAt: at(-14, '09:00'),
    updatedAt: at(-11, '16:40'),
  },
  {
    id: 'APR-006',
    subjectEntity: 'CampaignActivity',
    subjectId: 'ACT-004',
    workflowStageId: 'WFS-006',
    approverStakeholderId: 'STK-003',
    status: 'Escalated',
    // Due three days ago and still open — breached.
    slaDueAt: at(-3, '17:00'),
    comment:
      'Escalated to the CMO: the suppliers conference is four weeks out and the registration application has not been filed. This is a programme decision now, not a review decision.',
    createdAt: at(-10, '09:00'),
    updatedAt: at(-4, '08:00'),
  },

  /* --- Remaining brief sign-offs ----------------------------------- */
  {
    id: 'APR-007',
    subjectEntity: 'Brief',
    subjectId: 'BRF-006',
    workflowStageId: 'WFS-004',
    approverStakeholderId: 'STK-001',
    status: 'Approved',
    slaDueAt: at(-169, '17:00'),
    decidedAt: at(-170, '11:00'),
    createdAt: at(-172, '09:00'),
    updatedAt: at(-170, '11:00'),
  },
  {
    id: 'APR-008',
    subjectEntity: 'Brief',
    subjectId: 'BRF-008',
    workflowStageId: 'WFS-004',
    approverStakeholderId: 'STK-001',
    status: 'Approved',
    slaDueAt: at(-124, '17:00'),
    decidedAt: at(-125, '09:00'),
    comment: 'Publishing the evidence and the method behind it is the whole idea. Approved.',
    createdAt: at(-127, '09:00'),
    updatedAt: at(-125, '09:00'),
  },

  /* --- Standard content review (WF-001) ---------------------------- */
  {
    id: 'APR-009',
    subjectEntity: 'Content',
    subjectId: 'CNT-001',
    subjectVersionId: 'CV-002',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'In Review',
    slaDueAt: at(2, '17:00'),
    createdAt: at(-18, '14:35'),
    updatedAt: at(-4, '09:05'),
  },
  {
    // The Rework case, at content level. Same finding as APR-004, recorded
    // against the piece rather than the activity. Breached.
    id: 'APR-010',
    subjectEntity: 'Content',
    subjectId: 'CNT-002',
    subjectVersionId: 'CV-005',
    workflowStageId: 'WFS-001',
    approverStakeholderId: 'STK-006',
    status: 'Changes Requested',
    slaDueAt: at(-4, '17:00'),
    comment:
      'Returned to Rework. The refined cut drops the prescription product name, which restores POL-005 scope, but the substantiation line still reads "clinically proven" without naming the study, the population or the duration. The consumer standard is a lower bar than the clinical one; it is not an absent one.',
    createdAt: at(-6, '07:05'),
    updatedAt: at(-6, '07:10'),
  },
  {
    id: 'APR-011',
    subjectEntity: 'Content',
    subjectId: 'CNT-006',
    subjectVersionId: 'CV-012',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-86, '17:00'),
    decidedAt: at(-88, '11:00'),
    comment:
      'Endpoint, population and pre-specification status all stated before any interpretation, and no comparative construction anywhere. Approved.',
    createdAt: at(-90, '09:00'),
    updatedAt: at(-88, '11:00'),
  },
  {
    id: 'APR-012',
    subjectEntity: 'Content',
    subjectId: 'CNT-007',
    subjectVersionId: 'CV-013',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-72, '17:00'),
    decidedAt: at(-74, '10:30'),
    createdAt: at(-76, '09:00'),
    updatedAt: at(-74, '10:30'),
  },
  {
    id: 'APR-013',
    subjectEntity: 'Content',
    subjectId: 'CNT-008',
    subjectVersionId: 'CV-014',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-56, '17:00'),
    decidedAt: at(-58, '15:00'),
    createdAt: at(-60, '09:10'),
    updatedAt: at(-58, '15:00'),
  },
  {
    id: 'APR-014',
    subjectEntity: 'Content',
    subjectId: 'CNT-012',
    subjectVersionId: 'CV-021',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-4, '17:00'),
    decidedAt: at(-4, '08:30'),
    comment:
      'Carries the v8 safety block, states what has not been established as plainly as what has, and asks prescribers to report through their national system. Approved.',
    createdAt: at(-6, '17:10'),
    updatedAt: at(-4, '08:30'),
  },
  {
    // The 'Requested' state: raised, nobody has opened it yet.
    id: 'APR-015',
    subjectEntity: 'Content',
    subjectId: 'CNT-013',
    subjectVersionId: 'CV-022',
    workflowStageId: 'WFS-010',
    approverStakeholderId: 'STK-005',
    status: 'Requested',
    slaDueAt: at(1, '12:00'),
    createdAt: at(-2, '09:30'),
    updatedAt: at(-2, '09:30'),
  },
  {
    id: 'APR-016',
    subjectEntity: 'Content',
    subjectId: 'CNT-015',
    subjectVersionId: 'CV-025',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-146, '17:00'),
    decidedAt: at(-148, '11:00'),
    createdAt: at(-150, '09:10'),
    updatedAt: at(-148, '11:00'),
  },
  {
    id: 'APR-017',
    subjectEntity: 'Content',
    subjectId: 'CNT-016',
    subjectVersionId: 'CV-027',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-42, '17:00'),
    decidedAt: at(-44, '11:00'),
    createdAt: at(-45, '09:10'),
    updatedAt: at(-44, '11:00'),
  },
  {
    id: 'APR-018',
    subjectEntity: 'Content',
    subjectId: 'CNT-017',
    subjectVersionId: 'CV-028',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-23, '17:00'),
    decidedAt: at(-25, '14:00'),
    comment:
      'Every claim on the counter card names the register wording it is made under. That is the whole reason a pharmacist will repeat it. Approved.',
    createdAt: at(-26, '09:10'),
    updatedAt: at(-25, '14:00'),
  },
  {
    id: 'APR-019',
    subjectEntity: 'Content',
    subjectId: 'CNT-019',
    subjectVersionId: 'CV-030',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-126, '17:00'),
    decidedAt: at(-128, '10:00'),
    createdAt: at(-130, '09:10'),
    updatedAt: at(-128, '10:00'),
  },
  {
    id: 'APR-020',
    subjectEntity: 'Content',
    subjectId: 'CNT-020',
    subjectVersionId: 'CV-032',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-116, '17:00'),
    decidedAt: at(-118, '10:00'),
    createdAt: at(-120, '09:10'),
    updatedAt: at(-118, '10:00'),
  },
  {
    // The Arabic pledge announcement, open at the comms director stage. The
    // Arabic version is the one under review because in the Kingdom the
    // Arabic text governs and the English is derived from it.
    id: 'APR-021',
    subjectEntity: 'Content',
    subjectId: 'CNT-021',
    subjectVersionId: 'CV-033',
    workflowStageId: 'WFS-009',
    approverStakeholderId: 'STK-004',
    status: 'In Review',
    slaDueAt: at(1, '17:00'),
    createdAt: at(-3, '08:35'),
    updatedAt: at(-3, '09:00'),
  },
  {
    id: 'APR-022',
    subjectEntity: 'Content',
    subjectId: 'CNT-023',
    subjectVersionId: 'CV-036',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-136, '17:00'),
    decidedAt: at(-138, '10:00'),
    createdAt: at(-140, '09:10'),
    updatedAt: at(-138, '10:00'),
  },
  {
    // Crisis clearance: 22 minutes against a 30-minute SLA, on authority
    // pre-delegated to the crisis lead for the duration of the incident.
    id: 'APR-023',
    subjectEntity: 'Content',
    subjectId: 'CNT-024',
    subjectVersionId: 'CV-037',
    workflowStageId: 'WFS-016',
    approverStakeholderId: 'STK-004',
    status: 'Approved',
    slaDueAt: at(-6, '15:35'),
    decidedAt: at(-6, '15:27'),
    comment:
      'Cleared for holding. It states what has been observed and what has not been established, names no cause, and commits to nothing the assessment has not concluded.',
    createdAt: at(-6, '15:05'),
    updatedAt: at(-6, '15:27'),
  },

  /* --- MLR chain: CNT-010, cleared ---------------------------------- */
  {
    id: 'APR-024',
    subjectEntity: 'Content',
    subjectId: 'CNT-010',
    subjectVersionId: 'CV-018',
    workflowStageId: 'WFS-019',
    approverStakeholderId: 'STK-012',
    status: 'Approved',
    slaDueAt: at(-16, '09:00'),
    decidedAt: at(-17, '11:00'),
    comment:
      'The social variant states the endpoint, the population and the safety table together, and the 280-character limit has not been used as a reason to drop the safety half. Medical clear.',
    createdAt: at(-18, '09:00'),
    updatedAt: at(-17, '11:00'),
  },
  {
    id: 'APR-025',
    subjectEntity: 'Content',
    subjectId: 'CNT-010',
    subjectVersionId: 'CV-018',
    workflowStageId: 'WFS-020',
    approverStakeholderId: 'STK-003',
    status: 'Approved',
    slaDueAt: at(-15, '11:05'),
    decidedAt: at(-16, '14:00'),
    comment:
      'Fair balance holds at social length, the prescribing information is one click away and the adverse-event contact is on the landing destination. Legal clear.',
    createdAt: at(-17, '11:05'),
    updatedAt: at(-16, '14:00'),
  },

  /* --- The KSA credentials pack, rejected on the same finding ------- */
  {
    id: 'APR-026',
    subjectEntity: 'Content',
    subjectId: 'CNT-004',
    subjectVersionId: 'CV-007',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Rejected',
    slaDueAt: at(-12, '17:00'),
    decidedAt: at(-11, '16:45'),
    comment:
      'Rejected at the brand gate on Legal\'s finding, in both governing versions: no SFDA registration number on promotional material bound for the Kingdom (POL-009, LGL-013). This is not the brand gate\'s to waive and it is not mine to schedule around.',
    createdAt: at(-14, '09:05'),
    updatedAt: at(-11, '16:45'),
  },

  /* --- Withdrawn and Expired --------------------------------------- */
  {
    // Withdrawn rather than rejected: the H1 results date moved, so the
    // pipeline page went back to the author before anyone had to decide on it.
    id: 'APR-027',
    subjectEntity: 'Content',
    subjectId: 'CNT-014',
    subjectVersionId: 'CV-024',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Withdrawn',
    slaDueAt: at(-22, '17:00'),
    decidedAt: at(-23, '10:00'),
    comment:
      'Withdrawn by the author: the results date moved and the pipeline figures on this version will not be the ones published. Re-raise against the version that carries the final numbers.',
    createdAt: at(-25, '09:10'),
    updatedAt: at(-23, '10:00'),
  },
  {
    // Expired rather than approved-by-default. Nobody decided, the window
    // closed, and the request lapsed — which is the honest outcome and the
    // one the taxonomy has a word for.
    id: 'APR-028',
    subjectEntity: 'Content',
    subjectId: 'CNT-018',
    subjectVersionId: 'CV-029',
    workflowStageId: 'WFS-003',
    approverStakeholderId: 'STK-006',
    status: 'Expired',
    slaDueAt: at(-20, '17:00'),
    comment:
      'Lapsed unread when the pharmacist partner drive was deferred to next quarter. An expired request is not an approval and the page cannot publish on it.',
    createdAt: at(-24, '09:10'),
    updatedAt: at(-20, '17:00'),
  },

  /* --- MLR chain: CNT-009, cleared end to end ----------------------- */
  /* Four gates, four decisions, four different people. This is the      */
  /* screen the pack exists to show.                                     */
  {
    id: 'APR-029',
    subjectEntity: 'Content',
    subjectId: 'CNT-009',
    subjectVersionId: 'CV-017',
    workflowStageId: 'WFS-018',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-13, '11:00'),
    decidedAt: at(-13, '09:20'),
    comment:
      'Pre-check pass on the re-versioned email: safety block resolves to the current LGL-002 wording (AST-018, v8), prescribing information reachable in one click, adverse-event contact present. Nothing here clears the piece — it clears the three reviewers of finding the same four things.',
    createdAt: at(-13, '09:00'),
    updatedAt: at(-13, '09:20'),
  },
  {
    id: 'APR-030',
    subjectEntity: 'Content',
    subjectId: 'CNT-009',
    subjectVersionId: 'CV-017',
    workflowStageId: 'WFS-019',
    approverStakeholderId: 'STK-012',
    status: 'Approved',
    slaDueAt: at(-11, '09:25'),
    decidedAt: at(-12, '11:00'),
    comment:
      'Every efficacy statement traces to the pre-specified analysis, the hazard ratio carries its confidence interval and median follow-up, and the subgroup line is labelled post-hoc rather than presented as a finding. Medical clear.',
    createdAt: at(-13, '09:25'),
    updatedAt: at(-12, '11:00'),
  },
  {
    id: 'APR-031',
    subjectEntity: 'Content',
    subjectId: 'CNT-009',
    subjectVersionId: 'CV-017',
    workflowStageId: 'WFS-020',
    approverStakeholderId: 'STK-003',
    status: 'Approved',
    slaDueAt: at(-10, '11:05'),
    decidedAt: at(-11, '15:40'),
    comment:
      'Fair balance sits in the same reading order and type class as the efficacy message, not below a fold or behind an interaction. No construction here reaches outside the authorised label. Legal clear.',
    createdAt: at(-12, '11:05'),
    updatedAt: at(-11, '15:40'),
  },
  {
    id: 'APR-032',
    subjectEntity: 'Content',
    subjectId: 'CNT-009',
    subjectVersionId: 'CV-017',
    workflowStageId: 'WFS-021',
    approverStakeholderId: 'STK-013',
    status: 'Approved',
    slaDueAt: at(-8, '15:45'),
    decidedAt: at(-9, '16:10'),
    comment:
      'Indication as authorised in each market the email reaches, not the global wording. Regulatory clear — the piece may publish.',
    createdAt: at(-11, '15:45'),
    updatedAt: at(-9, '16:10'),
  },

  /* --- MLR chain: CNT-011, stalled at Legal ------------------------- */
  /* The showcase. Medical cleared it inside SLA. Legal has held it      */
  /* since d(-11) against a 48-hour clock that expired on d(-9).         */
  /* Regulatory has not seen it and cannot: the chain is sequential.     */
  /* The press release has a launch date and that changes nothing —      */
  /* POL-011 makes all three gates non-waivable and no marketing role,   */
  /* the CMO included, appears anywhere in this chain.                   */
  {
    id: 'APR-033',
    subjectEntity: 'Content',
    subjectId: 'CNT-011',
    subjectVersionId: 'CV-020',
    workflowStageId: 'WFS-018',
    approverStakeholderId: 'STK-006',
    status: 'Approved',
    slaDueAt: at(-13, '10:00'),
    decidedAt: at(-13, '08:20'),
    comment:
      'Pre-check pass with one warning carried forward for Legal: the release embeds AST-008, whose rights lapsed on d(-13). The gate does not block on a rights warning, so it is passed on rather than swallowed.',
    createdAt: at(-13, '08:00'),
    updatedAt: at(-13, '08:20'),
  },
  {
    id: 'APR-034',
    subjectEntity: 'Content',
    subjectId: 'CNT-011',
    subjectVersionId: 'CV-020',
    workflowStageId: 'WFS-019',
    approverStakeholderId: 'STK-012',
    status: 'Approved',
    slaDueAt: at(-11, '08:25'),
    decidedAt: at(-12, '16:30'),
    comment:
      'Data statements match the presented analysis and the investigator quote is attributed with the relationship to the study stated. Medical clear.',
    createdAt: at(-13, '08:25'),
    updatedAt: at(-12, '16:30'),
  },
  {
    // Open, undecided, and 48 hours past its SLA. This is the record the
    // whole pack points at.
    id: 'APR-035',
    subjectEntity: 'Content',
    subjectId: 'CNT-011',
    subjectVersionId: 'CV-020',
    workflowStageId: 'WFS-020',
    approverStakeholderId: 'STK-003',
    status: 'In Review',
    slaDueAt: at(-9, '09:00'),
    comment:
      'Held. Two things are open and neither is mine to decide alone: the release still embeds AST-008, a congress portrait set whose model releases lapsed on d(-13), and the safety-signal assessment opened on d(-6) may change what may be said about this product at all. I am not clearing a launch release into an open assessment, and there is no waiver route here — POL-011 leaves no stage that a launch date can move.',
    createdAt: at(-11, '09:00'),
    updatedAt: at(-9, '09:05'),
  },
  {
    id: 'APR-036',
    subjectEntity: 'Content',
    subjectId: 'CNT-010',
    subjectVersionId: 'CV-018',
    workflowStageId: 'WFS-021',
    approverStakeholderId: 'STK-013',
    status: 'Approved',
    slaDueAt: at(-13, '14:05'),
    decidedAt: at(-14, '16:15'),
    comment:
      'UK variant carries the EMEA restriction on addressing prescription-only material to the general public, and the indication is the local one. Regulatory clear.',
    createdAt: at(-16, '14:05'),
    updatedAt: at(-14, '16:15'),
  },

  /* --- The ISI supersession block ---------------------------------- */
  {
    // The third breached decision, and the one that makes the v7 → v8 change
    // visible as a blocker rather than a housekeeping note.
    id: 'APR-037',
    subjectEntity: 'CampaignActivity',
    subjectId: 'ACT-019',
    workflowStageId: 'WFS-006',
    approverStakeholderId: 'STK-003',
    status: 'Changes Requested',
    slaDueAt: at(-8, '17:00'),
    comment:
      'The hub report still embeds AST-003, the v7 safety block, which LGL-002 superseded on d(-12). POL-007 treats a superseded version as absent, so the report is currently published without Important Safety Information as far as the rule is concerned. Re-version onto AST-018 before this activity moves again — and the same finding applies to every other piece still carrying v7.',
    createdAt: at(-12, '09:30'),
    updatedAt: at(-8, '17:05'),
  },

  /* --- Campaign gates still open ----------------------------------- */
  {
    id: 'APR-038',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-001',
    workflowStageId: 'WFS-006',
    approverStakeholderId: 'STK-006',
    status: 'In Review',
    slaDueAt: at(2, '17:00'),
    createdAt: at(-7, '11:15'),
    updatedAt: at(-1, '08:00'),
  },
  {
    id: 'APR-039',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-009',
    workflowStageId: 'WFS-005',
    approverStakeholderId: 'STK-003',
    status: 'In Review',
    slaDueAt: at(1, '17:00'),
    createdAt: at(-6, '08:30'),
    updatedAt: at(-2, '08:30'),
  },
];

/* ------------------------------------------------------------------ */
/* 16. Crisis incidents                                                */
/*                                                                     */
/* CRI-003 is the reason this pack freezes differently from the        */
/* others. The scope of the freeze is a *product*, not a campaign: the */
/* signal concerns one medicine, so every promotional send that names  */
/* it stops, wherever it sits. That is six communications across three */
/* campaigns and two paused campaigns — a shape a per-campaign freeze  */
/* switch cannot express.                                              */
/* ------------------------------------------------------------------ */

export const crisisIncidents: CrisisIncident[] = [
  {
    id: 'CRI-003',
    title: 'Adverse event signal cluster — post-marketing surveillance',
    severity: 'High',
    status: 'Active',
    classification: 'Restricted',
    summary:
      'Routine post-marketing surveillance flagged a cluster of reports concerning the Caldera Oncology product under the second-line indication, at a rate above the background expectation for the population. The signal is under formal assessment; nothing has been established about cause. The regulator was notified the same day and all promotional activity for the affected product is suspended for the duration — not the campaign that happened to be live, the product. Six sends are frozen across three campaigns: the congress symposium invitation programme, both second-line launch sends, the second-line press release and both real-world evidence hub sends. Two campaigns are paused outright. A holding statement (CNT-024) cleared the crisis workflow in 22 minutes against a 30-minute SLA and is held pending a publication decision; the HCP safety notification (CNT-012) has published. The war room runs on WF-005: parallel clearance, authority pre-delegated to the crisis lead.',
    holdingStatementContentId: 'CNT-024',
    warRoomStakeholderIds: ['STK-004', 'STK-012', 'STK-003', 'STK-013', 'STK-001'],
    affectedBrandIds: ['BRD-002'],
    affectedRegionIds: ['REG-AMER', 'REG-EMEA', 'REG-APAC'],
    declaredAt: at(-6, '14:00'),
    createdAt: at(-6, '14:00'),
    updatedAt: at(-4, '09:15'),
  },
  {
    id: 'CRI-004',
    title: 'Cold-chain excursion at the Gulf distribution hub',
    severity: 'Medium',
    status: 'Resolved',
    classification: 'Confidential',
    summary:
      'A temperature excursion was logged on one pallet in transit to a Gulf distribution hub. The affected lot was quarantined before release, quality assurance confirmed no product had reached a vaccination site, and the programme office was informed the same afternoon in Arabic and English. Two enquiries from trade press were answered with a reactive statement. Closed three days after declaration. Retained for the archive because the reactive wording — what was quarantined, what never shipped, who was told and when — is the precedent for the next one.',
    warRoomStakeholderIds: ['STK-004', 'STK-008'],
    affectedBrandIds: ['BRD-003'],
    affectedRegionIds: ['REG-MENA'],
    declaredAt: at(-58, '07:30'),
    resolvedAt: at(-55, '16:00'),
    createdAt: at(-58, '07:30'),
    updatedAt: at(-55, '16:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 17. Journeys                                                        */
/* ------------------------------------------------------------------ */

export const journeys: Journey[] = [
  {
    // Paused by CRI-003 rather than by a person. The send node it would have
    // reached next is one of the six frozen communications.
    id: 'JRN-001',
    name: 'Second-line indication HCP nurture',
    audienceId: 'AUD-001',
    status: 'Paused',
    version: 3,
    nodes: [
      { id: 'N-01', type: 'trigger', label: 'Oncologist opens the second-line data summary' },
      {
        id: 'N-02',
        type: 'audience',
        label: 'Treating oncologists in the indication',
        config: { audienceId: 'AUD-001', segmentId: 'SEG-001' },
      },
      {
        id: 'N-03',
        type: 'send',
        label: 'Send the second-line HCP email (frozen)',
        config: { communicationId: 'COM-009' },
      },
      { id: 'N-04', type: 'wait', label: 'Wait 5 days', config: { waitDays: 5 } },
      { id: 'N-05', type: 'condition', label: 'Opened?', config: { condition: 'opened' } },
      { id: 'N-06', type: 'branch', label: 'Opened / not opened', config: { splitPct: 50 } },
      {
        id: 'N-07',
        type: 'send',
        label: 'HCP social retargeting burst (frozen)',
        config: { communicationId: 'COM-010' },
      },
      { id: 'N-08', type: 'exit', label: 'Exit journey' },
    ],
    edges: [
      { from: 'N-01', to: 'N-02' },
      { from: 'N-02', to: 'N-03' },
      { from: 'N-03', to: 'N-04' },
      { from: 'N-04', to: 'N-05' },
      { from: 'N-05', to: 'N-06', label: 'evaluated' },
      { from: 'N-06', to: 'N-07', label: 'opened' },
      { from: 'N-06', to: 'N-08', label: 'not opened' },
      { from: 'N-07', to: 'N-08' },
    ],
    createdAt: at(-83, '09:00'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'JRN-002',
    name: 'Congress symposium follow-up',
    audienceId: 'AUD-001',
    status: 'Active',
    version: 1,
    nodes: [
      { id: 'N-01', type: 'trigger', label: 'Symposium registration confirmed' },
      {
        id: 'N-02',
        type: 'audience',
        label: 'Treating oncologists',
        config: { audienceId: 'AUD-001', segmentId: 'SEG-001' },
      },
      {
        id: 'N-03',
        type: 'send',
        label: 'Send the symposium invitation',
        config: { communicationId: 'COM-008' },
      },
      { id: 'N-04', type: 'wait', label: 'Wait 3 days', config: { waitDays: 3 } },
      { id: 'N-05', type: 'condition', label: 'Attended?', config: { condition: 'attended' } },
      {
        id: 'N-06',
        type: 'send',
        label: 'Send the abstract summary',
        config: { communicationId: 'COM-006' },
      },
      { id: 'N-07', type: 'exit', label: 'Exit journey' },
    ],
    edges: [
      { from: 'N-01', to: 'N-02' },
      { from: 'N-02', to: 'N-03' },
      { from: 'N-03', to: 'N-04' },
      { from: 'N-04', to: 'N-05' },
      { from: 'N-05', to: 'N-06', label: 'attended' },
      { from: 'N-05', to: 'N-07', label: 'did not attend' },
      { from: 'N-06', to: 'N-07' },
    ],
    createdAt: at(-104, '09:00'),
    updatedAt: at(-30, '10:00'),
  },
  {
    id: 'JRN-003',
    name: 'Pharmacist partner onboarding',
    audienceId: 'AUD-003',
    status: 'Draft',
    version: 1,
    nodes: [
      { id: 'N-01', type: 'trigger', label: 'Pharmacist requests partner materials' },
      {
        id: 'N-02',
        type: 'audience',
        label: 'Community pharmacists',
        config: { audienceId: 'AUD-003', segmentId: 'SEG-003' },
      },
      {
        id: 'N-03',
        type: 'send',
        label: 'Send the partner newsletter',
        config: { communicationId: 'COM-017' },
      },
      { id: 'N-04', type: 'wait', label: 'Wait 7 days', config: { waitDays: 7 } },
      { id: 'N-05', type: 'exit', label: 'Exit journey' },
    ],
    edges: [
      { from: 'N-01', to: 'N-02' },
      { from: 'N-02', to: 'N-03' },
      { from: 'N-03', to: 'N-04' },
      { from: 'N-04', to: 'N-05' },
    ],
    createdAt: at(-26, '09:00'),
    updatedAt: at(-12, '09:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 18. KPIs and metric results                                         */
/*                                                                     */
/* Four KPIs report no data at all, and each has a reason a viewer can  */
/* check: the campaign behind it has not launched (KPI-011), is still   */
/* in approval (KPI-005), has not held the event it measures (KPI-004)  */
/* or measures a tracker whose next wave has not landed (KPI-009). "No  */
/* data yet" is a state, not a gap — a zero would be a claim.           */
/*                                                                     */
/* Of the eight that do report: KPI-002 and KPI-003 are at risk and     */
/* KPI-010 is off track. The two at-risk lines both flatten in the last */
/* two weeks, which is the crisis freeze arriving in the numbers.       */
/* ------------------------------------------------------------------ */

export const kpis: KPI[] = [
  {
    id: 'KPI-001',
    name: 'Vitalis consumer email open rate',
    metricKey: 'email_open_rate',
    tier: 'engagement',
    unit: '%',
    direction: 'up',
    target: 34,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-002' },
    createdAt: at(-200, '10:00'),
    updatedAt: at(-60, '15:30'),
  },
  {
    id: 'KPI-002',
    name: 'Second-line indication HCP reach',
    metricKey: 'hcp_reach',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 95000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-004' },
    createdAt: at(-83, '11:00'),
    updatedAt: at(-6, '16:30'),
  },
  {
    id: 'KPI-003',
    name: 'Congress symposium registrations',
    metricKey: 'congress_registrations',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 5200,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-001' },
    createdAt: at(-200, '09:00'),
    updatedAt: at(-6, '16:30'),
  },
  {
    // No data: the analyst briefing is scheduled for d(+25).
    id: 'KPI-004',
    name: 'Analyst briefing attendance',
    metricKey: 'briefing_attendance',
    tier: 'engagement',
    unit: 'count',
    direction: 'up',
    target: 180,
    period: 'Q4-2026',
    attachedTo: { campaignId: 'CMP-005' },
    createdAt: at(-70, '09:30'),
    updatedAt: at(-70, '09:30'),
  },
  {
    // No data: the pledge campaign is still at the compliance gate (APR-039).
    id: 'KPI-005',
    name: 'Access pledge share of voice (KSA)',
    metricKey: 'pledge_share_of_voice',
    tier: 'reach',
    unit: '%',
    direction: 'up',
    target: 22,
    period: 'Q4-2026',
    attachedTo: { campaignId: 'CMP-009' },
    createdAt: at(-85, '09:30'),
    updatedAt: at(-85, '09:30'),
  },
  {
    id: 'KPI-006',
    name: 'Pharmacist partner activations',
    metricKey: 'pharmacist_activations',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 900,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-002' },
    createdAt: at(-200, '10:15'),
    updatedAt: at(-60, '15:35'),
  },
  {
    id: 'KPI-007',
    name: 'Summer hydration attributed revenue',
    metricKey: 'revenue_attributed',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 320000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-011' },
    createdAt: at(-150, '10:05'),
    updatedAt: at(-10, '18:00'),
  },
  {
    id: 'KPI-008',
    name: 'Programme evidence pack requests',
    metricKey: 'evidence_pack_requests',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 1800,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-003' },
    createdAt: at(-200, '09:15'),
    updatedAt: at(-30, '09:00'),
  },
  {
    // No data: the pharmacist recommendation tracker runs half-yearly and the
    // next wave fields after the anchor date.
    id: 'KPI-009',
    name: 'Vitalis pharmacist recommendation share',
    metricKey: 'otc_recommendation_share',
    tier: 'brand',
    unit: '%',
    direction: 'up',
    target: 26,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-002' },
    createdAt: at(-200, '10:30'),
    updatedAt: at(-200, '10:30'),
  },
  {
    // Off track, on a campaign that has already closed. Nothing recovers this.
    id: 'KPI-010',
    name: 'Summer hydration referral sign-ups',
    metricKey: 'referral_signups',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 24000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-011' },
    createdAt: at(-150, '10:00'),
    updatedAt: at(-10, '18:00'),
  },
  {
    // No data: the winter range does not go live until d(+32).
    id: 'KPI-011',
    name: 'Winter immunity range reach',
    metricKey: 'winter_range_impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 9000000,
    period: 'Q4-2026',
    attachedTo: { campaignId: 'CMP-001' },
    createdAt: at(-95, '09:30'),
    updatedAt: at(-95, '09:30'),
  },
  {
    id: 'KPI-012',
    name: 'Corporate favourability (institutional & policy)',
    metricKey: 'brand_favourability',
    tier: 'brand',
    unit: '%',
    direction: 'up',
    target: 58,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-004' },
    createdAt: at(-200, '11:00'),
    updatedAt: at(-200, '11:00'),
  },
];

/** The ten ISO week-start Mondays this pack reports on. */
const METRIC_WEEKS = METRIC_WEEK_OFFSETS.map((offset) => d(offset));
/** Rollup timestamps, one per week; the last is partial and lands early. */
const ROLLUP_AT = METRIC_ROLLUP_OFFSETS.map((offset) => at(offset, '06:00'));

/** Builds one block of ten weekly rows with a deterministic id → week mapping. */
function metricBlock(
  firstIdNumber: number,
  kpiId: string | undefined,
  metricKey: string,
  dimensions: MetricResult['dimensions'],
  values: number[],
): MetricResult[] {
  return values.map((value, i) => ({
    id: `MR-${String(firstIdNumber + i).padStart(3, '0')}`,
    ...(kpiId ? { kpiId } : {}),
    metricKey,
    value,
    period: METRIC_WEEKS[i],
    dimensions,
    createdAt: ROLLUP_AT[i],
    updatedAt: ROLLUP_AT[i],
  }));
}

export const metricResults: MetricResult[] = [
  // MR-001..010 — Vitalis consumer email open rate (%). Mean 31.5 against a
  // 34 target: short, but the winter range that was meant to lift it has not
  // launched.
  ...metricBlock(
    1,
    'KPI-001',
    'email_open_rate',
    { brandId: 'BRD-004', businessUnitId: 'BU-003' },
    [29, 30, 30, 31, 31, 32, 32, 33, 33, 34],
  ),

  // MR-011..020 — second-line HCP reach. Zero until the launch email went out,
  // then a ramp that collapses in the last two weeks — the same two weeks the
  // launch sends were frozen by CRI-003. Sum 70,100 against 95,000: at risk.
  ...metricBlock(
    11,
    'KPI-002',
    'hcp_reach',
    { campaignId: 'CMP-004', brandId: 'BRD-002', businessUnitId: 'BU-001', regionId: 'REG-AMER' },
    [0, 0, 4200, 7800, 9500, 10400, 11200, 11800, 9000, 6200],
  ),

  // MR-021..030 — congress symposium registrations. Sum 4,070 against 5,200:
  // at risk, and the flattening is the frozen invitation programme.
  ...metricBlock(
    21,
    'KPI-003',
    'congress_registrations',
    { campaignId: 'CMP-003', brandId: 'BRD-002', businessUnitId: 'BU-001' },
    [120, 180, 240, 320, 410, 480, 520, 560, 600, 640],
  ),

  // MR-031..040 — pharmacist partner activations. Sum 840 against 900: on
  // track, and the only line in this pack the crisis does not touch.
  ...metricBlock(
    31,
    'KPI-006',
    'pharmacist_activations',
    { brandId: 'BRD-004', businessUnitId: 'BU-003' },
    [60, 68, 74, 80, 86, 90, 94, 96, 98, 94],
  ),

  // MR-041..050 — summer hydration attributed revenue. Sum 331,000 against
  // 320,000: above target on a campaign that has closed.
  ...metricBlock(
    41,
    'KPI-007',
    'revenue_attributed',
    { campaignId: 'CMP-011', brandId: 'BRD-004', businessUnitId: 'BU-003', regionId: 'REG-EMEA' },
    [22000, 26000, 29000, 32000, 35000, 38000, 40000, 39000, 36000, 34000],
  ),

  // MR-051..060 — programme evidence pack requests. Sum 1,800 against 1,800:
  // exactly on target, which is what an always-on programme looks like when
  // nothing interesting happens to it.
  ...metricBlock(
    51,
    'KPI-008',
    'evidence_pack_requests',
    { brandId: 'BRD-003', businessUnitId: 'BU-002', regionId: 'REG-EMEA' },
    [140, 155, 160, 170, 175, 180, 190, 200, 210, 220],
  ),

  // MR-061..070 — summer hydration referral sign-ups. Sum 12,150 against a
  // 24,000 target: off track by half, on a campaign that has already closed.
  // The revenue line above hit its number; this one never had a chance, and
  // both are true at once.
  ...metricBlock(
    61,
    'KPI-010',
    'referral_signups',
    { campaignId: 'CMP-011', brandId: 'BRD-004', businessUnitId: 'BU-003', regionId: 'REG-EMEA' },
    [900, 1100, 1250, 1300, 1350, 1400, 1420, 1300, 1150, 980],
  ),

  // MR-071..080 — corporate favourability (%). Mean 54.5 against 58.
  ...metricBlock(
    71,
    'KPI-012',
    'brand_favourability',
    { brandId: 'BRD-001', businessUnitId: 'BU-004' },
    [52, 53, 53, 54, 54, 55, 55, 56, 56, 57],
  ),
];

/* ------------------------------------------------------------------ */
/* 19. Media relations and coverage                                    */
/*                                                                     */
/* Outlets are invented. The beats are not: trade press, health policy */
/* press, a Gulf programme title and a general-audience consumer desk  */
/* are the four rooms a pharmaceutical announcement lands in, and they */
/* read the same release very differently.                             */
/* ------------------------------------------------------------------ */

export const mediaContacts: MediaContact[] = [
  {
    id: 'MCT-001',
    name: 'Dr Imogen Slater',
    outlet: 'Clinical Oncology Report',
    beat: 'Oncology trials & regulatory decisions',
    regionId: 'REG-AMER',
    relationship: 'Strong',
    email: 'i.slater@clinicaloncologyreport.example',
    lastInteractionAt: at(-5, '10:30'),
    createdAt: at(-620, '09:00'),
    updatedAt: at(-5, '10:30'),
  },
  {
    id: 'MCT-002',
    name: 'Theo Lindqvist',
    outlet: 'The Safety Ledger',
    beat: 'Pharmacovigilance & post-marketing surveillance',
    regionId: 'REG-AMER',
    relationship: 'Warm',
    email: 't.lindqvist@safetyledger.example',
    lastInteractionAt: at(-4, '15:45'),
    createdAt: at(-540, '11:20'),
    updatedAt: at(-4, '15:45'),
  },
  {
    id: 'MCT-003',
    name: 'Beatrix Haldane',
    outlet: 'The Quarterly Brief',
    beat: 'Healthcare disclosure & institutional investment',
    regionId: 'REG-EMEA',
    relationship: 'Warm',
    email: 'b.haldane@quarterlybrief.example',
    lastInteractionAt: at(-24, '09:15'),
    createdAt: at(-500, '14:00'),
    updatedAt: at(-24, '09:15'),
  },
  {
    id: 'MCT-004',
    name: 'Rania Kassem',
    outlet: 'Gulf Health Programmes',
    beat: 'National immunisation programmes & procurement',
    regionId: 'REG-MENA',
    relationship: 'Strong',
    email: 'r.kassem@gulfhealthprogrammes.example',
    lastInteractionAt: at(-11, '16:00'),
    createdAt: at(-450, '10:00'),
    updatedAt: at(-11, '16:00'),
  },
  {
    id: 'MCT-005',
    name: 'Marion Devlin',
    outlet: 'Formulary & Access Weekly',
    beat: 'Payers, HTA submissions & budget impact',
    regionId: 'REG-EMEA',
    relationship: 'Warm',
    email: 'm.devlin@formularyaccess.example',
    lastInteractionAt: at(-33, '11:00'),
    createdAt: at(-420, '09:30'),
    updatedAt: at(-33, '11:00'),
  },
  {
    id: 'MCT-006',
    name: 'Yuki Tanabe',
    outlet: 'Asia Pharma Monitor',
    beat: 'APAC approvals & local label',
    regionId: 'REG-APAC',
    relationship: 'New',
    email: 'y.tanabe@asiapharmamonitor.example',
    lastInteractionAt: at(-62, '08:00'),
    createdAt: at(-120, '09:00'),
    updatedAt: at(-62, '08:00'),
  },
  {
    id: 'MCT-007',
    name: 'Priya Bhattacharya',
    outlet: 'The Counter',
    beat: 'Community pharmacy & consumer health',
    regionId: 'REG-EMEA',
    relationship: 'Warm',
    email: 'p.bhattacharya@thecounter.example',
    lastInteractionAt: at(-19, '13:30'),
    createdAt: at(-380, '10:15'),
    updatedAt: at(-19, '13:30'),
  },
  {
    id: 'MCT-008',
    name: 'Casper Nyberg',
    outlet: 'Public Health Dispatch',
    beat: 'Immunisation policy & public health communications',
    regionId: 'REG-EMEA',
    relationship: 'New',
    email: 'c.nyberg@publichealthdispatch.example',
    lastInteractionAt: at(-56, '09:00'),
    createdAt: at(-200, '09:00'),
    updatedAt: at(-56, '09:00'),
  },
];

export const coverageItems: CoverageItem[] = [
  {
    id: 'COV-001',
    headline: 'Second-line data lands with the safety table in the same breath',
    outlet: 'Clinical Oncology Report',
    mediaContactId: 'MCT-001',
    campaignId: 'CMP-004',
    communicationId: 'COM-009',
    publishedAt: at(-36, '08:00'),
    sentiment: 'Positive',
    reach: 128000,
    url: 'https://clinicaloncologyreport.example/second-line-data-safety-table',
    createdAt: at(-36, '10:00'),
    updatedAt: at(-36, '10:00'),
  },
  {
    id: 'COV-002',
    headline: 'Surveillance cluster puts a second-line oncology launch on hold',
    outlet: 'The Safety Ledger',
    mediaContactId: 'MCT-002',
    campaignId: 'CMP-004',
    communicationId: 'COM-012',
    publishedAt: at(-5, '07:30'),
    sentiment: 'Negative',
    reach: 486000,
    url: 'https://safetyledger.example/second-line-surveillance-cluster',
    createdAt: at(-5, '09:00'),
    updatedAt: at(-4, '11:00'),
  },
  {
    id: 'COV-003',
    headline: 'Caldera discloses more than it has to, and says less than it could',
    outlet: 'The Quarterly Brief',
    mediaContactId: 'MCT-003',
    publishedAt: at(-196, '09:00'),
    sentiment: 'Neutral',
    reach: 174000,
    url: 'https://quarterlybrief.example/caldera-disclosure-review',
    createdAt: at(-196, '11:00'),
    updatedAt: at(-196, '11:00'),
  },
  {
    id: 'COV-004',
    headline: 'Inside the Al-Nakheel tender: what a delivery record is worth',
    outlet: 'Gulf Health Programmes',
    mediaContactId: 'MCT-004',
    campaignId: 'CMP-002',
    publishedAt: at(-11, '14:00'),
    sentiment: 'Positive',
    reach: 64000,
    url: 'https://gulfhealthprogrammes.example/al-nakheel-delivery-record',
    createdAt: at(-11, '15:30'),
    updatedAt: at(-11, '15:30'),
  },
  {
    id: 'COV-005',
    headline: 'Payers want the budget impact model, not the hazard ratio',
    outlet: 'Formulary & Access Weekly',
    mediaContactId: 'MCT-005',
    campaignId: 'CMP-008',
    communicationId: 'COM-019',
    publishedAt: at(-58, '10:00'),
    sentiment: 'Neutral',
    reach: 39000,
    url: 'https://formularyaccess.example/budget-impact-not-hazard-ratio',
    createdAt: at(-58, '12:00'),
    updatedAt: at(-58, '12:00'),
  },
  {
    id: 'COV-006',
    headline: 'Congress symposium draws a full room and a careful abstract',
    outlet: 'Clinical Oncology Report',
    mediaContactId: 'MCT-001',
    campaignId: 'CMP-003',
    communicationId: 'COM-007',
    publishedAt: at(-71, '12:00'),
    sentiment: 'Positive',
    reach: 96000,
    url: 'https://clinicaloncologyreport.example/symposium-full-room',
    createdAt: at(-71, '14:00'),
    updatedAt: at(-71, '14:00'),
  },
  {
    id: 'COV-007',
    headline: 'Pharmacists say they will repeat a claim they can defend',
    outlet: 'The Counter',
    mediaContactId: 'MCT-007',
    publishedAt: at(-19, '09:00'),
    sentiment: 'Positive',
    reach: 51000,
    url: 'https://thecounter.example/claims-pharmacists-repeat',
    createdAt: at(-19, '13:30'),
    updatedAt: at(-19, '13:30'),
  },
  {
    id: 'COV-008',
    headline: 'A quarantined pallet, and a company that said so first',
    outlet: 'Public Health Dispatch',
    mediaContactId: 'MCT-008',
    publishedAt: at(-56, '11:00'),
    sentiment: 'Neutral',
    reach: 43000,
    url: 'https://publichealthdispatch.example/quarantined-pallet-disclosure',
    createdAt: at(-56, '13:00'),
    updatedAt: at(-56, '13:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 20. Competitive and market intelligence                             */
/*                                                                     */
/* Competitor names are invented, as required. What is not invented is  */
/* the shape of the pressure: in this category a rival's *promotional   */
/* conduct* is competitive intelligence, because a comparative claim    */
/* made without a head-to-head trial is both a commercial move and a    */
/* regulatory event, and the second one arrives later.                  */
/* ------------------------------------------------------------------ */

export const competitors: Competitor[] = [
  {
    id: 'CPT-001',
    name: 'Aurelian Biosciences',
    focusBrandIds: ['BRD-002'],
    summary:
      'The direct competitor in the second-line setting. Publishes early, presents at the same congresses and has twice made cross-trial comparisons that read as superiority claims without a head-to-head study behind them. Both an opportunity — the claim is fragile — and a category risk, because a finding against it lands on every oncology promotional review in the market, ours included.',
    moves: [
      {
        date: d(-63),
        moveType: 'campaign',
        title: 'Congress campaign built on a cross-trial comparison',
        note: 'Presents an indirect comparison as an efficacy advantage. No head-to-head trial exists. Referred by a competitor complaint; outcome pending.',
      },
      {
        date: d(-30),
        moveType: 'launch',
        title: 'Second-line indication approved in two EMEA markets',
        note: 'Approved ahead of our EMEA filing decision. Local label narrower than the AMER one.',
      },
      {
        date: d(-8),
        moveType: 'partnership',
        title: 'Co-promotion agreement with a hospital pharmacy network',
      },
    ],
    alertTriggers: [
      'Any comparative efficacy claim published without a head-to-head trial reference',
      'A regulatory or self-regulatory finding on a comparative claim in this category, whoever it names',
      'Approval or label change in the second-line indication in any market we are live in',
      'Congress abstract acceptance in the same session as ours',
    ],
    createdAt: at(-320, '09:00'),
    updatedAt: at(-3, '09:00'),
  },
  {
    id: 'CPT-002',
    name: 'Solstice Immunologics',
    focusBrandIds: ['BRD-003'],
    summary:
      'Competes with Caldera Vaccines on national programme tenders rather than on prescriber preference. Wins on unit price and delivery lead time; loses on published cold-chain performance, which it does not report. Its tender responses are strong on commitment and thin on evidence, which is the gap our credentials pack is built to occupy — when the pack has its registration number.',
    moves: [
      {
        date: d(-92),
        moveType: 'pricing',
        title: 'Undercut on two Gulf programme tenders',
        note: 'Awarded one, lost one on delivery record.',
      },
      {
        date: d(-41),
        moveType: 'partnership',
        title: 'Regional fill-finish agreement announced for the Gulf',
        note: 'Local-manufacture positioning, which is what programme offices are being asked to weigh.',
      },
    ],
    alertTriggers: [
      'Tender award or shortlist announcement in any market Caldera Vaccines has submitted to',
      'Local-manufacture or technology-transfer announcement in the Gulf',
      'Any published cold-chain performance data, which would remove our clearest differentiator',
    ],
    createdAt: at(-320, '09:05'),
    updatedAt: at(-14, '09:00'),
  },
  {
    id: 'CPT-003',
    name: 'Brightleaf Consumer Health',
    focusBrandIds: ['BRD-004'],
    summary:
      'Own-brand and challenger over-the-counter range competing with Vitalis at the pharmacy counter. Advertises to a looser substantiation standard than we hold ourselves to, which costs us share in the short run and is the reason our claims survive a challenge. Its winter range launched four weeks ahead of ours.',
    moves: [
      {
        date: d(-58),
        moveType: 'launch',
        title: 'Winter immunity range launched into the pharmacy channel',
        note: 'Four weeks ahead of ours, with a benefit claim we would not clear.',
      },
      {
        date: d(-21),
        moveType: 'campaign',
        title: '"Feel better faster" seasonal campaign',
        note: 'Outcome-implying wording on an over-the-counter product. Under review by a self-regulatory body.',
      },
    ],
    alertTriggers: [
      'Outcome-implying or guarantee wording on any over-the-counter product in our categories',
      'Counter-level promotion inside a pharmacy chain where Vitalis has a partner agreement',
      'A self-regulatory ruling on a seasonal immunity claim, whoever it names',
    ],
    createdAt: at(-300, '09:10'),
    updatedAt: at(-9, '09:00'),
  },
];

export const marketTrends: MarketTrend[] = [
  {
    id: 'TRD-001',
    label: 'Share of oncology promotional material returned at first MLR pass',
    businessUnitId: 'BU-001',
    unit: '%',
    series: [
      { period: '2026-01', value: 41 },
      { period: '2026-02', value: 39 },
      { period: '2026-03', value: 38 },
      { period: '2026-04', value: 36 },
      { period: '2026-05', value: 33 },
      { period: '2026-06', value: 31 },
      { period: '2026-07', value: 29 },
      { period: '2026-08', value: 28 },
    ],
    insight:
      'First-pass returns are down thirteen points since January, and almost all of the improvement is in mechanical findings — missing safety information, superseded blocks, absent adverse-event contacts — rather than in judgement calls. That is the pre-check gate working, and it says nothing about whether the harder findings are getting easier.',
    sourceLabel: 'Internal MLR pass-rate tracker, monthly, to Aug 2026',
    confidence: 0.88,
    createdAt: at(-200, '09:00'),
    updatedAt: at(-3, '06:00'),
  },
  {
    id: 'TRD-002',
    label: 'National immunisation programme tenders open (count)',
    businessUnitId: 'BU-002',
    unit: 'count',
    series: [
      { period: '2025-Q1', value: 18 },
      { period: '2025-Q2', value: 21 },
      { period: '2025-Q3', value: 24 },
      { period: '2025-Q4', value: 22 },
      { period: '2026-Q1', value: 27 },
      { period: '2026-Q2', value: 31 },
      { period: '2026-Q3', value: 34 },
    ],
    insight:
      'Tender volume is up two thirds over two years and the growth is concentrated in multi-year programme awards rather than annual supply. Longer awards reward a published delivery record over a headline unit price, which is the argument our credentials pack makes.',
    sourceLabel: 'Public procurement notices, collated quarterly, to Q3 2026',
    confidence: 0.71,
    createdAt: at(-200, '09:05'),
    updatedAt: at(-14, '06:00'),
  },
  {
    id: 'TRD-003',
    label: 'Pharmacist-led over-the-counter recommendation share',
    businessUnitId: 'BU-003',
    unit: '%',
    series: [
      { period: '2026-01', value: 47 },
      { period: '2026-02', value: 48 },
      { period: '2026-03', value: 49 },
      { period: '2026-04', value: 51 },
      { period: '2026-05', value: 52 },
      { period: '2026-06', value: 54 },
      { period: '2026-07', value: 55 },
      { period: '2026-08', value: 56 },
    ],
    insight:
      'More than half of over-the-counter purchases in these categories now follow a pharmacist recommendation rather than a shelf decision. The person to convince is behind the counter, and what convinces them is a claim they can say out loud and defend.',
    sourceLabel: 'Syndicated pharmacy panel, monthly wave, Aug 2026',
    confidence: 0.74,
    createdAt: at(-200, '09:10'),
    updatedAt: at(-3, '06:05'),
  },
  {
    id: 'TRD-004',
    label: 'Institutional investor weighting on disclosure quality',
    businessUnitId: 'BU-004',
    unit: 'index',
    series: [
      { period: '2025-H1', value: 100 },
      { period: '2025-H2', value: 108 },
      { period: '2026-H1', value: 119 },
    ],
    insight:
      'Healthcare institutional investors are weighting disclosure quality — safety reporting, trial registration, pricing transparency — more heavily every half. Indexed to 100 at the start of the series; the level is only meaningful as a direction of travel.',
    sourceLabel: 'Composite of published institutional stewardship policies, H1 2026',
    confidence: 0.58,
    createdAt: at(-200, '09:15'),
    updatedAt: at(-30, '06:00'),
  },
];

export const shareOfVoice: ShareOfVoice[] = [
  { id: 'SOV-001', brandId: 'BRD-001', period: '2026-Q2', pct: 9, createdAt: at(-40, '09:00'), updatedAt: at(-40, '09:00') },
  { id: 'SOV-002', brandId: 'BRD-002', period: '2026-Q2', pct: 19, createdAt: at(-40, '09:00'), updatedAt: at(-40, '09:00') },
  { id: 'SOV-003', brandId: 'BRD-003', period: '2026-Q2', pct: 12, createdAt: at(-40, '09:00'), updatedAt: at(-40, '09:00') },
  { id: 'SOV-004', brandId: 'BRD-004', period: '2026-Q2', pct: 14, createdAt: at(-40, '09:00'), updatedAt: at(-40, '09:00') },
  { id: 'SOV-005', brandId: 'BRD-001', period: '2026-Q3', pct: 11, createdAt: at(-10, '09:00'), updatedAt: at(-10, '09:00') },
  { id: 'SOV-006', brandId: 'BRD-002', period: '2026-Q3', pct: 24, createdAt: at(-10, '09:00'), updatedAt: at(-10, '09:00') },
  { id: 'SOV-007', brandId: 'BRD-003', period: '2026-Q3', pct: 13, createdAt: at(-10, '09:00'), updatedAt: at(-10, '09:00') },
  { id: 'SOV-008', brandId: 'BRD-004', period: '2026-Q3', pct: 15, createdAt: at(-10, '09:00'), updatedAt: at(-10, '09:00') },
  { id: 'SOV-009', brandId: 'BRD-002', period: '2026-07', pct: 22, createdAt: at(-24, '09:00'), updatedAt: at(-24, '09:00') },
  { id: 'SOV-010', brandId: 'BRD-004', period: '2026-07', pct: 15, createdAt: at(-24, '09:00'), updatedAt: at(-24, '09:00') },
  // The August wave is deliberately partial: only the two brands with an
  // active flight had reported by the anchor date. The oncology share is up
  // on the month for the wrong reason — it is safety coverage, not launch
  // coverage. Share of voice does not know the difference; the coverage
  // sentiment on COV-002 does.
  { id: 'SOV-011', brandId: 'BRD-002', period: '2026-08', pct: 29, createdAt: at(-1, '09:00'), updatedAt: at(-1, '09:00') },
  { id: 'SOV-012', brandId: 'BRD-004', period: '2026-08', pct: 14, createdAt: at(-1, '09:00'), updatedAt: at(-1, '09:00') },
];

/* ------------------------------------------------------------------ */
/* 21. Benchmarks and playbook patterns                                */
/*                                                                     */
/* Benchmarks join to KPI.metricKey, so every row here has a KPI it     */
/* can sit beside. `sourceLabel` names what the figure is drawn from —  */
/* a benchmark with no provenance is a number somebody once said.       */
/* ------------------------------------------------------------------ */

export const benchmarks: Benchmark[] = [
  {
    id: 'BMK-001',
    metricKey: 'email_open_rate',
    channelKind: 'email',
    industryMedian: 28.4,
    topQuartile: 39.1,
    unit: '%',
    sourceLabel: 'Consumer health email engagement benchmark, H1 2026',
    createdAt: at(-129, '09:00'),
    updatedAt: at(-17, '08:00'),
  },
  {
    id: 'BMK-002',
    metricKey: 'hcp_reach',
    channelKind: 'email',
    industryMedian: 31,
    topQuartile: 48,
    unit: '% of target prescriber list reached',
    sourceLabel: 'Prescriber engagement benchmark, oncology, H1 2026',
    createdAt: at(-129, '09:05'),
    updatedAt: at(-24, '08:00'),
  },
  {
    id: 'BMK-003',
    metricKey: 'congress_registrations',
    channelKind: 'event',
    industryMedian: 3.4,
    topQuartile: 6.1,
    unit: '% of invited prescribers registering',
    sourceLabel: 'Congress symposium conversion benchmark, 2025–2026',
    createdAt: at(-129, '09:10'),
    updatedAt: at(-24, '08:05'),
  },
  {
    id: 'BMK-004',
    metricKey: 'evidence_pack_requests',
    industryMedian: 2.2,
    topQuartile: 4.4,
    unit: '% of programme contacts requesting',
    sourceLabel: 'Public health programme engagement benchmark, 2026',
    createdAt: at(-129, '09:15'),
    updatedAt: at(-17, '08:10'),
  },
  {
    id: 'BMK-005',
    metricKey: 'pharmacist_activations',
    industryMedian: 12,
    topQuartile: 23,
    unit: '% of contacted pharmacies activating',
    sourceLabel: 'Pharmacy partner programme benchmark, H1 2026',
    createdAt: at(-129, '09:20'),
    updatedAt: at(-17, '08:15'),
  },
  {
    id: 'BMK-006',
    metricKey: 'referral_signups',
    channelKind: 'email',
    industryMedian: 1.6,
    topQuartile: 3.9,
    unit: '% of recipients referring',
    sourceLabel: 'Consumer referral programme benchmark, H1 2026',
    createdAt: at(-129, '09:25'),
    updatedAt: at(-10, '08:00'),
  },
  {
    id: 'BMK-007',
    metricKey: 'brand_favourability',
    industryMedian: 51,
    topQuartile: 64,
    unit: '%',
    sourceLabel: 'Healthcare corporate reputation tracker, institutional & policy audiences, 2026',
    createdAt: at(-129, '09:30'),
    updatedAt: at(-30, '08:00'),
  },
];

export const playbookPatterns: PlaybookPattern[] = [
  {
    id: 'PBP-001',
    title: 'Send the safety half with the efficacy half, not after it',
    situation:
      'Any prescriber-facing piece that leads on an efficacy result and is tempted to put the safety table one scroll, one click or one attachment away.',
    actions: [
      'Draft the safety paragraph before the efficacy paragraph, so the piece is built around both rather than having one added to it.',
      'Set the safety block in the same type class and reading order as the claim it balances; never behind an interaction.',
      'Resolve the safety block by reference to the current governed version rather than by pasting text, so a supersession re-versions the piece instead of silently invalidating it.',
      'Run the pre-check gate before the first reviewer sees it, so Medical spends its 48 hours on the data rather than on the layout.',
    ],
    evidenceCampaignIds: ['CMP-004', 'CMP-003'],
    liftPct: 22,
    createdAt: at(-160, '09:00'),
    updatedAt: at(-14, '09:00'),
  },
  {
    id: 'PBP-002',
    title: 'Give the pharmacist the sentence, not the claim',
    situation:
      'Over-the-counter work where the purchase follows a recommendation at the counter rather than a shelf decision.',
    actions: [
      'Write every claim as a sentence a pharmacist would be willing to say out loud to a customer who then asks "how do you know?".',
      'Put the register wording, the study and the population on the counter card, not in a portal nobody opens mid-conversation.',
      'Never let a consumer piece name, picture or link through to a prescription product — that takes the whole piece out of the consumer standard and under the clinical one.',
      'Measure recommendation share, not impressions: the shelf is not the decision point.',
    ],
    evidenceCampaignIds: ['CMP-011', 'CMP-007'],
    liftPct: 31,
    createdAt: at(-160, '09:05'),
    updatedAt: at(-25, '09:00'),
  },
  {
    id: 'PBP-003',
    title: 'Lead a tender with the delivery record, not the commitment',
    situation:
      'National programme tenders where every bidder can promise volume and lead time, and none of the promises are checkable at submission.',
    actions: [
      'Open with published coverage attainment and cold-chain excursion records, per programme, with the years named.',
      'State what went wrong at least once and what changed afterwards — a record with no failures in it reads as a record nobody kept.',
      'Produce the local registration number before the pack is written, not while it waits at the compliance gate.',
      'Publish the Arabic version as the governing one where the market says it governs, and derive the English from it.',
    ],
    evidenceCampaignIds: ['CMP-006', 'CMP-002'],
    liftPct: 18,
    createdAt: at(-160, '09:10'),
    updatedAt: at(-30, '09:00'),
  },
  {
    id: 'PBP-004',
    title: 'Say it first, in the language the programme office reads',
    situation:
      'A quality or safety event that a regulator, a programme office or the trade press will find out about within days whether or not you tell them.',
    actions: [
      'Notify the regulator and the programme owner the same day, before any external statement is drafted.',
      'State what was observed, what has not been established and what you are asking people to do — in that order.',
      'Issue in every governing language at once; a statement that lands in Arabic three days after the English one is two stories, not one.',
      'Keep the reactive wording in the archive: the next incident is drafted from it rather than from scratch at 22:00.',
    ],
    evidenceCampaignIds: ['CMP-004', 'CMP-006'],
    liftPct: 14,
    createdAt: at(-160, '09:15'),
    updatedAt: at(-4, '09:00'),
  },
];

/* ------------------------------------------------------------------ */
/* 22. Notifications                                                   */
/*                                                                     */
/* Four kinds, and every one points at a record that exists. The ISI    */
/* supersession rides on `asset-expiry` because `NotifKind` has no      */
/* "superseded" member and that is the closest honest one — an asset    */
/* that must not appear on anything published from a given date. The    */
/* message says what actually happened rather than implying a rights    */
/* lapse.                                                               */
/* ------------------------------------------------------------------ */

export const notifications: Notification[] = [
  /* --- Approvals due ---------------------------------------------- */
  {
    id: 'NTF-001',
    recipientStakeholderId: 'STK-006',
    notifKind: 'approval-due',
    subjectEntity: 'Approval',
    subjectId: 'APR-009',
    message: 'Brand review for the Vitalis winter range launch email (CNT-001) is due in two days.',
    read: false,
    at: at(-1, '08:00'),
    createdAt: at(-1, '08:00'),
    updatedAt: at(-1, '08:00'),
  },
  {
    id: 'NTF-002',
    recipientStakeholderId: 'STK-006',
    notifKind: 'approval-due',
    subjectEntity: 'Approval',
    subjectId: 'APR-038',
    message: 'Vitalis Winter Immunity Range (CMP-001) is awaiting your brand and legal review.',
    read: false,
    at: at(-1, '08:00'),
    createdAt: at(-1, '08:00'),
    updatedAt: at(-1, '08:00'),
  },
  {
    id: 'NTF-003',
    recipientStakeholderId: 'STK-003',
    notifKind: 'approval-due',
    subjectEntity: 'Approval',
    subjectId: 'APR-039',
    message: 'Caldera Access Pledge KSA (CMP-009) is awaiting the compliance gate.',
    read: false,
    at: at(-2, '08:30'),
    createdAt: at(-2, '08:30'),
    updatedAt: at(-2, '08:30'),
  },
  {
    id: 'NTF-004',
    recipientStakeholderId: 'STK-005',
    notifKind: 'approval-due',
    subjectEntity: 'Approval',
    subjectId: 'APR-015',
    message:
      'The H1 results and pipeline investor statement awaits your sign-off; due tomorrow at 12:00 UTC.',
    read: false,
    at: at(-2, '09:30'),
    createdAt: at(-2, '09:30'),
    updatedAt: at(-2, '09:30'),
  },
  {
    id: 'NTF-005',
    recipientStakeholderId: 'STK-004',
    notifKind: 'approval-due',
    subjectEntity: 'Approval',
    subjectId: 'APR-021',
    message:
      'The Arabic access pledge announcement (CNT-021) is awaiting your review. The Arabic version is the governing one.',
    read: true,
    at: at(-3, '08:35'),
    createdAt: at(-3, '08:35'),
    updatedAt: at(-3, '09:00'),
  },

  /* --- SLA breaches ----------------------------------------------- */
  {
    // The one the demo stops on.
    id: 'NTF-006',
    recipientStakeholderId: 'STK-003',
    notifKind: 'sla-breach',
    subjectEntity: 'Approval',
    subjectId: 'APR-035',
    message:
      'MLR Legal review of the second-line press release (CNT-011) passed its 48-hour SLA two days ago. The stage is not waivable and Regulatory cannot start until it clears.',
    read: false,
    at: at(-9, '09:05'),
    createdAt: at(-9, '09:05'),
    updatedAt: at(-9, '09:05'),
  },
  {
    id: 'NTF-007',
    recipientStakeholderId: 'STK-001',
    notifKind: 'sla-breach',
    subjectEntity: 'Approval',
    subjectId: 'APR-035',
    message:
      'Escalation notice: CNT-011 has been held at MLR Legal for nine days. There is no override path — POL-011 leaves no stage a launch date can move.',
    read: false,
    at: at(-7, '08:00'),
    createdAt: at(-7, '08:00'),
    updatedAt: at(-7, '08:00'),
  },
  {
    id: 'NTF-008',
    recipientStakeholderId: 'STK-007',
    notifKind: 'sla-breach',
    subjectEntity: 'Approval',
    subjectId: 'APR-004',
    message:
      'The Vitalis winter social burst (ACT-002) has been past its review SLA for five days. The finding is a conditional-override failure, not a wording preference.',
    read: false,
    at: at(-5, '08:00'),
    createdAt: at(-5, '08:00'),
    updatedAt: at(-5, '08:00'),
  },
  {
    id: 'NTF-009',
    recipientStakeholderId: 'STK-001',
    notifKind: 'sla-breach',
    subjectEntity: 'Approval',
    subjectId: 'APR-006',
    message:
      'Escalated to you: the Al-Nakheel credentials pack (ACT-004) has no SFDA registration number and the suppliers conference is four weeks out.',
    read: false,
    at: at(-3, '08:05'),
    createdAt: at(-3, '08:05'),
    updatedAt: at(-3, '08:05'),
  },
  {
    id: 'NTF-010',
    recipientStakeholderId: 'STK-007',
    notifKind: 'sla-breach',
    subjectEntity: 'Approval',
    subjectId: 'APR-037',
    message:
      'The real-world evidence hub publication (ACT-019) is past SLA at the brand and legal gate: it still embeds the superseded v7 safety block.',
    read: true,
    at: at(-8, '08:00'),
    createdAt: at(-8, '08:00'),
    updatedAt: at(-6, '09:00'),
  },
  {
    id: 'NTF-011',
    recipientStakeholderId: 'STK-002',
    notifKind: 'sla-breach',
    subjectEntity: 'Approval',
    subjectId: 'APR-010',
    message:
      'The Vitalis winter social kit (CNT-002) is in Rework and its return is past SLA. The substantiation line still names no study.',
    read: true,
    at: at(-4, '08:10'),
    createdAt: at(-4, '08:10'),
    updatedAt: at(-3, '10:00'),
  },

  /* --- Asset rights and supersession ------------------------------- */
  {
    id: 'NTF-012',
    recipientStakeholderId: 'STK-011',
    notifKind: 'asset-expiry',
    subjectEntity: 'Asset',
    subjectId: 'AST-002',
    message:
      'kol-prof-almansouri-interview.mp4 comes down in 41 days: usage runs with the investigator engagement, not with a licence, and it cannot be re-licensed without the investigator agreeing again. Two live content versions embed it.',
    read: false,
    at: at(-12, '11:30'),
    createdAt: at(-12, '11:30'),
    updatedAt: at(-12, '11:30'),
  },
  {
    id: 'NTF-013',
    recipientStakeholderId: 'STK-011',
    notifKind: 'asset-expiry',
    subjectEntity: 'Asset',
    subjectId: 'AST-008',
    message:
      'Model releases on oncology-congress-portraits-2024.jpg lapsed 13 days ago. The asset is still embedded in two content versions, one of which is at an open MLR gate.',
    read: false,
    at: at(-13, '07:00'),
    createdAt: at(-13, '07:00'),
    updatedAt: at(-13, '07:00'),
  },
  {
    // The showcase notification. Not a rights lapse — a governed document
    // replaced, which makes every piece still carrying the old one
    // non-compliant from the effective date.
    id: 'NTF-014',
    recipientStakeholderId: 'STK-002',
    notifKind: 'asset-expiry',
    subjectEntity: 'Asset',
    subjectId: 'AST-003',
    message:
      'isi-block-current-v7.pdf was superseded by v8 (AST-018) 12 days ago under LGL-002. Three published content versions still embed v7 — the congress press release, the congress invitation and the evidence hub report. POL-007 treats a superseded safety block as absent.',
    read: false,
    at: at(-12, '09:05'),
    createdAt: at(-12, '09:05'),
    updatedAt: at(-12, '09:05'),
  },
  {
    id: 'NTF-015',
    recipientStakeholderId: 'STK-006',
    notifKind: 'asset-expiry',
    subjectEntity: 'Asset',
    subjectId: 'AST-003',
    message:
      'Re-versioning required on every piece embedding the v7 safety block. One piece has already moved: the second-line HCP email (CNT-009) was re-versioned onto v8 and cleared the full MLR chain on it.',
    read: true,
    at: at(-12, '09:10'),
    createdAt: at(-12, '09:10'),
    updatedAt: at(-11, '09:00'),
  },
  {
    id: 'NTF-016',
    recipientStakeholderId: 'STK-011',
    notifKind: 'asset-expiry',
    subjectEntity: 'Asset',
    subjectId: 'AST-013',
    message:
      'Location and model releases on vaccines-cold-chain-photography-fr.jpg expire in 96 days. Renewal needs the site operator, so it is worth starting now rather than at 60.',
    read: true,
    at: at(-20, '08:00'),
    createdAt: at(-20, '08:00'),
    updatedAt: at(-18, '09:00'),
  },

  /* --- Crisis ------------------------------------------------------ */
  {
    id: 'NTF-017',
    recipientStakeholderId: 'STK-004',
    notifKind: 'crisis',
    subjectEntity: 'CrisisIncident',
    subjectId: 'CRI-003',
    message:
      'CRI-003 declared at High severity: adverse event signal cluster under assessment. War room assembled on the crisis workflow; promotional activity for the affected product is suspended.',
    read: true,
    at: at(-6, '14:00'),
    createdAt: at(-6, '14:00'),
    updatedAt: at(-6, '14:05'),
  },
  {
    id: 'NTF-018',
    recipientStakeholderId: 'STK-007',
    notifKind: 'crisis',
    subjectEntity: 'CrisisIncident',
    subjectId: 'CRI-003',
    message:
      'Six sends frozen by CRI-003 across three campaigns. The freeze is scoped to the product, not to a campaign, so anything naming it stops wherever it sits.',
    read: true,
    at: at(-6, '16:20'),
    createdAt: at(-6, '16:20'),
    updatedAt: at(-6, '16:40'),
  },
  {
    id: 'NTF-019',
    recipientStakeholderId: 'STK-009',
    notifKind: 'crisis',
    subjectEntity: 'CrisisIncident',
    subjectId: 'CRI-003',
    message:
      'Employee brief published and the all-employee town hall is set. Any adverse event an employee hears about goes to pharmacovigilance the same day.',
    read: true,
    at: at(-5, '11:30'),
    createdAt: at(-5, '11:30'),
    updatedAt: at(-5, '12:10'),
  },
  {
    id: 'NTF-020',
    recipientStakeholderId: 'STK-008',
    notifKind: 'crisis',
    subjectEntity: 'CrisisIncident',
    subjectId: 'CRI-003',
    message:
      'Two press enquiries logged against the signal cluster. The holding statement is cleared and held; nothing goes out without a publication decision from the war room.',
    read: false,
    at: at(-4, '09:15'),
    createdAt: at(-4, '09:15'),
    updatedAt: at(-4, '09:15'),
  },
];

/* ------------------------------------------------------------------ */
/* 23. Audit records                                                   */
/*                                                                     */
/* The ledger a regulator would ask for: who did what, to which        */
/* record, when, and on what grounds. Every rejection names the rule    */
/* it rests on, because "rejected" on its own is a taste decision       */
/* wearing a governance badge.                                          */
/* ------------------------------------------------------------------ */

export const auditRecords: AuditRecord[] = [
  { id: 'ADT-001', actorStakeholderId: 'STK-007', action: 'campaign.created', entityType: 'Campaign', entityId: 'CMP-004', at: at(-83, '10:00'), detail: 'Campaign Calvexa Second-Line Indication Launch created.', createdAt: at(-83, '10:00'), updatedAt: at(-83, '10:00') },
  { id: 'ADT-002', actorStakeholderId: 'STK-001', action: 'approval.approved', entityType: 'Approval', entityId: 'APR-003', at: at(-70, '10:05'), detail: 'Brief BRF-004 signed off; MLR runs in full on every piece beneath it.', createdAt: at(-70, '10:05'), updatedAt: at(-70, '10:05') },
  { id: 'ADT-003', actorStakeholderId: 'STK-007', action: 'campaign.launched', entityType: 'Campaign', entityId: 'CMP-004', at: at(-40, '08:00'), detail: 'Campaign moved from Approved to Live.', createdAt: at(-40, '08:00'), updatedAt: at(-40, '08:00') },
  { id: 'ADT-004', actorStakeholderId: 'STK-012', action: 'approval.approved', entityType: 'Approval', entityId: 'APR-024', at: at(-17, '11:00'), detail: 'CNT-010 cleared Medical review: endpoint, population and safety table all present at social length.', createdAt: at(-17, '11:00'), updatedAt: at(-17, '11:00') },
  { id: 'ADT-005', actorStakeholderId: 'STK-013', action: 'approval.approved', entityType: 'Approval', entityId: 'APR-036', at: at(-14, '16:15'), detail: 'CNT-010 cleared Regulatory review on the local indication. Full MLR chain complete.', createdAt: at(-14, '16:15'), updatedAt: at(-14, '16:15') },
  { id: 'ADT-006', actorStakeholderId: 'STK-003', action: 'legal.clause-superseded', entityType: 'LegalClause', entityId: 'LGL-002', at: at(-12, '09:00'), detail: 'Important Safety Information v8 in force. LGL-001 (v7) retained on record so material published before today still resolves to the clause that governed it.', createdAt: at(-12, '09:00'), updatedAt: at(-12, '09:00') },
  { id: 'ADT-007', actorStakeholderId: 'STK-011', action: 'asset.archived', entityType: 'Asset', entityId: 'AST-003', at: at(-12, '09:05'), detail: 'isi-block-current-v7.pdf archived on supersession by AST-018. Left linked: three published versions still embed it and hiding that would hide the exposure.', createdAt: at(-12, '09:05'), updatedAt: at(-12, '09:05') },
  { id: 'ADT-008', actorStakeholderId: 'STK-002', action: 'content.versioned', entityType: 'Content', entityId: 'CNT-009', at: at(-13, '09:00'), detail: 'Second-line HCP email re-versioned onto the v8 safety block as CV-017; the full MLR chain re-run rather than carried over.', createdAt: at(-13, '09:00'), updatedAt: at(-13, '09:00') },
  { id: 'ADT-009', actorStakeholderId: 'STK-013', action: 'approval.approved', entityType: 'Approval', entityId: 'APR-032', at: at(-9, '16:10'), detail: 'CNT-009 cleared Regulatory review. Four gates, four decisions, four people.', createdAt: at(-9, '16:10'), updatedAt: at(-9, '16:10') },
  { id: 'ADT-010', actorStakeholderId: 'STK-002', action: 'content.published', entityType: 'Content', entityId: 'CNT-009', at: at(-8, '08:05'), detail: 'Second-line HCP email published on the v8 safety block.', createdAt: at(-8, '08:05'), updatedAt: at(-8, '08:05') },
  { id: 'ADT-011', actorStakeholderId: 'STK-012', action: 'approval.approved', entityType: 'Approval', entityId: 'APR-034', at: at(-12, '16:30'), detail: 'CNT-011 cleared Medical review and moved to Legal.', createdAt: at(-12, '16:30'), updatedAt: at(-12, '16:30') },
  { id: 'ADT-012', actorStakeholderId: 'STK-003', action: 'approval.sla-breached', entityType: 'Approval', entityId: 'APR-035', at: at(-9, '09:05'), detail: 'CNT-011 passed its 48-hour Legal SLA undecided. Escalated rather than cleared: POL-011 makes the stage non-waivable and there is no marketing override at any stage of WF-006.', createdAt: at(-9, '09:05'), updatedAt: at(-9, '09:05') },
  { id: 'ADT-013', actorStakeholderId: 'STK-003', action: 'approval.rejected', entityType: 'Approval', entityId: 'APR-005', at: at(-11, '16:40'), detail: 'CMP-002 rejected at the compliance gate: promotional material bound for the Kingdom with no SFDA registration number (POL-009, LGL-013). Non-waivable.', createdAt: at(-11, '16:40'), updatedAt: at(-11, '16:40') },
  { id: 'ADT-014', actorStakeholderId: 'STK-006', action: 'approval.rejected', entityType: 'Approval', entityId: 'APR-026', at: at(-11, '16:45'), detail: 'Content CNT-004 version CV-007 rejected on the same finding, in both governing versions.', createdAt: at(-11, '16:45'), updatedAt: at(-11, '16:45') },
  { id: 'ADT-015', actorStakeholderId: 'STK-008', action: 'activity.blocked', entityType: 'CampaignActivity', entityId: 'ACT-004', at: at(-10, '09:00'), detail: 'Al-Nakheel credentials pack moved to Blocked pending the SFDA registration number.', createdAt: at(-10, '09:00'), updatedAt: at(-10, '09:00') },
  { id: 'ADT-016', actorStakeholderId: 'STK-003', action: 'approval.escalated', entityType: 'Approval', entityId: 'APR-006', at: at(-4, '08:00'), detail: 'Escalated to the CMO: registration application still not filed and the suppliers conference is four weeks out.', createdAt: at(-4, '08:00'), updatedAt: at(-4, '08:00') },
  { id: 'ADT-017', actorStakeholderId: 'STK-004', action: 'crisis.declared', entityType: 'CrisisIncident', entityId: 'CRI-003', at: at(-6, '14:00'), detail: 'Adverse event signal cluster declared at High severity; regulator notified the same day and the war room assembled on the crisis workflow.', createdAt: at(-6, '14:00'), updatedAt: at(-6, '14:00') },
  { id: 'ADT-018', actorStakeholderId: 'STK-007', action: 'communication.paused', entityType: 'Communication', entityId: 'COM-009', at: at(-6, '16:20'), detail: 'Second-line HCP email frozen by CRI-003. The freeze is scoped to the product, not to CMP-004.', createdAt: at(-6, '16:20'), updatedAt: at(-6, '16:20') },
  { id: 'ADT-019', actorStakeholderId: 'STK-007', action: 'communication.paused', entityType: 'Communication', entityId: 'COM-008', at: at(-6, '16:20'), detail: 'Congress symposium invitation frozen by CRI-003: the symposium presents the affected product, so it sits inside the product-scoped freeze even though it belongs to another campaign.', createdAt: at(-6, '16:20'), updatedAt: at(-6, '16:20') },
  { id: 'ADT-020', actorStakeholderId: 'STK-007', action: 'communication.paused', entityType: 'Communication', entityId: 'COM-019', at: at(-6, '16:25'), detail: 'Real-world evidence hub send frozen by CRI-003. Six sends across three campaigns are now held.', createdAt: at(-6, '16:25'), updatedAt: at(-6, '16:25') },
  { id: 'ADT-021', actorStakeholderId: 'STK-004', action: 'content.created', entityType: 'Content', entityId: 'CNT-024', at: at(-6, '15:00'), detail: 'Safety signal holding statement drafted in the war room.', createdAt: at(-6, '15:00'), updatedAt: at(-6, '15:00') },
  { id: 'ADT-022', actorStakeholderId: 'STK-004', action: 'approval.approved', entityType: 'Approval', entityId: 'APR-023', at: at(-6, '15:27'), detail: 'Holding statement wording cleared in 22 minutes against the 30-minute crisis SLA.', createdAt: at(-6, '15:27'), updatedAt: at(-6, '15:27') },
  { id: 'ADT-023', actorStakeholderId: 'STK-002', action: 'content.published', entityType: 'Content', entityId: 'CNT-012', at: at(-4, '09:00'), detail: 'HCP safety notification published with the v8 safety block reproduced in full and the national reporting route stated.', createdAt: at(-4, '09:00'), updatedAt: at(-4, '09:00') },
  { id: 'ADT-024', actorStakeholderId: 'STK-006', action: 'approval.changes-requested', entityType: 'Approval', entityId: 'APR-004', at: at(-9, '09:00'), detail: 'Vitalis winter social burst returned: consumer copy named a prescription product, so POL-005 fell away and POL-001 governed the whole piece.', createdAt: at(-9, '09:00'), updatedAt: at(-9, '09:00') },
  { id: 'ADT-025', actorStakeholderId: 'STK-002', action: 'content.rework', entityType: 'Content', entityId: 'CNT-002', at: at(-6, '07:10'), detail: 'Vitalis winter social kit moved to Rework after the brand gate finding.', createdAt: at(-6, '07:10'), updatedAt: at(-6, '07:10') },
  { id: 'ADT-026', actorStakeholderId: 'STK-011', action: 'asset.expired', entityType: 'Asset', entityId: 'AST-008', at: at(-13, '07:00'), detail: 'Model releases lapsed on oncology-congress-portraits-2024.jpg; asset moved to Expired and left linked so the exposure stays visible.', createdAt: at(-13, '07:00'), updatedAt: at(-13, '07:00') },
  { id: 'ADT-027', actorStakeholderId: 'STK-006', action: 'asset.rejected', entityType: 'Asset', entityId: 'AST-017', at: at(-19, '10:00'), detail: 'Shelf composite rejected at catalogue review: the pack shot shows a prescription product beside the Vitalis range, which takes any piece using it out of POL-005.', createdAt: at(-19, '10:00'), updatedAt: at(-19, '10:00') },
  { id: 'ADT-028', actorStakeholderId: 'STK-002', action: 'content.discarded', entityType: 'Content', entityId: 'CNT-026', at: at(-48, '16:00'), detail: 'Earlier-line positioning draft discarded rather than reworked: POL-008 prohibits promoting outside the authorised indication outright, so no compliant version of it exists.', createdAt: at(-48, '16:00'), updatedAt: at(-48, '16:00') },
  { id: 'ADT-029', actorStakeholderId: 'STK-007', action: 'execution.failed', entityType: 'ChannelExecution', entityId: 'CHX-026', at: at(-19, '11:04'), detail: 'French evidence pack mailing failed at the gateway: localized PDF over the distribution partner\'s attachment ceiling. Not retried.', createdAt: at(-19, '11:04'), updatedAt: at(-19, '11:04') },
  { id: 'ADT-030', actorStakeholderId: 'STK-004', action: 'crisis.resolved', entityType: 'CrisisIncident', entityId: 'CRI-004', at: at(-55, '16:00'), detail: 'Gulf cold-chain excursion closed: affected lot quarantined before release, no product reached a vaccination site.', createdAt: at(-55, '16:00'), updatedAt: at(-55, '16:00') },
  { id: 'ADT-031', actorStakeholderId: 'STK-002', action: 'campaign.completed', entityType: 'Campaign', entityId: 'CMP-011', at: at(-10, '18:00'), detail: 'Vitalis Summer Hydration Check-in closed: attributed revenue above target, referral sign-ups at half of it.', createdAt: at(-10, '18:00'), updatedAt: at(-10, '18:00') },
  { id: 'ADT-032', actorStakeholderId: 'STK-006', action: 'policy.updated', entityType: 'Policy', entityId: 'POL-005', at: at(-20, '10:30'), detail: 'Vitalis consumer substantiation standard restated to make the over-the-counter condition explicit: where a piece names a prescription product the override does not apply at all.', createdAt: at(-20, '10:30'), updatedAt: at(-20, '10:30') },
];

/* ------------------------------------------------------------------ */
/* 24. Agent runs — the execution ledger                               */
/*                                                                     */
/* Every "an agent did this" claim in the product resolves to a row     */
/* here. The fifteen A4 productions below each name the content         */
/* version they produced, and `finishedAt` equals that version's        */
/* `createdAt` — so a run cannot claim credit for something that came   */
/* into existence at another time.                                      */
/*                                                                     */
/* Acceptance is derived, not stored: seven of the fifteen produced     */
/* versions sit on content a person has since approved or published.    */
/* The other eight are still awaiting review, which is the honest       */
/* answer and the more interesting one.                                 */
/* ------------------------------------------------------------------ */

/** [runId, producedVersionId, subjectContentId, dayOffset, startHHMM, finishHHMM, confidence] */
const A4_PRODUCTIONS: readonly [string, string, string, number, string, string, number][] = [
  ['ARN-001', 'CV-026', 'CNT-015', -140, '09:52', '10:00', 0.86],
  ['ARN-002', 'CV-031', 'CNT-019', -120, '09:51', '10:00', 0.82],
  ['ARN-003', 'CV-008', 'CNT-004', -108, '09:48', '10:00', 0.79],
  ['ARN-004', 'CV-011', 'CNT-006', -100, '08:56', '09:05', 0.88],
  ['ARN-005', 'CV-016', 'CNT-009', -70, '08:57', '09:05', 0.9],
  ['ARN-006', 'CV-034', 'CNT-021', -68, '09:50', '10:00', 0.77],
  ['ARN-007', 'CV-010', 'CNT-005', -58, '09:49', '10:00', 0.8],
  ['ARN-008', 'CV-018', 'CNT-010', -50, '08:58', '09:05', 0.92],
  ['ARN-009', 'CV-019', 'CNT-010', -48, '08:58', '09:05', 0.87],
  ['ARN-010', 'CV-001', 'CNT-001', -40, '09:12', '09:20', 0.85],
  ['ARN-011', 'CV-015', 'CNT-008', -40, '09:52', '10:00', 0.84],
  ['ARN-012', 'CV-004', 'CNT-002', -38, '09:58', '10:05', 0.71],
  ['ARN-013', 'CV-023', 'CNT-013', -28, '09:51', '10:00', 0.78],
  ['ARN-014', 'CV-003', 'CNT-001', -16, '09:52', '10:00', 0.83],
  ['ARN-015', 'CV-005', 'CNT-002', -6, '06:52', '07:00', 0.68],
];

const a4Productions: AgentRun[] = A4_PRODUCTIONS.map(
  ([id, versionId, contentId, offset, startHHMM, finishHHMM, confidence]) => ({
    id,
    agentId: 'AGT-A4',
    subjectEntity: 'Content' as const,
    subjectId: contentId,
    status: 'succeeded' as const,
    startedAt: at(offset, startHHMM),
    finishedAt: at(offset, finishHHMM),
    outcomeSummary: `Produced content version ${versionId} for ${contentId}.`,
    confidence,
    ruleSetVersion: 'content-studio-2026.07',
    producedEntity: 'ContentVersion' as const,
    producedId: versionId,
    triggeredByStakeholderId: 'STK-002',
    createdAt: at(offset, startHHMM),
    updatedAt: at(offset, finishHHMM),
  }),
);

/* Annotated before sorting: `[...].sort()` returns the array literal's own
 * widened type, so the AgentRun[] annotation would apply to the sort RESULT
 * and `subjectEntity` would infer as string rather than EntityName. */
const unsortedAgentRuns: AgentRun[] = [
  ...a4Productions,

  /* --- A4: one failure ------------------------------------------- */
  {
    id: 'ARN-016',
    agentId: 'AGT-A4',
    subjectEntity: 'Content',
    subjectId: 'CNT-026',
    status: 'failed',
    startedAt: at(-50, '15:10'),
    finishedAt: at(-50, '15:10'),
    error:
      'Variant generation aborted: the source draft promotes the product in an earlier line than the authorised indication, which POL-008 prohibits outright. No compliant variant of it exists, so nothing was written rather than a variant that would fail the same gate.',
    ruleSetVersion: 'content-studio-2026.07',
    triggeredByStakeholderId: 'STK-002',
    createdAt: at(-50, '15:10'),
    updatedAt: at(-50, '15:10'),
  },

  /* --- A1: brand & compliance checks ------------------------------ */
  {
    id: 'ARN-017',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-040',
    status: 'succeeded',
    startedAt: at(-49, '15:40'),
    finishedAt: at(-49, '15:41'),
    outcomeSummary:
      'Blocked: promotion outside the authorised indication. POL-008 prohibits it outright, so there is no remediation short of removing the claim.',
    confidence: 0.97,
    ruleSetVersion: 'brand-guardrails-2026.07',
    triggeredByStakeholderId: 'STK-006',
    createdAt: at(-49, '15:40'),
    updatedAt: at(-49, '15:41'),
  },
  {
    id: 'ARN-018',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-007',
    status: 'succeeded',
    startedAt: at(-14, '08:58'),
    finishedAt: at(-14, '09:00'),
    outcomeSummary:
      'Blocked: promotional material bound for the Kingdom with no SFDA registration number. LGL-013 and POL-009 both fire, neither is waivable.',
    confidence: 0.94,
    ruleSetVersion: 'brand-guardrails-2026.07',
    triggeredByStakeholderId: 'STK-003',
    createdAt: at(-14, '08:58'),
    updatedAt: at(-14, '09:00'),
  },
  {
    // The conditional override, caught by the gate rather than by a reviewer.
    id: 'ARN-019',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-004',
    status: 'succeeded',
    startedAt: at(-9, '08:56'),
    finishedAt: at(-9, '08:58'),
    outcomeSummary:
      'Blocked: Vitalis consumer copy naming a prescription product. The piece falls outside POL-005\'s over-the-counter scope, so the parent rule POL-001 resolves over the whole of it and the consumer substantiation standard does not apply at all. Sent back as CV-005.',
    confidence: 0.93,
    ruleSetVersion: 'brand-guardrails-2026.07',
    triggeredByStakeholderId: 'STK-006',
    createdAt: at(-9, '08:56'),
    updatedAt: at(-9, '08:58'),
  },
  {
    // The pre-check gate on the stalled press release. It passed the piece to
    // Medical with a rights warning attached; nine days later that warning is
    // one of the two things Legal is holding on.
    id: 'ARN-020',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-020',
    status: 'succeeded',
    startedAt: at(-13, '08:04'),
    finishedAt: at(-13, '08:06'),
    outcomeSummary:
      'Pass with one warning: AST-008 rights lapsed on d(-13) and the version still embeds it. A rights warning does not block at this gate, so it is carried forward to Medical rather than swallowed.',
    confidence: 0.89,
    ruleSetVersion: 'brand-guardrails-2026.07',
    triggeredByStakeholderId: 'STK-006',
    createdAt: at(-13, '08:04'),
    updatedAt: at(-13, '08:06'),
  },
  {
    // Recent failure — this is why A1 reports Degraded rather than Active.
    id: 'ARN-021',
    agentId: 'AGT-A1',
    subjectEntity: 'ContentVersion',
    subjectId: 'CV-035',
    status: 'failed',
    startedAt: at(-3, '08:32'),
    finishedAt: at(-3, '08:33'),
    error:
      'Rule resolution failed: the teaser links through to a range page carrying both over-the-counter and prescription products, so the run could not determine whether POL-005 applies. It stopped rather than assuming the consumer standard — guessing the category is the one mistake that would make the override meaningless.',
    ruleSetVersion: 'brand-guardrails-2026.07',
    triggeredByStakeholderId: 'STK-002',
    createdAt: at(-3, '08:32'),
    updatedAt: at(-3, '08:33'),
  },

  /* --- A2: market intelligence ------------------------------------ */
  {
    id: 'ARN-022',
    agentId: 'AGT-A2',
    subjectEntity: 'Competitor',
    subjectId: 'CPT-001',
    status: 'succeeded',
    startedAt: at(-40, '06:00'),
    finishedAt: at(-40, '06:04'),
    outcomeSummary:
      'Three Aurelian moves recorded, including a congress campaign resting on a cross-trial comparison with no head-to-head trial behind it.',
    confidence: 0.73,
    ruleSetVersion: 'market-scan-2026.06',
    createdAt: at(-40, '06:00'),
    updatedAt: at(-40, '06:04'),
  },
  {
    id: 'ARN-023',
    agentId: 'AGT-A2',
    subjectEntity: 'MarketSizing',
    subjectId: 'MSZ-002',
    status: 'succeeded',
    startedAt: at(-40, '06:10'),
    finishedAt: at(-40, '06:12'),
    outcomeSummary:
      'Sizing left unchanged and still flagged as an illustrative placeholder — no licensed source was available to verify against.',
    confidence: 0.38,
    ruleSetVersion: 'market-scan-2026.06',
    createdAt: at(-40, '06:10'),
    updatedAt: at(-40, '06:12'),
  },

  /* --- A3: planning ----------------------------------------------- */
  {
    id: 'ARN-024',
    agentId: 'AGT-A3',
    subjectEntity: 'Idea',
    subjectId: 'IDE-012',
    status: 'failed',
    startedAt: at(-14, '11:02'),
    finishedAt: at(-14, '11:03'),
    error:
      'Scoring aborted: no reach or value input could be resolved for an internal governance idea, and the scorer has no default. The idea is kept at score 0 rather than given a number nothing stands behind.',
    ruleSetVersion: 'planning-2026.06',
    triggeredByStakeholderId: 'STK-002',
    createdAt: at(-14, '11:02'),
    updatedAt: at(-14, '11:03'),
  },
  {
    id: 'ARN-025',
    agentId: 'AGT-A3',
    subjectEntity: 'Idea',
    subjectId: 'IDE-011',
    status: 'succeeded',
    startedAt: at(-33, '07:00'),
    finishedAt: at(-33, '07:03'),
    outcomeSummary:
      'Scored and promoted to CMP-010. Reach and value inputs both resolved from the prior season, so the score rests on something.',
    confidence: 0.69,
    ruleSetVersion: 'planning-2026.06',
    triggeredByStakeholderId: 'STK-002',
    createdAt: at(-33, '07:00'),
    updatedAt: at(-33, '07:03'),
  },

  /* --- A5: corporate communication -------------------------------- */
  {
    id: 'ARN-026',
    agentId: 'AGT-A5',
    subjectEntity: 'CrisisIncident',
    subjectId: 'CRI-003',
    status: 'succeeded',
    startedAt: at(-6, '14:20'),
    finishedAt: at(-6, '14:26'),
    outcomeSummary:
      'Assembled the freeze list: every send naming the affected product, across every campaign — six communications, three campaigns, two campaigns paused. Scope taken from the product, not from the incident\'s campaign.',
    confidence: 0.91,
    ruleSetVersion: 'corporate-comms-2026.07',
    triggeredByStakeholderId: 'STK-004',
    createdAt: at(-6, '14:20'),
    updatedAt: at(-6, '14:26'),
  },
  {
    id: 'ARN-027',
    agentId: 'AGT-A5',
    subjectEntity: 'CoverageItem',
    subjectId: 'COV-002',
    status: 'succeeded',
    startedAt: at(-5, '09:10'),
    finishedAt: at(-5, '09:12'),
    outcomeSummary:
      'Negative coverage on the signal cluster matched to CRI-003 and to the paused second-line sends. Sentiment classified from the headline and standfirst, not inferred from reach.',
    confidence: 0.76,
    ruleSetVersion: 'corporate-comms-2026.07',
    createdAt: at(-5, '09:10'),
    updatedAt: at(-5, '09:12'),
  },

  /* --- A6: orchestration ------------------------------------------ */
  {
    id: 'ARN-028',
    agentId: 'AGT-A6',
    subjectEntity: 'Journey',
    subjectId: 'JRN-001',
    status: 'succeeded',
    startedAt: at(-6, '16:18'),
    finishedAt: at(-6, '16:20'),
    outcomeSummary:
      'Journey paused at the send node: both downstream sends name the affected product and are inside the CRI-003 freeze.',
    confidence: 0.95,
    ruleSetVersion: 'orchestration-2026.07',
    triggeredByStakeholderId: 'STK-007',
    createdAt: at(-6, '16:18'),
    updatedAt: at(-6, '16:20'),
  },
  {
    id: 'ARN-029',
    agentId: 'AGT-A6',
    subjectEntity: 'Communication',
    subjectId: 'COM-015',
    status: 'running',
    startedAt: at(-1, '11:00'),
    ruleSetVersion: 'orchestration-2026.07',
    triggeredByStakeholderId: 'STK-007',
    createdAt: at(-1, '11:00'),
    updatedAt: at(-1, '11:00'),
  },

  /* --- A7: analytics ---------------------------------------------- */
  {
    id: 'ARN-030',
    agentId: 'AGT-A7',
    subjectEntity: 'Campaign',
    subjectId: 'CMP-011',
    status: 'succeeded',
    startedAt: at(-10, '18:00'),
    finishedAt: at(-10, '18:04'),
    outcomeSummary:
      'Close-out read: attributed revenue above target, referral sign-ups at half. Both are true and the campaign report says so rather than choosing the flattering one.',
    confidence: 0.84,
    ruleSetVersion: 'analytics-2026.07',
    createdAt: at(-10, '18:00'),
    updatedAt: at(-10, '18:04'),
  },
  {
    id: 'ARN-031',
    agentId: 'AGT-A7',
    subjectEntity: 'KPI',
    subjectId: 'KPI-002',
    status: 'succeeded',
    startedAt: at(-3, '06:05'),
    finishedAt: at(-3, '06:07'),
    outcomeSummary:
      'Reach flagged at risk: the last two weekly points fall against a rising trend, and both fall inside the CRI-003 freeze window.',
    confidence: 0.8,
    ruleSetVersion: 'analytics-2026.07',
    createdAt: at(-3, '06:05'),
    updatedAt: at(-3, '06:07'),
  },

  /* --- A8: copilot ------------------------------------------------- */
  {
    // Queued, not running: nothing has begun, and the ledger says so rather
    // than showing a spinner over an empty result.
    id: 'ARN-032',
    agentId: 'AGT-A8',
    subjectEntity: 'CrisisIncident',
    subjectId: 'CRI-003',
    status: 'queued',
    startedAt: at(-1, '17:40'),
    triggeredByStakeholderId: 'STK-001',
    createdAt: at(-1, '17:40'),
    updatedAt: at(-1, '17:40'),
  },
];

export const agentRuns: AgentRun[] = unsortedAgentRuns
  .slice()
  .sort((a, b) => a.startedAt.localeCompare(b.startedAt, 'en-US'));

/* ------------------------------------------------------------------ */
/* 25. Reference data carried unchanged from the shared layer          */
/* ------------------------------------------------------------------ */

export const lifecycleStages = [...sharedLifecycleStages];
export const marcomAgents = [...sharedMarcomAgents];
export const positioningFrameworks = [...sharedPositioningFrameworks];

/**
 * Runtime-only collection, seeded empty in every pack. AI review runs are
 * created by the app, not by the seed — an `AIReview` in a seed file would be
 * a review nobody ran.
 */
export const aiReviews: SeedDB['aiReviews'] = [];

/* ------------------------------------------------------------------ */
/* 26. Pack assembly                                                   */
/* ------------------------------------------------------------------ */

/**
 * The Pack C database.
 *
 * Not frozen here: freezing is `src/data/seed/index.ts`'s job, and it does it
 * once for whichever pack it selects. Freezing twice would be harmless but
 * would put the decision in two places.
 */
export const lifesciencesPack: SeedDB = {
  org: organization,
  businessUnits,
  brands,
  regions,
  stakeholders,
  agencies,
  ideas,
  strategies,
  campaigns,
  campaignActivities,
  briefs,
  communications,
  channelExecutions,
  channels,
  contents,
  contentVersions,
  assets,
  audiences,
  segments,
  workflows,
  workflowStages,
  approvals,
  policies,
  notifications,
  budgets,
  kpis,
  metricResults,
  auditRecords,
  journeys,
  events,
  crisisIncidents,
  mediaContacts,
  coverageItems,
  suppressionEntries,
  consentSummaries,
  customerPersonas,
  competitors,
  marketTrends,
  shareOfVoice,
  aiReviews,
  lifecycleStages,
  marcomAgents,
  agentRuns,
  jurisdictions,
  legalClauses,
  glossaryTerms,
  positioningFrameworks,
  messagingHouses,
  marketSizings,
  budgetScenarios,
  channelConstraints,
  benchmarks,
  playbookPatterns,
};

export default lifesciencesPack;
