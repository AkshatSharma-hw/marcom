/**
 * The shared shell for every routed record page.
 *
 * Before this existed the app had exactly two detail pages (Campaign and
 * Content) and everything else opened in a side sheet or nowhere at all. A
 * sheet has no URL, so a record could not be linked, bookmarked, opened in a
 * new tab, or returned to with the back button — the drill-down existed
 * visually but not as navigation.
 *
 * `RecordDetailHeader` is lifted verbatim from CampaignDetail's header so the
 * pages that already existed and the ones added around them are the same
 * object: back link, title, id line, status, blocker, relationship chips,
 * lifecycle stepper. `RecordNotFound` gives every page the same two honest
 * failure states — the record does not exist, or it exists and your role
 * cannot see it — which are different answers and must not be collapsed.
 */

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { LifecycleStepper } from "@/components/marcomm/LifecycleStepper";
import { RelationshipChips } from "@/components/marcomm/RelationshipChips";
import { Button } from "@/components/ui/button";
import { lifecycleStageFor } from "@/lib/lifecycle";
import type { BlockerInfo } from "@/data/selectors/blockerSelectors";
import type { EntityName, SeedDB } from "@/data/types";

interface RecordDetailHeaderProps {
  db: SeedDB;
  entity: EntityName;
  id: string;
  title: string;
  /** The line under the title — classification, type, owner. The id is appended. */
  description?: string;
  /** Stored status, when the entity has one. Drives the badge and the stepper. */
  status?: string;
  blocker?: BlockerInfo | null;
  /** Where the back link goes, and what it is called. */
  backTo: string;
  backLabel: string;
  /** Extra controls rendered beside the status badge. */
  actions?: ReactNode;
  /** Rendered before "View graph" in the relationship line — e.g. a rights note. */
  chipPrefix?: ReactNode;
}

export function RecordDetailHeader({
  db,
  entity,
  id,
  title,
  description,
  status,
  blocker = null,
  backTo,
  backLabel,
  actions,
  chipPrefix,
}: RecordDetailHeaderProps) {
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-7 px-2 text-xs">
        <Link to={backTo}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </Button>

      <PageHeader
        title={title}
        description={description ? `${description} · ${id}` : id}
        actions={
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {actions}
              {/* The header already knows the entity, so statuses whose meaning
                  is entity-specific (an Active journey vs an Active crisis)
                  tone correctly on every detail page without each one knowing. */}
              {status && <StatusBadge status={status} entity={entity} />}
            </div>
            <BlockerLine blocker={blocker} />
          </div>
        }
      />

      <RelationshipChips db={db} entity={entity} id={id} className="mt-2">
        {chipPrefix}
      </RelationshipChips>

      {/* Renders nothing when the entity has no derivable stage, so it is safe
          to call unconditionally. Passing the record makes each stage open what
          THIS record holds there, rather than leaving for the org-wide page. */}
      <LifecycleStepper
        stage={lifecycleStageFor(entity, status)}
        record={{ db, entity, id }}
        className="mt-2"
      />
    </div>
  );
}

interface RecordNotFoundProps {
  icon: LucideIcon;
  /** Singular noun, lower case — "campaign", "asset", "media contact". */
  noun: string;
  /** The id from the URL, so the message names what was actually asked for. */
  id: string | undefined;
  backTo: string;
  backLabel: string;
  /**
   * True when the record EXISTS but this role may not see it. The two cases
   * read very differently to a user and collapsing them into "not found" hides
   * a permissions problem behind what looks like a broken link.
   */
  outOfScope?: boolean;
  /** What the scope actually is, e.g. the agency name. */
  scopeHint?: string;
}

export function RecordNotFound({
  icon,
  noun,
  id,
  backTo,
  backLabel,
  outOfScope = false,
  scopeHint,
}: RecordNotFoundProps) {
  return (
    <div className="p-6">
      <EmptyState
        icon={icon}
        title={outOfScope ? `${noun[0].toUpperCase()}${noun.slice(1)} not available` : `${noun[0].toUpperCase()}${noun.slice(1)} not found`}
        hint={
          outOfScope
            ? `This ${noun} is not assigned to ${scopeHint ?? "your scope"}. Access follows assignment — you see a record once it is assigned to you.`
            : `No ${noun} with id '${id ?? ""}' exists in the database.`
        }
        actionSlot={
          <Button asChild size="sm" variant="outline">
            <Link to={backTo}>Back to {backLabel}</Link>
          </Button>
        }
      />
    </div>
  );
}

/** Standard page frame: matches the spacing every existing detail page uses. */
export function RecordDetailPage({ children }: { children: ReactNode }) {
  return <div className="space-y-4 p-6">{children}</div>;
}
