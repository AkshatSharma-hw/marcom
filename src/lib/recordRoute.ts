/**
 * Entity -> detail route, in one place.
 *
 * Eleven entities have a routed record page; the rest are real records that
 * simply have no page of their own yet (a brief, an activity, a segment). Any
 * feature that lists related records has to answer "is this one openable?", and
 * answering it per-feature is how a link to a route that does not exist gets
 * shipped. `recordHref` returns null for those, so a caller renders text rather
 * than a dead link.
 *
 * Keep this in step with the routes registered in src/App.tsx.
 */

import type { EntityName } from '@/data/types';

const ROUTE_BY_ENTITY: Partial<Record<EntityName, (id: string) => string>> = {
  Campaign: (id) => `/campaigns/${id}`,
  Content: (id) => `/content/${id}`,
  Idea: (id) => `/ideas/${id}`,
  Event: (id) => `/events/${id}`,
  Approval: (id) => `/approvals/${id}`,
  Asset: (id) => `/assets/${id}`,
  Communication: (id) => `/communications/${id}`,
  Audience: (id) => `/audiences/${id}`,
  Agency: (id) => `/agencies/${id}`,
  Journey: (id) => `/journeys/${id}`,
  MediaContact: (id) => `/pr/contacts/${id}`,
};

/** Path to an entity's detail page, or null when it has no routed page. */
export function recordHref(entity: EntityName, id: string): string | null {
  return ROUTE_BY_ENTITY[entity]?.(id) ?? null;
}

/** Entities that currently have a routed detail page. */
export const ROUTED_ENTITIES = Object.keys(ROUTE_BY_ENTITY) as EntityName[];
