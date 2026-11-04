/**
 * Seed data — KPIs and MetricResults.
 * Conforms to SEED_MANIFEST.md §27–§28.
 *
 * MetricResults use the fixed 10-week grid (ISO week-start Mondays
 * 2026-06-08 … 2026-08-10) and deterministic block allocation: within each
 * block of 10 ids, position N maps to week N of the grid. Rows exist only
 * for Live/Paused/Completed campaigns: CMP-002, CMP-003, CMP-004 and the
 * expansion campaigns CMP-007 … CMP-013 and CMP-019.
 *
 * Funnel invariant, enforced per campaign-week across every block below:
 *   conversions ≤ clicks ≤ opens ≤ impressions
 * where "conversions" is the sum of every conversion-tier key on that campaign
 * (e.g. preorders + orders for CMP-003, registrations + leads for CMP-004).
 * Every value is non-negative and every period stays inside 2026.
 */

import type { KPI, MetricResult } from '../types';

/* ------------------------------------------------------------------ */
/* KPIs (30) — manifest §27 + expansion KPI-009 … KPI-030             */
/* ------------------------------------------------------------------ */

export const seedKpis: KPI[] = [
  {
    id: 'KPI-001',
    name: 'Volt4 clearance revenue',
    metricKey: 'revenue_attributed',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 1500000,
    period: 'FY2026-H1',
    attachedTo: { campaignId: 'CMP-002' },
    createdAt: '2026-04-23T10:00:00Z',
    updatedAt: '2026-05-11T15:30:00Z',
  },
  {
    id: 'KPI-002',
    name: 'Consumer email engagement',
    metricKey: 'email_open_rate',
    tier: 'engagement',
    unit: '%',
    direction: 'up',
    target: 32,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-001' },
    createdAt: '2026-01-12T09:00:00Z',
    updatedAt: '2026-01-12T09:00:00Z',
  },
  {
    id: 'KPI-003',
    name: 'Solara autumn reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 8000000,
    period: 'Q4-2026',
    attachedTo: { campaignId: 'CMP-001' },
    createdAt: '2026-07-21T09:30:00Z',
    updatedAt: '2026-07-21T09:30:00Z',
  },
  {
    id: 'KPI-004',
    name: 'Volt5 pre-orders',
    metricKey: 'preorders',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 50000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-003' },
    createdAt: '2026-05-20T11:00:00Z',
    updatedAt: '2026-05-22T10:10:00Z',
  },
  {
    id: 'KPI-005',
    name: 'Volt5 launch reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 25000000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-003' },
    createdAt: '2026-05-20T11:05:00Z',
    updatedAt: '2026-05-22T10:10:00Z',
  },
  {
    id: 'KPI-006',
    name: 'Webinar registrations',
    metricKey: 'registrations',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 3000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-004' },
    createdAt: '2026-05-26T12:00:00Z',
    updatedAt: '2026-05-29T09:45:00Z',
  },
  {
    id: 'KPI-007',
    name: 'Enterprise pipeline influenced',
    metricKey: 'pipeline_usd',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 2000000,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-002' },
    createdAt: '2026-01-12T09:10:00Z',
    updatedAt: '2026-01-12T09:10:00Z',
  },
  {
    id: 'KPI-008',
    name: 'Sustainability week participation',
    metricKey: 'participation_rate',
    tier: 'engagement',
    unit: '%',
    direction: 'up',
    target: 60,
    period: 'Q4-2026',
    attachedTo: { campaignId: 'CMP-005' },
    createdAt: '2026-07-16T11:30:00Z',
    updatedAt: '2026-07-16T11:30:00Z',
  },

  /* ---------------------------------------------------------------- */
  /* Expansion KPIs (KPI-009 … KPI-030) — all five tiers.              */
  /* Attached to the expansion campaigns CMP-007 … CMP-013 / CMP-019   */
  /* and the expansion strategies STR-003 … STR-005. Targets sit       */
  /* ~12–15% above the seeded ten-week actuals so every gauge reads    */
  /* "on track but not yet there" rather than a flat 100%.             */
  /* ---------------------------------------------------------------- */

  /* --- CMP-007 Volt Always-On Performance Push --------------------- */
  {
    id: 'KPI-009',
    name: 'Volt always-on reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 15000000,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-007' },
    createdAt: '2025-12-15T09:10:00Z',
    updatedAt: '2026-06-02T09:00:00Z',
  },
  {
    id: 'KPI-010',
    name: 'Volt always-on email opens',
    metricKey: 'email_opens',
    tier: 'engagement',
    unit: 'count',
    direction: 'up',
    target: 880000,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-007' },
    createdAt: '2025-12-15T09:15:00Z',
    updatedAt: '2026-06-02T09:05:00Z',
  },
  {
    id: 'KPI-011',
    name: 'Volt always-on link clicks',
    metricKey: 'clicks',
    tier: 'engagement',
    unit: 'count',
    direction: 'up',
    target: 125000,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-007' },
    createdAt: '2025-12-15T09:20:00Z',
    updatedAt: '2026-06-02T09:10:00Z',
  },
  {
    id: 'KPI-012',
    name: 'Volt always-on orders',
    metricKey: 'orders',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 6200,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-007' },
    createdAt: '2025-12-15T09:25:00Z',
    updatedAt: '2026-06-02T09:15:00Z',
  },
  {
    id: 'KPI-013',
    name: 'Volt always-on attributed revenue',
    metricKey: 'revenue_attributed',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 1450000,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-007' },
    createdAt: '2025-12-15T09:30:00Z',
    updatedAt: '2026-06-02T09:20:00Z',
  },
  {
    id: 'KPI-014',
    name: 'Volt brand consideration',
    metricKey: 'brand_consideration_pct',
    tier: 'brand',
    unit: '%',
    direction: 'up',
    target: 30,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-007' },
    createdAt: '2025-12-15T09:35:00Z',
    updatedAt: '2026-06-02T09:25:00Z',
  },

  /* --- CMP-008 Solara Everyday Home Always-On ---------------------- */
  {
    id: 'KPI-015',
    name: 'Solara everyday reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 9500000,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-008' },
    createdAt: '2026-02-09T10:30:00Z',
    updatedAt: '2026-06-05T10:00:00Z',
  },
  {
    id: 'KPI-016',
    name: 'Solara everyday link clicks',
    metricKey: 'clicks',
    tier: 'engagement',
    unit: 'count',
    direction: 'up',
    target: 95000,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-008' },
    createdAt: '2026-02-09T10:35:00Z',
    updatedAt: '2026-06-05T10:05:00Z',
  },
  {
    id: 'KPI-017',
    name: 'Solara everyday orders',
    metricKey: 'orders',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 5700,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-008' },
    createdAt: '2026-02-09T10:40:00Z',
    updatedAt: '2026-06-05T10:10:00Z',
  },
  {
    id: 'KPI-018',
    name: 'Solara everyday attributed revenue',
    metricKey: 'revenue_attributed',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 920000,
    period: 'FY2026',
    attachedTo: { campaignId: 'CMP-008' },
    createdAt: '2026-02-09T10:45:00Z',
    updatedAt: '2026-06-05T10:15:00Z',
  },

  /* --- CMP-009 GridWorks Security Resilience Index 2026 ------------ */
  {
    id: 'KPI-019',
    name: 'Resilience Index reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 3000000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-009' },
    createdAt: '2026-06-11T11:10:00Z',
    updatedAt: '2026-07-06T09:00:00Z',
  },
  {
    id: 'KPI-020',
    name: 'Resilience Index report clicks',
    metricKey: 'clicks',
    tier: 'engagement',
    unit: 'count',
    direction: 'up',
    target: 88000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-009' },
    createdAt: '2026-06-11T11:15:00Z',
    updatedAt: '2026-07-06T09:05:00Z',
  },
  {
    id: 'KPI-021',
    name: 'Resilience Index qualified leads',
    metricKey: 'qualified_leads',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 2200,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-009' },
    createdAt: '2026-06-11T11:20:00Z',
    updatedAt: '2026-07-06T09:10:00Z',
  },
  {
    id: 'KPI-022',
    name: 'Resilience Index pipeline influenced',
    metricKey: 'pipeline_usd',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 1300000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-009' },
    createdAt: '2026-06-11T11:25:00Z',
    updatedAt: '2026-07-06T09:15:00Z',
  },

  /* --- CMP-010 Aureon Investor & Analyst Program H2 ---------------- */
  {
    id: 'KPI-023',
    name: 'Investor program earned reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 2000000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-010' },
    createdAt: '2026-05-28T09:00:00Z',
    updatedAt: '2026-06-22T09:00:00Z',
  },
  {
    id: 'KPI-024',
    name: 'Investor program clicks',
    metricKey: 'clicks',
    tier: 'engagement',
    unit: 'count',
    direction: 'up',
    target: 24000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-010' },
    createdAt: '2026-05-28T09:05:00Z',
    updatedAt: '2026-06-22T09:05:00Z',
  },
  {
    id: 'KPI-025',
    name: 'Analyst briefing registrations',
    metricKey: 'signups',
    tier: 'conversion',
    unit: 'count',
    direction: 'up',
    target: 1700,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-010' },
    createdAt: '2026-05-28T09:10:00Z',
    updatedAt: '2026-06-22T09:10:00Z',
  },
  {
    id: 'KPI-026',
    name: 'Investor program attributed value',
    metricKey: 'revenue_attributed',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 150000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-010' },
    createdAt: '2026-05-28T09:15:00Z',
    updatedAt: '2026-06-22T09:15:00Z',
  },

  /* --- CMP-019 Solara Kitchen Companion EMEA (Paused) -------------- */
  {
    id: 'KPI-027',
    name: 'Kitchen Companion EMEA reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 4600000,
    period: 'Q3-2026',
    attachedTo: { campaignId: 'CMP-019' },
    createdAt: '2026-03-16T09:10:00Z',
    updatedAt: '2026-08-06T12:30:00Z',
  },

  /* --- Strategy-level KPIs (STR-003 … STR-005) --------------------- */
  {
    id: 'KPI-028',
    name: 'APAC portfolio reach',
    metricKey: 'impressions',
    tier: 'reach',
    unit: 'count',
    direction: 'up',
    target: 60000000,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-003' },
    createdAt: '2026-01-06T09:00:00Z',
    updatedAt: '2026-01-06T09:00:00Z',
  },
  {
    id: 'KPI-029',
    name: 'EMEA enterprise pipeline influenced',
    metricKey: 'pipeline_usd',
    tier: 'business',
    unit: 'USD',
    direction: 'up',
    target: 3500000,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-004' },
    createdAt: '2026-01-06T09:10:00Z',
    updatedAt: '2026-01-06T09:10:00Z',
  },
  {
    id: 'KPI-030',
    name: 'Aureon corporate favorability',
    metricKey: 'brand_favorability_pct',
    tier: 'brand',
    unit: '%',
    direction: 'up',
    target: 62,
    period: 'FY2026',
    attachedTo: { strategyId: 'STR-005' },
    createdAt: '2026-01-06T09:20:00Z',
    updatedAt: '2026-01-06T09:20:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* MetricResults (400) — manifest §28 + expansion MR-081 … MR-400     */
/* ------------------------------------------------------------------ */

/** The fixed 10-week grid of ISO week-start Mondays. */
const METRIC_WEEKS = [
  '2026-06-08',
  '2026-06-15',
  '2026-06-22',
  '2026-06-29',
  '2026-07-06',
  '2026-07-13',
  '2026-07-20',
  '2026-07-27',
  '2026-08-03',
  '2026-08-10',
] as const;

/**
 * Rollup timestamps: each weekly row lands the following Monday at 06:00Z,
 * except the in-flight 2026-08-10 week, whose partial rollup ran 2026-08-12
 * (all timestamps stay before the 2026-08-13 anchor date).
 */
const ROLLUP_AT = [
  '2026-06-15T06:00:00Z',
  '2026-06-22T06:00:00Z',
  '2026-06-29T06:00:00Z',
  '2026-07-06T06:00:00Z',
  '2026-07-13T06:00:00Z',
  '2026-07-20T06:00:00Z',
  '2026-07-27T06:00:00Z',
  '2026-08-03T06:00:00Z',
  '2026-08-10T06:00:00Z',
  '2026-08-12T06:00:00Z',
] as const;

/** Build one block of 10 weekly rows with deterministic id → week mapping. */
function metricBlock(
  firstIdNumber: number,
  kpiId: string | undefined,
  metricKey: string,
  dimensions: MetricResult['dimensions'],
  values: number[],
): MetricResult[] {
  return values.map((value, i) => ({
    id: `MR-${String(firstIdNumber + i).padStart(3, '0')}`,
    ...(kpiId ? { kpiId } : {}),
    metricKey,
    value,
    period: METRIC_WEEKS[i],
    dimensions,
    createdAt: ROLLUP_AT[i],
    updatedAt: ROLLUP_AT[i],
  }));
}

export const seedMetricResults: MetricResult[] = [
  // MR-001..MR-010 — CMP-002 attributed revenue (USD/week): ramp 90k → 210k,
  // tapering over the final two weeks; 10-week sum 1,422,000 (just under the 1.5M target).
  ...metricBlock(
    1,
    'KPI-001',
    'revenue_attributed',
    { campaignId: 'CMP-002', brandId: 'BRD-003', businessUnitId: 'BU-001', regionId: 'REG-AMER' },
    [90000, 105000, 122000, 138000, 155000, 172000, 190000, 210000, 145000, 95000],
  ),

  // MR-011..MR-020 — CMP-002 lifecycle email open rate (%): mild upward drift 27–34.
  ...metricBlock(
    11,
    'KPI-002',
    'email_open_rate',
    { campaignId: 'CMP-002', channelId: 'CHN-001', brandId: 'BRD-003', businessUnitId: 'BU-001' },
    [27.4, 28.1, 27.9, 28.8, 29.6, 30.2, 31.0, 31.8, 32.9, 33.6],
  ),

  // MR-021..MR-030 — CMP-002 social impressions: 600k–1.3M weekly, peaking mid-July.
  ...metricBlock(
    21,
    undefined,
    'impressions',
    { campaignId: 'CMP-002', channelId: 'CHN-002', brandId: 'BRD-003', businessUnitId: 'BU-001' },
    [620000, 700000, 780000, 860000, 980000, 1240000, 1300000, 1180000, 890000, 640000],
  ),

  // MR-031..MR-040 — CMP-003 pre-orders: zero for the four pre-open weeks,
  // then 4k → 11k weekly once pre-orders opened 2026-07-06.
  ...metricBlock(
    31,
    'KPI-004',
    'preorders',
    { campaignId: 'CMP-003', brandId: 'BRD-003', businessUnitId: 'BU-001', regionId: 'REG-EMEA' },
    [0, 0, 0, 0, 4200, 5600, 7100, 8600, 9800, 11200],
  ),

  // MR-041..MR-050 — CMP-003 social impressions: 1.2M → 3.5M weekly, rising toward launch.
  ...metricBlock(
    41,
    'KPI-005',
    'impressions',
    { campaignId: 'CMP-003', channelId: 'CHN-002', brandId: 'BRD-003', businessUnitId: 'BU-001' },
    [1200000, 1450000, 1700000, 1950000, 2200000, 2500000, 2800000, 3050000, 3300000, 3500000],
  ),

  // MR-051..MR-060 — CMP-003 lifecycle email open rate (%): 30–38.
  ...metricBlock(
    51,
    'KPI-002',
    'email_open_rate',
    { campaignId: 'CMP-003', channelId: 'CHN-001', brandId: 'BRD-003', businessUnitId: 'BU-001' },
    [30.5, 31.2, 30.8, 31.9, 33.4, 34.1, 35.0, 36.2, 37.1, 37.8],
  ),

  // MR-061..MR-070 — CMP-004 webinar registrations: 150–420 weekly,
  // spiking on webinar weeks (06-22, 07-20, 08-10).
  ...metricBlock(
    61,
    'KPI-006',
    'registrations',
    {
      campaignId: 'CMP-004',
      channelId: 'CHN-006',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [160, 210, 390, 180, 200, 240, 410, 230, 260, 420],
  ),

  // MR-071..MR-080 — CMP-004 pipeline influenced (USD/week): 60k–220k,
  // cumulative 1,325,000 by the 2026-08-10 week.
  ...metricBlock(
    71,
    'KPI-007',
    'pipeline_usd',
    { campaignId: 'CMP-004', brandId: 'BRD-004', businessUnitId: 'BU-002', regionId: 'REG-AMER' },
    [60000, 85000, 150000, 95000, 110000, 130000, 205000, 125000, 145000, 220000],
  ),

  /* ================================================================ */
  /* MR-081 … MR-400 — funnel completion + expansion campaigns.       */
  /*                                                                  */
  /* Blocks MR-081 … MR-180 fill in the missing funnel legs (opens,   */
  /* clicks, conversions) for the three campaigns that already report */
  /* above; blocks MR-181 … MR-380 carry the full funnel plus a       */
  /* business-tier row for each expansion campaign; MR-381 … MR-400   */
  /* add the two rate/brand series.                                   */
  /* ================================================================ */

  /* ---------------------------------------------------------------- */
  /* CMP-002 Volt4 Summer Clearance (Completed) — opens/clicks/orders  */
  /* sit under the seeded social impressions MR-021 … MR-030.          */
  /* ---------------------------------------------------------------- */

  // MR-081..MR-090 — lifecycle email opens: ~5% of weekly impressions.
  ...metricBlock(
    81,
    undefined,
    'email_opens',
    {
      campaignId: 'CMP-002',
      channelId: 'CHN-001',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [31000, 35000, 39000, 43000, 49000, 62000, 65000, 59000, 44000, 32000],
  ),

  // MR-091..MR-100 — clicks: ~8% of opens.
  ...metricBlock(
    91,
    undefined,
    'clicks',
    {
      campaignId: 'CMP-002',
      channelId: 'CHN-001',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [2480, 2800, 3120, 3440, 3920, 4960, 5200, 4720, 3520, 2560],
  ),

  // MR-101..MR-110 — clearance orders on web: ~12% of clicks.
  ...metricBlock(
    101,
    undefined,
    'orders',
    {
      campaignId: 'CMP-002',
      channelId: 'CHN-003',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [300, 336, 375, 412, 470, 595, 625, 566, 422, 307],
  ),

  /* ---------------------------------------------------------------- */
  /* CMP-003 Volt5 5G Launch (Live) — opens/clicks/orders sit under    */
  /* the seeded impressions and comfortably above the preorder rows.   */
  /* ---------------------------------------------------------------- */

  // MR-111..MR-120 — lifecycle email opens: ~6% of weekly impressions.
  ...metricBlock(
    111,
    undefined,
    'email_opens',
    {
      campaignId: 'CMP-003',
      channelId: 'CHN-001',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-EMEA',
    },
    [72000, 87000, 102000, 117000, 132000, 150000, 168000, 183000, 198000, 210000],
  ),

  // MR-121..MR-130 — clicks: ~15% of opens; always above the week's preorders.
  ...metricBlock(
    121,
    undefined,
    'clicks',
    {
      campaignId: 'CMP-003',
      channelId: 'CHN-001',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-EMEA',
    },
    [10800, 13050, 15300, 17550, 19800, 22500, 25200, 27450, 29700, 31500],
  ),

  // MR-131..MR-140 — pre-order deposits recognised as attributed revenue at
  // 45 USD per unit, so the series tracks MR-031..MR-040 exactly and ROI
  // becomes computable for the launch campaign. Zero until pre-orders opened.
  ...metricBlock(
    131,
    undefined,
    'revenue_attributed',
    {
      campaignId: 'CMP-003',
      channelId: 'CHN-003',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-EMEA',
    },
    [0, 0, 0, 0, 189000, 252000, 319500, 387000, 441000, 504000],
  ),

  /* ---------------------------------------------------------------- */
  /* CMP-004 GridWorks Zero-Trust Webinar Series (Live) — full funnel  */
  /* above the seeded registrations and pipeline rows.                 */
  /* ---------------------------------------------------------------- */

  // MR-141..MR-150 — nurture email impressions (delivered sends).
  ...metricBlock(
    141,
    undefined,
    'impressions',
    {
      campaignId: 'CMP-004',
      channelId: 'CHN-001',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [48000, 52000, 61000, 50000, 54000, 58000, 66000, 55000, 59000, 68000],
  ),

  // MR-151..MR-160 — email opens: ~34% of sends, spiking on webinar weeks.
  ...metricBlock(
    151,
    undefined,
    'email_opens',
    {
      campaignId: 'CMP-004',
      channelId: 'CHN-001',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [16300, 17700, 20700, 17000, 18400, 19700, 22400, 18700, 20100, 23100],
  ),

  // MR-161..MR-170 — clicks: ~12% of opens; always above registrations + leads.
  ...metricBlock(
    161,
    undefined,
    'clicks',
    {
      campaignId: 'CMP-004',
      channelId: 'CHN-001',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [1960, 2120, 2480, 2040, 2210, 2360, 2690, 2240, 2410, 2770],
  ),

  // MR-171..MR-180 — captured leads from the webinar funnel.
  ...metricBlock(
    171,
    undefined,
    'leads',
    {
      campaignId: 'CMP-004',
      channelId: 'CHN-006',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [420, 470, 610, 440, 480, 520, 640, 500, 540, 660],
  ),

  /* ---------------------------------------------------------------- */
  /* CMP-007 Volt Always-On Performance Push (Live, full-year flight)   */
  /* — the one campaign carrying a complete funnel plus revenue.        */
  /* ---------------------------------------------------------------- */

  // MR-181..MR-190 — always-on social impressions, flat with a slow build.
  ...metricBlock(
    181,
    'KPI-009',
    'impressions',
    {
      campaignId: 'CMP-007',
      channelId: 'CHN-002',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [1150000, 1210000, 1180000, 1260000, 1320000, 1290000, 1380000, 1410000, 1350000, 1440000],
  ),

  // MR-191..MR-200 — lifecycle email opens: ~6% of weekly impressions.
  ...metricBlock(
    191,
    'KPI-010',
    'email_opens',
    {
      campaignId: 'CMP-007',
      channelId: 'CHN-001',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [69000, 72600, 70800, 75600, 79200, 77400, 82800, 84600, 81000, 86400],
  ),

  // MR-201..MR-210 — clicks: ~14% of opens.
  ...metricBlock(
    201,
    'KPI-011',
    'clicks',
    {
      campaignId: 'CMP-007',
      channelId: 'CHN-001',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [9660, 10164, 9912, 10584, 11088, 10836, 11592, 11844, 11340, 12096],
  ),

  // MR-211..MR-220 — orders: ~5% of clicks.
  ...metricBlock(
    211,
    'KPI-012',
    'orders',
    {
      campaignId: 'CMP-007',
      channelId: 'CHN-003',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [483, 508, 496, 529, 554, 542, 580, 592, 567, 605],
  ),

  // MR-221..MR-230 — attributed revenue: ~230 USD blended per order.
  ...metricBlock(
    221,
    'KPI-013',
    'revenue_attributed',
    {
      campaignId: 'CMP-007',
      brandId: 'BRD-003',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [111000, 117000, 114000, 122000, 127000, 125000, 133000, 136000, 130000, 139000],
  ),

  /* ---------------------------------------------------------------- */
  /* CMP-008 Solara Everyday Home Always-On (Live) — social-led funnel; */
  /* no separate open leg because the flight runs on paid social.       */
  /* ---------------------------------------------------------------- */

  // MR-231..MR-240 — always-on social impressions.
  ...metricBlock(
    231,
    'KPI-015',
    'impressions',
    {
      campaignId: 'CMP-008',
      channelId: 'CHN-002',
      brandId: 'BRD-002',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [740000, 780000, 810000, 795000, 830000, 865000, 880000, 850000, 895000, 920000],
  ),

  // MR-241..MR-250 — clicks: ~1% of impressions.
  ...metricBlock(
    241,
    'KPI-016',
    'clicks',
    {
      campaignId: 'CMP-008',
      channelId: 'CHN-002',
      brandId: 'BRD-002',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [7400, 7800, 8100, 7950, 8300, 8650, 8800, 8500, 8950, 9200],
  ),

  // MR-251..MR-260 — orders: ~6% of clicks.
  ...metricBlock(
    251,
    'KPI-017',
    'orders',
    {
      campaignId: 'CMP-008',
      channelId: 'CHN-003',
      brandId: 'BRD-002',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [444, 468, 486, 477, 498, 519, 528, 510, 537, 552],
  ),

  // MR-261..MR-270 — attributed revenue: ~160 USD per order.
  ...metricBlock(
    261,
    'KPI-018',
    'revenue_attributed',
    {
      campaignId: 'CMP-008',
      brandId: 'BRD-002',
      businessUnitId: 'BU-001',
      regionId: 'REG-AMER',
    },
    [71000, 75000, 78000, 76000, 80000, 83000, 84000, 82000, 86000, 88000],
  ),

  /* ---------------------------------------------------------------- */
  /* CMP-009 GridWorks Security Resilience Index 2026 (Live, starts    */
  /* 2026-07-06) — the first four weeks are pre-flight zeros.          */
  /* ---------------------------------------------------------------- */

  // MR-271..MR-280 — earned + syndicated reach, peaking in report week two.
  ...metricBlock(
    271,
    'KPI-019',
    'impressions',
    {
      campaignId: 'CMP-009',
      channelId: 'CHN-004',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [0, 0, 0, 0, 420000, 610000, 480000, 390000, 340000, 305000],
  ),

  // MR-281..MR-290 — clicks through to the report download: ~3% of reach.
  ...metricBlock(
    281,
    'KPI-020',
    'clicks',
    {
      campaignId: 'CMP-009',
      channelId: 'CHN-003',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [0, 0, 0, 0, 12600, 18300, 14400, 11700, 10200, 9150],
  ),

  // MR-291..MR-300 — qualified leads from gated downloads: ~2.5% of clicks.
  ...metricBlock(
    291,
    'KPI-021',
    'qualified_leads',
    {
      campaignId: 'CMP-009',
      channelId: 'CHN-003',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [0, 0, 0, 0, 315, 458, 360, 292, 255, 229],
  ),

  // MR-301..MR-310 — pipeline influenced (USD/week); ten-week sum 1,112,000.
  ...metricBlock(
    301,
    'KPI-022',
    'pipeline_usd',
    {
      campaignId: 'CMP-009',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-AMER',
    },
    [0, 0, 0, 0, 180000, 265000, 210000, 172000, 150000, 135000],
  ),

  /* ---------------------------------------------------------------- */
  /* CMP-010 Aureon Investor & Analyst Program H2 (Live, starts        */
  /* 2026-06-22) — the first two grid weeks are pre-flight zeros.      */
  /* ---------------------------------------------------------------- */

  // MR-311..MR-320 — earned press reach; spikes on results and briefing weeks.
  ...metricBlock(
    311,
    'KPI-023',
    'impressions',
    {
      campaignId: 'CMP-010',
      channelId: 'CHN-004',
      brandId: 'BRD-001',
      businessUnitId: 'BU-003',
      regionId: 'REG-AMER',
    },
    [0, 0, 185000, 210000, 165000, 240000, 320000, 195000, 175000, 260000],
  ),

  // MR-321..MR-330 — clicks into the investor centre: ~1.2% of reach.
  ...metricBlock(
    321,
    'KPI-024',
    'clicks',
    {
      campaignId: 'CMP-010',
      channelId: 'CHN-003',
      brandId: 'BRD-001',
      businessUnitId: 'BU-003',
      regionId: 'REG-AMER',
    },
    [0, 0, 2220, 2520, 1980, 2880, 3840, 2340, 2100, 3120],
  ),

  // MR-331..MR-340 — analyst briefing registrations: ~7% of clicks.
  ...metricBlock(
    331,
    'KPI-025',
    'signups',
    {
      campaignId: 'CMP-010',
      channelId: 'CHN-003',
      brandId: 'BRD-001',
      businessUnitId: 'BU-003',
      regionId: 'REG-AMER',
    },
    [0, 0, 155, 176, 139, 202, 269, 164, 147, 218],
  ),

  // MR-341..MR-350 — attributed value from investor-sourced demand; sum 131,500.
  ...metricBlock(
    341,
    'KPI-026',
    'revenue_attributed',
    {
      campaignId: 'CMP-010',
      brandId: 'BRD-001',
      businessUnitId: 'BU-003',
      regionId: 'REG-AMER',
    },
    [0, 0, 14000, 16000, 12500, 18000, 24000, 14500, 13000, 19500],
  ),

  /* ---------------------------------------------------------------- */
  /* CMP-019 Solara Kitchen Companion EMEA (Paused 2026-08-06) —       */
  /* delivery collapses to zero in the final grid week.                */
  /* ---------------------------------------------------------------- */

  // MR-351..MR-360 — social impressions, cut off by the pause.
  ...metricBlock(
    351,
    'KPI-027',
    'impressions',
    {
      campaignId: 'CMP-019',
      channelId: 'CHN-002',
      brandId: 'BRD-002',
      businessUnitId: 'BU-001',
      regionId: 'REG-EMEA',
    },
    [510000, 545000, 495000, 520000, 480000, 455000, 430000, 405000, 190000, 0],
  ),

  // MR-361..MR-370 — attributed revenue, trailing the same pause.
  ...metricBlock(
    361,
    undefined,
    'revenue_attributed',
    {
      campaignId: 'CMP-019',
      brandId: 'BRD-002',
      businessUnitId: 'BU-001',
      regionId: 'REG-EMEA',
    },
    [58000, 62000, 56000, 59000, 54000, 51000, 48000, 45000, 21000, 0],
  ),

  /* ---------------------------------------------------------------- */
  /* Completed campaigns whose flights closed before or early in the   */
  /* grid. They report attribution tails only — no new delivery — so   */
  /* ROI stays computable without inventing post-flight impressions.   */
  /* ---------------------------------------------------------------- */

  // MR-371..MR-380 — CMP-011 Solara Spring Energy Reset (ended 2026-05-15):
  // late-attributed revenue decaying through the attribution window.
  ...metricBlock(
    371,
    undefined,
    'revenue_attributed',
    {
      campaignId: 'CMP-011',
      brandId: 'BRD-002',
      businessUnitId: 'BU-001',
      regionId: 'REG-EMEA',
    },
    [95000, 78000, 62000, 49000, 38000, 29000, 22000, 16000, 11000, 7000],
  ),

  // MR-381..MR-390 — CMP-012 GridWorks APAC Compliance Roadshow (ended
  // 2026-06-19): roadshow pipeline still landing after the final stop.
  ...metricBlock(
    381,
    undefined,
    'pipeline_usd',
    {
      campaignId: 'CMP-012',
      brandId: 'BRD-004',
      businessUnitId: 'BU-002',
      regionId: 'REG-APAC',
    },
    [88000, 96000, 74000, 61000, 50000, 41000, 33000, 26000, 20000, 15000],
  ),

  // MR-391..MR-400 — CMP-013 Aureon FY2025 Annual Report Launch (ended
  // 2026-03-27): the corporate favorability tracker it is measured on,
  // reported weekly against the FY2026 strategy target (KPI-030).
  ...metricBlock(
    391,
    'KPI-030',
    'brand_favorability_pct',
    {
      campaignId: 'CMP-013',
      brandId: 'BRD-001',
      businessUnitId: 'BU-003',
      regionId: 'REG-AMER',
    },
    [56.2, 56.5, 57.1, 57.4, 57.9, 58.3, 58.8, 59.2, 59.6, 60.1],
  ),
];
