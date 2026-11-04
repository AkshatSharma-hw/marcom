import { useMemo, useState } from "react";
import { ArrowRight, Bot, GitBranch, History, Pencil, Save, Workflow as WorkflowIcon, X } from "lucide-react";
import { toast } from "sonner";
import { getSeedDB } from "@/data/seed";
import type { AppRole, Workflow, WorkflowStage } from "@/data/types";
import { useCollection } from "@/store/DataStore";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The one role vocabulary — all 11 AppRoles, selectable as stage assignees. */
const APP_ROLES: AppRole[] = [
  "CMO",
  "Campaign Manager",
  "Corporate Comms Manager",
  "Content Manager",
  "Brand Manager",
  "PR Manager",
  "Internal Comms Manager",
  "Legal/Compliance Reviewer",
  "Executive",
  "Agency User",
  "Platform Admin",
];

type Automation = WorkflowStage["automation"];

const AUTOMATION_LABEL: Record<string, string> = {
  "brand-ai": "Brand AI",
  "compliance-ai": "Compliance AI",
};

/** Editable slice of a stage — structure (add/remove/reorder) is read-only this increment. */
interface StageDraft {
  slaHours: number;
  assigneeRole: AppRole;
  automation: Automation;
}

/**
 * A workflow's overall SLA is the sum of its stage SLAs, never a separate
 * ceiling. The chain is sequential, so the definition can be no faster than the
 * stages it is made of — the seed packs state the same rule in words
 * (`packs/lifesciences.ts` MLR_WORKFLOW: "slaHours is the sum of the four stage
 * SLAs … not a separate ceiling"). The default pack's stored `Workflow.slaHours`
 * predates that rule and understates it (WF-001 says 24h over 2+24+24=50h), so
 * the header derives the figure rather than printing the stored one, and
 * publishing writes the derived figure onto the new version.
 */
function slaTotalOf(hours: number[]): number {
  return hours.reduce((sum, h) => sum + h, 0);
}

/** Hours as a compact label — whole numbers stay whole, halves keep one place. */
function fmtHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/** Highest numeric suffix for a given id prefix, e.g. maxIdNumber(rows, 'WFS-') → 10. */
function maxIdNumber(rows: ReadonlyArray<{ id: string }>, prefix: string): number {
  let max = 0;
  for (const r of rows) {
    if (r.id.startsWith(prefix)) {
      const n = parseInt(r.id.slice(prefix.length), 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return max;
}

function WorkflowDesignerCore({ embedded = false }: { embedded?: boolean }) {
  const workflows = useCollection<Workflow>("workflows", getSeedDB().workflows);
  const stages = useCollection<WorkflowStage>("workflowStages", getSeedDB().workflowStages);

  // Published workflows are immutable — a lineage is every version sharing a name.
  const lineages = useMemo(() => {
    const byName = new Map<string, Workflow[]>();
    for (const wf of workflows.records) {
      const list = byName.get(wf.name) ?? [];
      list.push(wf);
      byName.set(wf.name, list);
    }
    for (const list of byName.values()) list.sort((a, b) => b.version - a.version);
    return byName;
  }, [workflows.records]);

  const lineageNames = useMemo(() => [...lineages.keys()], [lineages]);

  const [selectedName, setSelectedName] = useState<string | null>(
    lineageNames[0] ?? null,
  );
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, StageDraft>>({});

  const versions = selectedName ? lineages.get(selectedName) ?? [] : [];
  const current = versions[0]; // latest published version of the lineage

  const currentStages = useMemo(() => {
    if (!current) return [];
    return current.stageIds
      .map((id) => stages.records.find((s) => s.id === id))
      .filter((s): s is WorkflowStage => s !== undefined)
      .sort((a, b) => a.order - b.order);
  }, [current, stages.records]);

  /* Derived, so editing a stage SLA moves the headline immediately instead of
     leaving a number on screen that no stage could deliver. */
  const slaTotal = useMemo(
    () =>
      slaTotalOf(
        currentStages.map((s) => (editing ? drafts[s.id]?.slaHours ?? s.slaHours : s.slaHours)),
      ),
    [currentStages, drafts, editing],
  );

  /* Publishing an identical version is noise in an append-only history, so the
     button waits for an actual change to one of the three editable fields. */
  const dirty = useMemo(
    () =>
      editing &&
      currentStages.some((s) => {
        const d = drafts[s.id];
        if (!d) return false;
        return (
          d.slaHours !== s.slaHours ||
          d.assigneeRole !== s.assigneeRole ||
          d.automation !== (s.automation ?? null)
        );
      }),
    [editing, currentStages, drafts],
  );

  const selectLineage = (name: string): void => {
    setSelectedName(name);
    setEditing(false);
    setDrafts({});
  };

  const startEdit = (): void => {
    const next: Record<string, StageDraft> = {};
    for (const s of currentStages) {
      next[s.id] = {
        slaHours: s.slaHours,
        assigneeRole: s.assigneeRole,
        automation: s.automation ?? null,
      };
    }
    setDrafts(next);
    setEditing(true);
  };

  const cancelEdit = (): void => {
    setEditing(false);
    setDrafts({});
  };

  const patchDraft = (stageId: string, patch: Partial<StageDraft>): void =>
    setDrafts((d) => ({ ...d, [stageId]: { ...d[stageId], ...patch } }));

  /**
   * Publishing never mutates the prior record — it snapshots the drafts as new
   * WorkflowStage rows and a new Workflow row with version + 1. In-flight
   * Approvals stay pinned to the stage ids of the version they started on
   * (BLUEPRINT Part 9: versioned definitions, append-only history).
   */
  const publishNewVersion = (): void => {
    if (!current) return;
    const now = new Date().toISOString();
    const nextVersion = versions[0].version + 1;

    // Explicit sequential ids: the store's nextId reads a stale snapshot when
    // several creates land in one handler, so we allocate the block up front.
    let stageSeq = maxIdNumber(stages.records, "WFS-");
    const newStageIds: string[] = [];
    const publishedSlaHours: number[] = [];
    for (const s of currentStages) {
      stageSeq += 1;
      const newId = `WFS-${String(stageSeq).padStart(3, "0")}`;
      newStageIds.push(newId);
      const draft = drafts[s.id];
      publishedSlaHours.push(draft?.slaHours ?? s.slaHours);
      stages.createIn({
        id: newId,
        workflowId: "", // patched below once the workflow id is known
        order: s.order,
        name: s.name,
        mode: s.mode,
        assigneeRole: draft?.assigneeRole ?? s.assigneeRole,
        slaHours: draft?.slaHours ?? s.slaHours,
        // `?? s.automation` would be wrong here: the draft carries null when the
        // editor deliberately removed the gate, so the stage's own value may
        // only stand in when there is no draft for it at all.
        automation: draft ? draft.automation : s.automation ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const newWorkflowId = `WF-${String(maxIdNumber(workflows.records, "WF-") + 1).padStart(3, "0")}`;
    workflows.createIn({
      id: newWorkflowId,
      name: current.name,
      appliesTo: current.appliesTo,
      version: nextVersion,
      stageIds: newStageIds,
      /* Derived from the stages just published, not copied from the previous
         version: copying meant an editor could raise every stage SLA and watch
         the workflow's headline SLA never move. */
      slaHours: slaTotalOf(publishedSlaHours),
      createdAt: now,
      updatedAt: now,
    });
    for (const id of newStageIds) stages.updateIn(id, { workflowId: newWorkflowId });

    setEditing(false);
    setDrafts({});
    toast.success(`Published v${nextVersion} — previous versions remain pinned to in-flight items`, {
      description: `${current.name} · ${newStageIds.length} stages · ${newWorkflowId}`,
    });
  };

  const headerActions = current && (
    editing ? (
      <>
        <Button size="sm" variant="outline" onClick={cancelEdit}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button size="sm" onClick={publishNewVersion} disabled={!dirty}>
          <Save className="mr-1 h-3.5 w-3.5" />
          Publish v{current.version + 1}
        </Button>
      </>
    ) : (
      <Button size="sm" variant="outline" onClick={startEdit}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        Edit
      </Button>
    )
  );

  return (
    <div className={embedded ? "space-y-4" : "space-y-4 p-6"}>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Versioned lifecycle definitions — published workflows are immutable; edits
            publish a new version
          </p>
          {headerActions && (
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          )}
        </div>
      ) : (
        <PageHeader
          title="Workflow designer"
          description="Versioned lifecycle definitions — published workflows are immutable; edits publish a new version"
          actions={headerActions}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* ------------------------------------------------ Workflow list */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            {lineageNames.map((name) => {
              const latest = lineages.get(name)?.[0];
              if (!latest) return null;
              const active = name === selectedName;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => selectLineage(name)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    active
                      ? "border-primary/40 bg-primary/5"
                      : "border-transparent hover:bg-muted/60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <WorkflowIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium">{name}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                      {latest.appliesTo}
                    </Badge>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                      v{latest.version}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {latest.stageIds.length} stages
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* ------------------------------------------------ Stage stepper */}
        <div className="min-w-0 space-y-4">
          {!current ? (
            <EmptyState
              icon={WorkflowIcon}
              title="No workflow selected"
              hint="Pick a lifecycle definition on the left to inspect its stages."
            />
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-sm font-medium">{current.name}</CardTitle>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                      applies to {current.appliesTo}
                    </Badge>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                      v{current.version} · current
                    </Badge>
                    {editing && (
                      <Badge className="h-5 px-1.5 text-[10px] font-normal">
                        editing → will publish v{current.version + 1}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stage structure is locked for published definitions — SLA, assignee role and
                    automation are editable. Overall SLA {fmtHours(slaTotal)}h — the sum of
                    the {currentStages.length} stage SLAs below.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                    {currentStages.map((stage, i) => {
                      const draft = drafts[stage.id];
                      const automation = editing
                        ? draft?.automation ?? null
                        : stage.automation ?? null;
                      return (
                        <div key={stage.id} className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-56 shrink-0 rounded-lg border bg-card p-3",
                              stage.mode === "parallel-group" && "border-dashed",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-medium leading-snug">
                                <span className="mr-1.5 text-muted-foreground">{stage.order}.</span>
                                {stage.name}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              {automation && (
                                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                                  <Bot className="h-3 w-3" />
                                  {AUTOMATION_LABEL[automation]}
                                </Badge>
                              )}
                              {stage.mode === "parallel-group" && (
                                <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                                  <GitBranch className="h-3 w-3" />
                                  Parallel group
                                </Badge>
                              )}
                            </div>

                            {editing && draft ? (
                              <div className="mt-3 space-y-2">
                                <div>
                                  <Label
                                    htmlFor={`stage-${stage.id}-assignee`}
                                    className="text-[10px] text-muted-foreground"
                                  >
                                    Assignee role
                                  </Label>
                                  <Select
                                    value={draft.assigneeRole}
                                    onValueChange={(v) =>
                                      patchDraft(stage.id, { assigneeRole: v as AppRole })
                                    }
                                  >
                                    <SelectTrigger
                                      id={`stage-${stage.id}-assignee`}
                                      className="h-7 text-xs"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {APP_ROLES.map((r) => (
                                        <SelectItem key={r} value={r} className="text-xs">
                                          {r}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`stage-${stage.id}-sla`}
                                    className="text-[10px] text-muted-foreground"
                                  >
                                    SLA hours
                                  </Label>
                                  <Input
                                    id={`stage-${stage.id}-sla`}
                                    type="number"
                                    min={1}
                                    className="h-7 text-xs"
                                    value={draft.slaHours}
                                    onChange={(e) =>
                                      patchDraft(stage.id, {
                                        slaHours: Math.max(
                                          1,
                                          parseInt(e.target.value, 10) || 1,
                                        ),
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`stage-${stage.id}-automation`}
                                    className="text-[10px] text-muted-foreground"
                                  >
                                    Automation
                                  </Label>
                                  <Select
                                    value={draft.automation ?? "none"}
                                    onValueChange={(v) =>
                                      patchDraft(stage.id, {
                                        automation:
                                          v === "none" ? null : (v as Automation),
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      id={`stage-${stage.id}-automation`}
                                      className="h-7 text-xs"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-xs">
                                        None (manual stage)
                                      </SelectItem>
                                      <SelectItem value="brand-ai" className="text-xs">
                                        Brand AI
                                      </SelectItem>
                                      <SelectItem value="compliance-ai" className="text-xs">
                                        Compliance AI
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                                <div>
                                  Assignee: <span className="text-foreground">{stage.assigneeRole}</span>
                                </div>
                                <div>
                                  SLA: <span className="tabular-nums text-foreground">{stage.slaHours}h</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {i < currentStages.length - 1 && (
                            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* ------------------------------------------ Version history */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    Version history
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-0">
                    {versions.map((v, i) => (
                      <div key={v.id}>
                        {i > 0 && <Separator />}
                        <div className="flex flex-wrap items-center gap-2 py-2 text-sm">
                          <Badge
                            variant={i === 0 ? "default" : "secondary"}
                            className="h-5 px-1.5 text-[10px] font-normal"
                          >
                            v{v.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{v.id}</span>
                          <span className="text-xs text-muted-foreground">
                            {v.stageIds.length} stages
                          </span>
                          <span className="text-xs text-muted-foreground">
                            published {fmtDate(v.createdAt)}
                          </span>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {i === 0
                              ? "Current — new submissions use this version"
                              : "Pinned to in-flight items that started on it"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Embedded variant for the Administration page — same designer, no PageHeader
 * or outer page padding (the host page owns those).
 */
export function WorkflowDesignerPanel() {
  return <WorkflowDesignerCore embedded />;
}

/** Standalone page — full PageHeader + page padding. */
export default function WorkflowDesigner() {
  return <WorkflowDesignerCore />;
}
