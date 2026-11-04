/**
 * The rule that decides whether an idea can be promoted into a draft campaign.
 *
 * The Ideation hub renders the Promote button from it and `/ideas/:id` explains
 * a missing campaign by naming it. Two copies would eventually disagree with
 * the button, so both read this one.
 */

import type { IdeaStatus } from "@/data/types";
import type { AppRole } from "@/lib/rbac";

/** Roles allowed to promote an idea into a draft campaign. */
export const PROMOTE_ROLES: readonly AppRole[] = [
  "CMO",
  "Campaign Manager",
  "Platform Admin",
];

/** Idea statuses the Promote to campaign action is offered on. */
export const PROMOTABLE_IDEA_STATUSES: readonly IdeaStatus[] = ["Scored", "Approved"];
