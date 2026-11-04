/**
 * Compact Brand to Demand stage indicator for detail pages (UI change
 * instructions item 10).
 *
 * Sits directly under the page title. Completed stages read muted-solid, the
 * current stage is highlighted, future stages are faint — so a record's
 * position in the lifecycle is legible at a glance, and the lifecycle model
 * itself is taught on every screen.
 *
 * Two modes, because the same control answers two different questions:
 *
 *   Without `record` — on the Brand to Demand page and in dialogs, a stage
 *     links to `/lifecycle?stage=`, the org-wide pipeline. There is no record
 *     to lose, so navigating away is the right answer.
 *
 *   With `record` — on a detail page, a stage instead opens what THIS record
 *     holds at that stage: its briefs under Plan, its content under Create, its
 *     approvals under Comply. Linking to the org-wide page here discarded the
 *     record the user was reading and answered a question they had not asked.
 *     Every stage opens, including the ones the record has nothing at — those
 *     say so in the panel and offer the org-wide view as a link, so a user only
 *     leaves the record when they choose to.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_ORDER,
  lifecycleIndex,
} from "@/lib/lifecycle";
import { stageBreakdown, type StageNeighbour } from "@/data/selectors/stageSelectors";
import { recordHref } from "@/lib/recordRoute";
import { entityNoun } from "@/lib/entityNouns";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import type { EntityName, LifecycleStageKey, SeedDB } from "@/data/types";

interface LifecycleStepperProps {
  /** The record's current stage. Nothing renders when it cannot be derived. */
  stage: LifecycleStageKey | null;
  /**
   * The record this stepper describes. Supplying it switches the stepper from
   * "link to the org-wide pipeline" to "show this record's own work per stage".
   */
  record?: { db: SeedDB; entity: EntityName; id: string };
  /**
   * Set false where there is nowhere useful for a stage to go — inside a
   * dialog, navigating away abandons whatever the user was part-way through.
   */
  interactive?: boolean;
  className?: string;
}

export function LifecycleStepper({
  stage,
  record,
  interactive = true,
  className,
}: LifecycleStepperProps) {
  const [openStage, setOpenStage] = useState<LifecycleStageKey | null>(null);

  /* Traverses the graph, so it is memoised on the record rather than recomputed
     on every open/close. Returns {} when there is no record — the hook still
     runs unconditionally, which keeps the hook order stable across both modes. */
  const breakdown = useMemo(
    () => (record ? stageBreakdown(record.db, record.entity, record.id) : {}),
    [record],
  );

  if (!stage) return null;
  const currentIndex = lifecycleIndex(stage);
  const panelId = record ? `stage-panel-${record.id}` : undefined;
  const openItems: StageNeighbour[] = openStage ? breakdown[openStage] ?? [] : [];

  return (
    <div className={className}>
      <nav
        aria-label="Brand to Demand stage"
        className="flex h-8 items-center gap-1 overflow-x-auto"
      >
        {LIFECYCLE_ORDER.map((key, i) => {
          const isCurrent = i === currentIndex;
          const isComplete = i < currentIndex;
          const label = LIFECYCLE_LABELS[key];
          const tone = cn(
            "shrink-0 rounded-md px-2 py-1 text-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isCurrent && "bg-primary font-medium text-primary-foreground",
            isComplete && "text-foreground",
            !isCurrent && !isComplete && "text-muted-foreground/50",
          );

          if (!interactive) {
            return (
              <span key={key} aria-current={isCurrent ? "step" : undefined} className={tone}>
                {label}
              </span>
            );
          }

          if (!record) {
            return (
              <Link
                key={key}
                to={`/lifecycle?stage=${key}`}
                aria-current={isCurrent ? "step" : undefined}
                title={`${label} — open in Brand to Demand`}
                className={cn(tone, "hover:bg-accent")}
              >
                {label}
              </Link>
            );
          }

          const count = breakdown[key]?.length ?? 0;

          /* A stage with nothing at it opens the same panel, which says so and
             offers the org-wide view as a link the user can decline.

             Both alternatives were tried and both were wrong. Inert text left
             seven of eight stages dead on a record whose neighbours all sit at
             one stage, which reads as a broken control. Navigating straight to
             the org-wide pipeline fixed that by throwing away the record being
             read — an answer to a question nobody asked.

             Answering in place keeps every stage live without ever costing the
             user their place. The 0 stays on the label: without a number a faint
             stage reads as "disabled, and I am not told why" rather than "this
             record has nothing here", which is the actual answer. */
          const isOpen = openStage === key;
          const empty = count === 0;
          return (
            <button
              key={key}
              type="button"
              aria-current={isCurrent ? "step" : undefined}
              aria-expanded={isOpen}
              aria-controls={panelId}
              title={
                empty
                  ? `Nothing linked to this record sits at ${label}`
                  : `${count} ${count === 1 ? "record" : "records"} on this page at ${label}`
              }
              onClick={() => setOpenStage(isOpen ? null : key)}
              className={cn(
                tone,
                "hover:bg-accent",
                isCurrent && "hover:bg-primary/90",
                isOpen && !isCurrent && "bg-accent",
              )}
            >
              {label}
              <span
                className={cn(
                  "ml-1 tabular-nums",
                  isCurrent ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {record && openStage && (
        <div
          id={panelId}
          className="mt-2 rounded-md border bg-card p-3"
        >
          <p className="mb-2 text-xs font-medium">
            {LIFECYCLE_LABELS[openStage]} ·{" "}
            {openItems.length === 0
              ? "nothing linked to this one"
              : `${openItems.length} ${
                  openItems.length === 1 ? "record" : "records"
                } linked to this one`}
          </p>

          {/* The org-wide pipeline as an offer, not a redirect. This is where a
              user who wanted the whole stage rather than this record's slice of
              it goes — but they leave the record on purpose, having been told
              what the record itself holds. */}
          {openItems.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing linked to this record sits at {LIFECYCLE_LABELS[openStage]}.{" "}
              <Link
                to={`/lifecycle?stage=${openStage}`}
                className="font-medium text-foreground hover:underline"
              >
                See {LIFECYCLE_LABELS[openStage]} across the organisation
              </Link>
            </p>
          )}
          <ul className="space-y-1.5">
            {openItems.map((item) => {
              const href = recordHref(item.entity, item.id);
              const noun = entityNoun(item.entity) ?? item.entity;
              return (
                <li
                  key={`${item.entity}:${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    {/* Only eleven entities have a routed page; the rest are
                        real records with nowhere to go, so they render as text
                        rather than as a link to a route that does not exist. */}
                    {href ? (
                      <Link to={href} className="truncate font-medium hover:underline">
                        {item.title}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">{item.title}</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">{noun}</span>
                  </span>
                  {item.status && <StatusBadge status={item.status} entity={item.entity} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
