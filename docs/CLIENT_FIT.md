# Client-Fit Verdict — MarComm POC vs. Agent Scope Sheet

## 1) Headline verdict

*Re-scored 2026-08-14, after Waves 1–3 landed. The original pre-wave verdict this section replaces scored ~45% (2 fulfilled, 13 partial, 4 in-scope missing).*

**Of the in-scope activities (forecasting remains a client-optional accepted exclusion): 15 fulfilled, 4 partial, 1 missing → overall fit ~85%** (fulfilled = 1.0, partial = 0.5; up from ~45%).

*Denominator note: the original §1 claimed 19 in-scope activities, but the §3 table it summarizes carries 20 non-forecasting rows once the two already-fulfilled pillars are counted — the pre-wave arithmetic was off by one. The row-level tally in §3 is the authoritative one and is what the percentage above is computed from.*

What changed the score: the automated-inspection half now actually executes at demo tier. The brand & compliance check is a real deterministic rule engine that runs on demand, persists findings per content version, and enforces block-severity results (red "Blocked by policy" banner; an In Review item auto-returns to Rework). Market intelligence, share of voice, and a competitor watch render from a curated seed dataset in the GTM tab. Customer personas, communication body authoring with AI drafting, an investor comms lane, a criteria-gated asset approval checklist, a guideline-change approval loop, a WF-004 exception/waiver flow, a consolidated brand-risk view, ROI estimation, and budget reforecasting all exist as working surfaces. The client's vocabulary — **Agent, approval-gated, GTM, customer personas** — is now on screen (Marketing agents card, GTM tab, personas tab, review-card footer).

Enforcement is demonstrable live, not just claimed. The seed carries a deliberately failing item — "Volt5 EMEA paid social variant" (CNT-011) — whose copy trips two block-severity findings for unsubstantiated performance claims on an EU-region campaign. Running the check on it raises the red "Blocked by policy" banner and returns the item from In Review to Rework automatically.

Honest boundaries, stated up front: the intelligence layer is seeded, not ingested (the UI itself says "Curated intelligence dataset — live ingestion arrives with platform integrations"); the review engine is a deterministic rule set behind the provider seam, not a model call; asset visual compliance is checklist-based, not automated inspection; guideline editing covers tone only.

**Verdict: demo-ready.** "Show me the brand check running" now has a real answer.

## 2) Per-agent coverage

*Pre-wave baseline, kept for history — superseded by §1. Notable stale claims: message-body authoring, AI drafting on Communications, and investor comms have since landed, and the `advanceSubject` Communication bug is fixed (approving a communication now advances its lifecycle).*

| Agent | Activities | Fulfilled | Partial | Missing | Fit | Strongest | Weakest |
|---|---|---|---|---|---|---|---|
| **Brand Governance Agent** | 8 | 1 | 5 | 2 | ~44% | Approval workflows + version control (WorkflowDesigner, ApprovalsInbox, immutable versioning) | Visual identity: no logo/typography/color model or checks anywhere; no channel-level brand validation |
| **Product Marketing Planning Agent** | 7 (6 in scope) | 0 | 4 | 3 (2 in scope) | ~33% | Strategy→campaign alignment + AI campaign proposal + budget tracking | The entire "Market Intelligence" half: zero market research, zero competitor monitoring |
| **Corporate Communication Agent** | 5 | 1 | 4 | 0 | ~60% | Channel distribution (JourneysChannels registry/pipeline/journeys + send-freeze) | No message-body authoring; AI drafting never reaches Communications; investor comms is an enum value |

**Cross-cutting approval-gate pillar: structurally the app's best story** — content/campaign/communication approvals, executive sign-off, SLA board, role-gated crisis declaration all work. Three real holes: (a) `advanceSubject` has no Communication case, so approving a leadership comm doesn't advance its lifecycle (a **bug**, not a gap); (b) no exception/waiver path for non-standard campaigns; (c) strategies and budgets have no approval flow of their own.

## 3) Gap register, ranked by client importance — with post-wave status

Ranking logic: the client named three agents and will scope their programme against every listed activity (only forecasting excused). Items that gut a named capability pillar rank highest; items where the human path already covers the intent rank lowest.

The **Status** column is current as of 2026-08-14. The **Why it ranks here** and **Effort** columns are the original pre-wave assessment, kept so the ranking rationale stays readable — where Status says closed, read that column as the problem that was solved, not a live description. Thirteen of the eighteen ranked rows are now closed; the remaining five (rows 3, 5, 9, 12, 13) carry forward into §5. Adding the two pillars that were already fulfilled pre-wave and were never listed here gives the 15 fulfilled / 4 partial / 1 missing tally in §1.

| # | Gap | Status | Why it ranks here (pre-wave) | Effort |
|---|---|---|---|---|
| 1 | **Market research & trend analysis** | ✔ closed (Wave 3) — seeded trend cards + share of voice in the GTM tab; live ingestion is the accepted exclusion | Core of the claimed "Market Intelligence & GTM Strategy" pillar — currently nothing, not even a surface | Large |
| 2 | **Competitor monitoring** | ✔ closed (Wave 3) — competitor registry + "Competitor watch" with typed moves; seeded, not live | Same pillar; total absence (one seed string mentions "rivals") | Large |
| 3 | **Logo/typography/color compliance checks** | Partial — narrowed (Wave 3): visual identity model (logo, typography, palette, imagery) now exists on Brand and drives the asset approval checklist, but nothing automatically inspects a file against it | The Brand Governance Agent's signature automated activity; no data model, checker, or UI | Large |
| 4 | **Executable brand/compliance checks (AI gates that actually run)** | ✔ closed (Wave 2) — deterministic `reviewContent` engine runs on demand, persists findings per version, block auto-returns In Review items to Rework | The recurring credibility risk: 'brand-ai'/'compliance-ai' gates and 'block' policies are pure metadata — nothing ever inspects copy or blocks a send/approval | Medium |
| 5 | **Channel-relevant branding validation** | Still missing — only the print/ads channel kinds landed in the type model; nothing validates branding per channel | Explicit line item; also Print/Ads don't exist as channel kinds | Large |
| 6 | **Asset validation against brand standards** | ✔ closed (Wave 2) — "Brand approval checklist" gates Approve on five brand-derived criteria; "Request fixes" requires a reason | DAM lifecycle works but approval is a criteria-free status flip | Medium |
| 7 | **Customer personas** | ✔ closed (Wave 2) — "Customer personas" tab with four persona cards (demographics/behavioral/transactional, needs, preferred channels) linked to audiences; vocabulary collision defused | Segments have behavioral/transactional rules but no demographic/persona artifact — plus a live-demo vocabulary collision ("persona" = internal RBAC role) | Medium |
| 8 | **Positioning & value propositions** | ✔ closed (Wave 1) — "Positioning" and "Value propositions" sections render per strategy in the GTM tab | No positioning artifact at all; key messages are execution copy | Medium |
| 9 | **GTM at strategy level** | Partial — improved (market intel + positioning/value props now live on the strategy tab); still no strategy-level channel plan, timeline, budget, or edit UI | GTM composition exists only per-campaign; Strategy has no channel plan/timeline/budget and no create/edit UI | Medium |
| 10 | **ROI estimation** | ✔ closed (Wave 1) — "Estimated ROI" tile + per-campaign table on Performance; ROI line in the AI campaign proposal | All inputs exist (spend + revenue_attributed per campaign); the join is simply never computed — **cheapest substantive win in the whole sheet** | Small |
| 11 | **Communication body authoring + AI drafting on Communications** | ✔ closed (Wave 2) — "Message body" field with "Draft with AI" in the composer, edit-draft dialog, role-based body masking on Restricted rows | Composer is metadata-only; `generateDraft` is wired only to Content | Medium |
| 12 | **Media monitoring depth (ingestion, sentiment trends, crisis-signal detection)** | Still partial — coverage/sentiment/crisis-watch unchanged; no alerting or trend logic, ingestion remains the accepted exclusion | Coverage/sentiment/crisis-watch render well over static seed; no alerting or trend logic | Medium |
| 13 | **Brand guideline maintenance (editing) + guideline-change approval loop** | Partial — narrowed (Wave 2): the approval loop is fully closed ("Edit guidelines" routes a proposed change to the CMO, "Pending guideline change" chip until decided), but editing covers tone only — palette, typography, logo, and imagery stay read-only | Brands/policies are seed-only read-only; the client's "brand updates approval" gate has no home for guideline changes | Medium |
| 14 | **Exception/waiver path for non-standard campaigns** | ✔ closed (Wave 2) — "Request policy waiver" starts the WF-004 flow (Brand Manager justification review, 24h SLA, elevated CMO sign-off); Exceptions tab lists open/decided requests | Only the crisis analogue exists; natural extension of the Approval entity | Medium |
| 15 | **Legal disclaimers/trademark content checks** | ✔ closed (Wave 2) — POL-005 executes in the review engine: forward-looking-disclaimer rule (block) and ™-on-first-mention rule (warn) | Human legal loop works; no disclaimer/trademark content or checks | Medium |
| 16 | **Brand-risk messaging monitor / consolidated risk view** | ✔ closed (Wave 2) — "Brand risk" card on Governance consolidates expiring rights, rework content, overdue approvals, and open incidents | Rights-expiry side is genuinely good; messaging risk unmonitored | Small |
| 17 | **Investor communications** | ✔ closed (Wave 2) — investor lane with "Investor" chip, seeded investor audience + two investor communications (one Restricted), investor type in the composer | Enum-only; small seed addition makes it real | Small |
| 18 | **Budget approval + reforecast actions** | ✔ closed (Wave 2) — "Reforecast" action per business unit (CMO/Platform Admin) with all derived figures recomputing; budget approval itself still rides the campaign launch flow | Indirectly covered via campaign launch approval; BudgetPage read-only | Small |
| — | Forecasting (leads/revenue/demand) | Missing — **accepted, client-optional** | Note in the report as a known exclusion; weekly MetricResult series supports extrapolation if pulled in later | Large |

## 4) Terminology correction plan

*Status: implemented in Wave 1 — the GTM tab is named "Market intelligence & GTM strategy", "customer personas" is the on-screen label in Audiences, approval-gated copy is on the Marketing agents card and the review-card footer, and the Agents surface recommended below exists on the Command center. Kept for history.*

**Smallest rename set (all copy/seed edits, no behavior changes), in order:**

2. **"Approval required" labelling** — Approvals playbook subtitle + AI help entries in `page-help.ts`. The behavior fully exists; only the label is missing. Cheapest win on the sheet. *(Small)*
3. **Rename Ideation hub "Strategy" tab → "Market intelligence & GTM strategy"** and use "go-to-market (GTM)" in its help copy. The client's second pillar name is currently invisible. *(Small)*
4. **Defuse the "persona" collision** — say "customer personas" in Audiences page copy; replace "persona" with "role"/"identity" in LoginPicker/Admin copy so the word means *their customers* in a live demo. *(Medium, copy-only)*
5. **"Brand guidelines"** as the visible label for the guardrail-policy section in Brand center; **"compliance checks"** in the two review-checklist help strings; **"content quality review"** once in Content studio help. *(Small)*
6. **Reskin integration names to the client stack** in seeds: email adapter → "AJO / SFMC", web-cms → "Sitecore / AEM (CMS)", press-wire → "PR Portal", Asset library subtitle → "DAM — Adobe AEM Assets", asset source chips → Figma / Adobe CC, Audiences help → "synced from CRM/CDP". *(Medium, seed strings only)*
7. Optional: "Board pack" → "Executive reports" for a US audience; introduce Graph explorer as "audit & lineage view."

**The "Agents" framing recommendation — do it, as a new surface, not a rebrand-in-place:**

Build an **"Agents" panel on the Command center** (or a small dedicated nav page) with three cards presenting existing capabilities as the client's named agents, each tagged **"approval-gated"** and deep-linking to the module where the capability already lives:

- **Brand Governance Agent** → content drafting (`generateDraft`) + brand/compliance AI gates → links to Content studio & Governance
- **Product Marketing Planning Agent** → idea-to-campaign proposal (`proposeCampaign`) + GTM strategy tab → links to Ideation hub
- **Corporate Communication Agent** → PR/internal-comms drafting + crisis summarization (`summarize`) → links to Communications & PR/Media

This is presentation-only over `src/services/ai/` — no new AI logic — and it is the **single highest-leverage change**: it makes the demo speak the client's core noun ("agent"), which currently appears zero times in the UI.

## 5) What remains

Waves 1–3 are delivered; the plan that used to occupy this section is done and has been removed. What is left divides into two groups — and nothing in either blocks the demo.

**Group A — accepted exclusions (state these in the proposal; do not build for the demo):**

| Item | Why it stays out |
|---|---|
| **Forecasting** (leads/revenue/demand) | Client-marked optional from the start. The weekly MetricResult series would support extrapolation if it is ever pulled in. |
| **Live market/media ingestion** | Market trends, share of voice, competitor moves, and PR coverage all render from a curated seed dataset. The GTM panel says so on screen: "Curated intelligence dataset — live ingestion arrives with platform integrations." |
| **Real integrations and channel delivery** | Integration names are reskinned to the client stack (AJO / SFMC, Sitecore / AEM, PR Portal, Adobe AEM Assets), but nothing calls a real system. Deliveries are data records, and AI runs through a deterministic simulated provider behind the `src/services/ai/` seam. |

**Group B — genuine remaining gaps (small, and none of them block the demo):**

| # | Gap | Status | Effort |
|---|---|---|---|
| 5 | **Channel-relevant branding validation** | The only fully missing in-scope line item. The `print` and `ads` channel kinds now exist in the type model and personas reference them, but no channel has brand rules attached and nothing validates creative per channel. | Large |
| 3 | **Automated visual compliance** | The visual identity model and the brand-derived asset checklist landed; an approver still ticks the five criteria. Automated inspection of a file against logo/palette/typography is the next tier. | Large |
| 13 | **Guideline editing beyond tone** | The change-approval loop is complete and governed; only the tone field is editable. Palette, typography, logo, and imagery remain read-only seed. | Medium |
| 9 | **GTM at strategy level** | Positioning, value propositions, and market intelligence now render on the strategy tab, but a strategy still has no channel plan, timeline, budget of its own, or create/edit UI. | Medium |
| 12 | **Media monitoring depth** | Coverage, sentiment, and crisis-watch render well over static seed; there is still no alerting or trend-detection logic on top of them. | Medium |
| — | **Strategy and budget approval flows of their own** | Budget reforecasting works, and budget approval rides the campaign launch flow; neither strategies nor budgets have a dedicated approval path. | Small |

**No demo-prep items outstanding.** The block-enforcement path — previously the one gap that could not be shown live — is now seeded and demonstrable: "Volt5 EMEA paid social variant" (CNT-011) returns 1 pass, 3 warn, and 2 block findings, fires the "Blocked by policy" banner, and flips the item to Rework. The demo script runs it as a live beat (step 5.6). The only block-severity rule still not exercised by seed data is the missing forward-looking-statements disclaimer on restricted or investor-facing copy; describe it if asked.
