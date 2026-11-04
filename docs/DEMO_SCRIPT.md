# MarComm demo script (~17 minutes)

A guided walkthrough of the MarComm demo, written against the app's actual behavior — every quoted label below appears on screen exactly as written.

## Before you present

1. Run the demo in a fresh Chrome tab at desktop width. Do not present from a narrow window — the sidebar and dashboard grid are tuned for desktop.
2. Start the dev server (`npm run dev`), then navigate to **http://localhost:8091/marcomm/dashboard** and reset state from the DevTools console:

   ```js
   localStorage.clear(); location.reload();
   ```

3. After the reload, open **http://localhost:8091/marcomm/** (the root URL). With no stored identity the app routes you straight to the login picker at `/login` — that is the intended opening frame, not an error.
4. Sign in as **Alexandra Reyes** (CMO) to confirm everything loads, then reset again with the same snippet before the real run — any rehearsal mutations would otherwise persist into the demo. That now includes the new write paths: brand & compliance check findings, waiver requests, budget reforecasts, and guideline-change requests all persist to localStorage and are all cleared by the same reset.
5. A mid-demo refresh is no longer destructive: the runtime audit trail persists to localStorage alongside the data changes, so a reload returns the same records *and* the same audit history. It still costs you the demo's flow — you land back on the route with panels collapsed and dialogs closed — so avoid it, but you no longer have to narrate around a lost trail.
6. The brand & compliance check has both a passing and a failing case seeded, so you can show enforcement, not just inspection:
   - **"Volt5 global launch press release"** (CNT-004) returns **7 pass · 1 warn** — a clean piece with one missing ™ mark.
   - **"Volt5 EMEA paid social variant"** (CNT-011) returns **4 pass · 3 warn · 3 block** — two unsubstantiated performance claims on an EU-region campaign. Running it fires the red **"Blocked by policy"** banner, flips the status chip from **In Review** to **Rework**, and toasts *"Returned to rework: blocked by EU performance-claims substantiation"*. This is the enforcement moment — run it live rather than describing it.
   
   The engine is a deterministic rule set (same copy in, same findings out), not a model call. The second block-severity rule, not seeded, is a missing forward-looking-statements disclaimer on restricted or investor-facing copy — describe that one if asked.
7. The **Agency User** persona (Lena Kovacs, Bright North) is fully scoped and safe to show as a bonus beat: her dashboard replaces the org KPI strip with a "Showing records assigned to Bright North" tile row (assigned campaigns, activities, content, assets), the campaign/content/asset/calendar/communications lists filter to her agency's assignments, and **Performance** and **Graph explorer** are hidden from her navigation and blocked by route guards. She is not part of the main script, but signing in as her is a strong answer to "how do external agencies work in this?"

Two framing points to make early:

- Everything shown derives from one seeded, id-linked data graph for a fictional company, Aureon Group (four brands: Aureon, Solara, Volt, GridWorks). The dataset treats today as 2026-08-13, so live campaigns, pending approvals, and this week's events always look current.
- Nothing here calls a real backend or a real model. AI features run through a deterministic simulated `aiService` — including the brand & compliance rule engine, which is a pure function (same copy in, same findings out); deliveries are data records, not real sends. Market intelligence is a curated seed dataset, not live ingestion. Mutations you make persist to localStorage, which is what makes the cross-persona storylines below real rather than staged.

The core workflow pages — command center, campaigns, content, approvals, performance, ideation, calendar, assets, audiences, journeys, communications, budget, and governance — carry a help rail (top right) with a synopsis and an operations playbook, useful if a viewer asks "what am I looking at". Detail pages, PR & media, Graph explorer, and Board pack do not have one, so demonstrate the rail from a list page.

---

## 1. Sign in as the CMO — executive command center (0:00–2:00)

1. Open **http://localhost:8091/marcomm/**. From a fresh reset you land directly on the login picker at `/login` — there is no default session to sign out of.
2. Frame the login screen: this is a persona picker, not authentication. Eleven people, one per role. Choosing a person changes navigation, the approvals inbox, and record-level visibility.
3. Sign in as **Alexandra Reyes — CMO**.
4. On the command center, point out:
   - The **executive digest** card — a narrative summary rendered only for the CMO and Executive roles, composed by the simulated AI service from the live graph.
   - The sidebar reads as the lifecycle itself: **AI agents** on top (the agents span every stage), then the eight lifecycle stages **Govern** through **Learn**, with **Command center** last under Workspace — the cockpit you return to, not the place you start.
   - KPI tiles and campaign health, all computed from seeded metric facts, not stored numbers.
   - The **notification bell** — pending approvals and asset-rights expiries addressed to real stakeholders.
   - **Global search** in the topbar — one index across campaigns, content, people, and the rest of the graph.

## 2. Scope to the Volt brand — numbers re-derive (2:00–3:15)

1. In the topbar, set the **Brand** scope to **Volt** (the smartphone line).
2. Watch the command center recompute: tiles, lists, and charts narrow to Volt records. Emphasize that nothing is swapped or faked — the same selector functions re-run over the graph with a narrower scope.
3. Open **Campaigns**: the list narrows to Volt's five campaigns — "Volt5 5G Launch" and "Volt Always-On Performance Push" live, "Volt4 Summer Clearance" completed, "Volt5 APAC Availability Wave" planned and "Volt Buds Pro Teaser" still a draft. Open **Volt5 5G Launch**. In the facts strip, point at the **Lineage** row: the chip **"Promoted from idea: Volt5 midnight pre-order drop"** links back to the ideation hub — this campaign was born from a governed idea. The Overview tab below shows the rest of the record: budget allocation, activities, the approved brief, and KPI targets. (You will show the same lineage from the other end — the ideation board's **"Promoted to"** column — in step 3.)
4. Reset the brand scope to **All brands** before moving on.

## 3. Ideation — AI proposal, then promote to a campaign (3:15–5:00)

1. Open **Ideation hub**. The board holds twenty ideas across every lifecycle state (draft, scored, approved, promoted, parked, archived). Point at the **"Promoted to"** column: the promoted idea "Volt5 midnight pre-order drop" links forward to the Volt5 5G Launch campaign — the other end of the lineage chip from step 2.3.
2. Pick **"Solara energy-saving autumn stories"** (approved, score 76) and open its **AI proposal**. The simulated service returns a structured campaign proposal — name, objective, channels resolved against the channel registry, a suggested audience, a budget estimate, an estimated ROI line, and KPI suggestions. Stress the boundary: it is a proposal for an approver to edit, never an auto-launched campaign.
3. Click **"Promote to campaign"** on the idea (the CMO is one of the roles allowed to promote). Adjust the pre-filled form if you like and confirm. A draft campaign is created and the idea's lineage is preserved.
4. Open the new campaign from the campaigns list to show it persisted — this write went through the DataStore and will survive a reload.

## 4. Market intelligence and competitor watch — the GTM tab (5:00–6:30)

1. Still in the **Ideation hub**, switch to the **"Market intelligence & GTM strategy"** tab. The panel opens with **Market trends**: three seeded trend cards — **"5G handset upgrade intent"**, **"Zero-trust security budget index"**, and **"Corporate trust & ESG sentiment"** — each a line chart with a written insight underneath, scoped by business unit from the topbar.
2. Below the trends, the **Share of voice** chart compares the four brands across the two most recent periods (**2026-Q2 vs 2026-Q3**), with the caption "Tracked brands only — the remainder of each period is untracked competitors."
3. Then **Competitor watch**: three tracked competitors (**Northvolt Dynamics**, **Solstice Energy**, **HelioGrid**), each with a summary and a dated **"Recent moves"** list typed as launch / campaign / pricing / partnership chips. The strongest talking point is Northvolt's 2026-08-05 campaign move — **'"Charge past the hype" comparative ad flight'** with the note "Names Volt 5G charging claims directly; legal is monitoring." — which ties market intelligence straight into the brand-risk story you will close on in Governance.
4. Scroll on to the strategy cards below: each strategy now carries **Positioning** and **Value propositions** sections above its objectives and KPIs, with the ideas and campaigns that ladder up to it. Read the honest footnote at the bottom of the intel panel aloud if the client asks about data sources: "Curated intelligence dataset — live ingestion arrives with platform integrations."

## 5. Content studio — AI draft, then the brand & compliance check (6:30–8:45)

1. Open **Content studio** and select **"Solara autumn teaser copy"** (draft). Its current version is an AI-generated first draft.
2. Click **"Generate draft with AI"** to generate a new draft from the parent brief. The result is forked as a new immutable version (V1 → V1.1) — version history is append-only, and the head record carries the lifecycle status.
3. Show the **Version history** card: a stacked list with both versions visible, each labeled with its version number plus **"AI draft"** and **"Current"** badges. Scroll the list — the point is the append-only fork, not a diff view (there is no side-by-side comparison in this build).
4. Now the check. Click **"Run brand & compliance check"** on this same item. The toast reads **"Brand & compliance check complete — all checks passed"**, and a **"Brand & compliance check — V1"** card appears with one pass-level finding per policy checked (brand voice, claims substantiation, embargo, alt-text, disclaimers) — the reviewer sees what was checked, not just what failed. The findings are persisted as a review record tied to that exact version.
5. For a run with findings, open **"Volt5 global launch press release"** (In Review) and click **"Run brand & compliance check"** there. The toast reports **"0 block, 1 warn"**: pass findings for brand voice, claims, and embargo, plus a warn — "First mention of Volt 5G is missing the ™ mark" — from the **Mandatory disclaimers & trademarks** policy. Point at the card's footer line, which states the governance model in one sentence: **"Ran by the Brand Governance Agent · approval-gated: findings advise the reviewer, block-level findings hold approval."**
6. **The enforcement moment — run this one live.** Open **"Volt5 EMEA paid social variant"** (In Review) and click **"Run brand & compliance check"**. The card returns **4 pass · 3 warn · 3 block**, with tone/readability/compliance score meters and a "Rule set" line naming the jurisdictions that ran (KSA · GCC · EU · GLOBAL): two block findings from **EU performance-claims substantiation**, each quoting the offending copy — *"Performance claim '2x faster' has no substantiation ('based on', 'tested', or 'certified') nearby — blocking for EU-region content"* and the same for *"40% longer"* — plus warns for the banned hype term "revolutionary", the resulting tone drift against the Volt voice, and the bare trademark. Watch three things happen at once: the red **"Blocked by policy — resolve findings before approval"** banner appears, the status chip flips from **In Review** to **Rework**, and the toast reads **"Returned to rework: blocked by EU performance-claims substantiation"**. This is the governance layer the client asked for, enforcing rather than advising — the agent holds the item, and an approver resolves it.
7. Briefly open **"Volt5 launch landing page"**: it sits in **Rework** because the brand manager requested changes, with the recorded comment **"Hero image off-brand; fix spec table."** That rejection is a real approval record — which sets up step 8.

## 6. Customer personas — who the campaigns are for (8:45–9:45)

1. Open **Audiences** and switch to the **"Customer personas"** tab. Four persona cards render: **"Upgrade-ready Uma"**, **"Security-first Sanjay"**, **"Everyday Elena"**, and **"Connected-culture Chris"**.
2. Walk one card — Uma is the strongest: **Demographics** ("28–40, urban EMEA/APAC, mid-to-high income, tech-forward early majority."), **Behavioral**, **Transactional**, a **Needs** checklist, and **Preferred channels** resolved against the real channel registry. The chip in the card's corner links the persona to its audience — click it to open the audience detail sheet, proving personas are graph nodes, not standalone slides.
3. Make the vocabulary point explicitly: "customer personas" here means *the client's customers*. The login picker's eleven identities are roles, a different concept — pre-empting the collision before a viewer trips on it.

## 7. Create a restricted communication (9:45–10:30)

1. Open **Communications**. Rows are split by type (external, internal, corporate) with per-row channel executions — one delivery record per communication × channel. There is one failed delivery you can point at: on **"Volt4 final clearance blast"**, the Lifecycle Email execution carries a red **failed** status chip.
2. Click **New communication**. Create one — for example subject "Battery incident media Q&A", type corporate, classification **Restricted**. The composer now takes a **Message body**: write a line yourself, or click **"Draft with AI"** to generate one deterministically from the subject, selected audience, and brand voice.
3. Note it appears in the list normally — because the CMO is allowed to read restricted records. Remember it for step 10.

## 8. Switch personas — approvals as the brand manager (10:30–12:00)

1. Click the avatar in the topbar, choose **Switch identity**, and sign in as **Jonas Weber — Brand Manager**. Point out the sidebar shrank: Budget, PR & media, Governance & crisis, Journeys & channels, Audiences, Internal comms, Agencies, Board pack, and Administration are gone — navigation follows the role.
2. Open **Approvals**, tab **My queue**. Jonas has two real pending items, sorted by SLA due date, so they appear in this order:
   - Brand review of the **Volt5 global launch press release** (content, SLA due 2026-08-14) — first row.
   - Brand review of the **Solara Smart Autumn** campaign (SLA due 2026-08-15) — second row.

   The queue shows subject, type, SLA date, and status only. If someone asks about the press release's confidentiality, open it from Content studio — the Confidential classification lives on the content record, not in this table. If you ran the check in step 5.5, the press release's findings card is also visible there — the reviewer decides with the agent's findings in front of them.
3. Click **Approve** on the Solara Smart Autumn row. Decisions here are one-click — Approve, Request changes, or Reject, with no comment box; the seeded rejection you showed in step 5.7 ("Hero image off-brand; fix spec table.") is what a decision comment looks like in the data. This approval is the demo's proof that the graph is shared: it persists, visibly flips the campaign's status, and when you later sign in as any other persona the decision is there too — one graph, not per-persona dashboards.

## 9. Calendar — conflicts and events (12:00–13:00)

1. Open **Calendar** (still as Jonas, or any role). The calendar merges campaign activities, communications, and events, filtered by the topbar scope.
2. Point out the **audience conflict** banner ("N audience conflicts in view") and the conflict dots on days where multiple items hit the same audience — collision detection is computed from the graph, not hand-flagged.
3. Events are shown by default — the **Events** switch in the header is already on. Toggle it off and back on to demonstrate the layer. On today, 2026-08-13, the **GridWorks Zero-Trust Webinar #3** runs, with its invite communication ("Zero-trust webinar #3 invite") live in flight.

## 10. Journeys and restricted masking as the campaign manager (13:00–14:00)

1. Switch identity (avatar menu) and sign in as **Maya Chen — Campaign Manager** (one of the roles that can see journeys).
2. Open **Journeys & channels** and select **"Volt5 pre-order nurture"**. The canvas renders the versioned node graph — trigger, audience, send, wait, condition, branch, exit — over real audience, segment, and communication references.
3. Open **Communications** and find the restricted communication you created in step 7. Its subject now renders as **"Restricted communication"** with a lock, and its message body is masked as **"Restricted — message body hidden for your role."** — Maya's role is outside the allow list. Same record, same list, attribute-based masking per role.

## 11. Governance — crisis war room, then a policy waiver (14:00–15:45)

1. Switch identity (avatar menu) and sign in as **Alexandra Reyes — CMO** again (governance is role-gated).
2. Open **Governance & crisis** → **Crisis center**. The active incident is **"Volt battery overheating reports"** (high severity, restricted): war room membership (corporate comms, CMO, legal), affected brand and regions, and an audited timeline — declared 2026-08-11, war room assembled, holding statement drafted, statement approved by legal on 2026-08-12 and held pending publication. Below the incidents sits the consolidated **"Brand risk"** card — subtitled "Monitored by the Brand Governance Agent" — rolling up expiring asset rights, content in rework, overdue approvals, and open incidents into one clickable list.
3. Show the **Policies** tab (brand voice, EU claims substantiation, embargo handling, accessibility, disclaimers & trademarks — each with warn/block enforcement; these are the same policies the step 5 check executed) and the **Audit trail** tab, where seeded audit records merge with the runtime audit of everything done today — including Jonas's approval from step 8.

   **Worth saying out loud here.** Those runtime entries are not a screen effect: each one is an append-only `AuditRecord` carrying the actor, the action, the entity, and the before→after field diff, written by the store on every create, update and delete, and persisted with the record data. They survive identity switches *and* a page reload — if a buyer asks you to refresh and prove it, do so. Be equally precise about the limit: it is this browser's storage, not a server-side tamper-evident store, so it is per-device, clearable from devtools, capped at 500 entries, and has no retention policy or legal hold. It is a real record of what happened in the app; it is not admissible evidence.
4. Thirty seconds on exceptions: open the **Exceptions** tab and click **"Request waiver"** (the CMO is one of the roles allowed). The **"Request policy waiver"** dialog explains the route in its own words — "Starts the WF-004 exception approval workflow: justification review by Jonas Weber (24h SLA), with elevated CMO sign-off on escalation." Pick a campaign, a **Policy to waive**, type a one-line **Justification**, and submit. The toast confirms **"Waiver request submitted — exception approval workflow started"** and the request appears under **"Open waiver requests (1)"** with its subject, policy, and justification — governed exceptions, not side-channel Slack messages.

## 12. Budget — reconciliation by construction (15:45–16:15)

1. Open **Budget**. Three business-unit budgets roll up allocations per campaign; cards, table rows, and totals share the same derived sums, so everything reconciles by construction — there is no place for a stale stored total to disagree. (If asked whether the plan can change, it can — see the reforecast entry in "Free-exploration answers" below.)

## 13. PR coverage and attribution (16:15–17:00)

1. Open **PR & media** → **Coverage**: the earned-media arc for the Volt5 launch plus two crisis-adjacent battery stories carrying a **"Crisis watch"** chip that links back to the governance center. Reach, volume, and sentiment KPIs derive from the scoped coverage items.
2. Open **Performance**: the headline **"Estimated ROI"** tile and the **"Estimated ROI by campaign"** table join spend against attributed business value per campaign, and the attribution section computes five models (first-touch, last-touch, linear, time-decay, position-based) side by side over the same touchpoints — switching models re-runs a pure calculator, demonstrating the pluggable seam.

## 14. Close — the graph is the product (17:00–17:30)

1. Open **Graph explorer**, pick any record (an asset or campaign), and show **"References"** / **"Referenced by"** plus the impact-preview cascades — the one-screen proof that everything in the demo is a node in a single connected graph.
2. Finish on the executive takeaway: open **Board pack** from the sidebar (visible to the CMO) — a print-optimized leadership report over the same live graph — and click **"Print or save as PDF"** to show it renders straight to the browser's print dialog. The campaign and content lists also offer CSV export.
3. Closing notes, honestly stated: AI is simulated behind a provider seam (including the deterministic brand & compliance rule engine), market and competitor intelligence is a curated seed dataset, deliveries are data records, and all demo mutations live in localStorage — reset with the snippet in the "Before you present" checklist at the top of this script.

---

## Free-exploration answers

Not scripted beats — real features to reach for when a viewer asks the matching question.

- **"What about investor communications?"** — Communications carries a dedicated investor lane: rows typed investor get an **Investor** chip, and the seeds include **"H1 results investor briefing"** (classification Restricted — masked for roles outside the allow list) and **"Volt supply-chain investor note"**. The composer's Type select includes investor, and the disclaimers policy the step 5 check runs (**Mandatory disclaimers & trademarks**) is written for exactly this material.
- **"Can the budget plan change?"** — As CMO or Platform Admin, each business-unit row on **Budget** has a **"Reforecast"** action. The dialog ("Reforecast [business unit]") takes a **"New planned amount (USD)"**; **"Save reforecast"** confirms with "Reforecast saved — [BU] planned at [amount]" and every derived utilization, variance, and KPI figure recomputes from the new plan — nothing stored goes stale.
- **"How do assets get brand-approved?"** — In **Asset library**, the seeded upload **ceo-townhall-stage.jpg** is at status Uploaded: **Catalog** it, then click **"Submit for approval"**. The **"Brand approval checklist"** dialog lists five criteria derived from that brand's visual identity (logo, palette, typography, imagery, rights) — **Approve** stays disabled until every box is checked, and **"Request fixes"** requires a written reason. A criteria-gated decision, not a status flip.
- **"Who maintains the brand guidelines?"** — Asset library → **Brand center** tab: one card per brand showing its **Visual identity** (palette swatches, Typography, Logo, Imagery) and guardrail policies under **"Brand guidelines"**. Signed in as the Brand Manager or Platform Admin (not the CMO), **"Edit guidelines"** proposes a tone change and **"Submit for approval"** routes it to the CMO — the card wears a **"Pending guideline change"** chip until the decision lands. Guideline edits are themselves governed changes.
