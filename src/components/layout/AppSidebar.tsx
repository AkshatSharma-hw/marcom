import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookMarked,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  FileBarChart,
  FileText,
  GitBranch,
  Images,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  MessagesSquare,
  Newspaper,
  Radar,
  Route,
  Settings,
  Shield,
  Users,
  Wallet,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canSeeNav, useRole, type NavKey } from "@/lib/rbac";
import { NAV_LABELS } from "@/lib/navLabels";

/** Labels are not stored here — they come from NAV_LABELS, keyed by `key`. */
interface NavItem {
  to: string;
  icon: LucideIcon;
  key: NavKey;
}

interface NavGroup {
  group: string | null;
  items: NavItem[];
}

/**
 * Navigation groups are named for the business function a user is there to do,
 * not for the lifecycle verb behind it.
 *
 * The lifecycle stage names (Govern / Understand / Plan / Create / Activate /
 * Measure) describe the operating model correctly, but they read as internal
 * vocabulary to a customer opening the product for the first time — "Understand"
 * does not tell anyone they will find audiences and market data there. The
 * lifecycle is still taught in the two places built for it: LifecycleStepper on
 * every detail record, and the Brand to Demand page. So the menu is free to use
 * the words the business already uses.
 *
 * Mapping from the lifecycle stages, for anyone tracing this back:
 *   Understand           -> Voice of Customer
 *   Plan                 -> Campaigns
 *   Create + Comply      -> Content & Creative
 *   Activate             -> Customer Engagement
 *   Govern               -> Brand & Compliance
 *   Measure + Learn      -> Performance & Insights
 *   Workspace            -> Platform
 *
 * Order tells a business story rather than a process one: know the customer,
 * plan the work, produce it, take it to market, keep it compliant, prove it
 * worked. Brand to Demand leads ungrouped as the one-screen explanation of the
 * whole module; Command center closes it as the cockpit you return to.
 */
const navGroups: NavGroup[] = [
  {
    group: null,
    items: [
      { to: "/lifecycle", icon: Route, key: "lifecycle" },
    ],
  },
  {
    group: "Voice of Customer",
    items: [
      { to: "/audiences", icon: Users, key: "audiences" },
      // Market sizing, trends, share of voice and competitor watch — observed
      // market context rather than a planning artefact.
      { to: "/market", icon: Radar, key: "market" },
    ],
  },
  {
    group: "Campaigns",
    items: [
      { to: "/ideas", icon: Lightbulb, key: "ideas" },
      { to: "/campaigns", icon: Megaphone, key: "campaigns" },
      { to: "/budget", icon: Wallet, key: "budget" },
      { to: "/calendar", icon: CalendarDays, key: "calendar" },
      { to: "/events", icon: CalendarRange, key: "events" },
    ],
  },
  {
    group: "Content & Creative",
    items: [
      { to: "/content", icon: FileText, key: "content" },
      { to: "/assets", icon: Images, key: "assets" },
      // Drafting and clearing are one flow, so the approval queue sits with
      // what it approves.
      { to: "/approvals", icon: CheckSquare, key: "approvals" },
    ],
  },
  {
    group: "Customer Engagement",
    items: [
      { to: "/communications", icon: MessagesSquare, key: "communications" },
      { to: "/journeys", icon: GitBranch, key: "journeys" },
      { to: "/internal", icon: Building2, key: "internal" },
      { to: "/pr", icon: Newspaper, key: "pr" },
      { to: "/agencies", icon: Briefcase, key: "agencies" },
    ],
  },
  {
    group: "Brand & Compliance",
    items: [
      { to: "/rulebook", icon: BookMarked, key: "rulebook" },
      { to: "/governance", icon: Shield, key: "governance" },
    ],
  },
  {
    group: "Performance & Insights",
    items: [
      { to: "/performance", icon: BarChart3, key: "performance" },
      { to: "/reports", icon: FileBarChart, key: "reports" },
      // A cross-cutting analysis tool — where people look when a number needs
      // explaining — rather than a lifecycle-stage output.
      { to: "/graph", icon: Waypoints, key: "graph" },
    ],
  },
  {
    group: "Platform",
    items: [
      // Agents span every stage, so the roster is platform tooling.
      { to: "/agents", icon: Bot, key: "agents" },
      { to: "/admin", icon: Settings, key: "admin" },
      { to: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
    ],
  },
];

interface AppSidebarProps {
  /** "sheet" renders an always-expanded nav for the mobile drawer. */
  variant?: "desktop" | "sheet";
  /** Called when a nav item is clicked (used to close the mobile sheet). */
  onNavigate?: () => void;
}

export function AppSidebar({ variant = "desktop", onNavigate }: AppSidebarProps) {
  const [railCollapsed, setRailCollapsed] = useState(false);
  const { role } = useRole();

  const inSheet = variant === "sheet";
  const collapsed = !inSheet && railCollapsed;

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => canSeeNav(role, item.key)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col bg-sidebar border-r border-sidebar-border",
        inSheet
          ? "w-full border-r-0"
          : cn("max-md:hidden transition-all duration-200", collapsed ? "w-16" : "w-60"),
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center gap-2.5 px-3", collapsed && "justify-center px-0")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <span className="text-sm font-semibold text-white">M</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="text-[16px] font-semibold text-sidebar-foreground">MarCom</div>
            <div className="text-[11px] text-muted-foreground">Brand to Demand</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {visibleGroups.map((group, gi) => (
          <div key={group.group ?? `group-${gi}`} className={cn(gi > 0 && "mt-4")}>
            {group.group && !collapsed && (
              <div className="px-2 pb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    title={collapsed ? NAV_LABELS[item.key] : undefined}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        collapsed && "justify-center px-0",
                        isActive &&
                          "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{NAV_LABELS[item.key]}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop rail only) */}
      {!inSheet && (
      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={() => setRailCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
      )}
    </aside>
  );
}
