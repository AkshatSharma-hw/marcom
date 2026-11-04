/**
 * What every detail page puts in its facts grid must actually resolve.
 *
 * Detail pages read a foreign key and fall back to the raw id when it does not
 * resolve — `owner?.name ?? campaign.ownerStakeholderId`. That fallback is the
 * right behaviour (an id beats a blank) but it is invisible in review: the page
 * renders, and only a reader who knows the data spots that "STK-014" is where a
 * person's name should be. This sweeps every record in every pack so a broken
 * reference fails here instead of shipping as a page that looks fine.
 *
 * It also checks the ranges and orderings the grids present as facts — a score
 * out of 100, an end date after its start, an SLA due after the request.
 */

import { describe, it, expect } from 'vitest';
import { getPackDB } from '@/data/seed';
import { campaignSpend } from '@/data/selectors/budgetSelectors';
import { segmentSize } from '@/data/selectors';

const PACKS = ['default','renewable','cloud','lifesciences'] as const;

it.each(PACKS)('detail-page derived facts audit [%s]', (pack) => {
  const db = getPackDB(pack);
  const problems: string[] = [];
  const P = (s: string) => problems.push(s);

  const has = (arr: readonly {id:string}[], id: string) => arr.some(r => r.id === id);

  // ---- FK fallbacks that would render a raw id to the user ----
  for (const c of db.campaigns) {
    if (!has(db.brands, c.brandId)) P(`Campaign ${c.id}: brandId ${c.brandId} unresolved`);
    if (!has(db.businessUnits, c.businessUnitId)) P(`Campaign ${c.id}: BU unresolved`);
    if (!has(db.stakeholders, c.ownerStakeholderId)) P(`Campaign ${c.id}: owner unresolved`);
    if (Date.parse(c.endDate) < Date.parse(c.startDate)) P(`Campaign ${c.id}: end before start`);
  }
  for (const i of db.ideas) {
    if (!has(db.brands, i.brandId)) P(`Idea ${i.id}: brand unresolved`);
    if (!has(db.regions, i.regionId)) P(`Idea ${i.id}: region unresolved`);
    if (i.score < 0 || i.score > 100) P(`Idea ${i.id}: score ${i.score} outside 0..100`);
  }
  for (const e of db.events) {
    if (!has(db.regions, e.regionId)) P(`Event ${e.id}: region unresolved`);
    if (!has(db.stakeholders, e.ownerStakeholderId)) P(`Event ${e.id}: owner unresolved`);
    if (Date.parse(e.endDate) < Date.parse(e.startDate)) P(`Event ${e.id}: end before start`);
    if (!e.venue) P(`Event ${e.id}: no venue (renders blank)`);
  }
  for (const a of db.approvals) {
    if (!has(db.workflowStages, a.workflowStageId)) P(`Approval ${a.id}: stage unresolved`);
    if (!has(db.stakeholders, a.approverStakeholderId)) P(`Approval ${a.id}: approver unresolved`);
    if (Date.parse(a.slaDueAt) < Date.parse(a.createdAt)) P(`Approval ${a.id}: SLA due before requested`);
  }
  for (const c of db.communications) {
    if (c.audienceId && !has(db.audiences, c.audienceId)) P(`Comm ${c.id}: audience unresolved`);
    if (!has(db.stakeholders, c.ownerStakeholderId)) P(`Comm ${c.id}: owner unresolved`);
  }
  for (const ag of db.agencies) {
    for (const r of ag.regionIds) if (!has(db.regions, r)) P(`Agency ${ag.id}: region ${r} unresolved`);
    if (ag.capabilities.length === 0) P(`Agency ${ag.id}: no capabilities → "None recorded"`);
  }
  for (const aud of db.audiences) {
    for (const s of aud.segmentIds) if (!has(db.segments, s)) P(`Audience ${aud.id}: segment ${s} unresolved`);
    if (aud.segmentIds.length === 0) P(`Audience ${aud.id}: no segments → population 0`);
    const total = aud.segmentIds.reduce((s, id) => s + segmentSize(db, id), 0);
    if (total === 0) P(`Audience ${aud.id}: population sums to 0`);
  }

  // ---- Agency money: allocated must never exceed the campaigns' own totals ----
  for (const ag of db.agencies) {
    const acts = db.campaignActivities.filter(a => a.agencyId === ag.id);
    const allocated = acts.reduce((s, a) => s + a.spendAllocated, 0);
    if (allocated < 0) P(`Agency ${ag.id}: negative allocation`);
    const byCampaign = new Map<string, number>();
    for (const a of acts) byCampaign.set(a.campaignId, (byCampaign.get(a.campaignId) ?? 0) + a.spendAllocated);
    for (const [cid, portion] of byCampaign) {
      const total = campaignSpend(db, cid);
      if (portion > total + 0.001) P(`Agency ${ag.id}: share of ${cid} is ${portion} of ${total} (>100%)`);
    }
  }

  // ---- Assets: the rights window AssetDetail counts days against ----
  for (const a of db.assets) {
    if (a.rightsExpiry === undefined) continue; // open-ended, and shown as such
    if (Number.isNaN(Date.parse(a.rightsExpiry))) {
      P(`Asset ${a.id}: unparseable rights expiry '${a.rightsExpiry}'`);
    } else if (Date.parse(a.rightsExpiry) < Date.parse(a.createdAt)) {
      P(`Asset ${a.id}: rights expired before the asset was added`);
    }
  }

  console.log(pack, problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no problems found');
  console.log(pack, 'counts', {
    campaigns: db.campaigns.length, ideas: db.ideas.length, events: db.events.length,
    approvals: db.approvals.length, comms: db.communications.length,
    agencies: db.agencies.length, audiences: db.audiences.length, assets: db.assets.length,
  });
  expect(problems, problems.join('\n')).toEqual([]);
});
