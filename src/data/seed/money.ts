/**
 * Seed data — budgets.
 * Conforms to SEED_MANIFEST.md §26 (allocation sums stay below amountPlanned per BU).
 */

import type { Budget } from '../types';

export const seedBudgets: Budget[] = [
  {
    id: 'BUD-001',
    name: 'FY2026 Consumer Marketing',
    fiscalYear: 'FY2026',
    businessUnitId: 'BU-001',
    amountPlanned: 2600000,
    // Sum 2355000 < 2600000 (headroom 245000)
    allocations: [
      { campaignId: 'CMP-001', amount: 180000 },
      { campaignId: 'CMP-002', amount: 220000 },
      { campaignId: 'CMP-003', amount: 450000 },
      { campaignId: 'CMP-006', amount: 120000 },
      { campaignId: 'CMP-007', amount: 380000 },
      { campaignId: 'CMP-008', amount: 240000 },
      { campaignId: 'CMP-011', amount: 165000 },
      { campaignId: 'CMP-014', amount: 260000 },
      { campaignId: 'CMP-017', amount: 145000 },
      { campaignId: 'CMP-019', amount: 195000 },
    ],
    createdAt: '2025-12-10T09:00:00Z',
    updatedAt: '2026-08-12T10:40:00Z',
  },
  {
    id: 'BUD-002',
    name: 'FY2026 Enterprise Marketing',
    fiscalYear: 'FY2026',
    businessUnitId: 'BU-002',
    amountPlanned: 950000,
    // Sum 850000 < 950000 (headroom 100000)
    allocations: [
      { campaignId: 'CMP-004', amount: 150000 },
      { campaignId: 'CMP-009', amount: 185000 },
      { campaignId: 'CMP-012', amount: 130000 },
      { campaignId: 'CMP-015', amount: 175000 },
      { campaignId: 'CMP-018', amount: 210000 },
    ],
    createdAt: '2025-12-10T09:05:00Z',
    updatedAt: '2026-08-12T15:45:00Z',
  },
  {
    id: 'BUD-003',
    name: 'FY2026 Corporate Comms',
    fiscalYear: 'FY2026',
    businessUnitId: 'BU-003',
    amountPlanned: 380000,
    // Sum 320000 < 380000 (headroom 60000)
    allocations: [
      { campaignId: 'CMP-005', amount: 60000 },
      { campaignId: 'CMP-010', amount: 95000 },
      { campaignId: 'CMP-013', amount: 70000 },
      { campaignId: 'CMP-016', amount: 55000 },
      { campaignId: 'CMP-020', amount: 40000 },
    ],
    createdAt: '2025-12-10T09:10:00Z',
    updatedAt: '2026-08-12T13:15:00Z',
  },
];
