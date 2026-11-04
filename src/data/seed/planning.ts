/**
 * Seed data — PositioningFrameworks, MessagingHouses, MarketSizings,
 * BudgetScenarios (Spec alignment wave C, planning layer).
 *
 * Ids and cross-references are binding per SEED_MANIFEST.md ("Spec alignment
 * wave C"). PositioningFrameworks are reference data — the prompt lists a
 * strategist fills in — while MessagingHouses hold the actual filled-in
 * narrative for STR-001 / STR-002.
 */

import type {
  BudgetScenario,
  MarketSizing,
  MessagingHouse,
  PositioningFramework,
} from '../types';

/* ------------------------------------------------------------------ */
/* PositioningFrameworks (4) — PFW-001..PFW-004 (reference data)       */
/* ------------------------------------------------------------------ */

export const seedPositioningFrameworks: PositioningFramework[] = [
  {
    id: 'PFW-001',
    key: 'positioning-statement',
    name: 'Positioning statement',
    description:
      'The classic single-paragraph statement: who it is for, what it is, why it beats the alternative, and what makes the claim believable.',
    fields: [
      {
        label: 'Target customer',
        hint: 'The specific person with the problem — not a market, a buyer. "Volt owners 12–24 months into ownership."',
      },
      {
        label: 'Need or opportunity',
        hint: 'The unmet need in their words, not ours. What is going wrong today?',
      },
      {
        label: 'Product / brand name',
        hint: 'The name exactly as the lexicon approves it.',
      },
      {
        label: 'Category',
        hint: 'The frame of reference the customer already understands. Choosing the category is choosing the competition.',
      },
      {
        label: 'Key benefit',
        hint: 'The one benefit worth trading for. If it lists three, none of them lands.',
      },
      {
        label: 'Primary alternative',
        hint: 'What they do instead if we do not exist — often a rival, often nothing at all.',
      },
      {
        label: 'Reason to believe',
        hint: 'The evidence that survives a sceptic: benchmarks, references, guarantees.',
      },
    ],
    createdAt: '2026-01-20T09:00:00Z',
    updatedAt: '2026-06-02T11:00:00Z',
  },
  {
    id: 'PFW-002',
    key: 'value-proposition-canvas',
    name: 'Value proposition canvas',
    description:
      'Fits what we make to what the customer is trying to get done — the customer side and the offer side must mirror each other line for line.',
    fields: [
      {
        label: 'Customer jobs',
        hint: 'Functional, social and emotional jobs the customer is trying to complete.',
      },
      {
        label: 'Pains',
        hint: 'Costs, risks and frustrations in the current way of doing the job. Rank them by severity.',
      },
      {
        label: 'Gains',
        hint: 'Outcomes the customer actively wants — required, expected, desired, unexpected.',
      },
      {
        label: 'Products & services',
        hint: 'What we actually put in front of them. Concrete offers, not capabilities.',
      },
      {
        label: 'Pain relievers',
        hint: 'How each offer removes a specific pain listed above. Unmatched pains are a gap.',
      },
      {
        label: 'Gain creators',
        hint: 'How each offer produces a specific gain listed above.',
      },
      {
        label: 'Fit evidence',
        hint: 'The research, usage data or win/loss note proving the fit is real, not assumed.',
      },
    ],
    createdAt: '2026-01-20T09:05:00Z',
    updatedAt: '2026-06-02T11:05:00Z',
  },
  {
    id: 'PFW-003',
    key: 'messaging-house',
    name: 'Messaging house',
    description:
      'One roof message, three or four load-bearing pillars, each held up by proof — plus the objections the house must survive.',
    fields: [
      {
        label: 'Roof — primary message',
        hint: 'The one sentence we want repeated back to us. Everything below must support it.',
      },
      {
        label: 'Pillars',
        hint: 'Three or four supporting themes. Fewer than three is a slogan; more than four is a list nobody remembers.',
      },
      {
        label: 'Proof points',
        hint: 'Per pillar: the number, benchmark, reference or demo that makes it defensible.',
      },
      {
        label: 'Objections & responses',
        hint: 'What a sceptical buyer, journalist or regulator says back — and the approved answer.',
      },
      {
        label: 'Foundation — evidence base',
        hint: 'Substantiation sources legal can point at when a claim is challenged.',
      },
      {
        label: 'Proof gaps',
        hint: 'Pillars still standing on assertion. Naming the gap is how it gets funded.',
      },
    ],
    createdAt: '2026-01-20T09:10:00Z',
    updatedAt: '2026-07-14T10:30:00Z',
  },
  {
    id: 'PFW-004',
    key: 'jobs-to-be-done',
    name: 'Jobs to be done',
    description:
      'Frames the purchase as a hire: what job did the customer hire this product to do, and what were they firing?',
    fields: [
      {
        label: 'Job statement',
        hint: 'Format: "When [situation], I want to [motivation], so I can [expected outcome]."',
      },
      {
        label: 'Triggering situation',
        hint: 'The moment the job becomes urgent — a broken screen, a failed audit, a renewal date.',
      },
      {
        label: 'Current solution being fired',
        hint: 'What they use today and why it is losing the job.',
      },
      {
        label: 'Forces of progress',
        hint: 'Push of the situation and pull of the new solution, against habit and anxiety.',
      },
      {
        label: 'Success criteria',
        hint: 'How the customer will judge whether the job got done. These become our metrics.',
      },
      {
        label: 'Competing hires',
        hint: 'Everything else that could do the job, including doing nothing.',
      },
    ],
    createdAt: '2026-01-20T09:15:00Z',
    updatedAt: '2026-06-02T11:15:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* MessagingHouses (2) — MSH-001..MSH-002 (one per strategy)           */
/* ------------------------------------------------------------------ */

export const seedMessagingHouses: MessagingHouse[] = [
  {
    id: 'MSH-001',
    strategyId: 'STR-001',
    primaryMessage:
      'Staying in the Aureon consumer ecosystem should pay you back every season — your next upgrade is part-funded by the one you already made.',
    pillars: [
      {
        title: 'Loyalty lowers the price of progress',
        proofPoints: [
          'Trade-in credit averaged 31% of the Volt5 pre-order price across EMEA in the first fortnight.',
          'Volt owners 12–24 months in convert at 2.4x the rate of lapsed owners on the same offer.',
          'No upgrade fee, no restocking fee, no contract re-lock — published in the offer terms, not the footnotes.',
        ],
      },
      {
        title: 'Savings you can actually see',
        proofPoints: [
          'Solara scenes and schedules cut measured standby draw by 14% on average across 40,000 opted-in homes.',
          'The monthly household report shows the saving in currency, not kilowatt-hours.',
          'Independently verified by the utility partner billing data, not self-reported.',
        ],
      },
      {
        title: 'Launches timed to the household, not the discount calendar',
        proofPoints: [
          'Autumn and holiday windows are set against purchase-intent tracking, which peaked at 36% in August 2026.',
          'Seasonal bundles ship complete — no accessory upsell required to get the advertised benefit.',
        ],
      },
      {
        title: 'The right message at the right moment in ownership',
        proofPoints: [
          'Lifecycle email is triggered by device age and usage, not by campaign calendar.',
          'Open rate on ownership-triggered sends runs above the 23% consumer-electronics median.',
        ],
      },
    ],
    objections: [
      {
        objection:
          '"Trade-in values are quoted high and then cut when the device is inspected."',
        response:
          'The quoted value is locked for 21 days and honoured on any device matching the condition grade shown at quote time. Grading criteria are published, with photographs, before the customer commits.',
      },
      {
        objection: '"The battery coverage in August says the hardware is not reliable."',
        response:
          'The affected units are a named production window, and every one of them is covered by free replacement. We publish the serial range rather than asking customers to guess.',
      },
      {
        objection: '"Northvolt charges faster for less money."',
        response:
          'Peak charging wattage is one number in one condition. We publish sustained charge time to 80% at room temperature and the cycle count at 90% retained capacity — the two figures that decide what ownership actually feels like.',
      },
      {
        objection: '"Smart-home savings claims never hold up in a real house."',
        response:
          'Ours are measured from utility billing data on 40,000 consenting households, not from a lab model, and the substantiation footnote travels with every claim.',
      },
    ],
    createdAt: '2026-02-04T10:00:00Z',
    updatedAt: '2026-08-11T15:00:00Z',
  },
  {
    id: 'MSH-002',
    strategyId: 'STR-002',
    primaryMessage:
      'GridWorks is the zero-trust partner security leaders recommend to each other — credibility earned in real rollouts, not bought in ad slots.',
    pillars: [
      {
        title: 'Guidance from rollouts, not from theory',
        proofPoints: [
          'Every webinar is co-presented by a practitioner who has run the migration in production.',
          'The reference architecture ships with the failure modes we hit, documented.',
          'Zero-trust budget index up 39% on the 2024 baseline — the guidance meets a funded problem.',
        ],
      },
      {
        title: 'Peer access, not vendor pitch',
        proofPoints: [
          'CISO roundtables are capped at 12 seats and run under Chatham House rules.',
          'Registrants reach a solution engineer directly; no SDR sits between them.',
          'Webinar series registrations tracked against a 42% attendance rate, above the B2B median.',
        ],
      },
      {
        title: 'Evidence a security committee can forward',
        proofPoints: [
          'Benchmarks carry the substantiation clause required in EU enterprise-network claims.',
          'Named reference customers in financial services and public sector, contactable on request.',
        ],
      },
      {
        title: 'Pipeline warmed by trust before the first call',
        proofPoints: [
          'Attributed pipeline from the webinar series tracked continuously since June 2026.',
          'Expansion within existing accounts closes materially faster than net-new logos.',
        ],
      },
    ],
    objections: [
      {
        objection: '"Zero trust is a label every vendor now claims."',
        response:
          'Ask for the migration runbook. We publish ours, including the two rollback points most programmes hit in month three. A label does not come with a runbook.',
      },
      {
        objection: '"HelioGrid Edge Vault already does this and ships an appliance."',
        response:
          'An appliance solves the perimeter case. We compete on the identity and policy layer that has to work across an estate you did not design — which is where the audit actually lands.',
      },
      {
        objection: '"Your webinars are lead-generation dressed as education."',
        response:
          'Attend without a demo request; the content and the recording are unconditional. The roundtables have no product segment at all.',
      },
      {
        objection: '"We have no budget until the next annual cycle."',
        response:
          'That is the right time to build the business case, and the assessment we run is designed for exactly that window — it produces the paper the committee needs, not a quote.',
      },
    ],
    createdAt: '2026-02-04T10:30:00Z',
    updatedAt: '2026-08-06T09:45:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* MarketSizings (3) — MSZ-001..MSZ-003 (one per business unit)        */
/* ------------------------------------------------------------------ */

export const seedMarketSizings: MarketSizing[] = [
  {
    id: 'MSZ-001',
    businessUnitId: 'BU-001',
    tam: 412000000000,
    sam: 68400000000,
    som: 3100000000,
    currency: 'USD',
    methodology:
      'Top-down from syndicated handset and smart-home unit forecasts, narrowed to the regions and price tiers we actually sell into, then cross-checked bottom-up against our own installed base and observed upgrade rates.',
    assumptions: [
      'TAM covers global consumer handset plus connected-home hardware; services revenue excluded.',
      'SAM limited to AMER, EMEA and APAC markets with an operating retail or carrier route to market.',
      'SAM excludes the sub-$150 price tier, which the portfolio does not address.',
      'SOM assumes upgrade intent holds near the August 2026 reading of 36% through the launch window.',
      'Currency held at the FY2026 planning rate; no FX sensitivity modelled.',
    ],
    sourceLabel: 'IDC Worldwide Quarterly Tracker Q2 2026 + Aureon installed-base extract, Aug 2026',
    confidence: 0.74,
    createdAt: '2026-03-12T09:00:00Z',
    updatedAt: '2026-08-10T08:00:00Z',
  },
  {
    id: 'MSZ-002',
    businessUnitId: 'BU-002',
    tam: 94000000000,
    sam: 21500000000,
    som: 640000000,
    currency: 'USD',
    methodology:
      'Bottom-up: addressable enterprise accounts by employee band and vertical, multiplied by observed average contract value from the last eight quarters of closed-won deals, then discounted for the accounts already under a competitor multi-year agreement.',
    assumptions: [
      'TAM is enterprise network and zero-trust security spend across all verticals worldwide.',
      'SAM restricted to 1,000–10,000 employee firms in AMER and EMEA, where we have delivery coverage.',
      'Average contract value assumed flat in real terms; no uplift from the usage-based tier.',
      'SOM assumes the zero-trust budget index continues rising at the 2026 H1 rate.',
      'Public-sector framework agreements counted at 40% of nominal value to reflect drawdown reality.',
    ],
    sourceLabel: 'Gartner Enterprise Security Spend 2026 + GridWorks closed-won analysis, Jul 2026',
    confidence: 0.68,
    createdAt: '2026-03-12T09:15:00Z',
    updatedAt: '2026-08-05T08:00:00Z',
  },
  {
    id: 'MSZ-003',
    businessUnitId: 'BU-003',
    tam: 12800000000,
    sam: 2900000000,
    som: 145000000,
    currency: 'USD',
    methodology:
      'Influence-value proxy rather than direct revenue: corporate reputation and ESG programme spend is sized from peer disclosures across the comparable set, then apportioned to the share of enterprise value credibly attributable to trust and licence-to-operate.',
    assumptions: [
      'TAM proxies total addressable corporate-affairs and ESG communications investment across the peer set.',
      'SAM covers the markets where we hold a regulatory or reputational stake today.',
      'SOM is expressed as protected enterprise value, not bookable revenue — it must not be added to BU-001 or BU-002.',
      'Corporate trust sentiment assumed to recover to the June 2026 reading of 68% within two quarters.',
      'Peer disclosures are self-reported and not audited on a common basis.',
    ],
    sourceLabel: 'Peer ESG disclosure review (11 comparables) + Edelman Trust Barometer 2026',
    confidence: 0.52,
    createdAt: '2026-03-12T09:30:00Z',
    updatedAt: '2026-08-12T08:00:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* BudgetScenarios (9) — BSC-001..BSC-009                              */
/* Three kinds each for the three measured campaigns:                  */
/* CMP-002 (220k plan), CMP-003 (450k plan), CMP-004 (150k plan).      */
/* ------------------------------------------------------------------ */

export const seedBudgetScenarios: BudgetScenario[] = [
  /* --- CMP-002 Volt4 Summer Clearance --------------------------- */
  {
    id: 'BSC-001',
    campaignId: 'CMP-002',
    kind: 'conservative',
    spend: 160000,
    expectedConversions: 9800,
    expectedRoi: 3.9,
    assumptions: [
      'Email-led only; paid social held at the always-on floor.',
      'Clearance inventory sells through without a second markdown.',
      'No incremental creative production beyond the existing countdown series.',
    ],
    createdAt: '2026-05-18T10:00:00Z',
    updatedAt: '2026-07-02T09:00:00Z',
  },
  {
    id: 'BSC-002',
    campaignId: 'CMP-002',
    kind: 'base',
    spend: 220000,
    expectedConversions: 14200,
    expectedRoi: 3.6,
    assumptions: [
      'Approved plan: countdown email series plus the summer social flight and the web takeover.',
      'Consented email reach holds at the current 78% opt-in on the Volt owner segment.',
      'Northvolt EMEA price cut does not deepen beyond the 15% already observed.',
    ],
    createdAt: '2026-05-18T10:05:00Z',
    updatedAt: '2026-07-02T09:05:00Z',
  },
  {
    id: 'BSC-003',
    campaignId: 'CMP-002',
    kind: 'aggressive',
    spend: 310000,
    expectedConversions: 18600,
    expectedRoi: 2.9,
    assumptions: [
      'Adds retargeting and a second social flight in the final ten days.',
      'Accepts diminishing returns past roughly 260k as frequency caps bind.',
      'Requires clearance stock to be reallocated from APAC, which is not yet agreed.',
    ],
    createdAt: '2026-05-18T10:10:00Z',
    updatedAt: '2026-07-02T09:10:00Z',
  },

  /* --- CMP-003 Volt5 5G Launch ---------------------------------- */
  {
    id: 'BSC-004',
    campaignId: 'CMP-003',
    kind: 'conservative',
    spend: 330000,
    expectedConversions: 21500,
    expectedRoi: 4.4,
    assumptions: [
      'Pre-order lifecycle email and earned press only; paid amplification limited to launch week.',
      'Relies on organic coverage carrying the launch narrative in EMEA.',
      'No Arabic-market paid flight, which caps KSA reach.',
    ],
    createdAt: '2026-06-02T09:00:00Z',
    updatedAt: '2026-08-04T10:00:00Z',
  },
  {
    id: 'BSC-005',
    campaignId: 'CMP-003',
    kind: 'base',
    spend: 450000,
    expectedConversions: 32000,
    expectedRoi: 4.1,
    assumptions: [
      'Approved plan: teaser and launch social flight, press and embargo programme, pre-order lifecycle emails.',
      'Upgrade intent holds at or above the August reading of 36% through the pre-order window.',
      'Trade-in credit stays funded at the level modelled in the offer terms.',
      'Battery coverage stays contained to the named production window.',
    ],
    createdAt: '2026-06-02T09:05:00Z',
    updatedAt: '2026-08-04T10:05:00Z',
  },
  {
    id: 'BSC-006',
    campaignId: 'CMP-003',
    kind: 'aggressive',
    spend: 640000,
    expectedConversions: 41000,
    expectedRoi: 3.3,
    assumptions: [
      'Adds an APAC creator programme and a second launch-week ads burst.',
      'Assumes launch-day supply can absorb roughly 28% more pre-orders than the base case.',
      'Marginal conversions cost materially more as the high-intent segment is exhausted early.',
      'Requires drawing on the FY26 contingency reserve; not yet approved.',
    ],
    createdAt: '2026-06-02T09:10:00Z',
    updatedAt: '2026-08-04T10:10:00Z',
  },

  /* --- CMP-004 GridWorks Zero-Trust Webinar Series ---------------- */
  {
    id: 'BSC-007',
    campaignId: 'CMP-004',
    kind: 'conservative',
    spend: 105000,
    expectedConversions: 640,
    expectedRoi: 5.2,
    assumptions: [
      'House list and existing account coverage only; no paid syndication.',
      'Four webinars rather than six, reusing the existing practitioner panel.',
      'Registration-to-attendance holds near the current 42%.',
    ],
    createdAt: '2026-04-28T11:00:00Z',
    updatedAt: '2026-07-19T09:00:00Z',
  },
  {
    id: 'BSC-008',
    campaignId: 'CMP-004',
    kind: 'base',
    spend: 150000,
    expectedConversions: 950,
    expectedRoi: 4.8,
    assumptions: [
      'Approved plan: six-webinar series plus the nurture email follow-up track.',
      'Content syndication on two analyst properties at the contracted rate.',
      'Enterprise deal cycles mean pipeline is credited at creation, not at close.',
    ],
    createdAt: '2026-04-28T11:05:00Z',
    updatedAt: '2026-07-19T09:05:00Z',
  },
  {
    id: 'BSC-009',
    campaignId: 'CMP-004',
    kind: 'aggressive',
    spend: 235000,
    expectedConversions: 1380,
    expectedRoi: 3.7,
    assumptions: [
      'Adds three in-person CISO roundtables and a paid analyst-report co-brand.',
      'Roundtable seats are capped at 12, so cost per qualified contact rises sharply.',
      'Assumes solution-engineer capacity to follow up within 48 hours, which is currently the binding constraint.',
    ],
    createdAt: '2026-04-28T11:10:00Z',
    updatedAt: '2026-07-19T09:10:00Z',
  },
];
