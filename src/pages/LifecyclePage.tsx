/**
 * Brand to Demand lifecycle — the MarCom module's spine, rendered end to end.
 *
 * Every enterprise function has a named lifecycle: HR runs hire to retire,
 * finance runs procure to pay. MarCom runs Brand to Demand. This page is the
 * canonical view of that lifecycle, and it is a live one: the eight stages are
 * rendered as a pipeline, and each stage carries the count of records that are
 * actually sitting in it right now, plus how many of those are blocked or
 * waiting on a person.
 *
 * Nothing here is hard-coded. Stage order and labels come from
 * `LIFECYCLE_ORDER` / `LIFECYCLE_LABELS`; placement comes from
 * `lifecycleStageFor()` run over the live collections, so a record's stage is
 * always derived from its status rather than a second field that can drift.
 * Blocked and at-risk tallies come from `blockerFor()`. Reference content
 * (purpose, owning agents, key output, approval gate) resolves from
 * `db.lifecycleStages` and agent names from `db.marcomAgents`; stage deep links
 * are the union of the owning agents' declared `surfaces`, filtered through
 * `canSeeNav` so the pipeline never points a role at a locked door.
 *
 * No list page understands a lifecycle-stage filter today, so selecting a stage
 * renders its records inline here rather than inventing a route that does not
 * exist. Each row still links to the record's real surface where one exists.
 *
 * The governance spine (workflow, gates, audit, access, policy) is deliberately
 * NOT a ninth stage — it runs beneath all eight, which is why it sits above the
 * pipeline as a banner rather than inside it.
 *
 * `?stage=<key>` preselects and scrolls to one stage. That is the landing point
 * for LifecycleStepper on record detail pages, so "where does this record sit"
 * lands on the stage that answers it rather than the top of the page.
 */

import { useEffect, useMemo, useRef, type Ref } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ChevronRight, RefreshCw, Route, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveDB } from "@/data/useLiveDB";
import { blockerFor, type BlockerInfo } from "@/data/selectors/blockerSelectors";
import { LIFECYCLE_LABELS, LIFECYCLE_ORDER, lifecycleStageFor } from "@/lib/lifecycle";
import { canReachPath, useRole, type AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import type {
  EntityName,
  LifecycleStage,
  LifecycleStageKey,
  MarcomAgent,
  SeedDB,
} from "@/data/types";

/* ------------------------------------------------------------------ */
/* Route → nav key                                                     */
/* ------------------------------------------------------------------ */

/**
 * Agent `surfaces[].to` values are router paths, not nav keys. `canReachPath`
 * is how a derived deep link gets role-gated; a path with no entry in the
 * shared route map is a route every role can reach.
 *
 * The map used to live here, and it was missing `/market` and `/rulebook` —
 * both restricted — so a surface pointing at either was treated as ungated.
 * It now lives beside `NAV_RESTRICTIONS` in `lib/rbac.ts`, where the two lists
 * cannot drift apart, and every page that computes an href shares it.
 */
function canReach(role: AppRole, to: string): boolean {
  return canReachPath(role, to);
}

/* ------------------------------------------------------------------ */
/* Records placed on the lifecycle                                     */
/* ------------------------------------------------------------------ */

/**
 * Why a record is drawing attention, per docs/STATE_TAXONOMY.md:
 * `blocked` is red (broken or breached), `review` is amber (a person is the
 * bottleneck). Anything else — a paused send, say — is neither, and still
 * renders its blocker line on the row without inflating either tally.
 */
type Attention = "blocked" | "review" | null;

function attentionOf(blocker: BlockerInfo | null): Attention {
  if (!blocker) return null;
  if (blocker.slaBreached || blocker.reason === "blocked") return "blocked";
  if (blocker.approvalId || blocker.reason === "returned for rework") return "review";
  return null;
}

interface PlacedRecord {
  entity: EntityName;
  id: string;
  label: string;
  status: string;
  stage: LifecycleStageKey;
  blocker: BlockerInfo | null;
  attention: Attention;
  /** The record's real surface, or null when it has none this role can reach. */
  href: string | null;
}

/** Readable singular for the entity families placed on the lifecycle. */
const ENTITY_LABEL: Partial<Record<EntityName, string>> = {
  Campaign: "Campaign",
  CampaignActivity: "Activity",
  Brief: "Brief",
  Content: "Content",
  Communication: "Communication",
  Asset: "Asset",
  Idea: "Idea",
};

interface PlacementResult {
  records: PlacedRecord[];
  /** Records scanned whose status has no stage mapping — reported, not hidden. */
  unplaced: number;
}

function placeRecords(db: SeedDB, role: AppRole): PlacementResult {
  const records: PlacedRecord[] = [];
  let unplaced = 0;

  const place = (
    entity: EntityName,
    id: string,
    label: string,
    status: string,
    href: string | null,
  ): void => {
    const stage = lifecycleStageFor(entity, status);
    if (!stage) {
      unplaced += 1;
      return;
    }
    const blocker = blockerFor(db, entity, id, status);
    records.push({
      entity,
      id,
      label,
      status,
      stage,
      blocker,
      attention: attentionOf(blocker),
      href: href && canReach(role, href) ? href : null,
    });
  };

  // Every collection named in the lifecycle stage tables that has records.
  // Hrefs are the record's own surface where one exists, the parent campaign
  // where the record has no page of its own, and the list page otherwise —
  // no route is invented here.
  for (const c of db.campaigns) place("Campaign", c.id, c.name, c.status, `/campaigns/${c.id}`);
  for (const c of db.contents) place("Content", c.id, c.title, c.status, `/content/${c.id}`);
  for (const c of db.communications)
    place("Communication", c.id, c.subject, c.status, "/communications");
  for (const a of db.assets) place("Asset", a.id, a.filename, a.status, `/assets?id=${a.id}`);
  for (const i of db.ideas) place("Idea", i.id, i.title, i.status, "/ideas");
  for (const b of db.briefs)
    place("Brief", b.id, b.title, b.status, b.campaignId ? `/campaigns/${b.campaignId}` : null);
  for (const a of db.campaignActivities)
    place(
      "CampaignActivity",
      a.id,
      a.name,
      a.status,
      a.campaignId ? `/campaigns/${a.campaignId}` : null,
    );

  // Fixed-stage collections. These carry no status — an audience is not
  // "In Review" — but they are genuinely the substance of the Understand
  // stage, and omitting them left that stage reading 0 records on the one
  // screen meant to explain the whole lifecycle. `lifecycleStageFor` places
  // them from the entity alone, so `place` is called with no status.
  for (const a of db.audiences) place("Audience", a.id, a.name, "", "/audiences");
  for (const s of db.segments) place("Segment", s.id, s.name, "", "/audiences");
  for (const p of db.customerPersonas) place("CustomerPersona", p.id, p.name, "", "/audiences");

  return { records, unplaced };
}

const ATTENTION_RANK: Record<string, number> = { blocked: 0, review: 1 };

function sortForPanel(a: PlacedRecord, b: PlacedRecord): number {
  const rankA = ATTENTION_RANK[a.attention ?? ""] ?? 2;
  const rankB = ATTENTION_RANK[b.attention ?? ""] ?? 2;
  if (rankA !== rankB) return rankA - rankB;
  if (a.entity !== b.entity) return a.entity.localeCompare(b.entity, "en-US");
  return a.label.localeCompare(b.label, "en-US");
}

/* ------------------------------------------------------------------ */
/* Stage models                                                        */
/* ------------------------------------------------------------------ */

interface StageLink {
  label: string;
  to: string;
}

interface StageModel {
  key: LifecycleStageKey;
  /** 1-based position, from LIFECYCLE_ORDER — never re-derived from the data. */
  order: number;
  label: string;
  /** Reference row for this stage, when the deployment seeds one. */
  stage: LifecycleStage | null;
  agents: MarcomAgent[];
  /** Union of the owning agents' surfaces, deduped by route, role-filtered. */
  links: StageLink[];
  records: PlacedRecord[];
  total: number;
  blocked: number;
  awaitingReview: number;
}

function buildStages(db: SeedDB, role: AppRole, records: PlacedRecord[]): StageModel[] {
  const agentById = new Map(db.marcomAgents.map((a) => [a.id, a]));
  const stageByKey = new Map(db.lifecycleStages.map((s) => [s.key, s]));

  return LIFECYCLE_ORDER.map((key, i) => {
    const stage = stageByKey.get(key) ?? null;

    const agents = (stage?.owningAgentIds ?? [])
      .map((id) => agentById.get(id))
      .filter((a): a is MarcomAgent => Boolean(a));

    const byRoute = new Map<string, StageLink>();
    for (const agent of agents) {
      for (const surface of agent.surfaces) {
        if (!canReach(role, surface.to)) continue;
        if (!byRoute.has(surface.to)) byRoute.set(surface.to, surface);
      }
    }

    const atStage = records.filter((r) => r.stage === key);

    return {
      key,
      order: i + 1,
      label: LIFECYCLE_LABELS[key],
      stage,
      agents,
      links: [...byRoute.values()],
      records: atStage,
      total: atStage.length,
      blocked: atStage.filter((r) => r.attention === "blocked").length,
      awaitingReview: atStage.filter((r) => r.attention === "review").length,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Governance spine banner                                             */
/* ------------------------------------------------------------------ */

const SPINE_ELEMENTS = [
  "BPMN workflow",
  "Approval gates",
  "Audit trail",
  "Role-based access",
  "Policy engine",
];

const SPINE_LINKS: StageLink[] = [
  { label: "Approvals", to: "/approvals" },
  { label: "Governance", to: "/governance" },
];

function GovernanceSpineBanner({ role }: { role: AppRole }) {
  const links = SPINE_LINKS.filter((link) => canReach(role, link.to));

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          Governance spine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          BPMN workflow, approval gates, audit trail, role-based access,
          policy engine. The spine runs beneath all eight stages rather than
          sitting inside one — every stage inherits it.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SPINE_ELEMENTS.map((element) => (
            <span
              key={element}
              className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {element}
            </span>
          ))}
        </div>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {link.label}
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

function PipelineTile({
  model,
  max,
  isLast,
  selected,
  innerRef,
}: {
  model: StageModel;
  /** Largest stage total on the page — the load bar is relative to it. */
  max: number;
  isLast: boolean;
  /** True when `?stage=<key>` names this stage — set by LifecycleStepper links. */
  selected: boolean;
  innerRef?: Ref<HTMLLIElement>;
}) {
  const share = max > 0 ? Math.round((model.total / max) * 100) : 0;
  const recordsLabel = model.total === 1 ? "1 record" : `${model.total} records`;

  // items-stretch, not items-center: a stage carrying two attention chips is
  // taller than one carrying none, and centring left the tiles ragged at both
  // edges. Stretching sizes every tile to the tallest in the row.
  return (
    <li ref={innerRef} className="flex shrink-0 items-stretch gap-1 xl:min-w-0 xl:flex-1">
      <Link
        to={`?stage=${model.key}`}
        aria-current={selected ? "step" : undefined}
        title={`${model.label} — show the ${recordsLabel} at this stage`}
        className={cn(
          "flex h-full w-44 flex-col rounded-lg border bg-card p-3 transition-colors xl:w-auto xl:min-w-0 xl:flex-1",
          "hover:border-primary/40 hover:bg-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected && "border-primary ring-1 ring-primary",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold tabular-nums text-primary-foreground"
            aria-hidden="true"
          >
            {model.order}
          </span>
          <span className="truncate text-sm font-semibold">
            <span className="sr-only">Stage {model.order}: </span>
            {model.label}
          </span>
        </div>

        <div className="mt-2 text-lg font-medium tabular-nums">{model.total}</div>
        <div className="text-[11px] text-muted-foreground">
          {model.total === 1 ? "record here" : "records here"}
        </div>

        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted"
          aria-hidden="true"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
        </div>

        {/* mt-auto pins the chips to the bottom of every tile, so they line up
            across the row instead of floating wherever the content above ends. */}
        <div className="mt-auto flex min-h-[1.25rem] flex-wrap gap-1 pt-2">
          {model.blocked > 0 && (
            <span className="inline-flex items-center rounded-full border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-destructive">
              {model.blocked} blocked
            </span>
          )}
          {model.awaitingReview > 0 && (
            <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-warning">
              {model.awaitingReview} awaiting review
            </span>
          )}
        </div>
      </Link>

      {!isLast && (
        <ChevronRight
          className="h-4 w-4 shrink-0 self-center text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Stage reference content                                             */
/* ------------------------------------------------------------------ */

function StageReference({ model, compact }: { model: StageModel; compact?: boolean }) {
  const { stage, agents, links } = model;

  if (!stage) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        No reference row is seeded for the {model.label} stage, so its purpose,
        key output and approval gate cannot be shown. Counts above are still
        derived from live records. The description appears once the module
        reference data includes this stage — nothing here is authored by hand.
      </p>
    );
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <p className="text-xs leading-relaxed text-muted-foreground">{stage.purpose}</p>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Owning agents
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {agents.length === 0 ? (
            <span className="text-xs text-muted-foreground">No agent assigned</span>
          ) : (
            agents.map((agent) => (
              <span
                key={agent.id}
                className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {agent.name}
              </span>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Key output
        </div>
        <p className="mt-1 text-xs leading-relaxed">{stage.keyOutput}</p>
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Approval required
        </span>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Approval gate: {stage.approvalGate}
        </p>
      </div>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {link.label}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Records at a stage                                                  */
/* ------------------------------------------------------------------ */

function RecordRow({ record }: { record: PlacedRecord }) {
  const name = (
    <span className="truncate text-xs font-medium">{record.label}</span>
  );

  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-3 py-2 last:border-b-0">
      <span className="w-24 shrink-0 text-[11px] uppercase tracking-wider text-muted-foreground">
        {ENTITY_LABEL[record.entity] ?? record.entity}
      </span>
      <span className="min-w-0 flex-1">
        {record.href ? (
          <Link to={record.href} className="block min-w-0 truncate hover:underline">
            {name}
          </Link>
        ) : (
          name
        )}
      </span>
      {/*
        Fixed-stage records (audiences, segments, personas) carry no status, and
        an empty badge renders as a blank pill that reads like a missing value.
      */}
      {record.status.trim().length > 0 && (
        <StatusBadge status={record.status} className="shrink-0" />
      )}
      <BlockerLine blocker={record.blocker} className="w-full sm:w-auto sm:max-w-[22rem]" />
    </li>
  );
}

function StageRecordsPanel({ model }: { model: StageModel }) {
  const rows = useMemo(() => [...model.records].sort(sortForPanel), [model.records]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Records at {model.label}
          <span className="ml-2 font-normal tabular-nums text-muted-foreground">
            {model.total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-xs leading-relaxed text-muted-foreground">
            No campaign, activity, brief, content item, communication, asset or
            idea currently has a status that places it at {model.label}. This
            stage fills as records reach it — it is empty because nothing is
            there yet, not because the view is filtered.
          </p>
        ) : (
          <ul className="max-h-[26rem] overflow-y-auto">
            {rows.map((r) => (
              <RecordRow key={`${r.entity}:${r.id}`} record={r} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LifecyclePage() {
  const db = useLiveDB();
  const { role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const placement = useMemo(() => placeRecords(db, role), [db, role]);
  const stages = useMemo(
    () => buildStages(db, role, placement.records),
    [db, role, placement.records],
  );

  const maxTotal = useMemo(
    () => stages.reduce((max, s) => Math.max(max, s.total), 0),
    [stages],
  );
  const totals = useMemo(
    () => ({
      placed: placement.records.length,
      blocked: placement.records.filter((r) => r.attention === "blocked").length,
      awaitingReview: placement.records.filter((r) => r.attention === "review").length,
    }),
    [placement.records],
  );

  // `?stage=<key>` is how LifecycleStepper hands off from a record's detail
  // page: the stage the record sits in is preselected and scrolled into view.
  const stageParam = searchParams.get("stage");
  const selected = useMemo(
    () => stages.find((m) => m.key === stageParam) ?? null,
    [stages, stageParam],
  );

  const selectedRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    selectedRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selected]);

  const clearStage = (): void => {
    const next = new URLSearchParams(searchParams);
    next.delete("stage");
    setSearchParams(next, { replace: true });
  };

  // The loop is named from the stage order, not from literals, so a reordered
  // lifecycle keeps the note honest.
  const loop = useMemo(() => {
    const last = stages[stages.length - 1];
    const second = stages[1];
    const third = stages[2];
    if (!last || !second || !third) return null;
    return { last, second, third };
  }, [stages]);

  const description = selected
    ? `Stage ${selected.order} of ${stages.length} — ${selected.label} — holds ${
        selected.total === 1 ? "1 record" : `${selected.total} records`
      }.`
    : `${totals.placed === 1 ? "1 record" : `${totals.placed} records`} placed across ${
        stages.length
      } stages, each from its own status. Select a stage to see what is sitting in it.`;

  return (
    <div className="space-y-4 p-6">
      {/* Title matches the menu label exactly, so PageHeader recognises it as a
          repeat of the nav item and hides it while the menu is on screen. It
          read "Brand to Demand lifecycle"; the description carries the detail. */}
      <PageHeader
        title="Brand to Demand"
        description={description}
        actions={
          selected ? (
            <Button size="sm" variant="outline" onClick={clearStage}>
              Show all stages
            </Button>
          ) : undefined
        }
      />

      {stageParam && !selected && (
        <p className="text-xs text-muted-foreground">
          No stage is keyed &ldquo;{stageParam}&rdquo; in the Brand to Demand
          lifecycle, so nothing is preselected. All {stages.length} stages are
          shown.
        </p>
      )}

      <GovernanceSpineBanner role={role} />

      <ol className="flex snap-x gap-1 overflow-x-auto pb-2">
        {stages.map((model, i) => (
          <PipelineTile
            key={model.key}
            model={model}
            max={maxTotal}
            isLast={i === stages.length - 1}
            selected={model.key === selected?.key}
            innerRef={model.key === selected?.key ? selectedRef : undefined}
          />
        ))}
      </ol>

      {totals.placed === 0 ? (
        <EmptyState
          icon={Route}
          title="No records are on the lifecycle yet"
          hint="Stage placement is derived from each record's status, and no campaign, activity, brief, content item, communication, asset or idea currently carries one that maps to a stage. The pipeline fills as work is created — nothing on this page is authored by hand."
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          {totals.blocked} blocked · {totals.awaitingReview} awaiting review
          {placement.unplaced > 0 && (
            <>
              {" · "}
              {placement.unplaced} not placed (their status has no stage mapping)
            </>
          )}
        </p>
      )}

      {selected ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Stage {selected.order} — {selected.stage?.name ?? selected.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StageReference model={selected} />
            </CardContent>
          </Card>

          <StageRecordsPanel model={selected} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((model) => (
            <Card key={model.key} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground"
                    aria-hidden="true"
                  >
                    {model.order}
                  </span>
                  <span className="truncate">{model.stage?.name ?? model.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <StageReference model={model} compact />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loop && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Feedback loop
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The lifecycle is a loop, not a line. Stage {loop.last.order} (
              {loop.last.label}) feeds straight back into stage {loop.second.order} (
              {loop.second.label}) and stage {loop.third.order} ({loop.third.label}):
              what actually happened becomes the evidence the next market read starts
              from, and the guidance the next plan is written against. A campaign that
              ends without changing the next one has not finished.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
