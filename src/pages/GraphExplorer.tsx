/**
 * Graph explorer — the relationship graph as a first-class screen.
 *
 * Blueprint Part 7 §3: impact analysis is graph traversal. Pick any record and
 * see everything it references ("References", via linksFrom), everything that
 * points at it ("Referenced by", via linksTo), and an impact preview that
 * simulates the blueprint cascades (asset expiry, campaign cancel, audience
 * shift) as breadcrumb-style traversal chains. Every count is derived.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  ChevronsUpDown,
  Waypoints,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";

import { useLiveDB } from "@/data/useLiveDB";
import { assetImpact, linksFrom, linksTo } from "@/data/selectors";
import type { Campaign, Communication, EntityName, SeedDB, TypedLink } from "@/data/types";
import { fmtCurrency } from "@/lib/format";
import { canReachPath, useRole, type AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

/** Roles allowed to read Restricted communication subjects. */
const RESTRICTED_VIEWERS: readonly AppRole[] = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
];

const MASKED_SUBJECT = "Restricted communication";

/* ------------------------------------------------------------------ */
/* Entity registry (mirrors the collections graphSelectors traverses)  */
/* ------------------------------------------------------------------ */

type Row = { id: string } & Record<string, unknown>;

const ENTITY_TYPES: { name: EntityName; label: string }[] = [
  { name: "Organization", label: "Organization" },
  { name: "BusinessUnit", label: "Business units" },
  { name: "Brand", label: "Brands" },
  { name: "Region", label: "Regions" },
  { name: "Stakeholder", label: "Stakeholders" },
  { name: "Agency", label: "Agencies" },
  { name: "Idea", label: "Ideas" },
  { name: "Strategy", label: "Strategies" },
  { name: "Campaign", label: "Campaigns" },
  { name: "CampaignActivity", label: "Campaign activities" },
  { name: "Brief", label: "Briefs" },
  { name: "Communication", label: "Communications" },
  { name: "ChannelExecution", label: "Channel executions" },
  { name: "Channel", label: "Channels" },
  { name: "Content", label: "Content" },
  { name: "ContentVersion", label: "Content versions" },
  { name: "Asset", label: "Assets" },
  { name: "Audience", label: "Audiences" },
  { name: "Segment", label: "Segments" },
  { name: "Workflow", label: "Workflows" },
  { name: "WorkflowStage", label: "Workflow stages" },
  { name: "Approval", label: "Approvals" },
  { name: "Policy", label: "Policies" },
  { name: "Notification", label: "Notifications" },
  { name: "Budget", label: "Budgets" },
  { name: "KPI", label: "KPIs" },
  { name: "MetricResult", label: "Metric results" },
  { name: "AuditRecord", label: "Audit records" },
  // The agent roster and its run ledger are deep-link targets
  // (`AgentsPage`, `AgentTrace` both link `?entity=MarcomAgent|AgentRun`), so
  // they must be selectable here or those links land on a picker that cannot
  // find the record they name.
  { name: "MarcomAgent", label: "Agents" },
  { name: "AgentRun", label: "Agent runs" },
  // The remainder of what `graphSelectors.collections()` traverses. A type the
  // graph can reach but this registry omits renders an unlabelled entity Select
  // and an empty record picker, so the page cannot say which record is on
  // screen — this list and that one must stay in step.
  { name: "CustomerPersona", label: "Personas" },
  { name: "Journey", label: "Journeys" },
  { name: "Event", label: "Events" },
  { name: "CrisisIncident", label: "Crisis incidents" },
  { name: "MediaContact", label: "Media contacts" },
  { name: "CoverageItem", label: "Coverage items" },
  { name: "SuppressionEntry", label: "Suppression entries" },
  { name: "ConsentSummary", label: "Consent summaries" },
  { name: "Competitor", label: "Competitors" },
  { name: "LifecycleStage", label: "Lifecycle stages" },
  { name: "Jurisdiction", label: "Jurisdictions" },
  { name: "LegalClause", label: "Legal clauses" },
  { name: "GlossaryTerm", label: "Glossary terms" },
];

/** Entity names the picker can actually resolve — guards the `?entity=` param. */
const KNOWN_ENTITIES: ReadonlySet<string> = new Set(ENTITY_TYPES.map((t) => t.name));

function rowsOf(db: SeedDB, name: EntityName): Row[] {
  switch (name) {
    case "Organization": return [db.org as unknown as Row];
    case "BusinessUnit": return db.businessUnits as unknown as Row[];
    case "Brand": return db.brands as unknown as Row[];
    case "Region": return db.regions as unknown as Row[];
    case "Stakeholder": return db.stakeholders as unknown as Row[];
    case "Agency": return db.agencies as unknown as Row[];
    case "Idea": return db.ideas as unknown as Row[];
    case "Strategy": return db.strategies as unknown as Row[];
    case "Campaign": return db.campaigns as unknown as Row[];
    case "CampaignActivity": return db.campaignActivities as unknown as Row[];
    case "Brief": return db.briefs as unknown as Row[];
    case "Communication": return db.communications as unknown as Row[];
    case "ChannelExecution": return db.channelExecutions as unknown as Row[];
    case "Channel": return db.channels as unknown as Row[];
    case "Content": return db.contents as unknown as Row[];
    case "ContentVersion": return db.contentVersions as unknown as Row[];
    case "Asset": return db.assets as unknown as Row[];
    case "Audience": return db.audiences as unknown as Row[];
    case "Segment": return db.segments as unknown as Row[];
    case "Workflow": return db.workflows as unknown as Row[];
    case "WorkflowStage": return db.workflowStages as unknown as Row[];
    case "Approval": return db.approvals as unknown as Row[];
    case "Policy": return db.policies as unknown as Row[];
    case "Notification": return db.notifications as unknown as Row[];
    case "Budget": return db.budgets as unknown as Row[];
    case "KPI": return db.kpis as unknown as Row[];
    case "MetricResult": return db.metricResults as unknown as Row[];
    case "AuditRecord": return db.auditRecords as unknown as Row[];
    case "MarcomAgent": return db.marcomAgents as unknown as Row[];
    case "AgentRun": return db.agentRuns as unknown as Row[];
    case "CustomerPersona": return db.customerPersonas as unknown as Row[];
    case "Journey": return db.journeys as unknown as Row[];
    case "Event": return db.events as unknown as Row[];
    case "CrisisIncident": return db.crisisIncidents as unknown as Row[];
    case "MediaContact": return db.mediaContacts as unknown as Row[];
    case "CoverageItem": return db.coverageItems as unknown as Row[];
    case "SuppressionEntry": return db.suppressionEntries as unknown as Row[];
    case "ConsentSummary": return db.consentSummaries as unknown as Row[];
    case "Competitor": return db.competitors as unknown as Row[];
    case "LifecycleStage": return db.lifecycleStages as unknown as Row[];
    case "Jurisdiction": return db.jurisdictions as unknown as Row[];
    case "LegalClause": return db.legalClauses as unknown as Row[];
    case "GlossaryTerm": return db.glossaryTerms as unknown as Row[];
    default: return [];
  }
}

/** Restricted-subject masking, mirroring CommunicationsPage. */
function subjectOf(comm: Communication, canReadRestricted: boolean): string {
  return comm.classification === "Restricted" && !canReadRestricted
    ? MASKED_SUBJECT
    : comm.subject;
}

/** Readable title for any record, mirroring graphSelectors.displayTitle. */
function titleOf(
  db: SeedDB,
  entity: EntityName,
  id: string,
  canReadRestricted: boolean,
): string {
  if (entity === "ContentVersion") {
    const version = db.contentVersions.find((v) => v.id === id);
    if (version) {
      const content = db.contents.find((c) => c.id === version.contentId);
      return `${content?.title ?? version.contentId} ${version.versionNumber}`;
    }
  }
  if (entity === "Communication") {
    const comm = db.communications.find((c) => c.id === id);
    if (comm) return subjectOf(comm, canReadRestricted);
  }
  const row = rowsOf(db, entity).find((r) => r.id === id);
  if (!row) return id;
  for (const key of ["title", "name", "subject", "filename", "headline"]) {
    const v = row[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return row.id;
}

/**
 * App route for an entity, where one exists (detail routes for campaign/content).
 *
 * Several of these are restricted routes and this page is not: a Content
 * Manager can open the graph but not `/audiences`, `/budget`, `/journeys`,
 * `/agencies`, `/governance` or `/admin`. `LinkRow` therefore gates the result
 * with `canReachPath` and renders plain text rather than a link that bounces.
 */
function routeFor(entity: EntityName, id: string): string | undefined {
  switch (entity) {
    case "Campaign": return `/campaigns/${id}`;
    case "Content": return `/content/${id}`;
    case "Idea": return "/ideas";
    case "CampaignActivity": return "/campaigns";
    case "Communication": return "/communications";
    case "Asset": return "/assets";
    case "Audience": return "/audiences";
    case "Segment": return "/audiences";
    case "Agency": return "/agencies";
    case "Approval": return "/approvals";
    case "Budget": return "/budget";
    case "KPI": return "/performance";
    case "MetricResult": return "/performance";
    case "Channel": return "/journeys";
    case "Workflow": return "/admin";
    case "WorkflowStage": return "/admin";
    case "Policy": return "/governance";
    default: return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Link panels                                                         */
/* ------------------------------------------------------------------ */

function LinkRow({
  db,
  link,
  canReadRestricted,
}: {
  db: SeedDB;
  link: TypedLink;
  canReadRestricted: boolean;
}) {
  const title = titleOf(db, link.entity, link.id, canReadRestricted);
  const { role } = useRole();
  const candidate = routeFor(link.entity, link.id);
  const to = candidate && canReachPath(role, candidate) ? candidate : undefined;
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
      <span className="min-w-0 truncate">
        {to ? (
          <Link to={to} className="font-medium text-primary hover:underline">
            {title}
          </Link>
        ) : (
          <span className="font-medium">{title}</span>
        )}
      </span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">{link.rel}</span>
    </div>
  );
}

function LinkPanel({
  db,
  icon: Icon,
  title,
  description,
  links,
  emptyHint,
  canReadRestricted,
}: {
  db: SeedDB;
  icon: typeof ArrowUpRight;
  title: string;
  description: string;
  links: TypedLink[];
  emptyHint: string;
  canReadRestricted: boolean;
}) {
  const groups = useMemo(() => {
    const byEntity = new Map<EntityName, TypedLink[]>();
    for (const link of links) {
      const list = byEntity.get(link.entity) ?? [];
      list.push(link);
      byEntity.set(link.entity, list);
    }
    // Present groups in the canonical entity order, then anything the graph
    // traverses that this page's registry does not list. Filtering those out
    // silently made the header count disagree with the rows below it — a
    // persona or an agent run referencing the record was counted and then
    // never shown, which reads as "Referenced by 6 · nothing references this".
    const ordered = ENTITY_TYPES.filter((t) => byEntity.has(t.name)).map((t) => ({
      label: t.label,
      links: byEntity.get(t.name) ?? [],
    }));
    const known = new Set<EntityName>(ENTITY_TYPES.map((t) => t.name));
    const rest = [...byEntity.entries()]
      .filter(([entity]) => !known.has(entity))
      .map(([entity, entityLinks]) => ({ label: entity as string, links: entityLinks }));
    return [...ordered, ...rest];
  }, [links]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="ml-auto text-sm font-normal tabular-nums text-muted-foreground">
            {links.length}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {groups.length === 0 ? (
          <p className="px-4 pb-2 text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="px-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                {group.label} ({group.links.length})
              </div>
              <div className="divide-y divide-border/60 border-y border-border/60">
                {group.links.map((link, i) => (
                  <LinkRow
                    key={`${link.id}-${link.rel}-${i}`}
                    db={db}
                    link={link}
                    canReadRestricted={canReadRestricted}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Impact preview — breadcrumb chains                                  */
/* ------------------------------------------------------------------ */

interface ChainStep {
  label: string;
  /** Entity type caption under the label. */
  kind: string;
  to?: string;
  status?: string;
}

function ImpactChain({ steps }: { steps: ChainStep[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1.5">
      {steps.map((step, i) => (
        <div key={`${step.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
            <span className="flex flex-col leading-tight">
              {step.to ? (
                <Link to={step.to} className="text-xs font-medium text-primary hover:underline">
                  {step.label}
                </Link>
              ) : (
                <span className="text-xs font-medium">{step.label}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{step.kind}</span>
            </span>
            {step.status && <StatusBadge status={step.status} />}
          </span>
        </div>
      ))}
    </div>
  );
}

function ImpactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-lg font-medium tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

interface ImpactModel {
  headline: string;
  stats: { label: string; value: string }[];
  chains: ChainStep[][];
}

/** Communications that would carry a content record (direct or via executions). */
function communicationsOfContent(db: SeedDB, contentId: string): Communication[] {
  const versionIds = new Set(
    db.contentVersions.filter((v) => v.contentId === contentId).map((v) => v.id),
  );
  const commIds = new Set<string>();
  for (const c of db.communications) if (c.contentId === contentId) commIds.add(c.id);
  for (const x of db.channelExecutions) {
    if (x.contentVersionId && versionIds.has(x.contentVersionId)) commIds.add(x.communicationId);
  }
  return db.communications.filter((c) => commIds.has(c.id));
}

/** Campaign a communication rolls up to via its activity, if any. */
function campaignOfCommunication(db: SeedDB, comm: Communication): Campaign | undefined {
  if (!comm.campaignActivityId) return undefined;
  const activity = db.campaignActivities.find((a) => a.id === comm.campaignActivityId);
  return activity ? db.campaigns.find((c) => c.id === activity.campaignId) : undefined;
}

/** Blueprint cascade: Asset expiry → ContentVersions → Contents → Communications → Campaigns. */
function assetImpactModel(db: SeedDB, assetId: string, canReadRestricted: boolean): ImpactModel {
  const asset = db.assets.find((a) => a.id === assetId);
  const impact = assetImpact(db, assetId);
  const communications = new Map<string, Communication>();
  for (const content of impact.contents) {
    for (const comm of communicationsOfContent(db, content.id)) communications.set(comm.id, comm);
  }

  const chains: ChainStep[][] = [];
  for (const version of impact.contentVersions) {
    const content = impact.contents.find((c) => c.id === version.contentId);
    const comms = content ? communicationsOfContent(db, content.id) : [];
    const base: ChainStep[] = [
      { label: asset?.filename ?? assetId, kind: "Asset", to: routeFor("Asset", assetId) },
      {
        label: `${content?.title ?? version.contentId} ${version.versionNumber}`,
        kind: "Content version",
        to: content ? routeFor("Content", content.id) : undefined,
      },
    ];
    if (comms.length === 0) {
      chains.push(base);
      continue;
    }
    for (const comm of comms) {
      const campaign = campaignOfCommunication(db, comm);
      const chain: ChainStep[] = [
        ...base,
        {
          label: subjectOf(comm, canReadRestricted),
          kind: "Communication",
          to: routeFor("Communication", comm.id),
          status: comm.status,
        },
      ];
      if (campaign) {
        chain.push({
          label: campaign.name,
          kind: "Campaign",
          to: routeFor("Campaign", campaign.id),
          status: campaign.status,
        });
      }
      chains.push(chain);
    }
  }

  return {
    headline: asset?.rightsExpiry
      ? `If rights on this asset expire (${asset.rightsExpiry}), everything below is affected.`
      : "If this asset expires, everything below is affected.",
    stats: [
      { label: "Content versions embedding it", value: String(impact.contentVersions.length) },
      { label: "Content records", value: String(impact.contents.length) },
      { label: "Communications carrying it", value: String(communications.size) },
      { label: "Campaigns exposed", value: String(impact.campaigns.length) },
    ],
    chains,
  };
}

/** Cancel cascade: Campaign → activities → communications + budget allocation. */
function campaignImpactModel(
  db: SeedDB,
  campaignId: string,
  canReadRestricted: boolean,
): ImpactModel {
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  const activities = db.campaignActivities.filter((a) => a.campaignId === campaignId);
  const activityIds = new Set(activities.map((a) => a.id));
  const communications = db.communications.filter(
    (c) => c.campaignActivityId && activityIds.has(c.campaignActivityId),
  );
  const allocated = db.budgets
    .flatMap((b) => b.allocations)
    .filter((a) => a.campaignId === campaignId)
    .reduce((sum, a) => sum + a.amount, 0);

  const chains: ChainStep[][] = activities.map((activity) => {
    const chain: ChainStep[] = [
      {
        label: campaign?.name ?? campaignId,
        kind: "Campaign",
        to: routeFor("Campaign", campaignId),
      },
      {
        label: activity.name,
        kind: "Activity",
        to: routeFor("CampaignActivity", activity.id),
        status: activity.status,
      },
    ];
    for (const comm of communications.filter((c) => c.campaignActivityId === activity.id)) {
      chain.push({
        label: subjectOf(comm, canReadRestricted),
        kind: "Communication",
        to: routeFor("Communication", comm.id),
        status: comm.status,
      });
    }
    return chain;
  });

  return {
    headline: "If this campaign is cancelled, these activities and communications stop and the budget allocation is released.",
    stats: [
      { label: "Activities cancelled", value: String(activities.length) },
      { label: "Communications halted", value: String(communications.length) },
      {
        label: "Budget allocation released",
        value: fmtCurrency(allocated || campaign?.budgetAllocation || 0),
      },
    ],
    chains,
  };
}

/** Shift cascade: Audience → communications targeting it → campaigns, flagging live ones. */
function audienceImpactModel(
  db: SeedDB,
  audienceId: string,
  canReadRestricted: boolean,
): ImpactModel {
  const communications = db.communications.filter((c) => c.audienceId === audienceId);
  const campaigns = new Map<string, Campaign>();
  for (const comm of communications) {
    const campaign = campaignOfCommunication(db, comm);
    if (campaign) campaigns.set(campaign.id, campaign);
  }
  const live = [...campaigns.values()].filter((c) => c.status === "Live");

  const chains: ChainStep[][] = communications.map((comm) => {
    const campaign = campaignOfCommunication(db, comm);
    const chain: ChainStep[] = [
      {
        label: titleOf(db, "Audience", audienceId, canReadRestricted),
        kind: "Audience",
        to: routeFor("Audience", audienceId),
      },
      {
        label: subjectOf(comm, canReadRestricted),
        kind: "Communication",
        to: routeFor("Communication", comm.id),
        status: comm.status,
      },
    ];
    if (campaign) {
      chain.push({
        label: campaign.name,
        kind: "Campaign",
        to: routeFor("Campaign", campaign.id),
        status: campaign.status,
      });
    }
    return chain;
  });

  return {
    headline: "If this audience is redefined, these communications retarget and the live campaigns below shift.",
    stats: [
      { label: "Communications targeting it", value: String(communications.length) },
      { label: "Campaigns touched", value: String(campaigns.size) },
      { label: "Live campaigns shifting", value: String(live.length) },
    ],
    chains,
  };
}

function ImpactPreview({
  db,
  entity,
  id,
  canReadRestricted,
}: {
  db: SeedDB;
  entity: EntityName;
  id: string;
  canReadRestricted: boolean;
}) {
  const model = useMemo<ImpactModel | null>(() => {
    if (entity === "Asset") return assetImpactModel(db, id, canReadRestricted);
    if (entity === "Campaign") return campaignImpactModel(db, id, canReadRestricted);
    if (entity === "Audience") return audienceImpactModel(db, id, canReadRestricted);
    return null;
  }, [db, entity, id, canReadRestricted]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Waypoints className="h-4 w-4 text-muted-foreground" />
          Impact preview
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {model
            ? model.headline
            : "Impact simulation is available for assets (rights expiry), campaigns (cancellation), and audiences (redefinition). Pick one of those entity types to preview a cascade."}
        </p>
      </CardHeader>
      {model && (
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {model.stats.map((s) => (
              <ImpactStat key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
          {model.chains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing downstream — this record cascades to no other work.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {model.chains.map((chain, i) => (
                <ImpactChain key={i} steps={chain} />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Record combobox                                                     */
/* ------------------------------------------------------------------ */

function RecordPicker({
  db,
  entity,
  selectedId,
  onSelect,
  canReadRestricted,
}: {
  db: SeedDB;
  entity: EntityName;
  selectedId: string | null;
  onSelect: (id: string) => void;
  canReadRestricted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rows = rowsOf(db, entity);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal sm:w-80"
        >
          <span className="truncate">
            {selectedId ? titleOf(db, entity, selectedId, canReadRestricted) : "Pick a record…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search records…" />
          <CommandList>
            <CommandEmpty>No record matches.</CommandEmpty>
            <CommandGroup>
              {rows.map((row) => {
                const title = titleOf(db, entity, row.id, canReadRestricted);
                return (
                  <CommandItem
                    key={row.id}
                    value={`${title} ${row.id}`}
                    onSelect={() => {
                      onSelect(row.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedId === row.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 truncate">{title}</span>
                    <span className="ml-auto pl-2 font-mono text-xs text-muted-foreground">
                      {row.id}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function GraphExplorer() {
  return (
    <ErrorBoundary>
      <GraphExplorerContent />
    </ErrorBoundary>
  );
}

function GraphExplorerContent() {
  const db = useLiveDB();
  const { role } = useRole();
  const canReadRestricted = RESTRICTED_VIEWERS.includes(role);
  // Records deep-link here via ?entity=<EntityName>&id=<recordId> so the
  // relationship chips on a detail page can open the graph already focused on
  // that record, rather than dropping the user on a picker.
  const [searchParams] = useSearchParams();
  /* Validated, not cast: an `?entity=` value the picker cannot resolve would
     put an unmatchable value in the Select, which then renders blank with no
     way back to a labelled state. */
  const rawEntity = searchParams.get("entity");
  const paramEntity =
    rawEntity !== null && KNOWN_ENTITIES.has(rawEntity) ? (rawEntity as EntityName) : null;
  const paramId = searchParams.get("id");

  const [entity, setEntity] = useState<EntityName>(paramEntity ?? "Asset");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => paramId ?? db.assets[0]?.id ?? null,
  );

  /* A second deep link arriving while this page is already mounted only
     changes the query string — React Router keeps the element mounted, so the
     initial state above never sees it and the page would keep showing the
     record from the first link. */
  useEffect(() => {
    if (paramEntity) setEntity(paramEntity);
  }, [paramEntity]);
  useEffect(() => {
    if (paramId) setSelectedId(paramId);
  }, [paramId]);

  const outbound = useMemo(
    () => (selectedId ? linksFrom(db, selectedId) : []),
    [db, selectedId],
  );
  const inbound = useMemo(
    () => (selectedId ? linksTo(db, selectedId) : []),
    [db, selectedId],
  );

  const handleEntityChange = (value: string) => {
    const next = value as EntityName;
    setEntity(next);
    setSelectedId(rowsOf(db, next)[0]?.id ?? null);
  };

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Graph explorer"
        description="Traverse the relationship graph behind every record — references, dependents, and impact"
      />

      {/* Entity picker */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={entity} onValueChange={handleEntityChange}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.name} value={t.name}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RecordPicker
          db={db}
          entity={entity}
          selectedId={selectedId}
          onSelect={setSelectedId}
          canReadRestricted={canReadRestricted}
        />
        {selectedId && (
          <span className="font-mono text-xs text-muted-foreground">{selectedId}</span>
        )}
      </div>

      {!selectedId ? (
        <EmptyState
          icon={Waypoints}
          title="No record selected"
          hint="Pick an entity type and a record to explore its relationships."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <LinkPanel
              db={db}
              icon={ArrowUpRight}
              title="References"
              description="Every record this one points to, grouped by entity type"
              links={outbound}
              emptyHint="This record references nothing."
              canReadRestricted={canReadRestricted}
            />
            <LinkPanel
              db={db}
              icon={ArrowDownLeft}
              title="Referenced by"
              description="Everything in the graph that points at this record"
              links={inbound}
              emptyHint="Nothing references this record."
              canReadRestricted={canReadRestricted}
            />
          </div>

          <ImpactPreview
            db={db}
            entity={entity}
            id={selectedId}
            canReadRestricted={canReadRestricted}
          />
        </>
      )}
    </div>
  );
}
