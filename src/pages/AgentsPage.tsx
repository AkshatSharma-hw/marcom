/**
 * Agent catalogue — the full A1..A8 MarCom agent roster, rendered from the
 * `marcomAgents` reference collection (BLUEPRINT.md; seed/module.ts).
 *
 * Three honesty rules this page enforces, because it is the page a viewer will
 * quote back at us:
 *  1. Nothing is hardcoded — every agent, stage, capability and surface link
 *     comes from the seed row. Adding a ninth agent adds a ninth card.
 *  2. The status chip states what is demonstrable in THIS build (the seed's
 *     `status` field), not what the target architecture promises.
 *  3. Deep links are filtered through `canSeeNav`, so a card never points the
 *     signed-in role at a door it cannot open.
 *
 * Cards are grouped by the lifecycle stage the agent *enters* the lifecycle at
 * (its lowest-order stage), so the page reads Govern → Learn in the same order
 * as the operating model. Each card still lists every stage it owns.
 *
 * Every card also carries an operations block derived from the agent run ledger
 * (`selectors/agentRunSelectors`): activity, runs this week, acceptance rate,
 * average self-reported confidence, last run and last failure. Acceptance is the
 * load-bearing number — it reports what people did with the agent's output, not
 * what the agent claimed about itself. Where the ledger has no denominator the
 * selectors return `null` and the card says so; a 0% is never shown in place of
 * "nothing produced yet", because those are opposite statements.
 */

import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  GitBranch,
  MessagesSquare,
  PenLine,
  Radar,
  Shield,
  Target,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";

import { useLiveDB } from "@/data/useLiveDB";
import {
  acceptanceRate,
  agentStatus,
  averageConfidence,
  lastFailure,
  lastRun,
  runsForAgent,
  runsThisWeek,
  type AgentActivityStatus,
} from "@/data/selectors/agentRunSelectors";
import type {
  AgentRun,
  LifecycleStage,
  MarcomAgent,
  MarcomAgentCode,
  MarcomAgentStatus,
  SeedDB,
} from "@/data/types";
import { canSeeNav, useRole, NAV_KEYS, type AppRole, type NavKey } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { fmtDateShort, fmtPct } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Presentation maps                                                   */
/* ------------------------------------------------------------------ */

/** One icon per agent code — presentation only; the roster itself is seeded. */
const AGENT_ICONS: Record<MarcomAgentCode, LucideIcon> = {
  A1: Shield,
  A2: Radar,
  A3: Target,
  A4: PenLine,
  A5: MessagesSquare,
  A6: GitBranch,
  A7: BarChart3,
  A8: Bot,
};

/**
 * Status → what a viewer is allowed to conclude. Deliberately plain: `partial`
 * reads "Partly live", never "Coming soon".
 */
const STATUS_PRESENTATION: Record<
  MarcomAgentStatus,
  { label: string; tone: "success" | "warning" | "muted" }
> = {
  live: { label: "Live in this build", tone: "success" },
  partial: { label: "Partly live", tone: "warning" },
  roadmap: { label: "On the roadmap", tone: "muted" },
};

type Tone = "success" | "warning" | "muted" | "destructive" | "info";

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  muted: "bg-muted text-muted-foreground border-border",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
};

/**
 * Derived activity → tone, following docs/STATE_TAXONOMY.md exactly:
 * blue means a machine owns it, red means something is broken, muted means
 * inert. Amber is absent by design — no agent state is ever "waiting on a
 * person"; that is what the approval queue is for.
 *
 * Rendered through the local chip rather than `StatusBadge` because these four
 * derived states are not in the badge's `statusTones` map, and an unmapped
 * status there falls back to muted — which would paint `Degraded` grey and read
 * as "inert" when it means "failing". Mapping them belongs in StatusBadge.tsx,
 * which is not this change's file.
 */
const ACTIVITY_PRESENTATION: Record<
  AgentActivityStatus,
  { tone: Tone; hint: string }
> = {
  Active: { tone: "info", hint: "Work in flight, or a run inside the last 7 days" },
  Idle: { tone: "muted", hint: "Has run before, but not in the last 7 days" },
  Degraded: { tone: "destructive", hint: "A failure sits in its 5 most recent runs" },
  Disabled: { tone: "muted", hint: "No run has ever been recorded for this agent" },
};

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

const NAV_KEY_SET = new Set<string>(NAV_KEYS);

/**
 * The nav key a surface path is gated by — the first path segment, which is
 * how AppSidebar and the route table already pair paths with keys
 * (`/pr` → "pr", `/campaigns/:id` → "campaigns"). A path outside the nav map
 * (returns null) is treated as ungated and stays visible.
 */
function navKeyForPath(path: string): NavKey | null {
  const segment = path.replace(/^\/+/, "").split("/")[0];
  return NAV_KEY_SET.has(segment) ? (segment as NavKey) : null;
}

/** Surfaces the signed-in role can actually reach. */
function visibleSurfaces(agent: MarcomAgent, role: AppRole) {
  return agent.surfaces.filter((surface) => {
    const navKey = navKeyForPath(surface.to);
    return navKey === null || canSeeNav(role, navKey);
  });
}

/** Stage rows an agent owns, in lifecycle order. */
function stagesOf(agent: MarcomAgent, stages: LifecycleStage[]): LifecycleStage[] {
  return stages
    .filter((stage) => agent.stageKeys.includes(stage.key))
    .slice()
    .sort((a, b) => a.order - b.order);
}

interface StageGroup {
  stage: LifecycleStage;
  agents: MarcomAgent[];
}

/**
 * Group agents under the stage they enter the lifecycle at (lowest-order stage
 * they own), so every agent appears exactly once and the page reads in
 * lifecycle order. Stages nobody enters at are omitted — their owning agents
 * are still listed on the cards that own them.
 */
function groupByEntryStage(
  agents: MarcomAgent[],
  stages: LifecycleStage[],
): StageGroup[] {
  const orderOf = new Map(stages.map((s) => [s.key as string, s.order]));

  return stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stage) => ({
      stage,
      agents: agents
        .filter((agent) => {
          const orders = agent.stageKeys
            .map((key) => orderOf.get(key))
            .filter((order): order is number => order !== undefined);
          // `Math.min()` of nothing is Infinity, which matches no stage — an
          // agent naming only unseeded stage keys would vanish from the board
          // while the header above it still counted it.
          if (orders.length === 0) return stage.order === stages[0]?.order;
          return Math.min(...orders) === stage.order;
        })
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code, DEFAULT_LOCALE)),
    }))
    .filter((group) => group.agents.length > 0);
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Operations block                                                    */
/* ------------------------------------------------------------------ */

/** Plain-English count, so a card never reads "1 runs". */
function plural(count: number, noun: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? noun : (pluralForm ?? `${noun}s`)}`;
}

/**
 * A link to the newest record this agent actually produced, when the signed-in
 * role can open the surface that record lives on. Produced records in the
 * ledger are content versions, so the link lands on the content item the
 * version belongs to — the page where the version, its provenance and its
 * approval all sit together. Anything the app has no route for returns null and
 * the card simply says nothing.
 */
function latestOutput(
  db: SeedDB,
  runs: AgentRun[],
  role: AppRole,
): { to: string; label: string } | null {
  const produced = runs.find(
    (r) => r.status === "succeeded" && r.producedEntity && r.producedId,
  );
  if (!produced?.producedId) return null;

  if (produced.producedEntity === "ContentVersion") {
    const version = db.contentVersions.find((v) => v.id === produced.producedId);
    const content = version && db.contents.find((c) => c.id === version.contentId);
    if (!version || !content || !canSeeNav(role, "content")) return null;
    return {
      to: `/content/${content.id}`,
      // `versionNumber` already reads "V1.1-ar" — prefixing it would double up.
      label: `Latest output: ${content.title} ${version.versionNumber}`,
    };
  }

  if (produced.producedEntity === "Content" && canSeeNav(role, "content")) {
    const content = db.contents.find((c) => c.id === produced.producedId);
    if (!content) return null;
    return { to: `/content/${content.id}`, label: `Latest output: ${content.title}` };
  }

  return null;
}

/** One label/value row in the operations block. */
function OpsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

/**
 * Live operations for one agent, entirely from `agentRunSelectors`. Nothing on
 * this block is stored on the agent row: every value is a fold over its runs.
 */
function AgentOperations({
  db,
  agent,
  role,
}: {
  db: SeedDB;
  agent: MarcomAgent;
  role: AppRole;
}) {
  const runs = runsForAgent(db, agent.id);
  const activity = agentStatus(db, agent.id);
  const presentation = ACTIVITY_PRESENTATION[activity];
  const weekRuns = runsThisWeek(db, agent.id).length;
  const acceptance = acceptanceRate(db, agent.id);
  const confidence = averageConfidence(db, agent.id);
  const scoredRuns = runs.filter((r) => typeof r.confidence === "number").length;
  const latest = lastRun(db, agent.id);
  const failure = lastFailure(db, agent.id);
  const output = latestOutput(db, runs, role);
  const graphHref = canSeeNav(role, "graph")
    ? `/graph?entity=MarcomAgent&id=${encodeURIComponent(agent.id)}`
    : null;

  return (
    <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
            TONE_STYLES[presentation.tone],
          )}
          title={presentation.hint}
        >
          {activity}
        </span>
        <span className="text-xs text-muted-foreground">
          {weekRuns === 0 ? "No runs this week" : `${plural(weekRuns, "run")} this week`}
          {runs.length > 0 && ` · ${plural(runs.length, "run")} recorded`}
        </span>
      </div>

      {/* Acceptance — the number this screen exists for. */}
      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Acceptance rate
        </p>
        {acceptance === null ? (
          <>
            <p className="mt-0.5 text-sm font-medium">Not enough runs to measure</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {runs.length === 0
                ? "Acceptance is the share of an agent's output a person signs off. No run has been recorded for this agent, so there is nothing to measure."
                : `${plural(runs.length, "run is", "runs are")} recorded, none of which produced a record for a person to accept or reject.`}
            </p>
          </>
        ) : (
          <>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-semibold tabular-nums">
                {fmtPct(acceptance.rate)}
              </span>
              <span className="text-xs text-muted-foreground">
                {acceptance.accepted} of {acceptance.produced} produced records
                accepted by a person
              </span>
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${acceptance.accepted} of ${acceptance.produced} produced records accepted`}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${acceptance.rate * 100}%` }}
              />
            </div>
            {acceptance.pendingIds.length > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {plural(acceptance.pendingIds.length, "record is", "records are")} still
                awaiting a decision.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-2">
        <OpsRow label="Avg confidence">
          {confidence === null ? (
            <span className="text-muted-foreground">
              No run recorded one — this agent's work is a lookup or arithmetic,
              not a judgement
            </span>
          ) : (
            <>
              <span className="font-medium tabular-nums">{fmtPct(confidence)}</span>
              <span className="text-muted-foreground">
                {" "}
                self-reported across {plural(scoredRuns, "run")}
              </span>
            </>
          )}
        </OpsRow>

        <OpsRow label="Last run">
          {latest === null ? (
            <span className="text-muted-foreground">Never run</span>
          ) : (
            <span
              className="text-muted-foreground"
              title={latest.outcomeSummary ?? latest.error ?? undefined}
            >
              <span className="font-medium text-foreground">{latest.status}</span>
              {" · "}
              {latest.status === "queued"
                ? `queued ${fmtDateShort(latest.startedAt)}`
                : latest.finishedAt
                  ? fmtDateShort(latest.finishedAt)
                  : `started ${fmtDateShort(latest.startedAt)}`}
            </span>
          )}
        </OpsRow>

        <OpsRow label="Last failure">
          {failure === null ? (
            <span className="text-muted-foreground">
              {runs.length === 0 ? "No runs to fail yet" : "None recorded"}
            </span>
          ) : (
            <span className="line-clamp-2 text-muted-foreground" title={failure.error}>
              <span className="font-medium text-destructive">
                {fmtDateShort(failure.startedAt)}
              </span>
              {" — "}
              {failure.error ?? "No error was recorded."}
            </span>
          )}
        </OpsRow>
      </div>

      {(output || graphHref) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2">
          {output && (
            <Link
              to={output.to}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {output.label}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
          {graphHref && runs.length > 0 && (
            <Link
              to={graphHref}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {plural(runs.length, "run")} in the graph
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent card                                                          */
/* ------------------------------------------------------------------ */

function AgentCard({
  db,
  agent,
  stages,
  role,
}: {
  db: SeedDB;
  agent: MarcomAgent;
  stages: LifecycleStage[];
  role: AppRole;
}) {
  const Icon = AGENT_ICONS[agent.code] ?? Bot;
  const status = STATUS_PRESENTATION[agent.status];
  const ownedStages = stagesOf(agent, stages);
  const surfaces = visibleSurfaces(agent, role);

  return (
    <div className="flex h-full flex-col rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {agent.code}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              TONE_STYLES[status.tone],
            )}
          >
            {status.label}
          </span>
          <span className="inline-flex items-center rounded-full border border-violet-600/20 bg-violet-600/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-400">
            Approval required
          </span>
        </div>
      </div>

      <h3 className="mt-3 text-sm font-semibold">{agent.name}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {agent.purpose}
      </p>

      <p className="mt-3 text-xs leading-relaxed">
        <span className="font-medium">Core value.</span>{" "}
        <span className="text-muted-foreground">{agent.coreValue}</span>
      </p>

      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Lifecycle stages
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ownedStages.map((stage) => (
            <Chip
              key={stage.id}
              className="border-primary/20 bg-primary/5 text-foreground"
            >
              {stage.order}. {stage.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Capabilities
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {agent.capabilities.map((capability) => (
            <Chip key={capability}>{capability}</Chip>
          ))}
        </div>
      </div>

      <AgentOperations db={db} agent={agent} role={role} />

      <div className="mt-auto flex flex-wrap gap-3 pt-4">
        {surfaces.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No surfaces open to your role.
          </p>
        ) : (
          surfaces.map((surface) => (
            <Link
              key={surface.to}
              to={surface.to}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {surface.label}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AgentsPage() {
  return (
    <ErrorBoundary>
      <AgentsPageContent />
    </ErrorBoundary>
  );
}

function AgentsPageContent() {
  const db = useLiveDB();
  const { role } = useRole();

  const groups = useMemo(
    () => groupByEntryStage(db.marcomAgents, db.lifecycleStages),
    [db],
  );

  const liveCount = db.marcomAgents.filter((a) => a.status === "live").length;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Agent catalogue"
        description={`${db.marcomAgents.length} agents span the Brand to Demand lifecycle — every one proposes, a named approver decides.`}
      />

      {db.marcomAgents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents defined"
          hint="The agent roster is reference data seeded with the operating model."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Bot
                  className="h-4 w-4 text-violet-600 dark:text-violet-400"
                  aria-hidden="true"
                />
                <CardTitle className="text-sm font-medium">
                  How to read this catalogue
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <p>
                {db.marcomAgents.length} agents cover the {db.lifecycleStages.length}{" "}
                lifecycle stages; {liveCount} run end-to-end on seeded data today.
                Agents are grouped by the stage they enter the lifecycle at, and each
                card lists every stage it owns. No agent approves its own work — the
                approval gate belongs to the stage, not the agent.
              </p>
              <p>
                The operations block on each card is folded live from the{" "}
                {db.agentRuns.length} recorded runs. Acceptance rate is the number to
                read first: it is the share of what an agent produced that a person
                subsequently signed off, evidenced by the approval or the record's own
                state — never a claim the agent made about itself. An agent that has
                produced nothing shows no rate at all, because no denominator is not
                the same as nothing accepted.
              </p>
            </CardContent>
          </Card>

          {groups.map((group) => (
            <section key={group.stage.id} className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">
                  {group.stage.order}. {group.stage.name}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {group.stage.purpose}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {group.agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    db={db}
                    agent={agent}
                    stages={db.lifecycleStages}
                    role={role}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <p className="pt-2 text-xs text-muted-foreground">
        The chip beside each agent name — live, partly live, on the roadmap —
        reflects what is demonstrable in this build, not the target architecture.
        The chip inside the operations block is something else entirely: it is
        derived from the run ledger and describes how the agent is behaving.
      </p>
    </div>
  );
}
