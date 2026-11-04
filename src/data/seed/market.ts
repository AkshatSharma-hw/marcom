/**
 * Seed data — Competitors, MarketTrends, ShareOfVoice (Wave 2+3 market intelligence).
 * Ids and cross-references are binding per SEED_MANIFEST.md ("Wave 2+3 additions").
 */

import type { Competitor, MarketTrend, ShareOfVoice } from '../types';

/* ------------------------------------------------------------------ */
/* Competitors (8) — CPT-001..CPT-008                                  */
/* ------------------------------------------------------------------ */

export const seedCompetitors: Competitor[] = [
  {
    id: 'CPT-001',
    name: 'Northvolt Dynamics',
    focusBrandIds: ['BRD-003'],
    summary:
      'Aggressive challenger in the 5G handset space; competes head-on with Volt on charging speed and price-performance messaging.',
    moves: [
      {
        date: '2026-06-18',
        moveType: 'launch',
        title: 'ND-9 flagship with 90W charging',
        note: 'Launched two weeks ahead of rumor cycle; heavy creator seeding.',
      },
      {
        date: '2026-07-09',
        moveType: 'pricing',
        title: 'ND-8 cut by 15% across EMEA retail',
        note: 'Direct response to Volt4 clearance pricing.',
      },
      {
        date: '2026-08-05',
        moveType: 'campaign',
        title: '"Charge past the hype" comparative ad flight',
        note: 'Names Volt 5G charging claims directly; legal is monitoring.',
      },
    ],
    alertTriggers: [
      'Any comparative advertising naming Volt charging or battery claims',
      'ND-9 price move greater than 10% in any EMEA or APAC retail market',
      'Creator seeding wave detected more than 14 days ahead of a rumored launch',
      'Trade-in or upgrade programme announced against the Volt installed base',
    ],
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-08-10T09:00:00Z',
  },
  {
    id: 'CPT-002',
    name: 'Solstice Energy',
    focusBrandIds: ['BRD-002', 'BRD-001'],
    summary:
      'Consumer smart-home ecosystem player courting the same lifestyle audience as Solara, with a strong sustainability narrative at the corporate level.',
    moves: [
      {
        date: '2026-06-25',
        moveType: 'partnership',
        title: 'Bundling deal with two EU utility providers',
      },
      {
        date: '2026-07-21',
        moveType: 'campaign',
        title: 'Autumn "Slow Living" lifestyle campaign teaser',
        note: 'Overlaps directly with Solara Smart Autumn window.',
      },
    ],
    alertTriggers: [
      'New utility or retail bundling partnership announced in EU or UK',
      'Lifestyle campaign flight overlapping the Solara autumn or holiday window',
      'Sustainability claim published without third-party verification we can contrast',
      'Smart-home ecosystem opened to a platform we do not support',
    ],
    createdAt: '2026-06-01T09:05:00Z',
    updatedAt: '2026-08-08T10:30:00Z',
  },
  {
    id: 'CPT-003',
    name: 'HelioGrid',
    focusBrandIds: ['BRD-004'],
    summary:
      'Enterprise infrastructure vendor pushing hard into zero-trust and edge security — GridWorks’ closest competitor in NA deal reviews.',
    moves: [
      {
        date: '2026-06-10',
        moveType: 'launch',
        title: 'HelioGrid Edge Vault GA',
        note: 'Zero-trust edge appliance aimed at the same CISO buyer.',
      },
      {
        date: '2026-07-15',
        moveType: 'partnership',
        title: 'Global reseller agreement with a tier-1 SI',
      },
      {
        date: '2026-07-30',
        moveType: 'campaign',
        title: 'CISO webinar series "Trust Nothing"',
        note: 'Mirrors the GridWorks zero-trust webinar format.',
      },
      {
        date: '2026-08-08',
        moveType: 'pricing',
        title: 'Usage-based pricing tier for mid-market',
      },
    ],
    alertTriggers: [
      'Named in a GridWorks deal review as the incumbent or the runner-up',
      'New reseller or systems-integrator agreement in AMER or EMEA',
      'CISO webinar or roundtable scheduled within 10 days of one of ours',
      'Pricing model change affecting the 1,000–10,000 employee band',
      'Analyst report placement that moves them into a leader quadrant',
    ],
    createdAt: '2026-06-01T09:10:00Z',
    updatedAt: '2026-08-11T14:00:00Z',
  },
  {
    id: 'CPT-004',
    name: 'Kestrel Mobile',
    focusBrandIds: ['BRD-003'],
    summary:
      'Value-tier handset brand with the deepest carrier subsidy relationships in APAC. Rarely wins on spec, but consistently undercuts Volt on effective monthly price and owns the trade-in conversation in three of our top five APAC markets.',
    moves: [
      {
        date: '2026-05-14',
        moveType: 'pricing',
        title: 'Zero-upfront carrier plan across four APAC markets',
        note: 'Effective monthly price lands 22% below the Volt5 equivalent tier.',
      },
      {
        date: '2026-06-30',
        moveType: 'launch',
        title: 'Kestrel K7 mid-tier refresh',
        note: 'Same chipset as last generation; the story is battery life, not silicon.',
      },
      {
        date: '2026-07-28',
        moveType: 'partnership',
        title: 'Exclusive retail placement with a top-three APAC electronics chain',
        note: 'Endcap position we bid for and lost; affects Volt5 launch visibility in-store.',
      },
      {
        date: '2026-08-09',
        moveType: 'campaign',
        title: '"Keep your money" trade-in campaign',
        note: 'Explicitly targets Volt 4 owners with a guaranteed trade-in floor.',
      },
    ],
    alertTriggers: [
      'Carrier subsidy or zero-upfront offer launched in any APAC market where Volt5 is on sale',
      'Trade-in programme naming Volt 4 or Volt 5 devices',
      'Exclusive retail placement won in a market where we hold endcap position',
      'Effective monthly price gap to the comparable Volt tier exceeding 20%',
    ],
    createdAt: '2026-06-01T09:15:00Z',
    updatedAt: '2026-08-11T09:30:00Z',
  },
  {
    id: 'CPT-005',
    name: 'Lumen Home',
    focusBrandIds: ['BRD-002'],
    summary:
      'Design-led smart-lighting and ambience brand. Small share, outsized cultural weight — their launches set the aesthetic reference point that reviewers hold Solara against.',
    moves: [
      {
        date: '2026-06-05',
        moveType: 'launch',
        title: 'Lumen Warmth series with adaptive circadian presets',
        note: 'Reviewed as "the one Solara should have made"; picked up by three lifestyle outlets we brief.',
      },
      {
        date: '2026-07-02',
        moveType: 'campaign',
        title: 'Creator-led "Golden Hour, All Hours" seeding wave',
        note: 'Eleven creators in our own Solara target set posted within nine days.',
      },
      {
        date: '2026-08-01',
        moveType: 'partnership',
        title: 'Design-house collaboration announced for autumn',
        note: 'Lands inside the Solara Smart Autumn window.',
      },
    ],
    alertTriggers: [
      'Creator overlap: any creator on the Solara roster posting Lumen paid content',
      'Design or fashion-house collaboration announced within a Solara flight window',
      'Product review that names Solara as the comparison in a lifestyle outlet',
      'Ambience or circadian feature launched ahead of our roadmap disclosure',
    ],
    createdAt: '2026-06-01T09:20:00Z',
    updatedAt: '2026-08-09T11:15:00Z',
  },
  {
    id: 'CPT-006',
    name: 'Aperture Networks',
    focusBrandIds: ['BRD-004'],
    summary:
      'Well-funded challenger selling an all-in-one edge networking and security bundle to mid-market IT. Competes with GridWorks on simplicity and total cost rather than depth, and is winning analyst attention faster than deal share.',
    moves: [
      {
        date: '2026-05-22',
        moveType: 'pricing',
        title: 'Flat per-site pricing replaces per-seat tiers',
        note: 'Removes the seat-count objection GridWorks sales relies on.',
      },
      {
        date: '2026-07-07',
        moveType: 'campaign',
        title: '"One vendor, one bill" mid-market push',
        note: 'Consolidation message aimed squarely at accounts running GridWorks alongside a separate SD-WAN vendor.',
      },
      {
        date: '2026-08-06',
        moveType: 'launch',
        title: 'Managed detection add-on bundled at no extra cost',
        note: 'Undercuts our attached MDR line item entirely.',
      },
    ],
    alertTriggers: [
      'Bundling of a security capability we sell as a paid add-on',
      'Named in a GridWorks mid-market loss review',
      'Analyst placement or wave inclusion in enterprise networking or security',
      'Pricing model change affecting per-site or per-seat comparisons',
      'Funding round or acquisition that extends the bundle into our core',
    ],
    createdAt: '2026-06-01T09:25:00Z',
    updatedAt: '2026-08-12T08:45:00Z',
  },
  {
    id: 'CPT-007',
    name: 'Meridian Industrial Group',
    focusBrandIds: ['BRD-001'],
    summary:
      'Diversified conglomerate competing with Aureon at the corporate-reputation layer — ESG league tables, investor days, graduate recruitment and policy commentary rather than any single product line.',
    moves: [
      {
        date: '2026-04-16',
        moveType: 'campaign',
        title: 'Integrated annual report published with third-party assured ESG data',
        note: 'Sets the assurance bar our own report has not yet met.',
      },
      {
        date: '2026-06-11',
        moveType: 'partnership',
        title: 'Joined a cross-industry circular-materials coalition',
        note: 'Coalition we declined to join in 2025; likely to be raised at our investor day.',
      },
      {
        date: '2026-07-24',
        moveType: 'campaign',
        title: 'CEO op-ed series on supply-chain transparency',
        note: 'Ran in two outlets on our own tier-1 list within a fortnight.',
      },
    ],
    alertTriggers: [
      'ESG rating or index movement that places them above Aureon',
      'Executive op-ed or keynote in an outlet on the Aureon tier-1 list',
      'Coalition, pledge or standard adopted that we have not joined',
      'Graduate or employer-brand ranking change in a market where we recruit',
    ],
    createdAt: '2026-06-01T09:30:00Z',
    updatedAt: '2026-08-07T13:20:00Z',
  },
  {
    id: 'CPT-008',
    name: 'Vantage Cell',
    focusBrandIds: ['BRD-003', 'BRD-001'],
    summary:
      'Battery and power-systems specialist that supplies several handset makers and markets its own cells directly. Currently the loudest technical voice in the overheating conversation, which makes it a reputational as well as a commercial competitor.',
    moves: [
      {
        date: '2026-06-27',
        moveType: 'launch',
        title: 'Third-generation cell chemistry with a published thermal envelope',
        note: 'Publishes independent thermal test data — a transparency posture we do not currently match.',
      },
      {
        date: '2026-08-08',
        moveType: 'campaign',
        title: '"Ask what is in your battery" technical explainer series',
        note: 'Ran two days before the Volt battery coverage broke; being cited by reporters covering CRI-001.',
      },
      {
        date: '2026-08-12',
        moveType: 'partnership',
        title: 'Testing partnership with an independent safety lab',
        note: 'Announced mid-crisis; sharpens the contrast with our own unpublished test position.',
      },
    ],
    alertTriggers: [
      'Any public statement referencing battery thermal safety while CRI-001 remains open',
      'Independent lab or certification partnership announced in the power-systems category',
      'Supply agreement signed with a handset maker in our competitive set',
      'Technical explainer or teardown that names a Volt device',
      'Journalist citing Vantage Cell as a source in Volt battery coverage',
    ],
    createdAt: '2026-06-01T09:35:00Z',
    updatedAt: '2026-08-12T16:40:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* MarketTrends (10) — TRD-001..TRD-010                                */
/* Every series carries a sourceLabel and a 0–1 confidence. Syndicated */
/* panels score high; sentiment and forecast series score lower.       */
/* ------------------------------------------------------------------ */

export const seedMarketTrends: MarketTrend[] = [
  {
    id: 'TRD-001',
    label: '5G handset upgrade intent',
    businessUnitId: 'BU-001',
    unit: '%',
    series: [
      { period: '2026-01', value: 18 },
      { period: '2026-02', value: 19 },
      { period: '2026-03', value: 21 },
      { period: '2026-04', value: 24 },
      { period: '2026-05', value: 26 },
      { period: '2026-06', value: 29 },
      { period: '2026-07', value: 33 },
      { period: '2026-08', value: 36 },
    ],
    insight:
      'Upgrade intent has doubled since January and is accelerating into the Volt5 launch window — pre-order messaging should stay top-of-funnel through September.',
    sourceLabel: 'Ipsos syndicated handset upgrade tracker, monthly wave, Aug 2026 (n≈12,000)',
    confidence: 0.81,
    createdAt: '2026-06-15T09:00:00Z',
    updatedAt: '2026-08-10T06:00:00Z',
  },
  {
    id: 'TRD-002',
    label: 'Zero-trust security budget index',
    businessUnitId: 'BU-002',
    unit: 'index',
    series: [
      { period: '2024-Q4', value: 100 },
      { period: '2025-Q1', value: 104 },
      { period: '2025-Q2', value: 109 },
      { period: '2025-Q3', value: 112 },
      { period: '2025-Q4', value: 118 },
      { period: '2026-Q1', value: 127 },
      { period: '2026-Q2', value: 134 },
      { period: '2026-Q3', value: 139 },
    ],
    insight:
      'Enterprise zero-trust budgets are up nearly 40% on the 2024 baseline, validating the GridWorks webinar-led pipeline strategy.',
    sourceLabel: 'Gartner Enterprise Security Spend Index, Q3 2026 (2024-Q4 = 100)',
    confidence: 0.76,
    createdAt: '2026-06-15T09:05:00Z',
    updatedAt: '2026-08-05T06:00:00Z',
  },
  {
    id: 'TRD-003',
    label: 'Corporate trust & ESG sentiment',
    businessUnitId: 'BU-003',
    unit: '%',
    series: [
      { period: '2026-01', value: 61 },
      { period: '2026-02', value: 62 },
      { period: '2026-03', value: 64 },
      { period: '2026-04', value: 63 },
      { period: '2026-05', value: 66 },
      { period: '2026-06', value: 68 },
      { period: '2026-07', value: 67 },
      { period: '2026-08', value: 64 },
    ],
    insight:
      'Corporate trust dipped in August on Volt battery coverage — sustained investor and corporate comms cadence is needed to hold the H1 gains.',
    sourceLabel: 'Brand & reputation tracker (Edelman panel), monthly wave, Aug 2026 (n≈4,500)',
    confidence: 0.63,
    createdAt: '2026-06-15T09:10:00Z',
    updatedAt: '2026-08-12T06:00:00Z',
  },
  {
    id: 'TRD-004',
    label: 'Smart-home category retail sell-through',
    businessUnitId: 'BU-001',
    unit: 'index',
    series: [
      { period: '2026-01', value: 100 },
      { period: '2026-02', value: 97 },
      { period: '2026-03', value: 103 },
      { period: '2026-04', value: 106 },
      { period: '2026-05', value: 104 },
      { period: '2026-06', value: 108 },
      { period: '2026-07', value: 112 },
      { period: '2026-08', value: 117 },
    ],
    insight:
      'Sell-through is running 17% above the January baseline with the seasonal step-up starting a month earlier than in 2025 — the Solara autumn flight should pull forward rather than hold for September.',
    sourceLabel: 'GfK retail panel, EU5 + UK smart-home category, weekly sell-through indexed to 2026-01',
    confidence: 0.84,
    createdAt: '2026-06-20T09:00:00Z',
    updatedAt: '2026-08-11T06:00:00Z',
  },
  {
    id: 'TRD-005',
    label: 'Average handset replacement cycle',
    businessUnitId: 'BU-001',
    unit: 'months',
    series: [
      { period: '2026-Q1', value: 39.4 },
      { period: '2026-Q2', value: 38.6 },
      { period: '2026-Q3', value: 37.1 },
    ],
    insight:
      'The replacement cycle is shortening for the first time in three years, which widens the addressable pool for Volt5 trade-in messaging but also exposes the Volt 4 base to competitor trade-in offers.',
    sourceLabel: 'Counterpoint device installed-base model, Q3 2026 update (global weighted average)',
    confidence: 0.71,
    createdAt: '2026-06-20T09:05:00Z',
    updatedAt: '2026-08-06T06:00:00Z',
  },
  {
    id: 'TRD-006',
    label: 'Battery-safety search interest (Volt category)',
    businessUnitId: 'BU-001',
    unit: 'index',
    series: [
      { period: '2026-07-13', value: 4 },
      { period: '2026-07-20', value: 5 },
      { period: '2026-07-27', value: 6 },
      { period: '2026-08-03', value: 11 },
      { period: '2026-08-10', value: 68 },
    ],
    insight:
      'Search interest in battery safety across the handset category jumped sixfold in the week the overheating reports broke; treat every organic and paid placement against these terms as crisis-adjacent until the curve settles.',
    sourceLabel: 'Search interest index, EU5 + US, weekly, peak week = 100 (queried 2026-08-13)',
    confidence: 0.58,
    createdAt: '2026-08-12T07:00:00Z',
    updatedAt: '2026-08-13T07:00:00Z',
  },
  {
    id: 'TRD-007',
    label: 'Mid-market security bundle consolidation intent',
    businessUnitId: 'BU-002',
    unit: '%',
    series: [
      { period: '2026-Q1', value: 31 },
      { period: '2026-Q2', value: 37 },
      { period: '2026-Q3', value: 44 },
    ],
    insight:
      'Nearly half of mid-market IT buyers now say they intend to consolidate onto a single security vendor within 12 months — the exact wedge Aperture Networks is pushing, and the reason the GridWorks bundle story needs to lead.',
    sourceLabel: 'IDC mid-market IT buyer survey, Q3 2026 wave (n≈1,100, 250–2,500 employees)',
    confidence: 0.69,
    createdAt: '2026-06-20T09:10:00Z',
    updatedAt: '2026-08-04T06:00:00Z',
  },
  {
    id: 'TRD-008',
    label: 'Enterprise webinar attendance rate',
    businessUnitId: 'BU-002',
    unit: '%',
    series: [
      { period: '2026-01', value: 44 },
      { period: '2026-02', value: 43 },
      { period: '2026-03', value: 41 },
      { period: '2026-04', value: 40 },
      { period: '2026-05', value: 38 },
      { period: '2026-06', value: 37 },
      { period: '2026-07', value: 36 },
      { period: '2026-08', value: 34 },
    ],
    insight:
      'Registration-to-attendance has slid ten points across the category this year. The GridWorks series is holding above benchmark, but the pipeline model should assume continued decay rather than a flat rate.',
    sourceLabel: 'ON24 / Demand Gen category benchmark, B2B technology webinars, Aug 2026',
    confidence: 0.66,
    createdAt: '2026-06-20T09:15:00Z',
    updatedAt: '2026-08-09T06:00:00Z',
  },
  {
    id: 'TRD-009',
    label: 'ESG disclosure assurance adoption',
    businessUnitId: 'BU-003',
    unit: '%',
    series: [
      { period: '2026-Q1', value: 46 },
      { period: '2026-Q2', value: 53 },
      { period: '2026-Q3', value: 61 },
    ],
    insight:
      'Third-party assurance of sustainability disclosures has become the majority practice among peer-set issuers. Publishing unassured figures is now the exception, and POL-007 substantiation should be treated as a floor rather than a ceiling.',
    sourceLabel: 'Peer-set disclosure review, 40 listed industrials & technology issuers, Q3 2026',
    confidence: 0.74,
    createdAt: '2026-06-20T09:20:00Z',
    updatedAt: '2026-08-03T06:00:00Z',
  },
  {
    id: 'TRD-010',
    label: 'Employee advocacy participation',
    businessUnitId: 'BU-003',
    unit: '%',
    series: [
      { period: '2026-01', value: 12 },
      { period: '2026-02', value: 13 },
      { period: '2026-03', value: 15 },
      { period: '2026-04', value: 14 },
      { period: '2026-05', value: 17 },
      { period: '2026-06', value: 19 },
      { period: '2026-07', value: 18 },
      { period: '2026-08', value: 21 },
    ],
    insight:
      'One in five employees now shares at least one corporate post per month, up from one in eight in January — enough scale for Sustainability Week to lean on advocacy as a primary channel rather than a garnish.',
    sourceLabel: 'Internal advocacy platform export, monthly active sharers / eligible headcount, Aug 2026',
    confidence: 0.88,
    createdAt: '2026-06-20T09:25:00Z',
    updatedAt: '2026-08-12T06:00:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* ShareOfVoice (30) — SOV-001..SOV-030                                */
/*                                                                     */
/* Quarterly rows for 2026-Q1..Q3 plus a monthly series for            */
/* 2026-04..2026-08. Per-period pcts always sum <= 100; the remainder  */
/* is implicit untracked competitors. Period totals:                   */
/*   2026-Q1 46 | 2026-Q2 53 | 2026-Q3 61                              */
/*   2026-04 48 | 2026-05 51 | 2026-06 54 | 2026-07 60 | 2026-08 39    */
/* The 2026-08 wave is deliberately partial — only Volt and GridWorks  */
/* had reported by the 2026-08-13 snapshot.                            */
/* ------------------------------------------------------------------ */

export const seedShareOfVoice: ShareOfVoice[] = [
  {
    id: 'SOV-001',
    brandId: 'BRD-001',
    period: '2026-Q2',
    pct: 9,
    createdAt: '2026-07-05T09:00:00Z',
    updatedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: 'SOV-002',
    brandId: 'BRD-002',
    period: '2026-Q2',
    pct: 14,
    createdAt: '2026-07-05T09:00:00Z',
    updatedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: 'SOV-003',
    brandId: 'BRD-003',
    period: '2026-Q2',
    pct: 19,
    createdAt: '2026-07-05T09:00:00Z',
    updatedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: 'SOV-004',
    brandId: 'BRD-004',
    period: '2026-Q2',
    pct: 11,
    createdAt: '2026-07-05T09:00:00Z',
    updatedAt: '2026-07-05T09:00:00Z',
  },
  {
    id: 'SOV-005',
    brandId: 'BRD-001',
    period: '2026-Q3',
    pct: 10,
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-08-10T09:00:00Z',
  },
  {
    id: 'SOV-006',
    brandId: 'BRD-002',
    period: '2026-Q3',
    pct: 15,
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-08-10T09:00:00Z',
  },
  {
    id: 'SOV-007',
    brandId: 'BRD-003',
    period: '2026-Q3',
    pct: 24,
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-08-10T09:00:00Z',
  },
  {
    id: 'SOV-008',
    brandId: 'BRD-004',
    period: '2026-Q3',
    pct: 12,
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-08-10T09:00:00Z',
  },

  /* -- 2026-Q1 (sum 46) -------------------------------------------- */
  {
    id: 'SOV-009',
    brandId: 'BRD-001',
    period: '2026-Q1',
    pct: 8,
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-04-06T09:00:00Z',
  },
  {
    id: 'SOV-010',
    brandId: 'BRD-002',
    period: '2026-Q1',
    pct: 12,
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-04-06T09:00:00Z',
  },
  {
    id: 'SOV-011',
    brandId: 'BRD-003',
    period: '2026-Q1',
    pct: 16,
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-04-06T09:00:00Z',
  },
  {
    id: 'SOV-012',
    brandId: 'BRD-004',
    period: '2026-Q1',
    pct: 10,
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-04-06T09:00:00Z',
  },

  /* -- 2026-04 (sum 48) -------------------------------------------- */
  {
    id: 'SOV-013',
    brandId: 'BRD-001',
    period: '2026-04',
    pct: 8,
    createdAt: '2026-05-05T09:00:00Z',
    updatedAt: '2026-05-05T09:00:00Z',
  },
  {
    id: 'SOV-014',
    brandId: 'BRD-002',
    period: '2026-04',
    pct: 13,
    createdAt: '2026-05-05T09:00:00Z',
    updatedAt: '2026-05-05T09:00:00Z',
  },
  {
    id: 'SOV-015',
    brandId: 'BRD-003',
    period: '2026-04',
    pct: 17,
    createdAt: '2026-05-05T09:00:00Z',
    updatedAt: '2026-05-05T09:00:00Z',
  },
  {
    id: 'SOV-016',
    brandId: 'BRD-004',
    period: '2026-04',
    pct: 10,
    createdAt: '2026-05-05T09:00:00Z',
    updatedAt: '2026-05-05T09:00:00Z',
  },

  /* -- 2026-05 (sum 51) -------------------------------------------- */
  {
    id: 'SOV-017',
    brandId: 'BRD-001',
    period: '2026-05',
    pct: 9,
    createdAt: '2026-06-04T09:00:00Z',
    updatedAt: '2026-06-04T09:00:00Z',
  },
  {
    id: 'SOV-018',
    brandId: 'BRD-002',
    period: '2026-05',
    pct: 13,
    createdAt: '2026-06-04T09:00:00Z',
    updatedAt: '2026-06-04T09:00:00Z',
  },
  {
    id: 'SOV-019',
    brandId: 'BRD-003',
    period: '2026-05',
    pct: 18,
    createdAt: '2026-06-04T09:00:00Z',
    updatedAt: '2026-06-04T09:00:00Z',
  },
  {
    id: 'SOV-020',
    brandId: 'BRD-004',
    period: '2026-05',
    pct: 11,
    createdAt: '2026-06-04T09:00:00Z',
    updatedAt: '2026-06-04T09:00:00Z',
  },

  /* -- 2026-06 (sum 54) — Volt5 launch month ----------------------- */
  {
    id: 'SOV-021',
    brandId: 'BRD-001',
    period: '2026-06',
    pct: 9,
    createdAt: '2026-07-06T09:00:00Z',
    updatedAt: '2026-07-06T09:00:00Z',
  },
  {
    id: 'SOV-022',
    brandId: 'BRD-002',
    period: '2026-06',
    pct: 14,
    createdAt: '2026-07-06T09:00:00Z',
    updatedAt: '2026-07-06T09:00:00Z',
  },
  {
    id: 'SOV-023',
    brandId: 'BRD-003',
    period: '2026-06',
    pct: 20,
    createdAt: '2026-07-06T09:00:00Z',
    updatedAt: '2026-07-06T09:00:00Z',
  },
  {
    id: 'SOV-024',
    brandId: 'BRD-004',
    period: '2026-06',
    pct: 11,
    createdAt: '2026-07-06T09:00:00Z',
    updatedAt: '2026-07-06T09:00:00Z',
  },

  /* -- 2026-07 (sum 60) -------------------------------------------- */
  {
    id: 'SOV-025',
    brandId: 'BRD-001',
    period: '2026-07',
    pct: 10,
    createdAt: '2026-08-05T09:00:00Z',
    updatedAt: '2026-08-05T09:00:00Z',
  },
  {
    id: 'SOV-026',
    brandId: 'BRD-002',
    period: '2026-07',
    pct: 15,
    createdAt: '2026-08-05T09:00:00Z',
    updatedAt: '2026-08-05T09:00:00Z',
  },
  {
    id: 'SOV-027',
    brandId: 'BRD-003',
    period: '2026-07',
    pct: 23,
    createdAt: '2026-08-05T09:00:00Z',
    updatedAt: '2026-08-05T09:00:00Z',
  },
  {
    id: 'SOV-028',
    brandId: 'BRD-004',
    period: '2026-07',
    pct: 12,
    createdAt: '2026-08-05T09:00:00Z',
    updatedAt: '2026-08-05T09:00:00Z',
  },

  /* -- 2026-08 (sum 39) — partial wave, Volt & GridWorks only ------ */
  {
    id: 'SOV-029',
    brandId: 'BRD-003',
    period: '2026-08',
    pct: 26,
    createdAt: '2026-08-13T09:00:00Z',
    updatedAt: '2026-08-13T09:00:00Z',
  },
  {
    id: 'SOV-030',
    brandId: 'BRD-004',
    period: '2026-08',
    pct: 13,
    createdAt: '2026-08-13T09:00:00Z',
    updatedAt: '2026-08-13T09:00:00Z',
  },
];
