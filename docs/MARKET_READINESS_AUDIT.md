# MarComm Market-Readiness Gap Report — Pass 1 (partial coverage)
**Chief Product Officer — Final Assessment**
*233 evidence-scored capabilities, verified against source.*

> **Coverage caveat.** The orchestration auditor failed mid-stream, so this pass has no
> dedicated coverage of journey runtime, cross-channel orchestration, contact policy /
> frequency capping, consent enforcement or personalization — those areas appear only
> incidentally via neighbouring domains. See `MARKET_READINESS_AUDIT_PASS2.md` for the
> complete seven-domain pass. This document is retained because it scored more
> capabilities overall and contains findings the second pass does not.

---

## 1. VERDICT

This is an exceptionally well-modelled, well-documented, thoroughly tested **demonstration of a marketing platform that contains no marketing platform** — there is no backend, no network layer (zero `fetch`/`axios`/`WebSocket` calls across 59k lines), no authentication (`localStorage['marcomm-role']`, `src/lib/rbac.ts:160`), no addressable person anywhere in the 52-collection SeedDB, and no event layer, which means the four foundations every capability in the product depends on are all absent simultaneously. It demos impressively — the deterministic AI review engine (`src/services/ai/simulated.ts`, 1,748 lines, 46 tests), the jurisdiction × locale × channel legal-clause library with supersession, the content provenance chain, the crisis send-freeze, and the empty-state/permission-denied UX are genuinely better than most shipped products in this category. It would fail a real enterprise deployment on day one at three separate gates before functional evaluation even begins: security review (any visitor can become Platform Admin from devtools), compliance review (the runtime audit trail is `useState<AuditEntry[]>` capped at 500, destroyed on refresh, while `page-help.ts:1989` promises it is "never updated or user-deletable" with before/after diffs), and scale (zero pagination anywhere, zero sorting, linear scans and `.find()` joins inside render). The most dangerous class of defect is not the absent features but the **false assurances**: `ContentDetail.tsx:239-243` feeds POL-007/008/010 — all `enforcement: 'block'`, all with zero implemented rules — into a review that then toasts "all checks passed"; `refreshPersona` toasts "re-cut from consented aggregates" while writing only a version integer; competitor share-of-voice is manufactured from move counts and plotted on an axis labelled "Share of voice: X%". Six seeded campaigns show `Live` and 23 show `Completed` when no user action can ever produce either state — the demo depicts a lifecycle the code cannot run, and that gap between depiction and implementation is the single biggest commercial risk in this codebase.

---

## 2. CAPABILITY MATURITY MATRIX

Sorted ascending by score within each domain. Capabilities scoring 4 are collapsed into the "already strong" list beneath.

| Domain | Capability | Score | Enterprise ready? | Evidence |
|---|---|---|---|---|
| Domain model | Product entity | 0 | No — absent | No Product in SeedDB; products live inside segment criteria strings ("owns_product IN (…)") |
| Domain model | Outcome / benefit realisation | 0 | No — absent | No Outcome/Benefit/Learning collection; `PlaybookPattern.liftPct` authored, not measured |
| Domain model | Asset record | 1 | No | `types.ts:521-528` — 5 fields, no altText, no file, no licence terms |
| Domain model | Event entity | 1 | No | `types.ts:980-993` — calendar row only; no registration/attendee/session |
| Domain model | Agency, Vendor, Budget | 1 | No | `types.ts:267-271` Agency = 3 fields; no Vendor entity; Budget has no actuals/currency |
| Domain model | Audience entity | 2 | No | `types.ts:534-539` — union-only composition, no exclusion algebra, no unique reach |
| Domain model | CustomerPersona | 2 | Demo-only | `types.ts:566-593` — every quantitative field an authored literal; refresh re-derives nothing |
| Domain model | Org backbone (BU/Region/Brand) | 2 | No | No Country entity; Region = `{name, code}` × 3; BU flat |
| Domain model | Campaign / Activity / Brief | 3 | Partial | `types.ts:357-400` — no parent campaign, no milestones, no dependencies, no plan versioning |
| Domain model | Communication + ChannelExecution | 3 | Partial | `types.ts:406-452` — no delivery result, no retry lineage, status never advances |
| Domain model | Content / ContentVersion / provenance | 3 | Partial | `types.ts:458-519` — strong lineage; no translation-status, no taxonomy, no review-due |
| Domain model | Workflow / Stage / Approval | 3 | Partial | `types.ts:659-691` — no engine, no delegation, no escalation target, no quorum |
| Domain model | KPI + MetricResult fact layer | 3 | Partial | `metrics.ts:473-490` — weekly campaign×channel only, no currency, no source/freshness |
| Customer data | Unified customer profile / identity | 0 | No — foundation gap | No Customer/Contact/Person in `types.ts:1116-1176` |
| Customer data | Dynamic audience membership | 0 | No | `graphSelectors.ts:222-224` `segmentSize()` returns a seeded integer; criteria string never parsed |
| Customer data | Communication / engagement history | 0 | No | Zero MetricResult rows carry `communicationId`; no per-contact events |
| Customer data | Consent, preferences, subscription | 1 | No | `ConsentSummary` is one `optedInPct` per segment×channel; no per-person proof |
| Event layer | Behavioural event store / bus | 0 | No — foundation gap | Grep `eventBus\|emitEvent\|publish(\|subscribe(` returns nothing |
| Event layer | Journey triggers and runtime | 0 | No | `JourneyNode` trigger nodes have empty config; `splitPct` never applied; no member entry |
| Knowledge graph | Generic traversal (linksTo/linksFrom) | 2 | Partial | `graphSelectors.ts:27-58` — 28 of 52 collections; `rowsOf` returns `[]` silently |
| Knowledge graph | Asset-withdrawal impact | 2 | No | `graphSelectors.ts:139-155` — channels and regions never computed; two divergent implementations |
| Data quality | Duplicate / orphan / staleness | 1 | No | One orphan selector (`strategySelectors.ts:57`); help copy promises five behaviours that don't exist |
| Data quality | Referential integrity | 2 | Partial | `seed/index.ts:127-482` runs DEV-only over the frozen seed; `updateIn` validates nothing |
| Data consistency | Single read-side | 2 | Partial | 11 surfaces still call `getSeedDB()` directly; PerformancePage never sees promoted campaigns |
| Data consistency | Metric reconciliation | 2 | Partial | `kpiSummary.avgEngagementRate` is an unweighted mean of rate rows across weeks and volumes |
| Content supply chain | Content intake (create a record) | 0 | No | Zero `contents.createIn` in the repo; ContentList is read-only |
| Content supply chain | Routing content into review | 0 | No | "route it for approval" exists only as toast strings (`ContentDetail.tsx:227`, `:358`) |
| Content supply chain | Production workflow / WIP | 1 | No | No entity carries a stage; assignment is to `AppRole`; no due date on any work item |
| Content supply chain | Lifecycle model (8 stages) | 2 | Demo-only | `LifecyclePage.tsx:84-104` — stepper renders the lifecycle, nothing runs it |
| Content supply chain | Real state transitions | 2 | Partial | Only `Approved`/`Rework` reachable of 8 ContentStatus values |
| Content supply chain | Activation / distribution | 2 | Partial | `JourneysChannels.tsx:819-832` — "push" is a local status write; no connector exists |
| Content ops | Human editing (a real editor) | 0 | No | No `contenteditable`/Tiptap/Slate/Quill anywhere; `ContentVersion.body` has no edit path |
| Content ops | Per-content performance | 0 | No | `MetricResult.dimensions` has no `contentId`/`contentVersionId` |
| Content ops | Localization and translation | 1 | No | One hard-coded Arabic sentence; all else `[Simulated transcreation to X]` + English |
| Content ops | Review annotation / comment threads | 1 | No | `Approval.comment?: string` is the entire human review vocabulary |
| Content ops | Reviewer-feedback refinement | 2 | Partial | 6 regexes; unmatched feedback silently falls through to "shorten" (`simulated.ts:1478`) |
| Content ops | AI draft generation | 3 | Demo-only | `simulated.ts:72-116` — template concatenation; same input, byte-identical output |
| DAM | Asset versioning and renditions | 0 | No | No version, parentAssetId, renditions or AssetVersion entity |
| DAM | Asset upload and file handling | 1 | No | No `type="file"`, no FileReader, no blob, no `<img>` — a DAM with no assets in it |
| DAM | Asset metadata / tags / taxonomy | 1 | No | Five fields total; no tags, keywords, altText, credit, custom fields |
| DAM | Asset search / filtering / collections | 1 | No | No search box on the library; collections are a derived predicate, not an object |
| DAM | Asset usage tracking | 1 | No | `'In Use'` is a status no code writes; no download/view counts, no `assetId` in metrics |
| DAM | Asset lifecycle / brand checklist | 2 | Demo-only | `AssetLibrary.tsx:245-255` — 5 hard-coded attestations about a file the system never saw |
| DAM | Rights, expiry, rights intelligence | 3 | Partial | Expiry threaded across 4 surfaces; never enforced — an Expired asset stays referenceable |
| DAM | Asset expiry impact analysis | 3 | Partial | Content ✓ Versions ✓ Campaigns ✓ Comms ✓(one surface) Channels ✗ Regions ✗ |
| Brand intel | Policy coverage POL-006..010 | 0 | No — actively unsafe | `simulated.ts:531-1045` implements POL-001..005; no else branch, no "not evaluated" |
| Brand intel | Violation classes vs expectation | 2 | Partial | Copy mechanics only; logo/colour/typography/imagery checks are zero |
| Brand intel | Executable brand rule engine | 3 | Partial | Real deterministic engine; rules are TypeScript constants — every rulebook is a deploy |
| Brand intel | Glossary / terminology enforcement | 3 | Partial | 10 terms, locale-filtered, Unicode-aware; no authoring, no import, no per-brand lexicon |
| Brand intel | Brand health, scoring, re-scan | 3 | Partial | Magic-number weights; failure categories rank typography noise above legal blocks |
| Multimodal | Image / video / audio handling | 0 | No — out of reach | `reviewContent` takes only `title` and `body`; no parameter a pixel could arrive through |
| Generative AI | Text draft generation | 1 | Demo-only | No model, no prompt, no inference call anywhere in the repo |
| Generative AI | Email/social/corporate/investor gen | 1 | No | All four commsTypes route through one template (`CommunicationsPage.tsx:106-152`) |
| Generative AI | Executive / board narrative | 1 | Demo-only | Four derived clauses; a sentence-shaped restatement of the tiles above it |
| Generative AI | Localization / transcreation | 1 | No | Backed by a single hard-coded Arabic string — highest-risk "looks done" surface |
| Generative AI | Refinement with verbatim preservation | 1 | Partial | Preservation guarantee is real; feedback is pattern-matched, never read |
| Generative AI | Campaign proposal from an idea | 2 | Partial | Budget = brand mean × idea score; "estimatedRoi" is a backward-looking historical mean |
| Generative AI | Creative brief generation | 2 | Partial | Genuine graph composer; pixel specs are a hard-coded 9-entry table |
| Generative AI | Persona / channel variants | 2 | Partial | Constraint engine real; copy differs by one interpolated sentence |
| Intelligence AI | Competitive / market alerting | 1 | Demo-only | Bag-of-words overlap over hand-seeded moves; no ingestion of any kind |
| Intelligence AI | Anomaly detection | 2 | Partial | Fixed 20% band, no variance/z-score/seasonality — alert fatigue and misses together |
| Intelligence AI | Performance explanation / learn loop | 2 | Partial | Exactly four learnings, always; no significance test, no sample-size guard |
| Intelligence AI | Copilot Q&A / explanation | 2 | Partial | 11 regex intents; confidence is a literal per branch; takes no action |
| Decisioning | WHEN — send-time optimisation | 0 | No | No implementation; weekly metric grain means the data to build it is absent too |
| Decisioning | HOW OFTEN — frequency / fatigue | 0 | No | No contact-frequency ledger, no cap policy, no saturation model |
| Decisioning | WHICH VARIANT — experiment assignment | 0 | No | `page-help.ts:1590` documents deterministic splits and audit-logged winners; zero code |
| Decisioning | WHO — audience recommendation | 1 | No | Keyword match with `db.audiences[0]` fallback |
| Decisioning | WHICH CHANNEL — channel recommendation | 1 | No | Always returns email+social; reads zero performance data on a page showing attribution |
| Decisioning | Acting on a recommendation | 1 | Partial | Exactly one human-in-the-loop path (idea → campaign); everything else is a nav link |
| Agentic | Agent creates tasks / work items | 0 | No | No Task entity exists to create |
| Agentic | Agent prepares approval packages | 0 | No — governance defect | ApprovalsInbox references no aiReview, findings, scores or provenance |
| Agentic | Governed agent roster | 1 | Demo-only | 8 agents, 32 capability sentences, no scheduler/queue/trigger/run record |
| Agentic | Agent creates campaign drafts | 1 | Partial | Best agentic story in the build; still a button calling a pure function |
| Agentic | Agent identifies expiring assets | 1 | Partial | A date filter on one field under an agent capability bullet |
| Agentic | Batch remediation re-scan | 2 | Partial | Real fan-out of the rule engine; synchronous, main-thread, manual, no baseline |
| Guardrails | Policy coverage (POL-006..010) | 0 | No — actively unsafe | Three block-enforced policies produce nothing and report "all checks passed" |
| Guardrails | Hallucination / factual grounding | 0 | No — gates the LLM story | No retrieval, no fact register, no citation enforcement, no contradiction detection |
| Guardrails | Sensitive-information / PII detection | 0 | No — disqualifying | POL-010 is `block` with zero rules; no pattern matching, no cross-classification leak check |
| Guardrails | Claims substantiation | 1 | No | One regex, three comparatives, two units; "based on\|tested\|certified" within ±140 chars |
| Guardrails | Accessibility validation | 1 | No | Checks whether copy *mentions* alt text; POL-009 WCAG has no rules |
| Guardrails | Approval gating on AI findings | 2 | Partial | Two enforcement call sites; scores drive no threshold; approver sees no findings |
| Guardrails | Brand voice / inclusive / readability | 3 | Partial | Deepest rule set in the app; banned terms and trademarks compiled into the binary |
| Guardrails | Legal clause library | 3 | Partial | Strongest guardrail; fingerprint matching yields false "missing" and false "present" |
| Guardrails | AI labelling / provenance / disclosure | 3 | Partial | Excellent model; no gate reads it — AI and human versions travel the same path |
| Forecasting | Propensity / likelihood scoring | 0 | No | No feature store, no scoring pipeline, no model output field |
| Forecasting | Saturation / fatigue / churn | 0 | No | No curves, no unsubscribe-risk, no list-health projection |
| Forecasting | Optimal send time | 0 | No | Requires sub-daily grain the fact table does not have |
| Forecasting | Campaign / ROI forecasting | 1 | Demo-only | Real sensitivity math over `expectedRoi` literals typed into `planning.ts:381` |
| Forecasting | Budget reforecast | 1 | Demo-only | "Reforecast" is a labelled numeric input; the variance engine around it is real |
| AI Search | LLM / answer-engine visibility | 0 | No — absent | Zero references; requires the same ingestion tier missing under market intel |
| Experimentation | Experiment entity and lifecycle | 0 | No — schema-level | No experiment/variant/arm/assignment collection; no EntityName member |
| Experimentation | A/B & MVT execution | 0 | No | `splitPct` on a node in a graph that is never traversed |
| Experimentation | Holdouts / control groups | 0 | No | Zero matches for holdout/controlGroup; every reported number is correlational |
| Experimentation | Champion / challenger promotion | 0 | No | Only the help-copy claim at `page-help.ts:1590` |
| Experimentation | Statistical confidence | 0 | No — misleading | All `confidence` fields are authored; rendered as "82% confidence" chips |
| Experimentation | Content variant generation | 1 | Partial | Real generator; no variant ever gets a measured result |
| Experimentation | Lift measurement | 1 | No | Two ranking deltas + an authored `liftPct` rendered as "+N% lift" |
| Analytics | Communication analytics | 1 | No | No sends/delivered/bounced/unsubscribed keys — the entire delivery leg is unrepresentable |
| Analytics | Brand analytics | 1 | No | Three unjoined islands; `brand_consideration_pct` is a KPI with zero fact rows |
| Analytics | Audience analytics | 1 | No — dangerous | `accumulateBySubject` splits value evenly across joined subjects; feeds a budget recommendation |
| Analytics | Operational analytics | 2 | Partial | Correct counting; no cycle time, no SLA attainment, no bottleneck analysis |
| Analytics | Business analytics | 2 | Partial | Real CPL/CAC/CPA/ROAS with honest nulls; no retention/CLV; regex-classified lead keys |
| Attribution | Touchpoint provenance | 1 | No | A "touchpoint" is a scheduled send, not a person reached; draft sends earn 0.25 weight |
| Attribution | Conversion linkage | 1 | No | Business-tier revenue never attributed; `campaignRoi` ignores attribution entirely |
| Attribution | Model comparison / spend reconciliation | 2 | Partial | Five models side by side, reconciled to nothing; attributed credit never reaches Budget |
| Attribution | Model calculators (5 models) | 3 | Yes (math) | `attribution.ts:104-166` — credit conservation tested; correct math over the wrong input |
| Feedback loop | Audience refresh from measurement | 0 | No — false outcome | `refreshPersona` toasts "re-cut from consented aggregates"; writes version + timestamp |
| Feedback loop | Measurement → decisioning / alerting | 0 | No | `NotifKind` has no performance or anomaly member; an anomaly reaches nobody |
| Feedback loop | Measurement → planning | 1 | Partial | One real link (proposeCampaign reads `campaignRoi`); scenarios use seeded constants |
| Data model | Fact-table granularity | 1 | No — root cause | Weekly campaign×channel, no denominator, no variance, 10 weeks total |
| Data model | Metric registry integrity | 1 | No | 5,190 seeded `leads` rows silently dropped; 6 of 8 benchmarks unreachable |
| Ideation | Idea capture | 0 | No | No `createIn` on ideas — the front door cannot be opened |
| Ideation | Duplicate detection | 0 | No | No similarity or merge logic anywhere |
| Ideation | Collaboration (comments / votes) | 0 | No | No Comment/Vote/Reaction entity in EntityName |
| Ideation | Idea scoring | 1 | No | A hand-authored 0-100 integer used for sort order |
| Ideation | Prioritization | 1 | No | `.sort((a,b) => b.score - a.score)` is the entire mechanism |
| Ideation | AI enhancement of ideas | 2 | Partial | Proposes a campaign; never enhances, critiques or evidences the idea itself |
| Ideation | Strategic alignment | 2 | Partial | Alignment only visible *after* promotion; objectives are free-text strings |
| Ideation | Convert idea to campaign | 3 | Partial | Real, role-gated; no approval gate, no budget check, campaign born as an orphan |
| Ideation | Idea-to-execution traceability | 3 | Partial | Bidirectional link; trace stops at the campaign boundary |
| Strategy | Objectives (business/comms/marketing) | 1 | No | `objectives: string[]` — no owner, target, measure or cascade |
| Strategy | Audience strategy | 1 | No | Strategy has no audience field; choices are made per-send |
| Strategy | Channel strategy | 1 | No | Channel mix exists only as a reporting cut, never as a plan |
| Strategy | Regional strategy | 1 | No | Region is a filter, not a plan; no market-entry or priority classification |
| Strategy | Budget strategy and scenarios | 2 | Partial | Single allocation axis (campaignId); no channel/market/period/currency |
| Strategy | Brand strategy and architecture | 2 | Partial | `parentBrandId` declared, never resolved — sub-brands silently skip parent guardrails |
| Strategy | Competitive context | 2 | Demo-only | Competitor SoV fabricated from move counts (`MarketIntelPanel.tsx:427-437`) |
| Strategy | Positioning frameworks | 3 | Demo-only | Reference library only; no authoring surface, no stored output |
| Strategy | Messaging house | 3 | Demo-only | Well modelled; read-only, 2 of 5 strategies, no pillar→content link |
| Strategy | KPI strategy | 3 | Partial | Tiered and joined; no ownership, no cascade, no target-change history |
| Strategy | Market sizing (TAM/SAM/SOM) | 3 | Demo-only | Sourced with methodology and confidence; never refreshes, no effective-from |
| Campaign mgmt | Milestones | 0 | No | No Milestone entity, no gate dates, no go/no-go |
| Campaign mgmt | Cloning | 0 | No | Every recurring campaign rebuilt by hand |
| Campaign mgmt | Templates | 0 | No | No way to encode "how we run a product launch here" |
| Campaign mgmt | Recurring campaigns | 0 | No | `always-on` is a label with no generation logic |
| Campaign mgmt | Hierarchy (program/wave/task) | 1 | No | Two levels only (Campaign → Activity); enterprise plans are 4-5 deep |
| Campaign mgmt | Dependencies | 1 | No | `dependsOn` exists only on a transient derived plan |
| Campaign mgmt | Versioning / change history | 1 | No | Runtime audit entry is `Updated CMP-003` with no payload |
| Campaign mgmt | Editing and status transitions | 1 | No | `CampaignDetail.tsx` has no edit control and no mutation call in 616 lines |
| Campaign mgmt | Owners, teams and roles | 2 | No | Team is inferred, not managed; cannot reassign an owner |
| Campaign mgmt | Agencies on campaigns | 2 | No | Seed-only assignment; no SOW, deliverable acceptance or scope |
| Campaign mgmt | Channels and audiences on campaigns | 2 | Partial | No planned audience — only the union of who was contacted |
| Campaign mgmt | Impact analysis | 2 | Partial | Retrospective browsing; no change-impact simulation |
| Campaign mgmt | Conflict detection | 2 | Partial | One dimension (same-audience days); advisory only, nothing blocks |
| Campaign mgmt | Budgets and spend | 3 | Partial | Rich derivation over `spendAllocated` — a plan number, never money that moved |
| Campaign mgmt | Content and brief linkage | 3 | Partial | Full brief→content→version chain; no content requirement/completeness view |
| Campaign mgmt | KPIs and outcomes | 3 | Partial | Rich; no outcome capture at close, no attribution-limitation disclosure |
| Comms entity | Transactional communication | 0 | No | No type, no trigger, no template — cannot be the system of record |
| Comms entity | Communication type taxonomy | 1 | No | Four values carrying no behaviour; regulatory and newsletter share one path |
| Comms entity | Executive communication | 1 | No | No spokesperson/voice profile; masking is cosmetic (seed ships in the bundle) |
| Comms entity | Customer/product/marketing distinction | 2 | No | All collapse to `external`; marketing-vs-transactional consent boundary unprovable |
| Comms entity | Regulatory communication | 2 | Partial | Strong clause matching; advisory only, no routing rule, no retention |
| Comms entity | Core entity + delivery model | 3 | Partial | Right abstraction; "sent" is an assertion with nothing to reconcile against |
| Comms entity | Crisis communication | 3 | Partial | Real freeze; no unfreeze, no playbook library, no notification tree |
| Listening/VoC | Mention capture | 0 | No — no entities | No Mention/Post/Signal entity anywhere |
| Listening/VoC | Topic / theme extraction | 0 | No | No Topic/Theme/Cluster entity; no NLP |
| Listening/VoC | Reviews / surveys / feedback | 0 | No | Only `Idea.source: 'customer-feedback'` as a string |
| Listening/VoC | Sentiment analysis | 1 | No | Hand-seeded 3-value enum rendered as "Positive sentiment: 62%" |
| Listening/VoC | Emerging issue detection | 1 | No | "Crisis watch" is derived from a missing foreign key, not from risk |
| Listening/VoC | Signal → insight → action loop | 1 | Partial | Good evidence-cited recommendations; inputs are internal metrics, nothing persists |
| Listening/VoC | Trend tracking | 2 | Demo-only | 3 curated series with source + confidence but no as-of date |
| PR & media | Media lists | 0 | No | No MediaList/Tier entity |
| PR & media | Pitch management | 0 | No | No Pitch/Outreach/Embargo entity — PR ROI unanswerable |
| PR & media | Competitor coverage tracking | 0 | No | CoverageItem has no competitor dimension |
| PR & media | Editorial planning | 1 | No | No story pipeline, announcement roadmap or embargo sequencing |
| PR & media | Share of voice | 1 | No | Own-brand only, disconnected from coverage; competitor SoV synthesized |
| PR & media | Relationship history | 1 | No | One `lastInteractionAt` timestamp is the entire relationship record |
| PR & media | PR reporting | 1 | No | Three tiles; PR absent from the board pack entirely |
| PR & media | Journalist database | 2 | No | 20 read-only contacts; no create/edit/import, outlet is a string |
| PR & media | Press releases | 2 | Partial | Inherits Content machinery; no dateline/boilerplate/quote approval/embargo |
| PR & media | Coverage monitoring | 2 | Partial | Real register; scoping falls back to journalist region for exactly the crisis items |
| Ops domains | Partner collaboration | 0 | No | No Partner/Vendor entity; co-marketing has no home |
| Ops domains | Resource allocation | 0 | No | No Resource/Assignment/TimeEntry; Stakeholder has no capacity or cost |
| Ops domains | Capacity planning | 0 | No | No capacity/FTE/availability field anywhere |
| Ops domains | Events management | 1 | No | "Run of show" is a date-overlap filter; no registration or lead capture |
| Ops domains | Agency collaboration | 1 | No | 3-field Agency; contacts matched by email-domain string comparison |
| Ops domains | Workload management | 1 | No — misinforms | Counts queued approvals only; treats a one-line brief and a 40-asset campaign as equal |
| Ops domains | Internal communications | 2 | Partial | Membership is a heuristic; an internal message on an email channel disappears |
| Ops domains | Budget management | 3 | Partial | Live reforecast propagation; reconciles to `spendAllocated`, never to a ledger |
| Global enterprise | Multi-organization / tenancy | 0 | No — blocker | `SeedDB.org` is one object, not an array; no tenant discriminator on any entity |
| Global enterprise | Multi-country / local market | 1 | No | Three macro-regions; Germany and Saudi Arabia are the same market to this system |
| Global enterprise | Time zones | 1 | No | `timeZone: "UTC"` hardcoded; no per-user zone; scheduling has no zone intent |
| Global enterprise | Currency / financial localization | 1 | No — correctness bug | One module-level USD formatter; EUR and JPY budgets summed as dollars |
| Global enterprise | Regional / delegated approval routing | 1 | No | `stakeholders.find(s => s.role === …)` — first match wins; no regional approvers |
| Global enterprise | Multi-language / UI localization | 2 | Partial | Excellent content-level i18n; zero UI string catalogue across 27 pages |
| Global enterprise | Multi-BU | 3 | Partial | BU threaded properly; flat, no hierarchy, scope is a filter not an entitlement |
| Global enterprise | Multi-brand / sub-brand inheritance | 3 | Partial | `parentBrandId` never resolved — sub-brand passes review ignoring parent guardrails |
| Global enterprise | Multi-region | 3 | Partial | Consistent many-to-many; no residency, no region-based entitlement |
| Global enterprise | Local regulatory compliance | 3 | Partial | Strongest enterprise-shaped area; `effectiveFrom` stored but never evaluated |
| Governance | Retention and legal hold | 0 | No — legal exposure | `removeFrom` hard-deletes with no hold check; help text claims holds are verified |
| Governance | Audit trail durability | 1 | No — most serious | `useState` array, capped 500, excluded from the persistence effect |
| Governance | AI usage policy / model governance | 1 | No | No model pinning, prompt registry, eval harness or confidence-routing |
| Governance | RBAC | 2 | No | Nav visibility + ad-hoc per-page role literals; no resource×action matrix |
| Governance | ABAC / attribute scoping | 2 | No | Only the Agency role is enforced; `Stakeholder.brandIds` read by nothing |
| Governance | Data classification | 3 | Partial | Consistent Restricted masking; Internal and Confidential are inert |
| Governance | Approval and exception workflow | 3 | Partial | Best machinery in the build; SLA breach and Escalated/Expired never fire |
| Governance | Policy enforcement engine | 3 | Partial | Real and tested; every policy amendment is a code deploy, no rule versioning |
| Global search | Semantic / AI search | 0 | No | `label.toLowerCase().includes(q)` is the entire matching logic |
| Global search | Entity coverage | 1 | No | 6 of 51 entity types; silent 8-per-group cap |
| Global search | Permission scoping | 3 | Partial | Correctly honours RBAC/agency/masking — correct only because coverage is narrow |
| Integration | Connector framework | 0 | No — unstarted | `adapterKey` is printed as table text; no adapter, no secrets, no auth |
| Integration | CRM/CDP/CMS/DAM/ERP/HR | 0 | No | Vendor names inside display strings; `lastRefreshedAt` holds seed literals |
| Integration | Identity provider / SSO / SCIM | 0 | No — procurement gate | Role string in localStorage; `LoginPicker` is a persona switcher |
| Integration | Webhooks / API auth / idempotency | 0 | No | No HTTP client at all; first retry will double-send a campaign |
| Integration | Analytics ingestion | 0 | No | Every KPI tile is a hand-written constant with no "data as of" indicator |
| Integration | Channel delivery | 1 | No | `pushDraft` writes `queued` with no queue behind it; WhatsApp absent entirely |
| Integration | Workflow engine integration | 1 | No — likely rework | Bespoke designer; `mode: 'parallel-group'` stored and never interpreted |
| Reliability | Retry and dead-letter | 0 | No | Five seeded `failed` executions have no action at all — permanent dead end |
| Reliability | Provider failure / rate limit / breaker | 0 | No | No network layer, therefore no timeouts, budgets or breakers |
| Reliability | Failed-communication detection | 1 | No | Nothing in the app can ever set `failed`; the state is seed dressing |
| Reliability | Queue / delivery / job monitoring | 1 | No | Two executions permanently `sending` with no timeout; no worker exists |
| Reliability | Alerting and observability | 1 | No | All 36 notifications are seed constants; nothing watches `rightsExpiry` or `slaDueAt` |
| UX | Pagination | 0 | No — hard failure at scale | `ui/pagination.tsx` imported by zero files; no paging contract to add later |
| UX | Sorting | 0 | No | Zero `sortBy`/`sortKey` matches; all ordering is hardcoded in render |
| UX | Bulk operations | 0 | No | 48 pending approvals must be clicked individually |
| UX | Loading states | 1 | No | 6 of 27 pages; nothing loads, so 21 pages assume synchronous data at first render |
| UX | Form validation | 1 | No | zod + react-hook-form installed, zero usage; `updateIn` accepts `status: "Banana"` |
| UX | Search, filter, contextual actions | 2 | Partial | Free-text search on 3 of 27 pages; filter state not URL-encoded, not shareable |
| UX | Saved views | 2 | Partial | localStorage only — cannot be shared, lost on cache clear |
| UX | Error states | 2 | Partial | Route-scoped boundary + toasts; no data-error class, no correlation ids |
| UX | Accessibility | 2 | No | `aria-live` in one component; no skip link — fails WCAG 2.4.1 and 4.1.3 |
| UX | Responsive behaviour | 2 | Partial | Mobile nav collapses; 12-column tables horizontally scroll, 10px badges |
| Status/lifecycle | Transitions reachable in the UI | 1 | No — demo/code gap | ~12 transitions total; 6 of 9 Campaign states unreachable |
| Status/lifecycle | Exception handling | 1 | No | Cancelled/Killed/Discarded/Expired have no writer; expired rights stay Approved |
| Status/lifecycle | State machine / guard enforcement | 1 | No | A 5-case switch inside a page component; `updateIn` accepts any patch |
| Status/lifecycle | Status model expressiveness | 4 | Model yes, runtime no | Rich unions with no machine behind them |

**Already strong (score 4 — protect through any rework):** persona/channel variant generation with pre-return constraint checking (`simulated.ts:1164-1373`); content provenance and version lineage (`types.ts:471-519`); the legal clause library with jurisdiction precedence, locale/channel scoping and supersession fingerprinting (`simulated.ts:434-506`); approvals and workflow machinery incl. segregation of duties enforced in the handler (`ApprovalsInbox.tsx:238`) and non-waivable legal findings (`GovernancePage.tsx:1662`); crisis incident management with a real send-freeze (`GovernancePage.tsx:1781-1820`); contextual empty states across 28 files; permission-denied UX that names allowed roles (`RequireRole.tsx:26`); and the declared status model itself. **No capability in this codebase scores 5.**

---

## 3. UI WITHOUT LOGIC — DEMO RISK REGISTER

Every capability flagged `uiWithoutLogic: true`. This is the list to rehearse against before any buyer demo.

| Surface | What it appears to do | What actually happens | Risk if a buyer probes it |
|---|---|---|---|
| `AudiencesPage` segment criteria | Evaluates targeting rules to compute segment size | `criteria` is a display-only string in a `<span className="font-mono">`; `segmentSize()` returns a seeded integer | "Change the criteria and recompute" — nothing moves; sizes can never be refreshed |
| `AudiencesPage` audience reach | Unique reach across composed segments | Naive sum (`AudiencesPage.tsx:191-194`); AUD-001's three overlapping Volt segments double-count | Every reach and cost-per-reach figure in the app is inflated; the help text names overlap as the risk |
| `AudiencesPage` consent / suppression | "Every send checks suppression and consent first" (`:688`, `JourneysChannels.tsx:1611`) | No send path exists; consent is a percentage — you cannot exclude 22% without knowing which 22% | DSAR/regulator asks for one per-subject consent proof; there is none |
| `AudiencesPage` persona refresh | "Re-cut from consented aggregates" | Increments `version`, stamps `lastRefreshedAt`, toasts success; recomputes nothing; drift banner can never clear | Reads as a broken feature, not an unbuilt one — worse |
| `AudiencesPage` persona privacy claim | "Built from aggregate cohorts of ≥1,000 consented profiles" (`:1068`) | No profiles exist anywhere in the schema | Unverifiable privacy assurance surfaced in a security review |
| `JourneysChannels` canvas | Active journeys with triggers, conditions, waits, splits | Static graph; trigger nodes have empty config, conditions are untyped strings, `splitPct` unused; no member ever enters | "Show me who's in JRN-001 right now" — nobody, ever |
| `AssetLibrary` upload dialog | Upload an asset | A filename text input; no file picker, no FileReader, no storage | "Upload this PNG" — you type its name |
| `AssetLibrary` brand checklist | 5 brand checks confirmed on approval | Human attestations about a file the system has never seen; toast says "All 5 brand checks confirmed" | Manufactures an audit trail of checks never performed — documented false assurance |
| `AssetLibrary` asset record | Governed digital asset | 5 fields; POL-004 alt-text rule regex-scans body copy for the word "image" | A ContentVersion embedding a real image receives an explicit accessibility **pass** |
| `ContentDetail` compliance check | "Brand & compliance check complete — all checks passed" | POL-007 (ESG), POL-008 (influencer disclosure), POL-010 (consent/PII) are all `block` with zero rules and no "not evaluated" notice | A regulated ESG claim clears a review that reports itself clean |
| `ContentDetail` editor | Author and edit content | No editor of any kind; the only `<Textarea>` is the refinement feedback box | "Fix that typo" — impossible |
| `ContentDetail` route for approval | "Route it for approval like any other draft" | Toast string only; no `approvals.createIn` for content | The flagship AI-drafts/human-approves loop is open at the hand-off |
| `ContentDetail` request localization | Transcreate to a target locale | `[Simulated transcreation to X] + English`, or one hard-coded Arabic sentence | Highest-risk "looks done" screen for any GCC audience |
| `LifecyclePage` 8-stage stepper | Orchestrates the content lifecycle | Informational cards; no entity carries a `stageId`, nothing advances or blocks | "Where is this piece right now?" — the model cannot answer |
| `WorkflowDesigner` | BPMN-style workflow authoring | Structure editing disabled by design (`:47`); `mode: 'parallel-group'` never interpreted; no instance ever created | A parallel review stage behaves identically to a sequential one |
| `CommunicationsPage` AI generation | Type-specific email/social/corporate/investor copy | One template; four types differ only by a closing line from `CLOSING_BY_TYPE` | An investor communication and a newsletter are produced identically — a compliance exposure |
| `MarketIntelPanel` competitor alerts | Detects competitor moves against standing triggers | Bag-of-words overlap over hand-seeded moves; no ingestion of any kind | "How fresh is this?" — as fresh as the last seed edit |
| `MarketIntelPanel` competitor SoV | "Share of voice: X% — derived from N tracked moves" | 100-minus-our-tracked remainder apportioned by move count (`:427-437`) | A fabricated number plotted on an executive-facing measured axis |
| `AgentsPage` roster | 8 governed agents, 32 capabilities | Reference rows; no scheduler, queue, trigger, run record or state | "Show me an agent run" — there is one intent router and seven labels |
| `PerformancePage` learn loop | Persona lift → "refresh positioning for the other personas" | Value split evenly across joined subjects; differences reflect join cardinality | A budget-affecting recommendation derived from a join artefact |
| `PerformancePage` / `MarketIntelPanel` confidence chips | "82% confidence" | Hand-authored analyst literals and per-rule constants | Read as calibrated statistical confidence; it is neither |
| `BudgetPage` reforecast | Reforecast a budget | A single numeric input writing `amountPlanned`; no run-rate, pacing or projection | "Reforecast" is a labelled text box inside a real variance engine |
| `BudgetPage` scenarios | Conservative/base/aggressive ROI modelling | `expectedRoi`/`expectedConversions` are literals in `planning.ts:381` | "Where does 3.4× come from?" — the seed file |
| `PRMediaPage` / help copy A/B claims | A/B/n splits with declared KPI, sample plan, audit-logged winners (`page-help.ts:1590`) | No experiment entity, no assignment, no exposure logging, no promotion code | In an RFP this line becomes a contractual capability claim |
| `GovernancePage` audit tab | Immutable audit trail with before/after diffs (`page-help.ts:1989`) | `useState` array, capped 500, excluded from persistence — emptied on refresh | The single most serious finding for any regulated buyer |
| `AdminPage` / `LoginPicker` sign-in | Role-based login | Writes a string to `localStorage['marcomm-role']` with no verification | Devtools → Platform Admin |
| `AdminPage` role×nav matrix | Enterprise entitlement model | Nav visibility only; per-page role literals scattered across 27 files | Cannot export a provable entitlement matrix for SOX/ISO |
| Topbar brand/BU/region scope | Data scoping, not hidden buttons (`AdminPage.tsx:374`) | A user-clearable filter; `Stakeholder.brandIds` read by nothing | A single-brand manager can clear the filter and read every brand |
| `JourneysChannels` delivery board | Operations console for sends | Static list; two executions permanently `sending`, five `failed` with no action available | An operator would trust it during an incident and get no signal |
| `Channel.adapterKey` (email-sendgrid, press-wire) | Configured connectors | Display strings printed in table cells | "Show me the SendGrid connection" — there is none |
| `CustomerPersona.lastRefreshedAt` / `ConsentSummary.lastRefreshedAt` | Last CDP sync | Seed literals; documented as sync timestamps | Actively misleads a user into believing data is fresh |
| `EventsPage` run of show | Event agenda | A date-overlap filter over campaign activities | Read as an agenda; it is not one |
| `InternalCommsPage` | Employee comms inventory | Membership inferred by heuristic (`campaignType==='internal'` OR intranet channel) | An internal message on an email channel silently vanishes from the workspace |
| `CampaignDetail` | The campaign workspace | 616 lines, no edit control, no mutation call; status only moves via an approval decision | Pausing a live campaign is impossible except as a crisis side effect |
| `StrategyPanel` frameworks / messaging house / market sizing | Strategy authoring | Read-only reference data; no instance is ever filled in or stored | The actual positioning work still lives in slides |
| Campaign activity `dependsOn` | Plan dependencies | Rendered text on a transient derived plan; no persisted dependency model | Moving a date has no consequence anywhere |
| All list pages | Enterprise data tables | No pagination, no sorting, full-array render (90 executions, 52 comms, 48 approvals) | At 10k rows the browser freezes; no paging contract exists to retrofit |
| All forms | Validated data entry | 24 ad-hoc `disabled={!…}` guards; zod installed and unused; `updateIn` untyped | `status: "Banana"` writes successfully |
| All pages | Loaded data with loading states | Nothing loads; 21 of 27 pages assume synchronous constants at first render | Adding a backend requires restructuring components, not adding spinners |

---

## 4. ARCHITECTURAL RISKS (deduplicated, ranked by severity)

**R1 — No backend, no network layer, no data-access seam.** Every collection is a frozen module-level constant (`seed/index.ts:57`); the only write path is React state persisted to `localStorage['marcomm-store']` (`DataStore.tsx:127`). Components import seed arrays directly, so there is no repository or query layer to insert a server behind. *Consequence:* adding persistence is a rewrite of all 27 pages, not a swap of a fetch call — and every capability scored 3+ in this audit is a client-side simulation.

**R2 — No authentication; all access control is decoration.** `localStorage['marcomm-role']` is read back with no verification (`rbac.ts:176`), and the entire seed graph — including every Restricted crisis incident — ships in the JS bundle. *Consequence:* any visitor is Platform Admin in two devtools keystrokes; masking hides DOM text over readable records. This is a procurement gate, not a backlog item: enterprise security review stops the deal before functional evaluation.

**R3 — Audit trail is volatile and the product claims otherwise.** `useState<AuditEntry[]>` (`DataStore.tsx:119`), capped at 500 (`:147`), deliberately excluded from the persistence effect (`:124`), entries carrying no actor, no diff, no reason, no correlation id — against `page-help.ts:1989` promising an immutable trail with before/after diffs superseded only by legal hold. *Consequence:* a regulated customer relying on this for compliance defence has zero evidence, and the documentation is discoverable.

**R4 — No customer/contact entity anywhere.** The only person-shaped records are internal Stakeholders, journalist MediaContacts, and masked suppression key strings. *Consequence:* segmentation, journeys, personalisation, suppression enforcement, consent proof, engagement history, frequency capping and identity resolution are all blocked behind a profile store plus re-plumbing of Audience, Segment, Journey and ChannelExecution. Foundation change, blast radius across most of the app.

**R5 — No event/signal layer.** No bus, store, or subscription (verified by grep across data/services/store/lib/pages/components). *Consequence:* nothing can react. Journey triggers have no event to bind to, `Competitor.alertTriggers` is English prose, asset-expiry notifications are pre-baked seed rows rather than derived from `rightsExpiry` crossing today. The platform is descriptive; reactivity is a new architectural tier.

**R6 — Silent policy no-ops producing false compliance clearances.** `reviewContent` gates on POL-001..005 with no else branch while `ContentDetail.tsx:239-243` deliberately feeds it every block-enforcement policy; `ReviewFindings.tsx:174-179` renders only policies that produced findings. *Consequence:* ESG claims, influencer disclosure and outbound data handling are reported clean when no rule exists. The honest "not evaluated" pattern already exists at `simulated.ts:720-728` — this is a ~30-line fix with outsized credibility payoff and must land before any compliance demo.

**R7 — MetricResult grain is the binding constraint on all measurement.** Weekly campaign×channel aggregate, no denominator, no variance, `communicationId` declared but populated by zero rows, 10 weeks of history. *Consequence:* experimentation, event-based attribution, per-variant results, cohort retention and significance testing are all structurally blocked. Every capability scored 0-1 in analytics/attribution/experimentation traces here, so none can be closed incrementally — closing them needs an event-grain fact store plus a re-point of all nine selectors in `metricSelectors.ts`.

**R8 — Attribution: correct math over plan data.** `deriveTouchpoints` (`attribution.ts:194-222`) builds sequences from *scheduled* ChannelExecutions weighted by status; a draft nobody received earns 0.25. The sequence is identical whether the audience engaged or not. *Consequence:* channel credit ranks scheduling volume and recency; the calculators' quality (credit conservation tested across five models) makes wrong answers more credible than they deserve. Compounded by business-tier revenue never being attributed at all and `campaignRoi` ignoring attribution entirely, so Performance and Budget can never be reconciled.

**R9 — Integration is labels, not connections.** `adapterKey` values print as table text (`JourneysChannels.tsx:249, :824, :1189`); vendor names live inside display strings. Missing per connector: adapter interface, secrets vault with rotation, OAuth2/API-key/mTLS strategies, typed versioned schemas, idempotency keys, backoff with jitter, circuit breaking, rate-limit budgets, DLQ with replay, signed inbound webhooks, health monitoring, per-tenant credential isolation. *Consequence:* integration is unstarted, not partial — and without idempotency keys the first real retry double-sends a campaign, the one unrecoverable failure in marketing automation.

**R10 — Single-tenant by construction.** `SeedDB.org` is one object, not an array. *Consequence:* multi-tenancy requires schema change to all 51 entity types, every selector, and the entire 8,000-line seed corpus. One customer, one browser, one dataset.

**R11 — Rich lifecycle model, ~12 reachable transitions, no central guard.** Campaign status is written in exactly one place (`ApprovalsInbox.tsx:213`) and can only become `Approved` or `Planned`, yet 6 seeded campaigns show Live and 23 Completed. `updateIn` accepts any patch with no current-state check. *Consequence:* the demo depicts a lifecycle the code cannot produce; an illegal Draft→Completed jump succeeds silently and emits no audit record.

**R12 — Rule engine configuration is source code.** `BANNED_HYPE` (4 terms), `TRADEMARKED_PRODUCTS` (2), the 21-term inclusive list, refinement rules, jargon swaps and score weights are all TypeScript constants; `Policy.ruleText`, `LegalClause.text` and glossary entries are data no UI writes. *Consequence:* every customer's rulebook is a deploy — the single biggest barrier to a second tenant, at exactly the point where tenants differ most.

**R13 — The AIService seam is synchronous, and determinism is load-bearing.** All 8 methods return fully-formed structures with no `Promise` anywhere; ~10 call sites invoke them inline in render or click handlers with no loading, error, cancellation, retry or cost accounting. Meanwhile 600+ lines of tests assert byte-equality and `copilot.ts:4-6` states "no randomness, no clock, no network" as a contract. *Consequence:* the BLUEPRINT claim that swapping in a real LLM "touches zero feature code" is false as designed — it requires an async interface rewrite plus every consumer and page UI, and it breaks the reproducibility guarantee the provenance model rests on.

**R14 — No grounding, no PII, no data-protection layer.** No retrieval grounding, fact register, citation enforcement, contradiction detection, PII pattern matching, cross-classification leak check or redaction. *Consequence:* the current provider cannot hallucinate because it cannot generate; every one of these risks arrives on the day a model is connected, and none has a place to live in the current design. POL-010 is `block` with zero rules in a demo dataset spanning EU and KSA.

**R15 — Money never touches finance.** Every figure reconciles to `CampaignActivity.spendAllocated`; "committed" is inferred from activity status; no invoice, PO, actual, accrual or currency exists. *Consequence:* the Budget page, Command Center utilisation tile and board pack present planning estimates in the visual language of financial reporting, and a multi-currency deployment sums EUR and JPY as dollars.

**R16 — No Country entity; Region is a three-value continent enum.** Jurisdiction attaches legal clauses to `regionIds`, so KSA-mandated copy resolves through a bucket covering ~100 countries with incompatible advertising law. *Consequence:* the compliance engine either over-applies KSA clauses across Europe or misses them; Country is a prerequisite for correctness, not a nice-to-have, and retrofitting touches Jurisdiction, LegalClause, Region, ReviewContext and every localisation path.

**R17 — The knowledge graph is blind to 24 of 52 collections and fails silently.** `collections()` and `ID_PATTERN` were written for the original 28 entities and never extended; `GraphExplorer.rowsOf` falls through to `return []`. *Consequence:* an empty "Referenced by" panel is indistinguishable from "nothing references this" — a confident wrong answer. Two entities (MarketTrend, ShareOfVoice) aren't even in `EntityName` and can never be an approval, notification or audit subject.

**R18 — Impact analysis stops short of the two operationally decisive dimensions, and two implementations disagree.** Neither `assetImpact` nor `assetImpactModel` resolves channels (the `ChannelExecution` join is walked and the channel discarded) or regions (one hop away in loaded data); the Asset Library sheet also omits communications. *Consequence:* when rights lapse, legal's first two questions — which channels are live, which markets are exposed — are unanswerable, and two surfaces giving different answers for the same asset is itself an audit finding.

**R19 — No pagination, no sorting, no paging contract.** `ui/pagination.tsx` imported by zero files; zero `sortBy` matches; free-text search on 3 of 27 pages; linear scans and `.find()` joins inside render. *Consequence:* at enterprise row counts every list page becomes unusable, and because components consume whole in-memory arrays, server paging is a per-page rewrite.

**R20 — The useLiveDB migration is half-done with nothing preventing regression.** 11 surfaces still call `getSeedDB()`; several pages are internally split. *Consequence:* a promoted campaign appears on CommandCenter and not PerformancePage; the one orphan detector runs against the one dataset that cannot change; ApprovalsInbox renders raw ids for runtime subjects. No lint rule or test stops the next surface reintroducing it.

**R21 — Approval routing does not survive a real org chart.** `db.stakeholders.find(s => s.role === role)` — the seed has exactly one person per role by construction; no delegation, OOO reassignment, escalation target or quorum. *Consequence:* two campaign managers make routing non-deterministic; one approver on leave halts every campaign routed to their role; KSA copy is signed off by an EU lawyer.

**R22 — Installed safety libraries are unused; the dependency manifest overstates rigour.** zod, react-hook-form, @hookform/resolvers and @tanstack/react-query are all dependencies with zero usage in `src/pages` or `src/components/marcomm`. *Consequence:* TypeScript unions are compile-time only, malformed data enters silently and surfaces far from the cause.

**R23 — Time is pinned to a constant.** `campaignSelectors.ts:21 TODAY = '2026-08-13'`, `NotificationPopover` `DEMO_NOW`, `ApprovalsInbox` `DEMO_TODAY_MS`. *Consequence:* nothing ages; every "overdue", "expiring", "this quarter" and SLA figure is a fixture, and relative timestamps drift into nonsense as real time passes the anchor.

**R24 — Domain coverage gaps are entity-level, not feature-level.** Social listening/VoC has no entities at all; PR has no Pitch/MediaList/PressRelease; campaign management has no Program/Wave/Task/Milestone/Dependency/Template; resourcing has no Resource/Capacity/Assignment. *Consequence:* these cannot be added incrementally — each needs new entities, seed volume, selectors and a workspace.

**R25 — `docs/SPEC_GAPS.md` is stale in both directions.** It understates the build (marks FR-BG-18, FR-BG-21/22, FR-PP-02/03/08 and the Copilot as absent when all are implemented) and overstates elsewhere. *Consequence:* any stakeholder treating it as the gap source of truth makes wrong build/buy decisions; drive from code evidence.

---

## 5. MARKET GAP REPORT

### A — Missing and critical
1. **Backend, persistence and a data-access seam** — no server, no API, no repository layer; localStorage on one device.
2. **Authentication + SSO/SAML/OIDC + SCIM provisioning** — the current "login" is an editable localStorage string.
3. **Customer/contact profile store with identity resolution** — no addressable individual exists anywhere.
4. **Event/signal layer** — event taxonomy, append-only store, ingestion, subscription, reactive rules.
5. **Durable, append-only, tamper-evident audit trail with actor and before/after diff.**
6. **Multi-tenancy** — tenant discriminator, tenant-scoped queries, per-tenant configuration and credential isolation.
7. **Connector framework and real channel delivery** — adapters, secrets, auth strategies, delivery receipts, bounce/complaint feedback.
8. **Segment rule engine** — criteria DSL with grammar, attribute catalogue, evaluator, materialised membership with deltas and overlap/dedup.
9. **Content authoring front door** — create a Content record, a real editor, and a route-to-approval action.
10. **Workflow/state-machine runtime** — instances, stage advancement, SLA timers, escalation, delegation, centralised transition guards.
11. **Experiment entity** — arms, allocation, exposure logging, holdouts, significance, winner promotion.
12. **Event-grain fact store** — per-recipient, per-conversion, per-content-version rows with denominators and variance.
13. **Per-person consent, subscription state and enforceable suppression** with proof-of-consent.
14. **Pagination, sorting and a server-side paging contract.**
15. **Close the silent policy no-op** — emit "not evaluated" for POL-006..010 (~30 lines; do this before the next demo).
16. **Country entity and jurisdiction correctness** below the three-continent enum.
17. **Currency on every monetary field + reconciliation to actuals** (invoices, POs, commitments, FX).
18. **Reliability tier** — idempotency keys, retry with backoff, DLQ with replay, rate-limit budgets, circuit breakers.
19. **Real LLM behind an async AIService seam, with grounding, citation, PII and cross-classification controls.**
20. **File storage and binary asset handling** — upload, checksum, dimensions, altText, renditions, versions, licence terms.
21. **Task/work-item entity** — assignment to a person, due dates, dependencies, queues.

### B — Partially implemented (exists but not enterprise-grade)
1. Knowledge graph coverage (28 of 52 collections; silent `[]`).
2. Asset impact analysis (channels and regions missing; two divergent implementations).
3. Rule engine configurability (rules compiled into the binary; no rule versioning for verdict reproduction).
4. RBAC → a real resource×action×role permission model with exportable entitlement matrices.
5. ABAC scoping (only the Agency role is enforced; `Stakeholder.brandIds`/`regionId` unused).
6. Attribution (plan-based touchpoints; business-tier value never attributed).
7. Metric registry integrity (orphan keys silently erase history).
8. Read-side consistency (11 surfaces still on the frozen seed).
9. Approval routing (role→first-match; no delegation, escalation or quorum).
10. Anomaly detection → alerting (no `NotifKind` for performance; nothing triggers).
11. Global search (6 of 51 entities, substring-only, silent 8-item cap).
12. Localization (excellent content plumbing, zero UI i18n, placeholder translation).
13. Campaign structure (no program/wave/task/milestone/dependency/template/clone/recurrence/edit).
14. Budget model (single allocation axis, seeded scenarios, no actuals).
15. Copilot (11 regex intents, literal confidences, no actions).
16. Agent runtime (catalogue without execution).
17. Data-quality framework (build-time checks on frozen data; no duplicate/staleness detection).
18. Forecasting (real arithmetic over invented inputs).
19. Data classification (only Restricted acts; Internal and Confidential inert).
20. Accessibility (no skip link, no live regions for ~50 toast-driven state changes).
21. Runtime schema validation (zod installed, unused; untyped store writes).
22. PR/media operations (read-only journalist DB; no lists, pitches, embargoes or coverage ingestion).
23. Market/competitive intelligence (no ingestion; fabricated competitor SoV).
24. Persona and message analytics (allocation heuristic presented as measurement, feeding a budget recommendation).

### C — Differentiators (protect and extend; these are the reasons to buy)
1. **Jurisdiction × locale × channel × product-category legal clause resolution with supersession and fingerprint presence testing**, plus `ReviewContext` recording which rule set ran — genuinely rare, and the foundation of reproducible compliance verdicts. Extend with clause authoring, effective-date evaluation and rule versioning.
2. **Content provenance chain** (`source`, `generator`, `basis`, `derivedFromVersionId`, `personaId`, `channelId`, `preservedFragments`, `feedback`) with honest degradation for pre-provenance versions — AI-governance-audit ready. Extend it to the approver's screen and to an outbound disclosure register.
3. **Verbatim-preservation guarantee on AI refinement** (`preserve.every(f => body.includes(f))` always holds) — a real trust primitive that survives an LLM swap.
4. **Constraint-checked variant generation** — a variant cannot exist unchecked; `overBy`, `truncated` and `constraintId` carried onto the saved version. Reusable regardless of who writes the copy.
5. **The explicit "not evaluated" finding pattern** — honest coverage disclosure is a differentiator in a market of confident AI. Make it universal.
6. **Crisis containment freeze** — declaring an incident actually pauses communications and reverts queued executions with audit entries. Add unfreeze and this is demo-winning.
7. **Content-level i18n with pinned Intl extensions, RTL and Umm al-Qura calendar** (17 tests) — GCC-credible the moment real translation lands.
8. **Agency hard-scoping that fails closed**, and **segregation of duties enforced in the handler**, not just the button.
9. **The attribution calculator seam** — five models, credit conservation tested, one-entry extensibility. Valuable as soon as it runs on event data.
10. **The domain model itself** (`types.ts`, 51 documented entities) — the strongest asset here and it would largely survive a move to a real backend.

### D — Nice to have
Bulk operations; server-side shareable saved views; version diff/compare/rollback; URL-encoded filter state; media lists and pitch tracking; editorial calendar; curated asset collections as objects; board-pack export; event registration and attendee model; filtered-empty vs first-run empty states; card-based mobile tables for approvals; glossary/term import; copilot intent expansion; workload rebalancing UI; brand architecture (house-of-brands) view.

### E — Do not build (opinionated)
1. **The bespoke BPMN designer.** `WorkflowDesigner.tsx` (501 lines) builds tooling the project's own spec excludes (GR-01/IR-05/AS-01), and `mode: 'parallel-group'` is already stored-and-ignored. Integrate Temporal/Camunda/Flowable. Continuing here is rework.
2. **A hand-rolled rich text editor.** Adopt Tiptap or Lexical. Do not build collaborative editing, presence or OT yourselves.
3. **A bespoke AI-answer-engine/LLM-visibility module now.** It needs the same missing prompt-corpus + scheduler + parser + time-series tier as market intel and agent execution. Buy or defer — do not build a third scheduler.
4. **Vision/multimodal brand compliance** (logo detection, contrast OCR, sensitive-content scanning). Needs storage, a media pipeline and vision models. Zero of the text guardrail gaps are closed; do those first, then rent a vision API behind the AIService seam.
5. **Data-driven attribution (Shapley/Markov).** Adding statistical sophistication on top of scheduling-derived touchpoints is a credibility liability, not an upgrade. Fix the input first.
6. **More seeded reference libraries** — more personas, competitors, benchmarks, trends. Every additional hand-authored constant rendered in the visual language of measurement expands the fabricated-data surface without adding capability.
7. **A third impact-analysis implementation.** Consolidate `assetImpact` and `assetImpactModel` into one selector; do not let the Asset Library keep its own.
8. **Roll-your-own auth.** Passwords, sessions, MFA — use an IdP. This is the one place where building is strictly worse than buying.
9. **Persona refresh / drift-signal polish** until a profile store exists. It can only ever be theatre, and the current toast already asserts an untrue outcome.
10. **Page-by-page UI translation.** 27 pages of inline English need one framework-driven extraction pass, decided once — not incremental per-screen catalogues.
11. **Client-side-only permission refinements.** Every hour spent on RBAC granularity before there is a server enforcing it increases false confidence in a security review.

---

## 6. PRIORITY SCORING

**Formula:** `PRIORITY = (Business Impact × 2) + Enterprise Buyer Importance + User Value + Competitive Importance + Strategic Differentiation − Technical Complexity` *(each input 1-5; max 29)*

> Note: the formula subtracts complexity, which systematically deprioritises foundations. **A1 (backend) and A2 (auth) are gating regardless of their score** — nothing above them ships to an enterprise without them. Read the table as sequencing *within* the post-foundation build, not as permission to skip the foundations.

| # | Gap | Cat | BI | EBI | UV | CI | TC | SD | PRIORITY |
|---|---|---|---|---|---|---|---|---|---|
| B3 | Rule engine configurability (rules out of the binary, versioned) | B | 5 | 5 | 4 | 4 | 3 | 5 | **25** |
| A10 | Workflow / state-machine runtime with SLA timers + escalation | A | 5 | 5 | 5 | 4 | 4 | 4 | **24** |
| A19 | Real LLM behind async seam + grounding/citation/PII controls | A | 5 | 4 | 5 | 5 | 5 | 5 | **24** |
| A3 | Customer/contact profile store + identity resolution | A | 5 | 5 | 5 | 5 | 5 | 3 | **23** |
| A4 | Event/signal layer (store, ingestion, subscription, rules) | A | 5 | 4 | 5 | 5 | 5 | 4 | **23** |
| A7 | Connector framework + real channel delivery | A | 5 | 5 | 5 | 5 | 5 | 3 | **23** |
| A8 | Segment rule engine (DSL, evaluator, membership, overlap) | A | 5 | 4 | 5 | 5 | 4 | 3 | **23** |
| A9 | Content authoring: create + editor + route-to-approval | A | 5 | 4 | 5 | 4 | 2 | 2 | **23** |
| B10 | Anomaly/benchmark output → notifications and actions | B | 4 | 4 | 5 | 4 | 2 | 4 | **23** |
| A11 | Experiment entity, arms, holdouts, winner promotion | A | 4 | 4 | 4 | 5 | 3 | 4 | **22** |
| A12 | Event-grain fact store + selector re-point | A | 5 | 4 | 4 | 5 | 5 | 4 | **22** |
| A15 | Close silent policy no-ops (POL-006..010 "not evaluated") | A | 4 | 5 | 3 | 3 | 1 | 4 | **22** |
| B9 | Approval routing: pools, delegation, OOO, escalation, quorum | B | 4 | 5 | 5 | 3 | 2 | 3 | **22** |
| B12 | Localization: UI i18n framework + real MT/TM with in-country review | B | 4 | 5 | 5 | 4 | 4 | 4 | **22** |
| A5 | Durable append-only audit trail with actor + diff | A | 4 | 5 | 3 | 4 | 2 | 3 | **21** |
| A13 | Per-person consent, subscription state, enforceable suppression | A | 5 | 5 | 3 | 4 | 4 | 3 | **21** |
| A16 | Country entity + jurisdiction resolution correctness | A | 4 | 5 | 4 | 3 | 3 | 4 | **21** |
| B13 | Campaign structure: program/wave/task/milestone/dependency/template/clone | B | 4 | 5 | 5 | 4 | 3 | 2 | **21** |
| A1 | Backend, persistence, data-access seam | A | 5 | 5 | 4 | 4 | 5 | 2 | **20** |
| A2 | Authentication + SSO/OIDC + SCIM | A | 5 | 5 | 3 | 4 | 3 | 1 | **20** |
| A21 | Task / work-item entity (assignee, due date, queue) | A | 4 | 4 | 5 | 3 | 2 | 2 | **20** |
| B2 | Asset impact: add channels + regions, consolidate two implementations | B | 3 | 4 | 4 | 3 | 1 | 4 | **20** |
| B16 | Agent runtime (scheduler, queue, run records, retry, per-agent audit) | B | 4 | 3 | 4 | 5 | 5 | 5 | **20** |
| A18 | Reliability tier: idempotency, backoff, DLQ, rate limits, breakers | A | 5 | 5 | 3 | 3 | 4 | 2 | **19** |
| B1 | Knowledge graph coverage (24 missing collections + EntityName) | B | 3 | 3 | 4 | 3 | 1 | 4 | **19** |
| B6 | Attribution on event touchpoints + business-tier value attribution | B | 4 | 4 | 4 | 4 | 4 | 3 | **19** |
| A20 | File storage / binary assets / renditions / altText / licence terms | A | 4 | 4 | 5 | 4 | 5 | 2 | **18** |
| B4 | Resource×action permission model with exportable entitlements | B | 4 | 5 | 3 | 3 | 3 | 2 | **18** |
| B5 | ABAC enforcement for all roles (brand/BU/region as entitlement) | B | 4 | 5 | 3 | 3 | 3 | 2 | **18** |
| B14 | Budget: channel/market/period axes, actuals, PO/invoice, FX | B | 4 | 5 | 3 | 3 | 3 | 2 | **18** |
| A17 | Currency on every monetary field + GL reconciliation | A | 4 | 5 | 3 | 3 | 4 | 2 | **17** |
| B7 | Metric registry integrity (orphan keys, unreachable benchmarks) | B | 4 | 3 | 4 | 2 | 2 | 2 | **17** |
| B11 | Global search coverage + full-text + ranked results | B | 3 | 4 | 5 | 3 | 3 | 2 | **17** |
| B15 | Copilot beyond 11 regex intents (NLU + actions) | B | 3 | 3 | 4 | 4 | 4 | 4 | **17** |
| B23 | Market/competitive intelligence ingestion (kill fabricated SoV) | B | 3 | 3 | 4 | 4 | 4 | 4 | **17** |
| B24 | Persona/message analytics: stop presenting allocation as measurement | B | 3 | 4 | 3 | 2 | 1 | 3 | **17** |
| A6 | Multi-tenancy (tenant discriminator + scoped queries) | A | 5 | 5 | 2 | 3 | 5 | 1 | **16** |
| A14 | Pagination, sorting, server paging contract | A | 3 | 4 | 5 | 2 | 2 | 1 | **16** |
| B22 | PR operations: media lists, pitches, embargoes, coverage ingestion | B | 3 | 3 | 4 | 3 | 3 | 3 | **16** |
| B17 | Data-quality framework (duplicates, orphans, staleness, runtime checks) | B | 3 | 4 | 3 | 2 | 2 | 2 | **15** |
| B20 | Accessibility to WCAG 2.2 AA (live regions, skip link, VPAT) | B | 3 | 5 | 3 | 2 | 2 | 1 | **15** |
| B19 | Classification enforcement beyond Restricted (export/print/share) | B | 3 | 4 | 2 | 2 | 2 | 2 | **14** |
| B8 | Complete the useLiveDB migration + lint rule to prevent regression | B | 3 | 2 | 4 | 1 | 1 | 1 | **13** |
| B21 | Runtime schema validation (activate zod on the write path) | B | 3 | 3 | 3 | 1 | 1 | 1 | **13** |
| B18 | Forecasting from measured history (response curves, pacing) | B | 4 | 4 | 4 | 4 | 4 | 4 | **20** |

---

## 7. THE DECISION TABLE

| Gap | Current State | Market Requirement | Why It Matters | Business Impact | Complexity | Priority | Recommended Action |
|---|---|---|---|---|---|---|---|
| Silent policy no-ops (POL-006..010) | 3 block-enforced policies produce zero findings; UI toasts "all checks passed" | Any policy in a run must report evaluated or not-evaluated | A false compliance clearance on a screen that can force Rework is the worst failure class in the product | 4 | 1 | 22 | **Fix this week.** Add the else branch using the existing `simulated.ts:720-728` pattern; render unevaluated policies in `ReviewFindings` |
| Authentication | Role string in localStorage, no verification | SSO (SAML/OIDC), SCIM, MFA, session policy | Security review is a hard gate before functional evaluation; today anyone is Platform Admin | 5 | 3 | 20 | **Build now.** Adopt an IdP; never roll your own. Move every role check server-side behind it |
| Audit trail durability | `useState` array capped 500, wiped on refresh; help text claims immutability + diffs | Append-only, actor-stamped, before/after diff, retention-governed, exportable | The documentation is discoverable and describes controls that do not exist | 4 | 2 | 21 | **Build now**, and correct `page-help.ts:1989` today so the claim matches reality |
| Backend / data-access seam | Frozen seed arrays + one localStorage key; components import seeds directly | Server, API, repository layer, concurrency, multi-user state | Every 3+ score in this audit is a client-side simulation of the capability | 5 | 5 | 20 | **Build now.** Introduce a repository interface first so pages stop importing seeds, then swap the implementation |
| Customer/contact profile store | No person entity anywhere | Profiles, identity keys, anonymous→known resolution, preferences, lifecycle stage | Segmentation, journeys, personalisation, consent proof and frequency capping are all unbuildable without it | 5 | 5 | 23 | **Build now** — sequence it with the event layer; re-plumb Audience, Segment, Journey, ChannelExecution around it |
| Event/signal layer | Status enums + a past-tense audit log | Event taxonomy, append-only store, ingestion, subscription, reactive rules | Nothing in the product can react to anything; every "trigger" in the UI is a label | 5 | 5 | 23 | **Build now** alongside the profile store — one architectural tier, three capability domains unblocked |
| Segment rule engine | `criteria` is a display string; size is a seeded integer; reach is a naive sum | DSL + attribute catalogue + evaluator + materialisation + overlap/dedup | Every reach and cost-per-reach figure in the app is inflated and can never be recomputed | 5 | 4 | 23 | **Build now** once profiles exist. Ship overlap computation with it — the help text already promises it |
| Connector framework + delivery | `adapterKey` printed as text; `pushDraft` writes local status | Adapters, secrets, OAuth2/mTLS, delivery receipts, bounce/complaint feedback | Nothing enters or leaves the system; "sent" is an assertion | 5 | 5 | 23 | **Build now** — and design idempotency, backoff, DLQ and rate budgets into the interface, not after N connectors |
| Content authoring front door | Cannot create a Content record; no editor; no route-to-approval | Create, edit, save, submit for approval | The supply chain has no front door and the flagship AI→approval loop is open at the hand-off | 5 | 2 | 23 | **Build now.** Highest value-per-effort item in the table — adopt Tiptap/Lexical, add `contents.createIn` and an approval-creation action |
| Workflow runtime | Reference data + a 5-case switch in a page component | Instances, stage advancement, SLA timers, escalation, delegation, guards at the write path | ~12 transitions reachable; 6 of 9 Campaign states unreachable while the demo shows them | 5 | 4 | 24 | **Build now.** Integrate an engine (Temporal/Camunda); centralise `canTransition` in the store and emit audit on every transition |
| Rule engine configurability | Banned terms, trademarks, inclusive list, weights are TS constants | Customer-editable, versioned rules with reproducible verdicts | Every rulebook is a deploy — the single biggest barrier to tenant #2 | 5 | 3 | 25 | **Build now.** Move rules to data, add authoring + versioning, stamp the rule-set version onto each `AIReview` |
| Anomaly → alerting | Detectors compute correctly and render only | Notification kinds for performance events, thresholds, routing, on-call | A 40% collapse is detected and reaches nobody unless someone is already looking | 4 | 2 | 23 | **Build next.** Add `NotifKind` members and a threshold-subscription rule; cheap once the event layer exists |
| Approval routing | `find(s => s.role === role)` — first match wins | Pools, delegation, OOO, escalation chains, quorum, region/amount-based routing | Two people in one role makes routing non-deterministic; KSA copy signed off by an EU lawyer | 4 | 2 | 22 | **Build next** with the workflow runtime |
| Localization | Content plumbing excellent; translation is a placeholder; zero UI i18n | Real MT + TM + glossary-enforced translation + in-country review; localized UI chrome | Highest-visibility hollow feature for the GCC market this product targets | 4 | 4 | 22 | **Build next.** Never demo "Request localization" as working translation until it is |
| Per-person consent + suppression | Aggregate percentages; masked suppression keys | Per-subject consent with purpose, source, timestamp, proof; enforced at send | Enforcing against a percentage is arithmetically impossible; no DSAR answer exists | 5 | 4 | 21 | **Build next**, immediately after profiles |
| Experiment entity | Zero — only a `hypothesis` string on a transient variant | Arms, allocation, exposure log, holdouts, significance, winner promotion | Every optimization claim is unfalsifiable; `page-help.ts:1590` already promises it | 4 | 3 | 22 | **Build next.** Delete the help-copy claim today; ship the entity next |
| Event-grain fact store | Weekly campaign×channel, no denominator, no variance | Per-recipient/per-conversion/per-version rows with denominators | Root cause of every 0-1 in analytics, attribution and experimentation | 5 | 5 | 22 | **Build next** — sequence with the event layer; re-point all nine selectors in one pass |
| Country entity | Three-continent enum drives legal clause resolution | Country + market entities with locale, currency, region rollup | KSA clauses resolve through a bucket of ~100 countries with incompatible law | 4 | 3 | 21 | **Build next.** Prerequisite for the legal engine being correct, not an enhancement |
| Asset impact (channels + regions) | Two implementations, both stop at Campaign/Communication | One traversal answering content, versions, comms, channels, regions | Legal's first two questions on a rights lapse are the two the system cannot answer | 3 | 1 | 20 | **Build next.** Both joins are one hop away in already-loaded data — a day of work with high demo value |
| Campaign structure | Two levels; no milestone, dependency, template, clone or edit | Program/wave/task, dependencies with cascade, templates, cloning, recurrence | Every recurring campaign is rebuilt by hand; a live campaign cannot be paused | 4 | 3 | 21 | **Build next.** Start with edit + status actions + clone; templates after |
| File storage / DAM binaries | Filename strings; no file ever handled | Upload, checksum, dimensions, altText, renditions, versions, licence terms | POL-004 is unenforceable and the "brand checks confirmed" toast is false assurance | 4 | 5 | 18 | **Build later** — but remove the "All 5 brand checks confirmed" wording now |
| Multi-tenancy | One Organization object | Tenant discriminator, scoped queries, per-tenant config and credentials | Cannot sell to two customers on one deployment | 5 | 5 | 16 | **Build later**, but decide the tenancy model *before* the backend schema is written |
| Pagination / sorting | None anywhere; no paging contract | Server-side paging, sorting, result counts | Hard failure at enterprise row counts; retrofitting is a per-page rewrite | 3 | 2 | 16 | **Build with the backend** — define the paging contract in the repository interface on day one |
| Currency + actuals | One USD formatter; spend is a plan number | Currency per amount, FX, PO/invoice/commitment, GL reconciliation | The board pack sums mixed currencies as dollars and cannot be reconciled to finance | 4 | 4 | 17 | **Build later.** Until then, label the Budget page explicitly as planning, not financial reporting |
| Real LLM + AI safety controls | 1,748 lines of deterministic templating behind a synchronous seam | Async provider, model pinning, prompt registry, grounding, citations, PII, eval harness | The moment a model is connected, hallucination and PII risk arrive with no control in the design | 5 | 5 | 24 | **Build next-to-later.** Rewrite the seam to async first; do not connect a model before grounding and PII controls exist |
| Agent runtime | 8 catalogue rows, zero execution | Scheduler, queue, run records, retry, per-agent audit | 32 capability bullets imply 8 agents; there is one intent router and seven labels | 4 | 5 | 20 | **Build later.** Keep the honest status chips in the meantime — they are an asset |

---

## 8. ROADMAP

### NOW — before any serious enterprise-market positioning
- **Emit "not evaluated" for POL-006..010** — a ~30-line fix that removes the product's only false compliance clearance.
- **Correct the three untrue UI/help claims** (audit immutability at `page-help.ts:1989`, A/B winner promotion at `:1590`, "re-cut from consented aggregates" toast) — documentation that overpromises is quoted back in RFPs.
- **Authentication behind an IdP + SSO/SCIM** — a procurement gate that blocks evaluation entirely.
- **Backend + repository seam** (with the paging contract defined in the interface) — every other item depends on it and retrofitting per-page is the expensive path.
- **Durable, actor-stamped, append-only audit trail** — the most serious single finding for a regulated buyer.
- **Customer profile store + event/signal layer, sequenced together** — one architectural tier that unblocks segmentation, journeys, consent, frequency and measurement.
- **Content authoring front door** (create, edit, route for approval) — highest value-per-effort item in the report and the gap most likely to be found on pilot day one.
- **Workflow runtime with centralised transition guards** — closes the demo-vs-code lifecycle gap and gives SLAs teeth.
- **Rules out of the binary, versioned** — without this there is no tenant #2.
- **Consolidate the two impact-analysis implementations and add the channel + region hops** — one day of work, both joins already loaded, directly answers legal's first two questions.

### NEXT
- **Segment rule engine with overlap/dedup** — every reach figure is wrong until this lands.
- **Per-person consent, subscription state and enforced suppression** — GDPR/PDPL evidence, not dashboards.
- **Event-grain fact store + re-point all nine metric selectors** — the single change that unblocks experimentation, attribution and audience analytics together.
- **Experiment entity with holdouts and winner promotion** — makes every optimization claim falsifiable for the first time.
- **Connector framework with idempotency, backoff, DLQ and rate budgets designed in** — build the reliability contract before connector #1, not after connector N.
- **Approval pools, delegation, OOO and escalation** — the governance module does not survive a real org chart without them.
- **Anomaly and SLA events wired to notifications** — cheap once the event layer exists, and it turns three good detectors into a product.
- **Country entity + effective-date evaluation on legal clauses** — prerequisites for the compliance engine being correct at all.
- **Real translation + UI i18n framework** — decide once, extract once; stop demoing the placeholder.
- **Campaign edit/status actions, cloning and templates** — removes the largest source of manual effort and configuration drift.
- **Async AIService seam** (before any model is connected) — the interface rewrite is unavoidable; do it while the consumer list is 10 call sites.

### LATER
- **Real LLM with grounding, citation enforcement, PII detection and an eval harness** — connect only after those controls exist, because the current provider's inability to hallucinate is the only thing protecting you today.
- **File storage, renditions, altText and licence terms** — a storage-tier project that makes POL-004 and rights compliance real rather than advisory.
- **Multi-tenancy** — decide the model before the backend schema, implement after the first customer is live.
- **Currency, actuals, PO/invoice and GL reconciliation** — until then the Budget page must be labelled as planning.
- **Attribution on event touchpoints + business-tier value attribution** — sophistication only pays once the input is contact data.
- **Task/work-item entity + resourcing and capacity** — makes "who owes me what by when" answerable and makes plans feasibility-checked.
- **Permission model (resource×action), ABAC for all roles, classification enforcement** — meaningful only once a server enforces them.
- **WCAG 2.2 AA remediation and a VPAT** — required for public-sector and large-enterprise procurement.
- **Global search coverage + full-text + ranking; pagination/sorting across all 27 pages.**
- **PR operations: media lists, pitch tracking, embargoes, coverage ingestion.**

### FUTURE
- **Agent runtime with scheduling, run records and per-agent audit** — genuine differentiation, but it needs the event layer, workflow runtime and connector tier underneath it first.
- **Predictive layer** (propensity, churn, fatigue, send-time) — impossible before sub-daily event grain exists.
- **Data-driven attribution (Shapley/Markov)** — only once touchpoints are observed contacts.
- **Social listening and VoC** — an entire entity family plus the same ingestion tier as market intel; buy rather than build the collection layer.
- **AI answer-engine/LLM visibility monitoring** — the fastest-moving line item in the category, but it is the third consumer of one missing ingestion investment; position explicitly as roadmap.
- **Vision/multimodal brand compliance** — rent a vision provider behind the AIService seam after `ReviewInput` accepts media and `Asset` carries a file reference.
- **Benefit-realisation / Outcome entity closing the Learn loop** — the thing that justifies the platform over spreadsheets, and it needs everything above it to be real first.

---

## 9. FINAL QUALITY GATE

**Product** — It is a highly polished, exceptionally documented demonstration of a marketing platform, not a marketing platform: 27 pages over frozen seed arrays with no server, no auth and no delivery.

**Data** — The 51-entity domain model in `src/data/types.ts` is the strongest asset in the codebase and would largely survive a move to a real backend, but it is missing the two entities everything else depends on — a customer/contact profile and an event — plus Country, Product, Task, Outcome and Experiment.

**Orchestration** — There is none: journeys are diagrams that no member ever enters, workflows are reference data no work item is ever instantiated against, and ~12 status transitions are reachable of the dozens the model declares.

**Omnichannel** — Nine channels are correctly modelled with per-channel constraints and per-(Communication × Channel) execution records, and not one of them is connected to anything — `adapterKey` is a string printed in a table cell.

**Governance** — The best-built area in the product (versioned workflows, SLA fields, segregation of duties enforced in the handler, non-waivable legal findings, real crisis containment) resting on an unauthenticated localStorage role string and a volatile 500-entry audit array that a page refresh empties.

**Content** — A content supply chain with no front door: you cannot create a piece of content, cannot type a character into one, and cannot route one for approval — only the 45 seeded records can move.

**AI** — Zero model integration anywhere; `simulated.ts` is 1,748 lines of deterministic templating and regex behind a well-designed but synchronous seam whose determinism contract 600+ lines of tests actively depend on, so "swap in an LLM without touching feature code" is false as designed.

**Agents** — There is no agent runtime — no scheduler, queue, trigger, run record or retry — just 8 catalogue rows with 32 capability sentences and one deterministic intent router.

**Measurement** — The selector layer is genuinely well built and the attribution math is correct and tested, but it runs on a 10-week weekly campaign×channel fact table with no denominators, no variance, no content dimension and hand-written constants, so every dashboard figure is a fixture that will never move.

**Optimization** — Structurally impossible: no experiment entity, no holdouts, no arm assignment, no per-variant metrics and no significance testing, which makes every optimization claim in the product unfalsifiable.

**Enterprise** — It fails at three gates before functional review — authentication, audit durability and scale (zero pagination, zero sorting, full-array renders) — and it is single-tenant by construction with one `Organization` object.

**Differentiation** — Real and worth protecting: jurisdiction × locale × channel legal clause resolution with supersession, the content provenance chain, constraint-checked variant generation, the verbatim-preservation guarantee, the honest "not evaluated" pattern, and crisis freeze — roughly six defensible ideas inside a non-functional shell.

**Future** — The path is credible but strictly sequenced: backend and auth, then profiles and events, then event-grain facts and a workflow runtime, then connectors and a real model with grounding — and nothing further up the stack should be promised to a buyer until those four land.