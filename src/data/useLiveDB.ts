/**
 * Live SeedDB view — the single read-side data layer for the app.
 *
 * The frozen seed (`getSeedDB()`) is the shipped dataset; the DataStore holds
 * runtime mutations (promote idea → campaign, approvals, uploads, …) keyed by
 * collection id. Before this hook existed, read surfaces rendered the frozen
 * seed while write surfaces mutated the store — a split-brain where a promoted
 * campaign never appeared on the Command Center or Campaign list.
 *
 * `useLiveDB()` returns a SeedDB-shaped object where every collection that has
 * runtime mutations comes from the DataStore (via the exact same collection ids
 * the write surfaces register) and every static collection comes from the
 * frozen seed. Read surfaces use this; write surfaces keep their own
 * `useCollection` handles — same ids, same store, so the same records flow
 * everywhere.
 *
 * Collection id → seed mapping (MUST match every existing `useCollection`
 * call site — grep `useCollection('` before adding or renaming ids):
 *
 *   "campaigns"          seedCampaigns          IdeationHub, AdminPage
 *   "briefs"             seedBriefs             IdeationHub (promote), ApprovalsInbox
 *   "ideas"              seedIdeas              IdeationHub
 *   "approvals"          seedApprovals          ApprovalsInbox
 *   "communications"     seedCommunications     CommunicationsPage, InternalCommsPage, GovernancePage
 *   "channelExecutions"  seedChannelExecutions  GovernancePage
 *   "contentVersions"    seedContentVersions    ContentDetail
 *   "contents"           seedContents           AdminPage
 *   "assets"             seedAssets             AssetLibrary
 *   "journeys"           seedJourneys           JourneysChannels
 *   "workflows"          seedWorkflows          WorkflowDesigner, GovernancePage
 *   "workflowStages"     seedWorkflowStages     WorkflowDesigner, GovernancePage
 *   "crisisIncidents"    seedCrisisIncidents    GovernancePage
 *   "customerPersonas"   seedCustomerPersonas   AudiencesPage (persona refresh)
 *   "suppressionEntries" seedSuppressionEntries AudiencesPage
 *   "notifications"      seedNotifications      NotificationPopover
 *   "brands"             seedBrands             (Wave 2+3 brand center)
 *   "aiReviews"          seedAIReviews (empty)  (Wave 2+3 AI review runs)
 *   "budgets"            seedBudgets            BudgetPage
 *   "legalClauses"       seedLegalClauses       (clause library — authored at runtime)
 *   "glossaryTerms"      seedGlossaryTerms      (lexicon — authored at runtime)
 *
 * The rest of the wave-A additions (`lifecycleStages`, `marcomAgents`,
 * `jurisdictions`) are read-only reference data: they describe the operating
 * model and the legal territories, and nothing in the app writes them, so they
 * stay on the frozen seed.
 */

import { useMemo } from "react";

import { getSeedDB } from "./seed";
import { seedBrands } from "./seed/org";
import { seedBriefs, seedCampaigns } from "./seed/campaigns";
import { seedIdeas } from "./seed/strategy";
import {
  seedCommunications,
  seedChannelExecutions,
  seedJourneys,
  seedCrisisIncidents,
} from "./seed/communications";
import { seedContents, seedContentVersions, seedAssets } from "./seed/content";
import { seedCustomerPersonas, seedSuppressionEntries } from "./seed/audience";
import { seedBudgets } from "./seed/money";
import { seedLegalClauses, seedGlossaryTerms } from "./seed/legal";
import {
  seedWorkflows,
  seedWorkflowStages,
  seedApprovals,
  seedNotifications,
  seedAIReviews,
} from "./seed/governance";
import type {
  AIReview,
  Approval,
  Asset,
  Brand,
  Brief,
  Budget,
  Campaign,
  ChannelExecution,
  Communication,
  Content,
  ContentVersion,
  CrisisIncident,
  GlossaryTerm,
  Idea,
  Journey,
  LegalClause,
  Notification,
  SeedDB,
  CustomerPersona,
  SuppressionEntry,
  Workflow,
  WorkflowStage,
} from "./types";
import { useCollection } from "@/store/DataStore";

/**
 * SeedDB with every mutable collection swapped for its live DataStore records.
 * Built once per render via useMemo; identity only changes when a live
 * collection actually changes, so downstream `useMemo(..., [db])` still works.
 */
export function useLiveDB(): SeedDB {
  const brands = useCollection<Brand>("brands", getSeedDB().brands).records;
  const campaigns = useCollection<Campaign>("campaigns", getSeedDB().campaigns).records;
  /* Promoting an idea writes the objective the user typed into a new Brief, and
     approval decisions patch brief status — both on this collection id. Without
     it here, every read surface (campaign detail, lifecycle board, journeys,
     command center, graph) kept rendering the frozen seed, so a brief created
     at runtime was invisible everywhere and a brief decision never propagated. */
  const briefs = useCollection<Brief>("briefs", getSeedDB().briefs).records;
  const ideas = useCollection<Idea>("ideas", getSeedDB().ideas).records;
  const approvals = useCollection<Approval>("approvals", getSeedDB().approvals).records;
  const communications = useCollection<Communication>(
    "communications",
    getSeedDB().communications,
  ).records;
  const channelExecutions = useCollection<ChannelExecution>(
    "channelExecutions",
    getSeedDB().channelExecutions,
  ).records;
  const contentVersions = useCollection<ContentVersion>(
    "contentVersions",
    getSeedDB().contentVersions,
  ).records;
  const contents = useCollection<Content>("contents", getSeedDB().contents).records;
  const assets = useCollection<Asset>("assets", getSeedDB().assets).records;
  const journeys = useCollection<Journey>("journeys", getSeedDB().journeys).records;
  const workflows = useCollection<Workflow>("workflows", getSeedDB().workflows).records;
  const workflowStages = useCollection<WorkflowStage>(
    "workflowStages",
    getSeedDB().workflowStages,
  ).records;
  const crisisIncidents = useCollection<CrisisIncident>(
    "crisisIncidents",
    getSeedDB().crisisIncidents,
  ).records;
  const customerPersonas = useCollection<CustomerPersona>(
    "customerPersonas",
    getSeedDB().customerPersonas,
  ).records;
  const suppressionEntries = useCollection<SuppressionEntry>(
    "suppressionEntries",
    getSeedDB().suppressionEntries,
  ).records;
  const notifications = useCollection<Notification>(
    "notifications",
    getSeedDB().notifications,
  ).records;
  const aiReviews = useCollection<AIReview>("aiReviews", getSeedDB().aiReviews).records;
  const budgets = useCollection<Budget>("budgets", getSeedDB().budgets).records;
  const legalClauses = useCollection<LegalClause>(
    "legalClauses",
    getSeedDB().legalClauses,
  ).records;
  const glossaryTerms = useCollection<GlossaryTerm>(
    "glossaryTerms",
    getSeedDB().glossaryTerms,
  ).records;

  return useMemo(
    () => ({
      ...getSeedDB(),
      brands,
      campaigns,
      briefs,
      ideas,
      approvals,
      communications,
      channelExecutions,
      contentVersions,
      contents,
      assets,
      journeys,
      workflows,
      workflowStages,
      crisisIncidents,
      customerPersonas,
      suppressionEntries,
      notifications,
      aiReviews,
      budgets,
      legalClauses,
      glossaryTerms,
    }),
    [
      brands,
      campaigns,
      briefs,
      ideas,
      approvals,
      communications,
      channelExecutions,
      contentVersions,
      contents,
      assets,
      journeys,
      workflows,
      workflowStages,
      crisisIncidents,
      customerPersonas,
      suppressionEntries,
      notifications,
      aiReviews,
      budgets,
      legalClauses,
      glossaryTerms,
    ],
  );
}

/**
 * `useLiveDB()` with ad-hoc collection overrides layered on top — useful for
 * previews and what-if views that shouldn't touch the store.
 */
export function useLiveDBWith(overrides?: Partial<SeedDB>): SeedDB {
  const db = useLiveDB();
  return useMemo(
    () => (overrides ? { ...db, ...overrides } : db),
    [db, overrides],
  );
}
