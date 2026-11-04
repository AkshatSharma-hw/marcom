import { Clock, GitFork, LogOut, Send, Users, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Journey, JourneyNode, JourneyNodeType } from "@/data/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */

const NODE_W = 200;
const NODE_H = 74;
const GAP_X = 72;
const GAP_Y = 28;
const PAD = 16;

/* ------------------------------------------------------------------ */
/* Node type presentation                                              */
/* ------------------------------------------------------------------ */

const nodeIcons: Record<JourneyNodeType, LucideIcon> = {
  trigger: Zap,
  audience: Users,
  condition: GitFork,
  branch: GitFork,
  wait: Clock,
  send: Send,
  exit: LogOut,
};

const nodeTypeLabels: Record<JourneyNodeType, string> = {
  trigger: "Trigger",
  audience: "Audience",
  condition: "Condition",
  branch: "Branch",
  wait: "Wait",
  send: "Send",
  exit: "Exit",
};

/* ------------------------------------------------------------------ */
/* Layered layout (BFS/longest-path depth, left-to-right)              */
/* ------------------------------------------------------------------ */

interface PositionedNode {
  node: JourneyNode;
  x: number;
  y: number;
}

interface CanvasLayout {
  positioned: PositionedNode[];
  byId: Map<string, PositionedNode>;
  width: number;
  height: number;
}

function computeLayout(journey: Journey): CanvasLayout {
  const { nodes, edges } = journey;

  // Longest-path layering: depth(n) = max over incoming edges of depth(from)+1.
  // Journeys are small DAGs, so simple relaxation converges in <= |nodes| passes.
  const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const e of edges) {
      const candidate = (depth.get(e.from) ?? 0) + 1;
      if (candidate > (depth.get(e.to) ?? 0)) {
        depth.set(e.to, candidate);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Group nodes into columns by depth, preserving declaration order per column.
  const columns = new Map<number, JourneyNode[]>();
  for (const node of nodes) {
    const d = depth.get(node.id) ?? 0;
    const col = columns.get(d) ?? [];
    col.push(node);
    columns.set(d, col);
  }

  const maxDepth = Math.max(0, ...columns.keys());
  const maxRows = Math.max(1, ...[...columns.values()].map((c) => c.length));
  const height = PAD * 2 + maxRows * NODE_H + (maxRows - 1) * GAP_Y;
  const width = PAD * 2 + (maxDepth + 1) * NODE_W + maxDepth * GAP_X;

  const positioned: PositionedNode[] = [];
  const byId = new Map<string, PositionedNode>();
  for (const [d, col] of columns) {
    const colHeight = col.length * NODE_H + (col.length - 1) * GAP_Y;
    const top = PAD + (height - PAD * 2 - colHeight) / 2;
    col.forEach((node, row) => {
      const p: PositionedNode = {
        node,
        x: PAD + d * (NODE_W + GAP_X),
        y: top + row * (NODE_H + GAP_Y),
      };
      positioned.push(p);
      byId.set(node.id, p);
    });
  }

  return { positioned, byId, width, height };
}

/* ------------------------------------------------------------------ */
/* Config summary                                                      */
/* ------------------------------------------------------------------ */

function configSummary(
  node: JourneyNode,
  resolveCommunication?: (id: string) => string | undefined,
  resolveSegment?: (id: string) => string | undefined,
): string | undefined {
  const cfg = node.config;
  switch (node.type) {
    case "wait":
      return cfg?.waitDays !== undefined
        ? `Wait ${cfg.waitDays} day${cfg.waitDays === 1 ? "" : "s"}`
        : undefined;
    case "send":
      return cfg?.communicationId
        ? resolveCommunication?.(cfg.communicationId) ?? cfg.communicationId
        : undefined;
    case "condition":
      return cfg?.condition ? `If ${cfg.condition}` : undefined;
    case "branch":
      return cfg?.splitPct !== undefined ? `${cfg.splitPct}/${100 - cfg.splitPct} split` : undefined;
    case "audience":
      return cfg?.segmentId
        ? resolveSegment?.(cfg.segmentId) ?? cfg.segmentId
        : undefined;
    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface JourneyCanvasProps {
  journey: Journey;
  selectedNodeId?: string | null;
  onNodeSelect?: (node: JourneyNode) => void;
  /** Resolve a communicationId to its subject for send-node summaries. */
  resolveCommunication?: (id: string) => string | undefined;
  /** Resolve a segmentId to its name for audience-node summaries. */
  resolveSegment?: (id: string) => string | undefined;
  className?: string;
}

/**
 * Read-only journey graph viewer. Nodes are laid out left-to-right by graph
 * depth and connected with SVG edges. Selection is surfaced via onNodeSelect.
 */
export function JourneyCanvas({
  journey,
  selectedNodeId,
  onNodeSelect,
  resolveCommunication,
  resolveSegment,
  className,
}: JourneyCanvasProps) {
  const { positioned, byId, width, height } = computeLayout(journey);
  const markerId = `journey-arrow-${journey.id}`;

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border bg-card", className)}>
      <div className="relative" style={{ width, height, minWidth: width }}>
        {/* Edge layer */}
        <svg
          className="pointer-events-none absolute inset-0 text-muted-foreground"
          width={width}
          height={height}
          aria-hidden="true"
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="currentColor" />
            </marker>
          </defs>
          {journey.edges.map((edge, i) => {
            const from = byId.get(edge.from);
            const to = byId.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + NODE_W;
            const y1 = from.y + NODE_H / 2;
            const x2 = to.x - 2;
            const y2 = to.y + NODE_H / 2;
            const bend = Math.max(28, (x2 - x1) / 2);
            const path = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
            return (
              <g key={`${edge.from}-${edge.to}-${i}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.6"
                  markerEnd={`url(#${markerId})`}
                />
                {edge.label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fill="currentColor"
                    className="text-[10px]"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Node layer */}
        {positioned.map(({ node, x, y }) => {
          const Icon = nodeIcons[node.type];
          const summary = configSummary(node, resolveCommunication, resolveSegment);
          const selected = node.id === selectedNodeId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onNodeSelect?.(node)}
              className={cn(
                "absolute flex items-start gap-2.5 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary ring-1 ring-primary"
                  : "border-border hover:border-primary/50",
              )}
              style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {nodeTypeLabels[node.type]}
                </span>
                <span className="block truncate text-xs font-medium">{node.label}</span>
                {summary && (
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {summary}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
