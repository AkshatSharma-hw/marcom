/**
 * A record's neighbours, grouped by the lifecycle stage they sit at.
 *
 * The stepper on a detail page used to link every stage to the org-wide Brand
 * to Demand page, which threw away the record the user was looking at and
 * answered a question they had not asked. This selector answers the question
 * they did ask — "what does *this* record have at that stage?" — from data the
 * app already holds.
 *
 * Nothing here is stored. Neighbours come from the same `linksTo`/`linksFrom`
 * traversal the Graph explorer and the relationship chips use, and each one's
 * stage comes from `lifecycleStageFor`, derived from its status. So a stage
 * bucket can never disagree with the badge on the record it lists.
 */

import {
  collections,
  displayTitle,
  linksFrom,
  linksTo,
  type Row,
} from '@/data/selectors/graphSelectors';
import { lifecycleStageFor } from '@/lib/lifecycle';
import type { EntityName, LifecycleStageKey, SeedDB } from '@/data/types';

export interface StageNeighbour {
  entity: EntityName;
  id: string;
  title: string;
  /** Stored status, when the entity has one. Absent for fixed-stage entities. */
  status?: string;
}

/**
 * Org backbone and reference data. Every record links to these by definition,
 * so listing them under a stage is noise, not information. Deliberately the
 * same set RelationshipChips suppresses — the two surfaces describe the same
 * neighbourhood and must not disagree about what is in it.
 */
const SUPPRESSED: ReadonlySet<EntityName> = new Set<EntityName>([
  'Organization',
  'BusinessUnit',
  'Region',
  'Brand',
  'Stakeholder',
  'Policy',
  'Workflow',
  'WorkflowStage',
  'Notification',
  'AuditRecord',
  'MetricResult',
  'LifecycleStage',
  // Machine telemetry, not a lifecycle record. An agent run is *how* a record
  // reached a stage, not something that itself sits at one — and the relationship
  // chips do not count it either, so listing it here would make the two lines
  // on the same header disagree.
  'AgentRun',
]);

export type StageBreakdown = Partial<Record<LifecycleStageKey, StageNeighbour[]>>;

/**
 * Readable name for a neighbour row.
 *
 * An approval carries no title of its own, so `displayTitle` falls through to
 * its id and the panel reads "APR-006", which tells a user nothing. What names
 * an approval is the workflow stage it is sitting at — the same phrase
 * `blockerFor` uses ("awaiting Brand & legal review"). Naming the subject
 * instead is no better on a record's own page: three approvals of one campaign
 * all read as that campaign, and the rows become indistinguishable.
 *
 * The subject is appended only when it is NOT the record being viewed, since
 * on the subject's own page it is implied.
 */
function neighbourTitle(
  entity: EntityName,
  row: Row,
  rowsByEntity: Map<EntityName, Row[]>,
  subjectId: string,
  workflowStages: Map<string, string>,
): string {
  if (entity === 'Approval') {
    const stageName = workflowStages.get(String(row.workflowStageId ?? ''));
    const ofEntity = row.subjectEntity as EntityName | undefined;
    const ofId = row.subjectId as string | undefined;
    const isAboutThisRecord = ofId === subjectId;

    const target =
      !isAboutThisRecord && ofEntity && ofId
        ? rowsByEntity.get(ofEntity)?.find((r) => r.id === ofId)
        : undefined;

    if (stageName) {
      return target ? `${stageName} · ${displayTitle(target)}` : stageName;
    }
    if (target) return `Approval of ${displayTitle(target)}`;
  }

  if (entity === 'ChannelExecution') {
    // An execution is identified by the channel it ran on; it has no name field.
    const channel = rowsByEntity.get('Channel')?.find((c) => c.id === row.channelId);
    if (channel) return displayTitle(channel);
  }

  if (entity === 'ContentVersion') {
    // "V1.1" alone is ambiguous across locales, and the locale alone says
    // nothing about which cut of the copy this is.
    const version = typeof row.versionNumber === 'string' ? row.versionNumber : null;
    const locale = typeof row.locale === 'string' ? row.locale : null;
    if (version) return locale ? `${version} · ${locale}` : version;
  }

  return displayTitle(row);
}

/**
 * Related records of `id`, bucketed by lifecycle stage.
 *
 * A neighbour whose stage cannot be derived is omitted rather than guessed —
 * the same rule `lifecycleStageFor` follows. Records of the subject's own
 * entity type are skipped for the same reason the chips skip them: a campaign
 * listing sibling campaigns says nothing about its own lifecycle.
 */
export function stageBreakdown(db: SeedDB, entity: EntityName, id: string): StageBreakdown {
  const rowsByEntity = new Map<EntityName, Row[]>(collections(db));
  const workflowStages = new Map<string, string>(
    (db.workflowStages ?? []).map((s) => [s.id, s.name]),
  );
  const out: StageBreakdown = {};

  // Both directions, deduped by record id — a reciprocal relation appears in
  // both traversals and would otherwise list the same record twice.
  const seen = new Set<string>();
  for (const link of [...linksTo(db, id), ...linksFrom(db, id)]) {
    if (SUPPRESSED.has(link.entity) || link.entity === entity) continue;
    if (link.id === id || seen.has(link.id)) continue;
    seen.add(link.id);

    const row = rowsByEntity.get(link.entity)?.find((r) => r.id === link.id);
    if (!row) continue;

    const status = typeof row.status === 'string' ? row.status : undefined;
    const stage = lifecycleStageFor(link.entity, status);
    if (!stage) continue;

    (out[stage] ??= []).push({
      entity: link.entity,
      id: link.id,
      title: neighbourTitle(link.entity, row, rowsByEntity, id, workflowStages),
      status,
    });
  }

  // Stable, readable order within a bucket: entity type, then title.
  for (const list of Object.values(out)) {
    list.sort(
      (a, b) => a.entity.localeCompare(b.entity, 'en-US') || a.title.localeCompare(b.title, 'en-US'),
    );
  }
  return out;
}
