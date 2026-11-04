/**
 * Inline graph relationships on a record (UI change instructions item 11).
 *
 * The Graph explorer is the strongest differentiator in the product and is
 * currently a destination users have to remember to visit. These chips put the
 * relationships on the record itself and deep-link into the explorer already
 * focused on it.
 *
 * Counts come from the same `linksTo` / `linksFrom` traversal the explorer
 * uses, so a chip can never disagree with the page it links to.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import { linksFrom, linksTo } from "@/data/selectors/graphSelectors";
import { canSeeNav, useRole } from "@/lib/rbac";
import { countLabel } from "@/lib/entityNouns";
import type { EntityName, SeedDB } from "@/data/types";

/**
 * Entities that say nothing useful on a record header — org backbone and
 * reference data every record links to by definition.
 */
const SUPPRESSED: ReadonlySet<EntityName> = new Set<EntityName>([
  "Organization",
  "BusinessUnit",
  "Region",
  "Brand",
  "Stakeholder",
  "Policy",
  "Workflow",
  "WorkflowStage",
  "Notification",
  "AuditRecord",
  "MetricResult",
  "LifecycleStage",
]);

interface RelationshipChipsProps {
  db: SeedDB;
  entity: EntityName;
  id: string;
  /** Extra content rendered before "View graph" — e.g. an asset's rights line. */
  children?: React.ReactNode;
  className?: string;
}

export function RelationshipChips({
  db,
  entity,
  id,
  children,
  className,
}: RelationshipChipsProps) {
  const counts = useMemo(() => {
    const byEntity = new Map<EntityName, number>();
    // Both directions matter: a campaign references its brief, while content
    // references the campaign. Counting one direction only halves the picture.
    //
    // Deduped by record id, because a reciprocal relation appears in BOTH
    // traversals and would otherwise be counted twice — a KPI listed in
    // `campaign.kpiIds` that also names the campaign in `attachedTo.campaignId`
    // made CMP-001 report "2 KPIs" for the single KPI-003. The graph counts
    // edges; a chip counts related records.
    const seen = new Set<string>();
    for (const link of [...linksTo(db, id), ...linksFrom(db, id)]) {
      if (SUPPRESSED.has(link.entity) || link.entity === entity) continue;
      if (seen.has(link.id)) continue;
      seen.add(link.id);
      byEntity.set(link.entity, (byEntity.get(link.entity) ?? 0) + 1);
    }
    return [...byEntity.entries()]
      .map(([e, n]) => ({ entity: e, text: countLabel(e, n) }))
      .filter((c): c is { entity: EntityName; text: string } => c.text !== null)
      .sort((a, b) => a.text.localeCompare(b.text, "en-US"));
  }, [db, entity, id]);

  /* These chips render on campaigns, content, assets and communications —
     routes an Agency User can reach — but `/graph` is closed to that role, so
     an ungated chip is a link that always lands on the restricted-area notice.
     The counts are still worth showing; only the door is withheld. */
  const { role } = useRole();
  const canOpenGraph = canSeeNav(role, "graph");
  const graphHref = `/graph?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`;

  if (counts.length === 0 && !children) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {children}
      {children && counts.length > 0 && <span aria-hidden="true">·</span>}
      {counts.map((c, i) => (
        <span key={c.entity} className="inline-flex items-center gap-1.5">
          {canOpenGraph ? (
            <Link
              to={graphHref}
              className="hover:text-foreground hover:underline"
              title={`Open ${c.text} for this record in the Graph explorer`}
            >
              {c.text}
            </Link>
          ) : (
            <span title="Counted from the relationship graph. The Graph explorer is not open to your role.">
              {c.text}
            </span>
          )}
          {i < counts.length - 1 && <span aria-hidden="true">·</span>}
        </span>
      ))}
      {canOpenGraph && (
        <>
          {counts.length > 0 && <span aria-hidden="true">·</span>}
          <Link
            to={graphHref}
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            <Waypoints className="h-3 w-3" aria-hidden="true" />
            View graph
          </Link>
        </>
      )}
    </div>
  );
}
