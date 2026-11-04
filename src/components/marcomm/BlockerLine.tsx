/**
 * Named blockers inline (UI change instructions item 9).
 *
 * A bare "Blocked" badge is the least useful thing the product can say about
 * its most action-worthy state. This renders the blocker, its owner, its age
 * and its SLA state, and links straight to the approval holding it up.
 */

import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { blockerSummary, type BlockerInfo } from "@/data/selectors/blockerSelectors";

interface BlockerLineProps {
  blocker: BlockerInfo | null;
  /** Renders the SLA-breach marker; defaults on. */
  showSla?: boolean;
  className?: string;
}

export function BlockerLine({ blocker, showSla = true, className }: BlockerLineProps) {
  if (!blocker) return null;

  const age = blocker.ageDays === 1 ? "1 day" : `${blocker.ageDays} days`;
  const Icon = blocker.slaBreached ? AlertTriangle : Clock;
  const summary = blockerSummary(blocker);

  const body = (
    <>
      <Icon
        className={cn(
          "h-3 w-3 shrink-0",
          blocker.slaBreached ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      {/* The reason·owner·age string ellipsises in every column that shows it,
          so it carries its own title. On the linked variant this is also the
          innermost hovered node, which is why the link's title below repeats
          the summary — otherwise the link's purpose would shadow the value. */}
      <span className="truncate" title={summary}>
        {blocker.reason}
        {blocker.ownerName && <> · {blocker.ownerName}</>} · {age}
      </span>
      {showSla && blocker.slaBreached && (
        <span className="shrink-0 font-medium text-destructive">SLA breached</span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
    className,
  );

  if (!blocker.approvalId) {
    return <span className={classes}>{body}</span>;
  }

  return (
    <Link
      to={`/approvals?focus=${blocker.approvalId}`}
      className={cn(classes, "hover:text-foreground hover:underline")}
      title={`${summary} — open the blocking approval`}
    >
      {body}
    </Link>
  );
}
