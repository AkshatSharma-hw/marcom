import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, BookMarked, BookOpen, Bot, Briefcase,
  Building2, Calculator, CalendarClock, CalendarDays, CheckCircle2, ClipboardCheck, Clock,
  Coins, Compass, Database, FilePlus, FileSearch, Filter, FolderOpen, Gavel, GitMerge,
  History, Layers, LayoutDashboard, Lightbulb, ListChecks, ListOrdered, Megaphone,
  MousePointerClick, Network, Newspaper, PenLine, Printer, Radio, Route, Scale, Search,
  Send, Settings, ShieldAlert, ShieldCheck, Siren, Sparkles, Split, Tags, Target,
  TrendingUp, Users, Wallet, Waypoints, Workflow,
} from "lucide-react";
import type { SynopsisSection } from "@/components/playbook/SynopsisPanel";
import type { PlaybookPhase } from "@/components/playbook/OperationsPlaybook";

export interface PageHelp {
  /** Path matcher — exact match preferred */
  path: string;
  playbookTitle: string;
  playbookSubtitle: string;
  synopsis: SynopsisSection[];
  playbook: PlaybookPhase[];
}

const TONES = {
  blue: "bg-blue-100 text-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  rose: "bg-rose-100 text-rose-700",
  teal: "bg-teal-100 text-teal-700",
  slate: "bg-slate-100 text-slate-700",
};

// ---------- Command center (/dashboard) ----------
const commandCenter: PageHelp = {
  path: "/dashboard",
  playbookTitle: "Command center operations playbook",
  playbookSubtitle: "Read the signals, clear your work, and keep every campaign on course",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Command center",
          value: "The personalized operational cockpit aggregating everything that needs attention across all brands, business units, and regions — KPI tiles, campaign pipeline, and pending work.",
          simple: "Your home screen: what is happening and what needs you, in one view.",
        },
        {
          label: "Scope",
          value: "The brand / business unit / region filter set in the topbar. Every number on this page is computed live from the records inside the active scope — nothing is a stored figure.",
          simple: "The slice of the organization you are currently looking at.",
        },
        {
          label: "KPI vs metric result",
          value: "A KPI is a target definition (metric key, unit, direction, target, period) attached to a strategy, campaign, or activity. A MetricResult is a dimensioned time-series fact; dashboard numbers roll up from these facts.",
          simple: "KPI is the goal, metric result is what actually happened.",
        },
        {
          label: "Campaign pipeline",
          value: "The distribution of campaigns across their configurable workflow lifecycle states — from planning through live to completed — within the active scope.",
          simple: "How many campaigns sit at each stage of their life.",
        },
        {
          label: "MarCom Copilot",
          value: "The conversational agent (A8) reachable from the topbar on every page. It answers questions against the same live records the tiles read, cites the records behind each answer, and states its confidence — it never authors a number of its own.",
          simple: "Ask the assistant in the topbar about anything on screen; it answers from the same data and shows its sources.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the command center exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "One trustworthy view",
          value: "Replace fragmented per-channel and per-agency reporting with a single connected view of every campaign and communication in flight, so surprises never surface first in an executive meeting.",
          tip: "Change the topbar scope before reading the tiles — every number follows the active scope.",
        },
        {
          label: "Route attention, not data",
          value: "Surface the items that need action — pending approvals, due briefs, campaigns drifting from KPI targets — and link each one directly to the workspace where it is resolved.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Tiles shown on this page",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Total reach",
          value: "Sum of impression metric results recorded within the active scope and period.",
          simple: "How many eyeballs everything in scope reached.",
        },
        {
          label: "Avg engagement rate",
          value: "Mean of engagement-rate metric results in scope — a quality complement to raw reach.",
          simple: "Of the people reached, how many actually interacted.",
        },
        {
          label: "Conversions",
          value: "Sum of conversion-tier metric results (preorders, registrations) attributable to campaigns in scope.",
          simple: "How many people did the thing we asked them to do.",
        },
        {
          label: "Budget utilization",
          value: "Committed spend as a percentage of planned budget for the business units in scope.",
          simple: "How much of the money set aside has been used.",
          tip: "Utilization far below plan late in a period is as much a warning as overspend.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Switch scope", value: "Change brand, business unit, or region in the topbar to re-compute every tile and list." },
        { label: "Drill into a campaign", value: "Open any pipeline or health entry to jump to the campaign workspace." },
        { label: "Act on pending work", value: "Jump to the approvals inbox or content studio directly from attention items." },
        { label: "Ask the copilot", value: "Open the MarCom Copilot from the topbar to interrogate any tile — it answers from the live records and links you to them." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: LayoutDashboard,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the command center",
      phaseDescription: "The command center is the entry point of the communication operating system. It reads the same relationship graph as every other module — ideas, campaigns, briefs, content, approvals, and metric results — and condenses it into KPI tiles, a campaign pipeline, and an attention stream for the active scope.",
      intro: { icon: Sparkles, text: "Everything on this page is computed live from the underlying records. If a number looks wrong, check the scope first — it is almost always a scope question." },
      cards: [
        { icon: LayoutDashboard, title: "Read the tiles", description: "Start each session with the four KPI tiles. They summarize reach, engagement quality, conversion outcomes, and budget burn for the active scope.", checklist: [
          "Confirm the topbar scope matches your remit",
          "Compare each tile against the period target",
          "Note any tile moving against its direction",
          "Drill into performance for the detail",
        ]},
        { icon: Layers, title: "Scan the pipeline", description: "The pipeline shows campaigns by lifecycle state and the channel mix behind them. Use it to spot stalled campaigns and channel over-concentration.", checklist: [
          "Check for campaigns stuck in one state",
          "Compare live vs planning volume",
          "Review the channel mix for balance",
          "Open any outlier campaign directly",
        ]},
      ],
    },
    {
      id: "signals", navLabel: "Read signals", navIcon: Activity,
      phaseLabel: "Phase 2: Read signals", phaseTitle: "Interpret KPI movement",
      phaseDescription: "Tiles answer 'what changed'; the graph answers 'why'. Every metric result carries dimensions (campaign, channel, brand, region), so any movement on this page can be traced to the campaigns and channels that produced it.",
      cards: [
        { icon: TrendingUp, title: "Trace a movement", description: "When a tile moves unexpectedly, follow it into the performance page and slice by campaign and channel to isolate the driver.", checklist: [
          "Identify the metric key behind the tile",
          "Open performance and match the period",
          "Slice by campaign, then by channel",
          "Confirm the driver before reporting it",
        ]},
        { icon: Target, title: "Compare against targets", description: "KPIs attach targets at strategy, campaign, or activity level. A healthy tile can still hide an off-target campaign underneath.", checklist: [
          "Check attainment per campaign, not just the rollup",
          "Flag campaigns pacing below target mid-flight",
          "Note where no KPI target exists at all",
        ]},
      ],
    },
    {
      id: "act", navLabel: "Act on work", navIcon: ListChecks,
      phaseLabel: "Phase 3: Act", phaseTitle: "Clear what needs you",
      phaseDescription: "The command center routes work; it does not hold it. Pending approvals resolve in the approvals inbox, content rework in the content studio, and campaign issues in the campaign workspace — each one click away.",
      cards: [
        { icon: ClipboardCheck, title: "Clear approvals", description: "Approvals carry SLA due dates. Clearing them from the top of the queue keeps every downstream lifecycle unblocked.", checklist: [
          "Open the approvals inbox",
          "Sort by SLA due date",
          "Decide or delegate each item",
        ]},
        { icon: Megaphone, title: "Unblock campaigns", description: "Campaigns drifting in the pipeline usually wait on a brief, an approval, or an asset. Open the campaign workspace and resolve the blocking item at its source.", checklist: [
          "Open the stalled campaign",
          "Identify the blocking stage or approval",
          "Reassign or escalate the owner",
          "Verify the state advances afterward",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Set your scope once at the start of the session and keep it fixed while comparing numbers.",
        "Treat the tiles as a daily baseline — investigate deltas, not absolute values.",
        "Clear SLA-dated approvals before planning work; they block other people's lifecycles.",
        "Report movements only after tracing them to a driver in the performance page.",
      ]},
    },
  ],
};

// ---------- Campaigns (/campaigns) ----------
const campaigns: PageHelp = {
  path: "/campaigns",
  playbookTitle: "Campaign operations playbook",
  playbookSubtitle: "Plan, brief, execute, and close campaigns as the connective tissue of the graph",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Campaign",
          value: "The central workhorse record: a scoped initiative (product, brand, internal, or corporate) with a strategy lineage, brand and business unit scope, budget, KPI targets, and a configurable workflow-driven lifecycle.",
          simple: "A planned push with an owner, money, goals, and a life of its own.",
        },
        {
          label: "Campaign activity",
          value: "A dated unit of execution inside a campaign — one owner, one channel booking, optional agency, allocated spend. Activities emit communications and roll up to the unified calendar.",
          simple: "The individual pieces of work that make the campaign happen.",
        },
        {
          label: "Brief",
          value: "The structured objective, key messages, mandatories, and audiences for a campaign or activity. Briefs are AI-draftable from campaign context and are approved before production starts.",
          simple: "The instructions creators work from — approved before anyone writes.",
        },
        {
          label: "Lifecycle",
          value: "Campaign state is driven by a configurable workflow (workflow and workflow-stage entities), not a hardcoded status list. Stage transitions can require approvals and write audit records.",
          simple: "Campaigns move through stages your organization defines, with sign-offs at the gates.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the campaign list exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Portfolio in one view",
          value: "A filterable list of every campaign across brand, business unit, region, and status — the shared reality for campaign managers, brand managers, and leadership.",
          tip: "Check for an existing campaign before promoting a new idea — duplicates fragment budget and measurement.",
        },
        {
          label: "Entry point to the workspace",
          value: "Each row opens the campaign workspace: objectives, lineage, activities, briefs, budget summary, and KPI targets in one place.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Campaigns in flight",
          value: "Count of campaigns in live or executing lifecycle states within scope.",
          simple: "How many pushes are running right now.",
        },
        {
          label: "KPI attainment",
          value: "Per-campaign metric results versus KPI targets — the portfolio health (RAG) signal.",
          simple: "Which campaigns are on track to hit their goals.",
          tip: "Investigate any campaign pacing below target while still mid-flight — after close it is history, not a lever.",
        },
        {
          label: "Budget variance",
          value: "Committed and actual spend versus the campaign allocation drawn from the business unit budget.",
          simple: "Whether the campaign is over- or under-spending its share.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse and filter", value: "Filter campaigns by brand, business unit, region, type, and lifecycle state." },
        { label: "Open a workspace", value: "Drill into a campaign for objectives, activities, briefs, budget, and KPIs." },
        { label: "Create a campaign", value: "Start a campaign directly or by promoting an approved idea, preserving lineage in the graph." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Megaphone,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the campaign portfolio",
      phaseDescription: "Campaigns are the connective tissue of the graph: they ladder up to strategies, decompose into activities grounded in briefs, consume content and assets, occupy channel slots, draw budget, and reconcile against KPI targets. This list is the portfolio-level entry point to all of it.",
      intro: { icon: Sparkles, text: "Nothing floats free — every campaign should trace upward to a strategy or idea and downward to activities with owners and dates. Orphans are a planning smell." },
      cards: [
        { icon: Search, title: "Scan the portfolio", description: "Use filters and lifecycle states to understand what is planned, live, and closing across the active scope.", checklist: [
          "Filter to your brand and region remit",
          "Review the state distribution",
          "Spot campaigns without recent movement",
          "Check lineage back to a strategy or idea",
        ]},
        { icon: FilePlus, title: "Create with lineage", description: "New campaigns should be created from an approved idea or a strategy so lineage is preserved. Set scope, owner, dates, and budget allocation at creation.", checklist: [
          "Confirm no duplicate campaign exists",
          "Set brand, business unit, and regions",
          "Assign the owning campaign manager",
          "Link the strategy or originating idea",
          "Attach the budget allocation",
        ]},
      ],
    },
    {
      id: "plan", navLabel: "Plan & brief", navIcon: PenLine,
      phaseLabel: "Phase 2: Plan & brief", phaseTitle: "Break the campaign into briefed activities",
      phaseDescription: "Planning turns a campaign into an activity plan: dated campaign activities with owners, channels, and spend, each grounded in an approved brief. The brief is the contract between planning and production — AI can draft it from campaign context, but approval happens before any content is created.",
      cards: [
        { icon: CalendarClock, title: "Build the activity plan", description: "Decompose the campaign into activities with owners, date ranges, channel bookings, and spend allocations. Activities roll up automatically to the unified calendar.", checklist: [
          "One owner and date range per activity",
          "Channel booked per activity",
          "Agency assigned where external production applies",
          "Spend allocated within the campaign budget",
        ]},
        { icon: PenLine, title: "Issue the brief", description: "Create a brief per campaign or activity: objective, key messages, mandatories, target audiences. Route it through approval before production begins.", checklist: [
          "Objective and key messages written",
          "Mandatories and audiences listed",
          "AI draft reviewed and edited by the owner",
          "Brief approved before content starts",
        ]},
      ],
    },
    {
      id: "execute", navLabel: "Execute", navIcon: Send,
      phaseLabel: "Phase 3: Execute", phaseTitle: "Run the lifecycle and launch",
      phaseDescription: "Execution advances the campaign through its workflow stages: content is produced against briefs in the content studio, approvals clear at each gate, and communications are scheduled to channels. Every transition writes an audit record that persists across a refresh — though only into this browser's storage, not a server-side store.",
      cards: [
        { icon: GitMerge, title: "Advance the workflow", description: "Move activities and the campaign through their configured stages. Stage gates generate approvals for the required roles — chase them in the approvals inbox, not over email.", checklist: [
          "All entry criteria met before advancing",
          "Required approvals requested at each gate",
          "Blocked stages escalated within SLA",
        ]},
        { icon: Send, title: "Launch to channels", description: "Approved content versions are scheduled as communications on their target channels. Check the calendar for collisions with other sends before committing dates.", checklist: [
          "Approved content version linked",
          "Audience and segments confirmed",
          "Calendar checked for send collisions",
          "Delivery status verified after launch",
        ]},
      ],
    },
    {
      id: "close", navLabel: "Measure & close", navIcon: BarChart3,
      phaseLabel: "Phase 4: Measure & close", phaseTitle: "Reconcile outcomes and close out",
      phaseDescription: "Closing replaces 'we published it' with 'it worked, here is the evidence, and here is what it cost'. Metric results reconcile against the KPI targets set at creation, budget actuals settle against the allocation, and learnings feed the next planning cycle.",
      cards: [
        { icon: BarChart3, title: "Reconcile KPIs", description: "Compare metric results against each KPI target on the campaign and its activities. Attainment drives the portfolio RAG and the executive narrative.", checklist: [
          "Metric results in for every KPI",
          "Attainment computed per KPI",
          "Underperformance explained with a driver",
          "Learnings recorded for the next cycle",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Never start production before the brief is approved — rework cycles trace back to vague briefs.",
        "Set KPI targets at campaign creation, not after launch, so attainment is honest.",
        "Keep one owner per activity; shared ownership means no ownership.",
        "Check the unified calendar before scheduling sends to avoid audience collisions.",
      ]},
    },
  ],
};

// ---------- Content studio (/content) ----------
const content: PageHelp = {
  path: "/content",
  playbookTitle: "Content studio operations playbook",
  playbookSubtitle: "Draft, version, review, and publish content against approved briefs",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Content",
          value: "The head record for a piece of communication material (email, post, press release, script, page). Lifecycle status lives on the head: Draft, In review, Rework, Approved, Published, Retired, Archived, Discarded.",
          simple: "One piece of material and where it currently stands.",
        },
        {
          label: "Content version",
          value: "An immutable snapshot of the content body at a point in time, optionally per locale or region. Versions carry no mutable status — they are produced by lifecycle transitions on the head record.",
          simple: "A frozen copy of the text at each step — history you can always go back to.",
        },
        {
          label: "Brief linkage",
          value: "Every content record is born from an approved brief; the brief supplies the objective, key messages, mandatories, and audiences the content must satisfy.",
          simple: "Content always answers to instructions — no brief, no content.",
        },
        {
          label: "Classification",
          value: "Record-level confidentiality: Public, Internal, Confidential, or Restricted. Restricted records are visible only to explicitly named stakeholders, regardless of role.",
          simple: "A sensitivity label that controls who can even see the record.",
        },
        {
          label: "Variants",
          value: "Alternative cuts of the same approved message, generated on demand for a persona and a target channel. Variants are never persisted by generation — they exist as a deck until someone saves one, at which point it becomes an ordinary content version with its provenance recorded: which persona and channel it was written for, and what it was derived from.",
          simple: "Draft alternatives to test; nothing is kept until you save one as a version.",
        },
        {
          label: "Channel constraints",
          value: "The hard delivery limits a channel imposes on the copy it carries — body and subject character caps and whether alt text is mandatory. Every variant is checked against its channel's constraints at generation time and carries a chip saying it fits or by how many characters it breaches; a breach is recorded on the saved version rather than hidden.",
          simple: "Each channel's length and accessibility rules, checked while you draft instead of at send time.",
        },
        {
          label: "Provenance",
          value: "Every version records where it came from — AI draft, variant, refinement, localization, or authored edit — plus the generator that produced it and the basis it was asked to work from. Reviewers judge AI-produced copy with its origin visible rather than inferred.",
          simple: "Each version says who or what wrote it, and on what instruction.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the content studio exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "One production surface",
          value: "All content is created, versioned, reviewed, and approved here — with brand voice enforcement and policy checks at the point of work rather than in a PDF guideline.",
          tip: "Reuse approved assets from the library before creating new ones — recreating existing assets is the most common waste in production.",
        },
        {
          label: "Traceable to outcome",
          value: "Because content links brief, campaign, channel, and metric results in one graph, every published piece can be traced from instruction to impact.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Items in review",
          value: "Count of content records sitting in In review or Rework — the active production backlog.",
          simple: "How much material is waiting on feedback or fixes.",
          tip: "A growing rework count usually points at vague briefs, not slow creators.",
        },
        {
          label: "Approved and ready",
          value: "Content approved but not yet published — the inventory available for scheduling.",
          simple: "Finished material waiting for a send date.",
        },
        {
          label: "Revision cycles",
          value: "Versions produced per content item before approval — a proxy for brief quality and review efficiency.",
          simple: "How many rounds it took to get to yes.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse and filter", value: "Filter content by status, type, brand, campaign, and owner." },
        { label: "Open content detail", value: "Drill into a record for its version history, brief context, and review thread." },
        { label: "Create content", value: "Start a new piece against an approved brief, with an AI-assisted first draft." },
        { label: "Submit for review", value: "Route a draft into its workflow for annotation and approval." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: BookOpen,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the content lifecycle",
      phaseDescription: "Content moves Draft → In review → (Rework →) Approved → Published, with Retired, Archived, and Discarded as terminal states. The head record carries the status; every meaningful transition snapshots an immutable content version, so history is never lost and any version can be restored.",
      intro: { icon: Sparkles, text: "The status lives on the head record; versions are frozen snapshots. If you need to change an approved piece, you create a new version through the lifecycle — you never edit history." },
      cards: [
        { icon: FileSearch, title: "Scan the studio", description: "Use status filters to see what is drafting, in review, awaiting rework, and ready to publish across your brand scope.", checklist: [
          "Filter to your brand and campaign scope",
          "Review the In review and Rework queues",
          "Spot items aging without a reviewer",
          "Check approved inventory against the calendar",
        ]},
      ],
    },
    {
      id: "draft", navLabel: "Draft", navIcon: PenLine,
      phaseLabel: "Phase 2: Draft", phaseTitle: "Create content from the brief",
      phaseDescription: "Production starts from an approved brief. The AI copilot drafts a first version from the brief's objective, key messages, and mandatories; the creator edits for craft and attaches governed assets — drafting stays approval-gated from the first line. Brand voice rules apply inline as you write.",
      cards: [
        { icon: PenLine, title: "Draft against the brief", description: "Generate or write the first draft with the brief open. Every key message and mandatory in the brief should be traceable in the copy.", checklist: [
          "Brief is approved before drafting starts",
          "AI draft reviewed line by line, not pasted",
          "Key messages and mandatories all covered",
          "Approved assets attached from the library",
        ]},
        { icon: Layers, title: "Version deliberately", description: "Create channel and region variants as linked versions of the same head record, not as separate content items — variants share lineage and measurement.", checklist: [
          "One head record per piece, variants as versions",
          "Locale and region set per variant version",
          "Side-by-side diff checked between versions",
        ]},
      ],
    },
    {
      id: "review", navLabel: "Review & approve", navIcon: ClipboardCheck,
      phaseLabel: "Phase 3: Review & approve", phaseTitle: "Route through the workflow",
      phaseDescription: "Submitting for review moves the head to In review and routes it through the configured workflow stages — brand review, legal review where policy requires, and final approval. Reviewers annotate; rejections send the piece to Rework with comments attached. Every decision writes an audit record that persists across a refresh — though only into this browser's storage, not a server-side store.",
      cards: [
        { icon: ClipboardCheck, title: "Submit and respond", description: "Submit the draft, then resolve reviewer comments in the thread rather than in side channels, so the audit trail stays complete.", checklist: [
          "Submitted to the correct workflow",
          "Region-specific policy checks passed",
          "All reviewer comments resolved in-thread",
          "Approval captured before publishing",
        ]},
        { icon: ShieldAlert, title: "Handle rework", description: "A Changes requested decision moves the piece to Rework. Fix against the comments, produce a new version, and resubmit — the prior version stays frozen for comparison.", checklist: [
          "Each comment addressed or answered",
          "New version created for the fixes",
          "Diff against the rejected version reviewed",
          "Resubmitted to the same stage",
        ]},
      ],
    },
    {
      id: "publish", navLabel: "Publish", navIcon: Send,
      phaseLabel: "Phase 4: Publish & retire", phaseTitle: "Ship it and manage the tail",
      phaseDescription: "Approved content is consumed by communications and scheduled to channels; the head moves to Published. When a piece goes out of date, retire it deliberately — retired and archived content stays in the graph so past sends remain traceable.",
      cards: [
        { icon: Send, title: "Publish through communications", description: "Publishing happens by linking the approved version to a communication and its channel executions — content itself never bypasses the delivery layer.", checklist: [
          "Approved version linked to the communication",
          "Audience and channels confirmed",
          "Send date checked against the calendar",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Never start drafting from an unapproved brief — it is the primary cause of rework cycles.",
        "Keep variants as versions of one head record so measurement rolls up correctly.",
        "Resolve review feedback in the thread, not over email, to preserve the audit trail.",
        "Retire stale content instead of deleting it — past communications must stay traceable.",
      ]},
    },
  ],
};

// ---------- Approvals (/approvals) ----------
const approvals: PageHelp = {
  path: "/approvals",
  playbookTitle: "Approvals operations playbook",
  playbookSubtitle: "Approval sign-off — triage, decide, and keep every lifecycle unblocked within SLA",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Approval",
          value: "The sign-off record generated when a workflow stage gate requires one. It runs an engine-owned eight-state machine: Requested, In review, Changes requested, Escalated, Approved, Rejected, Withdrawn, Expired.",
          simple: "A yes/no decision attached to one specific thing at one specific gate.",
        },
        {
          label: "Workflow stage gate",
          value: "Workflows configure where approval gates occur per entity type and scope; the gates themselves always behave the same way. Each gate names the roles that must sign.",
          simple: "Your organization decides where sign-offs happen; the system decides how they work.",
        },
        {
          label: "SLA due date",
          value: "Every approval carries a due timestamp derived from the stage's SLA hours. Breaches escalate and are visible in the queue ordering.",
          simple: "The clock on each decision — the queue is sorted by it.",
        },
        {
          label: "Audit record",
          value: "Every decision — approve, reject, changes requested — writes an append-only audit record with actor, action, and diff. Who approved what, and when, is always answerable.",
          simple: "A permanent receipt for every decision made here.",
          notInThisBuild:
            "Decisions now write an audit record and it survives a refresh, but storage is this browser's localStorage — not a server-side tamper-evident store. It is per-device, clearable from devtools, and has no retention policy or legal hold, so it is not admissible evidence.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the approvals inbox exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "One queue, no email chasing",
          value: "Everything waiting on your sign-off — briefs, content, campaign stage transitions — in a single SLA-ordered queue, replacing approval requests scattered across email threads.",
          tip: "Work the queue top-down: it is sorted by SLA due date, so the top item is always the most urgent.",
        },
        {
          label: "Keep lifecycles moving",
          value: "Every pending approval is blocking someone else's workflow stage. Clearing this queue is the highest-leverage act in the system.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Pending approvals",
          value: "Count of items in Requested, In review, or Escalated assigned to you in the active scope.",
          simple: "How many decisions are waiting on you.",
        },
        {
          label: "SLA breaches",
          value: "Pending approvals past their due date — these escalate and surface in governance reporting.",
          simple: "Decisions that are officially late.",
          tip: "An escalated item means someone upstream is already blocked — decide it first.",
        },
        {
          label: "Decision turnaround",
          value: "Time from Requested to a terminal decision — the measure of review efficiency across the scope.",
          simple: "How fast decisions get made around here.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Review the subject", value: "Open the linked brief, content version, or campaign the approval is about." },
        { label: "Approve", value: "Sign off — the subject's workflow stage advances and an audit record is written." },
        { label: "Request changes", value: "Send the subject back with comments; the owner reworks and resubmits." },
        { label: "Reject", value: "Terminate the request with a documented reason." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: ClipboardCheck,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the approval machine",
      phaseDescription: "Approvals are generated by workflow stage gates, not created by hand. Each carries a typed link to its subject (a brief, a content version, a campaign transition), an assigned approver, and an SLA due date. The state machine is fixed; only the placement of gates is configurable.",
      intro: { icon: Sparkles, text: "You are the gate, not the bottleneck. Anything you cannot decide today should be delegated or sent back with a question — silence is the only wrong answer." },
      cards: [
        { icon: ListChecks, title: "Read the queue", description: "The inbox lists your pending items sorted by SLA due date, with subject, requester, and status badge per row.", checklist: [
          "Queue sorted by SLA due date",
          "Escalated items identified first",
          "Subjects skimmed before deep review",
        ]},
      ],
    },
    {
      id: "triage", navLabel: "Triage", navIcon: Search,
      phaseLabel: "Phase 2: Triage", phaseTitle: "Order the work",
      phaseDescription: "Not every approval deserves equal depth. Triage by SLA urgency, subject sensitivity (classification, crisis linkage), and whether you are the right approver at all — delegation with a reason beats a slow rubber stamp.",
      cards: [
        { icon: Search, title: "Prioritize", description: "Decide the order: breached and escalated first, then near-due, then routine. Flag anything that arrived without enough context to judge.", checklist: [
          "Breached and escalated items first",
          "Restricted or crisis subjects prioritized",
          "Context requested where the ask is unclear",
        ]},
      ],
    },
    {
      id: "decide", navLabel: "Decide", navIcon: CheckCircle2,
      phaseLabel: "Phase 3: Decide", phaseTitle: "Approve, request changes, or reject",
      phaseDescription: "Open the subject, judge it against the brief, brand rules, and the region's policy set, then decide. Changes requested must carry actionable comments — the owner will rework against exactly what you write. Every decision is audit-logged with your name on it.",
      cards: [
        { icon: CheckCircle2, title: "Approve", description: "Sign off when the subject meets the brief, brand voice, and applicable policies. The workflow stage advances immediately.", checklist: [
          "Subject reviewed against its brief",
          "Brand and policy checks passed",
          "Comment added where context helps the next gate",
        ]},
        { icon: ShieldAlert, title: "Send back or reject", description: "Request changes with specific, actionable comments, or reject with a documented reason. Vague feedback creates the next rework cycle.", checklist: [
          "Every issue named and located",
          "Policy citations attached to compliance rejections",
          "Reason recorded — it becomes the audit trail",
        ]},
      ],
    },
    {
      id: "monitor", navLabel: "Monitor", navIcon: Activity,
      phaseLabel: "Phase 4: Monitor", phaseTitle: "Watch SLA health",
      phaseDescription: "The queue is also a health signal. Chronic breaches on one stage mean the gate is misplaced or under-staffed; chronic changes-requested from one requester means briefs are arriving unready. Feed both observations back to the workflow owners.",
      cards: [
        { icon: Activity, title: "Track patterns", description: "Look across decisions, not just at them: turnaround trends, repeat rework sources, and gates that always run late.", checklist: [
          "Turnaround reviewed against stage SLA",
          "Repeat rework sources identified",
          "Gate misplacement raised with workflow owners",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Decide from the top of the queue — it is already sorted by urgency.",
        "Never approve without opening the subject; the audit record carries your name.",
        "Make changes-requested comments specific enough to rework from directly.",
        "Escalate anything you cannot decide within the SLA rather than sitting on it.",
      ]},
    },
  ],
};

// ---------- Performance (/performance) ----------
const performance: PageHelp = {
  path: "/performance",
  playbookTitle: "Performance operations playbook",
  playbookSubtitle: "Close the loop: KPI targets meet metric results, from one send to the portfolio",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "KPI",
          value: "A target definition: metric key, unit, direction (up- or down-is-good), target value, and period, attached to a strategy, campaign, activity, or journey.",
          simple: "A named goal with a number and a deadline.",
        },
        {
          label: "Metric result",
          value: "A dimensioned time-series fact — metric key, value, period, and dimensions such as campaign, communication, channel, brand, and region. Every number on this page rolls up from these facts; nothing is stored pre-aggregated.",
          simple: "One recorded measurement, tagged with what it belongs to.",
        },
        {
          label: "KPI tiers",
          value: "KPIs are tiered as reach, engagement, and conversion (with business and brand tiers above). Reading them in order tells the funnel story: who saw it, who cared, who acted.",
          simple: "Goals stack like a funnel — seen, engaged, converted.",
        },
        {
          label: "Attainment",
          value: "Realized metric results versus the KPI target for the same period — the RAG signal that drives portfolio health and executive reporting.",
          simple: "How close the actuals are to the goal.",
        },
        {
          label: "Cost metrics",
          value: "Committed campaign spend divided by the volumes that campaign's own fact rows report: CPL per lead, CAC per acquisition, CPA per conversion-tier action of any kind, and ROAS as attributed value over spend. A ratio with no reported volume behind it stays blank rather than showing a zero — the basis for each figure is named on the row.",
          simple: "What each lead, customer, and action cost — blank where the campaign has not reported the volume.",
        },
        {
          label: "Learn loop",
          value: "Candidate learnings the page derives from its own numbers — a persona outperforming the others, the message leading engagement, the sharpest deviation from a campaign's trailing mean, a benchmark gap. Each carries the comparison it came from and links to where the response is decided. Nothing is written back: adopting a learning is an approver act on the linked page.",
          simple: "The page proposes what to do next, shows the numbers behind each suggestion, and leaves the decision to you.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the performance page exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Evidence, not anecdotes",
          value: "Replace 'we published it' with 'it worked, here is the evidence' — every campaign's KPI targets reconciled against measured results in one place.",
          tip: "Match the period selector to the KPI period before reading attainment — mixed periods produce false alarms.",
        },
        {
          label: "Attribution starts here",
          value: "Because metric results carry dimensions, movement can be sliced by campaign, channel, brand, and region — the driver of any number is a filter away, not a quarterly archaeology project.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "KPI attainment",
          value: "Per-KPI actual versus target across the scope — the headline scorecard.",
          simple: "Which goals are being hit and which are not.",
        },
        {
          label: "Channel volume and mix",
          value: "Metric results sliced by channel — where reach and engagement are actually coming from.",
          simple: "Which channels are pulling their weight.",
          tip: "A channel with high reach but weak engagement is a targeting question before it is a budget question.",
        },
        {
          label: "Funnel conversion",
          value: "Reach-tier volume flowing through engagement to conversion-tier results across live and completed campaigns.",
          simple: "Of everyone reached, how many engaged and then converted.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Change scope and period", value: "Re-slice every chart by brand, business unit, region, and time window." },
        { label: "Drill into a campaign", value: "Follow any series back to the campaign workspace that produced it." },
        { label: "Compare channels", value: "Slice results by channel to compare volume and quality side by side." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: BarChart3,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the measurement model",
      phaseDescription: "The page reads two things: KPI targets attached across the graph, and dimensioned metric result facts. Everything else — trends, mix, funnels, attainment — is computed from those at read time for the active scope. If a chart is empty, either no KPI is defined or no results are in scope.",
      intro: { icon: Sparkles, text: "Targets without results are wishes; results without targets are trivia. Insist on both before drawing a conclusion." },
      cards: [
        { icon: Target, title: "Read the scorecard", description: "Start with KPI attainment for the scope and period. Sort by distance from target, in the KPI's own direction.", checklist: [
          "Period matched to the KPI period",
          "Attainment read per KPI, not averaged",
          "KPIs with no results flagged",
          "Direction (up/down-is-good) respected",
        ]},
      ],
    },
    {
      id: "diagnose", navLabel: "Diagnose", navIcon: Search,
      phaseLabel: "Phase 2: Diagnose", phaseTitle: "Slice to the driver",
      phaseDescription: "For any off-target KPI, use the dimensions to isolate the driver: which campaign, which channel, which region. The funnel view separates a reach problem (nobody saw it) from an engagement problem (nobody cared) from a conversion problem (nobody acted).",
      cards: [
        { icon: Search, title: "Slice by dimension", description: "Cut the metric by campaign, then channel, then region until one slice explains the gap. Stop at the first dimension that accounts for most of the movement.", checklist: [
          "Campaign slice checked first",
          "Channel mix compared against plan",
          "Region variance separated from message variance",
        ]},
        { icon: Layers, title: "Read the funnel", description: "Walk reach → engagement → conversion for the affected campaigns. The tier where the drop concentrates names the fix: targeting, creative, or offer.", checklist: [
          "Drop-off located to one tier",
          "Comparable campaigns used as baseline",
          "Hypothesis written before acting",
        ]},
      ],
    },
    {
      id: "act", navLabel: "Act & recalibrate", navIcon: Settings,
      phaseLabel: "Phase 3: Act & recalibrate", phaseTitle: "Turn findings into changes",
      phaseDescription: "Diagnosis feeds action in the modules that own the levers: rebalance channel spend in the campaign workspace, revise creative through the content studio's lifecycle, retarget audiences, or — when the target itself was wrong — recalibrate the KPI for the next period with the change audit-logged.",
      cards: [
        { icon: Settings, title: "Adjust the levers", description: "Make the change where the lever lives, then watch the same slice here for the response. Never fix a measurement problem by editing the number.", checklist: [
          "Action taken in the owning module",
          "Expected effect and timeframe noted",
          "Same slice re-checked after the change",
        ]},
        { icon: Users, title: "Report with evidence", description: "Executive reporting flows from this page: attainment, drivers, actions taken. Lead with the decision the numbers support, not the numbers themselves.", checklist: [
          "Attainment stated per KPI with direction",
          "Driver named for every miss",
          "Action and owner attached to each finding",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Compare like periods — a weekly series against a quarterly target proves nothing.",
        "Diagnose to one dimension before proposing a fix; multi-cause stories rarely survive scrutiny.",
        "Treat empty charts as a target-setting gap, not a data outage.",
        "Recalibrate unrealistic targets openly at period boundaries instead of quietly missing them.",
      ]},
    },
  ],
};

// ---------- Ideation hub (/ideas) ----------
const ideas: PageHelp = {
  path: "/ideas",
  playbookTitle: "Ideation hub operations playbook",
  playbookSubtitle: "Capture, score, and promote ideas so nothing enters the system unlinked",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Idea",
          value: "The structured front door of the system: a captured intent with a source (stakeholder, AI, or social listening), tags to brand, business unit, region, and audience, a score, and a kanban lifecycle — Draft, Scored, Approved, Promoted, Archived.",
          simple: "A suggestion written down properly, so it can be judged and tracked.",
        },
        {
          label: "Scoring",
          value: "Configurable evaluation across impact, effort, and strategic fit, supplemented by stakeholder voting and comments. Scores order the board and inform the promotion decision.",
          simple: "A shared yardstick so ideas compete on merit, not volume.",
        },
        {
          label: "Promotion",
          value: "One-click conversion of an approved idea into a campaign or a standalone communication, with lineage preserved as a typed link in the graph — the resulting record always traces back to its originating idea.",
          simple: "Turning a good idea into real work without losing where it came from.",
        },
        {
          label: "AI ideation",
          value: "Copilot assistance on the intake side: generated idea variants, clustering of similar submissions, and auto-scoring suggestions. Approval required by design: AI proposes; a stakeholder scores and promotes.",
          simple: "The AI brainstorms and sorts — people still decide.",
        },
        {
          label: "Market intelligence & GTM strategy",
          value: "The strategy tab pairs market context with direction: competitor moves and market trends charted from the intelligence records in scope, beside each GTM strategy's positioning, value propositions, objectives and KPIs, and the ideas and campaigns that ladder up to it. This is the ground truth the Product Marketing Planning Agent turns into campaign proposals and budgets.",
          simple: "What the market is doing, what our plan is, and which work actually supports that plan.",
        },
        {
          label: "Market sizing (TAM / SAM / SOM)",
          value: "Per business unit, the total addressable, serviceable addressable, and serviceable obtainable market — each stated with its currency, the methodology behind it, the assumptions it rests on, a named source, and a confidence reading. Sizing scopes by business unit, so changing the topbar business unit changes which sizing you are reading.",
          simple: "How big the market is, how much of it we can serve, and how much we can realistically win — with the reasoning attached.",
        },
        {
          label: "Framework library",
          value: "Reference data: the four positioning frameworks a strategist can work in — positioning statement, value proposition canvas, messaging house, and jobs-to-be-done — each listing the canonical field prompts it asks for. Frameworks hold no campaign content; enterprise-specific templates plug in the same way.",
          simple: "The blank templates for writing positioning — the shape of the questions, not the answers.",
        },
        {
          label: "Messaging house",
          value: "One filled-in messaging house per GTM strategy: the roof message the market must remember, the supporting pillars with the proof points that hold each one up, and the known objections with their approved responses. It is the narrative source briefs and content inherit from.",
          simple: "The one thing to say, the reasons it is true, and what to answer when someone pushes back.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the ideation hub exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "A structured front door",
          value: "Every initiative starts here as a captured, tagged, scored idea — so nothing enters the system as an untracked email thread or a hallway decision.",
          tip: "Run duplicate detection before capturing — merging two half-scored ideas later is far more expensive than checking first.",
        },
        {
          label: "Lineage from day zero",
          value: "Because promotion preserves the idea link, every campaign can answer 'why does this exist and who proposed it' — the first hop of the relationship graph rule.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Ideas in pipeline",
          value: "Count of ideas in Draft and Scored states within the active scope — the raw material for the next planning cycle.",
          simple: "How many suggestions are waiting to be judged.",
        },
        {
          label: "Promotion rate",
          value: "Share of scored ideas that reach Promoted — the conversion of intake into funded work.",
          simple: "How many suggestions actually become campaigns.",
          tip: "A very high promotion rate usually means scoring is a rubber stamp, not that every idea is brilliant.",
        },
        {
          label: "Score distribution",
          value: "Spread of impact, effort, and strategic-fit scores across the board — reveals whether intake matches the strategy.",
          simple: "Whether the ideas coming in are the ideas you need.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Capture an idea", value: "Submit through the intake form with tags to brand, business unit, region, and audience — any stakeholder can contribute." },
        { label: "Score and vote", value: "Evaluate impact, effort, and strategic fit; vote and comment on the evaluation board." },
        { label: "Promote", value: "Convert an approved idea into a campaign or communication with lineage preserved." },
        { label: "Archive", value: "Retire ideas that will not proceed, keeping the record and its reasoning searchable." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Lightbulb,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the intake-to-promotion flow",
      phaseDescription: "The hub runs a kanban lifecycle: ideas are captured as drafts, scored on the evaluation board, approved by the owning scope, and promoted into campaigns or communications — or archived with their reasoning intact. Every state change is visible, and every promoted idea remains linked to what it became.",
      intro: { icon: Sparkles, text: "Nothing enters the system unlinked. If work exists that no idea or strategy explains, that is a governance gap — not a shortcut." },
      cards: [
        { icon: Lightbulb, title: "Read the board", description: "The kanban columns are the lifecycle. Scan volume per column to see whether intake is flowing or pooling before evaluation.", checklist: [
          "Filter the board to your scope",
          "Check Draft volume against scoring capacity",
          "Spot ideas aging in Scored without a decision",
          "Review recently promoted ideas for lineage",
        ]},
        { icon: GitMerge, title: "Follow the lineage", description: "Open any promoted idea to see the campaign or communication it became. The link is bidirectional — campaign workspaces show their originating idea too.", checklist: [
          "Open a promoted idea and follow its link",
          "Confirm the campaign shows the idea as its origin",
          "Flag promoted ideas whose links are missing",
        ]},
      ],
    },
    {
      id: "capture", navLabel: "Capture & tag", navIcon: FilePlus,
      phaseLabel: "Phase 2: Capture & tag", phaseTitle: "Get ideas in cleanly",
      phaseDescription: "Capture quality determines everything downstream. An idea tagged to the right brand, business unit, region, and audience routes to the right evaluators; duplicate detection at intake prevents the board from fragmenting the same intent across three cards.",
      cards: [
        { icon: FilePlus, title: "Capture with full tags", description: "Fill the intake form completely — source, scope tags, and target audience. Untagged ideas cannot be scored against strategic fit because fit is scope-relative.", checklist: [
          "Duplicate check run before submitting",
          "Brand, business unit, and region tagged",
          "Target audience named",
          "Source recorded (stakeholder, AI, listening)",
        ]},
        { icon: Sparkles, title: "Use AI to widen, then cluster", description: "Let the copilot generate variants of a promising idea and cluster similar submissions. Review clusters and merge duplicates before scoring starts.", checklist: [
          "Variants reviewed, not auto-accepted",
          "Clusters checked for true duplicates",
          "Merged ideas keep both submitters credited",
        ]},
      ],
    },
    {
      id: "score", navLabel: "Score & evaluate", navIcon: Target,
      phaseLabel: "Phase 3: Score & evaluate", phaseTitle: "Judge ideas on a shared yardstick",
      phaseDescription: "The evaluation board applies the configured scoring model — impact, effort, strategic fit — plus voting and comments. AI auto-scoring suggestions are a starting point; the accountable evaluators own the final numbers, and disagreements belong in the comment thread where they stay auditable.",
      cards: [
        { icon: Target, title: "Score consistently", description: "Score every idea on the same dimensions in the same session where possible — consistency across ideas matters more than precision on any one.", checklist: [
          "All three dimensions scored, not just impact",
          "AI suggestions reviewed before accepting",
          "Outlier scores explained in comments",
          "Strategic fit judged against the tagged scope",
        ]},
        { icon: Users, title: "Debate in the open", description: "Votes and comments on the board replace hallway advocacy. A contested idea with a visible debate is healthier than a quiet consensus nobody remembers.", checklist: [
          "Objections written on the card, not in chat",
          "Votes cast by the evaluating group",
          "Decision rationale summarized before moving state",
        ]},
      ],
    },
    {
      id: "promote", navLabel: "Promote & archive", navIcon: ArrowUpRight,
      phaseLabel: "Phase 4: Promote & archive", phaseTitle: "Convert or close every idea",
      phaseDescription: "Approved ideas are promoted to a campaign (for multi-activity initiatives) or a standalone communication (for single messages) with one click; everything else is archived with its scores and discussion intact. An idea left in limbo is a decision nobody made.",
      cards: [
        { icon: ArrowUpRight, title: "Promote with lineage", description: "Choose the right target shape — campaign or communication — and promote. The new record carries the idea link, scope tags, and scoring context into planning.", checklist: [
          "Target shape matches the idea's scale",
          "Scope tags carried over correctly",
          "Owner assigned on the promoted record",
          "Idea state shows Promoted with the link live",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Run duplicate detection at capture — merging later loses scoring history.",
        "Score effort honestly; impact-only scoring fills the pipeline with expensive favorites.",
        "Archive with a reason so the same idea is not re-litigated next quarter.",
        "Promote to a communication, not a campaign, when one message is all the idea needs.",
      ]},
    },
  ],
};

// ---------- Calendar (/calendar) ----------
const calendar: PageHelp = {
  path: "/calendar",
  playbookTitle: "Calendar operations playbook",
  playbookSubtitle: "One calendar of everything — plan, spot collisions, and protect the audience",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Unified calendar",
          value: "A single time surface rendering every campaign, campaign activity, communication, event, and content milestone in scope — not a per-team calendar, and not a copy: every entry is the live record shown in time.",
          simple: "Everything with a date, on one calendar, straight from the source records.",
        },
        {
          label: "Calendar entry",
          value: "Entries are the dated entities themselves — a campaign's date range, an activity's window, a communication's scheduled send. Moving an entry reschedules the record; there is no separate calendar database to drift out of sync.",
          simple: "The calendar shows the real records — change one and the calendar changes.",
        },
        {
          label: "Conflict detection",
          value: "The calendar cross-references scheduled communications by audience, channel, and time window to flag collisions — most importantly the audience conflict, where the same audience or overlapping segments would receive multiple sends in a short window.",
          simple: "The system warns you before two teams hit the same people in the same week.",
        },
        {
          label: "Channel capacity",
          value: "Each channel in the registry carries a plannable capacity per week. The calendar surfaces load against that capacity, so over-booking a channel is visible at planning time rather than at send time.",
          simple: "Channels have a weekly budget of sends — the calendar shows when you are over it.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the unified calendar exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "One view of when",
          value: "Replace per-team spreadsheets with the single answer to 'what is going out, when, and to whom' across brands, business units, regions, and channels.",
          tip: "Filter by audience before committing a send date — the collision you avoid is invisible in the channel view.",
        },
        {
          label: "Protect the audience",
          value: "The scarcest resource is audience attention. The calendar exists so that scheduling decisions are made against everyone else's sends, not in isolation.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Scheduled sends",
          value: "Count of communications in Scheduled state within the visible window and scope.",
          simple: "How much is queued to go out in this view.",
        },
        {
          label: "Detected conflicts",
          value: "Audience and channel collisions flagged in the visible window — overlapping sends to the same audience or over-capacity channel days.",
          simple: "How many scheduling clashes need resolving.",
          tip: "Resolve conflicts at planning time; a frequency-cap suppression at send time is the same problem discovered too late.",
        },
        {
          label: "Channel load",
          value: "Scheduled volume per channel against its weekly capacity — the orchestration headroom signal.",
          simple: "Which channels are nearly full and which are idle.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Filter the view", value: "Slice the calendar by brand, business unit, region, channel, and entry type." },
        { label: "Inspect an entry", value: "Open any entry to its owning record — campaign, activity, communication, or event." },
        { label: "Reschedule", value: "Move entries whose lifecycle allows it; the underlying record updates and conflicts re-evaluate." },
        { label: "Review conflicts", value: "Open flagged collisions to see the competing sends and their owners." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: CalendarDays,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand what the calendar shows",
      phaseDescription: "The calendar is a projection of the graph onto time. Campaigns render as ranges, activities as windows inside them, communications as send moments, and events as anchors. Because entries are the live records, the calendar is always as current as the lifecycle states behind it.",
      intro: { icon: Sparkles, text: "If it is not on this calendar, it is not scheduled — and if it is on this calendar, moving it here moves it everywhere." },
      cards: [
        { icon: CalendarDays, title: "Read the layers", description: "Toggle entry types to read the calendar at the right altitude: campaign ranges for portfolio planning, send moments for delivery planning.", checklist: [
          "Scope filters set to your remit",
          "Entry types toggled for the question at hand",
          "Dense weeks inspected at day resolution",
          "Owners identified for anything unfamiliar",
        ]},
        { icon: Filter, title: "Slice by audience and channel", description: "The same window read by channel shows capacity pressure; read by audience it shows attention pressure. Both slices matter before committing new dates.", checklist: [
          "Channel view checked against weekly capacity",
          "Audience view checked for crowded windows",
          "Regional views checked where sends localize",
        ]},
      ],
    },
    {
      id: "plan", navLabel: "Plan & schedule", navIcon: CalendarClock,
      phaseLabel: "Phase 2: Plan & schedule", phaseTitle: "Slot work into open windows",
      phaseDescription: "Scheduling is a placement decision against everything already booked. Activities roll up from campaign planning automatically; communications are slotted here once approved. The right order is: find the audience's open window first, then confirm the channel has capacity, then commit the date.",
      cards: [
        { icon: CalendarClock, title: "Slot deliberately", description: "Place sends where the target audience has headroom and the channel has capacity. Anchor around fixed entries — events and embargo dates — before filling flexible ones.", checklist: [
          "Audience window checked before the date is set",
          "Channel capacity confirmed for that week",
          "Fixed anchors (events, embargoes) respected",
          "Dependencies on other activities verified",
        ]},
        { icon: Radio, title: "Respect channel capacity", description: "A channel over its weekly capacity degrades every send on it. Spread volume across weeks or channels rather than stacking a launch week past its limit.", checklist: [
          "Over-capacity weeks identified in advance",
          "Volume shifted to adjacent weeks where possible",
          "Channel owner consulted on hard limits",
        ]},
      ],
    },
    {
      id: "conflicts", navLabel: "Resolve conflicts", navIcon: AlertTriangle,
      phaseLabel: "Phase 3: Resolve conflicts", phaseTitle: "Find and clear collisions",
      phaseDescription: "Conflict detection flags overlapping sends to the same audience, over-capacity channel days, and collisions with events or freeze windows. Every flag names the competing entries and their owners — resolution is a negotiation between owners, and the calendar is where it is settled and recorded.",
      cards: [
        { icon: AlertTriangle, title: "Triage the flags", description: "Work through detected conflicts in date order. For each, decide which send moves, which channel absorbs the shift, or — rarely — that the overlap is acceptable and why.", checklist: [
          "Conflicts reviewed in date order",
          "Competing owners brought into the decision",
          "One send moved or an acceptance recorded",
          "Re-check run after each resolution",
        ]},
        { icon: Users, title: "Think in audience terms", description: "Two sends colliding on a channel is a logistics problem; two sends colliding on an audience is an experience problem. When forced to choose, protect the audience.", checklist: [
          "Segment overlap checked, not just audience names",
          "Cumulative sends per audience per week reviewed",
          "Lower-priority send moved out of crowded windows",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Check the audience view before the channel view — audience collisions are the expensive ones.",
        "Schedule against capacity, not hope; over-booked channels degrade every send on them.",
        "Anchor fixed dates first, then fill flexible sends around them.",
        "Resolve flags when they appear — a conflict aged two weeks has fewer options left.",
      ]},
    },
  ],
};

// ---------- Asset library (/assets) ----------
const assets: PageHelp = {
  path: "/assets",
  playbookTitle: "Asset library operations playbook",
  playbookSubtitle: "One source of truth for every asset, with rights treated as a compliance event",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Asset",
          value: "A rights-tracked file — image, video, audio, document, design file — with brand scope, usage terms, and a rights expiry date. Assets are embedded in content versions and traced through to the communications that render them.",
          simple: "A file the organization is allowed to use, with the proof attached.",
        },
        {
          label: "Asset lifecycle",
          value: "Uploaded → Cataloged → Approved → In use → Expired → Archived, with Rejected as the failure exit. In use is derived from live references; Expired fires automatically on the rights date and blocks new use while flagging live usages.",
          simple: "Files move from ingest to cleared-for-use, and expiry is automatic — not a cleanup chore.",
        },
        {
          label: "Rights expiry",
          value: "License windows and usage terms are metadata on the asset. Expiry is a compliance event: an expired asset cannot enter new content, and every live usage becomes a flagged violation requiring action.",
          simple: "When the license runs out, the system stops new use and lists what is still exposed.",
        },
        {
          label: "Impact analysis",
          value: "A graph traversal answering 'what breaks if this asset expires': asset ← embedded in content versions ← rendered by communications. The result lists every scheduled or live communication at risk, raising notifications to owners and re-approvals on affected versions.",
          simple: "Before an asset dies, the system names every message that would go down with it.",
        },
        {
          label: "Cataloging checklist",
          value: "Each asset row exposes its next lifecycle step as an explicit action — Catalog for uploaded files, Approve for cataloged ones — gated to authoring roles, while expiry chips flag rights lapsing within 30 days. Worked top to bottom, the list is the intake checklist: only assets that clear it should enter content, and the Brand Execution Agent holds every asset to the same brand and rights standards.",
          simple: "A built-in to-do list per asset: catalog it, approve it, and watch the rights clock.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the asset library exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Single source of truth",
          value: "Every asset lives here with faceted search, AI auto-tagging, and visual similarity — so teams find and reuse governed assets instead of recreating them or pulling unlicensed files from a desktop.",
          tip: "Search by similarity before commissioning new work — the asset you need often already exists under a different name.",
        },
        {
          label: "Rights intelligence",
          value: "Usage tracking across content and channels plus expiring-rights alerts turn licensing from an annual audit scramble into a continuously answered question.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Expiring soon",
          value: "Count of approved or in-use assets whose rights window closes within the alert horizon.",
          simple: "How many licenses are about to run out.",
          tip: "Run impact analysis on each expiring asset now — renewal negotiations go better before the deadline.",
        },
        {
          label: "Expired in use",
          value: "Assets past their rights date still referenced by live content or scheduled communications — active compliance violations.",
          simple: "Files we are using but no longer have the right to.",
        },
        {
          label: "Reuse rate",
          value: "Share of content versions embedding existing library assets versus newly created ones — the return on the library investment.",
          simple: "How often teams reuse instead of recreating.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse and search", value: "Faceted browse by brand, type, campaign, and tag, plus visual similarity search." },
        { label: "Upload and catalog", value: "Ingest files and complete brand, region, rights window, and usage-term metadata." },
        { label: "Run impact analysis", value: "Preview every content version and communication affected by an asset's expiry or removal." },
        { label: "Curate collections", value: "Assemble sets per campaign, event, or agency, with controlled external share links." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: FolderOpen,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the library and its lifecycle",
      phaseDescription: "The library is the governed home of every file the organization uses. Assets move Uploaded → Cataloged → Approved → In use, with Expired firing automatically on the rights date and Archived as the retention endpoint. Because assets link into content versions and onward to communications, the library always knows where every file is used.",
      intro: { icon: Sparkles, text: "An asset without rights metadata is not an asset — it is a liability with a thumbnail. Cataloging is where a file becomes usable." },
      cards: [
        { icon: FolderOpen, title: "Know the states", description: "Read the lifecycle before acting: only approved assets appear in content pickers, In use is derived from live references, and Expired blocks new use automatically.", checklist: [
          "Filter by state to see the pipeline",
          "Check pending Uploaded items for cataloging",
          "Review Rejected assets for pattern failures",
          "Confirm archived assets stay out of pickers",
        ]},
        { icon: Search, title: "Search before you create", description: "Faceted and similarity search exist to prevent recreation. Every recreated asset is duplicated cost and a second rights trail to manage.", checklist: [
          "Facets tried: brand, type, campaign, tag",
          "Similarity search run on reference images",
          "Near-matches checked for usable rights",
        ]},
      ],
    },
    {
      id: "catalog", navLabel: "Ingest & catalog", navIcon: Tags,
      phaseLabel: "Phase 2: Ingest & catalog", phaseTitle: "Make files findable and lawful",
      phaseDescription: "Ingestion accepts uploads and agency deliveries; cataloging attaches what makes the file usable — brand scope, region availability, the rights window, and usage terms. AI auto-tagging proposes descriptive tags; the librarian confirms rights fields, because rights metadata is the input every downstream control depends on.",
      cards: [
        { icon: Tags, title: "Catalog completely", description: "Complete every rights field at cataloging time. A missing expiry date does not mean perpetual rights — it means the expiry safety net silently does not apply.", checklist: [
          "Brand and region scope set",
          "Rights window start and end recorded",
          "Usage terms and restrictions captured",
          "AI tags reviewed and corrected",
          "Source agency linked where applicable",
        ]},
        { icon: ShieldCheck, title: "Clear the approval gate", description: "Brand and legal clearance moves the asset to Approved and into the pickers. Rejections are terminal — fix the source problem, not the record.", checklist: [
          "Brand fit confirmed against guidelines",
          "License documentation attached",
          "Rejection reasons recorded for the producer",
        ]},
      ],
    },
    {
      id: "rights", navLabel: "Govern rights", navIcon: Clock,
      phaseLabel: "Phase 3: Govern rights", phaseTitle: "Stay ahead of expiry",
      phaseDescription: "Expiry is automated: on the rights date the asset moves to Expired, new use is blocked, and live usages are flagged as violations. The operational work is staying ahead of that moment — watching the expiring-soon horizon and running impact analysis while renewal, replacement, or retirement are all still options.",
      cards: [
        { icon: Clock, title: "Work the expiry horizon", description: "Review expiring-soon assets on a regular cadence. For each, decide: renew the license, replace the asset in affected content, or let it lapse deliberately.", checklist: [
          "Expiring-soon queue reviewed on cadence",
          "Renew, replace, or lapse decided per asset",
          "Owners of affected content notified early",
          "Renewals re-cataloged with the new window",
        ]},
        { icon: Network, title: "Run impact analysis first", description: "Before an expiry lands or an asset is pulled, traverse the graph: which content versions embed it, which communications render those versions, which are scheduled or live. Act on the list, not on hope.", checklist: [
          "Traversal run from the asset outward",
          "Scheduled and live communications listed",
          "Re-approvals opened on affected versions",
          "Replacement assets staged before the date",
        ]},
      ],
    },
    {
      id: "curate", navLabel: "Curate & reuse", navIcon: Layers,
      phaseLabel: "Phase 4: Curate & reuse", phaseTitle: "Turn the archive into leverage",
      phaseDescription: "Collections group assets per campaign, event, or agency; controlled share links give external partners exactly the set they need and nothing more. Curation is what turns a compliant file store into the place creative work starts.",
      cards: [
        { icon: Layers, title: "Build working collections", description: "Assemble the approved set for each campaign or event before production starts, so creators pull from a curated shelf instead of searching mid-task.", checklist: [
          "Collection created per campaign or event",
          "Only approved, in-rights assets included",
          "External shares scoped and time-limited",
          "Stale collections retired after the work ends",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Never skip rights fields at cataloging — the expiry automation only protects what it knows about.",
        "Run impact analysis before expiry, not after the violation flag appears.",
        "Prefer renewing or replacing over letting live communications lapse into violation.",
        "Measure reuse — a library nobody searches is an expense, not an asset.",
      ]},
    },
  ],
};

// ---------- Audiences (/audiences) ----------
const audiences: PageHelp = {
  path: "/audiences",
  playbookTitle: "Audience operations playbook",
  playbookSubtitle: "Model who you talk to — segments by rule, audiences by composition, sizes by computation",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Audience",
          value: "A named group the organization communicates with — customers, employees, investors, press, regulators — composed as a union of segments and scoped by brand, business unit, and region. Audiences are what communications, campaigns, and journeys target.",
          simple: "The people a message is for, assembled from smaller defined groups.",
        },
        {
          label: "Segment",
          value: "A declarative rule — attribute and behavior criteria — that selects members from the population. Segments compose audiences and can be shared across many of them.",
          simple: "A reusable filter, like 'EMEA enterprise admins active in 90 days'.",
        },
        {
          label: "Customer personas",
          value: "Archetype profiles of the customers behind the numbers — needs, channel preferences, and message resonance — used to keep segment rules and audience compositions grounded in who the people actually are. The Customer personas tab renders each persona's demographic, behavioral, and transactional attributes beside its linked audience; the Product Marketing Planning Agent references these profiles when shaping campaign proposals.",
          simple: "Sketches of typical customers that guide how groups are built and addressed.",
        },
        {
          label: "Data readiness",
          value: "A 0–100 reading of how complete and usable the profile data behind a persona actually is, shown on every persona card beside cohort size, consented share, and confidence. Low readiness does not block targeting — it tells you how much weight the persona's numbers can carry.",
          simple: "How good the underlying data is — a persona can be well written and still thinly evidenced.",
        },
        {
          label: "Version, refresh & drift",
          value: "Each persona carries a version number, the timestamp of its last cohort refresh from the CDP, and an optional drift signal raised when observed behavior has moved away from the written definition. Re-cutting a persona bumps the version and restamps the refresh — the definition is never edited silently.",
          simple: "Personas are dated and versioned, and the page tells you when reality has drifted from the description.",
        },
        {
          label: "Computed size",
          value: "Audience and segment sizes are never stored numbers — they are computed by evaluating the criteria against the population at read time. Edit the rule and the size changes everywhere it is displayed, immediately and consistently.",
          simple: "The member count is always calculated fresh, never a typed-in figure.",
        },
        {
          label: "Consent & suppression",
          value: "Membership carries consent state per channel and purpose; a global suppression list (opt-outs, legal complainants, do-not-contact) is enforced at send time and can never be overridden by a workflow approval.",
          simple: "People who said no stay excluded — no approval can undo that.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the audience registry exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Shared targeting truth",
          value: "Every module targets the same audience and segment records — so 'enterprise decision makers' means the same members in a campaign, a journey, and a standalone communication.",
          tip: "Reuse an existing segment before writing a new rule — two near-identical segments drift apart and split your measurement.",
        },
        {
          label: "Change with eyes open",
          value: "Editing a segment's criteria changes every audience composed from it and every live campaign targeting those audiences. The registry shows that blast radius before you commit.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Audience sizes",
          value: "Computed member counts per audience and segment in scope — recomputed from criteria, never stored.",
          simple: "How many people each group actually contains right now.",
        },
        {
          label: "Segment overlap",
          value: "Shared membership between segments composing an audience — high overlap inflates apparent reach and risks duplicate sends.",
          simple: "How much the groups double-count the same people.",
          tip: "Check overlap before adding a segment to an audience — union size grows less than the segment size suggests.",
        },
        {
          label: "Consent health",
          value: "Share of audience members with valid consent per channel, and the suppression count excluded at send time.",
          simple: "How many people you can actually reach, legally and respectfully.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse the registry", value: "Review audiences and segments by kind, brand, business unit, and region." },
        { label: "Build a segment", value: "Compose attribute and behavior criteria and preview the computed size." },
        { label: "Compose an audience", value: "Assemble segments into an audience and analyze overlap between them." },
        { label: "Review insight profiles", value: "Read AI-generated summaries of preferred channels and message resonance per audience." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Users,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand audiences versus segments",
      phaseDescription: "Segments are rules; audiences are compositions of segments; sizes are computations over the population. That layering is the whole model: rules stay reusable, compositions stay explainable, and no number on this page is a stored literal that can silently go stale.",
      intro: { icon: Sparkles, text: "If a size looks wrong, read the criteria — the number is only ever what the rule selects. There is no field to correct, only a rule to fix." },
      cards: [
        { icon: Users, title: "Read the registry", description: "Scan audiences by kind — customer, employee, investor, press, regulator — and check that each is composed of current, well-named segments.", checklist: [
          "Audiences reviewed by kind and scope",
          "Composition checked segment by segment",
          "Orphan segments (in no audience) flagged",
          "Naming reviewed for reusability",
        ]},
        { icon: Calculator, title: "Trust computed sizes", description: "Sizes recompute from criteria at read time, so the count here, the count in the campaign targeting panel, and the count at send time agree by construction.", checklist: [
          "Size traced to its criteria when questioned",
          "Same audience checked across two pages for agreement",
          "Sudden size shifts traced to criteria or population changes",
        ]},
      ],
    },
    {
      id: "segments", navLabel: "Build segments", navIcon: Filter,
      phaseLabel: "Phase 2: Build segments", phaseTitle: "Write rules worth reusing",
      phaseDescription: "A segment is a declarative filter over attributes and behavior. Good segments are single-purpose, named for their rule, and reused across audiences; bad segments encode one campaign's whims and multiply. Preview the computed size as you compose — a rule selecting nobody or everybody is usually a wrong rule.",
      cards: [
        { icon: Filter, title: "Compose the criteria", description: "Build the rule from attributes and behaviors, preview the size, and sanity-check the members it selects before saving.", checklist: [
          "Existing segments searched before creating",
          "Criteria kept single-purpose and named for the rule",
          "Computed size previewed and sanity-checked",
          "Source system for each attribute confirmed",
        ]},
        { icon: Database, title: "Keep rules maintainable", description: "Segments outlive campaigns. Prefer stable attributes over point-in-time lists, and document intent so the next editor changes the rule, not its meaning.", checklist: [
          "Stable attributes preferred over static lists",
          "Rule intent documented on the segment",
          "Duplicated near-identical rules merged",
        ]},
      ],
    },
    {
      id: "compose", navLabel: "Compose audiences", navIcon: Layers,
      phaseLabel: "Phase 3: Compose audiences", phaseTitle: "Assemble and analyze the union",
      phaseDescription: "An audience is the union of its segments, sized by computation with overlap made visible. Composition is where reach honesty lives: overlapping segments double-count members, and the overlap analysis shows the true unique size before anyone targets it.",
      cards: [
        { icon: Layers, title: "Assemble deliberately", description: "Add segments that together define who the audience is — then read the overlap analysis to understand what each segment actually contributes.", checklist: [
          "Each segment's marginal contribution reviewed",
          "Overlap analysis read before finalizing",
          "Scope (brand, business unit, region) set",
          "Audience kind set correctly for governance",
        ]},
        { icon: Sparkles, title: "Use insight profiles", description: "AI-generated profiles summarize preferred channels and message resonance from metric history — useful context for channel planning, not a substitute for testing.", checklist: [
          "Preferred channels checked against channel plan",
          "Resonance history reviewed before messaging",
          "Profile treated as hypothesis, not fact",
        ]},
      ],
    },
    {
      id: "govern", navLabel: "Govern changes", navIcon: ShieldCheck,
      phaseLabel: "Phase 4: Govern changes", phaseTitle: "Change criteria with the blast radius visible",
      phaseDescription: "Editing a segment recomputes every audience built on it and shifts the targeting of every live campaign and journey pointing at those audiences. The impact preview shows that traversal before commit; consent and suppression rules sit beneath everything, enforced at send time where no approval can override them.",
      cards: [
        { icon: ShieldCheck, title: "Edit with impact preview", description: "Before saving a criteria change, review the affected audiences, live campaigns, and journeys. Material targeting shifts can require re-approval where policy matches — that is the system working.", checklist: [
          "Impact preview reviewed before commit",
          "Owners of affected live campaigns informed",
          "Re-approvals expected where policy requires",
          "Size change after the edit verified",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Never hand-maintain a member list where a rule can select it — lists rot, rules recompute.",
        "Check overlap before promising reach; unions are smaller than their parts suggest.",
        "Treat suppression as absolute when planning volume — but note that in this build it is a register, not a send-time block.",
        "Edit segments through the impact preview, not as a quiet fix — live campaigns inherit your change.",
      ]},
    },
  ],
};

// ---------- Journeys & channels (/journeys) ----------
const journeys: PageHelp = {
  path: "/journeys",
  playbookTitle: "Journeys & channels operations playbook",
  playbookSubtitle: "Channels as registry data, delivery as executions, orchestration as a node graph",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Channel registry",
          value: "Every deliverable surface — email, SMS, push, social, intranet, PR wire, and more — is a registry record with capabilities, compose-time constraints, availability scoping, weekly capacity, and a status of Active, Degraded, or Suspended. Channels are data plus one adapter, never separate code paths.",
          simple: "Channels are entries in a catalog; adding one is a record, not a rebuild.",
        },
        {
          label: "Channel execution",
          value: "Delivery is one execution per communication–channel pair: it binds the channel-resolved content version, the schedule, the adapter payload, and a per-channel status of draft, queued, sending, sent, or failed. This makes 'one message, twelve surfaces' a first-class query.",
          simple: "Each surface a message goes out on gets its own tracked delivery record.",
        },
        {
          label: "Journey",
          value: "A versioned directed graph of typed nodes — trigger, audience, condition, wait, send, branch, exit — orchestrating communications over time for one audience. Members advance only in response to typed events, never by polling.",
          simple: "A flowchart the system executes: who enters, what they get, when, and why they leave.",
        },
        {
          label: "Guardrails",
          value: "A platform-level suppression service evaluates before every send: suppression lists, consent state, crisis freezes, and frequency caps per channel and audience. Suppressed sends exit with a recorded reason — visible in analytics, never silent.",
          simple: "The platform blocks over-contact and no-consent sends for every journey at once.",
          notInThisBuild:
            "The pre-send gate enforces send freezes, rework, open approvals, consent summaries, suppression entries, and a frequency cap of 3 sends per audience per channel in a rolling 30 days counted over a send ledger. Two gaps remain against the described service: the ledger is opened from delivery history rather than a real delivery feed, and blocked sends are not written into analytics as recorded exits.",
        },
        {
          label: "Execution plan & draft push",
          value: "The plan a campaign's approved brief and activities derive into: lock the brief, draft channel-neutral master copy, adapt it per channel against that channel's constraints, build, review, then push the draft to the channel connector. The final step stops there deliberately — the draft sits unpublished on the channel and holds for launch authorisation. Sequencing is explicit dependency edges, not an implied order.",
          simple: "The system prepares the send all the way to the connector and then stops — a person authorises the launch.",
        },
        {
          label: "Segment handoff & consent",
          value: "What actually leaves for a journey or campaign, per segment: population, the binding consent share, suppressions removed, and the resulting handoff count. Consent binds on the tightest channel in the mix — the lowest opted-in share across the channel kinds in play — and a segment with no consent record hands off nobody, because absence of consent is never read as consent.",
          simple: "A per-segment manifest of who is actually contactable, taking the strictest channel's consent and removing suppressions.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why journeys and channels exist",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Channel-agnostic orchestration",
          value: "Compose the message once as a communication, then let executions adapt it per channel within each channel's constraints — instead of rebuilding the message per surface.",
          tip: "Check the target channel's constraints while composing — violations are caught at compose time here, not at send time.",
        },
        {
          label: "Sequenced, evented delivery",
          value: "Journeys turn one-off sends into deliberate sequences driven by real behavior — opens, clicks, conversions — with waits, branches, and exits that are all inspectable data.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Active journeys",
          value: "Count of journeys in a live state with members currently progressing through their graphs.",
          simple: "How many automated sequences are running.",
        },
        {
          label: "Delivery health",
          value: "Channel execution outcomes — sent versus failed — per channel, alongside each channel's registry status.",
          simple: "Whether messages are actually getting through, surface by surface.",
          tip: "A failure spike on one channel with others healthy points at the channel or adapter, not the message.",
        },
        {
          label: "Suppression exits",
          value: "Journey exits caused by suppression, consent, or frequency caps — the volume the guardrails held back, with reasons.",
          simple: "How many sends the safety rails stopped, and why.",
          notInThisBuild:
            "There is no journey runtime, so no member ever enters, exits or is held back. This figure has no source and is not shown anywhere.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse the registry", value: "Review channels with their capabilities, constraints, capacity, and status." },
        { label: "Design a journey", value: "Assemble trigger, audience, condition, wait, send, branch, and exit nodes into a versioned graph." },
        { label: "Inspect executions", value: "Follow any communication into its per-channel executions and delivery statuses." },
        { label: "Review exits", value: "Read exit reasons — completed, suppressed, goal met, manual — per journey." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Route,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the delivery model",
      phaseDescription: "Three layers cooperate here. The channel registry describes every surface as data. Communications stay channel-agnostic, and each target surface gets a channel execution binding the resolved content version, schedule, and delivery status. Journeys sit above both, sequencing communications for an audience through a typed node graph.",
      intro: { icon: Sparkles, text: "The communication is the intent; the execution is the delivery; the journey is the choreography. Diagnose problems at the layer they belong to." },
      cards: [
        { icon: Radio, title: "Read the channel registry", description: "Each channel record declares what the surface can do (capabilities), what it will not accept (constraints), how much it can carry (weekly capacity), and whether it is healthy (status).", checklist: [
          "Channel status checked before planning sends",
          "Constraints reviewed for target formats",
          "Capacity headroom confirmed for the window",
          "Availability scoping matched to brand and region",
        ]},
        { icon: Send, title: "Follow an execution", description: "Pick a recent communication and walk its executions: one per channel, each with its own resolved content version and status progression from draft through sent or failed.", checklist: [
          "One execution per target channel confirmed",
          "Per-channel content version resolution understood",
          "Status progression read end to end",
          "Failures traced to channel or payload",
        ]},
      ],
    },
    {
      id: "design", navLabel: "Design", navIcon: Split,
      phaseLabel: "Phase 2: Design", phaseTitle: "Assemble the journey graph",
      phaseDescription: "A journey is built from the closed node vocabulary: a trigger admits members on an event or schedule, audience nodes bind and re-evaluate membership at entry, conditions branch on typed predicates, waits pause for durations or events with timeout edges, sends emit communications, branches split — including reproducible A/B/n — and every path ends at an exit with a reason.",
      cards: [
        { icon: Split, title: "Build with typed nodes", description: "Compose the graph so every member path is intentional: entries defined by the trigger, decisions by conditions, pacing by waits, and every route reaching a typed exit.", checklist: [
          "Trigger event or schedule precisely defined",
          "Audience re-evaluation at entry understood",
          "Every wait given a timeout edge",
          "Every path terminated at an exit node",
        ]},
        { icon: Target, title: "Declare experiments up front", description: "A/B/n branches use a deterministic split and must carry a declared success KPI and sample plan. Winners are promoted explicitly — by a person or on copilot suggestion — and the decision is audit-logged.", checklist: [
          "Success KPI declared on the branch",
          "Split proportions and sample plan set",
          "Winner promotion planned as an explicit step",
        ]},
      ],
    },
    {
      id: "launch", navLabel: "Launch", navIcon: Send,
      phaseLabel: "Phase 3: Launch", phaseTitle: "Version, verify, and let it run",
      phaseDescription: "Journeys are versioned — publishing pins the graph, and edits create a new version rather than mutating a running one. Before launch, check consent coverage on the audience, frequency-cap pressure from other sends, channel capacity and health, and content approved for every send node. In this build these are review steps for a person, not checks the platform repeats at send time.",
      cards: [
        { icon: ShieldCheck, title: "Pre-flight the guardrails", description: "Consent, caps and freezes are designed to be enforced at send time by the suppression service. That service is not built yet, so a launch review is currently the only place they are checked at all — treat this list as the control, not as a rehearsal of one.", checklist: [
          "Consent coverage checked for target channels",
          "Frequency-cap pressure reviewed against other sends",
          "Approved content versions linked at every send node",
          "Channel status and capacity confirmed",
        ]},
      ],
    },
    {
      id: "monitor", navLabel: "Monitor & tune", navIcon: Activity,
      phaseLabel: "Phase 4: Monitor & tune", phaseTitle: "Read the flow and improve it",
      phaseDescription: "A running journey is observable end to end: member counts per node, execution outcomes per channel, and exits with reasons. Suppression exits are signal, not noise — they show where the audience is over-contacted or under-consented. Tuning happens as a new version; history stays intact.",
      cards: [
        { icon: Activity, title: "Watch the flow", description: "Read where members pool and where they exit. A pile-up at a wait node, a branch skewing unexpectedly, or a failure cluster on one channel each name their own fix.", checklist: [
          "Node-level member counts reviewed",
          "Exit reasons read, suppression exits especially",
          "Per-channel failures separated from content problems",
          "A/B outcomes checked against the declared KPI",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Compose to the channel's constraints from the start — compose-time validation beats send-time failure.",
        "Give every wait a timeout edge; members who never act must still reach an exit.",
        "Treat suppression exits as audience feedback, not lost volume.",
        "Tune by publishing a new journey version — never edit the graph under running members.",
      ]},
    },
  ],
};

// ---------- Communications (/communications) ----------
const communications: PageHelp = {
  path: "/communications",
  playbookTitle: "Communications operations playbook",
  playbookSubtitle: "Channel-agnostic messages with full rigor — composed once, delivered per surface",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Communication",
          value: "The atomic unit of the system: a channel-agnostic send or publish intent that renders one content version to one audience at a scheduled time. It can live under a campaign activity or stand alone — announcements, memos, statements — with the same rigor and a lighter path.",
          simple: "One message to one audience — what goes out, to whom, and when, before any channel is chosen.",
        },
        {
          label: "Channel execution",
          value: "Delivery is modeled as one execution per communication–channel pair, binding the channel-resolved content version, schedule, and a per-channel delivery status. The communication holds the intent; executions hold the deliveries.",
          simple: "The message is written once; each surface it goes out on is tracked separately.",
        },
        {
          label: "Master lifecycle",
          value: "Every communication traverses the same spine — Idea, Briefed, Drafting, In review, Rework, Approved, Scheduled, Live, Paused, Completed, Archived, with Killed as the pre-live exit. Transitions run through the workflow engine and approvals; none happen silently.",
          simple: "Every message walks the same staged path from intent to archive, with gates on the way.",
        },
        {
          label: "Classification & masking",
          value: "Each communication carries a classification — Public, Internal, Confidential, or Restricted — that drives attribute-based visibility. Restricted records are masked from everyone except explicitly named stakeholders, regardless of role; pre-announcement material is restricted by default.",
          simple: "A sensitivity label decides who can even see the record — rank alone is not enough.",
        },
        {
          label: "AI drafting",
          value: "The New communication form can draft the message body from the subject, target audience, and brand voice through the platform's single AI seam — the Corporate Communication Agent at work. The draft is deterministic, fully editable, and never auto-sent: it lands as a Draft owned by the requester and walks the same lifecycle as hand-written copy.",
          simple: "The AI writes a first draft in brand voice — you edit, and it still goes through every gate.",
        },
        {
          label: "Investor lane",
          value: "Investor communications are a first-class commsType with their own tab and visual chip, alongside external, internal, and corporate. Investor material typically pairs with Confidential or Restricted classification, so subjects and bodies mask for roles outside corporate comms leadership — disclosure discipline is enforced by the record, not by convention.",
          simple: "Investor messages get their own lane and stricter visibility, because disclosure rules are different.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the communications registry exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Rigor without ceremony",
          value: "Standalone messages that do not warrant a campaign still get lifecycle, approvals, audit, and measurement — the registry is where they are composed, routed, and archived.",
          tip: "Clone from the registry archive before composing from scratch — a past statement with its approval history is the best starting template.",
        },
        {
          label: "One message, many surfaces",
          value: "Because delivery is per-channel executions under one intent, 'where did this message go and how did each surface perform' is a single query, not an email archaeology exercise.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "In flight",
          value: "Communications in Scheduled or Live states within scope — the active send load.",
          simple: "How many messages are queued or currently out.",
        },
        {
          label: "Delivery success",
          value: "Channel executions reaching Sent versus Failed across the period — the reliability of the delivery layer.",
          simple: "Of everything sent, how much actually landed.",
        },
        {
          label: "Cycle time",
          value: "Elapsed time from Briefed to Live per communication class — how fast a message moves through drafting, review, and scheduling.",
          simple: "How long it takes to get a message out the door properly.",
          tip: "Track cycle time by class — a corporate statement and a product email have legitimately different clocks.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse and filter", value: "Filter communications by type, status, classification, audience, and campaign linkage." },
        { label: "Compose", value: "Create a typed communication — internal, external, corporate, or crisis — with audience, content, and channel targets." },
        { label: "Advance the lifecycle", value: "Submit, schedule, pause, or archive within the transitions your role allows." },
        { label: "Search the registry", value: "Find and clone past communications with their lineage and approval history." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Megaphone,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the communication model",
      phaseDescription: "A communication separates intent from delivery. The intent — message, audience, content version, timing — is composed once and is channel-agnostic; delivery happens through one channel execution per target surface, each adapting the content to that channel's constraints and tracking its own status. Campaign-borne and standalone communications share the same model.",
      intro: { icon: Sparkles, text: "Compose the what and the who first; the where is an execution detail the model handles per channel. Never fork the message per surface by hand." },
      cards: [
        { icon: Megaphone, title: "Read the registry", description: "Scan communications by type and status. Standalone corporate and crisis messages sit beside campaign-borne sends — same lifecycle, same audit, different origin.", checklist: [
          "Filtered to your scope and comms class",
          "Standalone versus campaign-borne understood per row",
          "Stalled lifecycles spotted and owners identified",
          "Restricted rows noted — masking is working as designed",
        ]},
        { icon: Layers, title: "Trace intent to executions", description: "Open any communication and read its executions: one per channel, each with the resolved content version and delivery status. This is where 'one message, twelve surfaces' becomes concrete.", checklist: [
          "Executions listed per target channel",
          "Resolved content version checked per execution",
          "Delivery statuses read per surface",
        ]},
      ],
    },
    {
      id: "compose", navLabel: "Compose & classify", navIcon: PenLine,
      phaseLabel: "Phase 2: Compose & classify", phaseTitle: "Build the intent and label it honestly",
      phaseDescription: "Composition sets the type (internal, external, corporate, crisis), the audience, the linked content, and the classification. Classification is a governance act: it drives who can see the record, which legal stages activate, and how assets preview. Sensitive material — earnings, restructuring, pre-announcements — is Restricted by default with a named-stakeholder access list.",
      cards: [
        { icon: PenLine, title: "Compose the intent", description: "Write the message once against its approved content, target one audience, and set the timing. Link the campaign activity where one exists; leave it standalone where one does not.", checklist: [
          "Type set to the correct comms class",
          "Audience selected from the registry",
          "Approved content version linked",
          "Campaign activity linked where applicable",
        ]},
        { icon: ShieldAlert, title: "Classify before routing", description: "Set the classification deliberately — it controls visibility from this moment on. For restricted material, name the stakeholders who may see it; everyone else is masked regardless of role.", checklist: [
          "Classification matched to content sensitivity",
          "Named access list set for restricted records",
          "Pre-announcement material defaulted to restricted",
          "Classification-driven legal stages anticipated",
        ]},
      ],
    },
    {
      id: "route", navLabel: "Route & schedule", navIcon: GitMerge,
      phaseLabel: "Phase 3: Route & schedule", phaseTitle: "Clear the gates and take a slot",
      phaseDescription: "The communication advances through review and approval on the master lifecycle — approvers act through the approvals inbox, and only approval outcomes move the record out of review. Once approved, scheduling assigns the send window and creates executions per target channel, with the calendar checked for audience and channel collisions before the date commits.",
      cards: [
        { icon: GitMerge, title: "Run the lifecycle", description: "Submit for review and let the gates work: brand, legal, and compliance stages activate per policy and classification. Rework returns with consolidated feedback and expects a new content version.", checklist: [
          "Submitted with brief and content in place",
          "Classification-triggered stages accounted for",
          "Rework feedback resolved in a new version",
          "Approval recorded before any scheduling",
        ]},
        { icon: CalendarClock, title: "Schedule with the calendar", description: "Pick the send window against the unified calendar — audience collisions and channel capacity first — then confirm executions exist for every target channel.", checklist: [
          "Calendar checked for audience collisions",
          "Channel capacity confirmed for the window",
          "One execution verified per target channel",
          "Send window agreed with the channel owners",
        ]},
      ],
    },
    {
      id: "deliver", navLabel: "Deliver & close", navIcon: Send,
      phaseLabel: "Phase 4: Deliver & close", phaseTitle: "Go live, watch delivery, archive",
      phaseDescription: "At the send window the communication goes Live and executions progress through queued, sending, and sent — or failed, per surface. Metric ingestion begins at Live; when delivery finishes, the record completes, holds its results window for attribution, and archives immutably into the registry where it becomes precedent for the next message.",
      cards: [
        { icon: Send, title: "Watch the executions", description: "Monitor per-channel delivery as the send runs. A failure on one surface is retried or resolved at the execution level — the communication and its other surfaces are unaffected.", checklist: [
          "Execution statuses watched through the send",
          "Failures handled per execution, not per message",
          "Pauses (crisis freezes) handled at the communication",
          "Completion confirmed across all surfaces",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Compose once, deliver per execution — hand-forked messages fragment measurement and approval.",
        "Classify at creation; a restricted label applied late has already leaked.",
        "Schedule against the audience's calendar, not just the channel's capacity.",
        "Archive is the reward: clone precedent from the registry instead of drafting from zero.",
      ]},
    },
  ],
};

// ---------- Budget (/budget) ----------
const budget: PageHelp = {
  path: "/budget",
  playbookTitle: "Budget operations playbook",
  playbookSubtitle: "Plan allocations, watch computed burn, and reconcile spend to outcomes",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Budget",
          value: "The money layer: one budget per business unit per fiscal year with a planned amount and named allocations to campaigns. Agency retainers draw against the same pool.",
          simple: "Each business unit's yearly pot, carved into campaign shares.",
        },
        {
          label: "Committed spend",
          value: "Never a stored field — committed is computed by summing each allocated campaign's activity spend: every campaign activity carries its allocated spend, activities sum to campaign spend, and campaign spends sum to the budget's committed total.",
          simple: "The spent number is added up live from every activity — nobody types it in.",
        },
        {
          label: "Utilization",
          value: "Committed spend divided by the planned amount, computed at read time. The same selector powers the dashboard tile, this page's totals, and every drill-down row — so they agree by construction.",
          simple: "How much of the pot is used, calculated the same way everywhere.",
        },
        {
          label: "Variance",
          value: "The gap between a campaign's allocation and its committed activity spend, and between the budget's planned amount and its total commitments — with alerts and reforecasting when gaps grow.",
          simple: "Where the plan and reality disagree, campaign by campaign.",
        },
        {
          label: "Scenario comparison",
          value: "Three modelled what-if cases per campaign — conservative, base, and aggressive — each with a spend, expected conversions, expected ROI, and the assumptions it rests on. Conservative and aggressive are always read as deltas against the base case, and each column states the sensitivity in words: what moving the spend is expected to buy.",
          simple: "Three spend cases side by side, so the trade-off is a comparison rather than a guess.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the budget page exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Totals that reconcile",
          value: "Because every number rolls up from activity spend, a headline total can always be decomposed into the exact activities behind it — drill-down and rollup cannot disagree.",
          tip: "If a total looks wrong, drill to the activities — the fix is always in a record, never in the total.",
        },
        {
          label: "Money joined to outcomes",
          value: "Spend links to the metric results the funded work produced, so cost per outcome is computable across the graph — the difference between tracking burn and knowing what the burn bought.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Budget utilization",
          value: "Computed committed spend as a share of the planned amount, per business unit and rolled up.",
          simple: "How much of each pot is used.",
          tip: "Read utilization against time elapsed in the period — 40% used at 80% elapsed is as wrong as 95% at half-year.",
        },
        {
          label: "Allocation variance",
          value: "Per-campaign gap between the allocated amount and summed activity spend — over-commitments and idle allocations both surface here.",
          simple: "Which campaigns are outspending or under-using their share.",
        },
        {
          label: "Unallocated headroom",
          value: "Planned amount minus the sum of campaign allocations — the uncommitted reserve available for reallocation.",
          simple: "Money in the pot not yet promised to anything.",
        },
        {
          label: "Cost per outcome",
          value: "Committed spend joined to conversion-tier metric results for the funded campaigns — the ROI linkage.",
          simple: "What each result actually cost.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Review rollups", value: "Read utilization and variance from business unit down to campaign and activity." },
        { label: "Allocate", value: "Assign or adjust campaign allocations within the planned amount." },
        { label: "Drill through", value: "Decompose any total into the campaign allocations and activity spends behind it." },
        { label: "Reforecast", value: "Adjust allocations mid-period in response to variance, with the change audit-logged." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Wallet,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the rollup math",
      phaseDescription: "The model is three layers with one direction of truth: budgets hold planned amounts and campaign allocations; campaigns spend through their activities; and everything above an activity is computed. Committed spend is the sum of activity spend, utilization is committed over planned, and no total is ever stored — which is why every number on this page survives an audit drill-down.",
      intro: { icon: Sparkles, text: "Numbers are functions, not fields. The only editable money facts are the planned amount, the allocations, and each activity's spend — everything else is arithmetic done live." },
      cards: [
        { icon: Calculator, title: "Follow the arithmetic", description: "Pick any headline total and decompose it: budget committed = sum of campaign spends = sum of each campaign's activity spends. The chain is short and always intact.", checklist: [
          "One total decomposed to its activities",
          "Committed re-derived and matched to the display",
          "Utilization checked as committed over planned",
          "No stored total anywhere expected or found",
        ]},
        { icon: Wallet, title: "Read the structure", description: "One budget per business unit per fiscal year, allocations per campaign, agency retainers drawing from the same pool. Know which pot funds what before judging any number.", checklist: [
          "Budgets mapped to business units and year",
          "Campaign allocations reviewed for coverage",
          "Agency retainer draws identified",
          "Unallocated headroom computed and noted",
        ]},
      ],
    },
    {
      id: "plan", navLabel: "Plan & allocate", navIcon: Coins,
      phaseLabel: "Phase 2: Plan & allocate", phaseTitle: "Carve the pot deliberately",
      phaseDescription: "Allocation turns a planned amount into campaign shares. Allocate against strategy and expected outcomes, keep deliberate headroom for in-year opportunities, and remember that an allocation is a ceiling for activity planning — campaign teams allocate activity spend inside it.",
      cards: [
        { icon: Coins, title: "Allocate top down, check bottom up", description: "Set campaign allocations from strategic priority, then verify each campaign's activity plan actually fits inside its allocation before it goes for approval.", checklist: [
          "Allocations tied to strategy priorities",
          "Activity plans checked against allocations",
          "Deliberate headroom reserved, not accidental",
          "KPI targets set alongside the money",
        ]},
      ],
    },
    {
      id: "track", navLabel: "Track burn", navIcon: BarChart3,
      phaseLabel: "Phase 3: Track burn", phaseTitle: "Watch committed against planned",
      phaseDescription: "Because committed spend recomputes as activities are added, changed, or cancelled, burn tracking is continuous rather than a month-end exercise. Watch utilization against time elapsed, and treat variance alerts — a campaign's activities exceeding its allocation, or a budget approaching its planned amount — as prompts to act while the money can still move.",
      cards: [
        { icon: BarChart3, title: "Pace utilization", description: "Compare utilization to period progress per business unit and campaign. Under-burn late in a period is stranded money; over-burn early is a reforecast waiting to happen.", checklist: [
          "Utilization read against time elapsed",
          "Under-burning allocations identified for release",
          "Over-committed campaigns flagged before breach",
          "Variance alerts reviewed on cadence",
        ]},
        { icon: AlertTriangle, title: "Act on variance at the source", description: "Variance resolves where the spend lives: adjust activity spend in the campaign workspace, or move allocation between campaigns here. Never reconcile by editing a number that is computed.", checklist: [
          "Driver activity identified for each variance",
          "Fix applied in the owning record",
          "Reallocation decisions audit-logged",
          "Rollup re-checked after the change",
        ]},
      ],
    },
    {
      id: "reconcile", navLabel: "Reconcile & ROI", navIcon: Scale,
      phaseLabel: "Phase 4: Reconcile & ROI", phaseTitle: "Close the loop from spend to outcome",
      phaseDescription: "Reconciliation is cheap here by design: totals equal their parts because they are computed from them, so closing a period is verification, not archaeology. The real work is the ROI join — connecting each campaign's committed spend to the metric results it produced, so next period's allocations are informed by cost per outcome rather than last year plus inflation.",
      cards: [
        { icon: Scale, title: "Reconcile and learn", description: "Verify the rollups, settle final campaign spends against allocations, and compute cost per outcome per campaign for the planning cycle ahead.", checklist: [
          "Final committed verified against activities",
          "Allocation gaps explained per campaign",
          "Cost per outcome computed where results exist",
          "Findings fed into next period's allocations",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Never chase a wrong-looking total — drill to the activities and fix the record.",
        "Read utilization with the calendar; a percentage without time context misleads.",
        "Release idle allocations mid-period instead of defending them to year-end.",
        "Judge campaigns by cost per outcome, not by whether they spent their allocation.",
      ]},
    },
  ],
};

// ---------- Governance & crisis (/governance) ----------
const governance: PageHelp = {
  path: "/governance",
  playbookTitle: "Governance & crisis operations playbook",
  playbookSubtitle: "Policy enforcement, accelerated crisis approvals, and an audit trail that never forgets",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Policy",
          value: "A first-class rule record — brand, legal, regulatory, or accessibility — scoped to brands, regions, and channels, evaluated at workflow stage gates. Each policy declares its enforcement: block stops the transition until fixed; warn allows an override with a mandatory reason.",
          simple: "Written rules the system actually enforces at the gates — some are hard stops, some are warnings.",
        },
        {
          label: "Crisis-accelerated approvals",
          value: "When a crisis incident is active, approvals under it run a crisis variant that is parallel, time-boxed, and pre-delegated: all reviewers engage simultaneously and the gate resolves on quorum; SLA drops to minutes with expiry auto-escalating to the crisis lead, who holds standing delegation to decide alone. Nothing auto-approves silently.",
          simple: "In a crisis, sign-offs happen at once, on a stopwatch, with one named person empowered to decide — but never a silent yes.",
        },
        {
          label: "Append-only audit",
          value: "Every state transition, approval, delegation, escalation, override, and hold writes an audit record — actor, action, before-and-after diff, context — that is never updated or user-deletable. Retention is policy-driven and superseded only by legal hold.",
          simple: "A permanent ledger of who did what, when, and what changed — nobody can edit history.",
          notInThisBuild:
            "Transitions do now write records, append-only and persisted, and a crisis declared in-app builds a real timeline. What is still missing is the durability half: storage is per-browser localStorage, with no retention policy, no legal hold and nothing making it tamper-evident.",
        },
        {
          label: "Policy override",
          value: "An approver may override a warn-level finding only with a recorded reason, producing a policy-override audit record; block-level failures cannot be overridden below a configured role. AI gates advise and annotate — every decision stays approval-gated, owned by a stakeholder.",
          simple: "Warnings can be waived on the record; hard blocks cannot be talked past.",
          notInThisBuild:
            "The override reason is not persisted as an audit record, and no stage transition invokes an AI gate — the review only runs when a person presses the button on the record.",
        },
        {
          label: "Exception (policy waiver)",
          value: "A role-gated request that starts the WF-004 exception approval workflow for a campaign: the requester states the justification, scope, and mitigation, and the waiver routes through justification review into the shared approvals inbox. Nothing is exempted silently — a waiver is a decision on the record, not a bypass.",
          simple: "A formal 'let this one through' request that still needs review and leaves a trail.",
        },
        {
          label: "Brand risk",
          value: "A consolidated card of derived risk signals — assets whose rights expire within 30 days, content bounced into Rework, open approvals past their SLA, and active crisis incidents — each row deep-linking to the surface where it is resolved. The Brand Execution Agent monitors this card; the signals are computed live from the graph, never stored.",
          simple: "One list of everything currently threatening the brand, with a link to fix each item.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why governance and crisis share a surface",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Control without friction",
          value: "Policies enforce brand, legal, and regulatory rules automatically at the point of work — so compliance is a property of the workflow, not a review meeting at the end.",
          tip: "Fix chronic warn overrides by fixing the policy or the process — a warning everyone waives is a rule nobody believes.",
        },
        {
          label: "Speed with accountability",
          value: "The crisis variant proves the two are compatible: approvals compress from days to minutes while every relaxed safeguard is recorded, so post-incident review can replay exactly what was decided, by whom, and under which rules.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Policy findings",
          value: "Gate evaluations by outcome — pass, warn, block — across the scope and period, sliced by policy and enforcement level.",
          simple: "How often the rules fired, and how hard.",
        },
        {
          label: "Override rate",
          value: "Warn-level findings overridden with reasons, by policy and by actor — the pressure gauge on each rule.",
          simple: "How often people waive warnings, and on which rules.",
          tip: "A rising override rate on one policy means the rule, the threshold, or the training is wrong — investigate before tightening.",
        },
        {
          label: "Crisis approval performance",
          value: "During incidents: gate resolution time against the minutes-level time-box, quorum outcomes, and expiry escalations to the crisis lead.",
          simple: "Whether crisis decisions actually happened at crisis speed.",
        },
        {
          label: "Audit coverage",
          value: "Completeness of the ledger — every lifecycle transition and approval decision matched by its audit record.",
          simple: "Proof that nothing moved without leaving a trace.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Review policies", value: "Browse the policy library by kind, scope, and enforcement level, with version history." },
        { label: "Monitor incidents", value: "Track active crisis incidents, their accelerated approvals, and affected brands and regions." },
        { label: "Explore the audit trail", value: "Search the append-only ledger by actor, action, entity, and time." },
        { label: "Review overrides", value: "Read policy-override records with their reasons, by policy and actor." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Scale,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the control plane",
      phaseDescription: "Governance is three cooperating mechanisms: policies evaluated automatically at workflow gates, an approval engine whose behavior is fixed while its placement is configurable, and an append-only audit ledger recording every consequential act. The crisis center sits on the same machinery — it changes the speed of the gates, never their record-keeping.",
      intro: { icon: Sparkles, text: "The system never asks for trust — it produces evidence. Every rule fired, every override, every crisis decision is in the ledger." },
      cards: [
        { icon: Scale, title: "Map the three planes", description: "Know which mechanism owns which question: policies own 'is this allowed', approvals own 'who signed off', audit owns 'what exactly happened'.", checklist: [
          "Policy library scanned by kind and scope",
          "Approval gate placement understood per workflow",
          "Audit explorer opened and sample queries run",
          "Crisis variant configuration located",
        ]},
      ],
    },
    {
      id: "enforce", navLabel: "Enforce policy", navIcon: Gavel,
      phaseLabel: "Phase 2: Enforce policy", phaseTitle: "Run rules at the gates",
      phaseDescription: "Policies bind to entity types, regions, and workflow stages; automated brand and compliance gates evaluate them against each content version and write findings as machine approvals with per-rule detail. Enforcement level is the design decision: block for rules where violation is never acceptable, warn where informed approvers may proceed on the record.",
      cards: [
        { icon: Gavel, title: "Set enforcement deliberately", description: "Choose block versus warn per policy with intent. Blocks stop work until fixed and cannot be overridden below the configured role; warns permit reasoned overrides that are always audit-logged.", checklist: [
          "Block reserved for non-negotiable rules",
          "Warn used where judgment legitimately applies",
          "Override role thresholds configured",
          "Regional regulatory rules scoped correctly",
        ]},
        { icon: ShieldCheck, title: "Watch the override pattern", description: "Override records are governance telemetry. Frequent reasoned overrides of one rule mean the rule needs recalibrating; overrides without meaningful reasons mean the culture does.", checklist: [
          "Override rate reviewed per policy",
          "Reasons read, not just counted",
          "Chronic-override policies recalibrated",
          "Findings routed back to policy owners",
        ]},
      ],
    },
    {
      id: "crisis", navLabel: "Run crisis mode", navIcon: Siren,
      phaseLabel: "Phase 3: Run crisis mode", phaseTitle: "Decide in minutes, on the record",
      phaseDescription: "An active crisis incident switches entities under it to the crisis variant. Approvals fan out to all reviewers in parallel and resolve on quorum — by default the crisis lead plus any one other. Each gate is hard time-boxed in minutes; expiry auto-escalates to the crisis lead, who holds standing delegation to decide alone. The parent lifecycle compresses, seeded from pre-approved holding statements, so the crisis approval is the only mandatory gate.",
      cards: [
        { icon: Siren, title: "Activate the variant", description: "Declare the incident with severity and affected brands and regions; entities created under it resolve to the crisis workflow automatically. Speed comes from the variant — not from working around the system.", checklist: [
          "Incident declared with scope and severity",
          "Response team stakeholders activated",
          "Pre-approved holding statements pulled, not drafted",
          "Conflicting scheduled sends frozen for affected scope",
        ]},
        { icon: Clock, title: "Respect the time-box", description: "Reviewers engage in parallel against a minutes-level SLA. If the box expires, escalation to the crisis lead is automatic and recorded — the design guarantees a decision, never a silent approval.", checklist: [
          "Quorum configuration confirmed before need",
          "Crisis lead delegation standing and named",
          "Expiry escalations monitored in real time",
          "Every decision landing with its audit record",
        ]},
      ],
    },
    {
      id: "audit", navLabel: "Audit & review", navIcon: History,
      phaseLabel: "Phase 4: Audit & review", phaseTitle: "Read the ledger and close the loop",
      phaseDescription: "The audit trail is append-only: actor, action, before-and-after diff, and context for every transition, decision, delegation, override, and hold — retained per policy, frozen under legal hold, never editable. Post-incident review replays crisis decisions against the definition version and variant in force at the time, turning each incident into calibration for the next.",
      cards: [
        { icon: History, title: "Interrogate the trail", description: "Use the explorer to answer governance questions with records: who approved which version, what changed in a transition, which safeguards were relaxed during the incident and by whom.", checklist: [
          "Decisions traced to versions, not just records",
          "Override and escalation records reviewed",
          "Legal holds verified as freezing retention",
          "Gaps between transitions and records investigated",
        ]},
        { icon: FileSearch, title: "Run the post-incident review", description: "After a crisis, replay the timeline from the ledger: every accelerated approval, quorum decision, and expiry escalation. Feed the findings into the variant's configuration — quorum, time-box, delegation — before the next incident.", checklist: [
          "Timeline reconstructed from audit records",
          "Crisis-variant decisions replayed against their rules",
          "Time-box and quorum settings recalibrated",
          "Holding-statement library refreshed from lessons",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Reserve block enforcement for rules with no legitimate exception — everything else erodes.",
        "Treat override reasons as data; read them before tightening any rule.",
        "Pre-approve holding statements in peacetime — crisis speed is prepared, not improvised.",
        "Review the audit trail on cadence, not only when something goes wrong.",
      ]},
    },
  ],
};

// ---------- Internal comms (/internal) ----------
const internalComms: PageHelp = {
  path: "/internal",
  playbookTitle: "Internal comms operations playbook",
  playbookSubtitle: "Employee campaigns and leadership messages on the same spine as external",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Internal communication",
          value: "A communication typed internal — memos, change updates, policy notes — running the same lifecycle, approvals, and channel executions as external sends, delivered on internal-kind channels such as the intranet.",
          simple: "A message to employees, handled with the same rigor as anything customer-facing.",
        },
        {
          label: "Employee campaign",
          value: "A campaign typed internal, or one whose activities execute on internal-kind channels. Change programs, culture pushes, and leadership initiatives are campaigns like any other — briefed, budgeted, and measured.",
          simple: "A planned push aimed at employees instead of customers.",
        },
        {
          label: "Leadership message",
          value: "A corporate-class communication addressed to an employee-kind audience — CEO updates, org announcements. It appears here because of its audience, not its type.",
          simple: "Messages from the top, routed to staff.",
        },
        {
          label: "Restricted masking",
          value: "Communications classified Restricted show a masked subject to any role outside the restricted-read set — the row is visible, the content is not, exactly as on the communications registry.",
          simple: "Sensitive subjects stay hidden unless your role may read them.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why internal comms gets its own surface",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "One system, one graph",
          value: "Employee communication rides the same campaign, communication, audience, and KPI machinery as external marketing — no silo, no separate tool, no invisible internal calendar.",
          tip: "Internal and external sends share the unified calendar, so collisions with customer sends surface automatically.",
        },
        {
          label: "The employee-facing slice",
          value: "This page filters the shared graph to employee campaigns, internal messages, and leadership updates — the Internal Comms Manager's working view without the external noise.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Tiles shown on this page",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Employee reach",
          value: "Sum of computed segment sizes behind employee-kind audiences in scope — the addressable internal population.",
          simple: "How many employees your messages can reach.",
        },
        {
          label: "Internal messages in flight",
          value: "Internal communications not yet Completed, Archived, or Killed — the active internal send load.",
          simple: "How many employee messages are still moving.",
        },
        {
          label: "Upcoming in 30 days",
          value: "Employee-campaign activities, linked events, and scheduled internal or leadership sends falling inside the next 30 days.",
          simple: "What is about to hit employees this month.",
          tip: "A crowded 30-day window is an attention problem — employees tune out exactly like customers do.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Review employee campaigns", value: "Scan internal-typed campaigns with their activity counts, owners, and dates; open any campaign workspace." },
        { label: "Track internal messages", value: "Read each internal communication with its audience, schedule, and per-channel executions." },
        { label: "Read leadership messages", value: "Review corporate messages addressed to employee audiences, with owners and send dates." },
        { label: "Jump to the calendar", value: "Open the unified calendar to check internal sends against external activity." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Building2,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the employee-facing slice",
      phaseDescription: "Nothing on this page is a separate record type. Employee campaigns are campaigns, internal messages are communications, leadership updates are corporate comms with an employee audience — the page is a filter over the shared graph, so everything here also appears in the portfolio views and the unified calendar.",
      intro: { icon: Sparkles, text: "Internal comms is a lens, not a silo. Anything you fix here — a stalled campaign, an unscheduled message — you fix in the same workspaces as external work." },
      cards: [
        { icon: Building2, title: "Read the three lists", description: "Employee campaigns, internal messages, and leadership messages each answer a different question: what is planned, what is sending, and what leadership is saying.", checklist: [
          "Scope filters set to your remit",
          "Employee campaigns checked for owners and dates",
          "In-flight messages reviewed for stalled lifecycles",
          "Masked rows noted — restricted classification is working",
        ]},
      ],
    },
    {
      id: "plan", navLabel: "Plan & target", navIcon: Users,
      phaseLabel: "Phase 2: Plan & target", phaseTitle: "Aim at the right employees",
      phaseDescription: "Employee audiences are composed from segments exactly like customer audiences — by business unit, region, and role attributes. Employee reach on this page is a computed number, so targeting questions resolve in the audience registry, not in a distribution list someone maintains by hand.",
      cards: [
        { icon: Users, title: "Target through audiences", description: "Pick or compose the employee audience before drafting. A message to 'everyone' is a targeting decision too — make it deliberately.", checklist: [
          "Employee audience selected from the registry",
          "Segment composition checked for the intended slice",
          "Regional variants planned where messages localize",
          "Reach number sanity-checked against the org size",
        ]},
        { icon: CalendarClock, title: "Schedule against everything", description: "Internal sends share the calendar with external campaigns. Check the window before committing — a benefits update landing on launch day loses to the launch.", checklist: [
          "Unified calendar checked for the target week",
          "Collisions with external sends resolved",
          "Event and townhall anchors respected",
        ]},
      ],
    },
    {
      id: "deliver", navLabel: "Deliver & measure", navIcon: Send,
      phaseLabel: "Phase 3: Deliver & measure", phaseTitle: "Send on internal channels and close the loop",
      phaseDescription: "Internal messages deliver through channel executions on internal-kind channels — intranet, email, chat — one execution per surface with its own status. Engagement metric results flow back per communication, so internal comms gets the same evidence loop external campaigns have.",
      cards: [
        { icon: Send, title: "Watch the executions", description: "Each internal message lists its channel executions with per-surface status. Failures resolve at the execution level, not by resending the whole message.", checklist: [
          "One execution confirmed per target channel",
          "Delivery statuses read per surface",
          "Failed executions traced before retrying",
        ]},
        { icon: BarChart3, title: "Measure engagement", description: "Opens, reads, and feedback land as metric results on the communication. Judge internal sends by engagement, not by the fact they went out.", checklist: [
          "Engagement results reviewed per message",
          "Under-read messages investigated for timing or channel",
          "Learnings fed into the next employee campaign",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Treat employee attention like customer attention — check the calendar before every send.",
        "Target through audience records, never hand-maintained distribution lists.",
        "Keep leadership messages on the corporate class so their approvals and masking apply.",
        "Measure engagement per message; an unread announcement did not happen.",
      ]},
    },
  ],
};

// ---------- Events (/events) ----------
const events: PageHelp = {
  path: "/events",
  playbookTitle: "Events operations playbook",
  playbookSubtitle: "Launches, webinars, townhalls, and conferences as first-class graph citizens",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Event",
          value: "A dated occasion — launch, webinar, townhall, or conference — with a venue, region, owner, and usually a linked campaign. Events are graph citizens: they anchor the calendar and tie communications and activities to a moment.",
          simple: "A thing happening on a date, connected to the campaign it serves.",
        },
        {
          label: "Event window",
          value: "The event's start-to-end date range. The card lists every linked-campaign communication scheduled inside that window, so the sends surrounding the moment are visible at a glance.",
          simple: "The event's dates, plus every message going out during them.",
        },
        {
          label: "Run of show",
          value: "The linked campaign's activities whose date ranges overlap the event — derived, not hand-built. Expanding a card shows the execution plan around the occasion in start-date order.",
          simple: "What the team is actually doing before, during, and after the event.",
        },
        {
          label: "Scope rule",
          value: "Region filters directly on the event; brand and business unit filter through the linked campaign. Events without a campaign cannot express brand or BU and stay visible under those filters.",
          simple: "Events follow their campaign's scope — unlinked ones stay in view.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the events workspace exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Moments in context",
          value: "An event page separated from campaigns is a logistics list. Here every event carries its campaign lineage, surrounding sends, and run of show — the occasion and the work as one view.",
          tip: "An event with no linked campaign deserves a question: what initiative does this moment serve?",
        },
        {
          label: "Anchors for planning",
          value: "Events are fixed points other work schedules around. They render on the unified calendar, so sends and activities can anchor to them instead of colliding with them.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Tiles shown on this page",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Upcoming events",
          value: "Events whose end date is today or later, within the active scope.",
          simple: "How many occasions are still ahead.",
        },
        {
          label: "Events this quarter",
          value: "Events starting inside the current calendar quarter — the near-term density signal.",
          simple: "How busy this quarter's event schedule is.",
        },
        {
          label: "Linked campaigns",
          value: "Distinct campaigns that have at least one event — how much of the portfolio anchors to real-world moments.",
          simple: "How many campaigns have an event attached.",
          tip: "Compare against the campaign count — a low ratio means moments are being planned outside the system.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse upcoming and past", value: "Scan events grouped by whether they are still ahead, with type, venue, dates, region, and owner per card." },
        { label: "Expand the run of show", value: "Open any card to see the campaign activities overlapping the event dates." },
        { label: "Review event-window sends", value: "Read the linked campaign's communications scheduled inside the event window." },
        { label: "Open the campaign", value: "Jump from any event to its owning campaign workspace." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: CalendarDays,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand events in the graph",
      phaseDescription: "Events tie campaigns to moments. Each card is derived from the graph: the type chip and logistics from the event record, the surrounding sends from the linked campaign's communications, and the run of show from activities overlapping the dates. Upcoming events sort forward; past events sort most recent first.",
      intro: { icon: Sparkles, text: "The event record holds the moment; the campaign holds the work. Read them together — a well-run event is a campaign that peaks on the right day." },
      cards: [
        { icon: CalendarDays, title: "Scan the schedule", description: "Read upcoming events for density and ownership. Two launches in one week for the same region is a decision, not a coincidence — make sure someone made it.", checklist: [
          "Scope filters set to your remit",
          "Upcoming events checked for owner and venue",
          "Crowded weeks compared against the calendar",
          "Unlinked events questioned for their campaign",
        ]},
      ],
    },
    {
      id: "prepare", navLabel: "Prepare", navIcon: ListOrdered,
      phaseLabel: "Phase 2: Prepare", phaseTitle: "Build the run of show through the campaign",
      phaseDescription: "The run of show is derived from campaign activities overlapping the event dates — so preparing an event means planning activities in the campaign workspace with the right date ranges, owners, and channels. If the expanded card looks empty, the plan is empty.",
      cards: [
        { icon: ListOrdered, title: "Plan activities around the dates", description: "Create pre-event, day-of, and follow-up activities in the linked campaign so the run of show assembles itself here.", checklist: [
          "Activities dated to overlap the event window",
          "One owner per run-of-show item",
          "Channels booked for day-of coverage",
          "Follow-up activity planned before the event, not after",
        ]},
        { icon: Megaphone, title: "Sequence the sends", description: "Invitations, reminders, and follow-ups are communications scheduled around the window. Check the card's event-window list — it shows what the audience will actually receive during the moment.", checklist: [
          "Invitation and reminder sends scheduled",
          "Event-window sends reviewed for pile-up",
          "Audience collisions checked on the calendar",
        ]},
      ],
    },
    {
      id: "close", navLabel: "Run & close", navIcon: CheckCircle2,
      phaseLabel: "Phase 3: Run & close", phaseTitle: "Execute the moment and harvest it",
      phaseDescription: "During the event the run of show is the checklist; afterward the event moves to the past section but stays in the graph. Post-event work — attendance results, content harvest into the asset library, follow-up sends — belongs to the campaign, which is how event ROI rolls up.",
      cards: [
        { icon: CheckCircle2, title: "Close the loop", description: "After the event, capture outcomes where they are measured: metric results on the campaign, harvested content into the library, and a scheduled follow-up send while attention is warm.", checklist: [
          "Attendance and engagement results recorded",
          "Event content harvested into the asset library",
          "Follow-up communication sent inside a week",
          "Learnings noted on the campaign for the next event",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Link every event to a campaign — an unlinked event is invisible to scope, budget, and measurement.",
        "Plan the follow-up before the event; afterwards everyone is tired and attention decays fast.",
        "Anchor flexible sends around event dates on the calendar instead of discovering collisions later.",
        "Read past events' results before planning the next one of the same type.",
      ]},
    },
  ],
};

// ---------- PR & media (/pr) ----------
const prMedia: PageHelp = {
  path: "/pr",
  playbookTitle: "PR & media operations playbook",
  playbookSubtitle: "Earned coverage, journalist relationships, and press releases in one engine",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Coverage item",
          value: "An earned-media mention: headline, outlet, publish date, sentiment, and reach, usually linked to the campaign that earned it and the media contact who wrote it. Items with no campaign are crisis-adjacent and carry a crisis-watch flag.",
          simple: "One article or mention about you, tagged with who wrote it and what it earned.",
        },
        {
          label: "Media contact",
          value: "A journalist CRM record — outlet, beat, region, relationship strength (Strong, Warm, New), and last-interaction recency. Opening a contact shows every coverage item they have produced.",
          simple: "A journalist you know, with the history of what they have written.",
        },
        {
          label: "Press release",
          value: "A content record whose type is PR — it runs the standard content lifecycle with brand and legal review, and carries campaign lineage like any other content.",
          simple: "An official announcement, drafted and approved like all other content.",
        },
        {
          label: "Crisis watch",
          value: "Coverage with no linked campaign is coverage the organization did not earn on purpose. The crisis-watch chip links straight to the governance center for triage.",
          simple: "Unexpected press gets flagged and routed to the people who handle it.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why PR lives in the same graph",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Earned media, attributed",
          value: "Because coverage links to campaigns and contacts, 'what did this campaign earn in press' and 'who writes about us favorably' are queries, not a clippings folder.",
          tip: "Sort contacts by last interaction — relationship capital decays quietly when nobody is watching recency.",
        },
        {
          label: "Press with rigor",
          value: "Press releases run the standard content lifecycle — the same approvals, versions, and audit trail as every other piece — so speed to wire never means skipping legal.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Tiles shown on this page",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Total coverage reach",
          value: "Sum of reach across coverage items in scope — the earned-media volume signal.",
          simple: "How many people the press wrote your story to.",
        },
        {
          label: "Items this quarter",
          value: "Coverage published inside the current calendar quarter — the cadence of earned attention.",
          simple: "How much press landed recently.",
        },
        {
          label: "Positive sentiment",
          value: "Share of coverage items rated Positive — the quality complement to raw reach.",
          simple: "Of the coverage earned, how much was friendly.",
          tip: "High reach with sinking sentiment is the earliest visible shape of a brewing crisis.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Review coverage", value: "Scan the coverage table by outlet, campaign, sentiment, and reach; follow campaign links or crisis-watch flags." },
        { label: "Work the contact book", value: "Browse journalists by relationship and recency; open a contact for their full coverage history." },
        { label: "Track press releases", value: "Follow PR-typed content through its lifecycle with campaign lineage and status." },
        { label: "Escalate crisis-adjacent items", value: "Jump from an unlinked coverage item to the governance center." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Newspaper,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the earned-media loop",
      phaseDescription: "The three tabs are one loop: press releases go out through the content lifecycle, journalists in the contact book pick them up, and coverage items record what came back — with sentiment and reach as the score. Everything joins to campaigns, so earned media sits beside paid and owned in the same measurement graph.",
      intro: { icon: Sparkles, text: "Coverage you cannot attribute to a campaign or a contact is coverage you cannot repeat. The links are the strategy." },
      cards: [
        { icon: Newspaper, title: "Read the coverage table", description: "Scan recent items for sentiment and reach, and check which campaigns are earning attention. Unlinked items with the crisis-watch chip get triaged first.", checklist: [
          "Scope filters set to your remit",
          "Crisis-watch items triaged before anything else",
          "Sentiment mix read alongside the reach number",
          "Top-earning campaigns identified",
        ]},
      ],
    },
    {
      id: "relations", navLabel: "Work relationships", navIcon: Users,
      phaseLabel: "Phase 2: Work relationships", phaseTitle: "Tend the contact book",
      phaseDescription: "Media relationships are the compounding asset of PR. The contact table shows strength and recency; the detail sheet shows each journalist's actual output. Strong relationships going stale and new contacts never followed up are both visible here — the CRM only pays off if recency is worked.",
      cards: [
        { icon: Users, title: "Work by recency", description: "Sort by last interaction and reconnect before relationships cool. A strong contact untouched for weeks is a warm contact next quarter.", checklist: [
          "Stale strong relationships flagged for outreach",
          "New contacts followed up within the cycle",
          "Beats matched against upcoming announcements",
          "Contact history read before every pitch",
        ]},
      ],
    },
    {
      id: "press", navLabel: "Run press ops", navIcon: PenLine,
      phaseLabel: "Phase 3: Run press ops", phaseTitle: "Ship releases through the lifecycle",
      phaseDescription: "A press release is content of type PR: drafted against a brief, reviewed by brand and legal, approved, and distributed. The releases tab tracks each one's status and campaign lineage — a release stuck in review is visible here before the embargo date makes it everyone's problem.",
      cards: [
        { icon: PenLine, title: "Draft and route early", description: "Start releases with enough lifecycle runway for legal review. Embargo dates do not move; approvals sometimes do.", checklist: [
          "Release drafted against the campaign brief",
          "Legal review time budgeted before the embargo",
          "Status checked well ahead of the send date",
          "Approved release linked to its distribution sends",
        ]},
      ],
    },
    {
      id: "track", navLabel: "Track & respond", navIcon: Activity,
      phaseLabel: "Phase 4: Track & respond", phaseTitle: "Score the coverage and act on it",
      phaseDescription: "Coverage closes the loop: each item records what a release or campaign actually earned, from whom, at what sentiment. Rising negative sentiment or unlinked coverage routes to governance; positive coverage names the journalists and angles worth doubling down on next cycle.",
      cards: [
        { icon: Activity, title: "Read the pattern", description: "Look across items, not just at them: which outlets lean positive, which campaigns earn nothing, where sentiment is drifting quarter over quarter.", checklist: [
          "Sentiment trend read against last quarter",
          "Outlets ranked by reach and friendliness",
          "Campaigns with zero earned coverage questioned",
          "Negative items answered with a plan, not a shrug",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Triage crisis-watch items daily — unexpected press ages badly.",
        "Log every journalist interaction; recency data is only as good as its upkeep.",
        "Never let an embargo date arrive with the release still in review.",
        "Credit coverage to campaigns and contacts so next quarter's pitch list writes itself.",
      ]},
    },
  ],
};

// ---------- Agencies (/agencies) ----------
const agencies: PageHelp = {
  path: "/agencies",
  playbookTitle: "Agency operations playbook",
  playbookSubtitle: "External partners as governed participants, not email attachments",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Agency",
          value: "A registry record for an external partner — capabilities, operating regions, and linked stakeholder contacts. Agencies participate in the workflow through the graph, with their workload derived from the activities assigned to them.",
          simple: "An external partner on the books, with what they do and where they do it.",
        },
        {
          label: "Assigned workload",
          value: "The campaign activities carrying this agency's id — each with dates, status, owning campaign, and allocated spend. The card's numbers are computed from these records, never typed in.",
          simple: "The actual work items the agency is on the hook for.",
        },
        {
          label: "Committed spend",
          value: "The sum of allocated spend across the agency's assigned activities — the same activity-spend facts the budget page rolls up, sliced by agency instead of by campaign.",
          simple: "What the agency's assigned work costs, added up live.",
        },
        {
          label: "Scoped external access",
          value: "Agency users see only the briefs, campaigns, and assets explicitly assigned to their agency — an allowlist, not scope inheritance — with internal-only fields stripped.",
          simple: "Partners see exactly what they are assigned, and nothing else.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the agency registry exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Partners inside the workflow",
          value: "Agencies work through the same briefs, approvals, and lifecycles as internal teams — deliverables land in the workflow, not in an email thread nobody can audit.",
          tip: "Sign in as the Agency User role from the login picker to see exactly what a partner sees.",
        },
        {
          label: "Workload and money in one view",
          value: "Each card joins the agency's activities, status mix, campaigns touched, and committed spend — so 'what are they doing and what is it costing' is one glance, per partner.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Metrics that matter here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Committed spend per agency",
          value: "Summed allocated spend across each agency's assigned activities — the financial exposure per partner.",
          simple: "How much money rides on each agency.",
        },
        {
          label: "Activity status mix",
          value: "Assigned activities by state — Planned, In Progress, Completed, Blocked — the delivery health signal per partner.",
          simple: "Whether the agency's work is moving or stuck.",
          tip: "Blocked activities on an agency card usually wait on an internal approval, not on the agency.",
        },
        {
          label: "Campaigns touched",
          value: "Distinct campaigns the agency's activities belong to — the concentration signal.",
          simple: "How spread out the agency's work is.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Review agency cards", value: "Read each partner's capabilities, regions, contacts, workload table, and committed spend." },
        { label: "Follow the work", value: "Open any assigned activity's campaign workspace directly from the card." },
        { label: "Check the contacts", value: "See external agency stakeholders and the internal owners of their activities side by side." },
        { label: "Preview partner access", value: "Switch to the Agency User role to verify the scoped external view." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Briefcase,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand agencies in the graph",
      phaseDescription: "An agency card is a derived view: registry facts (capabilities, regions, contacts) plus computed workload (assigned activities, status mix, campaigns, spend). Because the workload comes from campaign activities, everything here reconciles with the campaign workspaces and the budget rollups by construction.",
      intro: { icon: Sparkles, text: "The agency relationship lives in assignments, not attachments. If work is not an assigned activity, it is invisible to status, spend, and audit." },
      cards: [
        { icon: Briefcase, title: "Read the cards", description: "Scan each partner for capability fit, current load, and delivery health. A capable agency with zero assignments and a stretched one with everything are both allocation findings.", checklist: [
          "Region filter matched to your remit",
          "Capabilities read against upcoming needs",
          "Status mix checked for blocked work",
          "Committed spend compared across partners",
        ]},
      ],
    },
    {
      id: "assign", navLabel: "Assign work", navIcon: GitMerge,
      phaseLabel: "Phase 2: Assign work", phaseTitle: "Put partners on activities, not email threads",
      phaseDescription: "Work reaches an agency by assigning it to a campaign activity — with dates, an internal owner, and allocated spend. The assignment is what grants the partner scoped access to the relevant briefs and assets, and what makes their work visible to status and budget rollups.",
      cards: [
        { icon: GitMerge, title: "Assign with a full contract", description: "Every agency activity needs dates, an internal owner, spend, and an approved brief — the partner works from exactly what the record says.", checklist: [
          "Activity dated with an internal owner named",
          "Spend allocated within the campaign budget",
          "Brief approved before the agency starts",
          "Capability matched to the activity's channel",
        ]},
      ],
    },
    {
      id: "track", navLabel: "Track delivery", navIcon: Activity,
      phaseLabel: "Phase 3: Track delivery & spend", phaseTitle: "Watch the status mix and the money",
      phaseDescription: "The card's status mix and workload table are the delivery dashboard per partner: blocked activities name what is stuck, completed ones accumulate the track record, and committed spend tracks exposure as assignments change. Deliverables come back through the workflow, where reviews and approvals record quality.",
      cards: [
        { icon: Activity, title: "Track the mix", description: "Review each agency's blocked and in-progress work on cadence. Chase blockers to their source — often an internal approval — rather than chasing the agency.", checklist: [
          "Blocked activities traced to their blocker",
          "Aging in-progress work questioned",
          "Deliverables reviewed through the workflow",
          "Spend exposure re-checked after assignment changes",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Never brief an agency outside the workflow — unassigned work has no status, spend, or audit trail.",
        "Approve the brief before the agency starts; partner rework is billed rework.",
        "Read blocked agency work as an internal signal first — the gate is usually yours.",
        "Balance load across partners deliberately; concentration is a delivery risk.",
      ]},
    },
  ],
};

// ---------- Board pack (/reports) ----------
const boardPack: PageHelp = {
  path: "/reports",
  playbookTitle: "Board pack operations playbook",
  playbookSubtitle: "A print-ready leadership report where every figure survives a drill-down",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Board pack",
          value: "A print-optimized leadership report — executive summary, portfolio, performance, budget, and risk & governance — generated live from the same records that power every other page, for the active scope.",
          simple: "The leadership deck, assembled from live data instead of screenshots.",
        },
        {
          label: "Narrative summary",
          value: "The opening paragraph combines an AI-generated portfolio summary with derived clauses — live campaigns, mean KPI attainment, budget utilization, reach, and the risk watch — every number computed, none typed.",
          simple: "A written summary whose every figure comes from the data below it.",
        },
        {
          label: "RAG status",
          value: "Campaign health as On track, At risk, or Off track, derived from KPI attainment — the same signal the command center uses, printed for leadership.",
          simple: "Green, amber, red per campaign — computed, not negotiated.",
        },
        {
          label: "Leadership gate & masking",
          value: "The page opens only for leadership roles, and Restricted crisis incidents render masked for anyone outside the restricted-read set — the report respects classification even on paper.",
          simple: "Only leadership sees this page, and restricted items stay hidden even here.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the board pack exists",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Reporting without assembly",
          value: "The monthly scramble of screenshots and reconciled spreadsheets is replaced by one page that is always current — because it reads the graph, not a copy of it.",
          tip: "Set the topbar scope before printing — the whole report recomputes to the slice you choose.",
        },
        {
          label: "Evidence leadership can trust",
          value: "Every figure traces to selector-driven records, so any number challenged in the boardroom can be decomposed in the app — the report and the system cannot disagree.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Headline figures in the report",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Total reach & conversions",
          value: "Portfolio-level metric result rollups for the active scope — the outcome headline.",
          simple: "What everything in scope delivered.",
        },
        {
          label: "Mean KPI attainment",
          value: "Average attainment across every KPI attached to in-scope campaigns — the single-number health signal, with the per-KPI table behind it.",
          simple: "On average, how close campaigns are to their goals.",
          tip: "The mean hides the tail — read the per-campaign KPI table before presenting the average.",
        },
        {
          label: "Budget utilization",
          value: "Committed versus planned per business unit with a totals row, plus the scoped rollup — same math as the budget page.",
          simple: "How much of the money is used, by business unit.",
        },
        {
          label: "Risk watch",
          value: "At-risk campaigns, active crisis incidents by severity, and pending approvals past SLA — the section leadership reads first.",
          simple: "What could go wrong, ranked.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Scope the report", value: "Change brand, business unit, or region in the topbar to recompute every section." },
        { label: "Print or save as PDF", value: "One click produces a clean paginated document — app chrome hidden, sections kept whole." },
        { label: "Read the sections", value: "Walk executive summary, portfolio, performance, budget, and risk & governance in order." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: FileSearch,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand what the pack asserts",
      phaseDescription: "The board pack is five numbered sections computed live for the active scope: an executive summary with the narrative and headline tiles, the portfolio by status and brand, KPI attainment per campaign, budget by business unit, and the risk watch. It is a read-only projection — fixing a number means fixing the record it derives from.",
      intro: { icon: Sparkles, text: "This page is the exam, not the homework. If a figure surprises you here, the investigation happens in the owning module — and the pack updates itself." },
      cards: [
        { icon: FileSearch, title: "Walk the sections", description: "Read the pack top to bottom the way leadership will: narrative first, then the tables that substantiate it, ending on risk.", checklist: [
          "Scope confirmed against the intended audience",
          "Narrative read against the headline tiles",
          "Risk section reviewed before anything else is presented",
        ]},
      ],
    },
    {
      id: "verify", navLabel: "Verify", navIcon: CheckCircle2,
      phaseLabel: "Phase 2: Verify", phaseTitle: "Stand behind every number",
      phaseDescription: "Because the pack shares its data with the working pages, verification is cross-navigation: attainment rows match the performance page, budget rows match the budget page, and the risk watch matches governance. Anything that looks wrong is traced in the owning module — never annotated around.",
      cards: [
        { icon: CheckCircle2, title: "Pre-brief the surprises", description: "Identify the numbers that will draw questions — misses, overspend, red campaigns — and trace each to its driver before the meeting does.", checklist: [
          "Every red or amber campaign explained with a driver",
          "Budget outliers decomposed to their activities",
          "Overdue approvals chased or owned in the narrative",
          "Masked restricted rows left masked — that is policy",
        ]},
      ],
    },
    {
      id: "deliver", navLabel: "Deliver", navIcon: Printer,
      phaseLabel: "Phase 3: Deliver", phaseTitle: "Print, present, and act on the response",
      phaseDescription: "Print produces the PDF: chrome hidden, white background, sections unbroken. The pack's job in the room is to move decisions — reallocations, escalations, target recalibrations — and each of those lands back in the owning module, where next month's pack will show the effect.",
      cards: [
        { icon: Printer, title: "Ship the pack", description: "Print or save as PDF once the scope and numbers are verified. Date context is in the header — a stale printout misrepresents a live system.", checklist: [
          "Scope and as-of date checked in the header",
          "PDF paginated cleanly, sections whole",
          "Decisions from the meeting routed to owning modules",
          "Follow-ups assigned with owners, not minutes",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Set the scope first — a pack for the wrong slice is confidently wrong everywhere.",
        "Trace every red flag to its driver before the meeting, not during it.",
        "Present the mean attainment with its distribution; averages hide the story.",
        "Treat the printed pack as a snapshot — decisions execute in the live system.",
      ]},
    },
  ],
};

// ---------- Administration (/admin) ----------
const admin: PageHelp = {
  path: "/admin",
  playbookTitle: "Administration operations playbook",
  playbookSubtitle: "Workflows, org structure, and users & roles — the backbone everything depends on",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Workflow designer",
          value: "The versioned configuration surface for workflows and their stages — which lifecycle applies to which entity type and scope, where approval gates sit, and who reviews at each one. Placement is configurable; gate behavior is engine-owned.",
          simple: "Where your organization decides how work flows and where sign-offs happen.",
        },
        {
          label: "Org structure",
          value: "The read-only tree Organization → business units → brands, with derived counts (campaigns per BU, content per brand) and brand guardrail policies, plus the regions list. Brands display under the business units their campaigns actually run in.",
          simple: "The company's shape, annotated with what each part is actually doing.",
        },
        {
          label: "Users & roles",
          value: "The stakeholder directory — one identity per persona with role, business unit, region, and brand scope — and a sign-in-as action that switches the whole app to that person's view.",
          simple: "Who exists in the system and what slice each person sees.",
        },
        {
          label: "Nav visibility matrix",
          value: "The role-by-navigation grid rendered straight from the access rules — which roles see which surfaces. Data scoping happens on top of it; the matrix governs visibility, not permissions.",
          simple: "A live chart of who sees which pages, straight from the actual rules.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why administration is its own surface",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Configuration as data",
          value: "Workflows, org shape, and role scopes are records the rest of the system reads — changing them here changes how every module gates, scopes, and routes work.",
          tip: "Administration is Platform Admin-only; other roles see a switch-identity prompt instead of the tabs.",
        },
        {
          label: "Transparency over the rules",
          value: "The org tree and visibility matrix are rendered from live rules, not documentation — what this page shows is exactly what the system enforces.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Signals worth reading here",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Campaigns per business unit",
          value: "Derived counts on the org tree — where the work actually concentrates across the structure.",
          simple: "Which parts of the company are busiest.",
        },
        {
          label: "Content per brand",
          value: "Derived content counts per brand, alongside each brand's tone and guardrail policies.",
          simple: "How much material each brand is producing.",
        },
        {
          label: "Role coverage",
          value: "The visibility matrix read as a whole — which surfaces are broadly visible and which are tightly held.",
          simple: "How open or locked-down each part of the app is.",
          tip: "A surface visible to a role that never uses it is scope creep waiting for an audit question.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Design workflows", value: "Configure versioned workflows and stages — lifecycles, gate placement, and reviewers per entity type." },
        { label: "Browse the org tree", value: "Read the organization, business units, brands with guardrails, and regions, with derived counts." },
        { label: "Manage identities", value: "Review the stakeholder directory and switch identity via sign-in-as to verify any persona's view." },
        { label: "Audit visibility", value: "Read the role-by-navigation matrix rendered from the live access rules." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Settings,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the backbone",
      phaseDescription: "Administration holds the three record sets everything else reads: workflow definitions that drive every lifecycle and gate, the org structure that scopes every filter and rollup, and the identity directory that determines what each person sees. Nothing here is cosmetic — every edit propagates.",
      intro: { icon: Sparkles, text: "This page configures the rules other pages obey. Change deliberately: a workflow edit re-routes every future approval it touches." },
      cards: [
        { icon: Settings, title: "Know the three tabs", description: "Workflows configure process, org structure describes shape, users & roles govern access. Read each before changing any — they interlock.", checklist: [
          "Signed in as Platform Admin",
          "Current workflow versions reviewed",
          "Org tree read with its derived counts",
          "Visibility matrix scanned for surprises",
        ]},
      ],
    },
    {
      id: "workflows", navLabel: "Configure workflows", navIcon: Workflow,
      phaseLabel: "Phase 2: Configure workflows", phaseTitle: "Place the gates, version the change",
      phaseDescription: "The designer edits workflows as versioned definitions: stages, entry criteria, approval gates, and reviewer roles per entity type and scope. In-flight work pins the version it started on — edits apply to new entities, which is what makes workflow change safe to do in daylight.",
      cards: [
        { icon: Workflow, title: "Edit with intent", description: "Every gate you add is future latency for a reason; every gate you remove is a control you chose to drop. Name the reason either way.", checklist: [
          "Gate placement justified by a real risk",
          "Reviewer roles matched to actual reviewers",
          "SLA hours realistic for the stage",
          "New version published, not an in-place mutation",
        ]},
      ],
    },
    {
      id: "org", navLabel: "Steward the org", navIcon: Building2,
      phaseLabel: "Phase 3: Steward the org & identities", phaseTitle: "Keep shape and access honest",
      phaseDescription: "The org tree and directory are the scoping ground truth: brand guardrails bind policies, stakeholder scopes drive what every persona sees, and the visibility matrix shows the net effect. Verification is cheap — sign in as any persona and look.",
      cards: [
        { icon: Building2, title: "Read the derived tree", description: "The counts on the tree are live: business units without campaigns and brands without content are structure the organization pays for but does not use.", checklist: [
          "Idle business units and brands questioned",
          "Brand guardrail policies reviewed per brand",
          "Regions list matched to operating reality",
        ]},
        { icon: Users, title: "Verify access by walking it", description: "Use sign-in-as to see the app exactly as a persona sees it — the fastest audit of role scoping there is.", checklist: [
          "Each persona's view spot-checked after changes",
          "Matrix cross-checked against expectations",
          "Agency User view verified for allowlist scoping",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Version workflow changes; never mutate a definition under in-flight work.",
        "Add gates for named risks, not for comfort — every gate is someone's wait.",
        "Audit the visibility matrix on cadence; access drifts quietly.",
        "Test role changes by signing in as the affected persona, not by reading the config.",
      ]},
    },
  ],
};

// ---------- Graph explorer (/graph) ----------
const graph: PageHelp = {
  path: "/graph",
  playbookTitle: "Graph explorer operations playbook",
  playbookSubtitle: "Traverse the relationship graph — references, dependents, and impact",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Relationship graph",
          value: "Every record in the system — from organization to metric result — connected by typed links. The explorer makes the graph itself a first-class screen: pick any record and see its neighborhood.",
          simple: "Everything connects to something; this page shows the connections.",
        },
        {
          label: "References vs referenced by",
          value: "Two directions of the same graph: References lists everything the selected record points to; Referenced by lists everything that points at it — both grouped by entity type with the link relation named per row.",
          simple: "What this record uses, and what would notice if it changed.",
        },
        {
          label: "Impact preview",
          value: "A simulated cascade for three blueprint scenarios: asset rights expiry (asset → content versions → communications → campaigns), campaign cancellation (activities, communications, released budget), and audience redefinition (retargeted communications, shifting live campaigns).",
          simple: "A what-if: change this record, and here is everything that moves.",
        },
        {
          label: "Traversal chain",
          value: "Each impact row is a breadcrumb path through the graph — record by record, with statuses — so the blast radius is a list of named things, not a count.",
          simple: "The exact path from the change to each affected item.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the graph gets its own screen",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "Impact analysis is traversal",
          value: "Questions like 'what breaks if this asset expires' are graph walks, not reports. The explorer runs the walk on demand for any record, before the change happens.",
          tip: "Run the impact preview before cancelling, expiring, or redefining anything — the cascade is cheaper to read than to discover.",
        },
        {
          label: "Nothing floats free, verified",
          value: "The system's rule is that every record traces to its lineage. The explorer is where that claim is checkable — a record with no inbound links is either brand new or a governance gap.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "Numbers shown on this page",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Link counts",
          value: "Outbound and inbound link totals per selected record — the connectivity measure, computed by traversal.",
          simple: "How wired-in this record is.",
        },
        {
          label: "Impact stats",
          value: "Per scenario: content versions embedding an asset, communications carrying it, campaigns exposed; activities and communications a cancel would stop; live campaigns an audience shift would move.",
          simple: "The size of the blast radius, in named units.",
          tip: "A zero-impact result is information too — it means the record can change safely right now.",
        },
        {
          label: "Released budget",
          value: "For campaign cancellation: the allocation that would return to the pool — the financial side of the cascade.",
          simple: "The money that comes back if the campaign stops.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Pick any record", value: "Choose an entity type and search for a record across every collection in the graph." },
        { label: "Read both directions", value: "Review what the record references and what references it, grouped by entity type." },
        { label: "Preview impact", value: "Simulate asset expiry, campaign cancellation, or audience redefinition as traversal chains." },
        { label: "Follow the links", value: "Jump from any linked record to its owning workspace." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Waypoints,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the graph as a tool",
      phaseDescription: "Every page in the app is a curated view over the same graph; the explorer is the uncurated one. Pick an entity type, pick a record, and read its neighborhood raw — outbound references, inbound dependents, and, for assets, campaigns, and audiences, a simulated cascade of what a change would touch.",
      intro: { icon: Sparkles, text: "When a question does not fit any page — who uses this, why does this exist, what breaks — the graph is where the answer already is." },
      cards: [
        { icon: Waypoints, title: "Explore a record", description: "Start from something you know — a live campaign, a busy asset — and read both link panels. The relation labels on each row tell you why the connection exists.", checklist: [
          "Entity type and record selected",
          "References panel read for the record's inputs",
          "Referenced-by panel read for its dependents",
          "Relation labels understood per row",
        ]},
      ],
    },
    {
      id: "trace", navLabel: "Trace lineage", navIcon: Network,
      phaseLabel: "Phase 2: Trace lineage", phaseTitle: "Answer why and who-uses-this",
      phaseDescription: "Lineage questions run in both directions: upstream through references (which brief, which strategy, which idea explains this record) and downstream through dependents (which communications, approvals, and results hang off it). A record with missing upstream links is unexplained work; one with no dependents may be abandoned.",
      cards: [
        { icon: Network, title: "Walk the chain", description: "Follow links hop by hop — the explorer keeps every hop clickable, and workspace routes are one click away when you need the full record.", checklist: [
          "Upstream lineage traced to a strategy or idea",
          "Downstream dependents scanned for surprises",
          "Orphaned records flagged to their owners",
        ]},
      ],
    },
    {
      id: "impact", navLabel: "Simulate impact", navIcon: AlertTriangle,
      phaseLabel: "Phase 3: Simulate impact", phaseTitle: "Read the cascade before making the change",
      phaseDescription: "The impact preview simulates the three blueprint cascades with real traversal: an asset expiry names every content version, communication, and campaign exposed; a campaign cancel lists the activities and communications that stop and the budget that returns; an audience shift shows which sends retarget and which live campaigns move.",
      cards: [
        { icon: AlertTriangle, title: "Preview, then decide", description: "Run the preview on the record you intend to change and read the chains, not just the stats — the chain shows exactly who to warn.", checklist: [
          "Impact preview run before the change",
          "Every chain read to its terminal record",
          "Live and scheduled items in the radius flagged",
          "Owners of affected work notified first",
        ]},
        { icon: Search, title: "Use it for audits too", description: "The same traversal answers governance questions cold: pick a policy, an approval, or an audit record and read what it governs and where it came from.", checklist: [
          "Sample audits run from policy and approval records",
          "Unlinked records treated as findings",
          "Recurring questions turned into page requests",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Simulate before you mutate — the preview costs seconds, the surprise costs a send.",
        "Read chains, not counts; the names in the path are your notification list.",
        "Treat missing inbound links as a lineage gap, not a curiosity.",
        "Start explorations from the record you know and walk outward one hop at a time.",
      ]},
    },
  ],
};

// ---------- Brand to Demand lifecycle (/lifecycle) ----------
const lifecycle: PageHelp = {
  path: "/lifecycle",
  playbookTitle: "Brand to Demand operations playbook",
  playbookSubtitle: "The eight-stage MarCom lifecycle — who owns each stage, what it must produce, and who signs",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "Brand to Demand",
          value: "The named end-to-end lifecycle of the MarCom function, the way HR runs hire-to-retire and finance runs procure-to-pay. Eight ordered stages — Govern, Understand, Plan, Create, Comply, Activate, Measure, Learn — each with a purpose, an owning agent set, a required output, and a approver decision gate.",
          simple: "The single named process the whole marketing function runs, start to end.",
        },
        {
          label: "Lifecycle stage",
          value: "A reference record (not a hardcoded list) carrying order, key, purpose, owning agent IDs, key output, and approval gate. The stepper renders whatever the reference data holds, so the lifecycle is configuration rather than code.",
          simple: "One step of the process, described in data — change the data and the page changes.",
        },
        {
          label: "Key output vs approval gate",
          value: "Every stage names the artifact it must produce before the next stage may start, and the named approver decision that releases it. A stage with an output but no signed gate has not completed.",
          simple: "What the step must hand over, and who has to say yes before it moves on.",
        },
        {
          label: "Governance spine",
          value: "Workflow, approval gates, audit trail, role-based access, and the policy engine run beneath all eight stages rather than as a ninth one — which is why they sit above the stepper as a banner.",
          simple: "The controls that apply to every stage, not just one of them.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the lifecycle gets its own screen",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "One spine, visible",
          value: "Every other page is a workspace for part of the lifecycle. This page is the lifecycle itself — the orientation view that shows how ideation, campaigns, content, approvals, activation, and measurement are one process rather than eight tools.",
          tip: "Use this page to onboard: read the stage purposes in order before opening any workspace.",
        },
        {
          label: "Stage to screen, directly",
          value: "Each stage's deep links are derived from its owning agents' declared surfaces and filtered through your role's nav access — so a stage always points at the screen where its work actually happens, and never at a door you cannot open.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "What to read on this page",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Stage coverage",
          value: "Whether every stage has at least one owning agent and a named approval gate — an unowned or ungated stage is a governance gap, not a simplification.",
          simple: "Does every step have someone running it and someone signing it.",
        },
        {
          label: "Reachable surfaces per stage",
          value: "How many of a stage's derived deep links your role can actually open — a stage with no reachable links tells you the work belongs to someone else.",
          simple: "Which steps you can act on yourself.",
          tip: "Empty link sets are role information, not a bug — switch identity in the login picker to see another role's view.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Read the stepper", value: "Walk the eight stages in order with purpose, owning agents, key output, and approval gate per stage." },
        { label: "Jump to the work", value: "Open any stage's deep links to the workspace where that stage is executed." },
        { label: "Open the agent roster", value: "Follow any named agent through to the agent catalogue for its capabilities and build status." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Route,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Read the lifecycle end to end",
      phaseDescription: "The stepper renders the eight stages in their configured order. Read them as one sentence: set the rules (Govern), learn the market (Understand), commit the portfolio (Plan), produce the material (Create), clear it (Comply), deliver it (Activate), reconcile it (Measure), and fold the findings back into the rules (Learn).",
      intro: { icon: Sparkles, text: "Nothing on this page is hardcoded — stages, agents, and links all resolve from the reference data. If the operating model changes, the page changes with it." },
      cards: [
        { icon: Route, title: "Walk the eight stages", description: "Take each stage in order and read its purpose, its owning agents, the output it must produce, and the approver decision that releases it.", checklist: [
          "Purpose read before the outputs",
          "Owning agents noted per stage",
          "Key output identified as a concrete artifact",
          "Approval gate matched to a named role",
        ]},
        { icon: ShieldCheck, title: "Note the spine", description: "Workflow, gates, audit, access, and policy sit beneath every stage. Treat them as constant conditions, not as a stage you can skip.", checklist: [
          "Spine elements read before the stepper",
          "Gates understood as engine-owned, not per-team",
          "Audit expectation accepted for every transition",
        ]},
      ],
    },
    {
      id: "locate", navLabel: "Locate your work", navIcon: Compass,
      phaseLabel: "Phase 2: Locate", phaseTitle: "Find where you sit in the spine",
      phaseDescription: "Your role owns decisions at specific gates and work in specific stages. The derived deep links are already filtered to what you can reach, so the stages that show you actionable links are the stages you are accountable in.",
      cards: [
        { icon: Compass, title: "Find your stages", description: "Scan for the stages whose approval gate names your role, and the stages whose links open for you. Those two sets are your remit.", checklist: [
          "Gates naming your role identified",
          "Reachable stage links opened once each",
          "Hand-off points to other roles understood",
        ]},
        { icon: GitMerge, title: "Trace a hand-off", description: "Pick one campaign and follow it across stage boundaries — brief to content, content to approval, approval to send — to see the spine working on a real record.", checklist: [
          "One record followed across three stages",
          "Each stage's output located on the record",
          "Gate decisions found in the audit trail",
        ]},
      ],
    },
    {
      id: "improve", navLabel: "Improve the model", navIcon: ListChecks,
      phaseLabel: "Phase 3: Improve", phaseTitle: "Feed Learn back into Govern",
      phaseDescription: "The lifecycle closes on itself: Learn exists to convert what actually happened into standing rules, brief templates, and next-cycle ideas held in Govern. A finding that never becomes a rule is a finding you will rediscover next quarter.",
      cards: [
        { icon: ListChecks, title: "Close the loop", description: "After each cycle, decide explicitly which findings become policy amendments and which stay as one-off notes — that decision is itself a named approval gate.", checklist: [
          "Findings reviewed against the Govern policy set",
          "Rule changes proposed with an owner",
          "One-off notes recorded without becoming policy",
          "Stage gates re-checked after any rule change",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Read the lifecycle before the workspaces — the tools make sense only in the order of the spine.",
        "Treat a stage with no named approval gate as incomplete, however automated it looks.",
        "Follow one real record across stage boundaries rather than reasoning about the model abstractly.",
        "Route improvement findings into Govern deliberately; the loop only closes if someone changes a rule.",
      ]},
    },
  ],
};

// ---------- Agent catalogue (/agents) ----------
const agents: PageHelp = {
  path: "/agents",
  playbookTitle: "Agent catalogue operations playbook",
  playbookSubtitle: "The A1–A8 roster — what each agent does, where it acts, and what is demonstrable today",
  synopsis: [
    {
      id: "definitions", title: "Definitions & key concepts", subtitle: "Core terminology on this page",
      icon: BookMarked, tone: TONES.blue,
      items: [
        {
          label: "MarCom agent",
          value: "One of eight named agents (A1–A8) in the reference roster, each with a purpose, a core value, the lifecycle stages it owns, its capabilities, and the product surfaces it acts on. The roster is data: a ninth agent row renders a ninth card.",
          simple: "A named assistant with a defined job, the steps it works in, and the screens it touches.",
        },
        {
          label: "Build status",
          value: "Each agent states what is demonstrable in this build, not what the target architecture promises: Live in this build, Partly live, or On the roadmap. The chip is read from the seed record's status field.",
          simple: "An honest label for how much of this agent actually works right now.",
          tip: "Read the status chip before quoting an agent's capability in a demo — 'Partly live' means part of it is not there yet.",
        },
        {
          label: "Surfaces",
          value: "The routes an agent acts on. Cards group by the lifecycle stage where the agent first enters the spine, and every surface link is filtered through your role's nav access.",
          simple: "The screens the agent works on — and you only see the ones you can open.",
        },
        {
          label: "Approval required",
          value: "No agent holds a decision. Agents draft, check, route, and compute; the lifecycle's named approval gates remain the only way work advances. An AI review can block, but only an approver can clear.",
          simple: "Agents do the work; people still make the calls.",
        },
      ],
    },
    {
      id: "purpose", title: "Purpose of this page", subtitle: "Why the roster gets its own screen",
      icon: Compass, tone: TONES.teal,
      items: [
        {
          label: "One honest roster",
          value: "A single place answering 'what agents exist, what do they actually do, and how much of it works today' — instead of capability claims scattered across decks and demos.",
          tip: "Pair this page with the Brand to Demand lifecycle: the stepper shows the stages, this page shows who runs them.",
        },
        {
          label: "Agents mapped to the spine",
          value: "Every agent is anchored to the lifecycle stages it owns, so automation is described in terms of the operating model rather than as a list of features.",
        },
      ],
    },
    {
      id: "kpis", title: "Key KPIs", subtitle: "What to read on this page",
      icon: TrendingUp, tone: TONES.emerald,
      items: [
        {
          label: "Agents live in this build",
          value: "Count of roster entries whose status is Live — the demonstrable surface area of the agent layer.",
          simple: "How many agents fully work today.",
        },
        {
          label: "Stage coverage",
          value: "Which lifecycle stages have an owning agent and which rely entirely on manual execution — the automation map of the spine.",
          simple: "Which steps have an assistant and which do not.",
        },
        {
          label: "Reachable surfaces",
          value: "How many of an agent's surfaces open for your role — the practical measure of what that agent can do for you specifically.",
          simple: "How much of this agent's work you can actually see.",
        },
      ],
    },
    {
      id: "actions", title: "User actions allowed", subtitle: "What you can do on this page",
      icon: MousePointerClick, tone: TONES.violet,
      items: [
        { label: "Browse the roster", value: "Read all eight agents grouped by the lifecycle stage where each enters the spine." },
        { label: "Check build status", value: "Read the per-agent status chip for what is demonstrable in this build." },
        { label: "Open a surface", value: "Follow an agent's deep links to the workspace where it acts, subject to your role's access." },
        { label: "Ask the copilot", value: "Open the MarCom Copilot (agent A8) from the topbar to ask about any record it cites." },
      ],
    },
  ],
  playbook: [
    {
      id: "overview", navLabel: "Overview", navIcon: Bot,
      phaseLabel: "Phase 1: Overview", phaseTitle: "Understand the agent layer",
      phaseDescription: "Eight agents cover the spine: brand governance (A1), market intelligence (A2), product marketing planning (A3), content studio (A4), corporate communication (A5), campaign orchestration (A6), marketing analytics (A7), and the MarCom Copilot (A8). Cards group by entry stage, so the page reads Govern through Learn in operating-model order.",
      intro: { icon: Sparkles, text: "The roster is reference data and the status chips are deliberately conservative. If a card says 'Partly live', believe the card rather than the ambition." },
      cards: [
        { icon: Bot, title: "Read the cards", description: "For each agent, read purpose and core value first, then the stages it owns, then its capabilities — the order that keeps features anchored to the lifecycle.", checklist: [
          "Purpose and core value read before capabilities",
          "Owned stages matched against the lifecycle stepper",
          "Status chip noted per agent",
          "Surfaces opened where your role allows",
        ]},
        { icon: Layers, title: "Map the coverage", description: "Compare the roster against the eight stages to see where automation is dense and where the lifecycle still runs on people alone.", checklist: [
          "Stages with no owning agent identified",
          "Stages with two or more agents understood as hand-offs",
          "Gaps raised as roadmap questions, not defects",
        ]},
      ],
    },
    {
      id: "verify", navLabel: "Verify claims", navIcon: Search,
      phaseLabel: "Phase 2: Verify", phaseTitle: "Check the claim against the build",
      phaseDescription: "Any capability listed here should be checkable on a real surface. Open the agent's links and find the feature working on live records — the catalogue is meant to be quotable back at us, so verify before you repeat it.",
      cards: [
        { icon: Search, title: "Follow a capability to a screen", description: "Pick one capability, open the agent's surface, and locate it on a real record. If you cannot find it, the status chip is the answer.", checklist: [
          "One capability chosen per agent of interest",
          "Surface opened and the feature located",
          "Discrepancies noted against the status chip",
        ]},
        { icon: ShieldCheck, title: "Confirm the approval gate", description: "For every agent that acts on work in flight, find the named approver decision that still releases it in the lifecycle stepper.", checklist: [
          "Gate located for each agent-touched stage",
          "No agent found holding a final decision",
          "Audit trail checked for agent-assisted transitions",
        ]},
      ],
    },
    {
      id: "use", navLabel: "Put them to work", navIcon: ListChecks,
      phaseLabel: "Phase 3: Use", phaseTitle: "Work with the agents day to day",
      phaseDescription: "Agents earn their place by removing preparation, not judgment: a drafted brief you edit, a compliance check you adjudicate, a performance read you sign. The copilot is the general entry point — it answers from the same records every page reads and cites what it used.",
      cards: [
        { icon: ListChecks, title: "Delegate preparation, keep judgment", description: "Let agents produce the first draft, the first check, the first read — then apply your own review before anything advances a stage.", checklist: [
          "AI output reviewed line by line, never pasted forward",
          "Citations followed to the underlying records",
          "Decision recorded by a named approver at the gate",
        ]},
      ],
      bestPractices: { title: "Best practices", items: [
        "Quote the status chip, not the ambition, when describing what an agent does today.",
        "Anchor every agent to its lifecycle stages — capability lists without a stage are marketing.",
        "Follow copilot citations to the source records before acting on an answer.",
        "Treat an unowned stage as a deliberate manual step until the roadmap says otherwise.",
      ]},
    },
  ],
};

export const pageHelpRegistry: PageHelp[] = [
  commandCenter,
  lifecycle,
  agents,
  ideas,
  campaigns,
  communications,
  internalComms,
  calendar,
  events,
  content,
  assets,
  audiences,
  journeys,
  approvals,
  performance,
  boardPack,
  budget,
  prMedia,
  agencies,
  governance,
  admin,
  graph,
];

export function getHelpForPath(pathname: string): PageHelp | undefined {
  // Exact match wins outright.
  const exact = pageHelpRegistry.find((p) => p.path === pathname);
  if (exact) return exact;

  // Longest-prefix match on path segments, so detail routes inherit their
  // parent's help (/campaigns/CMP-003 → /campaigns). A prefix only counts
  // when it ends at a segment boundary, and '/' never matches everything.
  let best: PageHelp | undefined;
  for (const entry of pageHelpRegistry) {
    if (entry.path === "/") continue;
    if (!pathname.startsWith(`${entry.path}/`)) continue;
    if (!best || entry.path.length > best.path.length) best = entry;
  }
  return best;
}
