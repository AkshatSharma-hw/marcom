// ════════════════════════════════════════════════════════════════
// Role-Based Access Control (RBAC) for the MarComm demo.
// Seeded-identity login-picker model: the user "signs in" as one of
// the demo identities below, and the role only changes via that
// login picker (no topbar role toggle).
// Adapted from ui/controls/src/lib/rbac.ts.
// ════════════════════════════════════════════════════════════════

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
// Identities follow the ACTIVE demo pack. Importing the default pack's
// stakeholders directly showed Aureon people's names over another pack's
// data — the signed-in name and every record owner disagreed on screen.
import { getSeedDB } from "@/data/seed";

// ── Roles ──
export const APP_ROLES = [
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
] as const;

export type AppRole = (typeof APP_ROLES)[number];

// ── Demo identities (one seeded user per role) ──
export interface DemoUser {
  name: string;
  initials: string;
  title: string;
}

// Demo identities derive from the seed stakeholder graph — the identity chip,
// the approvals inbox, and every other role→stakeholder join must agree.
export const DEMO_USERS: Record<AppRole, DemoUser> = Object.fromEntries(
  APP_ROLES.map((role) => {
    const s = getSeedDB().stakeholders.find((st) => st.role === role);
    const name = s?.name ?? role;
    const initials =
      s?.avatar ??
      name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    return [role, { name, initials, title: role }];
  }),
) as Record<AppRole, DemoUser>;

// ── Navigation visibility ──
/**
 * Nav keys in sidebar order, grouped by business function.
 *
 * Order is load-bearing beyond the sidebar: `visibleNavKeys` returns keys in
 * this order and AdminPage renders its role×nav visibility matrix from it, so a
 * divergence here makes the admin matrix disagree with the menu it documents.
 * Keep this list and `navGroups` in src/components/layout/AppSidebar.tsx in step.
 *
 * `lifecycle` and `agents` carry no restriction entry below — they explain the
 * operating model rather than expose scoped records, so every role sees them.
 */
export const NAV_KEYS = [
  "lifecycle",
  // Voice of Customer
  "audiences",
  "market",
  // Campaigns
  "ideas",
  "campaigns",
  "budget",
  "calendar",
  "events",
  // Content & Creative
  "content",
  "assets",
  "approvals",
  // Customer Engagement
  "communications",
  "journeys",
  "internal",
  "pr",
  "agencies",
  // Brand & Compliance
  "rulebook",
  "governance",
  // Performance & Insights
  "performance",
  "reports",
  "graph",
  // Platform
  "agents",
  "admin",
  "dashboard",
] as const;

export type NavKey = (typeof NAV_KEYS)[number];

/** Nav keys restricted to specific roles; anything not listed is visible to all. */
const NAV_RESTRICTIONS: Partial<Record<NavKey, readonly AppRole[]>> = {
  internal: ["Internal Comms Manager", "Corporate Comms Manager", "CMO", "Executive", "Platform Admin"],
  journeys: ["Campaign Manager", "Internal Comms Manager", "PR Manager", "Platform Admin"],
  // Legal/Compliance owns the suppression list, so must be able to open the page.
  audiences: [
    "CMO",
    "Campaign Manager",
    "Internal Comms Manager",
    "Legal/Compliance Reviewer",
    "Platform Admin",
  ],
  budget: ["CMO", "Campaign Manager", "Executive", "Platform Admin"],
  // Agency users get no market or competitor intelligence — the same exclusion
  // the Ideation hub already applied to the market panel when it lived there.
  market: [
    "CMO",
    "Campaign Manager",
    "Corporate Comms Manager",
    "Content Manager",
    "Brand Manager",
    "PR Manager",
    "Internal Comms Manager",
    "Legal/Compliance Reviewer",
    "Executive",
    "Platform Admin",
  ],
  pr: ["PR Manager", "Corporate Comms Manager", "CMO", "Platform Admin"],
  agencies: ["CMO", "Campaign Manager", "Platform Admin"],
  rulebook: [
    "Brand Manager",
    "Legal/Compliance Reviewer",
    "Corporate Comms Manager",
    "CMO",
    "Content Manager",
    "Platform Admin",
  ],
  governance: ["Legal/Compliance Reviewer", "Corporate Comms Manager", "CMO", "Platform Admin"],
  admin: ["Platform Admin"],
  reports: ["CMO", "Executive", "Corporate Comms Manager", "Platform Admin"],
  // Agency users have no performance/KPI visibility and no graph-wide access
  // (blueprint: hard-scoped to assigned Campaign/Brief/Asset records only).
  performance: [
    "CMO",
    "Campaign Manager",
    "Corporate Comms Manager",
    "Content Manager",
    "Brand Manager",
    "PR Manager",
    "Internal Comms Manager",
    "Legal/Compliance Reviewer",
    "Executive",
    "Platform Admin",
  ],
  graph: [
    "CMO",
    "Campaign Manager",
    "Corporate Comms Manager",
    "Content Manager",
    "Brand Manager",
    "PR Manager",
    "Internal Comms Manager",
    "Legal/Compliance Reviewer",
    "Executive",
    "Platform Admin",
  ],
};

/** Whether a nav entry is visible for a role. Unrestricted keys are visible to everyone. */
export function canSeeNav(role: AppRole, navKey: NavKey): boolean {
  const allowed = NAV_RESTRICTIONS[navKey];
  return allowed ? allowed.includes(role) : true;
}

/** All nav keys visible to a role, in canonical order. */
export function visibleNavKeys(role: AppRole): NavKey[] {
  return NAV_KEYS.filter((key) => canSeeNav(role, key));
}

/**
 * Router path → nav key, for gating links that are *computed* rather than
 * rendered from the sidebar.
 *
 * The sidebar and `RequireRole` both read `canSeeNav`, so no role is ever shown
 * a nav item it cannot open. Cross-links inside a page had no such gate: a
 * relationship chip, a graph row or a notification builds a path directly, and
 * a path is not a nav key. Every entry below must name a real route in
 * `App.tsx`; a path with no entry is a route every role can reach.
 */
export const NAV_KEY_BY_ROUTE: Readonly<Record<string, NavKey>> = {
  "/dashboard": "dashboard",
  "/lifecycle": "lifecycle",
  "/agents": "agents",
  "/ideas": "ideas",
  "/campaigns": "campaigns",
  "/communications": "communications",
  "/internal": "internal",
  "/calendar": "calendar",
  "/events": "events",
  "/content": "content",
  "/assets": "assets",
  "/approvals": "approvals",
  "/performance": "performance",
  "/reports": "reports",
  "/budget": "budget",
  "/journeys": "journeys",
  "/audiences": "audiences",
  "/market": "market",
  "/pr": "pr",
  "/agencies": "agencies",
  "/rulebook": "rulebook",
  "/governance": "governance",
  "/admin": "admin",
  "/graph": "graph",
};

/**
 * Whether a role can actually open a computed href.
 *
 * Matches on the first path segment, so detail routes (`/campaigns/CMP-001`)
 * and query strings (`/assets?id=AST-006`) gate on the section they belong to.
 */
export function canReachPath(role: AppRole, to: string): boolean {
  const path = to.split(/[?#]/)[0];
  const segment = `/${path.split("/").filter(Boolean)[0] ?? ""}`;
  const navKey = NAV_KEY_BY_ROUTE[segment];
  return navKey ? canSeeNav(role, navKey) : true;
}

// ── Role Context (simulated — no auth backend) ──

const STORAGE_KEY = "marcomm-role";
const DEFAULT_ROLE: AppRole = "CMO";

interface RoleContextValue {
  role: AppRole;
  /** Only the login picker should call this — there is no topbar role toggle. */
  setRole: (role: AppRole) => void;
  currentUser: DemoUser;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

function loadInitialRole(): AppRole {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isAppRole(saved)) return saved;
  } catch {
    /* storage unavailable — fall back to default */
  }
  return DEFAULT_ROLE;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<AppRole>(loadInitialRole);

  const setRole = useCallback((next: AppRole) => {
    setRoleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — keep in memory */
    }
  }, []);

  const value = useMemo<RoleContextValue>(
    () => ({ role, setRole, currentUser: DEMO_USERS[role] }),
    [role, setRole]
  );

  return React.createElement(RoleContext.Provider, { value }, children);
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
