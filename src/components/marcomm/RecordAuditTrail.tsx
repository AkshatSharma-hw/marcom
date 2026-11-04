/**
 * Record-scoped audit trail (UI change instructions item 18).
 *
 * The audit trail is otherwise reachable only under Governance & crisis, which
 * means answering "what happened to *this* record?" costs a navigation and a
 * filter. This component puts the same events on the record itself.
 *
 * It reads the two event sources that actually exist — no third one is
 * invented:
 *
 *  (a) `db.auditRecords` — the audit history that shipped with the dataset.
 *      Found via the same `linksTo` traversal the Graph explorer uses, so an
 *      AuditRecord that references the record in any field is picked up.
 *  (b) The runtime audit exposed by the DataStore (`useAuditTrail`) — the
 *      create/update/delete entries recorded for mutations made in the app.
 *      That log is append-only and persisted alongside the record data, so it
 *      now survives a reload and a store reset. Its durability stops at this
 *      browser: it is localStorage, not a server-side tamper-evident store, so
 *      it is a working trail rather than admissible evidence. Nothing in this
 *      component writes to it.
 *
 * The empty state names both sources rather than saying "no events", because
 * "the dataset ships none for this record" and "nothing has happened to it
 * here" are different answers and an empty list cannot tell them apart.
 */

import { useMemo, useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { fmtStamp } from "@/lib/format";
import { linksTo } from "@/data/selectors/graphSelectors";
import { useLiveDB } from "@/data/useLiveDB";
import { useAuditTrail } from "@/store/DataStore";
import { useRole } from "@/lib/rbac";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { EntityName } from "@/data/types";

interface TrailEvent {
  id: string;
  /** ISO 8601 */
  at: string;
  actorName: string;
  action: string;
  detail: string;
  /** 'runtime' entries were written by this app; both sources survive a reload. */
  source: "dataset" | "runtime";
}

export interface RecordAuditTrailProps {
  entity: EntityName;
  id: string;
  className?: string;
}

export function RecordAuditTrail({ entity, id, className }: RecordAuditTrailProps) {
  const db = useLiveDB();
  const runtimeAudit = useAuditTrail();
  const { currentUser } = useRole();
  const [open, setOpen] = useState(false);

  const events = useMemo<TrailEvent[]>(() => {
    // (a) Seeded history — every AuditRecord that references this record.
    const auditIds = new Set(
      linksTo(db, id)
        .filter((link) => link.entity === "AuditRecord")
        .map((link) => link.id),
    );
    const dataset: TrailEvent[] = db.auditRecords
      .filter((r) => auditIds.has(r.id))
      .map((r) => ({
        id: r.id,
        at: r.at,
        actorName:
          db.stakeholders.find((s) => s.id === r.actorStakeholderId)?.name ??
          r.actorStakeholderId,
        action: r.action,
        detail: r.detail,
        source: "dataset" as const,
      }));

    // (b) Mutations this app recorded against the record, from the durable trail.
    const runtime: TrailEvent[] = runtimeAudit
      .filter((e) => e.recordId === id)
      .map((e) => ({
        id: e.id,
        at: new Date(e.ts).toISOString(),
        actorName: currentUser.name,
        action: `${e.collection}.${e.action}`,
        detail: e.label,
        source: "runtime" as const,
      }));

    return [...dataset, ...runtime].sort((a, b) =>
      b.at.localeCompare(a.at, DEFAULT_LOCALE),
    );
  }, [db, id, runtimeAudit, currentUser.name]);

  const runtimeCount = events.filter((e) => e.source === "runtime").length;
  const entityLabel = entity.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground">
        <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Audit trail ({events.length})</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        {events.length === 0 ? (
          <div className="rounded-md border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              No audit events for this {entityLabel}. Two things would show up
              here: audit records that shipped with the dataset — none
              references {id} — and changes this app has recorded against the
              record, of which there are none yet. Both survive a reload, so
              nothing has been lost.
            </p>
          </div>
        ) : (
          <>
            <ol className="space-y-0">
              {events.map((e, idx) => {
                const newest = idx === 0;
                return (
                  <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < events.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[5px] top-4 h-full w-px bg-border"
                      />
                    )}
                    <span
                      className={cn(
                        "mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-background ring-1",
                        newest
                          ? "bg-primary ring-primary/40"
                          : "bg-muted-foreground/40 ring-border",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">{e.actorName}</span>{" "}
                        <span className="text-muted-foreground">· {e.action}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {e.detail}
                      </p>
                      <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {fmtStamp(e.at)}
                        {e.source === "runtime" && (
                          <span className="ml-1 normal-case tracking-normal">
                            · recorded in this app
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {runtimeCount > 0 && (
              <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                {runtimeCount === 1
                  ? "1 of these events was recorded by this app rather than shipped with the dataset. It is appended to a durable trail and survives a reload — but that trail is this browser's storage, not a server-side tamper-evident store."
                  : `${runtimeCount} of these events were recorded by this app rather than shipped with the dataset. They are appended to a durable trail and survive a reload — but that trail is this browser's storage, not a server-side tamper-evident store.`}
              </p>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
