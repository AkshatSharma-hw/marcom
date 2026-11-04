/**
 * Strategy & ideation seed — Ideas and Strategies. Ids, statuses, scores
 * and cross-references are binding per SEED_MANIFEST.md sections 7–8.
 */

import type { Idea, Strategy } from '../types';

/* ------------------------------------------------------------------ */
/* 7. Ideas                                                            */
/* ------------------------------------------------------------------ */

export const seedIdeas: Idea[] = [
  {
    id: 'IDE-001',
    title: 'Volt5 midnight pre-order drop',
    description:
      'Open Volt5 pre-orders at midnight local time with a countdown across social and lifecycle email. Early buyers get an exclusive accessory bundle, turning launch anticipation into a measurable pre-order spike.',
    source: 'workshop',
    score: 88,
    status: 'Promoted',
    brandId: 'BRD-003',
    businessUnitId: 'BU-001',
    regionId: 'REG-EMEA',
    promotedToCampaignId: 'CMP-003',
    createdAt: '2026-04-14T10:30:00Z',
    updatedAt: '2026-05-20T10:00:00Z',
  },
  {
    id: 'IDE-002',
    title: 'Solara energy-saving autumn stories',
    description:
      'A story-driven autumn series showing real households cutting energy bills with Solara scenes and schedules. Built on customer feedback that savings proof, not features, drives upgrade decisions.',
    source: 'customer-feedback',
    score: 76,
    status: 'Approved',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    createdAt: '2026-06-09T14:20:00Z',
    updatedAt: '2026-07-21T09:45:00Z',
  },
  {
    id: 'IDE-003',
    title: 'GridWorks CIO roundtable series',
    description:
      'Quarterly invite-only roundtables where CIOs and CISOs compare zero-trust rollouts under Chatham House rules. Positions GridWorks as the convener of the enterprise security conversation and feeds the pipeline with warm executive contacts.',
    source: 'field',
    score: 64,
    status: 'Scored',
    brandId: 'BRD-004',
    businessUnitId: 'BU-002',
    regionId: 'REG-AMER',
    createdAt: '2026-06-24T11:00:00Z',
    updatedAt: '2026-07-08T15:30:00Z',
  },
  {
    id: 'IDE-004',
    title: 'Employee sustainability week',
    description:
      'A five-day internal program of team challenges, leadership sessions and volunteering slots tied to Aureon sustainability commitments. Aims to lift employee participation and give internal comms a flagship autumn moment.',
    source: 'workshop',
    score: 81,
    status: 'Promoted',
    brandId: 'BRD-001',
    businessUnitId: 'BU-003',
    regionId: 'REG-AMER',
    promotedToCampaignId: 'CMP-005',
    createdAt: '2026-05-06T09:15:00Z',
    updatedAt: '2026-07-15T09:00:00Z',
  },
  {
    id: 'IDE-005',
    title: 'AI concierge in support channels',
    description:
      'Embed an AI concierge in APAC support channels to answer product questions and route upgrade intent to marketing journeys. Parked until the support platform migration completes and legal review of AI disclosures lands.',
    source: 'ai-suggested',
    score: 52,
    status: 'Parked',
    brandId: 'BRD-001',
    businessUnitId: 'BU-002',
    regionId: 'REG-APAC',
    createdAt: '2026-05-18T13:40:00Z',
    updatedAt: '2026-06-26T10:10:00Z',
  },
  {
    id: 'IDE-006',
    title: 'Volt trade-in gamification',
    description:
      'Gamify the Volt trade-in flow with instant valuations, streak bonuses and a shareable savings meter for APAC markets. Early field feedback suggests trade-in friction is the biggest blocker to upgrades.',
    source: 'field',
    score: 0,
    status: 'Draft',
    brandId: 'BRD-003',
    businessUnitId: 'BU-001',
    regionId: 'REG-APAC',
    createdAt: '2026-08-04T08:50:00Z',
    updatedAt: '2026-08-04T08:50:00Z',
  },

  /* --- Expansion ideas IDE-007..IDE-020 --------------------------- */
  {
    id: 'IDE-007',
    title: 'Always-on Volt performance engine',
    description:
      'Replace the stop-start Volt campaign calendar with one always-on performance flight that runs the whole year, reallocating spend weekly against live conversion data. Built on the finding that the gaps between launch flights cost more upgrade demand than the flights themselves generate.',
    source: 'field',
    score: 84,
    status: 'Promoted',
    brandId: 'BRD-003',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    promotedToCampaignId: 'CMP-007',
    createdAt: '2025-11-17T09:20:00Z',
    updatedAt: '2025-12-15T09:00:00Z',
  },
  {
    id: 'IDE-008',
    title: 'Everyday-home always-on program',
    description:
      'Run Solara as a continuous everyday-home program rather than a set of seasonal bursts, with creative that shows the second and third device paying back. Targets existing owners, where expansion — not acquisition — drives the category.',
    source: 'customer-feedback',
    score: 79,
    status: 'Promoted',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    promotedToCampaignId: 'CMP-008',
    createdAt: '2026-01-13T10:10:00Z',
    updatedAt: '2026-02-09T10:00:00Z',
  },
  {
    id: 'IDE-009',
    title: 'Security Resilience Index annual benchmark',
    description:
      'Publish an annual index benchmarking how quickly enterprises detect, contain and recover from identity and access incidents, built from anonymised customer telemetry plus a practitioner survey. Gives GridWorks a repeatable, citable thought-leadership asset instead of one-off whitepapers.',
    source: 'workshop',
    score: 77,
    status: 'Promoted',
    brandId: 'BRD-004',
    businessUnitId: 'BU-002',
    regionId: 'REG-AMER',
    promotedToCampaignId: 'CMP-009',
    createdAt: '2026-05-05T11:00:00Z',
    updatedAt: '2026-06-11T09:00:00Z',
  },
  {
    id: 'IDE-010',
    title: 'Trade-in valuation guarantee',
    description:
      'Guarantee the quoted trade-in value for 14 days so buyers can commit before the device arrives. Removes the single most-cited reason APAC waitlist joiners defer past launch week.',
    source: 'customer-feedback',
    score: 82,
    status: 'Approved',
    brandId: 'BRD-003',
    businessUnitId: 'BU-001',
    regionId: 'REG-APAC',
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-07-28T14:00:00Z',
  },
  {
    id: 'IDE-011',
    title: 'Partner co-op marketing marketplace',
    description:
      'Give retail and distribution partners a self-serve catalogue of localisable launch assets and co-op funding terms they can claim against. Replaces the quarterly asset scramble that currently costs partners floor-planning time.',
    source: 'workshop',
    score: 73,
    status: 'Approved',
    brandId: 'BRD-001',
    businessUnitId: 'BU-001',
    regionId: 'REG-EMEA',
    createdAt: '2026-05-19T09:40:00Z',
    updatedAt: '2026-07-14T11:20:00Z',
  },
  {
    id: 'IDE-012',
    title: 'Frontline shift-huddle comms kit',
    description:
      'A one-screen, manager-led huddle kit that replaces intranet banners for retail and field staff. Built on the finding that frontline employees trust the shift lead far more than a corporate channel.',
    source: 'field',
    score: 71,
    status: 'Approved',
    brandId: 'BRD-001',
    businessUnitId: 'BU-003',
    regionId: 'REG-AMER',
    createdAt: '2026-04-21T08:45:00Z',
    updatedAt: '2026-07-02T10:30:00Z',
  },
  {
    id: 'IDE-013',
    title: 'Energy-cost calculator on solara.com',
    description:
      'An interactive calculator that turns a household bill into a per-device payback estimate, embedded across the Solara catalogue. Aims to convert cart abandoners who leave because savings are asserted rather than shown.',
    source: 'ai-suggested',
    score: 68,
    status: 'Scored',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    createdAt: '2026-06-02T13:15:00Z',
    updatedAt: '2026-07-09T09:50:00Z',
  },
  {
    id: 'IDE-014',
    title: 'APAC trade press review-unit program',
    description:
      'Place review units with APAC trade desks two weeks before every embargo lifts, with a named executive on same-day standby. Coverage volume tracks unit availability far more closely than release cadence.',
    source: 'field',
    score: 66,
    status: 'Scored',
    brandId: 'BRD-003',
    businessUnitId: 'BU-001',
    regionId: 'REG-APAC',
    createdAt: '2026-05-07T14:30:00Z',
    updatedAt: '2026-06-30T16:00:00Z',
  },
  {
    id: 'IDE-015',
    title: 'Zero-trust maturity self-assessment',
    description:
      'A short diagnostic that scores an organisation against a published zero-trust maturity model and returns a benchmarked report. Gives security buyers a reason to identify themselves before they are ready to talk to sales.',
    source: 'workshop',
    score: 62,
    status: 'Scored',
    brandId: 'BRD-004',
    businessUnitId: 'BU-002',
    regionId: 'REG-EMEA',
    createdAt: '2026-06-11T10:20:00Z',
    updatedAt: '2026-07-23T15:10:00Z',
  },
  {
    id: 'IDE-016',
    title: 'Graduate ambassador program',
    description:
      'Recruit final-year students as campus ambassadors who run their own events and content against a light central brief. Aims to lift early-careers pipeline quality without growing the recruitment marketing team.',
    source: 'workshop',
    score: 0,
    status: 'Draft',
    brandId: 'BRD-001',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    createdAt: '2026-08-07T09:10:00Z',
    updatedAt: '2026-08-07T09:10:00Z',
  },
  {
    id: 'IDE-017',
    title: 'Solara repair-and-reuse campaign',
    description:
      'Position repairability as a Solara differentiator with a trade-up path for out-of-warranty devices. Sustainability-engaged customers ask for this repeatedly, but the reverse-logistics cost is unmodelled.',
    source: 'customer-feedback',
    score: 0,
    status: 'Draft',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-EMEA',
    createdAt: '2026-08-11T08:30:00Z',
    updatedAt: '2026-08-11T08:30:00Z',
  },
  {
    id: 'IDE-018',
    title: 'Retail in-store AR demo wall',
    description:
      'An augmented-reality demo wall letting shoppers see Solara scenes in their own room before buying. Parked until partner hardware refresh cycles align — fewer than a fifth of stores can run it today.',
    source: 'workshop',
    score: 49,
    status: 'Parked',
    brandId: 'BRD-002',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    createdAt: '2026-03-24T11:45:00Z',
    updatedAt: '2026-06-18T09:25:00Z',
  },
  {
    id: 'IDE-019',
    title: 'Always-on influencer retainer pool',
    description:
      'Swap per-campaign creator buys for a standing retainer pool across Volt and Solara. Parked pending a disclosure and exclusivity review, since retained creators complicate competitive-conflict handling.',
    source: 'ai-suggested',
    score: 55,
    status: 'Parked',
    brandId: 'BRD-001',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    createdAt: '2026-04-08T15:00:00Z',
    updatedAt: '2026-07-06T12:40:00Z',
  },
  {
    id: 'IDE-020',
    title: 'Volt4 clearance extension into Q4',
    description:
      'Extend the Volt4 clearance flight through the holiday quarter alongside the Volt5 launch. Archived after the launch plan confirmed Volt4 stock would be exhausted in August, leaving nothing to clear.',
    source: 'field',
    score: 41,
    status: 'Archived',
    brandId: 'BRD-003',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    createdAt: '2026-03-02T10:05:00Z',
    updatedAt: '2026-06-05T13:20:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* 8. Strategies                                                       */
/* ------------------------------------------------------------------ */

export const seedStrategies: Strategy[] = [
  {
    id: 'STR-001',
    title: 'FY26 Consumer Momentum',
    horizon: 'FY2026',
    objectives: [
      'Grow upgrade revenue across the Volt and Solara portfolios',
      'Lift lifecycle email engagement across the consumer base',
      'Win autumn and holiday seasonal share against key rivals',
    ],
    positioning:
      'The consumer portfolio that pays for its own upgrade — Volt and Solara owners keep more money in their pocket every season they stay in the ecosystem.',
    valuePropositions: [
      'Upgrade paths that reward loyalty with trade-in value instead of penalising it',
      'Measurable household savings from Solara scenes and schedules, proven with real usage data',
      'Seasonal launches timed to when households actually buy, not when rivals discount',
      'Lifecycle email that surfaces the right offer at the right moment in the ownership journey',
    ],
    kpiIds: ['KPI-002'],
    businessUnitId: 'BU-001',
    createdAt: '2025-12-08T10:00:00Z',
    updatedAt: '2026-05-12T14:30:00Z',
  },
  {
    id: 'STR-002',
    title: 'FY26 Enterprise Trust & Pipeline',
    horizon: 'FY2026',
    objectives: [
      'Build security thought-leadership around the GridWorks zero-trust story',
      'Generate qualified pipeline from enterprise security buyers',
    ],
    positioning:
      'GridWorks is the zero-trust partner enterprise security leaders reference to each other — credibility built in the room, not in the ad slot.',
    valuePropositions: [
      'Zero-trust guidance grounded in real enterprise rollouts, not vendor theory',
      'Peer-level access to the CIO and CISO community shaping security standards',
      'A pipeline of qualified security buyers warmed by trust before the first sales call',
    ],
    kpiIds: ['KPI-007'],
    businessUnitId: 'BU-002',
    createdAt: '2025-12-08T10:30:00Z',
    updatedAt: '2026-04-22T11:15:00Z',
  },

  /* --- Expansion strategies STR-003..STR-005 ---------------------- */
  {
    id: 'STR-003',
    title: 'FY26 APAC Growth Acceleration',
    horizon: 'FY2026',
    objectives: [
      'Convert the APAC launch waitlist into launch-week purchases rather than deferred intent',
      'Lift Volt brand consideration in tier-1 APAC cities',
      'Make carrier and trade-in economics the leading launch message, not a footnote',
    ],
    positioning:
      'In APAC, Volt is the flagship you can actually afford on launch day — the carrier maths is part of the launch, not a surprise at checkout.',
    valuePropositions: [
      'A guaranteed launch-day allocation for anyone who joins the waitlist, replacing an unranked queue',
      'Instalment and trade-in value shown as one number, in local currency, before the buy decision',
      'Local-language launch content live on launch day in every tier-1 market, not a week behind',
      'Creator partnerships that demo the device in real local networks rather than in studio conditions',
    ],
    kpiIds: ['KPI-028'],
    businessUnitId: 'BU-001',
    createdAt: '2026-01-06T09:00:00Z',
    updatedAt: '2026-06-02T11:00:00Z',
  },
  {
    id: 'STR-004',
    title: 'FY26 Enterprise EMEA Expansion',
    horizon: 'FY2026',
    objectives: [
      'Establish GridWorks as a credible EMEA security vendor outside its AMER base',
      'Shorten the enterprise evaluation cycle with evidence buyers can review unaccompanied',
      'Build qualified EMEA pipeline from named target accounts',
    ],
    positioning:
      'GridWorks is the zero-trust platform that answers the European security review before the first sales call — residency, evidence and trial access in the open.',
    valuePropositions: [
      'Data-residency and GDPR answers published up front, not supplied on request under NDA',
      'A self-serve trial built to survive a real security review, not a guided demo environment',
      'Total-cost comparisons a European CFO will accept without a vendor spreadsheet',
      'One named technical owner per target account, from evaluation through rollout',
    ],
    kpiIds: ['KPI-029'],
    businessUnitId: 'BU-002',
    createdAt: '2026-01-06T09:10:00Z',
    updatedAt: '2026-06-05T11:30:00Z',
  },
  {
    id: 'STR-005',
    title: 'FY26 Corporate Trust & Reputation',
    horizon: 'FY2026',
    objectives: [
      'Raise Aureon corporate favorability among institutional and policy audiences',
      'Make sustainability and employment commitments verifiable rather than asserted',
      'Hold a consistent corporate voice across earned, owned and internal channels',
    ],
    positioning:
      'Aureon is the group that publishes the number before it is asked for — reputation earned through disclosure, not campaigns.',
    valuePropositions: [
      'Sustainability and workforce commitments reported against published baselines every quarter',
      'One corporate voice across press, investor and employee channels, with no version written only for outsiders',
      'Executives who take the follow-up question on the record, at the pace newsrooms actually work',
      'Employee-facing communication that reaches the shop floor and the field, not only head office',
    ],
    kpiIds: ['KPI-030'],
    businessUnitId: 'BU-003',
    createdAt: '2026-01-06T09:20:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
  },
];
