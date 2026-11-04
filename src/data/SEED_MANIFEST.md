# SEED_MANIFEST.md — Binding ID Universe for the MarComm MVP Seed Graph

**Status: BINDING.** Every seed author writes rows that match this manifest exactly — same ids,
same names, same statuses, same foreign keys. Any id referenced anywhere in the seed MUST appear
here. `assertAllLinksResolve(db)` is the runtime check; this file is the authoring contract.

- **Anchor date ("today"): 2026-08-13** (Thursday). Live campaigns have activities in flight
  around this date; pending approvals have `slaDueAt` on/after 2026-08-14.
- **Metric weeks:** 10 ISO week-start Mondays: `2026-06-08, 2026-06-15, 2026-06-22, 2026-06-29,
  2026-07-06, 2026-07-13, 2026-07-20, 2026-07-27, 2026-08-03, 2026-08-10`.
  MetricResults exist ONLY for Live/Completed campaigns: CMP-002, CMP-003, CMP-004.
- All timestamps ISO 8601; `createdAt <= updatedAt`; both plausible relative to entity history.

## ID scheme (prefix → entity)

| Prefix | Entity | Prefix | Entity |
|---|---|---|---|
| ORG- | Organization | CHN- | Channel |
| BU-  | BusinessUnit | CNT- | Content |
| BRD- | Brand | CV-  | ContentVersion |
| REG- | Region | AST- | Asset |
| STK- | Stakeholder | AUD- | Audience |
| AGY- | Agency | SEG- | Segment |
| IDE- | Idea | WF-  | Workflow |
| STR- | Strategy | WFS- | WorkflowStage |
| CMP- | Campaign | APR- | Approval |
| ACT- | CampaignActivity | POL- | Policy |
| BRF- | Brief | NTF- | Notification |
| COM- | Communication | BUD- | Budget |
| CHX- | ChannelExecution | KPI- | KPI |
| MR-  | MetricResult | ADT- | AuditRecord |

## Seed file → export map (canonical, per blueprint decision #10)

| File (`src/data/seed/`) | Exports |
|---|---|
| `org.ts` | `seedOrganization`, `seedBusinessUnits`, `seedBrands`, `seedRegions`, `seedStakeholders`, `seedAgencies` |
| `strategy.ts` | `seedIdeas`, `seedStrategies` |
| `campaigns.ts` | `seedCampaigns`, `seedCampaignActivities`, `seedBriefs` |
| `communications.ts` | `seedCommunications`, `seedChannelExecutions`, `seedChannels` |
| `content.ts` | `seedContents`, `seedContentVersions`, `seedAssets` |
| `audience.ts` | `seedAudiences`, `seedSegments` |
| `governance.ts` | `seedWorkflows`, `seedWorkflowStages`, `seedApprovals`, `seedPolicies`, `seedNotifications`, `seedAuditRecords` |
| `money.ts` | `seedBudgets` |
| `metrics.ts` | `seedKpis`, `seedMetricResults` |

---

# 1. Organization (1) — `org.ts` / `seedOrganization`

- **ORG-001** "Aureon Group" — global consumer & enterprise technology company. Parent of all BUs/Brands.

# 2. BusinessUnits (3) — `seedBusinessUnits`

- **BU-001** "Consumer Devices" — ORG-001. Brands BRD-002, BRD-003. Budget BUD-001.
- **BU-002** "Enterprise Solutions" — ORG-001. Brand BRD-004. Budget BUD-002.
- **BU-003** "Corporate Affairs" — ORG-001. Brand BRD-001 (master brand). Budget BUD-003.

# 3. Brands (4) — `seedBrands`

- **BRD-001** "Aureon" — corporate master brand, ORG-001. Used by corporate/internal comms.
- **BRD-002** "Solara" — smart-home line, ORG-001. Campaigns CMP-001, CMP-006.
- **BRD-003** "Volt" — smartphone line, ORG-001. Campaigns CMP-002, CMP-003.
- **BRD-004** "GridWorks" — enterprise security/B2B, ORG-001. Campaign CMP-004.

# 4. Regions (3) — `seedRegions`

- **REG-AMER** "Americas", code `AMER`.
- **REG-EMEA** "Europe, Middle East & Africa", code `EMEA`.
- **REG-APAC** "Asia Pacific", code `APAC`.

# 5. Stakeholders (11 — one per persona + Platform Admin) — `seedStakeholders`

| id | name | role | BU | region | brandIds | email | avatar |
|---|---|---|---|---|---|---|---|
| **STK-001** | Alexandra Reyes | CMO | BU-003 | REG-AMER | BRD-001..004 (all) | alexandra.reyes@aureon.com | AR |
| **STK-002** | Daniel Okafor | Corporate Comms Manager | BU-003 | REG-EMEA | BRD-001 | daniel.okafor@aureon.com | DO |
| **STK-003** | Sofia Marin | Content Manager | BU-001 | REG-AMER | BRD-002, BRD-003 | sofia.marin@aureon.com | SM |
| **STK-004** | Maya Chen | Campaign Manager | BU-001 | REG-EMEA | BRD-002, BRD-003 | maya.chen@aureon.com | MC |
| **STK-005** | Jonas Weber | Brand Manager | BU-001 | REG-EMEA | BRD-003 | jonas.weber@aureon.com | JW |
| **STK-006** | Aisha Bello | PR Manager | BU-003 | REG-EMEA | BRD-001, BRD-003 | aisha.bello@aureon.com | AB |
| **STK-007** | Tom Alvarez | Internal Comms Manager | BU-003 | REG-AMER | BRD-001 | tom.alvarez@aureon.com | TA |
| **STK-008** | Ingrid Halvorsen | Legal/Compliance Reviewer | BU-003 | REG-EMEA | BRD-001..004 (all) | ingrid.halvorsen@aureon.com | IH |
| **STK-009** | Richard Yamamoto | Executive | BU-003 | REG-AMER | BRD-001..004 (all) | richard.yamamoto@aureon.com | RY |
| **STK-010** | Lena Kovacs | Agency User | BU-001 | REG-EMEA | BRD-003 | lena.kovacs@brightnorth.agency | LK |
| **STK-011** | Sam Whitfield | Platform Admin | BU-003 | REG-AMER | BRD-001..004 (all) | sam.whitfield@aureon.com | SW |

# 6. Agencies (2) — `seedAgencies`

- **AGY-001** "Bright North Creative" — capabilities [creative, film, social], regions [REG-EMEA]. Staff: STK-010. Activities ACT-001, ACT-007.
- **AGY-002** "Mediaform Partners" — capabilities [media-buying, paid-social], regions [REG-APAC, REG-AMER]. Activity ACT-005.

# 7. Ideas (6) — `strategy.ts` / `seedIdeas`

- **IDE-001** "Volt5 midnight pre-order drop" — **Promoted**, score 88, source `workshop`, BRD-003, BU-001, REG-EMEA, promotedToCampaignId **CMP-003**.
- **IDE-002** "Solara energy-saving autumn stories" — **Approved**, score 76, source `customer-feedback`, BRD-002, BU-001, REG-AMER.
- **IDE-003** "GridWorks CIO roundtable series" — **Scored**, score 64, source `field`, BRD-004, BU-002, REG-AMER.
- **IDE-004** "Employee sustainability week" — **Promoted**, score 81, source `workshop`, BRD-001, BU-003, REG-AMER, promotedToCampaignId **CMP-005**.
- **IDE-005** "AI concierge in support channels" — **Parked**, score 52, source `ai-suggested`, BRD-001, BU-002, REG-APAC.
- **IDE-006** "Volt trade-in gamification" — **Draft**, score 0, source `field`, BRD-003, BU-001, REG-APAC.

# 8. Strategies (2) — `seedStrategies`

- **STR-001** "FY26 Consumer Momentum" — horizon `FY2026`, BU-001, kpiIds [KPI-002], objectives: grow upgrade revenue, lift lifecycle email engagement, win autumn/holiday seasonal share. Campaigns CMP-001, CMP-002, CMP-003, CMP-006.
- **STR-002** "FY26 Enterprise Trust & Pipeline" — horizon `FY2026`, BU-002, kpiIds [KPI-007], objectives: build security thought-leadership, generate qualified pipeline. Campaign CMP-004.

# 9. Campaigns (6) — `campaigns.ts` / `seedCampaigns`

- **CMP-001** "Solara Smart Autumn" — **In Approval**, `seasonal`, Internal classification, STR-001, BRD-002, BU-001, [REG-AMER], budget from BUD-001 (**180000**), owner STK-004, 2026-09-14 → 2026-11-30, kpis [KPI-003], workflow WF-002, activities ACT-001..ACT-003, brief BRF-001, pending approvals APR-006 (STK-005) + APR-007 (STK-008). No metrics (not live yet).
- **CMP-002** "Volt4 Summer Clearance" — **Completed**, `seasonal`, Public, STR-001, BRD-003, BU-001, [REG-AMER, REG-EMEA], budget from BUD-001 (**220000**), owner STK-004, 2026-05-18 → 2026-08-07, kpis [KPI-001], workflow WF-002, activities ACT-004..ACT-006, brief BRF-002 (approved via APR-001). Metrics MR-001..MR-030.
- **CMP-003** "Volt5 5G Launch" — **Live**, `product-launch`, Internal classification, STR-001, ideaId IDE-001, BRD-003, BU-001, [REG-EMEA, REG-APAC], budget from BUD-001 (**450000**), owner STK-004, 2026-06-01 → 2026-09-30, kpis [KPI-004, KPI-005], workflow WF-002, activities ACT-007..ACT-009, brief BRF-003 (approved via APR-002). Metrics MR-031..MR-060.
- **CMP-004** "GridWorks Zero-Trust Webinar Series" — **Live**, `thought-leadership`, Public, STR-002, BRD-004, BU-002, [REG-AMER], budget from BUD-002 (**150000**), owner STK-004, 2026-06-08 → 2026-09-11, kpis [KPI-006, KPI-007], workflow WF-002, activities ACT-010..ACT-011, brief BRF-004 (approved via APR-003). Metrics MR-061..MR-080.
- **CMP-005** "Sustainability Week 2026" — **Planned**, `internal`, Internal, ideaId IDE-004 (no strategy), BRD-001, BU-003, [REG-AMER, REG-EMEA, REG-APAC], budget from BUD-003 (**60000**), owner STK-007, 2026-10-05 → 2026-10-09, kpis [KPI-008], workflow WF-002, activities ACT-012..ACT-013, brief BRF-005 (Draft). No metrics.
- **CMP-006** "Solara Holiday Bundles" — **Draft**, `seasonal`, Internal, STR-001, BRD-002, BU-001, [REG-AMER], budget from BUD-001 (**120000**), owner STK-004, 2026-11-20 → 2026-12-24, kpis [], workflow WF-002, activity ACT-014, brief BRF-006 (Draft). No metrics.

# 10. CampaignActivities (14) — `seedCampaignActivities`

| id | name | campaign | channel | dates | status | agency | spend | owner |
|---|---|---|---|---|---|---|---|---|
| **ACT-001** | Solara autumn hero film | CMP-001 | CHN-002 | 2026-09-14 → 2026-10-09 | Planned | AGY-001 | 60000 | STK-004 |
| **ACT-002** | Smart-savings email series | CMP-001 | CHN-001 | 2026-09-21 → 2026-11-15 | Planned | — | 35000 | STK-004 |
| **ACT-003** | Retail landing refresh | CMP-001 | CHN-003 | 2026-09-14 → 2026-11-30 | Blocked (awaiting brand assets) | — | 25000 | STK-004 |
| **ACT-004** | Clearance countdown emails | CMP-002 | CHN-001 | 2026-05-18 → 2026-08-01 | Completed | — | 40000 | STK-004 |
| **ACT-005** | Summer social flight | CMP-002 | CHN-002 | 2026-05-25 → 2026-07-31 | Completed | AGY-002 | 95000 | STK-004 |
| **ACT-006** | Clearance web takeover | CMP-002 | CHN-003 | 2026-05-18 → 2026-08-07 | Completed | — | 30000 | STK-004 |
| **ACT-007** | Volt5 teaser + launch social flight | CMP-003 | CHN-002 | 2026-06-01 → 2026-09-05 | In Progress | AGY-001 | 120000 | STK-004 |
| **ACT-008** | Launch press & embargo program | CMP-003 | CHN-004 | 2026-06-15 → 2026-09-04 | In Progress | — | 80000 | STK-006 |
| **ACT-009** | Pre-order lifecycle emails | CMP-003 | CHN-001 | 2026-07-06 → 2026-09-30 | In Progress | — | 90000 | STK-004 |
| **ACT-010** | Zero-trust webinar series | CMP-004 | CHN-006 | 2026-06-08 → 2026-09-11 | In Progress | — | 70000 | STK-004 |
| **ACT-011** | Nurture email follow-ups | CMP-004 | CHN-001 | 2026-06-15 → 2026-09-11 | In Progress | — | 30000 | STK-004 |
| **ACT-012** | Sustainability week intranet series | CMP-005 | CHN-005 | 2026-10-05 → 2026-10-09 | Planned | — | 20000 | STK-007 |
| **ACT-013** | Leadership kickoff livestream | CMP-005 | CHN-006 | 2026-10-05 → 2026-10-05 | Planned | — | 25000 | STK-007 |
| **ACT-014** | Holiday bundle social teasers | CMP-006 | CHN-002 | 2026-11-20 → 2026-12-24 | Planned | — | 45000 | STK-004 |

Per-campaign activity spend stays within the campaign's budgetAllocation
(CMP-001: 120000/180000; CMP-002: 165000/220000; CMP-003: 290000/450000; CMP-004: 100000/150000; CMP-005: 45000/60000; CMP-006: 45000/120000).

# 11. Briefs (6) — `seedBriefs`

- **BRF-001** "Solara Smart Autumn brief" — CMP-001, **In Review**, author STK-004, no approval yet. Objective: position Solara as the energy-saving autumn upgrade. Content CNT-009.
- **BRF-002** "Volt4 Summer Clearance brief" — CMP-002, **Approved**, author STK-004, approvalId **APR-001**. Content CNT-001.
- **BRF-003** "Volt5 5G Launch brief" — CMP-003, **Approved**, author STK-004, approvalId **APR-002**. Contents CNT-002, CNT-003, CNT-004, CNT-010.
- **BRF-004** "Zero-Trust Webinar Series brief" — CMP-004, **Approved**, author STK-004, approvalId **APR-003**. Contents CNT-006, CNT-007.
- **BRF-005** "Sustainability Week brief" — CMP-005, **Draft**, author STK-007.
- **BRF-006** "Solara Holiday Bundles brief" — CMP-006, **Draft**, author STK-004.

# 12. Channels (6) — `communications.ts` / `seedChannels`

- **CHN-001** "Lifecycle Email" — `email`, adapterKey `email-sendgrid`, capabilities [scheduling, personalization, ab-test], regions [REG-AMER, REG-EMEA, REG-APAC], owner STK-004.
- **CHN-002** "Paid & Organic Social" — `social`, adapterKey `social-hub`, capabilities [scheduling, paid-boost, utm-tracking], regions [REG-AMER, REG-EMEA, REG-APAC], owner STK-004.
- **CHN-003** "Corporate Web & Newsroom" — `web`, adapterKey `web-cms`, capabilities [publishing, seo-meta, embargo], regions [REG-AMER, REG-EMEA, REG-APAC], owner STK-002.
- **CHN-004** "Press Distribution" — `press`, adapterKey `press-wire`, capabilities [embargo, distribution-lists], regions [REG-AMER, REG-EMEA], owner STK-006.
- **CHN-005** "Employee Intranet" — `intranet`, adapterKey `intranet-sp`, capabilities [targeting-by-bu, comments], regions [REG-AMER, REG-EMEA, REG-APAC], owner STK-007.
- **CHN-006** "Events & Webinars" — `event`, adapterKey `events-zoom`, capabilities [registration, reminders, recording], regions [REG-AMER, REG-EMEA, REG-APAC], owner STK-004.

# 13. Communications (10) — `seedCommunications`

| id | subject | commsType | status | classif. | activity | audience | content | scheduledAt | owner |
|---|---|---|---|---|---|---|---|---|---|
| **COM-001** | Volt5 pre-order is open | external | **Live** | Public | ACT-009 | AUD-001 | CNT-003 | 2026-08-03T08:00Z | STK-004 |
| **COM-002** | Volt5 global launch press release | external | **Scheduled** | Confidential (embargo) | ACT-008 | AUD-004 | CNT-004 | 2026-09-01T06:00Z | STK-006 |
| **COM-003** | Volt4 final clearance blast | external | **Completed** | Public | ACT-004 | AUD-001 | CNT-001 | 2026-07-28T09:00Z | STK-004 |
| **COM-004** | Zero-trust webinar #3 invite | external | **Live** | Public | ACT-010 | AUD-003 | CNT-006 | 2026-08-11T15:00Z | STK-004 |
| **COM-005** | Webinar nurture follow-up | external | **Approved** | Internal | ACT-011 | AUD-003 | CNT-007 | 2026-08-20T15:00Z | STK-004 |
| **COM-006** | Sustainability Week save-the-date | internal | **Briefed** | Internal | ACT-012 | AUD-002 | — | 2026-09-21T10:00Z | STK-007 |
| **COM-007** | CEO mid-year update | corporate | **In Review** | Confidential | — (standalone) | AUD-002 | CNT-008 | 2026-08-21T16:00Z | STK-002 |
| **COM-008** | Solara autumn teaser social | external | **Drafting** | Public | ACT-001 | AUD-005 | CNT-009 | — | STK-004 |
| **COM-009** | August people digest | internal | **Completed** | Internal | — (standalone) | AUD-002 | CNT-005 | 2026-08-05T14:00Z | STK-007 |
| **COM-010** | Volt5 launch-day social burst | external | **Paused** (crisis-freeze drill) | Public | ACT-007 | AUD-001 | CNT-002 | 2026-09-01T07:00Z | STK-004 |

# 14. ChannelExecutions (13) — `seedChannelExecutions`

One row per (Communication x Channel):

| id | communication | channel | contentVersion | scheduledAt | status |
|---|---|---|---|---|---|
| **CHX-001** | COM-003 | CHN-001 | CV-002 | 2026-07-28T09:00Z | sent |
| **CHX-002** | COM-001 | CHN-001 | CV-006 | 2026-08-03T08:00Z | sent |
| **CHX-003** | COM-004 | CHN-001 | CV-010 | 2026-08-11T15:00Z | sent |
| **CHX-004** | COM-004 | CHN-006 | CV-010 | 2026-08-13T15:00Z | sending (reminder wave in flight "today") |
| **CHX-005** | COM-005 | CHN-001 | CV-012 | 2026-08-20T15:00Z | queued |
| **CHX-006** | COM-002 | CHN-004 | CV-008 | 2026-09-01T06:00Z | queued (embargoed) |
| **CHX-007** | COM-002 | CHN-003 | CV-008 | 2026-09-01T06:00Z | queued (simultaneous newsroom post) |
| **CHX-008** | COM-007 | CHN-005 | CV-013 | 2026-08-21T16:00Z | draft |
| **CHX-009** | COM-009 | CHN-005 | CV-009 | 2026-08-05T14:00Z | sent |
| **CHX-010** | COM-010 | CHN-002 | CV-004 | 2026-09-01T07:00Z | draft (comm Paused) |
| **CHX-011** | COM-008 | CHN-002 | CV-014 | — | draft |
| **CHX-012** | COM-006 | CHN-005 | — | 2026-09-21T10:00Z | draft |
| **CHX-013** | COM-003 | CHN-001 | CV-002 | 2026-07-29T09:00Z | failed (bounce-retry batch) |

# 15. Contents (10) — `content.ts` / `seedContents`

| id | title | type | status | classif. | brief | campaign | brand | owner | currentVersion | workflow |
|---|---|---|---|---|---|---|---|---|---|---|
| **CNT-001** | Volt4 clearance email | email | **Published** | Public | BRF-002 | CMP-002 | BRD-003 | STK-003 | CV-002 | WF-001 |
| **CNT-002** | Volt5 launch social kit | post | **Approved** | Public | BRF-003 | CMP-003 | BRD-003 | STK-003 | CV-004 | WF-001 |
| **CNT-003** | Volt5 pre-order announcement email | email | **Published** | Public | BRF-003 | CMP-003 | BRD-003 | STK-003 | CV-006 | WF-001 |
| **CNT-004** | Volt5 global launch press release | PR | **In Review** | Confidential | BRF-003 | CMP-003 | BRD-003 | STK-006 | CV-008 | WF-001 |
| **CNT-005** | August people digest | email | **Published** | Internal | — | — | BRD-001 | STK-007 | CV-009 | WF-001 |
| **CNT-006** | Zero-trust webinar invite email | email | **Published** | Public | BRF-004 | CMP-004 | BRD-004 | STK-003 | CV-010 | WF-001 |
| **CNT-007** | Webinar nurture follow-up email | email | **Approved** | Internal | BRF-004 | CMP-004 | BRD-004 | STK-003 | CV-012 | WF-001 |
| **CNT-008** | CEO mid-year update script | script | **In Review** | Confidential | — | — | BRD-001 | STK-002 | CV-013 | WF-001 |
| **CNT-009** | Solara autumn teaser copy | post | **Draft** | Public | BRF-001 | CMP-001 | BRD-002 | STK-003 | CV-014 | WF-001 |
| **CNT-010** | Volt5 launch landing page | page | **Rework** | Public | BRF-003 | CMP-003 | BRD-003 | STK-003 | CV-016 | WF-001 |

# 16. ContentVersions (16) — `seedContentVersions`

| id | content | version | locale | aiGenerated | approvalId | note |
|---|---|---|---|---|---|---|
| **CV-001** | CNT-001 | V1 | en-US | true | — | first AI draft |
| **CV-002** | CNT-001 | V1.1 | en-US | false | **APR-004** (Approved) | published version |
| **CV-003** | CNT-002 | V1 | en-GB | true | — | |
| **CV-004** | CNT-002 | V2 | en-GB | false | **APR-005** (Approved) | approved kit copy |
| **CV-005** | CNT-003 | V1 | en-GB | true | — | |
| **CV-006** | CNT-003 | V1.1 | en-GB | false | **APR-012** (Approved) | sent 2026-08-03 |
| **CV-007** | CNT-004 | V1 | en-US | true | — | |
| **CV-008** | CNT-004 | V2 | en-US | false | **APR-008** (In Review) | embargoed release |
| **CV-009** | CNT-005 | V1 | en-US | false | — | |
| **CV-010** | CNT-006 | V1 | en-US | false | — | |
| **CV-011** | CNT-007 | V1 | en-US | true | — | |
| **CV-012** | CNT-007 | V1.1 | en-US | false | **APR-009** (Approved) | |
| **CV-013** | CNT-008 | V1 | en-US | false | **APR-011** (In Review) | confidential script |
| **CV-014** | CNT-009 | V1 | en-US | true | — | draft teaser copy |
| **CV-015** | CNT-010 | V1 | en-GB | true | — | |
| **CV-016** | CNT-010 | V2 | en-GB | false | **APR-010** (Changes Requested) | in rework |

Each `body` is 2–4 sentences of real copy consistent with the title/locale. `createdAt` ordering
must respect version order per content.

# 17. Assets (8) — `seedAssets`

- **AST-001** `volt5-hero-4k.mp4` — video, BRD-003, **In Use**, rightsExpiry 2027-06-01. Used by CNT-002/CNT-010.
- **AST-002** `volt5-product-front.png` — image, BRD-003, **In Use**, rightsExpiry 2027-06-01.
- **AST-003** `volt4-clearance-banner.jpg` — image, BRD-003, **Approved**, rightsExpiry 2026-09-30 (expiry notification NTF-006).
- **AST-004** `solara-autumn-moodboard.pdf` — document, BRD-002, **Cataloged**, no expiry.
- **AST-005** `gridworks-webinar-cover.png` — image, BRD-004, **In Use**, no expiry.
- **AST-006** `sustainability-week-logo.svg` — image, BRD-001, **Approved**, no expiry.
- **AST-007** `volt-legacy-lifestyle.jpg` — image, BRD-003, **Expired**, rightsExpiry 2026-07-31 (expiry notification NTF-005).
- **AST-008** `ceo-townhall-stage.jpg` — image, BRD-001, **Uploaded** (cataloging pending).

# 18. Audiences (5) — `audience.ts` / `seedAudiences`

- **AUD-001** "Volt upgrade prospects" — customer, segments [SEG-001, SEG-002, SEG-004], regions [REG-EMEA, REG-APAC]. Comms COM-001, COM-003, COM-010.
- **AUD-002** "Global employees" — employee, segments [SEG-005, SEG-006], regions [REG-AMER, REG-EMEA, REG-APAC]. Comms COM-006, COM-007, COM-009.
- **AUD-003** "Enterprise security buyers" — customer, segments [SEG-007], regions [REG-AMER]. Comms COM-004, COM-005.
- **AUD-004** "Tech & business press" — press, segments [SEG-008], regions [REG-AMER, REG-EMEA]. Comm COM-002.
- **AUD-005** "Solara newsletter base" — customer, segments [SEG-003], regions [REG-AMER, REG-EMEA]. Comm COM-008.

# 19. Segments (8) — `seedSegments`

| id | name | criteria | population |
|---|---|---|---|
| **SEG-001** | Volt owners 12–24mo | `device_brand = 'Volt' AND device_age_months BETWEEN 12 AND 24` | 480000 |
| **SEG-002** | High-intent pre-order clickers | `clicked('volt5-preorder') within 30d` | 65000 |
| **SEG-003** | Solara newsletter actives | `list = 'solara-news' AND opened within 90d` | 320000 |
| **SEG-004** | APAC 5G-ready cities | `region = 'APAC' AND city IN 5g_rollout_list` | 750000 |
| **SEG-005** | All employees | `employment_status = 'active'` | 8200 |
| **SEG-006** | People managers | `direct_reports >= 1` | 1150 |
| **SEG-007** | IT decision makers (NA) | `title IN (CISO, CIO, 'IT Director') AND region = 'AMER'` | 42000 |
| **SEG-008** | Tier-1 tech press | `outlet_tier = 1 AND beat IN (tech, business)` | 350 |

(`population` is the raw seeded number consumed by the `segmentSize` selector.)

# 20. Workflows (3) — `governance.ts` / `seedWorkflows`

- **WF-001** "Standard Content Review" — appliesTo `Content`, version 1, slaHours 24, stages [WFS-001, WFS-002, WFS-003]. Used by all CNT-*.
- **WF-002** "Campaign Launch Approval" — appliesTo `Campaign`, version 2, slaHours 48, stages [WFS-004, WFS-005, WFS-006, WFS-007]. Used by all CMP-*.
- **WF-003** "Corporate Comms Approval" — appliesTo `Communication`, version 1, slaHours 24, stages [WFS-008, WFS-009, WFS-010]. Used for COM-007.

# 21. WorkflowStages (10) — `seedWorkflowStages`

| id | workflow | order | name | mode | assigneeRole | slaHours | automation |
|---|---|---|---|---|---|---|---|
| **WFS-001** | WF-001 | 1 | Brand AI gate | sequential | Content Manager | 2 | brand-ai |
| **WFS-002** | WF-001 | 2 | Peer/editor review | sequential | Content Manager | 24 | null |
| **WFS-003** | WF-001 | 3 | Brand approval | sequential | Brand Manager | 24 | null |
| **WFS-004** | WF-002 | 1 | Brief sign-off | sequential | CMO | 24 | null |
| **WFS-005** | WF-002 | 2 | Compliance AI gate | sequential | Legal/Compliance Reviewer | 2 | compliance-ai |
| **WFS-006** | WF-002 | 3 | Brand & legal review | parallel-group | Brand Manager | 48 | null |
| **WFS-007** | WF-002 | 4 | Go-live sign-off | sequential | CMO | 24 | null |
| **WFS-008** | WF-003 | 1 | Brand + compliance AI gate | sequential | Corporate Comms Manager | 2 | brand-ai |
| **WFS-009** | WF-003 | 2 | Comms director review | sequential | Corporate Comms Manager | 12 | null |
| **WFS-010** | WF-003 | 3 | Executive sign-off | sequential | Executive | 12 | null |

# 22. Approvals (12) — `seedApprovals`

| id | subject | version | stage | approver | status | slaDueAt | decidedAt | comment |
|---|---|---|---|---|---|---|---|---|
| **APR-001** | Brief BRF-002 | — | WFS-004 | STK-001 | Approved | 2026-05-12T17:00Z | 2026-05-11T15:20Z | "Clear objective, go." |
| **APR-002** | Brief BRF-003 | — | WFS-004 | STK-001 | Approved | 2026-05-23T17:00Z | 2026-05-22T10:05Z | "Tier-1 launch approved." |
| **APR-003** | Brief BRF-004 | — | WFS-004 | STK-001 | Approved | 2026-05-30T17:00Z | 2026-05-29T09:40Z | — |
| **APR-004** | Content CNT-001 | CV-002 | WFS-003 | STK-005 | Approved | 2026-07-11T17:00Z | 2026-07-10T11:30Z | — |
| **APR-005** | Content CNT-002 | CV-004 | WFS-003 | STK-005 | Approved | 2026-07-25T17:00Z | 2026-07-24T16:10Z | "On-brand, ship it." |
| **APR-006** | Campaign CMP-001 | — | WFS-006 | STK-005 | **In Review** | 2026-08-15T17:00Z | — | — |
| **APR-007** | Campaign CMP-001 | — | WFS-006 | STK-008 | **Requested** | 2026-08-16T17:00Z | — | — |
| **APR-008** | Content CNT-004 | CV-008 | WFS-003 | STK-005 | **In Review** | 2026-08-14T17:00Z | — | — |
| **APR-009** | Content CNT-007 | CV-012 | WFS-003 | STK-005 | Approved | 2026-08-02T17:00Z | 2026-08-01T13:55Z | — |
| **APR-010** | Content CNT-010 | CV-016 | WFS-003 | STK-005 | **Changes Requested** | 2026-08-09T17:00Z | 2026-08-08T14:25Z | "Hero image off-brand; fix spec table." |
| **APR-011** | Communication COM-007 | CV-013 | WFS-010 | STK-009 | **In Review** | 2026-08-14T12:00Z | — | — |
| **APR-012** | Content CNT-003 | CV-006 | WFS-003 | STK-005 | Approved | 2026-07-29T17:00Z | 2026-07-28T09:45Z | — |

All pending approvals (APR-006, APR-007, APR-008, APR-011) reference real approver stakeholders
matching the stage's assigneeRole and are due on/after 2026-08-14.

# 23. Policies (4) — `seedPolicies`

- **POL-001** "Volt brand voice rules" — `brand`, **warn** — "Headlines in sentence case; never abbreviate 'Volt 5G'; product renders only from approved asset pool."
- **POL-002** "EU performance-claims substantiation" — `regulatory`, **block** — "Any speed/battery claim in EMEA requires a linked substantiation note before Approval."
- **POL-003** "Press embargo handling" — `legal`, **block** — "Embargoed releases stay Confidential; no ChannelExecution may fire before embargo timestamp."
- **POL-004** "Accessibility alt-text" — `accessibility`, **warn** — "Every image asset referenced by a ContentVersion must carry alt text."

# 24. Notifications (8) — `seedNotifications`

| id | recipient | kind | subject | read | at | message gist |
|---|---|---|---|---|---|---|
| **NTF-001** | STK-005 | approval-due | Approval APR-006 | false | 2026-08-12T08:00Z | Brand review due for CMP-001 |
| **NTF-002** | STK-008 | approval-due | Approval APR-007 | false | 2026-08-12T08:00Z | Legal review requested for CMP-001 |
| **NTF-003** | STK-005 | approval-due | Approval APR-008 | false | 2026-08-11T09:00Z | Volt5 press release awaiting brand review |
| **NTF-004** | STK-009 | approval-due | Approval APR-011 | false | 2026-08-12T09:30Z | CEO update script awaits sign-off |
| **NTF-005** | STK-004 | asset-expiry | Asset AST-007 | true | 2026-08-01T07:00Z | Rights expired on volt-legacy-lifestyle.jpg |
| **NTF-006** | STK-003 | asset-expiry | Asset AST-003 | false | 2026-08-10T07:00Z | Rights on clearance banner expire 2026-09-30 |
| **NTF-007** | STK-004 | sla-breach | CampaignActivity ACT-003 | false | 2026-08-09T07:00Z | Retail landing refresh blocked past SLA |
| **NTF-008** | STK-006 | approval-due | Content CNT-004 | false | 2026-08-11T09:05Z | Launch press release in brand review |

# 25. AuditRecords (10) — `seedAuditRecords`

| id | actor | action | entity | at | detail gist |
|---|---|---|---|---|---|
| **ADT-001** | STK-004 | campaign.created | Campaign CMP-003 | 2026-05-20T10:00Z | Created from Idea IDE-001 |
| **ADT-002** | STK-001 | approval.approved | Approval APR-002 | 2026-05-22T10:05Z | Brief BRF-003 sign-off |
| **ADT-003** | STK-004 | campaign.launched | Campaign CMP-003 | 2026-06-01T08:00Z | Approved → Live |
| **ADT-004** | STK-005 | approval.approved | Approval APR-005 | 2026-07-24T16:10Z | CNT-002 CV-004 brand-approved |
| **ADT-005** | STK-006 | content.submitted | Content CNT-004 | 2026-08-06T11:00Z | CV-008 submitted to WFS-003 |
| **ADT-006** | STK-005 | approval.changes_requested | Approval APR-010 | 2026-08-08T14:25Z | CNT-010 sent to Rework |
| **ADT-007** | STK-004 | campaign.submitted_for_approval | Campaign CMP-001 | 2026-08-10T09:00Z | Planned → In Approval |
| **ADT-008** | STK-002 | communication.submitted | Communication COM-007 | 2026-08-11T10:30Z | Drafting → In Review |
| **ADT-009** | STK-004 | campaign.completed | Campaign CMP-002 | 2026-08-07T18:00Z | Live → Completed |
| **ADT-010** | STK-007 | idea.promoted | Idea IDE-004 | 2026-07-15T09:00Z | Promoted to Campaign CMP-005 |

# 26. Budgets (3) — `money.ts` / `seedBudgets`

- **BUD-001** "FY2026 Consumer Marketing" — FY2026, BU-001, amountPlanned **1200000**, allocations: CMP-001 180000, CMP-002 220000, CMP-003 450000, CMP-006 120000 (sum 970000 < 1200000 ✓).
- **BUD-002** "FY2026 Enterprise Marketing" — FY2026, BU-002, amountPlanned **400000**, allocations: CMP-004 150000 (sum 150000 < 400000 ✓).
- **BUD-003** "FY2026 Corporate Comms" — FY2026, BU-003, amountPlanned **150000**, allocations: CMP-005 60000 (sum 60000 < 150000 ✓).

Each campaign's `budgetAllocation` equals its allocation amount in its BU's budget.

# 27. KPIs (8) — `metrics.ts` / `seedKpis`

| id | name | metricKey | tier | unit | dir | target | period | attachedTo |
|---|---|---|---|---|---|---|---|---|
| **KPI-001** | Volt4 clearance revenue | `revenue_attributed` | business | USD | up | 1500000 | FY2026-H1 | campaignId CMP-002 |
| **KPI-002** | Consumer email engagement | `email_open_rate` | engagement | % | up | 32 | FY2026 | strategyId STR-001 |
| **KPI-003** | Solara autumn reach | `impressions` | reach | count | up | 8000000 | Q4-2026 | campaignId CMP-001 |
| **KPI-004** | Volt5 pre-orders | `preorders` | conversion | count | up | 50000 | Q3-2026 | campaignId CMP-003 |
| **KPI-005** | Volt5 launch reach | `impressions` | reach | count | up | 25000000 | Q3-2026 | campaignId CMP-003 |
| **KPI-006** | Webinar registrations | `registrations` | conversion | count | up | 3000 | Q3-2026 | campaignId CMP-004 |
| **KPI-007** | Enterprise pipeline influenced | `pipeline_usd` | business | USD | up | 2000000 | FY2026 | strategyId STR-002 |
| **KPI-008** | Sustainability week participation | `participation_rate` | engagement | % | up | 60 | Q4-2026 | campaignId CMP-005 |

# 28. MetricResults (80) — `seedMetricResults`

Deterministic block allocation. Within each block of 10, ids map to the 10 metric weeks **in order**
(`2026-06-08, 06-15, 06-22, 06-29, 07-06, 07-13, 07-20, 07-27, 08-03, 08-10`) — e.g. MR-003 is the
2026-06-22 row of block 1, MR-047 is the 2026-07-20 row of block 5.

| Block (10 ids) | kpiId | metricKey | dimensions | value guidance |
|---|---|---|---|---|
| **MR-001..MR-010** | KPI-001 | `revenue_attributed` | campaignId CMP-002, brandId BRD-003, businessUnitId BU-001, regionId REG-AMER | weekly USD ramp 90k → 210k, tapering final 2 weeks; 10-week sum ≈ 1.42M (just under target) |
| **MR-011..MR-020** | KPI-002 | `email_open_rate` | campaignId CMP-002, channelId CHN-001, brandId BRD-003, businessUnitId BU-001 | 27–34, mild upward drift |
| **MR-021..MR-030** | — | `impressions` | campaignId CMP-002, channelId CHN-002, brandId BRD-003, businessUnitId BU-001 | 600k–1.3M weekly, peak mid-July |
| **MR-031..MR-040** | KPI-004 | `preorders` | campaignId CMP-003, brandId BRD-003, businessUnitId BU-001, regionId REG-EMEA | 0 for weeks 1–4 (pre-open), then 4k → 11k weekly after 2026-07-06 |
| **MR-041..MR-050** | KPI-005 | `impressions` | campaignId CMP-003, channelId CHN-002, brandId BRD-003, businessUnitId BU-001 | 1.2M → 3.5M weekly, rising toward launch |
| **MR-051..MR-060** | KPI-002 | `email_open_rate` | campaignId CMP-003, channelId CHN-001, brandId BRD-003, businessUnitId BU-001 | 30–38 |
| **MR-061..MR-070** | KPI-006 | `registrations` | campaignId CMP-004, channelId CHN-006, brandId BRD-004, businessUnitId BU-002, regionId REG-AMER | 150–420 weekly, spikes on webinar weeks (06-22, 07-20, 08-10) |
| **MR-071..MR-080** | KPI-007 | `pipeline_usd` | campaignId CMP-004, brandId BRD-004, businessUnitId BU-002, regionId REG-AMER | 60k–220k weekly, cumulative ≈ 1.3M by 08-10 |

No MetricResult rows exist for CMP-001, CMP-005, CMP-006 (not Live/Completed).

---

## Coherence invariants (seed authors: verify before commit)

1. Every foreign key above resolves to an id in this manifest — nothing else may be referenced.
2. Pending Approvals (APR-006/007/008/011) → real approvers whose role matches the stage's `assigneeRole`; `slaDueAt` ≥ 2026-08-14.
3. Live campaigns (CMP-003, CMP-004) have all activities `In Progress` spanning 2026-08-13.
4. `Budget.allocations` sums: 970000 < 1200000, 150000 < 400000, 60000 < 150000.
5. `Content.currentVersionId` always points at that content's highest version; `ContentVersion.approvalId` mirrors the Approval's `subjectVersionId`.
6. `Brief.approvalId` mirrors the Approval whose `subjectId` is that brief (APR-001/002/003).
7. Campaign `budgetAllocation` equals its BU-budget allocation row; activity `spendAllocated` per campaign sums below `budgetAllocation`.
8. MetricResult `period` values come only from the 10-week grid; block/week mapping is fixed as defined in §28.
9. Stakeholder roles: exactly one per persona + Platform Admin (11 total, STK-001..STK-011).
10. Communication statuses must be legal for their linked artifacts (e.g. Live/Completed comms have `sent` executions; Scheduled comms have `queued` executions; Paused/Drafting comms have `draft` executions).

## ID count summary

| Entity | Count | Range |
|---|---|---|
| Organization | 1 | ORG-001 |
| BusinessUnit | 3 | BU-001..BU-003 |
| Brand | 4 | BRD-001..BRD-004 |
| Region | 3 | REG-AMER, REG-EMEA, REG-APAC |
| Stakeholder | 11 | STK-001..STK-011 |
| Agency | 2 | AGY-001..AGY-002 |
| Idea | 6 | IDE-001..IDE-006 |
| Strategy | 2 | STR-001..STR-002 |
| Campaign | 6 | CMP-001..CMP-006 |
| CampaignActivity | 14 | ACT-001..ACT-014 |
| Brief | 6 | BRF-001..BRF-006 |
| Communication | 10 | COM-001..COM-010 |
| ChannelExecution | 13 | CHX-001..CHX-013 |
| Channel | 6 | CHN-001..CHN-006 |
| Content | 10 | CNT-001..CNT-010 |
| ContentVersion | 16 | CV-001..CV-016 |
| Asset | 8 | AST-001..AST-008 |
| Audience | 5 | AUD-001..AUD-005 |
| Segment | 8 | SEG-001..SEG-008 |
| Workflow | 3 | WF-001..WF-003 |
| WorkflowStage | 10 | WFS-001..WFS-010 |
| Approval | 12 | APR-001..APR-012 |
| Policy | 4 | POL-001..POL-004 |
| Notification | 8 | NTF-001..NTF-008 |
| Budget | 3 | BUD-001..BUD-003 |
| KPI | 8 | KPI-001..KPI-008 |
| MetricResult | 80 | MR-001..MR-080 |
| AuditRecord | 10 | ADT-001..ADT-010 |
| **Total** | **291** | |

## Increment 3 additions

### Journeys (3) — `seed/communications.ts` → `seedJourneys`

| ID | Name | Status | Version | audienceId | Node config refs |
|---|---|---|---|---|---|
| JRN-001 | Volt5 pre-order nurture | Active | 2 | AUD-001 | AUD-001, SEG-002, COM-001, COM-010 |
| JRN-002 | Zero-trust webinar follow-up | Active | 1 | AUD-003 | AUD-003, SEG-007, COM-004, COM-005 |
| JRN-003 | Employee sustainability onboarding | Draft | 1 | AUD-002 | AUD-002, SEG-005, COM-006, COM-009 |

Node shape per journey: `trigger → audience → send → wait → [condition → branch →] send → exit`; node ids are journey-local (`N-01`..), edges reference node ids only.
- JRN-001: trigger → audience(AUD-001/SEG-002) → send(COM-001) → wait 2d → condition(opened) → branch(50%) → send(COM-010) → exit; branch also routes 'not opened' straight to exit.
- JRN-002: trigger → audience(AUD-003/SEG-007) → send(COM-004) → wait 3d → condition(attended) → send(COM-005) → exit; 'no-show' routes to exit.
- JRN-003: trigger → audience(AUD-002/SEG-005) → send(COM-006) → wait 7d → send(COM-009) → exit.

### Events (4) — `seed/campaigns.ts` → `seedEvents`

| ID | Name | Type | Dates | campaignId | regionId | ownerStakeholderId |
|---|---|---|---|---|---|---|
| EVT-001 | Volt5 Global Launch Event | launch | 2026-09-01 | CMP-003 | REG-EMEA | STK-004 |
| EVT-002 | GridWorks Zero-Trust Webinar #3 | webinar | 2026-08-13 | CMP-004 | REG-AMER | STK-004 |
| EVT-003 | GridWorks Zero-Trust Webinar #4 | webinar | 2026-09-10 | CMP-004 | REG-AMER | STK-004 |
| EVT-004 | Sustainability Week Town Hall | townhall | 2026-10-05 | CMP-005 | REG-AMER | STK-007 |

Cross-reference rules: EVT-002/EVT-003 correspond to sessions of activity ACT-010 (Zero-trust webinar series); EVT-001 aligns with COM-002/COM-010 launch-day scheduling (2026-09-01); EVT-004 aligns with ACT-013 (Leadership kickoff livestream, 2026-10-05). `assertAllLinksResolve` now validates journey node config refs (Audience/Segment/Communication), journey edge endpoints against node ids, and event Campaign/Region/Stakeholder refs.

### Updated ID counts (Increment 3)

| Entity | Count | Range |
|---|---|---|
| Journey | 3 | JRN-001..JRN-003 |
| Event | 4 | EVT-001..EVT-004 |

## Increment 4 additions

### CrisisIncidents (2) — `seed/communications.ts` → `seedCrisisIncidents`

| ID | Title | Severity | Status | Classif. | declaredAt | resolvedAt | War room | Brands | Regions | Holding stmt |
|---|---|---|---|---|---|---|---|---|---|---|
| **CRI-001** | Volt battery overheating reports | High | **Active** | Restricted | 2026-08-11T14:00Z | — | STK-002, STK-001, STK-008 | BRD-003 | REG-EMEA, REG-APAC | — (none in library; see summary) |
| **CRI-002** | Data center outage press coverage | Medium | **Resolved** | Confidential | 2026-07-02T08:30Z | 2026-07-04T17:00Z | STK-002, STK-006 | BRD-004 | REG-AMER | — |

`CrisisIncident` is now an `EntityName`; `SeedDB.crisisIncidents` holds the collection.
CRI-001 sets no `holdingStatementContentId` — the only Approved contents (CNT-002 social kit,
CNT-007 webinar email) are not plausible holding statements; its `summary` records that the
approved statement is held in the war room pending publication.

### AuditRecords +4 (ADT-011..ADT-014) — CRI-001 timeline, `entityType: 'CrisisIncident'`, `entityId: 'CRI-001'`

| id | actor | action | at | detail gist |
|---|---|---|---|---|
| **ADT-011** | STK-002 | crisis.declared | 2026-08-11T14:00Z | CRI-001 declared at severity High |
| **ADT-012** | STK-002 | crisis.war_room_assembled | 2026-08-11T14:45Z | War room: STK-001, STK-002, STK-008 |
| **ADT-013** | STK-002 | crisis.holding_statement_drafted | 2026-08-11T18:30Z | Statement drafted, sent to legal |
| **ADT-014** | STK-008 | crisis.statement_approved | 2026-08-12T09:15Z | Statement approved by Legal/Compliance |

### Notifications +2 (NTF-013..NTF-014) — kind `crisis`, unread, subject CrisisIncident CRI-001

| id | recipient | at | message gist |
|---|---|---|---|
| **NTF-013** | STK-001 (CMO) | 2026-08-11T14:05Z | CRI-001 declared; you are in the war room |
| **NTF-014** | STK-002 (Corporate Comms Manager) | 2026-08-12T09:20Z | Holding statement approved; publication on standby |

`assertAllLinksResolve` now validates CrisisIncident refs (holdingStatementContentId → Content,
warRoomStakeholderIds → Stakeholder, affectedBrandIds → Brand, affectedRegionIds → Region) and
resolves AuditRecord/Notification subjects of type CrisisIncident.

### Updated ID counts (Increment 4)

| Entity | Count | Range |
|---|---|---|
| CrisisIncident | 2 | CRI-001..CRI-002 |
| Notification | 10 | NTF-001..NTF-008, NTF-013..NTF-014 |
| AuditRecord | 14 | ADT-001..ADT-014 |

---

## Increment 5 additions

### MediaContacts (8) — `seed/pr.ts` → `seedMediaContacts`

| ID | Name | Outlet | Beat | Region | Relationship | lastInteractionAt |
|---|---|---|---|---|---|---|
| **MCT-001** | Priya Raman | The Signal Post (tech) | Consumer electronics & 5G devices | REG-APAC | Strong | 2026-08-06 |
| **MCT-002** | Marcus Feld | TechCadence (tech) | Mobile hardware & chipsets | REG-EMEA | Strong | 2026-08-10 |
| **MCT-003** | Elena Vosk | Meridian Business Review (business) | Corporate strategy & sustainability | REG-EMEA | Warm | 2026-07-22 |
| **MCT-004** | Daniel Okafor | GridLine Weekly (trade) | Enterprise infrastructure & security | REG-AMER | Warm | 2026-08-04 |
| **MCT-005** | Sofia Lindqvist | Homefront Living (consumer) | Consumer lifestyle & smart home | REG-EMEA | Warm | 2026-07-30 |
| **MCT-006** | James Whitcombe | The Capital Ledger (business) | Technology business & markets | REG-AMER | Strong | 2026-08-11 |
| **MCT-007** | Aiko Tanabe | Denki Trade Journal (trade) | Electronics manufacturing & supply chain | REG-APAC | New | 2026-08-01 |
| **MCT-008** | Rachel Doyle | Secure Stack (trade) | Cybersecurity & zero-trust architecture | REG-AMER | New | 2026-07-18 |

All emails use fictional `.example` domains. Beats map to brands: MCT-001/002/007 → Volt,
MCT-004/008 → GridWorks, MCT-005 → Solara, MCT-003/006 → Aureon/corporate.

### CoverageItems (10) — `seed/pr.ts` → `seedCoverageItems`

| ID | Headline gist | Outlet | Contact | Campaign | Communication | publishedAt | Sentiment | Reach |
|---|---|---|---|---|---|---|---|---|
| **COV-001** | Volt5 pre-orders open | The Signal Post | MCT-001 | CMP-003 | COM-001 | 2026-06-16 | Positive | 480,000 |
| **COV-002** | Volt5 review | TechCadence | MCT-002 | CMP-003 | COM-002 | 2026-07-08 | Positive | 620,000 |
| **COV-003** | Volt bets on EMEA/APAC | The Capital Ledger | MCT-006 | CMP-003 | COM-002 | 2026-07-09 | Neutral | 350,000 |
| **COV-004** | Volt5 supply chain | Denki Trade Journal | MCT-007 | CMP-003 | COM-002 | 2026-07-15 | Positive | 95,000 |
| **COV-005** | Launch-day social push | The Signal Post | MCT-001 | CMP-003 | COM-010 | 2026-07-21 | Positive | 410,000 |
| **COV-006** | Volt5 camera claims check | TechCadence | MCT-002 | CMP-003 | COM-002 | 2026-08-03 | Neutral | 275,000 |
| **COV-007** | Zero-trust webinars draw crowd | GridLine Weekly | MCT-004 | CMP-004 | COM-004 | 2026-07-24 | Positive | 68,000 |
| **COV-008** | Zero-trust takeaways | Secure Stack | MCT-008 | CMP-004 | COM-005 | 2026-08-05 | Positive | 54,000 |
| **COV-009** | Battery overheating reports | The Capital Ledger | MCT-006 | — | — | 2026-08-11 | Negative | 530,000 |
| **COV-010** | Battery complaints explainer | The Signal Post | MCT-001 | — | — | 2026-08-12 | Neutral | 390,000 |

COV-001..006 are the Volt5 launch (CMP-003) earned-media arc via its press
communications; COV-007..008 cover the GridWorks webinar series (CMP-004);
COV-009..010 are crisis-adjacent Volt battery items (aligned with CRI-001,
declared 2026-08-11T14:00Z) tied to no campaign or communication.

`MediaContact` and `CoverageItem` are now `EntityName`s; `SeedDB.mediaContacts` /
`SeedDB.coverageItems` hold the collections. `assertAllLinksResolve` validates
MediaContact.regionId → Region and CoverageItem.{mediaContactId → MediaContact,
campaignId → Campaign, communicationId → Communication}.

### Updated ID counts (Increment 5)

| Entity | Count | Range |
|---|---|---|
| MediaContact | 8 | MCT-001..MCT-008 |
| CoverageItem | 10 | COV-001..COV-010 |

## Increment 6 additions

### SuppressionEntries (8) — `seed/audience.ts` → `seedSuppressionEntries`

| ID | subjectKey (masked) | Reason | Channel | Audience | addedAt | addedBy |
|---|---|---|---|---|---|---|
| **SUP-001** | m***@example.com | opt-out | email | AUD-005 | 2026-07-02 | STK-004 |
| **SUP-002** | j***@example.org | legal-complaint | — (all) | — (org-wide) | 2026-07-09 | STK-008 |
| **SUP-003** | +44*******82 | opt-out | SMS | AUD-001 | 2026-07-14 | STK-004 |
| **SUP-004** | r***@example.net | bounce | email | AUD-003 | 2026-07-18 | STK-011 |
| **SUP-005** | employee-4821 | do-not-contact | intranet | AUD-002 | 2026-07-23 | STK-007 |
| **SUP-006** | a***@example.com | do-not-contact | — (all) | — (org-wide) | 2026-07-29 | STK-008 |
| **SUP-007** | k***@example.io | bounce | email | — (org-wide) | 2026-08-04 | STK-011 |
| **SUP-008** | s***@example.co | opt-out | social | AUD-001 | 2026-08-09 | STK-004 |

Subject keys are always masked (never raw PII). Legal-driven entries (SUP-002/006)
were added by the Legal/Compliance Reviewer (STK-008); bounces by the Platform
Admin (STK-011); campaign opt-outs by the Campaign Manager (STK-004); the employee
entry by the Internal Comms Manager (STK-007). Omitted `channelKind` = all
channels; omitted `audienceId` = org-wide.

### ConsentSummaries (8) — `seed/audience.ts` → `seedConsentSummaries`

One row per segment × its most relevant channel kind.

| ID | Segment | Channel | optedInPct | lastRefreshedAt |
|---|---|---|---|---|
| **CNS-001** | SEG-001 (Volt owners 12–24mo) | email | 78 | 2026-08-03 |
| **CNS-002** | SEG-002 (High-intent pre-order clickers) | SMS | 62 | 2026-08-10 |
| **CNS-003** | SEG-003 (Solara newsletter actives) | email | 91 | 2026-08-01 |
| **CNS-004** | SEG-004 (APAC 5G-ready cities) | social | 69 | 2026-07-28 |
| **CNS-005** | SEG-005 (All employees) | intranet | 97 | 2026-08-03 |
| **CNS-006** | SEG-006 (People managers) | email | 95 | 2026-08-03 |
| **CNS-007** | SEG-007 (IT decision makers NA) | email | 66 | 2026-07-30 |
| **CNS-008** | SEG-008 (Tier-1 tech press) | press | 88 | 2026-07-22 |

`SuppressionEntry` and `ConsentSummary` are now `EntityName`s;
`SeedDB.suppressionEntries` / `SeedDB.consentSummaries` hold the collections.
`assertAllLinksResolve` validates SuppressionEntry.{audienceId → Audience,
addedByStakeholderId → Stakeholder} and ConsentSummary.segmentId → Segment.

### Updated ID counts (Increment 6)

| Entity | Count | Range |
|---|---|---|
| SuppressionEntry | 8 | SUP-001..SUP-008 |
| ConsentSummary | 8 | CNS-001..CNS-008 |

---

## Wave 2+3 additions

### Brand visual identity — `seed/org.ts` → `seedBrands` (extended)

All four brands (BRD-001..BRD-004) now carry `logoDescription`, `colorPalette`
(named CSS color values — brand DATA rendered as swatches, exempt from the UI
no-hex rule), `typography`, and `imageryGuidelines`.

### CustomerPersonas (4) — `seed/audience.ts` → `seedCustomerPersonas`

| ID | Name | Audience |
|---|---|---|
| **PER-001** | Upgrade-ready Uma | AUD-001 (Volt upgrade prospects) |
| **PER-002** | Security-first Sanjay | AUD-003 (Enterprise security buyers) |
| **PER-003** | Everyday Elena | AUD-005 (Solara newsletter base) |
| **PER-004** | Connected-culture Chris | AUD-002 (Global employees) |

### Investor audience — `seed/audience.ts`

New **AUD-006** 'Institutional investors & analysts' (audienceKind `investor`)
backed by new segment **SEG-009** 'Institutional holders & sell-side analysts'
(population 420) — target for the investor communications below.

### Market intelligence — NEW `seed/market.ts`

- **Competitors (3)** — `seedCompetitors`: CPT-001 Northvolt Dynamics (vs BRD-003),
  CPT-002 Solstice Energy (vs BRD-002/BRD-001), CPT-003 HelioGrid (vs BRD-004);
  each with 2–4 dated moves (Jun–Aug 2026, moveType launch/campaign/pricing/partnership).
- **MarketTrends (3)** — `seedMarketTrends`: TRD-001 (BU-001, monthly, %),
  TRD-002 (BU-002, quarterly, index), TRD-003 (BU-003, monthly, %); 8 points each + insight.
- **ShareOfVoice (8)** — `seedShareOfVoice`: SOV-001..SOV-008, one per brand for
  2026-Q2 (9/14/19/11 = 53) and 2026-Q3 (10/15/24/12 = 61); per-period sums <= 100,
  the remainder is implicit competitors.

### Investor communications — `seed/communications.ts`

| ID | Subject | commsType | Classification | Status | Audience | Owner |
|---|---|---|---|---|---|---|
| **COM-019** | H1 results investor briefing | investor | Restricted | Approved | AUD-006 | STK-002 |
| **COM-020** | Volt supply-chain investor note | investor | Confidential | Drafting | AUD-006 | STK-002 |

`Communication.body` added; seeded on COM-001, COM-002, COM-004, COM-006,
COM-007, COM-009 (high-profile comms) plus both investor comms.

### Governance — `seed/governance.ts`

- **POL-005** 'Mandatory disclaimers & trademarks' (legal, block): forward-looking
  statements disclaimer for investor comms, 'Preliminary and unaudited' for
  pre-filing figures, ™ on first product-name mention.
- **WF-004** 'Exception approval' (appliesTo Campaign, slaHours 48): WFS-014
  'Waiver justification review' (Brand Manager) → WFS-015 'Elevated sign-off' (CMO).
- **APR-015** — Budget-subject approval: BUD-001, stage WFS-015, approver STK-001
  (CMO), In Review, slaDueAt 2026-08-16.
- **`seedAIReviews`** — empty array; AIReview is a runtime-only collection
  (populated by AI review runs via the DataStore, collection id `aiReviews`).

### Type/vocabulary changes — `types.ts`

- `ChannelKind` += `'print' | 'ads'`; `CommsType` += `'investor'`.
- New entities: `CustomerPersona`, `Competitor`, `MarketTrend`, `ShareOfVoice`,
  `ReviewFinding`/`AIReview`; `EntityName` += CustomerPersona/Competitor/AIReview.
- `SeedDB` += `customerPersonas`, `competitors`, `marketTrends`, `shareOfVoice`,
  `aiReviews`.
- `assertAllLinksResolve` now validates persona.audienceId, competitor.focusBrandIds,
  trend.businessUnitId, sov.brandId, and AIReview subject/ranBy/finding.policyId refs.
- `useLiveDB` mutable collections += `brands` (seedBrands), `aiReviews` (empty seed).

### Updated ID counts (Wave 2+3)

| Entity | Count | Range |
|---|---|---|
| CustomerPersona | 4 | PER-001..PER-004 |
| Competitor | 3 | CPT-001..CPT-003 |
| MarketTrend | 3 | TRD-001..TRD-003 |
| ShareOfVoice | 8 | SOV-001..SOV-008 |
| AIReview | 0 | (runtime-only) |
| Audience | 6 | AUD-001..AUD-006 |
| Segment | 9 | SEG-001..SEG-009 |
| Communication | 12 | COM-001..COM-010, COM-019..COM-020 |
| Policy | 5 | POL-001..POL-005 |
| Workflow | 4 | WF-001..WF-004 |
| WorkflowStage | 12 | WFS-001..WFS-010, WFS-014..WFS-015 |
| Approval | 13 | APR-001..APR-012, APR-015 |

## Demo-enforcement addition (2026-08-14)

- **CNT-011** "Volt5 EMEA paid social variant" — post, In Review, Public, BRF-003 / CMP-003 / BRD-003, owner STK-003, workflow WF-001, currentVersion CV-017.
- **CV-017** — V1, en-GB, no approval. Copy is deliberately non-compliant so the brand & compliance check has a live failing case: two unsubstantiated performance claims ("2x faster", "40% longer") on an EMEA campaign trip POL-002 at **block** severity, plus the banned hype term "revolutionary" (POL-001) and a bare "Volt 5G" trademark (POL-005) at warn. Running the check returns 1 pass / 3 warn / 2 block and returns the item to Rework.

## Spec alignment wave A

Extends the seed with the operating model (lifecycle + agents) and the legal /
language reference layer. Additive only — no existing id, name, status or
foreign key changed.

### New files

| File (`src/data/seed/`) | Exports |
|---|---|
| `module.ts` | `seedLifecycleStages`, `seedMarcomAgents` |
| `legal.ts` | `seedJurisdictions`, `seedLegalClauses`, `seedGlossaryTerms` |

### New ID prefixes

| Prefix | Entity | Prefix | Entity |
|---|---|---|---|
| LCS- | LifecycleStage | LGL- | LegalClause |
| AGT- | MarcomAgent | GLS- | GlossaryTerm |
| JUR- | Jurisdiction | | |

### LifecycleStages (8) — `seed/module.ts`

`LCS-001..LCS-008`, `order` 1..8, one row per `key`.

| ID | Key | Name | Owning agents | Key output | Review gate |
|---|---|---|---|---|---|
| **LCS-001** | govern | Govern | AGT-A1 | Approved brand system, policy set, workflow definitions | Brand Manager + Legal ratify guardrail changes |
| **LCS-002** | understand | Understand | AGT-A2 | Market/competitor briefing with SOV, trends, persona insight | CMO accepts the market read |
| **LCS-003** | plan | Plan | AGT-A3, AGT-A6 | Approved campaign plan: brief, budget, channel mix, KPI targets | CMO approves budget; Campaign Manager signs the brief |
| **LCS-004** | create | Create | AGT-A4, AGT-A5 | Versioned content + assets, AI provenance flagged | Content Manager accepts the review candidate |
| **LCS-005** | comply | Comply | AGT-A1, AGT-A5 | Review run with findings, mandated clauses, approval on record | Legal/Compliance Reviewer clears — AI may block, only a reviewer clears |
| **LCS-006** | activate | Activate | AGT-A6 | Scheduled channel executions and live journeys | Campaign Manager releases the send |
| **LCS-007** | measure | Measure | AGT-A7 | Metric results reconciled to KPI targets and spend | CMO signs off the performance read |
| **LCS-008** | learn | Learn | AGT-A7, AGT-A8 | Findings fed back as policy amendments, templates, next-cycle ideas | CMO + Brand Manager decide which lessons become standing rules |

### MarcomAgents (8) — `seed/module.ts`

`AGT-A1..AGT-A8`. `status` is an honesty field: how much of the agent is
demonstrable in THIS build, not how much is designed. `surfaces[].to` holds
router paths that exist in `App.tsx` today — they are NOT entity ids and are
deliberately skipped by `assertAllLinksResolve`.

| ID | Code | Name | Stages | Status | Why that status |
|---|---|---|---|---|---|
| **AGT-A1** | A1 | Brand Governance Agent | govern, comply | `partial` | Policies, guardrails and the brand/compliance check run for real; nothing inspects an image against clear-space or min-size rules |
| **AGT-A2** | A2 | Market Intelligence Agent | understand | `partial` | Competitors, trends, SOV and personas all render; no live ingestion — the data is seeded, not gathered |
| **AGT-A3** | A3 | Product Marketing Planning Agent | plan | `live` | Idea scoring → promotion → brief → budget → KPI attachment runs end-to-end on real records |
| **AGT-A4** | A4 | Content Studio Agent | create | `partial` | Versioning, AI provenance, locale variants and asset rights are real; generation itself is seeded, not modelled |
| **AGT-A5** | A5 | Corporate Communication Agent | create, comply, activate | `live` | Corporate/internal/investor comms, PR, coverage and crisis war rooms all run end-to-end |
| **AGT-A6** | A6 | Campaign Orchestration Agent | plan, activate | `partial` | Calendar, journeys, executions, suppression and consent are real; no channel actually dispatches |
| **AGT-A7** | A7 | Marketing Analytics Agent | measure, learn | `live` | Metric results roll up through KPI targets into dashboards and the board pack, reconciled to budget |
| **AGT-A8** | A8 | MarCom Copilot | all 8 | `live` | Live as of this wave: answers over the seed graph and deep-links to records; bounded by seeded data, takes no action |

### Jurisdictions (6) — `seed/legal.ts`

Our regions are AMER / EMEA / APAC only, so EU, FR, KSA and GCC all map under
`REG-EMEA` and JP under `REG-APAC`; GLOBAL spans all three.

Precedence is narrowest-first (`JURISDICTION_PRECEDENCE` in
`services/ai/simulated.ts`): the national jurisdictions KSA, FR and JP outrank
the blocs GCC and EU, and GLOBAL is always the floor. Every `JurisdictionCode`
must appear in that array — an omitted code sorts ahead of the narrowest real
jurisdiction.

| ID | Code | Name | regionIds |
|---|---|---|---|
| **JUR-KSA** | KSA | Kingdom of Saudi Arabia | REG-EMEA |
| **JUR-GCC** | GCC | Gulf Cooperation Council states | REG-EMEA |
| **JUR-EU** | EU | European Union | REG-EMEA |
| **JUR-FR** | FR | France (Toubon language duty; sits inside the EU baseline) | REG-EMEA |
| **JUR-JP** | JP | Japan (景品表示法 substantiation; MIC telecom guidance) | REG-APAC |
| **JUR-GLOBAL** | GLOBAL | Global default | REG-AMER, REG-EMEA, REG-APAC |

### LegalClauses (20) — `seed/legal.ts`

Versioned and superseded, never edited in place. `LGL-001 → LGL-002` is the
supersession chain (v1 kept on record so H1-2026 material still resolves to the
clause that was in force then). All `effectiveFrom` dates fall in 2026.

| ID | Kind | Jurisdiction | Locale | v | effectiveFrom | Subject |
|---|---|---|---|---|---|---|
| **LGL-001** | disclaimer | JUR-EU | en-GB | 1 | 2026-01-01 | Forward-looking statements (superseded by LGL-002) |
| **LGL-002** | disclaimer | JUR-EU | en-GB | 2 | 2026-07-01 | Forward-looking statements, supersedes LGL-001 |
| **LGL-003** | disclaimer | JUR-KSA | en-SA | 1 | 2026-03-01 | Forward-looking statements; Arabic text prevails |
| **LGL-004** | disclaimer | JUR-KSA | ar-SA | 1 | 2026-03-01 | Forward-looking statements (Arabic) |
| **LGL-005** | disclaimer | JUR-GLOBAL | en-US | 1 | 2026-06-01 | Performance-claim substantiation footnote (smartphone) |
| **LGL-006** | disclaimer | JUR-GCC | ar-SA | 1 | 2026-06-01 | Performance-claim substantiation footnote, Arabic (smartphone) |
| **LGL-007** | disclaimer | JUR-EU | en-GB | 1 | 2026-04-01 | Benchmark substantiation (enterprise-network) |
| **LGL-008** | trademark | JUR-GLOBAL | en-US | 2 | 2026-02-01 | Trademark attribution, ™ on first prominent mention |
| **LGL-009** | trademark | JUR-GCC | ar-SA | 1 | 2026-02-01 | Trademark attribution (Arabic) |
| **LGL-010** | regulatory | JUR-KSA | ar-SA | 1 | 2026-05-01 | Prize/promotion terms, Ministry of Commerce licence (Arabic) |
| **LGL-011** | regulatory | JUR-KSA | en-SA | 1 | 2026-05-01 | Prize/promotion terms, Ministry of Commerce licence |
| **LGL-012** | regulatory | JUR-KSA | ar-SA | 1 | 2026-06-15 | Telecom regulatory statement, 5G coverage disclaimer (Arabic) |
| **LGL-013** | disclaimer | JUR-FR | fr-FR | 1 | 2026-07-01 | Forward-looking statements (French) |
| **LGL-014** | disclaimer | JUR-JP | ja-JP | 1 | 2026-07-01 | Forward-looking statements (Japanese) |
| **LGL-015** | disclaimer | JUR-FR | fr-FR | 1 | 2026-06-01 | Performance-claim substantiation footnote, French (smartphone) |
| **LGL-016** | disclaimer | JUR-JP | ja-JP | 1 | 2026-06-01 | Performance-claim substantiation footnote, Japanese incl. 景品表示法 (smartphone) |
| **LGL-017** | trademark | JUR-FR | fr-FR | 1 | 2026-02-01 | Trademark attribution (French) |
| **LGL-018** | trademark | JUR-JP | ja-JP | 1 | 2026-02-01 | Trademark attribution (Japanese) |
| **LGL-019** | regulatory | JUR-FR | fr-FR | 1 | 2026-05-01 | Prize/promotion terms + Toubon language duty (French) |
| **LGL-020** | regulatory | JUR-JP | ja-JP | 1 | 2026-06-15 | Telecom regulatory statement, 5G best-effort disclaimer (Japanese) |

### GlossaryTerms (18) — `seed/legal.ts`

`GLS-001..GLS-018`, each with `approved` + `avoid`. Non-Latin entries carry a
Latin `transliteration` so English-reading reviewers can discuss them.

- **GLS-001..GLS-006** en-US/en-GB: Volt 5G, Aureon Group, pre-order, zero
  trust, trade-in, battery life.
- **GLS-007..GLS-010** ar-SA: أوريون (Aureon), فولت (Volt 5G),
  الطلب المسبق (al-talab al-musbaq), الضمان (al-daman al-mahdud).
- **GLS-011..GLS-014** fr-FR: précommande, Volt 5G, autonomie, garantie. Latin
  script, so no transliteration; the `avoid` lists carry the anglicisms French
  reviewers most often strike.
- **GLS-015..GLS-018** ja-JP: アウリオン (Aureon), ボルト5G (Volt 5G),
  予約注文 (yoyaku chumon), 保証 (hosho).

### Brand additions — `seed/org.ts`

- `clearSpaceRule` + `minSizeRule` on all four brands (BRD-001..BRD-004).
- `cmyk` + `pantone` added to every `colorPalette` entry (14 swatches total).
- **`BRD-002` Solara gains `parentBrandId: 'BRD-001'`** — the one sub-brand
  relationship in the seed, demonstrating inheritance from the Aureon
  masterbrand. Volt and GridWorks stay deliberately standalone.

### Localized ContentVersions — `seed/content.ts`

The same two source pieces are localized into all three non-English locales, so
every localization path has a worked example rather than only the RTL one.

| ID | Content | Version | Locale | Region | aiGenerated |
|---|---|---|---|---|---|
| **CV-018** | CNT-004 (Volt5 global launch press release) | V2-ar | ar-SA | REG-EMEA | true |
| **CV-019** | CNT-001 (Volt4 clearance email) | V1.1-ar | ar-SA | REG-EMEA | true |
| **CV-091** | CNT-004 (Volt5 global launch press release) | V2-fr | fr-FR | REG-EMEA | true |
| **CV-092** | CNT-001 (Volt4 clearance email) | V1.1-fr | fr-FR | REG-EMEA | true |
| **CV-093** | CNT-004 (Volt5 global launch press release) | V2-ja | ja-JP | REG-APAC | true |
| **CV-094** | CNT-001 (Volt4 clearance email) | V1.1-ja | ja-JP | REG-APAC | true |

All six carry genuine body copy in their own script — Arabic right-to-left,
Japanese in CJK, French with French orthography — never a Latin placeholder
wearing a locale tag. `src/test/i18n.test.tsx` asserts exactly that.

### Type/vocabulary changes — `types.ts`

- New entities: `LifecycleStage` (+ `LifecycleStageKey`), `MarcomAgent`
  (+ `MarcomAgentCode`, `MarcomAgentStatus`), `Jurisdiction`
  (+ `JurisdictionCode`), `LegalClause` (+ `LegalClauseKind`), `GlossaryTerm`.
- `EntityName` += LifecycleStage / MarcomAgent / Jurisdiction / LegalClause / GlossaryTerm.
- `Brand` += `clearSpaceRule?`, `minSizeRule?`, `parentBrandId?`;
  `colorPalette` entries += `cmyk?`, `pantone?`.
- `SeedDB` += `lifecycleStages`, `marcomAgents`, `jurisdictions`,
  `legalClauses`, `glossaryTerms`.
- `assertAllLinksResolve` now validates `brand.parentBrandId` (including
  self-reference), `stage.owningAgentIds`, `agent.stageKeys` (against
  LifecycleStage keys), `jurisdiction.regionIds`, `clause.jurisdictionId` and
  `clause.supersedesId`. Agent `surfaces[].to` values are router paths, not
  entity ids, and are deliberately skipped.
- `useLiveDB` mutable collections += `legalClauses`, `glossaryTerms` (both are
  authored at runtime). `lifecycleStages`, `marcomAgents` and `jurisdictions`
  are read-only reference data and stay on the frozen seed.

## Spec alignment wave C

Planning, benchmark and playbook reference data. Everything added here is
read-only reference data or planning artifacts — **no new live collections**, so
`useLiveDB` is unchanged and the new collections flow through it via the
`...getSeedDB()` spread.

### ID scheme additions

| Prefix | Entity | Prefix | Entity |
|---|---|---|---|
| PFW- | PositioningFramework | CCS- | ChannelConstraint |
| MSH- | MessagingHouse | BMK- | Benchmark |
| MSZ- | MarketSizing | PBP- | PlaybookPattern |
| BSC- | BudgetScenario | | |

### PositioningFrameworks (4) — `seed/planning.ts`

Reference data; each carries the real field list a strategist fills in.

| ID | key | Fields |
|---|---|---|
| **PFW-001** | positioning-statement | 7 (target customer → reason to believe) |
| **PFW-002** | value-proposition-canvas | 7 (jobs / pains / gains ↔ relievers / creators) |
| **PFW-003** | messaging-house | 6 (roof → pillars → proof → objections → gaps) |
| **PFW-004** | jobs-to-be-done | 6 (job statement → competing hires) |

### MessagingHouses (2) — `seed/planning.ts`

One per strategy. Each has a roof message, 4 pillars with proof points, and 4
objections with approved responses.

| ID | Strategy | Roof message |
|---|---|---|
| **MSH-001** | STR-001 (FY26 Consumer Momentum) | Staying in the ecosystem pays you back every season |
| **MSH-002** | STR-002 (FY26 Enterprise Trust & Pipeline) | The zero-trust partner security leaders recommend to each other |

### MarketSizings (3) — `seed/planning.ts`

One per business unit, each with methodology, 5 assumptions, source and confidence.

| ID | BU | TAM | SAM | SOM | Confidence |
|---|---|---|---|---|---|
| **MSZ-001** | BU-001 Consumer Devices | $412B | $68.4B | $3.1B | 0.74 |
| **MSZ-002** | BU-002 Enterprise Solutions | $94B | $21.5B | $640M | 0.68 |
| **MSZ-003** | BU-003 Corporate Affairs | $12.8B | $2.9B | $145M | 0.52 |

MSZ-003 is an **influence-value proxy, not bookable revenue** — it must never be
summed with MSZ-001/MSZ-002.

### BudgetScenarios (9) — `seed/planning.ts`

Three kinds each for the three measured campaigns. The `base` spend equals the
campaign's `budgetAllocation` in every case.

| ID | Campaign | Kind | Spend | Conversions | ROI |
|---|---|---|---|---|---|
| **BSC-001** | CMP-002 | conservative | 160,000 | 9,800 | 3.9x |
| **BSC-002** | CMP-002 | base | 220,000 | 14,200 | 3.6x |
| **BSC-003** | CMP-002 | aggressive | 310,000 | 18,600 | 2.9x |
| **BSC-004** | CMP-003 | conservative | 330,000 | 21,500 | 4.4x |
| **BSC-005** | CMP-003 | base | 450,000 | 32,000 | 4.1x |
| **BSC-006** | CMP-003 | aggressive | 640,000 | 41,000 | 3.3x |
| **BSC-007** | CMP-004 | conservative | 105,000 | 640 | 5.2x |
| **BSC-008** | CMP-004 | base | 150,000 | 950 | 4.8x |
| **BSC-009** | CMP-004 | aggressive | 235,000 | 1,380 | 3.7x |

ROI falls as spend rises in every triplet — the diminishing-return shape is
deliberate and each scenario names the assumption that breaks first.

### ChannelConstraints (6) — `seed/communications.ts`

One per channel. `maxChars` omitted = no platform-enforced body cap.

| ID | Channel | maxChars | subjectMaxChars | requiresAltText |
|---|---|---|---|---|
| **CCS-001** | CHN-001 email | — | 60 | yes |
| **CCS-002** | CHN-002 social | 280 | — | yes |
| **CCS-003** | CHN-003 web | — | 60 (SEO title) | yes |
| **CCS-004** | CHN-004 press | — | 90 (wire headline) | yes |
| **CCS-005** | CHN-005 intranet | 1200 | — | yes |
| **CCS-006** | CHN-006 event | 2000 | 70 | no |

**No SMS row.** `SMS` is a live `ChannelKind` (CNS-002, SUP-003 reference it) but
there is no SMS `Channel` in the seed, and constraints key off `channelId`. The
160-character SMS limit lands the moment a `CHN-` SMS channel is seeded.

### Benchmarks (8) — `seed/benchmarks.ts`

| ID | metricKey | Channel kind | Median | Top quartile | Unit |
|---|---|---|---|---|---|
| **BMK-001** | impressions | social | 41,000 | 78,000 | per $1k spend |
| **BMK-002** | impressions | ads | 28,500 | 52,000 | per $1k spend |
| **BMK-003** | email_open_rate | email | 23.4 | 34.1 | % |
| **BMK-004** | email_open_rate | intranet | 58.0 | 76.5 | % |
| **BMK-005** | email_click_rate | email | 2.9 | 5.4 | % |
| **BMK-006** | email_click_rate | social | 1.1 | 2.6 | % |
| **BMK-007** | conversion_rate | web | 2.3 | 4.8 | % |
| **BMK-008** | conversion_rate | event | 38.0 | 55.0 | % of registrations attending |

`email_click_rate` and `conversion_rate` have no MetricResult rows yet — the
benchmark is the target the measurement layer grows into, not a join that must
already resolve. `impressions` and `email_open_rate` do join to live metrics.

### PlaybookPatterns (4) — `seed/benchmarks.ts`

| ID | Pattern | Evidence | Lift |
|---|---|---|---|
| **PBP-001** | Trigger the upgrade offer on device age, not the calendar | CMP-002, CMP-003 | +34% |
| **PBP-002** | Let the practitioner present, put the SE on follow-up | CMP-004 | +27% |
| **PBP-003** | Answer the comparative ad with a published second number | CMP-003, CMP-002 | +19% |
| **PBP-004** | Cascade internal programmes through managers first | CMP-005 | +22% |

### CustomerPersona additions — `seed/audience.ts`

| ID | cohortSize | consentedPct | dataReadiness | confidence | v | lastRefreshedAt | journeyStages |
|---|---|---|---|---|---|---|---|
| **PER-001** Uma | 45,000 | 78 | 86 | 0.82 | 3 | 2026-08-10 | awareness, consideration, decision |
| **PER-002** Sanjay | 4,200 | 66 | 71 | 0.74 | 2 | 2026-07-30 | awareness, consideration, decision, retention |
| **PER-003** Elena | 28,000 | 91 | 79 | 0.68 | 2 | 2026-08-01 | consideration, decision, retention |
| **PER-004** Chris | 8,200 | 97 | 64 | 0.71 | 1 | 2026-08-03 | awareness, consideration, retention |

`consentedPct` is consistent with the matching ConsentSummary (PER-001↔CNS-001
78%, PER-003↔CNS-003 91%, PER-004↔CNS-005 97%, PER-002↔CNS-007 66%).
**PER-003 carries the one `driftSignal`** — weekend-only opening has broken down
and saved content has shifted from recipes to energy-cost posts, so the
"weekend home routines" framing in the definition is aging out.

### MarketTrend + Competitor additions — `seed/market.ts`

| ID | sourceLabel | confidence |
|---|---|---|
| **TRD-001** | Ipsos syndicated handset upgrade tracker, Aug 2026 | 0.81 |
| **TRD-002** | Gartner Enterprise Security Spend Index, Q3 2026 | 0.76 |
| **TRD-003** | Brand & reputation tracker (Edelman panel), Aug 2026 | 0.63 |

`alertTriggers` added to all three competitors: CPT-001 (4), CPT-002 (4),
CPT-003 (5).

### Type/vocabulary changes — `types.ts`

- New entities: `PositioningFramework` (+ `PositioningFrameworkKey`),
  `MessagingHouse`, `MarketSizing`, `BudgetScenario` (+ `BudgetScenarioKind`),
  `ChannelConstraint`, `Benchmark`, `PlaybookPattern`.
- `EntityName` += all seven; `SeedDB` += `positioningFrameworks`,
  `messagingHouses`, `marketSizings`, `budgetScenarios`, `channelConstraints`,
  `benchmarks`, `playbookPatterns`.
- `CustomerPersona` += `cohortSize`, `consentedPct`, `dataReadiness`,
  `confidence`, `version`, `lastRefreshedAt`, `driftSignal?`, `journeyStages`
  (all **required** except `driftSignal` — every persona fills them).
- `Competitor` += `alertTriggers?`.
- `MarketTrend` += `sourceLabel?`, `confidence?` — **optional on the type,
  filled on every seeded row.** Read sites should still guard for `undefined`.
- `assertAllLinksResolve` now validates `messagingHouse.strategyId`,
  `marketSizing.businessUnitId`, `budgetScenario.campaignId`,
  `channelConstraint.channelId` and `playbookPattern.evidenceCampaignIds`.

## Data expansion (2026-08-14)

Scale-out of the graph from the wave-A/C baseline to a demo-sized dataset:
**52 collections, 1,332 rows.** Additive only — no pre-existing id, name,
status or foreign key was changed, so every earlier section of this manifest
still describes its rows accurately. Ids continue the existing prefixes and
extend contiguously from the previous high-water mark.

### Totals and id ranges per entity

| Entity | Total | Id range | Added in this expansion |
|---|---|---|---|
| Organization | 1 | ORG-001 | — |
| BusinessUnit | 3 | BU-001..BU-003 | — |
| Brand | 4 | BRD-001..BRD-004 | — |
| Region | 3 | REG-AMER, REG-EMEA, REG-APAC | — |
| Stakeholder | 11 | STK-001..STK-011 | — |
| Agency | 2 | AGY-001..AGY-002 | — |
| Idea | 20 | IDE-001..IDE-020 | IDE-007..IDE-020 (14) |
| Strategy | 5 | STR-001..STR-005 | STR-003..STR-005 (3) |
| Campaign | 20 | CMP-001..CMP-020 | CMP-007..CMP-020 (14) |
| CampaignActivity | 60 | ACT-001..ACT-060 | ACT-015..ACT-060 (46) |
| Brief | 20 | BRF-001..BRF-020 | BRF-007..BRF-020 (14) |
| Communication | 52 | COM-001..COM-010, COM-019..COM-060 | COM-021..COM-060 (40) |
| ChannelExecution | 90 | CHX-001..CHX-090 | CHX-014..CHX-090 (77) |
| Channel | 6 | CHN-001..CHN-006 | — |
| Content | 45 | CNT-001..CNT-045 | CNT-012..CNT-045 (34) |
| ContentVersion | 94 | CV-001..CV-094 | CV-020..CV-090 (71), CV-091..CV-094 localizations (4) |
| Asset | 30 | AST-001..AST-030 | AST-009..AST-030 (22) |
| Audience | 12 | AUD-001..AUD-012 | AUD-007..AUD-012 (6) |
| Segment | 20 | SEG-001..SEG-020 | SEG-010..SEG-020 (11) |
| Workflow | 4 | WF-001..WF-004 | — |
| WorkflowStage | 12 | WFS-001..WFS-010, WFS-014..WFS-015 | — |
| Approval | 48 | APR-001..APR-012, APR-015..APR-050 | APR-016..APR-050 (35) |
| Policy | 10 | POL-001..POL-010 | POL-006..POL-010 (5) |
| Notification | 36 | NTF-001..NTF-008, NTF-013..NTF-040 | NTF-015..NTF-040 (26) |
| Budget | 3 | BUD-001..BUD-003 | — |
| KPI | 30 | KPI-001..KPI-030 | KPI-009..KPI-030 (22) |
| MetricResult | 400 | MR-001..MR-400 | MR-081..MR-400 (320) |
| AuditRecord | 50 | ADT-001..ADT-050 | ADT-015..ADT-050 (36) |
| Journey | 8 | JRN-001..JRN-008 | JRN-004..JRN-008 (5) |
| Event | 12 | EVT-001..EVT-012 | EVT-005..EVT-012 (8) |
| CrisisIncident | 2 | CRI-001..CRI-002 | — |
| MediaContact | 20 | MCT-001..MCT-020 | MCT-009..MCT-020 (12) |
| CoverageItem | 40 | COV-001..COV-040 | COV-011..COV-040 (30) |
| SuppressionEntry | 8 | SUP-001..SUP-008 | — |
| ConsentSummary | 19 | CNS-001..CNS-019 | CNS-009..CNS-019 (11) |
| CustomerPersona | 10 | PER-001..PER-010 | PER-005..PER-010 (6) |
| Competitor | 8 | CPT-001..CPT-008 | CPT-004..CPT-008 (5) |
| MarketTrend | 10 | TRD-001..TRD-010 | TRD-004..TRD-010 (7) |
| ShareOfVoice | 30 | SOV-001..SOV-030 | SOV-009..SOV-030 (22) |
| AIReview | 0 | (runtime-only) | — |
| LifecycleStage | 8 | LCS-001..LCS-008 | — |
| MarcomAgent | 8 | AGT-A1..AGT-A8 | — |
| Jurisdiction | 4 | JUR-KSA, JUR-GCC, JUR-EU, JUR-GLOBAL | — |
| LegalClause | 12 | LGL-001..LGL-012 | — |
| GlossaryTerm | 10 | GLS-001..GLS-010 | — |
| PositioningFramework | 4 | PFW-001..PFW-004 | — |
| MessagingHouse | 2 | MSH-001..MSH-002 | — |
| MarketSizing | 3 | MSZ-001..MSZ-003 | — |
| BudgetScenario | 9 | BSC-001..BSC-009 | — |
| ChannelConstraint | 6 | CCS-001..CCS-006 | — |
| Benchmark | 8 | BMK-001..BMK-008 | — |
| PlaybookPattern | 4 | PBP-001..PBP-004 | — |

**Reserved-but-unused id space** (deliberate gaps carried over from earlier
waves, referenced by nothing): COM-011..COM-018, WFS-011..WFS-013,
APR-013..APR-014, NTF-009..NTF-012.

### What the expansion adds, in shape

- **Campaigns CMP-007..CMP-020** span all three BUs and all four brands, and
  cover every `CampaignStatus` the pipeline board renders. CMP-016 and CMP-017
  are Draft with no activities (spend 0) on purpose — the empty-plan case.
- **MetricResults** stay on the fixed 10-week grid
  (`2026-06-08`…`2026-08-10`) and exist only for Live/Paused/Completed
  campaigns: CMP-002, CMP-003, CMP-004 and CMP-007..CMP-013, CMP-019.
  Blocks of 10 map position N → week N, so every campaign-week is complete.
- **ShareOfVoice** now carries quarterly rows (2026-Q1..Q3) *and* a monthly
  series (2026-04..2026-08); the 2026-08 wave is intentionally partial.
- **Communications/ChannelExecutions/Contents/ContentVersions** grow together —
  every new communication has at least one execution and a current version.

### Invariants enforced across the expanded set

Verified by a full-graph pass over the frozen `SeedDB` (and now asserted in
`src/test/data-integrity.test.ts`):

1. `assertAllLinksResolve(db)` returns **zero** dangling references, and a
   reflective scan of every `PREFIX-NNN`-shaped string in the graph finds no
   unresolvable id beyond it.
2. Per-campaign activity spend ≤ `Campaign.budgetAllocation` (worst case 96.2%,
   CMP-012 / CMP-014).
3. Per-budget allocations ≤ `Budget.amountPlanned` for BUD-001..BUD-003.
4. `conversions ≤ clicks ≤ opens ≤ impressions` per campaign-week, where a
   stage constrains the one below it only when both were measured (paid-only
   campaigns have impressions and clicks but no email opens).
5. Per-period ShareOfVoice sums ≤ 100 (Q1 46, Q2 53, Q3 61, 04 48, 05 51,
   06 54, 07 60, 08 39) — the remainder is untracked competitors.
6. `createdAt ≤ updatedAt` on every row; every id unique across all collections.
7. `Campaign.startDate < endDate`, `CampaignActivity.startDate ≤ endDate`, and
   every campaign/activity window plus every metric period falls inside 2026.
   **Exempt by design:** `createdAt`/`updatedAt` may predate 2026 (the org and
   its FY26 plans were created Nov–Dec 2025) and `Asset.rightsExpiry` may run
   into 2027 — those are history and rights windows, not the planning year.

### `assertAllLinksResolve` coverage additions

Every foreign-key field declared in `types.ts` is now walked. Newly covered:
`Brand.guardrailPolicyIds` → Policy, `Stakeholder.agencyId` → Agency,
`ContentVersion.regionId` → Region, `ContentVersion.provenance`
(`derivedFromVersionId` → ContentVersion incl. self-reference guard,
`personaId` → CustomerPersona, `channelId` → Channel) and `AIReview.context`
(`jurisdictionIds`, `regionIds`, `requiredClauseIds`). The last two are
runtime-populated shapes — checked so a live DB stays verifiable, not because
the seed fills them.
