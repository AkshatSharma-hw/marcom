/**
 * Marketing agents panel — the command-center window onto three of the eight
 * governed agents (A1, A3, A5). Names, purposes and deep links are read from
 * `db.marcomAgents`, the same reference rows the /agents catalogue renders, so
 * the panel can never drift from the roster: rename an agent in the seed and
 * both surfaces move together.
 *
 * Every stat is derived live from the DB (useLiveDB); nothing is hard-coded.
 * Rendered on the command center for all roles — agency users see stats derived
 * from the same live db their scoped views read from.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bot,
  MessagesSquare,
  Shield,
  Target,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveDB } from "@/data/useLiveDB";
import { canSeeNav, useRole, NAV_KEYS, type NavKey } from "@/lib/rbac";
import type {
  CommunicationStatus,
  IdeaStatus,
  MarcomAgentCode,
} from "@/data/types";

/* ------------------------------------------------------------------ */
/* Derivation constants                                                */
/* ------------------------------------------------------------------ */

/** Idea statuses where an AI proposal has been produced and is actionable. */
const PROPOSAL_READY_IDEA_STATUSES: readonly IdeaStatus[] = ["Scored", "Approved"];

/** Communication statuses considered "in flight" (actively being worked). */
const IN_FLIGHT_COMM_STATUSES: readonly CommunicationStatus[] = [
  "Briefed",
  "Drafting",
  "In Review",
  "Rework",
  "Approved",
  "Scheduled",
  "Live",
];

/* ------------------------------------------------------------------ */
/* Card model                                                          */
/* ------------------------------------------------------------------ */

/** The three agents this panel features, in display order. */
const FEATURED_CODES: readonly MarcomAgentCode[] = ["A1", "A3", "A5"];

/** Presentation only — the agent identity itself comes from db.marcomAgents. */
const AGENT_ICONS: Partial<Record<MarcomAgentCode, LucideIcon>> = {
  A1: Shield,
  A3: Target,
  A5: MessagesSquare,
};

/**
 * Short chip labels for the command center. The seed's `capabilities` are full
 * sentences written for the catalogue page; at 3-up card width they need a
 * headline form. The full list is one click away on /agents.
 */
const AGENT_CAPABILITY_CHIPS: Partial<Record<MarcomAgentCode, string[]>> = {
  A1: ["Brand guidelines", "Compliance checks", "Approved lexicon"],
  A3: ["GTM strategy", "Campaign proposals", "Budget allocation"],
  A5: ["Comms drafting", "Classification", "Crisis response"],
};

interface AgentDeepLink {
  label: string;
  to: string;
  /** Nav key the destination is gated by — links to areas the signed-in role
      cannot enter are hidden, so the panel never points at a locked door. */
  navKey: NavKey | null;
}

interface AgentCardModel {
  key: string;
  icon: LucideIcon;
  name: string;
  description: string;
  capabilities: string[];
  /** Two live derived stat fragments, joined with a separator dot. */
  stats: string[];
  links: AgentDeepLink[];
}

function plural(count: number, noun: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? noun : (pluralForm ?? `${noun}s`)}`;
}

const NAV_KEY_SET = new Set<string>(NAV_KEYS);

/**
 * The nav key a surface path is gated by — the first path segment, the same
 * pairing AppSidebar and the route table use. Paths outside the nav map are
 * ungated (null) and stay visible.
 */
function navKeyForPath(path: string): NavKey | null {
  const segment = path.replace(/^\/+/, "").split("/")[0];
  return NAV_KEY_SET.has(segment) ? (segment as NavKey) : null;
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function AgentsPanel() {
  const db = useLiveDB();
  const { role } = useRole();

  const agents = useMemo<AgentCardModel[]>(() => {
    // A1 Brand Governance Agent — AI gates wired into workflow stages + policies.
    const aiGateCount = db.workflowStages.filter(
      (ws) => ws.automation === "brand-ai" || ws.automation === "compliance-ai",
    ).length;
    const policyCount = db.policies.length;

    // A3 Product Marketing Planning Agent — ideas with proposals + laddered campaigns.
    const proposalReadyIdeaCount = db.ideas.filter((i) =>
      PROPOSAL_READY_IDEA_STATUSES.includes(i.status),
    ).length;
    const ladderedCampaignCount = db.campaigns.filter((c) => c.strategyId).length;

    // A5 Corporate Communication Agent — comms in flight + coverage monitored.
    const inFlightCommCount = db.communications.filter((c) =>
      IN_FLIGHT_COMM_STATUSES.includes(c.status),
    ).length;
    const coverageCount = db.coverageItems.length;

    /** Live derived stats per agent code — the panel's reason to exist. */
    const statsByCode: Partial<Record<MarcomAgentCode, string[]>> = {
      A1: [
        plural(aiGateCount, "AI gate") + " in workflows",
        plural(policyCount, "policy", "policies") + " enforced",
      ],
      A3: [
        plural(proposalReadyIdeaCount, "idea") + " with proposals",
        plural(ladderedCampaignCount, "campaign") + " laddered to strategy",
      ],
      A5: [
        plural(inFlightCommCount, "communication") + " in flight",
        plural(coverageCount, "coverage item") + " monitored",
      ],
    };

    return FEATURED_CODES.flatMap((code) => {
      const agent = db.marcomAgents.find((a) => a.code === code);
      if (!agent) return [];
      return [
        {
          key: agent.id,
          icon: AGENT_ICONS[code] ?? Bot,
          name: agent.name,
          description: agent.purpose,
          capabilities: AGENT_CAPABILITY_CHIPS[code] ?? [],
          stats: statsByCode[code] ?? [],
          links: agent.surfaces.map((surface) => ({
            label: surface.label,
            to: surface.to,
            navKey: navKeyForPath(surface.to),
          })),
        },
      ];
    });
  }, [db]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Bot
              className="h-4 w-4 text-violet-600 dark:text-violet-400"
              aria-hidden="true"
            />
            <CardTitle className="text-sm font-medium">Marketing agents</CardTitle>
          </div>
          <Link
            to="/agents"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all eight agents
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Three of the eight governed agents, closest to today's work — every
          action passes an approval gate.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.key} className="flex flex-col rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <agent.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center rounded-full border border-violet-600/20 bg-violet-600/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-400">
                  Approval required
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{agent.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {agent.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.capabilities.map((capability) => (
                  <span
                    key={capability}
                    className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {capability}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs font-medium">
                {agent.stats.join(" · ")}
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-3">
                {agent.links
                  .filter(
                    (link) => link.navKey === null || canSeeNav(role, link.navKey),
                  )
                  .map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
