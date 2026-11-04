/**
 * Org backbone seed — Organization, BusinessUnits, Brands, Regions,
 * Stakeholders, Agencies. Ids and cross-references are binding per
 * SEED_MANIFEST.md sections 1–6.
 */

import type {
  Organization,
  BusinessUnit,
  Brand,
  Region,
  Stakeholder,
  Agency,
} from '../types';

/* ------------------------------------------------------------------ */
/* 1. Organization                                                     */
/* ------------------------------------------------------------------ */

export const seedOrganization: Organization = {
  id: 'ORG-001',
  name: 'Aureon Group',
  createdAt: '2025-11-03T09:00:00Z',
  updatedAt: '2026-01-12T10:30:00Z',
};

/* ------------------------------------------------------------------ */
/* 2. BusinessUnits                                                    */
/* ------------------------------------------------------------------ */

export const seedBusinessUnits: BusinessUnit[] = [
  {
    id: 'BU-001',
    name: 'Consumer Devices',
    organizationId: 'ORG-001',
    createdAt: '2025-11-03T09:15:00Z',
    updatedAt: '2026-01-12T10:30:00Z',
  },
  {
    id: 'BU-002',
    name: 'Enterprise Solutions',
    organizationId: 'ORG-001',
    createdAt: '2025-11-03T09:15:00Z',
    updatedAt: '2026-01-12T10:30:00Z',
  },
  {
    id: 'BU-003',
    name: 'Corporate Affairs',
    organizationId: 'ORG-001',
    createdAt: '2025-11-03T09:15:00Z',
    updatedAt: '2026-01-12T10:30:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* 3. Brands                                                           */
/* ------------------------------------------------------------------ */

export const seedBrands: Brand[] = [
  {
    id: 'BRD-001',
    name: 'Aureon',
    organizationId: 'ORG-001',
    tone: 'Assured and plain-spoken — the corporate voice: precise claims, no hype, always sentence case.',
    guardrailPolicyIds: ['POL-001', 'POL-003'],
    logoDescription:
      'Wordmark "AUREON" in a wide sans-serif with a thin gold rule under the initial A.',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Aureon Navy', value: '#0b1f3a', cmyk: '100 / 78 / 38 / 30', pantone: 'PANTONE 282 C' },
      { name: 'Signal Gold', value: '#c9a227', cmyk: '18 / 32 / 100 / 3', pantone: 'PANTONE 111 C' },
      { name: 'Cloud Grey', value: '#e8eaed', cmyk: '6 / 4 / 3 / 0', pantone: 'PANTONE 656 C' },
      { name: 'Ink', value: '#14181f', cmyk: '78 / 66 / 55 / 66', pantone: 'PANTONE Neutral Black C' },
    ],
    typography: 'Source Sans 3 — open sans-serif; serif accents (Lora) for executive letters.',
    imageryGuidelines:
      'Architectural and workplace photography, natural light, wide compositions; people shown mid-task, never posed at camera.',
    clearSpaceRule:
      'Clear space on all four sides equals the cap height of the "A" in the wordmark. Nothing — rules, imagery, other logos — enters that zone.',
    minSizeRule: 'Minimum reproduction width: 120px on screen, 32mm in print. Below that, use the A monogram alone.',
    createdAt: '2025-11-03T09:30:00Z',
    updatedAt: '2026-02-02T14:00:00Z',
  },
  {
    id: 'BRD-002',
    name: 'Solara',
    organizationId: 'ORG-001',
    tone: 'Warm and practical — consumer lifestyle voice focused on everyday benefit, never technical jargon.',
    guardrailPolicyIds: ['POL-001', 'POL-004'],
    logoDescription:
      'Lowercase "solara" wordmark with a rising half-sun dot over the final a, rendered in coral.',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Solara Coral', value: '#ff6f61', cmyk: '0 / 68 / 58 / 0', pantone: 'PANTONE 178 C' },
      { name: 'Morning Cream', value: '#fff4e6', cmyk: '0 / 4 / 10 / 0', pantone: 'PANTONE 9184 C' },
      { name: 'Leaf', value: '#4c9a2a', cmyk: '73 / 21 / 100 / 5', pantone: 'PANTONE 363 C' },
    ],
    typography: 'Poppins — geometric sans; friendly rounded weights only (Regular/Medium).',
    imageryGuidelines:
      'Warm home-life scenes at golden hour; devices in real hands; no studio white-box shots.',
    clearSpaceRule:
      'Clear space equals the diameter of the sun-dot on all sides; double it when the endorsement lockup with the Aureon wordmark is used.',
    minSizeRule: 'Minimum reproduction width: 96px on screen, 25mm in print. The sun-dot must stay legible at size.',
    // Endorsed sub-brand: Solara inherits Aureon's corporate guardrails and adds
    // its own consumer voice on top. Volt and GridWorks are deliberately
    // standalone, so only one brand carries a parent here.
    parentBrandId: 'BRD-001',
    createdAt: '2025-11-03T09:30:00Z',
    updatedAt: '2026-03-16T11:20:00Z',
  },
  {
    id: 'BRD-003',
    name: 'Volt',
    organizationId: 'ORG-001',
    tone: 'Bold and direct — challenger voice with short sentences and concrete performance claims, each substantiated.',
    guardrailPolicyIds: ['POL-001', 'POL-002'],
    logoDescription:
      'Angular "VOLT" lettermark with a lightning-cut through the O, electric blue on near-black.',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Volt Blue', value: '#2f6bff', cmyk: '81 / 58 / 0 / 0', pantone: 'PANTONE 2727 C' },
      { name: 'Charge Yellow', value: '#ffd60a', cmyk: '0 / 12 / 96 / 0', pantone: 'PANTONE 108 C' },
      { name: 'Carbon', value: '#101114', cmyk: '73 / 66 / 62 / 71', pantone: 'PANTONE Black 6 C' },
      { name: 'White', value: '#ffffff', cmyk: '0 / 0 / 0 / 0', pantone: 'PANTONE White' },
    ],
    typography: 'Barlow Condensed — tight industrial sans; all-caps headlines, sentence-case body.',
    imageryGuidelines:
      'High-contrast product hero shots on dark backgrounds; motion blur allowed; renders only from the approved asset pool (POL-001).',
    clearSpaceRule:
      'Clear space equals the width of the lightning-cut on all sides. The lettermark never sits directly on product photography without a scrim.',
    minSizeRule: 'Minimum reproduction width: 80px on screen, 20mm in print. Never reproduce the lightning-cut below 20mm — it fills in.',
    createdAt: '2025-11-03T09:30:00Z',
    updatedAt: '2026-05-04T08:45:00Z',
  },
  {
    id: 'BRD-004',
    name: 'GridWorks',
    organizationId: 'ORG-001',
    tone: 'Expert and measured — enterprise B2B voice, evidence-led, compliance-reviewed claims only.',
    guardrailPolicyIds: ['POL-002', 'POL-003'],
    logoDescription:
      'Stacked "GridWorks" wordmark beside a 3x3 node-grid glyph with one highlighted teal node.',
    // Brand DATA (swatch values), exempt from the UI no-hex rule.
    colorPalette: [
      { name: 'Grid Teal', value: '#0f766e', cmyk: '87 / 33 / 55 / 14', pantone: 'PANTONE 3288 C' },
      { name: 'Slate', value: '#334155', cmyk: '75 / 60 / 42 / 22', pantone: 'PANTONE 7545 C' },
      { name: 'Mist', value: '#f1f5f9', cmyk: '4 / 2 / 1 / 0', pantone: 'PANTONE 11-4201 TCX' },
    ],
    typography:
      'Engineered grotesque sans for headings and body; a monospaced companion face for data callouts.',
    imageryGuidelines:
      'Infrastructure and data-center photography with cool color grading; abstract network diagrams over gradients; no stock handshake imagery.',
    clearSpaceRule:
      'Clear space equals one grid node (one ninth of the glyph width) on all sides; the wordmark and glyph never separate in the primary lockup.',
    minSizeRule: 'Minimum reproduction width: 110px on screen, 30mm in print. Below 30mm use the node-grid glyph without the wordmark.',
    createdAt: '2025-11-03T09:30:00Z',
    updatedAt: '2026-04-08T13:10:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* 4. Regions                                                          */
/* ------------------------------------------------------------------ */

export const seedRegions: Region[] = [
  {
    id: 'REG-AMER',
    name: 'Americas',
    code: 'AMER',
    createdAt: '2025-11-03T09:45:00Z',
    updatedAt: '2025-11-03T09:45:00Z',
  },
  {
    id: 'REG-EMEA',
    name: 'Europe, Middle East & Africa',
    code: 'EMEA',
    createdAt: '2025-11-03T09:45:00Z',
    updatedAt: '2025-11-03T09:45:00Z',
  },
  {
    id: 'REG-APAC',
    name: 'Asia Pacific',
    code: 'APAC',
    createdAt: '2025-11-03T09:45:00Z',
    updatedAt: '2025-11-03T09:45:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* 5. Stakeholders (one per persona + Platform Admin)                  */
/* ------------------------------------------------------------------ */

const ALL_BRANDS = ['BRD-001', 'BRD-002', 'BRD-003', 'BRD-004'];

export const seedStakeholders: Stakeholder[] = [
  {
    id: 'STK-001',
    name: 'Alexandra Reyes',
    role: 'CMO',
    businessUnitId: 'BU-003',
    regionId: 'REG-AMER',
    brandIds: ALL_BRANDS,
    email: 'alexandra.reyes@aureon.com',
    avatar: 'AR',
    createdAt: '2025-11-10T08:00:00Z',
    updatedAt: '2026-06-02T09:15:00Z',
  },
  {
    id: 'STK-002',
    name: 'Daniel Okafor',
    role: 'Corporate Comms Manager',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    brandIds: ['BRD-001'],
    email: 'daniel.okafor@aureon.com',
    avatar: 'DO',
    createdAt: '2025-11-10T08:05:00Z',
    updatedAt: '2026-05-19T10:40:00Z',
  },
  {
    id: 'STK-003',
    name: 'Sofia Marin',
    role: 'Content Manager',
    businessUnitId: 'BU-001',
    regionId: 'REG-AMER',
    brandIds: ['BRD-002', 'BRD-003'],
    email: 'sofia.marin@aureon.com',
    avatar: 'SM',
    createdAt: '2025-11-10T08:10:00Z',
    updatedAt: '2026-07-01T15:25:00Z',
  },
  {
    id: 'STK-004',
    name: 'Maya Chen',
    role: 'Campaign Manager',
    businessUnitId: 'BU-001',
    regionId: 'REG-EMEA',
    brandIds: ['BRD-002', 'BRD-003'],
    email: 'maya.chen@aureon.com',
    avatar: 'MC',
    createdAt: '2025-11-10T08:15:00Z',
    updatedAt: '2026-07-22T12:00:00Z',
  },
  {
    id: 'STK-005',
    name: 'Jonas Weber',
    role: 'Brand Manager',
    businessUnitId: 'BU-001',
    regionId: 'REG-EMEA',
    brandIds: ['BRD-003'],
    email: 'jonas.weber@aureon.com',
    avatar: 'JW',
    createdAt: '2025-11-10T08:20:00Z',
    updatedAt: '2026-06-15T09:50:00Z',
  },
  {
    id: 'STK-006',
    name: 'Aisha Bello',
    role: 'PR Manager',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    brandIds: ['BRD-001', 'BRD-003'],
    email: 'aisha.bello@aureon.com',
    avatar: 'AB',
    createdAt: '2025-11-10T08:25:00Z',
    updatedAt: '2026-06-20T16:30:00Z',
  },
  {
    id: 'STK-007',
    name: 'Tom Alvarez',
    role: 'Internal Comms Manager',
    businessUnitId: 'BU-003',
    regionId: 'REG-AMER',
    brandIds: ['BRD-001'],
    email: 'tom.alvarez@aureon.com',
    avatar: 'TA',
    createdAt: '2025-11-10T08:30:00Z',
    updatedAt: '2026-07-15T09:00:00Z',
  },
  {
    id: 'STK-008',
    name: 'Ingrid Halvorsen',
    role: 'Legal/Compliance Reviewer',
    businessUnitId: 'BU-003',
    regionId: 'REG-EMEA',
    brandIds: ALL_BRANDS,
    email: 'ingrid.halvorsen@aureon.com',
    avatar: 'IH',
    createdAt: '2025-11-10T08:35:00Z',
    updatedAt: '2026-05-28T11:10:00Z',
  },
  {
    id: 'STK-009',
    name: 'Richard Yamamoto',
    role: 'Executive',
    businessUnitId: 'BU-003',
    regionId: 'REG-AMER',
    brandIds: ALL_BRANDS,
    email: 'richard.yamamoto@aureon.com',
    avatar: 'RY',
    createdAt: '2025-11-10T08:40:00Z',
    updatedAt: '2026-04-30T14:45:00Z',
  },
  {
    id: 'STK-010',
    name: 'Lena Kovacs',
    role: 'Agency User',
    businessUnitId: 'BU-001',
    regionId: 'REG-EMEA',
    brandIds: ['BRD-003'],
    email: 'lena.kovacs@brightnorth.agency',
    avatar: 'LK',
    // Explicit agency join — Bright North Creative executes ACT-001/ACT-007
    agencyId: 'AGY-001',
    createdAt: '2026-02-17T09:00:00Z',
    updatedAt: '2026-06-05T10:20:00Z',
  },
  {
    id: 'STK-011',
    name: 'Sam Whitfield',
    role: 'Platform Admin',
    businessUnitId: 'BU-003',
    regionId: 'REG-AMER',
    brandIds: ALL_BRANDS,
    email: 'sam.whitfield@aureon.com',
    avatar: 'SW',
    createdAt: '2025-11-03T10:00:00Z',
    updatedAt: '2026-03-09T08:30:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* 6. Agencies                                                         */
/* ------------------------------------------------------------------ */

export const seedAgencies: Agency[] = [
  {
    id: 'AGY-001',
    name: 'Bright North Creative',
    capabilities: ['creative', 'film', 'social'],
    regionIds: ['REG-EMEA'],
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-06-01T11:00:00Z',
  },
  {
    id: 'AGY-002',
    name: 'Mediaform Partners',
    capabilities: ['media-buying', 'paid-social'],
    regionIds: ['REG-APAC', 'REG-AMER'],
    createdAt: '2026-03-02T09:00:00Z',
    updatedAt: '2026-05-20T13:40:00Z',
  },
];
