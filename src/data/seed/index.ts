/**
 * Seed DB assembly + referential-integrity check.
 *
 * Aggregates every seed collection (per SEED_MANIFEST.md's file → export map)
 * into a single frozen `SeedDB`. `assertAllLinksResolve` walks every foreign-key
 * field and reports dangling references; it runs automatically in dev builds.
 */

import type { EntityName, SeedDB } from '../types';
import {
  seedOrganization,
  seedBusinessUnits,
  seedBrands,
  seedRegions,
  seedStakeholders,
  seedAgencies,
} from './org';
import { seedIdeas, seedStrategies } from './strategy';
import { seedCampaigns, seedCampaignActivities, seedBriefs, seedEvents } from './campaigns';
import {
  seedCommunications,
  seedChannelExecutions,
  seedChannels,
  seedChannelConstraints,
  seedJourneys,
  seedCrisisIncidents,
} from './communications';
import { seedContents, seedContentVersions, seedAssets } from './content';
import {
  seedAudiences,
  seedSegments,
  seedSuppressionEntries,
  seedConsentSummaries,
  seedCustomerPersonas,
} from './audience';
import {
  seedWorkflows,
  seedWorkflowStages,
  seedApprovals,
  seedPolicies,
  seedNotifications,
  seedAuditRecords,
  seedAIReviews,
} from './governance';
import { seedBudgets } from './money';
import { seedKpis, seedMetricResults } from './metrics';
import { seedMediaContacts, seedCoverageItems } from './pr';
import { seedCompetitors, seedMarketTrends, seedShareOfVoice } from './market';
import { seedLifecycleStages, seedMarcomAgents } from './module';
import { seedAgentRuns } from './agentRuns';
import { seedJurisdictions, seedLegalClauses, seedGlossaryTerms } from './legal';
import {
  seedPositioningFrameworks,
  seedMessagingHouses,
  seedMarketSizings,
  seedBudgetScenarios,
} from './planning';
import { seedBenchmarks, seedPlaybookPatterns } from './benchmarks';
import { activeDemoPackId, type DemoPackId } from '@/lib/demoPack';
import { renewablePack } from './packs/renewable';
import { cloudPack } from './packs/cloud';
import { lifesciencesPack } from './packs/lifesciences';

const db: SeedDB = Object.freeze({
  org: seedOrganization,
  businessUnits: seedBusinessUnits,
  brands: seedBrands,
  regions: seedRegions,
  stakeholders: seedStakeholders,
  agencies: seedAgencies,
  ideas: seedIdeas,
  strategies: seedStrategies,
  campaigns: seedCampaigns,
  campaignActivities: seedCampaignActivities,
  briefs: seedBriefs,
  communications: seedCommunications,
  channelExecutions: seedChannelExecutions,
  channels: seedChannels,
  contents: seedContents,
  contentVersions: seedContentVersions,
  assets: seedAssets,
  audiences: seedAudiences,
  segments: seedSegments,
  workflows: seedWorkflows,
  workflowStages: seedWorkflowStages,
  approvals: seedApprovals,
  policies: seedPolicies,
  notifications: seedNotifications,
  budgets: seedBudgets,
  kpis: seedKpis,
  metricResults: seedMetricResults,
  auditRecords: seedAuditRecords,
  journeys: seedJourneys,
  events: seedEvents,
  crisisIncidents: seedCrisisIncidents,
  mediaContacts: seedMediaContacts,
  coverageItems: seedCoverageItems,
  suppressionEntries: seedSuppressionEntries,
  consentSummaries: seedConsentSummaries,
  customerPersonas: seedCustomerPersonas,
  competitors: seedCompetitors,
  marketTrends: seedMarketTrends,
  shareOfVoice: seedShareOfVoice,
  aiReviews: seedAIReviews,
  lifecycleStages: seedLifecycleStages,
  marcomAgents: seedMarcomAgents,
  agentRuns: seedAgentRuns,
  jurisdictions: seedJurisdictions,
  legalClauses: seedLegalClauses,
  glossaryTerms: seedGlossaryTerms,
  positioningFrameworks: seedPositioningFrameworks,
  messagingHouses: seedMessagingHouses,
  marketSizings: seedMarketSizings,
  budgetScenarios: seedBudgetScenarios,
  channelConstraints: seedChannelConstraints,
  benchmarks: seedBenchmarks,
  playbookPatterns: seedPlaybookPatterns,
});

/**
 * Pack selection (demo-pack spec §4.1).
 *
 * `db` above is the default pack. A build reading `VITE_DEMO_PACK=renewable`
 * loads the renewable pack instead, so a salesperson can open the world that
 * matches the prospect in front of them.
 *
 * The import is static rather than dynamic on purpose: the seed is a frozen
 * object assembled at module load and read synchronously by every selector, so
 * an async pack load would mean making the whole read path async. The cost is
 * that every pack ships in the bundle, not just the selected one — four packs
 * today. For a demo tool whose competitive point is switching industry worlds,
 * that trade is the right way round, but the cost is real and it grows linearly
 * with each pack: measure the bundle before adding a fifth.
 */
const packs: Record<DemoPackId, SeedDB> = {
  default: db,
  renewable: renewablePack,
  cloud: cloudPack,
  lifesciences: lifesciencesPack,
};

const activeDb: SeedDB = packs[activeDemoPackId()] ?? db;

/** The single, frozen seed database for the whole app, for the active pack. */
export function getSeedDB(): SeedDB {
  return activeDb;
}

/**
 * A named pack's database, whichever pack the build is running.
 *
 * Tests that assert on specific seeded records (CNT-011's finding mix, the
 * KSA→GCC→EU clause chain) must pin the pack rather than follow the active
 * one: packs share record SHAPES and STATE COVERAGE, not record content, so a
 * fixture assertion is only meaningful against the pack it was written for.
 * Shape- and integrity-level tests should keep using `getSeedDB()` so they run
 * against whichever pack is active.
 */
export function getPackDB(id: DemoPackId): SeedDB {
  return packs[id];
}

/* ------------------------------------------------------------------ */
/* Referential integrity                                               */
/* ------------------------------------------------------------------ */

/**
 * Checks every `*Id` / `*Ids` foreign-key field against its owning collection.
 * Returns a list of readable dangling-reference errors (empty = healthy).
 */
export function assertAllLinksResolve(database: SeedDB): string[] {
  const errors: string[] = [];

  const ids = (rows: { id: string }[]): Set<string> => new Set(rows.map((r) => r.id));

  const setsByEntity: Record<EntityName, Set<string>> = {
    Organization: new Set([database.org.id]),
    BusinessUnit: ids(database.businessUnits),
    Brand: ids(database.brands),
    Region: ids(database.regions),
    Stakeholder: ids(database.stakeholders),
    Agency: ids(database.agencies),
    Idea: ids(database.ideas),
    Strategy: ids(database.strategies),
    Campaign: ids(database.campaigns),
    CampaignActivity: ids(database.campaignActivities),
    Brief: ids(database.briefs),
    Communication: ids(database.communications),
    ChannelExecution: ids(database.channelExecutions),
    Channel: ids(database.channels),
    Content: ids(database.contents),
    ContentVersion: ids(database.contentVersions),
    Asset: ids(database.assets),
    Audience: ids(database.audiences),
    Segment: ids(database.segments),
    Workflow: ids(database.workflows),
    WorkflowStage: ids(database.workflowStages),
    Approval: ids(database.approvals),
    Policy: ids(database.policies),
    Notification: ids(database.notifications),
    Budget: ids(database.budgets),
    KPI: ids(database.kpis),
    MetricResult: ids(database.metricResults),
    AuditRecord: ids(database.auditRecords),
    Journey: ids(database.journeys),
    Event: ids(database.events),
    CrisisIncident: ids(database.crisisIncidents),
    MediaContact: ids(database.mediaContacts),
    CoverageItem: ids(database.coverageItems),
    SuppressionEntry: ids(database.suppressionEntries),
    ConsentSummary: ids(database.consentSummaries),
    CustomerPersona: ids(database.customerPersonas),
    Competitor: ids(database.competitors),
    AIReview: ids(database.aiReviews),
    LifecycleStage: ids(database.lifecycleStages),
    MarcomAgent: ids(database.marcomAgents),
    AgentRun: ids(database.agentRuns),
    Jurisdiction: ids(database.jurisdictions),
    LegalClause: ids(database.legalClauses),
    GlossaryTerm: ids(database.glossaryTerms),
    PositioningFramework: ids(database.positioningFrameworks),
    MessagingHouse: ids(database.messagingHouses),
    MarketSizing: ids(database.marketSizings),
    BudgetScenario: ids(database.budgetScenarios),
    ChannelConstraint: ids(database.channelConstraints),
    Benchmark: ids(database.benchmarks),
    PlaybookPattern: ids(database.playbookPatterns),
  };

  const check = (
    owner: string,
    field: string,
    value: string | undefined | null,
    entity: EntityName,
  ): void => {
    if (value === undefined || value === null) return;
    if (!setsByEntity[entity].has(value)) {
      errors.push(`${owner}.${field} → '${value}' not found in ${entity} collection`);
    }
  };

  const checkMany = (owner: string, field: string, values: string[], entity: EntityName): void => {
    values.forEach((v, i) => check(owner, `${field}[${i}]`, v, entity));
  };

  for (const bu of database.businessUnits) {
    check(`BusinessUnit ${bu.id}`, 'organizationId', bu.organizationId, 'Organization');
  }
  for (const b of database.brands) {
    check(`Brand ${b.id}`, 'organizationId', b.organizationId, 'Organization');
    check(`Brand ${b.id}`, 'parentBrandId', b.parentBrandId, 'Brand');
    checkMany(`Brand ${b.id}`, 'guardrailPolicyIds', b.guardrailPolicyIds ?? [], 'Policy');
    if (b.parentBrandId === b.id) {
      errors.push(`Brand ${b.id}.parentBrandId → '${b.parentBrandId}' is a self-reference`);
    }
  }
  for (const s of database.stakeholders) {
    check(`Stakeholder ${s.id}`, 'businessUnitId', s.businessUnitId, 'BusinessUnit');
    check(`Stakeholder ${s.id}`, 'regionId', s.regionId, 'Region');
    checkMany(`Stakeholder ${s.id}`, 'brandIds', s.brandIds, 'Brand');
    check(`Stakeholder ${s.id}`, 'agencyId', s.agencyId, 'Agency');
  }
  for (const a of database.agencies) {
    checkMany(`Agency ${a.id}`, 'regionIds', a.regionIds, 'Region');
  }
  for (const i of database.ideas) {
    check(`Idea ${i.id}`, 'brandId', i.brandId, 'Brand');
    check(`Idea ${i.id}`, 'businessUnitId', i.businessUnitId, 'BusinessUnit');
    check(`Idea ${i.id}`, 'regionId', i.regionId, 'Region');
    check(`Idea ${i.id}`, 'promotedToCampaignId', i.promotedToCampaignId, 'Campaign');
  }
  for (const s of database.strategies) {
    check(`Strategy ${s.id}`, 'businessUnitId', s.businessUnitId, 'BusinessUnit');
    checkMany(`Strategy ${s.id}`, 'kpiIds', s.kpiIds, 'KPI');
  }
  for (const c of database.campaigns) {
    const owner = `Campaign ${c.id}`;
    check(owner, 'strategyId', c.strategyId, 'Strategy');
    check(owner, 'ideaId', c.ideaId, 'Idea');
    check(owner, 'brandId', c.brandId, 'Brand');
    check(owner, 'businessUnitId', c.businessUnitId, 'BusinessUnit');
    checkMany(owner, 'regionIds', c.regionIds, 'Region');
    check(owner, 'ownerStakeholderId', c.ownerStakeholderId, 'Stakeholder');
    checkMany(owner, 'kpiIds', c.kpiIds, 'KPI');
    check(owner, 'workflowId', c.workflowId, 'Workflow');
  }
  for (const a of database.campaignActivities) {
    const owner = `CampaignActivity ${a.id}`;
    check(owner, 'campaignId', a.campaignId, 'Campaign');
    check(owner, 'channelId', a.channelId, 'Channel');
    check(owner, 'agencyId', a.agencyId, 'Agency');
    check(owner, 'ownerStakeholderId', a.ownerStakeholderId, 'Stakeholder');
  }
  for (const b of database.briefs) {
    const owner = `Brief ${b.id}`;
    check(owner, 'campaignId', b.campaignId, 'Campaign');
    check(owner, 'campaignActivityId', b.campaignActivityId, 'CampaignActivity');
    check(owner, 'authorStakeholderId', b.authorStakeholderId, 'Stakeholder');
    check(owner, 'approvalId', b.approvalId, 'Approval');
  }
  for (const c of database.communications) {
    const owner = `Communication ${c.id}`;
    check(owner, 'campaignActivityId', c.campaignActivityId, 'CampaignActivity');
    check(owner, 'audienceId', c.audienceId, 'Audience');
    check(owner, 'contentId', c.contentId, 'Content');
    check(owner, 'ownerStakeholderId', c.ownerStakeholderId, 'Stakeholder');
  }
  for (const x of database.channelExecutions) {
    const owner = `ChannelExecution ${x.id}`;
    check(owner, 'communicationId', x.communicationId, 'Communication');
    check(owner, 'channelId', x.channelId, 'Channel');
    check(owner, 'contentVersionId', x.contentVersionId, 'ContentVersion');
  }
  for (const ch of database.channels) {
    checkMany(`Channel ${ch.id}`, 'regionIds', ch.regionIds, 'Region');
    check(`Channel ${ch.id}`, 'ownerStakeholderId', ch.ownerStakeholderId, 'Stakeholder');
  }
  for (const c of database.contents) {
    const owner = `Content ${c.id}`;
    check(owner, 'briefId', c.briefId, 'Brief');
    check(owner, 'campaignId', c.campaignId, 'Campaign');
    check(owner, 'brandId', c.brandId, 'Brand');
    check(owner, 'ownerStakeholderId', c.ownerStakeholderId, 'Stakeholder');
    check(owner, 'currentVersionId', c.currentVersionId, 'ContentVersion');
    check(owner, 'workflowId', c.workflowId, 'Workflow');
  }
  for (const v of database.contentVersions) {
    const owner = `ContentVersion ${v.id}`;
    check(owner, 'contentId', v.contentId, 'Content');
    check(owner, 'approvalId', v.approvalId, 'Approval');
    check(owner, 'regionId', v.regionId, 'Region');
    checkMany(owner, 'assetIds', v.assetIds ?? [], 'Asset');
    if (v.provenance) {
      check(
        owner,
        'provenance.derivedFromVersionId',
        v.provenance.derivedFromVersionId,
        'ContentVersion',
      );
      check(owner, 'provenance.personaId', v.provenance.personaId, 'CustomerPersona');
      check(owner, 'provenance.channelId', v.provenance.channelId, 'Channel');
      if (v.provenance.derivedFromVersionId === v.id) {
        errors.push(`${owner}.provenance.derivedFromVersionId → '${v.id}' is a self-reference`);
      }
    }
  }
  for (const a of database.assets) {
    check(`Asset ${a.id}`, 'brandId', a.brandId, 'Brand');
  }
  for (const a of database.audiences) {
    checkMany(`Audience ${a.id}`, 'segmentIds', a.segmentIds, 'Segment');
    checkMany(`Audience ${a.id}`, 'regionIds', a.regionIds, 'Region');
  }
  for (const w of database.workflows) {
    checkMany(`Workflow ${w.id}`, 'stageIds', w.stageIds, 'WorkflowStage');
  }
  for (const s of database.workflowStages) {
    check(`WorkflowStage ${s.id}`, 'workflowId', s.workflowId, 'Workflow');
  }
  for (const a of database.approvals) {
    const owner = `Approval ${a.id}`;
    check(owner, 'subjectId', a.subjectId, a.subjectEntity);
    check(owner, 'subjectVersionId', a.subjectVersionId, 'ContentVersion');
    check(owner, 'workflowStageId', a.workflowStageId, 'WorkflowStage');
    check(owner, 'approverStakeholderId', a.approverStakeholderId, 'Stakeholder');
  }
  for (const n of database.notifications) {
    const owner = `Notification ${n.id}`;
    check(owner, 'recipientStakeholderId', n.recipientStakeholderId, 'Stakeholder');
    check(owner, 'subjectId', n.subjectId, n.subjectEntity);
  }
  for (const r of database.auditRecords) {
    const owner = `AuditRecord ${r.id}`;
    check(owner, 'actorStakeholderId', r.actorStakeholderId, 'Stakeholder');
    check(owner, 'entityId', r.entityId, r.entityType);
  }
  for (const b of database.budgets) {
    const owner = `Budget ${b.id}`;
    check(owner, 'businessUnitId', b.businessUnitId, 'BusinessUnit');
    b.allocations.forEach((alloc, i) =>
      check(owner, `allocations[${i}].campaignId`, alloc.campaignId, 'Campaign'),
    );
  }
  for (const k of database.kpis) {
    const owner = `KPI ${k.id}`;
    check(owner, 'attachedTo.strategyId', k.attachedTo.strategyId, 'Strategy');
    check(owner, 'attachedTo.campaignId', k.attachedTo.campaignId, 'Campaign');
  }
  for (const m of database.metricResults) {
    const owner = `MetricResult ${m.id}`;
    check(owner, 'kpiId', m.kpiId, 'KPI');
    check(owner, 'dimensions.campaignId', m.dimensions.campaignId, 'Campaign');
    check(owner, 'dimensions.communicationId', m.dimensions.communicationId, 'Communication');
    check(owner, 'dimensions.channelId', m.dimensions.channelId, 'Channel');
    check(owner, 'dimensions.brandId', m.dimensions.brandId, 'Brand');
    check(owner, 'dimensions.businessUnitId', m.dimensions.businessUnitId, 'BusinessUnit');
    check(owner, 'dimensions.regionId', m.dimensions.regionId, 'Region');
  }

  for (const j of database.journeys) {
    const owner = `Journey ${j.id}`;
    check(owner, 'audienceId', j.audienceId, 'Audience');
    const nodeIds = new Set(j.nodes.map((n) => n.id));
    for (const n of j.nodes) {
      const nodeOwner = `${owner} node ${n.id}`;
      check(nodeOwner, 'config.audienceId', n.config?.audienceId, 'Audience');
      check(nodeOwner, 'config.segmentId', n.config?.segmentId, 'Segment');
      check(nodeOwner, 'config.communicationId', n.config?.communicationId, 'Communication');
    }
    j.edges.forEach((e, i) => {
      if (!nodeIds.has(e.from)) {
        errors.push(`${owner}.edges[${i}].from → '${e.from}' not found in journey nodes`);
      }
      if (!nodeIds.has(e.to)) {
        errors.push(`${owner}.edges[${i}].to → '${e.to}' not found in journey nodes`);
      }
    });
  }
  for (const e of database.events) {
    const owner = `Event ${e.id}`;
    check(owner, 'campaignId', e.campaignId, 'Campaign');
    check(owner, 'regionId', e.regionId, 'Region');
    check(owner, 'ownerStakeholderId', e.ownerStakeholderId, 'Stakeholder');
  }
  for (const c of database.crisisIncidents) {
    const owner = `CrisisIncident ${c.id}`;
    check(owner, 'holdingStatementContentId', c.holdingStatementContentId, 'Content');
    checkMany(owner, 'warRoomStakeholderIds', c.warRoomStakeholderIds, 'Stakeholder');
    checkMany(owner, 'affectedBrandIds', c.affectedBrandIds, 'Brand');
    checkMany(owner, 'affectedRegionIds', c.affectedRegionIds, 'Region');
  }
  for (const m of database.mediaContacts) {
    check(`MediaContact ${m.id}`, 'regionId', m.regionId, 'Region');
  }
  for (const cov of database.coverageItems) {
    const owner = `CoverageItem ${cov.id}`;
    check(owner, 'mediaContactId', cov.mediaContactId, 'MediaContact');
    check(owner, 'campaignId', cov.campaignId, 'Campaign');
    check(owner, 'communicationId', cov.communicationId, 'Communication');
  }
  for (const s of database.suppressionEntries) {
    const owner = `SuppressionEntry ${s.id}`;
    check(owner, 'audienceId', s.audienceId, 'Audience');
    check(owner, 'addedByStakeholderId', s.addedByStakeholderId, 'Stakeholder');
  }
  for (const cs of database.consentSummaries) {
    check(`ConsentSummary ${cs.id}`, 'segmentId', cs.segmentId, 'Segment');
  }
  for (const p of database.customerPersonas) {
    check(`CustomerPersona ${p.id}`, 'audienceId', p.audienceId, 'Audience');
  }
  for (const cpt of database.competitors) {
    checkMany(`Competitor ${cpt.id}`, 'focusBrandIds', cpt.focusBrandIds, 'Brand');
  }
  for (const t of database.marketTrends) {
    check(`MarketTrend ${t.id}`, 'businessUnitId', t.businessUnitId, 'BusinessUnit');
  }
  for (const sov of database.shareOfVoice) {
    check(`ShareOfVoice ${sov.id}`, 'brandId', sov.brandId, 'Brand');
  }
  for (const r of database.aiReviews) {
    const owner = `AIReview ${r.id}`;
    check(owner, 'subjectId', r.subjectId, r.subjectEntity);
    check(owner, 'subjectVersionId', r.subjectVersionId, 'ContentVersion');
    check(owner, 'ranByStakeholderId', r.ranByStakeholderId, 'Stakeholder');
    r.findings.forEach((f, i) => check(owner, `findings[${i}].policyId`, f.policyId, 'Policy'));
    if (r.context) {
      checkMany(owner, 'context.jurisdictionIds', r.context.jurisdictionIds, 'Jurisdiction');
      checkMany(owner, 'context.regionIds', r.context.regionIds, 'Region');
      checkMany(owner, 'context.requiredClauseIds', r.context.requiredClauseIds, 'LegalClause');
    }
  }

  /* --- Operating model ------------------------------------------- */
  const stageKeys = new Set(database.lifecycleStages.map((s) => s.key as string));
  for (const s of database.lifecycleStages) {
    checkMany(`LifecycleStage ${s.id}`, 'owningAgentIds', s.owningAgentIds, 'MarcomAgent');
  }
  for (const a of database.marcomAgents) {
    // `surfaces[].to` holds router paths, not entity ids — deliberately not
    // resolved here; route validity is App.tsx's contract, not the seed's.
    a.stageKeys.forEach((k, i) => {
      if (!stageKeys.has(k)) {
        errors.push(
          `MarcomAgent ${a.id}.stageKeys[${i}] → '${k}' not found in LifecycleStage keys`,
        );
      }
    });
  }

  /* --- Agent execution ledger -------------------------------------- */
  /**
   * Three things have to hold for a run to be evidence rather than decoration:
   * it ran a real agent, against a real record, and — if it claims to have made
   * something — that something exists AND genuinely carries agent provenance.
   * The last check is the one that matters: without it a run could claim credit
   * for a version a person wrote by hand, and no link check would notice.
   */
  const agentProvenanceSources = new Set(['ai-draft', 'variant', 'refinement', 'localization']);
  for (const r of database.agentRuns) {
    const owner = `AgentRun ${r.id}`;
    check(owner, 'agentId', r.agentId, 'MarcomAgent');
    check(owner, 'subjectId', r.subjectId, r.subjectEntity);
    check(owner, 'triggeredByStakeholderId', r.triggeredByStakeholderId, 'Stakeholder');

    if (r.producedEntity !== undefined || r.producedId !== undefined) {
      if (r.producedEntity === undefined || r.producedId === undefined) {
        errors.push(
          `${owner} sets only one of producedEntity/producedId — a produced record needs both`,
        );
      } else {
        check(owner, 'producedId', r.producedId, r.producedEntity);
        if (r.producedEntity === 'ContentVersion') {
          const version = database.contentVersions.find((v) => v.id === r.producedId);
          const source = version?.provenance?.source;
          if (version && (source === undefined || !agentProvenanceSources.has(source))) {
            errors.push(
              `${owner}.producedId → '${r.producedId}' carries no agent provenance, so the run cannot claim to have produced it`,
            );
          }
        }
      }
    }

    if (r.status === 'failed' && !r.error) {
      errors.push(`${owner} is 'failed' with no error — a failure must say why it failed`);
    }
    if (r.status === 'succeeded' && !r.finishedAt) {
      errors.push(`${owner} is 'succeeded' with no finishedAt`);
    }
    if ((r.status === 'queued' || r.status === 'running') && r.finishedAt) {
      errors.push(`${owner} is '${r.status}' but carries a finishedAt`);
    }
    if (r.finishedAt && r.finishedAt < r.startedAt) {
      errors.push(`${owner}.finishedAt '${r.finishedAt}' precedes startedAt '${r.startedAt}'`);
    }
    if (r.confidence !== undefined && (r.confidence < 0 || r.confidence > 1)) {
      errors.push(`${owner}.confidence '${r.confidence}' is outside 0–1`);
    }
  }

  /* --- Legal & language ------------------------------------------- */
  for (const j of database.jurisdictions) {
    checkMany(`Jurisdiction ${j.id}`, 'regionIds', j.regionIds, 'Region');
  }
  for (const c of database.legalClauses) {
    const owner = `LegalClause ${c.id}`;
    check(owner, 'jurisdictionId', c.jurisdictionId, 'Jurisdiction');
    check(owner, 'supersedesId', c.supersedesId, 'LegalClause');
    if (c.supersedesId === c.id) {
      errors.push(`${owner}.supersedesId → '${c.supersedesId}' is a self-reference`);
    }
  }

  /* --- Planning, benchmarks & playbook (wave C) -------------------- */
  for (const h of database.messagingHouses) {
    check(`MessagingHouse ${h.id}`, 'strategyId', h.strategyId, 'Strategy');
  }
  for (const s of database.marketSizings) {
    check(`MarketSizing ${s.id}`, 'businessUnitId', s.businessUnitId, 'BusinessUnit');
  }
  for (const s of database.budgetScenarios) {
    check(`BudgetScenario ${s.id}`, 'campaignId', s.campaignId, 'Campaign');
  }
  for (const c of database.channelConstraints) {
    check(`ChannelConstraint ${c.id}`, 'channelId', c.channelId, 'Channel');
  }
  for (const p of database.playbookPatterns) {
    checkMany(
      `PlaybookPattern ${p.id}`,
      'evidenceCampaignIds',
      p.evidenceCampaignIds,
      'Campaign',
    );
  }

  return errors;
}

/* Run the integrity check at module load in dev builds only.
 *
 * Against `activeDb`, not `db`: the point of the check is to warn about the
 * graph the running app is actually reading. Checking the default pack while
 * a build served `VITE_DEMO_PACK=cloud` would report a clean bill of health
 * for data that was never loaded — the one case the warning exists for. */
if (import.meta.env?.DEV) {
  const problems = assertAllLinksResolve(activeDb);
  if (problems.length > 0) {
    console.error(
      `[seed] ${problems.length} dangling reference(s) found in the '${activeDemoPackId()}' seed graph:`,
      problems,
    );
  }
}
