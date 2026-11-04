/**
 * The one place a nav destination's label is written.
 *
 * Three surfaces need this string and they must agree:
 *   - the sidebar itself (src/components/layout/AppSidebar.tsx)
 *   - the role×nav visibility matrix on AdminPage, which documents that sidebar
 *   - PageHeader, which hides a page title that merely repeats it
 *
 * They used to hold separate copies and drifted: the admin matrix said
 * "Governance" where the menu said "Governance & crisis", so an admin could not
 * tell whether the row and the menu item were the same entry.
 */

import { NAV_KEY_BY_ROUTE, type NavKey } from "@/lib/rbac";

export const NAV_LABELS: Record<NavKey, string> = {
  lifecycle: "Brand to Demand",
  audiences: "Audiences & personas",
  market: "Market intelligence",
  ideas: "Ideation hub",
  campaigns: "Campaigns",
  budget: "Budget",
  calendar: "Calendar",
  events: "Events",
  content: "Content studio",
  assets: "Asset library",
  approvals: "Approvals",
  communications: "Communications",
  journeys: "Journeys & channels",
  internal: "Internal comms",
  pr: "PR & media",
  agencies: "Agencies",
  rulebook: "Brand rulebook",
  governance: "Governance & crisis",
  performance: "Performance",
  reports: "Board pack",
  graph: "Graph explorer",
  agents: "Agent catalogue",
  admin: "Administration",
  dashboard: "Command center",
};

/**
 * Whether a page title merely repeats the menu entry the user just clicked.
 *
 * Only an exact match counts, and that is deliberate. A detail page passes a
 * record name through the same header — a campaign name, an asset filename —
 * and a looser rule (prefix, contains) would hide a record called
 * "Campaigns Q4" on `/campaigns/…`. A list page that wants its heading
 * de-duplicated simply titles itself with the menu label.
 */
export function duplicatesNavLabel(pathname: string, title: string): boolean {
  const segment = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  const navKey = NAV_KEY_BY_ROUTE[segment];
  if (!navKey) return false;
  return NAV_LABELS[navKey].trim().toLowerCase() === title.trim().toLowerCase();
}
