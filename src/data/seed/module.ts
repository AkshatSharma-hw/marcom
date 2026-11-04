/**
 * Operating-model seed — the eight lifecycle stages and the A1..A8 MarCom agent
 * roster. This is reference data: it describes how the function is meant to run,
 * and every surface that claims "an agent does this" resolves back to a row here.
 *
 * Two honesty rules govern this file:
 *  1. `MarcomAgent.status` states how much of the agent is actually demonstrable
 *     in THIS build — not how much is designed. `partial` is the common case.
 *  2. `surfaces[].to` must be a route that exists in App.tsx today.
 *
 * Ids are binding per SEED_MANIFEST.md ("Spec alignment wave A").
 */

import type { LifecycleStage, MarcomAgent } from '../types';

/* ------------------------------------------------------------------ */
/* Lifecycle stages (8) — LCS-001..LCS-008                             */
/* ------------------------------------------------------------------ */

const STAGE_CREATED = '2026-01-08T09:00:00Z';

export const seedLifecycleStages: LifecycleStage[] = [
  {
    id: 'LCS-001',
    order: 1,
    key: 'govern',
    name: 'Govern',
    purpose:
      'Set the standing rules — brand, legal, regulatory and role boundaries — that every later stage inherits rather than re-litigates.',
    owningAgentIds: ['AGT-A1'],
    keyOutput: 'Approved brand system, policy set and workflow definitions with named accountable owners.',
    approvalGate: 'Brand Manager and Legal/Compliance jointly ratify any change to a guardrail policy or brand standard.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-06-15T09:50:00Z',
  },
  {
    id: 'LCS-002',
    order: 2,
    key: 'understand',
    name: 'Understand',
    purpose:
      'Build a current, evidenced picture of the market, the competition and the audience before any plan is committed.',
    owningAgentIds: ['AGT-A2'],
    keyOutput: 'Market and competitor briefing with share-of-voice, trend series and persona insight attached to a business unit.',
    approvalGate: 'CMO accepts the market read as the basis for planning, or sends it back for a second source.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-05-28T11:10:00Z',
  },
  {
    id: 'LCS-003',
    order: 3,
    key: 'plan',
    name: 'Plan',
    purpose:
      'Turn strategy and budget into a committed portfolio of campaigns, briefs and measurable objectives.',
    owningAgentIds: ['AGT-A3', 'AGT-A6'],
    keyOutput: 'Approved campaign plan: brief, budget allocation, channel mix, calendar slot and KPI targets.',
    approvalGate: 'CMO approves the budget allocation; Campaign Manager signs the brief before creative starts.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-07-22T12:00:00Z',
  },
  {
    id: 'LCS-004',
    order: 4,
    key: 'create',
    name: 'Create',
    purpose:
      'Produce on-brief, on-brand content and assets — including localized variants — from the approved brief.',
    owningAgentIds: ['AGT-A4', 'AGT-A5'],
    keyOutput: 'Versioned content and assets, each traceable to a brief and flagged where AI-generated.',
    approvalGate: 'Content Manager accepts a draft version as the candidate for review; nothing auto-advances.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-07-01T15:25:00Z',
  },
  {
    id: 'LCS-005',
    order: 5,
    key: 'comply',
    name: 'Comply',
    purpose:
      'Check every candidate against brand, legal, regulatory and accessibility rules before it can reach an audience.',
    owningAgentIds: ['AGT-A1', 'AGT-A5'],
    keyOutput: 'Review run with per-rule findings, mandated clauses attached, and an approval decision on record.',
    approvalGate: 'Legal/Compliance Reviewer makes the final call — an AI review can block, but only a named approver can clear.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-08-06T11:05:00Z',
  },
  {
    id: 'LCS-006',
    order: 6,
    key: 'activate',
    name: 'Activate',
    purpose:
      'Schedule and deliver approved communications to the right audiences across every channel, honouring consent and suppression.',
    owningAgentIds: ['AGT-A6'],
    keyOutput: 'Scheduled channel executions and live journeys with delivery status per channel.',
    approvalGate: 'Campaign Manager releases the send; a Restricted or Confidential comm additionally needs Corporate Comms sign-off.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-08-11T15:05:00Z',
  },
  {
    id: 'LCS-007',
    order: 7,
    key: 'measure',
    name: 'Measure',
    purpose:
      'Roll delivery, engagement and business results up against the KPI targets committed in Plan.',
    owningAgentIds: ['AGT-A7'],
    keyOutput: 'Metric results by campaign, channel, brand and region, reconciled to KPI targets and spend.',
    approvalGate: 'CMO signs off the performance read that goes into the board pack.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-08-10T09:00:00Z',
  },
  {
    id: 'LCS-008',
    order: 8,
    key: 'learn',
    name: 'Learn',
    purpose:
      'Convert what actually happened into reusable guidance — what to repeat, what to retire, what to change in Govern.',
    owningAgentIds: ['AGT-A7', 'AGT-A8'],
    keyOutput: 'Post-campaign findings fed back as policy amendments, brief templates and next-cycle ideas.',
    approvalGate: 'CMO and Brand Manager decide which lessons become standing rules rather than one-off notes.',
    createdAt: STAGE_CREATED,
    updatedAt: '2026-08-12T10:20:00Z',
  },
];

/* ------------------------------------------------------------------ */
/* MarCom agents (8) — AGT-A1..AGT-A8                                  */
/* ------------------------------------------------------------------ */

const AGENT_CREATED = '2026-01-08T09:30:00Z';

export const seedMarcomAgents: MarcomAgent[] = [
  {
    id: 'AGT-A1',
    code: 'A1',
    name: 'Brand Governance Agent',
    purpose:
      'Hold the brand system as executable rules and check everything produced against them, so consistency survives scale.',
    coreValue:
      'One brand across every market, brand and sub-brand — without a reviewer re-reading every asset.',
    stageKeys: ['govern', 'comply'],
    // Demonstrable: policy set, brand guardrails, and the brand/compliance check
    // that returns real findings on CV-017. Not demonstrable: visual-identity
    // inspection of assets (logo clear-space, min size) — the rules are seeded
    // as text but nothing measures an image against them.
    status: 'partial',
    capabilities: [
      'Encodes brand voice, palette, typography and imagery rules as checkable guardrails',
      'Runs brand and compliance review over content versions, returning per-rule findings',
      'Blocks banned hype terms and unsubstantiated performance claims before approval',
      'Maintains the approved lexicon and sub-brand inheritance from parent brands',
    ],
    surfaces: [
      { label: 'Governance', to: '/governance' },
      { label: 'Approvals', to: '/approvals' },
      { label: 'Content', to: '/content' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-08-11T16:40:00Z',
  },
  {
    id: 'AGT-A2',
    code: 'A2',
    name: 'Market Intelligence Agent',
    purpose:
      'Keep a live read on market movement, competitor activity and share of voice so plans start from evidence rather than instinct.',
    coreValue: 'Decisions anchored in what the market is actually doing this quarter.',
    stageKeys: ['understand'],
    // Demonstrable: competitor moves, trend series, share-of-voice and personas
    // all render from seed. Not demonstrable: any live ingestion — the data is
    // seeded, not gathered.
    status: 'partial',
    capabilities: [
      'Tracks competitor launches, pricing moves, campaigns and partnerships',
      'Maintains market trend series per business unit with a stated takeaway',
      'Reports share of voice by brand and period against tracked competitors',
      'Links persona and segment insight to the audiences campaigns actually target',
    ],
    surfaces: [
      { label: 'Audiences', to: '/audiences' },
      { label: 'Performance', to: '/performance' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-07-30T14:00:00Z',
  },
  {
    id: 'AGT-A3',
    code: 'A3',
    name: 'Product Marketing Planning Agent',
    purpose:
      'Turn strategy, ideas and budget into a coherent campaign portfolio with briefs and KPI targets attached.',
    coreValue: 'Every campaign traceable to an objective, a budget line and a number it must move.',
    stageKeys: ['plan'],
    // Demonstrable end-to-end: idea scoring, promotion to campaign, brief
    // authoring, budget allocation and KPI attachment all run on real records.
    status: 'live',
    capabilities: [
      'Scores and ranks ideas, then promotes an approved idea into a campaign',
      'Generates and versions briefs with objective and key messages',
      'Allocates budget across campaigns and flags over-allocation against the plan',
      'Attaches KPI targets to strategies and campaigns for later measurement',
    ],
    surfaces: [
      { label: 'Ideation', to: '/ideas' },
      { label: 'Campaigns', to: '/campaigns' },
      { label: 'Budget', to: '/budget' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-08-05T11:00:00Z',
  },
  {
    id: 'AGT-A4',
    code: 'A4',
    name: 'Content Studio Agent',
    purpose:
      'Draft, version and localize content and assets from an approved brief, marking clearly what the machine wrote.',
    coreValue: 'Faster first drafts and real localization, with provenance never lost.',
    stageKeys: ['create'],
    // Demonstrable: version history, AI-generated provenance, locale variants
    // (Arabic, French, Japanese), asset library with rights expiry. Not
    // demonstrable:
    // actual generation — drafts are seeded, not produced by a model here.
    status: 'partial',
    capabilities: [
      'Produces draft content versions from a brief and flags them as AI-generated',
      'Maintains full version history per content item with the current version pinned',
      'Creates locale variants — right-to-left Arabic for KSA and GCC, French for the EU, Japanese for APAC',
      'Catalogs assets with media type, rights expiry and usage across versions',
    ],
    surfaces: [
      { label: 'Content', to: '/content' },
      { label: 'Assets', to: '/assets' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-08-09T11:25:00Z',
  },
  {
    id: 'AGT-A5',
    code: 'A5',
    name: 'Corporate Communication Agent',
    purpose:
      'Run corporate, internal, investor and crisis communication with the classification discipline each demands.',
    coreValue: 'The right message, to the right audience, at the right classification — including under pressure.',
    stageKeys: ['create', 'comply', 'activate'],
    // Demonstrable end-to-end: corporate/internal/investor comms, PR and media
    // contacts, coverage, crisis incidents with war room and holding statement.
    status: 'live',
    capabilities: [
      'Manages corporate, internal, investor and press communications as one pipeline',
      'Enforces classification from Public through Restricted on every comm',
      'Runs crisis incidents with a war room, severity and an approved holding statement',
      'Tracks media contacts, relationships and earned coverage with sentiment and reach',
    ],
    surfaces: [
      { label: 'Communications', to: '/communications' },
      { label: 'Internal comms', to: '/internal' },
      { label: 'PR & media', to: '/pr' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-08-11T10:35:00Z',
  },
  {
    id: 'AGT-A6',
    code: 'A6',
    name: 'Campaign Orchestration Agent',
    purpose:
      'Sequence activities, journeys and channel deliveries so an approved plan actually reaches audiences on time.',
    coreValue: 'Coordinated execution across channels instead of parallel improvisation.',
    stageKeys: ['plan', 'activate'],
    // Demonstrable: calendar, activities, journey designer, channel executions
    // with status, suppression and consent. Not demonstrable: real dispatch —
    // channel adapters are declared but nothing sends.
    status: 'partial',
    capabilities: [
      'Schedules campaign activities and events onto a shared marketing calendar',
      'Designs multi-step journeys with waits, conditions and branch splits',
      'Fans a communication out to per-channel executions and tracks delivery status',
      'Respects suppression entries and per-channel consent before activation',
    ],
    surfaces: [
      { label: 'Calendar', to: '/calendar' },
      { label: 'Journeys & channels', to: '/journeys' },
      { label: 'Events', to: '/events' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-08-11T15:05:00Z',
  },
  {
    id: 'AGT-A7',
    code: 'A7',
    name: 'Marketing Analytics Agent',
    purpose:
      'Roll every delivery and outcome up to KPI, spend and board-level reporting, and say plainly where the plan is off.',
    coreValue: 'One number the whole function trusts, from channel execution to board pack.',
    stageKeys: ['measure', 'learn'],
    // Demonstrable end-to-end: metric results roll up through KPI targets into
    // the performance dashboards and the board pack, reconciled against budget.
    status: 'live',
    capabilities: [
      'Rolls metric results up by campaign, channel, brand, business unit and region',
      'Reports attainment against KPI targets across reach, engagement and business tiers',
      'Reconciles spend against budget allocations and flags variance',
      'Assembles the executive board pack from the same facts the dashboards use',
    ],
    surfaces: [
      { label: 'Performance', to: '/performance' },
      { label: 'Board pack', to: '/reports' },
      { label: 'Budget', to: '/budget' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-08-10T09:00:00Z',
  },
  {
    id: 'AGT-A8',
    code: 'A8',
    name: 'MarCom Copilot',
    purpose:
      'Give every persona one place to ask what is happening, what needs them next, and why the system decided what it did.',
    coreValue: 'The operating model made answerable — no one has to know which screen holds the answer.',
    stageKeys: ['govern', 'understand', 'plan', 'create', 'comply', 'activate', 'measure', 'learn'],
    // Live as of this wave: the copilot answers over the seed graph and links
    // into the surfaces below. Its reach is bounded by the seeded data, and it
    // takes no action on the user's behalf.
    status: 'live',
    capabilities: [
      'Answers questions across the whole seed graph, scoped to the current role',
      'Explains why an item is blocked, who owns it and which policy fired',
      'Deep-links from an answer to the exact record on the owning surface',
      'Summarizes state per persona without taking action on their behalf',
    ],
    surfaces: [
      { label: 'Command center', to: '/dashboard' },
      { label: 'Graph explorer', to: '/graph' },
      { label: 'Governance', to: '/governance' },
    ],
    createdAt: AGENT_CREATED,
    updatedAt: '2026-08-14T09:00:00Z',
  },
];
