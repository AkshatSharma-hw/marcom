/**
 * Unified activity rail for one record — what agents did to it and what people
 * did to it, on a single timeline.
 *
 * A record with two separate histories (an agent ledger over here, an audit
 * trail over there) cannot answer the only question anyone actually asks: what
 * happened to this thing, in order? So both go on one spine, visually
 * distinguished, newest first.
 *
 * Sources, all of which already exist — none is invented:
 *
 *  (a) `runsForRecord` over the `AgentRun` ledger, read through the DataStore
 *      so runs started in the app appear beside the seeded ones.
 *  (b) `db.auditRecords` that reference the record, found with the same
 *      `linksTo` traversal `RecordAuditTrail` uses.
 *  (c) The DataStore's runtime audit log — the create/update/delete entries for
 *      mutations made in the app. That log is append-only and persisted with
 *      the record data, so these entries survive a reload; its durability stops
 *      at this browser's storage, not a server-side tamper-evident store.
 *
 * `RecordAuditTrail` remains the record's audit view and is not touched here;
 * this rail reads the same two person-side sources it reads, plus the agent
 * ledger it does not.
 *
 * Every entry is expandable into an `AgentTrace` showing the run's derivation.
 */

import { useMemo, useState } from "react";
import { ChevronDown, Sparkles, User, Workflow } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgentTrace, RunStatusBadge } from "@/components/marcomm/AgentTrace";
import { cn } from "@/lib/utils";
import { fmtStamp } from "@/lib/format";
import { runsForRecord } from "@/data/selectors/agentRunSelectors";
import { linksTo } from "@/data/selectors/graphSelectors";
import { originOf } from "@/data/selectors/originSelectors";
import { getSeedDB } from "@/data/seed";
import { useLiveDBWith } from "@/data/useLiveDB";
import { useAuditTrail, useCollection } from "@/store/DataStore";
import { useRole } from "@/lib/rbac";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { AgentRun, EntityName, SeedDB } from "@/data/types";

/** A record whose agent work belongs on this rail. */
export interface RailSubject {
  entity: EntityName;
  id: string;
  /** How the record reads in an entry's "on …" qualifier, e.g. 'V2.1'. */
  label?: string;
}

type RailEntry =
  | {
      kind: "agent";
      key: string;
      at: string;
      run: AgentRun;
      /** Set when the run touched a related record rather than this one. */
      onLabel?: string;
    }
  | {
      kind: "person";
      key: string;
      at: string;
      actorName: string;
      action: string;
      detail: string;
      /** 'runtime' entries were written by this app; both sources survive a reload. */
      source: "dataset" | "runtime";
    };

export interface AgentActivityRailProps {
  entity: EntityName;
  id: string;
  /**
   * Records whose agent work is part of this record's history — a content
   * item's versions, for instance. Runs are recorded against the record they
   * actually ran on, so the rail gathers them rather than pretending the
   * parent was the subject.
   */
  related?: ReadonlyArray<RailSubject>;
  className?: string;
}

export function AgentActivityRail({
  entity,
  id,
  related,
  className,
}: AgentActivityRailProps) {
  // Runs live in the store under "agentRuns" so a run started from a surface in
  // the app is on the same timeline as the seeded ledger.
  const runsCol = useCollection<AgentRun>("agentRuns", getSeedDB().agentRuns);
  const overrides = useMemo(() => ({ agentRuns: runsCol.records }), [runsCol.records]);
  const db = useLiveDBWith(overrides);
  const runtimeAudit = useAuditTrail();
  const { currentUser } = useRole();

  const subjects = useMemo<RailSubject[]>(
    () => [{ entity, id }, ...(related ?? [])],
    [entity, id, related],
  );

  const entries = useMemo<RailEntry[]>(() => {
    /* (a) Agent runs, deduped: one run can name both a subject and a produced
       record, and both may be on this rail. */
    const seen = new Set<string>();
    const agentEntries: RailEntry[] = [];
    for (const subject of subjects) {
      for (const run of runsForRecord(db, subject.entity, subject.id)) {
        if (seen.has(run.id)) continue;
        seen.add(run.id);
        agentEntries.push({
          kind: "agent",
          key: run.id,
          at: run.startedAt,
          run,
          onLabel:
            subject.id === id ? undefined : (subject.label ?? subject.id),
        });
      }
    }

    const subjectIds = new Set(subjects.map((s) => s.id));

    // (b) Seeded audit history referencing any of these records.
    const auditIds = new Set<string>();
    for (const subject of subjects) {
      for (const link of linksTo(db, subject.id)) {
        if (link.entity === "AuditRecord") auditIds.add(link.id);
      }
    }
    const datasetEntries: RailEntry[] = db.auditRecords
      .filter((r) => auditIds.has(r.id))
      .map((r) => ({
        kind: "person" as const,
        key: r.id,
        at: r.at,
        actorName:
          db.stakeholders.find((s) => s.id === r.actorStakeholderId)?.name ??
          r.actorStakeholderId,
        action: r.action,
        detail: r.detail,
        source: "dataset" as const,
      }));

    // (c) Mutations this app recorded against these records, from the durable trail.
    const runtimeEntries: RailEntry[] = runtimeAudit
      .filter((e) => subjectIds.has(e.recordId))
      .map((e) => ({
        kind: "person" as const,
        key: e.id,
        at: new Date(e.ts).toISOString(),
        actorName: currentUser.name,
        action: `${e.collection}.${e.action}`,
        detail: e.label,
        source: "runtime" as const,
      }));

    return [...agentEntries, ...datasetEntries, ...runtimeEntries].sort((a, b) =>
      b.at.localeCompare(a.at, DEFAULT_LOCALE),
    );
  }, [db, subjects, id, runtimeAudit, currentUser.name]);

  const agentCount = entries.filter((e) => e.kind === "agent").length;
  const personCount = entries.length - agentCount;

  /* Open by default when this record is an agent proposal awaiting a reviewer:
     the first thing that reader needs is what the agent actually did. */
  const [open, setOpen] = useState(
    () => originOf(db, entity, id).origin === "agent",
  );

  const entityLabel = entity.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
        <Workflow className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Activity — agents and people ({entries.length})</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              No activity recorded for this {entityLabel}. Three things appear
              here: agent runs recorded against {id}
              {subjects.length > 1 ? " or the records it versions" : ""} — none is
              on the ledger yet; audit records that shipped with the dataset; and
              changes this app has recorded against the record, of which there
              are none yet. All three survive a reload.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {agentCount} agent {agentCount === 1 ? "run" : "runs"} · {personCount}{" "}
              {personCount === 1 ? "action" : "actions"} by people, newest first.
            </p>
            <ol className="space-y-0">
              {entries.map((entry, idx) => {
                const newest = idx === 0;
                const last = idx === entries.length - 1;
                return (
                  <li key={entry.key} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && (
                      <span
                        aria-hidden
                        className="absolute left-[5px] top-4 h-full w-px bg-border"
                      />
                    )}
                    {/* Agent work is marked on the spine itself: a filled dot
                        for an agent, a hollow one for a person. */}
                    <span
                      className={cn(
                        "mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-background ring-1",
                        entry.kind === "agent"
                          ? "bg-primary ring-primary/40"
                          : newest
                            ? "bg-muted-foreground ring-border"
                            : "bg-muted-foreground/40 ring-border",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      {entry.kind === "agent" ? (
                        <AgentEntry db={db} entry={entry} />
                      ) : (
                        <PersonEntry entry={entry} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/* Entries                                                             */
/* ------------------------------------------------------------------ */

function AgentEntry({
  db,
  entry,
}: {
  db: SeedDB;
  entry: Extract<RailEntry, { kind: "agent" }>;
}) {
  const { run } = entry;
  const agent = db.marcomAgents.find((a) => a.id === run.agentId);
  const triggeredBy = run.triggeredByStakeholderId
    ? db.stakeholders.find((s) => s.id === run.triggeredByStakeholderId)
    : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium">{agent?.name ?? run.agentId}</span>
        <span className="text-sm text-muted-foreground">
          · ran on {entry.onLabel ? `${entry.onLabel} · ` : ""}
          <span className="tabular-nums">{run.subjectId}</span>
        </span>
        <RunStatusBadge status={run.status} />
      </div>

      {run.outcomeSummary ? (
        <p className="mt-0.5 text-sm text-muted-foreground">{run.outcomeSummary}</p>
      ) : run.status === "failed" && run.error ? (
        <p className="mt-0.5 text-sm text-destructive">{run.error}</p>
      ) : (
        <p className="mt-0.5 text-sm text-muted-foreground">
          {run.status === "queued"
            ? "Queued — nothing has been computed yet, so there is no outcome to report."
            : run.status === "running"
              ? "In flight — no outcome exists until it finishes."
              : "No outcome summary was recorded on this run."}
        </p>
      )}

      <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
        {fmtStamp(run.startedAt)}
        {run.finishedAt ? ` → ${fmtStamp(run.finishedAt)}` : ""}
        {run.ruleSetVersion ? ` · ${run.ruleSetVersion}` : ""}
        {triggeredBy ? (
          <span className="normal-case tracking-normal"> · started by {triggeredBy.name}</span>
        ) : null}
      </div>

      <AgentTrace run={run} db={db} className="mt-2" />
    </>
  );
}

function PersonEntry({ entry }: { entry: Extract<RailEntry, { kind: "person" }> }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">{entry.actorName}</span>
        <span className="text-sm text-muted-foreground">· {entry.action}</span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{entry.detail}</p>
      <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
        {fmtStamp(entry.at)}
        {entry.source === "runtime" && (
          <span className="ml-1 normal-case tracking-normal">
            · recorded in this app
          </span>
        )}
      </div>
    </>
  );
}
