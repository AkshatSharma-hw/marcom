# MarComm Market-Readiness Gap Report — Pass 2 (full domain coverage)

*220 evidence-scored capabilities across all seven domain audits, verified against source.*

> **Read this one first.** Pass 1 (`MARKET_READINESS_AUDIT.md`) lost its orchestration
> auditor to a mid-stream API failure, so it has no dedicated coverage of journey runtime,
> cross-channel orchestration, contact policy / frequency capping, consent enforcement or
> personalization. This pass covers all seven domains. The two passes were produced by
> independent agent runs over the same codebase; where they agree, confidence is high.
> Pass 1 scored 233 capabilities and contains some findings absent here — keep it as a
> supplement, not a superseded draft.

> **CLOSED SINCE THIS PASS — gap A6, audit-trail durability.** Every DataStore
> create/update/delete now writes a full `AuditRecord` (actor, action, entity type/id,
> before→after diff) through `src/lib/auditTrail.ts`, the trail is append-only, and it
> persists in the same `localStorage` payload as the record data — so it survives a reload
> and a store reset, and an incident declared in-app renders a populated timeline. Covered
> by `src/test/audit-trail.test.ts`. **What remains open:** the trail is this browser's
> storage, not a server-side tamper-evident store — per-device, clearable from devtools,
> capped at 500 entries (trims are themselves recorded), with no retention policy, legal
> hold or export. Findings below are annotated **[CLOSED]** / **[PARTLY CLOSED]** where
> this changed them; the original wording is kept so the pass stays readable as a
> point-in-time record.

## 1. VERDICT

This is a client-only React SPA over a frozen TypeScript seed with `localStorage` persistence — there is no backend, no network call anywhere in ~53,800 lines of `src` (zero `fetch`/`axios`/`WebSocket` hits), no authentication (`localStorage['marcomm-role']` is the entire identity model), and no execution runtime of any kind. The single most consequential structural truth is that **the domain model contains no addressable person**: across 52 seed collections there is no Customer, Contact or Profile entity, and the finest-grained person-like record is `SuppressionEntry.subjectKey`, a masked string. That one absence makes consent enforcement, frequency capping, merge-field personalization, behavioural triggers, preference centres, per-contact suppression, churn and propensity modelling not "unfinished" but *unbuildable* without a schema and data-tier rewrite. Compounding it, the only send-gate that exists — `blockersFor()` at `src/pages/JourneysChannels.tsx:275-311` — checks exactly three things (Paused comms, Rework status, pending Approvals) and never reads `db.consentSummaries`, `db.suppressionEntries` or any volume signal, while `src/data/page-help.ts:1495`, `JourneysChannels.tsx:1611-1612` and `AudiencesPage.tsx:1223-1225` all assert in shipped UI that consent, suppression and frequency caps are evaluated before every send. That is not a roadmap gap; in a regulated buyer's due diligence it reads as a compliance misstatement.

Where it demos impressively is real and worth protecting: the legal clause engine (jurisdiction precedence KSA→GCC→EU→GLOBAL, eight-word fingerprint matching chosen specifically so a superseded clause cannot satisfy its replacement, `simulated.ts:434-506, 876-949`), the `ContentProvenance` model, the five-model attribution calculator suite with stated limitations, the crisis freeze that mechanically pauses in-flight sends, and the copilot's citation discipline. Where it fails a real enterprise deployment is everything downstream of a button click: no journey executes, no message is ever sent (`adapterKey` values like `email-sendgrid` are interpolated into toast strings and resolve to no code), ~~no AuditRecord is ever written by any code path (the crisis timeline reads a static seed import and renders permanently empty for any incident declared in-app), the runtime audit log is React state destroyed on refresh~~ **[CLOSED — see the banner above: mutations now write durable, append-only `AuditRecord`s and crisis timelines populate]**, and roughly 18 of ~70 declared status values are ever written — Campaign has no reachable Live, Completed, Cancelled or Archived transition while the seed ships campaigns in exactly those states. The demo depicts a lifecycle the code cannot execute, and that gap between depicted and implemented is the highest-risk misrepresentation in the product.

---

## 2. CAPABILITY MATURITY MATRIX

### Customer / contact data & event layer

| Domain | Capability | Score | Enterprise ready? | Evidence |
|---|---|---|---|---|
| Customer data | Unified customer profile / identity resolution | 0 | No | No Customer/Contact/Person collection in 52-collection `SeedDB` (`types.ts:1116-1176`) |
| Customer data | Dynamic audience membership (rule evaluation) | 0 | No | `Segment.criteria: string` never parsed; `segmentSize()` returns hand-typed `population` (`graphSelectors.ts:222-224`) |
| Customer data | Communication / engagement history, channel affinity, RFM | 0 | No | 0 of 400 `MetricResult` rows carry `dimensions.communicationId` |
| Event layer | Behavioural event store / event bus | 0 | No | Zero `eventBus`/`emitEvent`/`publish(`/`subscribe(` hits across `data`, `services`, `store`, `lib`, `pages` |
| Event layer | Journey triggers & runtime execution | 0 | No | `JourneyNode` trigger nodes carry no `config` at all (`seed/communications.ts:1882`) |
| Consent | Consent enforcement at execution | 1 | No | `blockersFor()` never reads `consentSummaries`; only 2 consumers, both display |
| Consent | Suppression enforcement at execution | 1 | No | `blockersFor()` never reads `suppressionEntries`; one scalar subtracted from every segment row (`:353-378`) |
| Consent | Consent data model (legal basis, source, timestamp) | 2 | No | `ConsentSummary` = segmentId + channelKind + optedInPct + lastRefreshedAt only |
| Consent | Preference centre / topic preferences | 0 | No | No preference entity in `EntityName` union |
| Consent | Unsubscribe handling | 0 | No | 2 grep hits, both prose; no link, token, endpoint or handler |
| Consent | Regional consent rules / lawful basis | 1 | No | `ConsentSummary` has no region, jurisdiction or lawful-basis field |
| Consent | Suppression list management | 3 | Partial | Typed reasons, channel/audience scoping, RBAC add dialog (`AudiencesPage.tsx:862-882`) — sound register, never consulted |

### Orchestration & channels

| Domain | Capability | Score | Enterprise ready? | Evidence |
|---|---|---|---|---|
| Journeys | Journey execution engine (enrolment, member state, timers) | 0 | No | No `JourneyMember`/`JourneyRun`/`JourneyState` entity; no scheduler, no tick |
| Journeys | Trigger types (event, schedule, behavioural, date, API) | 0 | No | `config` supports only audienceId/segmentId/communicationId/waitDays/condition/splitPct |
| Journeys | Conditional routing / decision evaluation | 0 | No | `condition` string-interpolated into a label at `JourneyCanvas.tsx:127-128`; `splitPct` only formats a caption |
| Journeys | Journey graph authoring | 1 | No | `publishWaitEdits` (`JourneysChannels.tsx:707-742`) is the only graph mutation; `waitDays` is the sole authorable field |
| Journeys | Journey versioning & immutability | 3 | Partial | Real append-only lineage, RBAC-gated transitions — protecting a one-field change surface. ~~unaudited~~ — journey mutations now write `journey.*` audit records |
| Channels | Channel dispatch / adapter execution | 1 | No | `pushDraft` = `updateIn(status:'queued')` + toast; no `ChannelAdapter` interface exists |
| Channels | Channel type coverage | 1 | No | 6 Channel records; SMS/print/ads typed but have no record; WhatsApp/push/in-app absent from the union |
| Channels | Cross-channel orchestration | 2 | No | Kind-mix is derived for display only; nothing sequences, selects or falls back |
| Channels | Per-channel content constraints | 3 | Yes | `applyConstraint()` enforced at generation, over-by chips surfaced (`ContentDetail.tsx:117-121`) |
| Contact policy | Frequency caps | 0 | No | No cap entity, no send ledger, no counting window; `blockersFor()` is the complete gate |
| Contact policy | Channel / global / audience volume limits | 0 | No | No capacity field on Channel, Audience or Segment |
| Contact policy | Quiet hours / send windows | 0 | No | `scheduledAt` is a bare ISO string; zero `quiet` hits in `src` |
| Contact policy | Preferred channel & fallback | 1 | No | `preferredChannelKinds` used only to size a variant (`simulated.ts:1267`) |
| Contact policy | Priority / emergency override | 1 | No | Crisis freeze stops sends; no priority field, no transactional exemption, no release path |
| Contact policy | Cross-campaign audience collision detection | 2 | Partial | `audienceConflicts()` is real and non-trivial — advisory only, hidden from agency scope |

### Personalization, content & DAM

| Domain | Capability | Score | Enterprise ready? | Evidence |
|---|---|---|---|---|
| Personalization | Merge fields / profile attribute rendering | 0 | No | Zero `{{`/`firstName`/`%%` content tokens in `src`; no profile to merge from |
| Personalization | Behavioural / real-time personalization | 0 | No | No behaviour store; journey conditions are free strings |
| Personalization | Product / next-best-offer | 0 | No | No Product, Offer, catalogue or propensity entity |
| Personalization | Persona / channel / locale content variation | 3 | Partial | `personaVariant`/`channelVariant` real, but nothing binds a variant to the cohort at send |
| Content ops | Human editing of content copy | 0 | No | No `versionsCol.updateIn` anywhere in `ContentDetail.tsx` (1146 lines); no editor |
| Content ops | Route content into review (Draft → In Review) | 0 | No | No code creates an Approval with `subjectEntity: 'Content'` |
| Content ops | Content reuse / modular content | 0 | No | No clone, snippet, template or block library |
| Content ops | Archive / retire content and assets | 0 | No | `Retired`/`Archived`/`Expired` declared, never written |
| Content ops | Production workflow with assignments & due dates | 1 | No | No task entity; `ExecutionTask` is component state discarded on navigation |
| Content ops | Localization / transcreation | 0–2 | No | Body = `` `[Simulated transcreation to ${locale}] ${draft.body}` `` or one fixed Arabic sentence |
| Content ops | Review with annotation / comment threads | 1 | No | No Comment entity; `Approval.comment` written only by the app itself |
| Content ops | Version history & AI provenance | 4 | Yes | Full provenance chain — but `Content.currentVersionId` never re-pointed at runtime |
| DAM | Asset metadata & tagging | 0 | No | `Asset` = filename, mediaType, brandId, rightsExpiry?, status — no altText, no tags |
| DAM | Asset versioning & renditions | 0 | No | No version, parentAssetId or renditions array on Asset |
| DAM | Upload & file handling | 1 | No | No `<input type="file">`, no FileReader, not one `<img>` rendering an asset |
| DAM | Asset search | 1 | No | No search box on the Assets tab; global search matches filename substring only |
| DAM | Collections | 1 | No | Derived filter chips, not curated/shareable/permissioned sets |
| DAM | Rights, copyright, usage restrictions | 1 | No | One optional `rightsExpiry` date; no licensor, territory, channel or placement limit |
| DAM | Usage tracking | 1 | No | Structural references only; no view/download/last-used counters |
| DAM | Asset-expiry impact analysis | 2 | No | Traversal stops at Campaign; channels and regions never computed |
| Multimodal | Image / video / audio / document handling | 0 | No | No `<img>`, `<video>`, canvas, FileReader or OCR; no byte ever enters the system |
| Multimodal | Cross-media search | 0 | No | Filename substring in a command palette |

### AI, guardrails & intelligence

| Domain | Capability | Score | Enterprise ready? | Evidence |
|---|---|---|---|---|
| Generative AI | Localization / transcreation | 0 | No | Fixed Arabic placeholder identical on every content item (`ContentDetail.tsx:506`) |
| Generative AI | Text/copy draft generation | 1 | No | Brief's own sentences re-ordered; zero model, prompt or network call in the repo |
| Generative AI | Social post generation | 1 | No | `CHANNEL_FRAMING.social` = `'Hook first:'` opener + fixed closer |
| Generative AI | Email / corporate body generation | 1 | No | Always the no-brief branch: "This draft restates the current approved messaging…" |
| Generative AI | Idea → campaign proposal | 2 | Partial | Real budget/ROI derivation, but accept path discards channels, audience and KPIs |
| Generative AI | Persona/channel variant generation | 2 | Partial | Constraint engine genuinely valuable; copy is a five-clause template |
| Generative AI | Iterative refinement | 2 | Partial | Verbatim-preservation guarantee is real; unmatched feedback silently falls back to "shorten" |
| Generative AI | Creative brief generation | 3 | Partial | Best generative surface — traverses the real graph; asset specs hardcoded |
| Guardrails | Hallucination detection / factual grounding | 0 | No | `reviewContent` checks form, never truth — severe the day a real LLM lands behind the seam |
| Guardrails | PII / sensitive-information detection | 0 | No | One prose hit for `PII` in the whole repo; classification is a dropdown |
| Guardrails | Policy authoring / extensibility | 0 | No | `BANNED_HYPE` (4 terms), `TRADEMARKED_PRODUCTS` (2) are module constants |
| Guardrails | Policy coverage: enforced vs on file | 1 | No | Engine gates on POL-001..005; POL-006..010 rendered as "Enforced by AI gates in…" with no code |
| Guardrails | Sub-brand / regional brand inheritance | 1 | No | Enforcement paths read `brand.guardrailPolicyIds` only; `parentBrandId` never walked |
| Guardrails | Claims substantiation | 1–2 | No | Regex catches only `N x/% faster|longer|better`; "not based on any test" satisfies it |
| Guardrails | Accessibility (alt text) checking | 2 | No | Regex on six English nouns; `Asset` has no alt-text field to check |
| Guardrails | Block-severity enforcement to audience | 2 | No | `blockersFor()` ignores `AIReview` severity; a block is bypassable by never running the check |
| Guardrails | Review scoring (tone/readability/compliance) | 2 | Partial | Invented coefficients, never thresholded, displayed as measurement |
| Guardrails | Brand voice / inclusive language / terminology | 3 | Partial | Real deterministic engine, 42 tests — vocabulary hardcoded |
| Guardrails | AI-content labelling & provenance | 3 | Partial | Well-modelled; stops at the content record, never reaches ChannelExecution |
| Intelligence | Audience recommendation (WHO) | 0 | No | No lookalike, propensity, ranking or overlap analysis anywhere |
| Intelligence | Timing recommendation (WHEN) | 0 | No | Promoted campaigns get `TODAY+30` / `+90` hardcoded |
| Intelligence | Channel recommendation (WHICH) | 1 | No | `recommendChannelKinds()` always starts `['email','social']` for every idea |
| Intelligence | Campaign health / anomaly detection | 3 | Partial | Genuinely computed; fixed 20% threshold, 4-week window, not tunable, no alerting |
| Decisioning | Variant/creative selection | 0 | No | No experiment, arm or result entity; hypotheses can never be evaluated |
| Decisioning | Budget reallocation decisioning | 0 | No | "Reforecast" is a numeric input |
| Decisioning | Acting on a recommendation under governance | 1 | No | Only path is idea→campaign, and it discards the recommendation (`kpiIds: []`) |
| Agents | Agent-initiated work | 0 | No | Every AI invocation is a click handler; no scheduler, queue, worker or bus |
| Agents | AI gates in workflow stages | 1 | No | `WorkflowStage.automation` displayed as enforced; no code connects a transition to `reviewContent` |
| Agents | Agent catalogue vs executable behaviour | 1 | No | `capabilities` is an array of English sentences nothing reads |
| Agents | Copilot (A8) | 3 | Partial | Real provenance discipline over 11 intents; question 12 returns the capability list |

### Measurement, experimentation & analytics

| Domain | Capability | Score | Enterprise ready? | Evidence |
|---|---|---|---|---|
| Forecasting | Campaign / budget / conversion / churn forecasting | 0 (×4) | No | Zero projection code in the repo; no run-rate, regression or confidence interval |
| AI Search | LLM visibility monitoring | 0 | No | Zero `chatgpt`/`perplexity`/`ai overview` hits; needs a backend that does not exist |
| Experimentation | Experiment entity & lifecycle | 0 | No | No experiment/test/arm record in `SeedDB` |
| Experimentation | Holdout / control / incrementality | 0 | No | `PerformancePage.tsx:370` admits it in writing |
| Experimentation | Statistical confidence & sample sizing | 0 | No | All `confidence` fields are authored analyst judgement |
| Experimentation | Winner selection / champion-challenger | 0 | No | `splitPct: 50` renders a label and splits nothing |
| Experimentation | Experiment history / repository | 0 | No | Four curated success stories; failures leave no trace |
| Experimentation | Lift measurement | 1 | No | `liftPct` is hand-typed 34/27/19/22 in `seed/benchmarks.ts` |
| Analytics | Communication analytics (send/deliver/bounce/click) | 1 | No | Declared `communicationId` dimension has zero populated rows; no delivery layer at all |
| Analytics | Brand analytics | 1 | No | `brand_consideration_pct` KPI has zero fact rows and silently vanishes from board views |
| Analytics | Audience analytics | 1 | No | Persona performance is an even split of campaign totals (`metricSelectors.ts:615`) |
| Analytics | Anomaly detection | 2 | Partial | Flat 20% threshold, no variance model, launches guarantee false positives |
| Attribution | Touchpoint provenance | 1 | No | 31 draft + 24 queued executions enter the credit pool vs 28 sent |
| Attribution | Comms outcome → business outcome | 1 | No | No order, opportunity, account or person key; unattributed conversions silently dropped |
| Closed loop | Measurement → planning write-back | 1 | No | Read-only by design, and `PerformancePage` reads frozen `getSeedDB()` |
| Attribution | Five pluggable model calculators | 3 | Partial | Correct, tested, comparable — over touchpoints that are schedule metadata |
| Analytics | Business analytics (ROI/CAC/CPL/ROAS) | 3 | Partial | Disciplined null-returning calculators over self-declared inputs |
| Analytics | Operational analytics / SLA | 3 | Partial | `decidedAt` exists and no selector uses it — no cycle time, no bottleneck analysis |

### Enterprise foundations

| Domain | Capability | Score | Enterprise ready? | Evidence |
|---|---|---|---|---|
| Integration | Connector framework | 0 | No | Zero `fetch`/`axios`/`WebSocket` in `src`; `adapterKey` resolves to nothing |
| Integration | CRM / CDP integration | 0 | No | Nothing for a CDP to sync *to* — no person entity |
| Integration | CMS / DAM / ERP / HR / analytics integration | 0 | No | All 400 MetricResult rows are authored constants with no source or freshness |
| Integration | Identity provider / SSO | 0 | No | Zero `saml|oidc|sso|oauth|scim|jwt` hits; `setRole` callable from the console |
| Integration | API auth, webhooks, idempotency | 0 | No | Client-side id generation with no cross-session uniqueness |
| Integration | Integration observability | 0 | No | One `console.error` in `ErrorBoundary.tsx:24` is the only error sink |
| Reliability | Failed-communication detection | 0 | No | 5 seeded `failed` executions; zero UI reads that status |
| Reliability | Retry / backoff / dead-letter | 0 | No | No `attemptCount`, `lastError` or `nextRetryAt` on `ChannelExecution` |
| Reliability | Queueing / rate limiting / timeouts | 0 | No | `queued` is a string; no job runner acts on `scheduledAt` |
| Reliability | Provider failure / degradation | 0 | No | No providers to fail — unbudgeted work per future channel |
| Reliability | Delivery / job / SLA monitoring | 1 | No | SLA math anchors on frozen `DEMO_TODAY`; all 36 notifications seeded, none code-created |
| Governance | Retention, archival, legal hold | 0 | No | `removeFrom` is an unconditional hard delete with no tombstone |
| Governance | Audit trail durability | ~~1~~ **3** | **[CLOSED] Partial** | ~~`useState<AuditEntry[]>` capped at 500, excluded from the localStorage payload, lost on refresh~~ → every mutation writes an append-only `AuditRecord` persisted with the record data (`src/lib/auditTrail.ts`, `DataStore.tsx`); survives reload and store reset. Still client-side and per-device: no server store, retention policy, legal hold or export |
| Governance | AI governance policy | 1 | No | No AI `PolicyKind`, no human-review gate, no model registry |
| Governance | ABAC | 1 | No | One real rule (agency scope); `RESTRICTED_VIEWERS` duplicated in two files |
| Governance | RBAC | 2 | No | Page-visibility booleans over a localStorage role string; masking is cosmetic |
| Governance | Data classification | 2 | No | Only `Restricted` behaves; `Confidential`/`Internal` are inert labels |
| Governance | Approval governance & SoD | 3 | Partial | Best mechanism here — but no engine advances stages; `Escalated` written by nobody |
| Global | Multi-organization / multi-tenancy | 0 | No | One hard-coded Org; `organizationId` never read by any selector |
| Global | Multi-country data model | 0 | No | `Region {name, code}` × 3; EU/KSA/GCC all inside REG-EMEA |
| Global | Currency & multi-currency finance | 1 | No | Module-level USD formatter; `Budget` has no currency field |
| Global | Time zones | 1 | No | `timeZone: "UTC"` hardcoded; frozen `TODAY = '2026-08-13'` |
| Global | Regional approval routing | 1 | No | Routing by `AppRole` alone; one Legal reviewer for the world, no delegation |
| Global | Multi-BU / multi-brand scoping | 2 | No | Scope is a display filter defaulting to "all"; stakeholder BU/region never constrains it |
| Search | Entity-type coverage | 1 | No | 6 of ~52 collections searchable; "No results found" reads as "does not exist" |
| Search | Search quality | 1 | No | `.includes()` linear scan over one field per entity |
| Search | Copilot retrieval | 2 | Partial | Honest, well-engineered intent router — not AI search |
| UX | Pagination | 0 | No | Zero of ~46 tables paginate; `.find()` joins inside render loops |
| UX | Sorting | 0 | No | No clickable column headers anywhere |
| UX | Bulk operations | 0 | No | No row selection; 48 approvals decided one at a time |
| UX | Contextual / row-level actions | 1 | No | No row menu, no inline edit, no quick status change |
| UX | Responsive behaviour | 2 | Partial | Real mobile shell; ~40 of 46 tables lack an `overflow-x-auto` container |
| UX | Accessibility | 2 | No | One `aria-live` region in 53k lines under a toast-heavy model; no axe test |
| UX | Search / filter / saved views | 2 | Partial | Good, on 2 of 28 pages; views are per-browser localStorage, unshareable |
| Lifecycle | Transitions reachable through the UI | 1 | No | ~18 of ~70 status values ever written; Campaign has no reachable Live/Completed |
| Lifecycle | Exception & emergency handling | 2 | No | Crisis freeze is one-way; no unfreeze, no Resolved/Post-mortem path |
| Campaign mgmt | Cloning, templates, recurring campaigns | 0 | No | No clone action, no template entity, no recurrence field |
| Campaign mgmt | Campaign record maintenance | 1 | No | `CampaignDetail.tsx` (616 lines) contains no mutation call at all |
| Campaign mgmt | Hierarchy (programs, waves, tasks) | 1 | No | No Program, Wave, Task, Milestone or Dependency in `EntityName` |
| Campaign mgmt | Dependencies & milestones | 1 | No | `dependsOn` exists only on ephemeral `ExecutionTask` |
| Campaign mgmt | Versioning & change history | 1 | No | Campaign has no `version`. ~~no code writes an `AuditRecord`~~ — campaign mutations now do (`campaign.created/updated/deleted` with a field diff), so change history exists even though versioning does not |
| Campaign mgmt | Conflict detection | 2 | Partial | Audience-day collisions only; no severity, no waiver, no resolution trail |
| Comms entity | Communication type taxonomy | 1 | No | 4-value `CommsType`; 'external' absorbs 30 of 52 records |
| Comms entity | Communication lifecycle & authoring | 2 | Partial | Best-modelled entity — but `createDraft` produces permanently unsendable, filter-invisible records |
| Ideation | Idea capture & intake | 1 | No | No "New idea" button anywhere in `IdeationHub.tsx` |
| Ideation | Idea scoring & prioritization | 1 | No | "Composite score" composed of nothing; no rubric, no recompute |
| Ideation | Duplicate detection | 0 | No | Zero similarity code |
| Ideation | Collaboration (comments, votes) | 0 | No | No Comment or Vote entity |
| Ideation | Idea→campaign traceability | 3 | Partial | Bidirectional link is real; no un-promote, no trace to outcome. ~~no audit record~~ — the promote now writes `idea.updated` + `campaign.created` entries |
| Strategy | Objectives model | 2 | No | Objectives are `string[]`, not entities; Strategy is read-only everywhere |
| Strategy | Audience/channel/budget/regional strategy | 2 | No | Inventories, not strategy — no channel mix target, no allocation by market |
| Strategy | Competitive intelligence | 2 | No | 100% static seed; `alertTriggers` is a string array nothing evaluates |
| Strategy | Alignment & objective mapping | 3 | Partial | Real orphan detection — and the app's own promote flow creates orphans by construction |
| Strategy | Messaging house / positioning | 3 | Partial | Well modelled; nothing enforces that content uses the approved messaging |
| Listening/VoC | Mention capture, reviews, surveys, signal→action | 0 (×4) | No | No listening, mention, review, survey or feedback entity anywhere |
| Listening/VoC | Sentiment & topics | 1 | No | 3 hand-typed literals on 40 press articles surfaced as a live KPI tile |
| PR & Media | Media lists & pitch management | 0 | No | No MediaList or Pitch entity |
| PR & Media | Press releases & editorial planning | 1 | No | Embargo inferred from campaign start date, never stored as data |
| PR & Media | Journalist database | 2 | No | Read-only; "relationship history" is a single timestamp; outlet is free text |
| PR & Media | Coverage & share of voice | 2 | No | SoV seeded separately from coverage items — two unreconciled truths |
| Crisis/Exec/Internal | Executive communications | 1 | No | No 'executive' `CommsType`, no voice profile, no elevated approval |
| Crisis/Exec/Internal | Internal communications | 2 | No | Read-only; "employee reach" is address-book size, not readership |
| Crisis/Exec/Internal | Crisis incident management | 3 | Partial | Real cross-entity freeze — with a permanently empty timeline and no unfreeze |
| Events | Event management | 1 | No | 9 fields; no attendee, capacity, agenda, budget or ROI |
| Agency | Agency management & scoped access | 2 | Partial | Excellent allowlist ABAC; contact resolution by email-domain substring matching |
| Budget | Resource allocation, capacity, workload | 0 | No | `Stakeholder` has no capacity, rate, skill or availability field |
| Budget | Budget planning & scenarios | 3 | Partial | Best money surface — "committed" is plan money, no actuals, no currency |
| Data quality | Duplicate / orphan / staleness detection | 1 | No | One orphan selector, wired to the frozen seed; 5 help-text claims with no code |
| Data quality | Referential integrity checking | 2 | No | 355 hand-written lines, DEV-only, `console.error`, never sees runtime data |
| Data consistency | Single read-side across surfaces | 2 | No | 11 surfaces still call `getSeedDB()` directly; split-brain reproduced |
| Data consistency | Metric reconciliation | 2 | Partial | Strong test discipline; `avgEngagementRate` is an unweighted mean of rates |
| Knowledge graph | Generic traversal | 2 | No | Blind to 24 of 52 collections; `rowsOf` falls through to `return []` |
| Domain model | Asset / Product / Outcome entities | 0–1 | No | Asset is a 5-field stub; no Product entity; no Outcome/benefit entity |
| Domain model | Agency, Vendor, Budget | 1 | No | Agency is 3 fields; no Vendor entity at all; Budget has no actuals or currency |
| Domain model | Org backbone (BU, Region, Country, Brand) | 2 | No | No Country entity; Region is a 3-value continent enum |

**Already strong (4–5) — protect and build on:**
- Legal clause library — jurisdiction × locale × channel × product-category × effective-date resolution, eight-word fingerprint matching, supersession chain (`simulated.ts:434-506, 876-949`) — **4**
- Content version history & AI provenance — `ContentProvenance` with source, generator, basis, derivedFromVersionId, personaId, channelId, preservedFragments (`types.ts:470-519`) — **4**
- Attribution stated limitations & five-model comparison honesty (`PerformancePage.tsx:355-373, 1650-1780`) — **4**
- Lifecycle status vocabulary richness as a *data model* (`types.ts:78-142`) — **4**
- External benchmarking with named sources and null-rather-than-interpolate discipline (`metricSelectors.ts:726-788`) — **3**, notable
- Approved terminology / glossary with Unicode-aware, locale-scoped, case-sensitive matching — **3**, notable

---

## 3. UI WITHOUT LOGIC — DEMO-RISK REGISTER

| Surface | What it appears to do | What actually happens | Risk if a buyer probes it |
|---|---|---|---|
| Journeys & channels canvas (`JourneysChannels.tsx`, `JourneyCanvas.tsx:159`) | Run an active, versioned, branching orchestration with waits, conditions and splits | Read-only viewer; `condition` interpolated into a label, `splitPct` formats a caption, triggers carry no `config`, no member entity exists. Activating writes a status string | "Show me a member currently in flight" — there are none, ever, and Active journeys send nothing with no error |
| Journey builder | Create and edit journeys | No create-journey path; `publishWaitEdits` rewriting `waitDays` is the sole authoring action. All 8 journeys are TS literals | Clicking "new journey" finds nothing; every journey change becomes an engineering ticket |
| Consent handoff manifest (`JourneysChannels.tsx:341-482`) | Gate sends on consent, tightest-channel binding, per-segment handoff | Display-only; `pushDraft` never reads `consentSummaries`. A 0% handoff row in red can be pushed with no warning | A DPO reads "Every send checks consent state first" (`:1611`) next to a shield icon; the enforcement function provably does not |
| Suppression enforcement block (`AudiencesPage.tsx:1219-1226`) | Absolute, non-overridable suppression at send | Never read by `blockersFor()`; one org-wide scalar subtracted from every segment row, so 8 entries across 4 segments deducts 32 people | Legal's do-not-contact entry has zero mechanical effect, and the reach forecast is not additive |
| Channel registry with `adapterKey` | SendGrid, press wire, SharePoint, Zoom are connected | Six strings interpolated into toast text; no `ChannelAdapter` interface or implementation exists | Buyer scopes integration effort at ~zero and is wrong by person-quarters |
| Segment criteria in monospace (`AudiencesPage.tsx:1004`) | Live rule-based segmentation with computed sizes | `criteria` is never parsed; `segmentSize()` returns a hand-typed integer; reach is a naive overlapping sum | "Change this rule and recompute" — nothing recomputes, and AUD-001's three overlapping Volt segments double-count |
| Persona refresh (`AudiencesPage.tsx:898`) | Rebuild persona from consented cohorts of ≥1,000 profiles | Increments a version integer and writes a toast; no profiles exist to build from | A privacy assurance rendered in the UI is unverifiable in a security review |
| Asset Library upload (`AssetLibrary.tsx:135-241`) | Upload and manage digital assets | A text input for a filename; no `<input type="file">`, no bytes, not one `<img>` in the app | Anyone clicking an image expecting to see it fails immediately |
| Asset brand-approval checklist (`AssetLibrary.tsx:251-336`) | Five brand checks confirmed before approval | Human attestation over a file the system has never opened; rejection reason shown in a toast and discarded | "All 5 brand checks confirmed" is asserted about an unopened file, and the gate produces no evidence |
| Governance policies tab (`GovernancePage.tsx:791-843`) | POL-006..010 enforced by AI gates in named workflows | No code evaluates them; `aiGateWorkflowsFor()` maps policyKind to a display string | Write an undisclosed paid post to test POL-008 and it returns green |
| Workflow Designer AI gates (`WorkflowDesigner.tsx:395-418`) | Automation runs when work reaches a gated stage | No path from a stage transition to `aiService.reviewContent`; only a manual button runs it | A compliance officer is told POL-002 is enforced at a stage nothing evaluates |
| Sub-brand inheritance chip (`RulebookPage.tsx:227-243`) | Inherited guardrails in force on sub-brands | Enforcement reads `brand.guardrailPolicyIds` only; `parentBrandId` never walked. Seed masks the bug | A brand house discovers sub-brand governance is cosmetic; a warn-level parent guardrail vanishes silently |
| Agents page (`AgentsPage.tsx`) | Eight agents that score ideas, generate, monitor and act | Pure presentation of `db.marcomAgents`; `capabilities` are English sentences nothing reads; no runtime, trigger, queue or run record | "A3 scores and ranks ideas" → a table sorted by a hand-authored `Idea.score` column |
| Notification bell + SLA tiles (`NotificationPopover.tsx:24`, `ApprovalsInbox.tsx:275`) | Live monitoring: SLA breaches, expiries, escalations | All 36 notifications seeded; no code creates one; time frozen at `DEMO_NOW`; `Escalated` written by nobody | An approval breaches by a week with no alert and no colour change |
| Governance audit trail (`DataStore.tsx`) **[CLOSED]** | Durable compliance record of who did what | ~~React state capped at 500, excluded from the localStorage payload, erased on refresh; no code writes an `AuditRecord`~~ → every mutation writes an append-only `AuditRecord` with actor and before→after diff, persisted with the record data | ~~A SOX/GxP evaluator treats it as evidence; F5 destroys it and a declared crisis shows an empty timeline~~ → the trail now survives F5 and crisis timelines populate. Residual: it is per-device browser storage, so a SOX/GxP evaluator still cannot treat it as tamper-evident |
| Localization / transcreation button (`ContentDetail.tsx:493-521`) | Produce Arabic and locale variants for KSA/GCC | `[Simulated transcreation to X] <English>` or one fixed Arabic sentence identical on every item | Any Arabic reader in the room sees the same placeholder sentence on every asset |
| Content review path (`ContentDetail.tsx`) | Author, review and route content | No editor exists (no `versionsCol.updateIn`), no content can be created, no Content approval can be raised, `currentVersionId` never re-pointed | A prospect creates a draft and hits a dead end; ten AI drafts are invisible to review |
| Ideation Hub | Capture, score and prioritise ideas | No "New idea" form; `score` is a seeded literal with no rubric or recompute | "Why is this idea 87 and that one 61?" has no answer |
| Campaign hierarchy / execution tasks (`JourneysChannels.tsx:788`) | Generate an execution plan with dependencies | `ExecutionTask[]` in `useState`, discarded on navigation; no Task entity exists | Users believe work was created; navigating away destroys it |
| Journeys "queued" status | Work is in flight, scheduled to send | Synchronous local `updateIn`; no queue, worker, throttle or scheduler behind it | "Queued" tells an operator something is happening when nothing is scheduled to run |
| A/B variant hypotheses (`ContentDetail.tsx:620`) | Built-in A/B testing with stated hypotheses | Copywriting artifacts; no arm, no split, no per-variant metric, no winner | The platform cannot report which variant won — "winners" become folklore |
| Journey branch "50/50 split" (`JourneyCanvas.tsx:130`) | Randomized traffic split | Renders a caption; no audience is divided, no arm measured | Sends go out under an assumption the engine does not honour |
| Performance "By persona" table (`metricSelectors.ts:615`) | Measured persona performance | Campaign totals split evenly across whoever the campaign touched | A persona is retired on a number identical to what it would be with zero effect |
| Strategy objectives / messaging house | Governed objectives and enforced narrative | Objectives are `string[]`; Strategy is read-only; no rule checks content against pillars | Copy can contradict approved messaging with no system objection |
| Market intelligence panel | Live competitive monitoring with confidence and alert triggers | 100% static seed; `alertTriggers` is prose nothing evaluates | Decisions taken on data frozen at the date the seed file was written |
| Login picker (`LoginPicker.tsx:22-35`) | Role-based access control | `localStorage['marcomm-role']`; `setRole` is callable from devtools; Restricted bodies ship in the JS bundle | Any visitor becomes Platform Admin in one console command |

---

## 4. ARCHITECTURAL RISKS (deduplicated, ranked)

**1 — No backend, no network layer, no durable persistence.** Zero `fetch`/`axios`/`WebSocket`/`EventSource` across 53,814 lines; `src/store/DataStore.tsx:27,127` serialises the entire dataset to one localStorage key. *Consequence:* every save is single-browser and single-device, two users can never see each other's work, a cache clear destroys the deployment's data, and every approval, agency-scoping and collaboration feature is a single-player simulation. Every other risk below sits on top of this one.

**2 — No execution runtime.** No journey engine, scheduler, timer, dispatcher, queue, worker or channel adapter. `pushDraft` writes `status:'queued'`; `transition()` writes a Journey status; `adapterKey` resolves to no code. *Consequence:* nothing can be sent, therefore nothing can be governed at send time — every consent, suppression and fatigue control is structurally unreachable rather than merely unfinished. A pilot customer activates a journey, sees "Active", and receives zero sends with no error and no telemetry.

**3 — No customer/contact entity.** The finest-grained person-like record is `SuppressionEntry.subjectKey`, a masked string. *Consequence:* one schema decision blocks five separate brief requirements — per-contact consent decisions, frequency capping (needs a send ledger), merge-field personalization (needs attributes), behavioural triggers (needs an event log), preference centres (needs an identity). Also blocks per-person prediction, churn, saturation and identity resolution. Treat as one foundation change with blast radius across Audience, Segment, Journey and ChannelExecution — not five features.

**4 — Documented controls that do not exist (claim/code divergence).** `page-help.ts:1495` ("a platform-level suppression service evaluates before every send: suppression lists, consent state, crisis freezes, and frequency caps"), `JourneysChannels.tsx:1611-1612`, `AudiencesPage.tsx:1223-1225`, plus channel weekly capacity (`:1049/1096`), the POL-010 24-hour reconciliation window, block-level override gated by role (`:1994`), AI auto-tagging and visual similarity (`:1173/1238`), AI idea clustering and auto-scoring (`:833-835`). *Consequence:* these ship inside the product and will be read by evaluators. In due diligence they read as compliance misstatements, not roadmap — and they contradict the admirably honest `AgentsPage` and seed comments in the same build.

**5 — No authentication; authorization is client-side over data the client already holds.** `localStorage['marcomm-role']` (`rbac.ts:160`), no credential, session or token; `setRole` callable from devtools. *Consequence:* every RBAC guard, classification mask and segregation-of-duties check is decorative — Restricted communication bodies are in the JS bundle regardless of role. Fails at the first security gate.

**6 — The audit trail cannot record the actions it governs. [PARTLY CLOSED]** ~~No `auditRecords.createIn` exists anywhere; the runtime log is `useState` capped at 500 and deliberately excluded from the persisted payload (`DataStore.tsx:119,127,147`); `GovernancePage.tsx:461-464` reads the static `seedAuditRecords` import, so an in-app crisis renders a permanently empty timeline.~~ The recording half is fixed: `DataStore.tsx` writes an append-only `AuditRecord` — actor, action, entity type/id, before→after diff — for every create/update/delete via `src/lib/auditTrail.ts`, persists it in the same `localStorage` payload as the records, and the crisis timeline merges it with the seed, so an in-app incident now has a history that survives a reload and a store reset (`src/test/audit-trail.test.ts`). Rejection reasons are still toasted and discarded. What is *not* closed: the store is this browser's `localStorage`, not a server-side tamper-evident one — per-device, clearable from devtools, capped at 500 entries, with zero retention policy, zero legal hold, no export, and `removeFrom` still an unconditional hard delete of the record itself. *Consequence:* the trail is now usable as a working record of what happened in the app, but still not admissible evidence; "preserve all communications relating to X" remains unimplementable and any user with delete access can still destroy the underlying records irreversibly.

**7 — A single enforcement function exists and it ignores consent, suppression, frequency and AI review severity.** `blockersFor()` (`JourneysChannels.tsx:275-311`) checks Paused comms, Rework status and pending Approvals — nothing else. *Consequence:* this is the proof of absence for the compliance findings. The silver lining is diagnostic: the crisis freeze (`GovernancePage.tsx:1802-1828`) proves the policy→enforcement pattern works end to end, so display-level consent/suppression gating is three lines of wiring — genuine per-contact enforcement still needs risk #3.

**8 — No event or signal layer.** No bus, store or subscription. *Consequence:* nothing can react. Trigger nodes have nothing to bind to, conditions have no evaluator, `Competitor.alertTriggers` is prose, and asset-expiry notifications are pre-baked seed rows rather than derived from `rightsExpiry` crossing today. Making the platform reactive means adding a whole architectural tier.

**9 — Depicted lifecycle exceeds executable lifecycle ~4×.** ~18 of ~70 declared status values are ever written. Campaign has no reachable Live, Completed, Cancelled or Archived; Content cannot be created at all; `failed` is read by zero surfaces; `Escalated` read in six and written in none. The seed ships records in states the app cannot produce. *Consequence:* the demo shows launch and completion flows that do not exist — the highest-risk misrepresentation in the product.

**10 — Entities are created in permanently invalid states because detail screens are read-only.** `IdeationHub.tsx:148-168` creates campaigns with `kpiIds: []` and no `strategyId`; `CampaignDetail.tsx` (616 lines) contains no mutation call, so that campaign can never receive one. `CommunicationsPage.tsx:749-766` creates comms with no `campaignActivityId`, no execution and no schedule, and the same page's scope filter then hides them. *Consequence:* the app's own creation flows manufacture orphans and invisible records; the numbers only reconcile for hand-seeded rows.

**11 — No tenancy dimension.** One hard-coded Organization; `organizationId` never read by any selector, page or component. *Consequence:* cannot be sold to a second customer without a data-layer rewrite; in a shared deployment nothing prevents Customer A seeing Customer B's campaigns.

**12 — Split read-side.** 11 surfaces still call `getSeedDB()` directly while 22 use `useLiveDB`; `kpis` and `metricResults` are absent from the overlay entirely. *Consequence:* a promoted campaign appears on CommandCenter but never on PerformancePage; StrategyPanel's orphan detector runs against frozen data so runtime orphans are never flagged; ApprovalsInbox renders raw ids. No lint rule prevents the next regression.

**13 — No experiment entity and no incrementality.** No experiment/arm/variant record, no `experimentId` on `MetricResult`, no holdout — admitted in writing at `PerformancePage.tsx:370`. `PlaybookPattern.liftPct` is hand-typed. *Consequence:* every conversion, revenue and ROI figure is a correlation finance cannot defend; the most persuasive number on the Performance page ("+34% lift") is data entry.

**14 — Attribution credits work that was never delivered.** `STATUS_WEIGHT_HINT` admits draft (0.25) and queued (0.5) executions; the seed has 31 draft + 24 queued vs 28 sent. *Consequence:* directionally wrong in a way that rewards planning volume over delivery — worse than no attribution.

**15 — Money is plan money.** "Spend" is `CampaignActivity.spendAllocated`; Budget has no actuals, commitments, invoices, POs or currency; `MetricResult` has no currency either. *Consequence:* nothing reconciles to a general ledger and multi-currency silently sums mixed units — indefensible in exactly the CFO audience the BoardPack targets.

**16 — Brand rules are compiled into source and gated on literal ids POL-001..005.** Four banned hype terms, 21 inclusive rules, two trademarked products, nine jargon swaps, nine channel framings, nine asset specs — all module constants. *Consequence:* onboarding a second brand or customer is a code deploy; the rule engine is not multi-tenant, and the five seeded policies outside that id range display as enforced while nothing evaluates them (a `block` policy with no rule produces an affirmative false clearance).

**17 — The AI seam accepts only two strings.** `ReviewInput` = title + body (`services/ai/index.ts:56-95`); embedded assets are never passed. *Consequence:* no rule can ever consider an image, layout or attachment. Extending to visual compliance is an interface re-architecture, not a provider swap — which undercuts the "swap in a real LLM behind the same seam" claim for everything except copy checks. And because the guardrails validate form not truth, a real LLM will have its hallucinations pass on day one.

**18 — No Country entity.** `Region {name, code}` × 3; the legal seed itself flags that EU, KSA and GCC all sit inside REG-EMEA. *Consequence:* KSA mandated copy resolves through a continent bucket of ~100 countries with incompatible advertising law; the clause engine either over-applies or misses. Retrofitting touches Jurisdiction, LegalClause, Region, ReviewContext and every localisation path.

**19 — The knowledge graph is blind to 24 of 52 collections,** and impact analysis stops two hops short. `ID_PATTERN` and `collections()` were written for the original 28 entities; `GraphExplorer.rowsOf` falls through to `return []`. `assetImpact` never hops Communication→ChannelExecution→Channel or unions `regionIds`. *Consequence:* an empty "Referenced by" panel is indistinguishable from "nothing references this" — a confident wrong answer; and the flagship rights-expiry question omits which live queues to halt and which markets carry legal exposure.

**20 — Nothing is time-driven.** `TODAY = '2026-08-13'`, `DEMO_NOW` frozen, no scheduler on `scheduledAt`, no SLA timer, no code-generated notification. *Consequence:* every "monitoring" surface is a fixed picture presented as live.

**21 — Silent failure by construction.** Five seeded `failed` executions read by zero UI; no failure-reason field, retry, backoff, dead-letter or observability sink beyond one `console.error`. *Consequence:* once a real provider is attached, lost sends are undetectable — the highest-severity operational defect a comms platform can have.

**22 — Asset is a five-field stub with no `altText`,** so POL-004 is unenforceable and the review compensates by regex-scanning prose for "image" (`simulated.ts:843-874`). *Consequence:* a ContentVersion embedding three untagged images receives an explicit accessibility pass. A gate that emits false clearances is worse than an absent one.

**23 — Approval routing resolves a role to one person** (`db.stakeholders.find(s => s.role === role)`), with no delegation, out-of-office, escalation target or quorum. *Consequence:* the app's strongest governance area does not survive contact with a real org chart; one Legal reviewer on leave stops every approval in every region.

**24 — No Outcome/benefit-realisation entity,** so the eight-stage lifecycle's "learn" stage has nothing behind it and `liftPct` is authored. *Consequence:* institutional memory cannot accumulate — which is the entire justification for a MarComm platform over spreadsheets.

**25 — Zero pagination, sorting or virtualisation across ~46 tables, with `.find()` joins inside render loops** (`CampaignList.tsx:83-89`). *Consequence:* O(n×m) rendering that freezes the tab at the first realistic dataset; the fix is a data-layer change, not a component swap.

**26 — Duplicated policy logic that will drift.** `RESTRICTED_VIEWERS` redeclared in `GlobalSearch.tsx:21-26` and `copilot.ts:631`; classification masking re-implemented in eight files with no shared function and no test asserting agreement. *Consequence:* one surface will eventually leak Restricted content while the others mask it.

---

## 5. MARKET GAP REPORT

### A — Missing and critical (blocks enterprise sale outright)

| Gap | Why it is category A |
|---|---|
| Server tier + durable multi-user persistence | localStorage single-device storage makes every collaborative feature fictional; nothing else on this list can be built without it |
| Customer/Contact profile entity + identity resolution | No addressable person exists; blocks consent, personalization, frequency, triggers, prediction simultaneously |
| Execution runtime — scheduler, queue, worker, channel adapter framework | Nothing is ever sent; "orchestration" resolves to a status string and a toast |
| Authentication + SSO/OIDC/SAML + SCIM, server-enforced authorization | `localStorage['marcomm-role']`; every control is bypassable from devtools |
| ~~Durable, append-only audit trail written by code~~ **[CLOSED for the client; the server-side store is subsumed by the server-tier item above]** | ~~No `auditRecords.createIn` exists; runtime log dies on refresh; crisis timelines render empty~~ → written by code, append-only, persisted, crisis timelines populate. Remaining need is a *tamper-evident server-side* trail with retention and legal hold |
| Consent & suppression enforcement wired into the send gate | `blockersFor()` never reads either collection while three UI surfaces assert it does |
| Event/signal layer (ingest, store, subscribe) | Triggers, conditions, alerts, expiry detection and reactivity all depend on it |
| Journey builder + execution engine (enrolment, member state, wait timers, traversal) | The single most-demoed capability in the category; today a diagram with one editable integer |
| Delivery telemetry: sent/delivered/bounced/failed + retry, backoff, dead-letter | 5 seeded `failed` rows no UI reads; silent delivery failure is the worst class of defect here |
| Frequency capping + send ledger | Documented as enforced at `page-help.ts:1495`; no cap entity, no counting window, no data to count |
| Multi-tenancy (tenant key + server-enforced row filtering) | Cannot sell to a second customer without a data-layer rewrite |
| Retention, archival and legal hold | A platform holding investor and press comms cannot be deployed by a listed company without it |
| Content editing + route-to-review path | A content platform where humans cannot write content and cannot submit it for approval |
| Campaign create/edit (and Program/Wave/Task entities) | `CampaignDetail.tsx` has no mutation call; promoted campaigns are permanently KPI-less orphans |
| Country entity | Prerequisite for the legal engine to be correct at all; EU/KSA/GCC currently share one region bucket |
| Real file storage + upload for DAM | An asset library with no assets; every visual capability is unreachable from here |
| Unsubscribe mechanism (link, token, handler, auto-suppression) | CAN-SPAM/GDPR/PECR requirement, declared in POL-010 and unimplemented |
| Remove or correct every overclaiming help-text/UI assertion | Fastest, cheapest risk reduction available; today they read as compliance misstatements |

### B — Partially implemented (exists but not enterprise-grade)

| Gap | Current shortfall |
|---|---|
| Approval workflow engine | Decisions recorded; no stage advancement, delegation, escalation trigger, quorum or reassignment; role resolves to one person |
| Brand/compliance rule engine configurability | Executable and well-tested, but vocabularies are TS constants; POL-006..010 display as enforced with no code |
| Sub-brand guardrail inheritance | Rendered in the UI, never resolved by any enforcement path |
| Segment criteria evaluation | DSL displayed in monospace, never parsed; sizes are typed integers; overlap never computed |
| Knowledge graph coverage & impact depth | Blind to 24 of 52 collections; asset impact stops at Campaign, omitting channels and regions |
| Attribution input quality | Five rigorous models over schedule-derived touchpoints, crediting undelivered drafts |
| Measurement grain | Weekly campaign×channel only; declared `communicationId` dimension unpopulated; no `contentId`, no arm |
| KPI attainment period handling | 10-week fact grid summed against FY targets with no proration or disclosure |
| Read-side consistency | 11 surfaces on `getSeedDB()`; `kpis`/`metricResults` absent from the live overlay |
| Data-quality framework | One orphan selector wired to frozen data; five help-text claims with no implementation; integrity checks are DEV-only |
| Budget → finance | Plan money only; no actuals, POs, invoices, currency or GL reconciliation |
| Localization operations | Model is right; the transcreation function emits a placeholder; no translation status, queue or invalidation |
| Asset metadata, rights, versions, renditions | 5 fields; one expiry date cannot answer "may we use this, here, this many times" |
| RBAC/ABAC depth | Page-visibility booleans; one real ABAC rule (agency); duplicated `RESTRICTED_VIEWERS` |
| Data classification behaviour | Only `Restricted` does anything; `Confidential`/`Internal` are inert labels |
| Global search | 6 of ~52 entity types; substring on one field; linear scan per keystroke |
| List UX (pagination, sorting, bulk ops, row actions) | Zero of each across ~46 tables |
| Journey versioning & crisis freeze | Both genuinely good; versioning governs one field, freeze has no inverse operation |
| Communication taxonomy & create path | 4-value enum absorbing 10 kinds; `createDraft` produces unsendable, filter-invisible records |
| Ideation intake, scoring rubric, collaboration | No submit form, no rubric behind the "composite" score, no comments or votes |
| PR & internal comms | Read-only CRMs; SoV unreconciled with coverage; "employee reach" is address-book size |
| Anomaly detection tuning | Flat 20% / 4-week rule, not configurable, no variance or seasonality model, no alerting |
| Copilot coverage | Excellent provenance discipline over 11 fixed intents; question 12 returns the capability list |
| Accessibility of the app itself | One `aria-live` region under a toast-heavy model; no axe test, no skip link, no VPAT path |
| Multi-BU/brand scope as an access boundary | Display filter defaulting to "all"; stakeholder BU/region never constrains it |

### C — Differentiators (already strong or nearly so — protect, deepen, lead with)

1. **Jurisdiction-aware legal clause engine** — narrowest-first KSA→GCC→EU→GLOBAL precedence with a GLOBAL floor, clause matching by locale × channel × product category × effective date, eight-word fingerprinting deliberately chosen so a superseded version cannot satisfy its replacement, supersession warnings naming both versions, and honest "not evaluated" when the library is absent. Nothing else in the category does this at this fidelity. Add authoring + placement rules and it becomes the product's reason to exist.
2. **AI provenance as a first-class model** — `ContentProvenance` records source, generator, basis, parent version, persona, channel, reviewer feedback and the exact fragments preserved verbatim, with honest degradation for pre-field rows. This is the EU AI Act evidence layer most vendors will scramble to retrofit; extend it to ChannelExecution and it becomes a disclosure register.
3. **Measurement honesty as a feature** — per-model "cannot account for" statements, five models shown side by side over identical touchpoints, `costMetrics` returning `null` rather than a fabricated zero and exposing the metric keys behind each denominator, benchmarks declining to interpolate. Sell the caveats; competitors present one number as truth.
4. **Governed refinement with verbatim preservation** — `preserve.every(f => body.includes(f))` structurally guaranteed, with re-appending rather than silent dropping. The right primitive for regulated AI editing.
5. **Crisis freeze as a working policy→enforcement chain** — one control that mechanically stops sends across pages. It is the template every other guardrail should follow.
6. **Agency-scoped ABAC via allowlist that fails closed** — genuinely well built and applied consistently across six pages plus CSV export.
7. **Channel constraint enforcement at generation time** — alt-text injected before the length check so it competes for the same budget, word-boundary truncation with the ellipsis counted, breaches recorded even when auto-fixed.
8. **Copilot provenance discipline** — every answer names the rule, source collections and records read; budget answers explicitly refused for unauthorised roles; unmatched queries return capabilities rather than a guess.

### D — Nice to have

- Bulk operations, column sorting, shareable/URL-encoded filter state and saved views beyond two pages
- Content reuse: clone, snippet library, template library, cross-item "derive from"
- Media lists and pitch pipeline for PR; journalist interaction log
- Event registration, attendee, agenda, capacity and cost model
- Executive voice profiles and ghostwriting workflow
- Idea collaboration: comments, votes, endorsements, duplicate clustering
- Campaign templates and recurring/always-on instantiation
- Asset auto-tagging, visual similarity and cross-media search (needs the vision tier first)
- Resource capacity, skills, utilisation and over-allocation detection
- Preference centre self-service surface (after the contact entity exists)
- Version diff and rollback for content, workflows and journeys
- Trend/time-series views on brand health and first-pass compliance rate

### E — Do not build (complexity without product value here)

- **A homegrown ESP/SMS/push delivery stack.** Integrate SendGrid/Twilio/Braze-class providers behind the adapter contract. Owning deliverability, IP warming and complaint feedback loops is a company, not a feature.
- **An in-house LLM or a bespoke inference layer.** The `AIService` seam is already correct. Keep the deterministic simulator as the offline/test provider and put a real vendor behind it — but stop calling template concatenation "generation".
- **Do not extend the simulated generator.** More `CHANNEL_FRAMING` rows, more `REFINE_RULES` regexes and more jargon swaps deepen a dead end and increase the switching cost to a real model. Freeze it.
- **A proprietary CDP / identity graph.** Build the minimal Contact entity plus keys and integrate a CDP/CRM. Identity resolution, householding and consent brokering at scale are not where this product wins.
- **Your own attribution science beyond the five models** (Shapley/Markov in-house). Without holdouts and per-person events, better math over worse data changes nothing. Fix touchpoint provenance first.
- **A built-in translation engine.** Wire a TMS/MT vendor and build the *operations* layer (translation status, queue, in-country reviewer, source-change invalidation) — that is the defensible part; the translation itself is a commodity.
- **A bespoke search index.** Six entity types on `.includes()` should become a real search service, not a hand-rolled ranking engine.
- **AI-answer-engine (ChatGPT/Perplexity) visibility monitoring — for now.** It requires a prompt corpus, paid multi-model querying with geo variation, repeated sampling with confidence bands and time-series storage. It is real market demand but it cannot exist before the backend, and building it early would consume the entire runway.
- **A visual/multimodal brand checker before file storage exists.** No byte enters the system today; logo, colour and layout checking is unreachable until storage, renditions and a vision model are in place. Do not simulate it.
- **More lifecycle status values.** ~70 declared and ~18 reachable. Make the existing states executable with a validated transition table; adding vocabulary widens the credibility gap.
- **A workflow DSL / rules-authoring IDE.** Ship configurable lists (banned terms, glossary, clause library, thresholds) as data first. A general rules language is a five-year detour.
- **Deeper client-only demo polish** — more seeded journeys, more agent cards, richer market-intel charts. Every hour here increases the surface area of the claim/code divergence in section 4, risk #4.

---

## 6. PRIORITY SCORING

**Formula (shown as briefed):**

```
PRIORITY = (Business Impact × 2)
         + Enterprise Buyer Importance
         + User Value
         + Competitive Importance
         + Strategic Differentiation
         − Technical Complexity
```

Scales 1–5. Max 24, min −4. `BI` Business Impact, `EBI` Enterprise Buyer Importance, `UV` User Value, `CI` Competitive Importance, `TC` Technical Complexity, `SD` Strategic Differentiation.

| # | Cat | Gap | BI | EBI | UV | CI | TC | SD | PRIORITY |
|---:|:--:|---|--:|--:|--:|--:|--:|--:|--:|
| 1 | A | Remove/correct overclaiming help-text and UI enforcement assertions | 5 | 5 | 3 | 3 | 1 | 3 | **23** |
| 2 | A | Server tier + durable multi-user persistence | 5 | 5 | 5 | 5 | 5 | 3 | **23** |
| 3 | A | Customer/Contact profile entity + identity keys | 5 | 5 | 5 | 5 | 5 | 3 | **23** |
| 4 | A | Consent + suppression wired into the send gate (`blockersFor`) | 5 | 5 | 4 | 4 | 2 | 3 | **23** |
| 5 | A | Execution runtime: scheduler, queue, worker, adapter contract | 5 | 5 | 5 | 5 | 5 | 3 | **23** |
| 6 | A | ~~Durable append-only audit trail written by code~~ **[CLOSED client-side]** — remaining scope is the server-side tamper-evident store, retention and legal hold | 5 | 5 | 3 | 3 | 2 | 4 | **22** |
| 7 | A | Authentication + SSO/OIDC/SAML + server-enforced authz | 5 | 5 | 3 | 4 | 3 | 2 | **21** |
| 8 | A | Journey builder + execution engine (enrolment, state, timers) | 5 | 4 | 5 | 5 | 5 | 3 | **22** |
| 9 | A | Channel adapter framework + credential vault + real dispatch | 5 | 5 | 4 | 5 | 5 | 2 | **21** |
| 10 | A | Delivery telemetry (sent/delivered/bounced/failed) + retry/DLQ | 5 | 5 | 4 | 4 | 4 | 2 | **21** |
| 11 | A | Content editing + route-to-review path | 4 | 4 | 5 | 4 | 2 | 2 | **21** |
| 12 | A | Campaign create/edit + Program/Wave/Task entities | 4 | 4 | 5 | 4 | 3 | 2 | **20** |
| 13 | A | Event/signal layer (ingest, store, subscribe) | 5 | 4 | 4 | 5 | 5 | 4 | **22** |
| 14 | A | Frequency capping + per-contact send ledger | 4 | 5 | 3 | 4 | 4 | 3 | **19** |
| 15 | A | Multi-tenancy (tenant key + server row filtering) | 5 | 5 | 2 | 3 | 4 | 2 | **19** |
| 16 | A | Country entity + region hierarchy | 4 | 5 | 3 | 3 | 2 | 4 | **22** |
| 17 | A | Unsubscribe: link, signed token, handler, auto-suppression | 4 | 5 | 3 | 3 | 2 | 2 | **19** |
| 18 | A | Retention, archival and legal hold | 4 | 5 | 2 | 3 | 3 | 3 | **18** |
| 19 | A | File storage + upload + renditions for DAM | 4 | 4 | 5 | 4 | 4 | 2 | **19** |
| 20 | B | Brand/compliance rule configurability (terms, policies, thresholds as data) | 4 | 5 | 4 | 4 | 3 | 4 | **22** |
| 21 | B | Approval workflow engine: stage advancement, delegation, escalation, quorum | 4 | 5 | 4 | 3 | 3 | 3 | **20** |
| 22 | B | Legal clause authoring + placement rules + change-impact analysis | 4 | 5 | 3 | 4 | 3 | 5 | **22** |
| 23 | B | Segment criteria DSL: grammar, attribute catalogue, evaluator, overlap/dedup | 4 | 4 | 5 | 5 | 4 | 3 | **21** |
| 24 | B | Read-side consistency: kill all `getSeedDB()` reads, add a lint gate | 3 | 3 | 4 | 2 | 1 | 2 | **16** |
| 25 | B | Measurement grain: `communicationId`/`contentId`/`variantId` on facts | 4 | 4 | 4 | 4 | 3 | 3 | **20** |
| 26 | B | Experiment entity + holdout + arm assignment + significance | 4 | 4 | 4 | 5 | 4 | 4 | **21** |
| 27 | B | Attribution touchpoint provenance (real events; exclude undelivered) | 4 | 4 | 3 | 4 | 4 | 4 | **19** |
| 28 | B | Budget actuals: PO/invoice/commitment + currency + FX | 4 | 5 | 3 | 3 | 3 | 2 | **18** |
| 29 | B | Sub-brand guardrail inheritance resolved in enforcement paths | 3 | 4 | 3 | 3 | 1 | 4 | **19** |
| 30 | B | Asset model: altText, tags, rights terms, versions, renditions | 4 | 4 | 4 | 4 | 3 | 3 | **20** |
| 31 | B | Knowledge graph coverage (all 52 collections) + impact to channel/region | 3 | 4 | 4 | 3 | 2 | 5 | **20** |
| 32 | B | RBAC/ABAC: verb-level permissions, single authz function, server enforcement | 4 | 5 | 3 | 3 | 3 | 2 | **18** |
| 33 | B | List UX: pagination, sorting, bulk ops, row actions, virtualisation | 3 | 4 | 5 | 3 | 3 | 1 | **16** |
| 34 | B | Localization operations: status per locale, queue, reviewer, invalidation | 3 | 4 | 4 | 4 | 3 | 4 | **19** |
| 35 | B | Quiet hours + recipient timezone + send-window policy | 3 | 4 | 3 | 4 | 2 | 2 | **17** |
| 36 | B | Merge fields + dynamic content blocks (post-Contact) | 4 | 4 | 5 | 5 | 3 | 2 | **21** |
| 37 | B | Global search: index all entities, multi-field, ranking, facets | 3 | 3 | 5 | 3 | 3 | 1 | **15** |
| 38 | B | Communication taxonomy expansion + valid create path | 3 | 4 | 4 | 3 | 2 | 2 | **17** |
| 39 | B | Crisis unfreeze/resolve + post-mortem + timeline from live audit | 3 | 4 | 4 | 2 | 1 | 3 | **18** |
| 40 | B | Data-quality framework: duplicates, orphans, staleness, runtime validation | 3 | 4 | 3 | 3 | 3 | 3 | **16** |
| 41 | B | Anomaly tuning: variance model, seasonality, configurable thresholds, alerting | 3 | 3 | 4 | 4 | 3 | 3 | **17** |
| 42 | B | KPI period-aware attainment + proration disclosure | 3 | 4 | 3 | 2 | 1 | 2 | **17** |
| 43 | B | Classification behaviour for Confidential/Internal + export control | 3 | 4 | 2 | 2 | 2 | 2 | **14** |
| 44 | B | Ideation: intake form, scoring rubric, duplicate detection, collaboration | 3 | 3 | 4 | 3 | 2 | 2 | **16** |
| 45 | B | Copilot intent breadth + composition + action-taking | 3 | 3 | 4 | 4 | 4 | 4 | **17** |
| 46 | B | App accessibility (aria-live, landmarks, axe in CI, VPAT path) | 3 | 5 | 3 | 2 | 2 | 2 | **16** |
| 47 | B | Scope as an access boundary (initialise from stakeholder BU/region) | 3 | 4 | 2 | 2 | 2 | 2 | **14** |
| 48 | B | PR/internal ops: pitch pipeline, interaction log, SoV reconciled to coverage | 2 | 3 | 4 | 3 | 3 | 2 | **13** |

---

## 7. THE DECISION TABLE

| Gap | Current State | Market Requirement | Why It Matters | Business Impact | Complexity | Priority | Recommended Action |
|---|---|---|---|---|---|---|---|
| Overclaiming UI/help text | `page-help.ts:1495`, `JourneysChannels.tsx:1611`, `AudiencesPage.tsx:1223` assert enforcement that does not exist | Product claims must match code | Reads as a compliance misstatement in due diligence; contradicts the honest `AgentsPage` in the same build | 5 | 1 | 23 | **Do this week.** Rewrite every claim to future/roadmap tense or delete it. Add a test asserting no help string claims enforcement absent from `blockersFor()` |
| No server tier | localStorage single key, VERSION 'v1', zero network calls | Multi-user, durable, API-backed | Every collaboration, approval and scoping feature is single-player; a cache clear is data loss | 5 | 5 | 23 | **Build the API + database now.** Nothing else on this list ships without it |
| No Contact entity | Finest-grained person record is a masked `subjectKey` | Addressable profile with identity keys, attributes, consent, event history | Blocks consent, personalization, frequency, triggers, prediction — five requirements, one decision | 5 | 5 | 23 | Introduce `Contact` + identity keys + `ContactChannelState`; re-plumb Audience, Segment, Journey, ChannelExecution around it |
| Consent/suppression not enforced | `blockersFor()` checks only Paused, Rework, pending Approvals | Suppression and consent evaluated before every send, with recorded exit reasons | Legal's do-not-contact entry has zero mechanical effect; the UI says the opposite in bold | 5 | 2 | 23 | Wire both collections into `blockersFor()` immediately as a display-level gate (crisis freeze proves the pattern); per-contact enforcement follows the Contact entity |
| No execution runtime | `pushDraft` writes `status:'queued'` + toast; `adapterKey` resolves to nothing | Scheduler, queue, worker, retry, adapter contract | Nothing sends, so nothing can be governed at send time | 5 | 5 | 23 | Build job runner + typed `ChannelAdapter` (authenticate/validate/send/fetchStatus) + credential vault; start with one real email provider |
| ~~Audit trail not durable~~ **[CLOSED]** | ~~`useState` capped at 500, excluded from persistence; no `auditRecords.createIn` anywhere~~ → `src/lib/auditTrail.ts` + `DataStore.tsx`: append-only `AuditRecord` per mutation, before→after diff, persisted with the records | Append-only, immutable, before/after values, exportable | ~~Crisis timelines render empty; a refresh erases the compliance record~~ → both fixed; still per-device and not exportable | 5 | 2 | 22 | ~~Write `AuditRecord` from every mutation~~ **done client-side; the Governance tab already reads live records.** Remaining: move the write server-side and add export, retention and legal hold |
| No event layer | Zero bus/store/subscription hits across `src` | Ingest, store, subscribe; reactive rules | Triggers, conditions, alerts and expiry detection all depend on it | 5 | 5 | 22 | Add an event store + dispatcher tier; derive asset-expiry and SLA notifications from it rather than seeding them |
| Journey is a diagram | `waitDays` is the only authorable field; no member entity | Full builder + enrolment, member state, wait timers, traversal, exit reasons | The single most-demoed capability in the category | 5 | 5 | 22 | Build the builder and the engine together; do not ship one without the other |
| Rules hardcoded | `BANNED_HYPE` (4 terms), POL-001..005 literal gating | Customer-configurable terms, policies, severities, thresholds | Onboarding customer #2 is a code deploy; POL-006..010 display as enforced with no code | 4 | 3 | 22 | Move all vocabularies to data; either implement POL-006..010 or relabel them "not evaluated" |
| Clause library not authorable | 12 clauses as TS constants; no placement rules | Compliance-team authoring, approval, versioning, placement/prominence, change-impact | This is the product's best differentiator and a compliance team cannot maintain it | 4 | 3 | 22 | Build clause CRUD + approval + placement rules + re-scan of already-published material |
| No Country entity | `Region {name, code}` × 3; EU/KSA/GCC share REG-EMEA | Country with ISO codes, locale, currency, region parent | The clause engine either over-applies KSA rules across Europe or misses them | 4 | 2 | 22 | Insert Country between Region and everything scoped; re-key Jurisdiction to countries |
| No SSO/auth | `localStorage['marcomm-role']`; `setRole` in the console | OIDC/SAML, SCIM, sessions, server-enforced authz | Every RBAC and classification control is decorative; Restricted bodies ship in the bundle | 5 | 3 | 21 | Add IdP integration + session tokens; move all masking server-side |
| No delivery telemetry | 5 seeded `failed` rows read by zero UI | sent/delivered/bounced/complained/unsubscribed + retry/backoff/DLQ | Silent delivery failure is the highest-severity defect a comms platform can have | 5 | 4 | 21 | Add result fields to `ChannelExecution`, a failure view, retry policy and a dead-letter queue |
| Segment criteria never evaluated | `criteria: string` rendered in monospace; `population` is typed | Criteria DSL, evaluator, materialisation, deltas, overlap/dedup | Every reach and cost-per-reach figure is inflated by overlap and can never be recomputed | 4 | 4 | 21 | Build grammar + attribute catalogue + evaluator over the new Contact store; compute overlap and stop summing naively |
| No experiments/holdout | No experiment entity; `PerformancePage.tsx:370` admits no incrementality | Experiment record, arms, holdout, significance, winner promotion | Every ROI number is a correlation finance cannot defend; `liftPct` is data entry | 4 | 4 | 21 | Add Experiment + `variantId` on facts + assignment at send + a significance service; stop rendering authored lift as measurement |
| Content cannot be authored | No `versionsCol.updateIn`; no Content creation; no Content approval | Editor, create, submit-for-review, current-version promotion | A content platform where humans cannot write content | 4 | 2 | 21 | Ship an editor, a create path, a submit-for-review action, and re-point `currentVersionId` |
| Campaigns are write-once | `CampaignDetail.tsx` has no mutation call; promotion sets `kpiIds: []` | Full CRUD, Program/Wave/Task, dependencies, milestones, templates | The app's own promote flow manufactures permanently unreportable campaigns | 4 | 3 | 20 | Make CampaignDetail editable; add Program/Task entities; persist execution plans |
| Approvals do not advance | Decision recorder; role resolves to one person; `Escalated` never written | Stage advancement, delegation, OOO, escalation, quorum, conditional routing | A 4-stage workflow cannot be walked; one reviewer on leave stops the world | 4 | 3 | 20 | Build the state machine; route to assignee sets, not single role lookups; fire escalations on a real clock |
| Measurement grain too coarse | 0 of 400 rows carry `communicationId`; no `contentId` | Per-communication, per-content, per-variant, per-locale facts | "How did COM-001 perform" is unanswerable; variant hypotheses can never resolve | 4 | 3 | 20 | Populate declared dimensions; add contentId and variantId; make attribution and A/B answerable |
| Asset is a stub | 5 fields, no altText, no rights terms, no versions | Full DAM metadata, rights, renditions, versions, usage | POL-004 is unenforceable and the review emits false accessibility clearances | 4 | 3 | 20 | Extend the Asset model; add file storage; replace the prose regex with a real assetIds check |
| Graph blind to 24 collections | `ID_PATTERN` frozen at 28 entities; `rowsOf` returns `[]` | Complete, schema-derived traversal + multi-hop impact | An empty panel is indistinguishable from "nothing references this" | 3 | 2 | 20 | Derive the registry from the schema; extend `assetImpact` to Channel and Region |
| Frequency caps absent | Documented as enforced; no cap entity, no ledger | Per-contact, per-period caps across channels and campaigns | Nothing prevents one contact receiving campaigns A+B+C the same day | 4 | 4 | 19 | Add the send ledger with the Contact entity, then the cap evaluation in the send gate |
| Money is plan money | "Committed" = `spendAllocated`; no currency field | Actuals, POs, invoices, multi-currency, FX, GL reconciliation | BoardPack figures are indefensible to the CFO they target | 4 | 3 | 18 | Add currency everywhere, an actuals feed, and commitment vs invoice separation |
| No retention or legal hold | `removeFrom` is an unconditional hard delete | Retention classes, hold flags, hold-blocks-delete, eDiscovery export | A listed company cannot deploy this; evidence can be destroyed irreversibly | 4 | 3 | 18 | Soft-delete + tombstones + retention schedule + legal hold before any regulated pilot |
| Localization is a placeholder | `[Simulated transcreation to X]` / one fixed Arabic sentence | Real MT/TMS + translation status, queue, reviewer, invalidation | The headline capability for the stated KSA/GCC target audience | 3 | 3 | 19 | Integrate a TMS/MT vendor; build the operations layer, which is the defensible half |
| List UX at demo scale only | Zero pagination/sorting/bulk across ~46 tables; `.find()` in render loops | Server-side pagination, sorting, bulk actions, virtualisation | 10,000 campaigns freezes the tab; 48 approvals decided one at a time | 3 | 3 | 16 | Fix at the data layer with a paged query API, then a shared table component |
| Split read-side | 11 surfaces on `getSeedDB()`; no `kpis`/`metricResults` overlay | One read path | Runtime campaigns are invisible to measurement; orphan detection runs on frozen data | 3 | 1 | 16 | Eliminate all direct seed reads; add a lint rule and a test |

---

## 8. ROADMAP

### NOW — before any serious enterprise-market positioning

- **Correct every overclaiming help-text and UI enforcement assertion** — `page-help.ts:1495`, `JourneysChannels.tsx:1611-1612`, `AudiencesPage.tsx:1223-1225`, the frequency-cap, channel-capacity, override-role, auto-tagging and auto-scoring claims. One week of work that removes the single largest due-diligence liability.
- **Server tier + database + real API** — every other item below is blocked on it, and localStorage-as-database will not survive one technical question.
- **Authentication + SSO/OIDC and server-enforced authorization** — `setRole` from devtools defeats every control in the app; this is the first security gate a buyer applies.
- **Contact/Profile entity + identity keys + per-contact consent record** — one schema decision unblocks five separate brief requirements; every week it is deferred adds re-plumbing cost across Audience, Segment, Journey and ChannelExecution.
- **Wire consent + suppression into `blockersFor()`** — three lines against the collections that already exist; the crisis freeze proves the pattern works, and the UI has already promised it.
- ~~**Durable append-only audit trail written by code** — no `auditRecords.createIn` exists today and the runtime log dies on refresh; without it no regulated pilot is possible and the crisis timeline stays empty.~~ **[CLOSED]** Mutations write append-only `AuditRecord`s that persist with the record data and crisis timelines populate. The regulated-pilot blocker is now narrower: a *server-side tamper-evident* trail with retention, legal hold and export, which lands with the server tier above.
- **Country entity + region hierarchy** — the clause engine, the product's best asset, is currently resolving KSA law through a continent bucket; correctness depends on this before anything else is built on jurisdictions.
- **Content editor + route-to-review + campaign edit** — a content platform where humans cannot write and campaigns are write-once fails the first hands-on trial, and the promote flow currently creates permanently unreportable records.

### NEXT

- **Execution runtime: job scheduler, queue, worker, typed `ChannelAdapter` + credential vault, one real email provider** — turns every "orchestration" verb from a status string into an action, and is the precondition for all delivery, consent and fatigue enforcement.
- **Delivery telemetry + retry/backoff/dead-letter + failure UI** — five seeded `failed` rows are invisible today; the moment a provider is live, undetectable lost sends become the top operational risk.
- **Event/signal layer** — required before triggers, conditions, alerting, expiry detection or any reactive rule can exist; it is a new tier, so start it as soon as the server lands.
- **Journey builder + execution engine together** — the most-demoed capability in the category; shipping the builder without the engine repeats the current credibility problem at higher cost.
- **Segment criteria DSL + evaluator + overlap computation** — stops every reach and cost-per-reach figure from being silently inflated and makes the audience product real.
- **Frequency caps + per-contact send ledger** — requires the Contact entity and the send path; it is a documented control that must stop being fictional.
- **Brand rule and legal clause configurability (data, not constants) + placement rules** — makes the differentiator maintainable by the compliance team and the product onboardable for customer #2.
- **Approval workflow engine: stage advancement, assignee sets, delegation, escalation on a real clock, quorum** — turns the strongest governance area from a decision recorder into an engine that survives a real org chart.
- **Sub-brand guardrail inheritance resolved in enforcement paths + POL-006..010 implemented or relabelled** — false clearances are worse than absent checks, and both fixes are small.
- **Measurement grain: populate `communicationId`, add `contentId` and `variantId`** — unlocks per-message performance, variant resolution and honest attribution.
- **Unsubscribe mechanism + retention/legal hold + soft delete** — statutory and records-management gates for any listed-company buyer.
- **File storage + upload + asset model extension (altText, tags, rights terms, versions, renditions)** — makes the DAM a DAM and makes the accessibility rule enforceable instead of a prose regex.
- **List UX at the data layer: paged queries, sorting, bulk operations** — the difference between a tool people use and one they route around with spreadsheets.

### LATER

- **Experiment entity + holdout + arm assignment + significance service** — every ROI figure stays a correlation until this exists, but it needs real delivery and per-person events first to be worth anything.
- **Attribution touchpoint provenance from real events; exclude undelivered executions from the credit pool** — better inputs beat better models; do it after telemetry exists.
- **Multi-tenancy: tenant key on all collections + server-enforced row filtering** — required for customer #2 in a shared deployment; sequence it once the data layer is stable so the migration happens once.
- **Budget actuals: PO/invoice/commitment separation, currency, FX** — makes CFO-facing numbers reconcilable to a general ledger.
- **Localization operations: TMS/MT integration, translation status per locale, reviewer queue, source-change invalidation** — the model is already right; this is the operations layer that is defensible.
- **Program/Wave/Task entities, dependencies, milestones, templates and recurring campaigns** — portfolio reporting and operational efficiency, high user value once the core records are editable.
- **Verb-level RBAC + a single authorization function + classification behaviour for Confidential/Internal + export control** — removes the duplicated `RESTRICTED_VIEWERS` drift risk and makes the classification chip mean something.
- **Global search across all entity types with real indexing, ranking and facets** — currently 6 of ~52 types on a per-keystroke linear scan.
- **Quiet hours, recipient timezone, send-window policy** — legally required in several jurisdictions; needs the delivery path first.
- **Real LLM behind the `AIService` seam, plus grounding and PII/hallucination screening** — the seam is well designed but has never been exercised against a non-deterministic backend, and the guardrails validate form not truth, so grounding must land with the model, not after it.
- **App accessibility remediation: `aria-live`, landmarks, axe in CI, VPAT path** — public-sector procurement gate, and the current asymmetry (enforcing WCAG on customer content while the app is silent to screen readers) reads badly in an audit.
- **Data-quality framework: duplicates, orphans, staleness, runtime FK validation** — five behaviours the help text already promises.
- **Merge fields + dynamic content blocks + variant-to-cohort binding at send** — the last mile of personalization, unblocked only once Contact and delivery exist.

### FUTURE

- **Vision/multimodal brand governance (logo, colour, typography, layout, OCR)** — requires file storage, renditions and a vision model, and the `ReviewInput` two-string interface must be re-architected first; genuinely unreachable today.
- **AI-answer-engine visibility (ChatGPT/Perplexity/AI Overviews share-of-answer)** — real and named-by-buyers demand, but it needs a prompt corpus, paid multi-model sampling with geo variation, confidence bands over repeated runs and time-series storage; it is the clearest forcing function for the backend but cannot precede it.
- **Predictive layer: campaign/budget forecasting, propensity, churn, saturation, send-time optimisation** — architecturally blocked on per-person history; meaningless until the Contact entity has accumulated real behaviour.
- **Agentic runtime: agent state model, triggers, schedules, run/audit log, idempotency, governed autonomous actions** — "agentic" is the load-bearing positioning word and there is no execution substrate at all; it is a build on top of the event layer, the job runner and the audit trail, not a feature.
- **Decisioning: audience recommendation, channel/timing recommendation, budget reallocation with marginal-return modelling, automated winner promotion** — every one of these needs measured outcomes and experiments to learn from.
- **Outcome/benefit-realisation entity closing the eight-stage lifecycle** — expected vs actual, variance, attributed cause, decision, lesson; the "learn" stage has no entity today and `liftPct` is authored, so institutional memory only becomes possible once measurement is real.
- **CDP/CRM/ERP/HRIS integration suite + inbound API, webhooks, idempotency keys, integration observability** — the connector framework is greenfield; build the contract early, the long tail of providers late.
- **Social listening, VoC, reviews and surveys as an ingested signal stream** — currently zero entities; it is the input side of the "signal → insight → recommendation → action" chain the product's positioning depends on, and it only pays off once the action half exists.

---

## 9. FINAL QUALITY GATE

**Product** — It is a high-fidelity, thoughtfully modelled prototype of a MarComm platform, not a product: no backend, no auth, no runtime, and roughly 18 of ~70 declared lifecycle states are ever reachable through the UI.

**Data** — The schema is unusually well shaped in places (ContentProvenance, LegalClause, MetricResult dimensions) and structurally incomplete in the places that matter most: no Contact, no Product, no Country, no Outcome, no Experiment, no Task, and an Asset record of five fields.

**Orchestration** — There is none; journeys are inert TypeScript literals whose only editable property is `waitDays`, with no members, no triggers bound to anything, no evaluator for conditions, and no engine to traverse them.

**Omnichannel** — Six channels are modelled end to end and three more (SMS, print, ads) are named in the type union with no record behind them, while WhatsApp, push and in-app do not exist at all — and no channel can actually dispatch, because `adapterKey` resolves to no code.

**Governance** — The strongest domain by design and the weakest by enforcement: excellent jurisdiction-aware clause resolution, a working crisis freeze, and ~~an audit trail no code writes and that a refresh erases~~ **[CLOSED]** an append-only audit trail that code now writes and that survives a refresh — though still in per-device browser storage rather than a tamper-evident server store — undermined by policies displayed as enforced with no rule behind them, and workflow AI gates that never execute.

**Content** — Provenance, versioning and channel-constraint enforcement are genuinely good; humans cannot write a single word of copy, cannot create a Content record, cannot route one into review, and localization emits a fixed placeholder sentence.

**AI** — There is no AI in the product — no model, no prompt, no inference, no network call — only 1,748 lines of deterministic templates and regexes behind a well-designed seam that has never been exercised against a real provider, and whose guardrails validate form rather than truth.

**Agents** — The agent catalogue is honestly labelled but entirely presentational: no runtime, no trigger, no schedule, no queue, no run record, and `capabilities` is an array of English sentences that no code reads.

**Measurement** — The calculators are disciplined and honest (null over fabricated zeros, five attribution models with stated limits, benchmarks that decline to interpolate), but they run over authored facts at weekly campaign×channel grain with an unpopulated `communicationId` dimension, no delivery layer, and Performance reading a frozen dataset the rest of the app has moved past.

**Optimization** — Absent end to end: no experiment, no holdout, no significance, no lift computation, no winner promotion, no forecasting or propensity of any kind, and the one recommendation that can be actioned discards its own channel, audience and KPI output on acceptance.

**Enterprise** — It fails the first four procurement gates in sequence — no SSO, no multi-tenancy, no *server-side* audit store or legal hold (the trail itself is now durable and append-only, but per-device), no integrations — and every RBAC and classification control it does have runs client-side over data the browser already holds.

**Differentiation** — The jurisdiction-aware legal clause engine, the AI provenance model and the measurement-honesty posture are genuinely category-leading and are the things worth building the pitch on; notably, none of them is AI, which is the word the product is currently positioned on.

**Future** — The path is buildable but it is a foundation programme, not a feature backlog: a server, an identity, a contact, an event tier and an execution runtime must land before the impressive parts of this codebase can be sold as a product rather than demoed as a prototype.