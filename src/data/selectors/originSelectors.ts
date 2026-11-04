/**
 * Record origin — proposed by an agent vs. authored directly (UI change
 * instructions item 1).
 *
 * There is no new `origin` column. Origin is DERIVED from the provenance chain
 * that already exists on ContentVersion (`ContentProvenance`, FR-CS-12), which
 * is the app's system of record for "what produced this". A second field would
 * fragment provenance across two models and could disagree with itself.
 *
 * Consequence worth knowing: a record only reads as agent-proposed when an
 * agent genuinely produced it. Entities with no agent production path yet
 * report `manual`, and their "proposed" counts are zero. That is honest — the
 * counts become real as agent-authored records enter the seed, not because a
 * badge was hardcoded.
 */

import type { EntityName, SeedDB } from '@/data/types';
import { DEFAULT_LOCALE } from "@/lib/i18n";

/**
 * `agent` — produced by an agent and not yet confirmed by a person.
 * `agent-accepted` — agent-produced and since approved; provenance is retained.
 * `manual` — authored directly.
 */
export type RecordOrigin = 'manual' | 'agent' | 'agent-accepted';

/** Provenance sources that indicate an agent produced the version. */
const AGENT_SOURCES = new Set(['ai-draft', 'variant', 'refinement', 'localization']);

/** Statuses that mean a person has signed the record off. */
const ACCEPTED_STATUSES = new Set(['approved', 'published', 'in use', 'live', 'sent', 'completed']);

export interface OriginInfo {
  origin: RecordOrigin;
  /** Generator identity, e.g. 'simulated-ai · deterministic'. */
  generator?: string;
  /** What the generator was asked to produce. */
  basis?: string;
  /** ISO timestamp the agent produced it. */
  producedAt?: string;
}

/**
 * Origin of a single ContentVersion, read straight off its provenance.
 */
export function versionOrigin(db: SeedDB, versionId: string): OriginInfo {
  const version = db.contentVersions.find((v) => v.id === versionId);
  if (!version?.provenance || !AGENT_SOURCES.has(version.provenance.source)) {
    return { origin: 'manual' };
  }
  const content = db.contents.find((c) => c.id === version.contentId);
  const accepted = content ? ACCEPTED_STATUSES.has(content.status.trim().toLowerCase()) : false;
  return {
    origin: accepted ? 'agent-accepted' : 'agent',
    generator: version.provenance.generator,
    basis: version.provenance.basis,
    producedAt: version.createdAt,
  };
}

/**
 * Origin of any record. Content resolves through its most recent version;
 * everything else has no agent production path yet and reports `manual`.
 */
export function originOf(db: SeedDB, entity: EntityName, id: string): OriginInfo {
  if (entity === 'ContentVersion') return versionOrigin(db, id);

  if (entity === 'Content') {
    const versions = db.contentVersions
      .filter((v) => v.contentId === id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt, DEFAULT_LOCALE));
    const latest = versions[versions.length - 1];
    return latest ? versionOrigin(db, latest.id) : { origin: 'manual' };
  }

  return { origin: 'manual' };
}

/** Count of records in a set awaiting review because an agent proposed them. */
export function proposedCount(
  db: SeedDB,
  entity: EntityName,
  ids: readonly string[],
): number {
  return ids.filter((id) => originOf(db, entity, id).origin === 'agent').length;
}
