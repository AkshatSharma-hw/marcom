/**
 * Agent run trace — the standard "how was this produced?" block.
 *
 * Every surface that says an agent did something has to be able to show the
 * working. This is that block, extracted from the pattern the market-sizing
 * cards in `MarketIntelPanel.tsx` already establish (confidence chip,
 * METHODOLOGY, ASSUMPTIONS, SOURCE line): collapsed it is a status, a
 * confidence and one line of methodology; expanded it is the full derivation.
 *
 * Two rules govern what it renders:
 *
 *  1. Every value comes off the `AgentRun` row or the agent definition it names.
 *     A field with no recorded value is omitted rather than filled — with one
 *     deliberate exception, CONFIDENCE, whose absence is itself informative and
 *     so is stated in words instead of silently dropped.
 *
 *  2. The MODEL row says what is actually true. This build has no model
 *     integration: `src/services/ai/simulated.ts` is a deterministic rule
 *     engine. There is no model name and no prompt version to record, so none
 *     is shown — inventing one here would make every other row unbelievable.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Cpu, ScrollText } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { cn } from "@/lib/utils";
import { fmtStamp } from "@/lib/format";
import { canSeeNav, useRole } from "@/lib/rbac";
import type { AgentRun, AgentRunStatus, EntityName, Policy, SeedDB } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Rule set                                                            */
/* ------------------------------------------------------------------ */

/**
 * The identifier the execution ledger uses for the brand-guardrail rule set
 * behind `aiService.reviewContent` (see `src/data/seed/agentRuns.ts`). Runs
 * started from a surface in this app execute that same engine, so they record
 * that same revision rather than a second name for one rule set.
 */
export const BRAND_GUARDRAIL_RULE_SET = "brand-guardrails-2026.07";

/* ------------------------------------------------------------------ */
/* Run status → state taxonomy                                         */
/* ------------------------------------------------------------------ */

/**
 * `AgentRunStatus` is not one of the unions `StatusBadge` maps, and an unmapped
 * status silently renders muted — "inert" — which would be wrong for a run in
 * flight and wrong again for one that finished. Each run state is therefore
 * routed through the taxonomy status that carries its meaning
 * (docs/STATE_TAXONOMY.md): a machine in motion is blue, a finished run is
 * green, a failure is red. The label shown stays the run's own word.
 */
const RUN_STATE: Record<AgentRunStatus, { taxonomyStatus: string; label: string }> = {
  queued: { taxonomyStatus: "queued", label: "Queued" },
  running: { taxonomyStatus: "in progress", label: "Running" },
  succeeded: { taxonomyStatus: "completed", label: "Succeeded" },
  failed: { taxonomyStatus: "failed", label: "Failed" },
};

export function RunStatusBadge({
  status,
  className,
}: {
  status: AgentRunStatus;
  className?: string;
}) {
  const state = RUN_STATE[status];
  return (
    <StatusBadge status={state.taxonomyStatus} className={className}>
      {state.label}
    </StatusBadge>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence                                                          */
/* ------------------------------------------------------------------ */

/** Confidence band → token. Coarse on purpose, matching the intel panel. */
function confidenceTone(confidence: number): string {
  if (confidence >= 0.75) return "border-success/20 bg-success/10 text-success";
  if (confidence >= 0.6) return "border-warning/20 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/5 text-destructive/80";
}

export function ConfidenceChip({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums",
        confidenceTone(confidence),
        className,
      )}
      title="The generator's own certainty in this outcome, recorded at run time"
    >
      {Math.round(confidence * 100)}% confidence
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Record references                                                   */
/* ------------------------------------------------------------------ */

export interface TraceRef {
  entity: EntityName;
  id: string;
  /** Overrides the label resolved from the record itself. */
  label?: string;
}

/**
 * Deep link into the Graph explorer, focused on the record — the same link
 * `RelationshipChips` uses. One link shape for every entity means a reference
 * in a trace can never point at a route that does not exist.
 */
function graphHref(entity: EntityName, id: string): string {
  return `/graph?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`;
}

/** Fields a record may carry a readable name in, in preference order. */
const LABEL_KEYS = ["title", "name", "filename", "headline", "subject", "versionNumber"];

/**
 * A readable label for a record id, found by scanning the live collections —
 * no per-entity switch to drift out of date. Returns `null` when the record
 * carries no name-ish field, or when it is classified `Restricted`: a trace is
 * not a way around access control, so those keep the id alone.
 */
function recordLabel(db: SeedDB, id: string): string | null {
  for (const collection of Object.values(db)) {
    if (!Array.isArray(collection)) continue;
    const row = (collection as Array<Record<string, unknown>>).find(
      (r) => r !== null && typeof r === "object" && r.id === id,
    );
    if (!row) continue;
    if (row.classification === "Restricted") return null;
    for (const key of LABEL_KEYS) {
      const value = row[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
    return null;
  }
  return null;
}

function RefLink({ db, refItem }: { db: SeedDB; refItem: TraceRef }) {
  const label = refItem.label ?? recordLabel(db, refItem.id);
  /* The activity rail this renders in appears on the asset library and content
     detail — routes an Agency User can reach — while `/graph` is closed to that
     role. An ungated reference is a link that always bounces, so the reference
     still names the record and just stops being a door. */
  const { role } = useRole();
  const body = (
    <>
      <span className="tabular-nums">{refItem.id}</span>
      {label ? ` · ${label}` : ""}
    </>
  );
  if (!canSeeNav(role, "graph")) {
    return (
      <span title="The Graph explorer is not open to your role.">{body}</span>
    );
  }
  return (
    <Link
      to={graphHref(refItem.entity, refItem.id)}
      className="text-primary hover:underline"
      title={`Open ${refItem.entity} ${refItem.id} in the Graph explorer`}
    >
      {body}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

function TraceSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {heading}
      </h4>
      <div className="mt-1 text-xs text-foreground/90">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trace                                                               */
/* ------------------------------------------------------------------ */

export interface AgentTraceProps {
  run: AgentRun;
  db: SeedDB;
  /** One-line methodology. Falls back to the agent's own stated purpose. */
  methodology?: string;
  /** Inputs beyond the run's subject, when the caller genuinely knows them. */
  inputs?: TraceRef[];
  /** Policies this run evaluated, when the caller genuinely knows them. */
  policies?: Policy[];
  /** Assumptions specific to this run, appended to the ones derived below. */
  assumptions?: string[];
  /** Extra sources, appended to the ledger entry and the agent definition. */
  sources?: TraceRef[];
  defaultOpen?: boolean;
  className?: string;
}

export function AgentTrace({
  run,
  db,
  methodology,
  inputs,
  policies,
  assumptions,
  sources,
  defaultOpen = false,
  className,
}: AgentTraceProps) {
  const [open, setOpen] = useState(defaultOpen);

  const agent = db.marcomAgents.find((a) => a.id === run.agentId);
  const methodologyLine = methodology ?? agent?.purpose ?? null;

  const inputRefs: TraceRef[] = useMemo(
    () => [{ entity: run.subjectEntity, id: run.subjectId }, ...(inputs ?? [])],
    [run.subjectEntity, run.subjectId, inputs],
  );

  const sourceRefs: TraceRef[] = useMemo(() => {
    const base: TraceRef[] = [
      { entity: "AgentRun", id: run.id, label: "this run's ledger entry" },
    ];
    if (agent) base.push({ entity: "MarcomAgent", id: agent.id, label: agent.name });
    return [...base, ...(sources ?? [])];
  }, [run.id, agent, sources]);

  /**
   * Assumptions that are true of this run by construction — each is a property
   * of how the run was executed, not a claim about its subject.
   */
  const derivedAssumptions = useMemo(() => {
    const list = [
      "The generator is deterministic: the same inputs produce the same outcome, and nothing is fetched from outside the shipped dataset.",
      `Evaluated the record as it stood at ${fmtStamp(run.startedAt)} — the outcome is not recomputed when the record changes afterwards.`,
    ];
    if (typeof run.confidence === "number") {
      list.push(
        "Confidence is the generator's self-report, not a measured accuracy — whether the output was any good is measured separately, from what a person did with it.",
      );
    }
    return [...list, ...(assumptions ?? [])];
  }, [run.startedAt, run.confidence, assumptions]);

  return (
    <div className={cn("rounded-md border border-border bg-muted/30", className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-start gap-2 px-2.5 py-2 text-left hover:bg-muted/50">
          <ScrollText
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Trace
              </span>
              {typeof run.confidence === "number" && (
                <ConfidenceChip confidence={run.confidence} />
              )}
            </span>
            {/* One line of methodology while collapsed; expanded, the full
                line lives in its own section rather than being repeated. */}
            {methodologyLine && !open && (
              <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">
                {methodologyLine}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 border-t border-border px-2.5 py-2.5">
          {run.status === "failed" && run.error && (
            <p className="text-xs text-destructive">
              <span className="font-medium">Failed:</span> {run.error}
            </p>
          )}

          {/* CONFIDENCE — the one field whose absence is stated rather than
              dropped, because a missing certainty reads as a hidden one. */}
          <TraceSection heading="Confidence">
            {typeof run.confidence === "number" ? (
              <p>
                <span className="font-medium tabular-nums">
                  {Math.round(run.confidence * 100)}%
                </span>{" "}
                <span className="text-muted-foreground">
                  self-reported by the generator when the run finished.
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Not recorded. A run records confidence only where its outcome is a
                judgement call; runs whose output is arithmetic, a lookup or a
                per-finding verdict record none, and a run still in flight has
                nothing to be certain about yet.
              </p>
            )}
          </TraceSection>

          {methodologyLine && (
            <TraceSection heading="Methodology">
              <p>{methodologyLine}</p>
            </TraceSection>
          )}

          <TraceSection heading="Inputs used">
            <ul className="space-y-0.5">
              {inputRefs.map((refItem) => (
                <li key={`${refItem.entity}-${refItem.id}`}>
                  <span className="text-muted-foreground">{refItem.entity} </span>
                  <RefLink db={db} refItem={refItem} />
                </li>
              ))}
            </ul>
          </TraceSection>

          {run.producedEntity && run.producedId && (
            <TraceSection heading="Produced">
              <span className="text-muted-foreground">{run.producedEntity} </span>
              <RefLink
                db={db}
                refItem={{ entity: run.producedEntity, id: run.producedId }}
              />
            </TraceSection>
          )}

          {(run.ruleSetVersion || (policies && policies.length > 0)) && (
            <TraceSection heading="Rules applied">
              {run.ruleSetVersion && (
                <p>
                  <span className="text-muted-foreground">Rule set </span>
                  <span className="tabular-nums">{run.ruleSetVersion}</span>
                </p>
              )}
              {policies && policies.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {policies.map((p) => (
                    <li key={p.id}>
                      <span className="tabular-nums text-muted-foreground">{p.id}</span>{" "}
                      {p.name}
                      <span className="text-muted-foreground"> · {p.enforcement}</span>
                    </li>
                  ))}
                </ul>
              )}
            </TraceSection>
          )}

          <TraceSection heading="Assumptions">
            <ul className="space-y-1">
              {derivedAssumptions.map((assumption) => (
                <li
                  key={assumption}
                  className="flex gap-2 text-muted-foreground before:mt-1.5 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-muted-foreground/60 before:content-['']"
                >
                  {assumption}
                </li>
              ))}
            </ul>
          </TraceSection>

          <TraceSection heading="Sources">
            <ul className="space-y-0.5">
              {sourceRefs.map((refItem) => (
                <li key={`${refItem.entity}-${refItem.id}`}>
                  <span className="text-muted-foreground">{refItem.entity} </span>
                  <RefLink db={db} refItem={refItem} />
                </li>
              ))}
            </ul>
          </TraceSection>

          {/* MODEL — what actually ran. No model name, because there is no
              model: the provider behind the AI seam is a rule engine. */}
          <TraceSection heading="Model">
            <p className="flex items-start gap-1.5">
              <Cpu className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>
                Deterministic simulated generator —{" "}
                <span className="tabular-nums">src/services/ai/simulated.ts</span>, a
                rule engine behind the AI service seam.
                {run.ruleSetVersion ? (
                  <>
                    {" "}
                    Rule set <span className="tabular-nums">{run.ruleSetVersion}</span>.
                  </>
                ) : null}
              </span>
            </p>
            <p className="mt-1 text-muted-foreground">
              No model name or prompt version is recorded because this build has no
              model integration — there is nothing to name.
            </p>
          </TraceSection>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
