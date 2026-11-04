# Gap register — MarCom module spec (v1.0, Aug 2026) vs. the built demo

Every item below is **absent** or **materially partial** in the current app. Requirement IDs trace to the spec. Items the spec marks Could/phase-2 are tagged as such.

Legend: **✗** absent · **◐** partial (something exists, but not to the requirement)

---

## Cross-cutting gaps (affect every agent)

| ID | Gap | State |
|---|---|---|
| NFR-01..05 | **Arabic / bilingual parity** — RTL layout, diacritics, dialect awareness, Arabic OCR, language-specific model routing (ALLaM), bilingual asset handling, Hijri calendar and Arabic numerals. Localization offers en-GB/de-DE/fr-FR/ja-JP/hi-IN only | ✗ |
| FR-CP-01..06 | **MarCom Copilot (A8)** — conversational interface, intent routing, session context, bilingual interaction, decision explanation on request, guided multi-step journeys. No conversational surface exists | ✗ |
| GR-01, IR-05, AS-01 | **Native BPMN engine** — spec requires all approvals modelled/executed in the platform BPMN engine with no parallel workflow tooling. We built a bespoke workflow designer, which is the tooling the spec excludes | ✗ |
| DR-01..14 | **Knowledge layer** — versioned stores with effective-dating, RAG grounding with every output traceable to source, data-quality/freshness scoring, consent enforcement at query time, residency, retention/purge, named store owners | ✗ |
| IR-01..26 | **All integrations** — DAM, LLM endpoints, SSO, notifications, CDP/CRM, email, CMS, intranet, design tools, social, ads, analytics, media monitoring, market data, finance/ERP, PR wires; plus connector framework, event/polling/batch modes, graceful degradation, health monitoring, secrets vault, rate limiting/retry/idempotency. Platform names appear as labels only | ✗ |
| NFR-06..13 | **AI quality & trust** — confidence thresholds routing low-confidence to humans, source citation or "generated, unverified" marking, evaluation harness with labelled test sets, hallucination controls, bias testing, model version pinning, governed/versioned prompt management, feedback capture | ✗ |
| NFR-14..20 | **Security & privacy** — PDPL/GDPR compliance, residency, encryption at rest/in transit, PII minimisation in prompts, no-third-party-training guarantee, prompt-injection guardrails, audit retention | ✗ (backend) |
| NFR-21..25 | **Performance & scale** — validation SLA, bulk/batch validation, multi-tenant isolation, horizontal scaling | ✗ (backend) |

---

## A1 — Brand Governance Agent

| ID | Gap | State |
|---|---|---|
| FR-BG-01 | Ingest brand guidelines from PDF/Figma/DAM/Word → machine-readable rules | ✗ |
| FR-BG-02 | Rulebook completeness: clear-space and minimum-size rules, messaging pillars | ◐ |
| FR-BG-03 | Approved reference assets as validation ground truth — logo variants, font files, colour values in HEX/RGB/CMYK/Pantone | ✗ |
| FR-BG-04 | Sub-brand, co-brand and regional variants with inheritance/override | ✗ |
| FR-BG-05 | Effective-from dating and change history on rulebook changes (approval routing exists) | ◐ |
| FR-BG-06 | Grandfathering policies for legacy assets | ✗ |
| FR-BG-07 | Event-triggered validation on ingestion; formats beyond text — image, email, HTML, PDF, document, video | ◐ |
| FR-BG-08 | **Logo detection** — presence, correct variant, placement, clear space, minimum size, distortion, unapproved alteration | ✗ |
| FR-BG-09 | **Typography checks** — approved families, weights, hierarchy, minimum legible sizes | ✗ |
| FR-BG-10 | **Colour compliance** with tolerance thresholds + WCAG AA contrast ratios | ✗ |
| FR-BG-11 | Imagery checks — style, licensing status, prohibited content, cultural appropriateness | ✗ |
| FR-BG-12 | Confidence score per verdict and **visual annotation of the failure location** | ◐ |
| FR-BG-13 | Configurable accuracy thresholds per check type and asset quality tier | ✗ |
| FR-BG-14 | Labelled evaluation set and validator accuracy reported over time | ✗ |
| FR-BG-15 | **Legal content library** versioned by jurisdiction, language, product category and channel (we have one disclaimer policy) | ✗ |
| FR-BG-16 | Completeness, currency and placement of legal text; **OCR of text inside images** | ◐ |
| FR-BG-18 | **Legal-flagged failures cannot be waived by marketing roles** — not enforced anywhere | ✗ |
| FR-BG-19 | Jurisdiction rule sets (KSA, GCC, EU) auto-selected by target market (one EU-region branch exists) | ◐ |
| FR-BG-20 | Immutable audit evidence of every compliance check for regulatory defence | ◐ |
| FR-BG-21 | Grammar, spelling, readability and terminology consistency review | ✗ |
| FR-BG-22 | Tone-of-voice **scored** with rationale (finding exists, no score) | ◐ |
| FR-BG-23 | Inclusiveness and bias review with market-specific sensitivity rules | ✗ |
| FR-BG-24 | Flag unverifiable factual claims for human verification (only performance claims are caught) | ◐ |
| FR-BG-25 | Approved terminology/glossary incl. transliteration rules | ✗ |
| FR-BG-26 | Scheduled re-scanning of the full asset library against the current rulebook | ✗ |
| FR-BG-27 | Detect assets made non-compliant by a rulebook change (rights-expiry exists; rulebook-change impact does not) | ◐ |
| FR-BG-28 | Detect unauthorised/outdated brand usage on owned digital properties | ✗ (Could) |
| FR-BG-29 | Brand health dashboard — compliance rate, top failure categories, time-to-remediation, trend | ◐ |

## A2 — Market Intelligence Agent

| ID | Gap | State |
|---|---|---|
| FR-MI-01 | Retrieve/synthesise research from licensed, internal and approved public sources | ✗ |
| FR-MI-02 | Market briefs with **source citation and confidence**; never unsourced assertions | ✗ |
| FR-MI-03 | Trend analysis with time-series context and directional commentary (static charts + insight line exist) | ◐ |
| FR-MI-04 | Market sizing TAM/SAM/SOM with stated methodology | ✗ |
| FR-MI-05 | Ingestion of client/analyst research documents | ✗ |
| FR-MI-06 | Ingest customer data from CDP/CRM/analytics/warehouse | ✗ |
| FR-MI-07 | **Generate** personas from demographic/behavioural/transactional/engagement data (ours are static records) | ✗ |
| FR-MI-08 | Aggregate-only construction with minimum cohort size | ✗ |
| FR-MI-09 | Consent status and PDPL/GDPR enforcement in persona processing | ✗ |
| FR-MI-10 | Persona enrichment from interviews, surveys, sales feedback | ✗ |
| FR-MI-11 | Persona versioning, refresh cadence, drift flagging | ✗ |
| FR-MI-12 | Persona → journey-stage mapping (channel preference exists) | ◐ |
| FR-MI-13 | Data-readiness and confidence score per persona | ✗ |
| FR-MI-14 | Competitor tracking from licensed sources (ours is a static curated set) | ◐ |
| FR-MI-15 | Comparative **positioning maps** (share of voice exists) | ◐ |
| FR-MI-16 | Alerting on material competitor moves | ✗ (Could) |

## A3 — Product Marketing Planning Agent

| ID | Gap | State |
|---|---|---|
| FR-PP-01 | Positioning/value props **per persona and per market** using configurable frameworks (ours are one static set per strategy) | ◐ |
| FR-PP-02 | Framework library — positioning statement, value proposition canvas, messaging house, JTBD + enterprise templates | ✗ |
| FR-PP-03 | Messaging hierarchies — primary message, proof points, objection handling, proof assets | ✗ |
| FR-PP-04 | GTM plan depth — message-per-channel, dependencies (segments/timeline/KPIs exist) | ◐ |
| FR-PP-06 | Budget allocation by **channel, market and period** (BU/campaign only) | ◐ |
| FR-PP-08 | Scenario comparison (conservative/base/aggressive) with sensitivity analysis | ✗ |
| FR-PP-09 | Conflict detection across **markets and channels** (audience-collision detection exists) | ◐ |
| FR-PP-10 | Configurable spend thresholds and delegation rules on plan/budget approval | ◐ |
| FR-PP-11 | Demand and revenue forecasting | ✗ (Could / phase 2) |
| FR-PP-12 | Plan-versus-actual tracking with material-variance flagging (budget variance only) | ◐ |

## A4 — Content Studio Agent

| ID | Gap | State |
|---|---|---|
| FR-CS-01 | Generation across the full format set — landing pages, ad copy, blog articles, product descriptions, sales collateral | ◐ |
| FR-CS-02 | **Persona-specific and channel-specific variants from a single brief** | ✗ |
| FR-CS-03 | Apply approved terminology and messaging hierarchy at generation time (voice only) | ◐ |
| FR-CS-04 | Full multilingual generation — native quality per language, not translation-after-the-fact | ✗ |
| FR-CS-05 | Real transcreation — idiom, cultural reference, imagery guidance, RTL layout (ours is a labelled simulation) | ◐ |
| FR-CS-06 | Channel constraints enforced at generation — character limits, subject-line length, ad-platform policy, accessibility | ✗ |
| FR-CS-07 | Structured content metadata for downstream DAM/CMS | ◐ |
| FR-CS-08 | A/B and multivariate variant generation with an explicit hypothesis per variant | ✗ |
| FR-CS-09 | Iterative refinement — accept feedback and regenerate while preserving approved elements | ✗ |
| FR-CS-10 | Creative brief generation for design teams with asset specifications | ✗ |
| FR-CS-11 | Image generation with mandatory brand validation before use | ✗ (Could) |
| FR-CS-12 | Provenance — which model, which prompt, which human edits (AI-draft flag + version history only) | ◐ |

## A5 — Corporate Communication Agent

| ID | Gap | State |
|---|---|---|
| FR-CC-03 | Mandatory compliance-review routing for investor/regulatory comms (lane exists, routing rule does not) | ◐ |
| FR-CC-04 | **Executive voice profiles** calibrated from a corpus per named leader | ✗ |
| FR-CC-06 | Sensitivity classification by topic — restructuring, personnel, legal, financial — forcing elevated approval and excluding autonomous drafting | ◐ |
| FR-CC-07 | Audience-tailored versions of one message (employee/customer/partner/media/investor) with consistent core facts | ✗ |
| FR-CC-08 | Communications archive used as a **corpus** for voice calibration and precedent lookup (archive exists, unused) | ◐ |
| FR-CC-10 | Q&A and briefing notes accompanying major announcements | ✗ (Could) |

## A6 — Campaign Orchestration Agent

| ID | Gap | State |
|---|---|---|
| FR-CO-01 | Convert an approved brief into channel-specific execution tasks with dependencies and sequencing | ◐ |
| FR-CO-02 | **Push approved content to channel platforms as drafts** — the core of this agent | ✗ |
| FR-CO-03..06 | Email platform, CMS, social publishing and ad platform integration | ✗ |
| FR-CO-08 | Surface blockers and delays per channel (status only) | ◐ |
| FR-CO-09 | Rollback and content recall workflows (crisis pause/freeze exists) | ◐ |
| FR-CO-10 | Audience segment handoff to channel platforms with consent enforcement | ✗ |
| FR-CO-11 | Validate assembled, channel-rendered output (full email template, live page) before launch | ✗ |

## A7 — Marketing Analytics Agent

| ID | Gap | State |
|---|---|---|
| FR-MA-01 | Ingest performance data from channel platforms, web analytics, CRM and finance | ✗ |
| FR-MA-03 | Attribution model **limitations clearly stated** (five models exist) | ◐ |
| FR-MA-04 | CPL, CAC, CPA, ROAS; breakdown by market and persona (ROI by campaign/BU exists) | ◐ |
| FR-MA-06 | Anomaly and material-deviation detection with alerting | ✗ |
| FR-MA-07 | Performance analysis **by persona and by message** | ✗ |
| FR-MA-08 | Feed validated learnings back into persona refresh, positioning and planning — the Learn stage | ✗ |
| FR-MA-09 | Media coverage/sentiment from licensed feeds (ours is static seed) | ◐ |
| FR-MA-10 | Benchmark and playbook library of proven campaign patterns | ✗ (Could) |

## Workflow & governance

| ID | Gap | State |
|---|---|---|
| GR-02 | Approval matrices configurable by campaign value, market, risk classification and spend threshold | ◐ |
| GR-03 | Verdicts as gate conditions with **auto-advance on pass** (route-back on block exists) | ◐ |
| GR-04 | Quorum and any-of approval patterns (parallel groups exist) | ◐ |
| GR-05 | Out-of-office reassignment | ◐ |
| GR-07 | **Legal/regulatory failures never waivable by marketing roles, under any configuration** | ✗ |
| GR-08 | Audit trail carrying rule version and model version; immutability | ◐ |
| GR-09 | Enterprise identity alignment and **segregation of duties** between creator and approver | ◐ |
| GR-11 | Human override captured and reportable as a metric | ◐ |

## Usability & module framing

| ID | Gap | State |
|---|---|---|
| NFR-26 | Validation failures presented **visually with the problem area annotated** | ✗ |
| NFR-27 | Specific actionable remediation guidance on every rejection (messages are diagnostic, not prescriptive) | ◐ |
| NFR-29 | WCAG 2.1 AA compliance audited (a11y pass done, not audited to AA) | ◐ |
| §1, §2 | Module identity — name is **MarCom** (one m), tagline **"Brand to Demand"**, family framing "Enterprise Singularity Platform" | ✗ |
| §3 | The **eight-stage Brand-to-Demand lifecycle** (Govern → Understand → Plan → Create → Comply → Activate → Measure → Learn) as the organising spine | ✗ |
| §4 | Five of eight agents unsurfaced (A2 Market Intelligence, A4 Content Studio, A6 Campaign Orchestration, A7 Marketing Analytics, A8 Copilot); A1 named "Brand Execution" instead of "Brand Governance" | ◐ |
| §10 | Success-metric instrumentation — first-pass compliance rate, cycle time, override rate, adoption | ✗ |
