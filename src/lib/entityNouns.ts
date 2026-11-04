/**
 * Readable nouns for entity types, for surfaces that list related records.
 *
 * Shared so the relationship chips and the lifecycle stepper cannot describe
 * the same neighbour with two different words on the same page.
 *
 * An entity absent from this table is one not worth naming to a user on a
 * record header — callers treat `null` as "do not surface", which is why this
 * is deliberately not exhaustive over EntityName.
 */

import type { EntityName } from '@/data/types';

export const ENTITY_NOUNS: Partial<Record<EntityName, [singular: string, plural: string]>> = {
  Campaign: ['campaign', 'campaigns'],
  CampaignActivity: ['activity', 'activities'],
  Communication: ['communication', 'communications'],
  ChannelExecution: ['execution', 'executions'],
  Content: ['content item', 'content items'],
  ContentVersion: ['version', 'versions'],
  Asset: ['asset', 'assets'],
  Audience: ['audience', 'audiences'],
  Segment: ['segment', 'segments'],
  CustomerPersona: ['persona', 'personas'],
  Approval: ['approval', 'approvals'],
  Brief: ['brief', 'briefs'],
  Channel: ['channel', 'channels'],
  Journey: ['journey', 'journeys'],
  Event: ['event', 'events'],
  MediaContact: ['media contact', 'media contacts'],
  CoverageItem: ['coverage item', 'coverage items'],
  Idea: ['idea', 'ideas'],
  KPI: ['KPI', 'KPIs'],
};

/** Singular noun for an entity, or null when it is not worth naming. */
export function entityNoun(entity: EntityName): string | null {
  return ENTITY_NOUNS[entity]?.[0] ?? null;
}

/** "3 campaigns" / "1 campaign", or null when the entity is not worth naming. */
export function countLabel(entity: EntityName, count: number): string | null {
  const noun = ENTITY_NOUNS[entity];
  if (!noun) return null;
  return `${count} ${count === 1 ? noun[0] : noun[1]}`;
}
