/**
 * Seed data — Benchmarks and PlaybookPatterns (Spec alignment wave C, learn layer).
 *
 * Both are reference data: benchmarks give a measured number something external
 * to be judged against, and playbook patterns turn what already worked into
 * something repeatable. Every pattern cites real campaign ids so the evidence
 * is one click away rather than an assertion.
 *
 * Ids are binding per SEED_MANIFEST.md ("Spec alignment wave C").
 */

import type { Benchmark, PlaybookPattern } from '../types';

/* ------------------------------------------------------------------ */
/* Benchmarks (8) — BMK-001..BMK-008                                   */
/* Impressions / open rate / click rate / conversion, by channel kind. */
/* ------------------------------------------------------------------ */

export const seedBenchmarks: Benchmark[] = [
  {
    id: 'BMK-001',
    metricKey: 'impressions',
    channelKind: 'social',
    industryMedian: 41000,
    topQuartile: 78000,
    unit: 'impressions per $1k spend',
    sourceLabel: 'Nielsen Paid Social Efficiency Benchmark, H1 2026 (consumer electronics)',
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-07-27T08:00:00Z',
  },
  {
    id: 'BMK-002',
    metricKey: 'impressions',
    channelKind: 'ads',
    industryMedian: 28500,
    topQuartile: 52000,
    unit: 'impressions per $1k spend',
    sourceLabel: 'eMarketer Display & Programmatic CPM Report, Q2 2026',
    createdAt: '2026-04-06T09:05:00Z',
    updatedAt: '2026-07-27T08:05:00Z',
  },
  {
    id: 'BMK-003',
    metricKey: 'email_open_rate',
    channelKind: 'email',
    industryMedian: 23.4,
    topQuartile: 34.1,
    unit: '%',
    sourceLabel: 'Litmus Email Engagement Benchmark 2026 (retail & consumer tech)',
    createdAt: '2026-04-06T09:10:00Z',
    updatedAt: '2026-08-03T08:00:00Z',
  },
  {
    id: 'BMK-004',
    metricKey: 'email_open_rate',
    channelKind: 'intranet',
    industryMedian: 58.0,
    topQuartile: 76.5,
    unit: '%',
    sourceLabel: 'Gallagher State of the Sector — internal comms readership, 2026',
    createdAt: '2026-04-06T09:15:00Z',
    updatedAt: '2026-08-03T08:05:00Z',
  },
  {
    id: 'BMK-005',
    metricKey: 'email_click_rate',
    channelKind: 'email',
    industryMedian: 2.9,
    topQuartile: 5.4,
    unit: '%',
    sourceLabel: 'Litmus Email Engagement Benchmark 2026 (retail & consumer tech)',
    createdAt: '2026-04-06T09:20:00Z',
    updatedAt: '2026-08-03T08:10:00Z',
  },
  {
    id: 'BMK-006',
    metricKey: 'email_click_rate',
    channelKind: 'social',
    industryMedian: 1.1,
    topQuartile: 2.6,
    unit: '%',
    sourceLabel: 'Nielsen Paid Social Efficiency Benchmark, H1 2026 (link click-through)',
    createdAt: '2026-04-06T09:25:00Z',
    updatedAt: '2026-07-27T08:10:00Z',
  },
  {
    id: 'BMK-007',
    metricKey: 'conversion_rate',
    channelKind: 'web',
    industryMedian: 2.3,
    topQuartile: 4.8,
    unit: '%',
    sourceLabel: 'Contentsquare Digital Experience Benchmark 2026 (consumer electronics retail)',
    createdAt: '2026-04-06T09:30:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'BMK-008',
    metricKey: 'conversion_rate',
    channelKind: 'event',
    industryMedian: 38.0,
    topQuartile: 55.0,
    unit: '% of registrations attending',
    sourceLabel: 'ON24 B2B Webinar Benchmarks 2026 (enterprise technology)',
    createdAt: '2026-04-06T09:35:00Z',
    updatedAt: '2026-08-05T08:00:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* PlaybookPatterns (4) — PBP-001..PBP-004                             */
/* Every pattern cites the campaigns whose results back it.            */
/* ------------------------------------------------------------------ */

export const seedPlaybookPatterns: PlaybookPattern[] = [
  {
    id: 'PBP-001',
    title: 'Trigger the upgrade offer on device age, not the campaign calendar',
    situation:
      'A hardware refresh with a large installed base, where the campaign window is fixed but the customers inside it are at very different points of ownership.',
    actions: [
      'Split the owner base by device age in months rather than by last-purchase recency.',
      'Send the trade-in offer when a device crosses 12 months, whatever week of the campaign that falls in.',
      'Lead the subject line with the locked trade-in value, not the new product name.',
      'Hold the 18–24 month cohort back for the launch-week send, when supply is confirmed.',
    ],
    evidenceCampaignIds: ['CMP-002', 'CMP-003'],
    liftPct: 34,
    createdAt: '2026-07-08T10:00:00Z',
    updatedAt: '2026-08-11T09:00:00Z',
  },
  {
    id: 'PBP-002',
    title: 'Let the practitioner present, and put the SE on the follow-up',
    situation:
      'Enterprise thought-leadership aimed at a sceptical technical buyer who has sat through the vendor version of this webinar before.',
    actions: [
      'Co-present every session with someone who has run the migration in production.',
      'Cut the product segment entirely; put the runbook in the follow-up instead.',
      'Route registrant follow-up to a solution engineer within 48 hours, bypassing the SDR queue.',
      'Publish the recording unconditionally so the deck can be forwarded inside the account.',
    ],
    evidenceCampaignIds: ['CMP-004'],
    liftPct: 27,
    createdAt: '2026-07-08T10:05:00Z',
    updatedAt: '2026-08-06T09:00:00Z',
  },
  {
    id: 'PBP-003',
    title: 'Answer the comparative ad with a published second number',
    situation:
      'A competitor runs comparative advertising on a single headline spec, and the instinct is to either ignore it or match the claim.',
    actions: [
      'Do not contest the rival number; concede it and publish the second number that decides ownership.',
      'Ship the substantiation footnote with the claim on every channel, not just the web page.',
      'Brief the press list on the methodology before the campaign, so coverage carries both figures.',
      'Give service and social teams the same two numbers, worded identically.',
    ],
    evidenceCampaignIds: ['CMP-003', 'CMP-002'],
    liftPct: 19,
    createdAt: '2026-07-08T10:10:00Z',
    updatedAt: '2026-08-11T09:10:00Z',
  },
  {
    id: 'PBP-004',
    title: 'Cascade internal programmes through managers before the all-employee send',
    situation:
      'An internal programme needs participation rather than awareness, and the all-employee email alone has historically stalled around a quarter of the base.',
    actions: [
      'Send the people-manager briefing 72 hours ahead of the all-employee announcement.',
      'Give managers a three-line script and one ask, not a deck.',
      'Time the all-employee send to land after the first team meetings of the week.',
      'Report participation by function back to managers weekly while the window is open.',
    ],
    evidenceCampaignIds: ['CMP-005'],
    liftPct: 22,
    createdAt: '2026-07-08T10:15:00Z',
    updatedAt: '2026-08-04T09:00:00Z',
  },
];
