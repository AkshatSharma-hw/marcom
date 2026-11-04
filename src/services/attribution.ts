/**
 * Attribution service — pluggable calculators over identical touchpoint data.
 *
 * Per BLUEPRINT.md Part 10 §4: attribution models (first-touch, last-touch,
 * linear, time-decay, position-based) implement one interface —
 * `AttributionModel.attribute(conversion, touchpoints): CreditAllocation[]` —
 * and are comparable side-by-side over the same event data. Adding a model is
 * one calculator entry here; no pipeline or page change.
 *
 * Everything is a pure, deterministic function of the frozen SeedDB:
 * touchpoints derive from the campaign's ChannelExecutions (ordered by
 * scheduledAt), the conversion value is the campaign's conversion-tier
 * MetricResult total. Same input, same output.
 */

import type { SeedDB } from '@/data/types';
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** One observed touch of a channel on the way to a conversion. */
export interface Touchpoint {
  channelId: string;
  /** ISO 8601 timestamp of the touch. */
  at: string;
  /**
   * Optional delivery-confidence multiplier (0–1) derived from the
   * ChannelExecution status; models may fold it into their base weights.
   */
  weightHint?: number;
}

/** A conversion outcome to distribute across touchpoints. */
export interface Conversion {
  campaignId: string;
  /** Total conversion value (conversion-tier MetricResult sum). */
  value: number;
}

/** Credit assigned to one channel by one model. */
export interface CreditAllocation {
  channelId: string;
  /** Fraction of total credit, 0–1; allocations for a conversion sum to 1. */
  weight: number;
  /** weight x conversion.value — absolute credited conversion volume. */
  value: number;
}

export type AttributionModelKey =
  | 'first-touch'
  | 'last-touch'
  | 'linear'
  | 'time-decay'
  | 'position-based';

/** The pluggable calculator contract — one implementation per model. */
export interface AttributionModel {
  key: AttributionModelKey;
  label: string;
  /** Short description of the lens this model applies. */
  description: string;
  attribute(conversion: Conversion, touchpoints: Touchpoint[]): CreditAllocation[];
}

/* ------------------------------------------------------------------ */
/* Shared aggregation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Fold per-touchpoint base weights (x weightHint) into per-channel
 * allocations, normalized so weights sum to 1. Channels appear in
 * first-touch order; channels whose weight rounds to zero are kept so
 * every model reports the same channel set.
 */
function toAllocations(
  conversion: Conversion,
  touchpoints: Touchpoint[],
  baseWeights: number[],
): CreditAllocation[] {
  const byChannel = new Map<string, number>();
  let total = 0;
  touchpoints.forEach((tp, i) => {
    const w = baseWeights[i] * (tp.weightHint ?? 1);
    byChannel.set(tp.channelId, (byChannel.get(tp.channelId) ?? 0) + w);
    total += w;
  });
  return [...byChannel.entries()].map(([channelId, raw]) => {
    const weight = total > 0 ? raw / total : 0;
    return { channelId, weight, value: weight * conversion.value };
  });
}

/* ------------------------------------------------------------------ */
/* The five calculators                                                */
/* ------------------------------------------------------------------ */

/** Time-decay half-life: a touch 7 days older carries half the weight. */
const TIME_DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/** Position-based (U-shaped) edge share: 40% first + 40% last + 20% middle. */
const POSITION_EDGE_SHARE = 0.4;

export const ATTRIBUTION_MODELS: AttributionModel[] = [
  {
    key: 'first-touch',
    label: 'First touch',
    description: 'All credit to the earliest touchpoint',
    attribute(conversion, touchpoints) {
      if (touchpoints.length === 0) return [];
      const weights = touchpoints.map((_, i) => (i === 0 ? 1 : 0));
      return toAllocations(conversion, touchpoints, weights);
    },
  },
  {
    key: 'last-touch',
    label: 'Last touch',
    description: 'All credit to the latest touchpoint',
    attribute(conversion, touchpoints) {
      if (touchpoints.length === 0) return [];
      const weights = touchpoints.map((_, i) =>
        i === touchpoints.length - 1 ? 1 : 0,
      );
      return toAllocations(conversion, touchpoints, weights);
    },
  },
  {
    key: 'linear',
    label: 'Linear',
    description: 'Equal credit to every touchpoint',
    attribute(conversion, touchpoints) {
      if (touchpoints.length === 0) return [];
      const weights = touchpoints.map(() => 1);
      return toAllocations(conversion, touchpoints, weights);
    },
  },
  {
    key: 'time-decay',
    label: 'Time decay',
    description: 'Recent touchpoints earn exponentially more (7-day half-life)',
    attribute(conversion, touchpoints) {
      if (touchpoints.length === 0) return [];
      const latest = Math.max(...touchpoints.map((tp) => Date.parse(tp.at)));
      const weights = touchpoints.map((tp) =>
        Math.pow(0.5, (latest - Date.parse(tp.at)) / TIME_DECAY_HALF_LIFE_MS),
      );
      return toAllocations(conversion, touchpoints, weights);
    },
  },
  {
    key: 'position-based',
    label: 'Position based',
    description: 'U-shaped: 40% first, 40% last, 20% spread across the middle',
    attribute(conversion, touchpoints) {
      const n = touchpoints.length;
      if (n === 0) return [];
      const weights = touchpoints.map((_, i) => {
        if (n === 1) return 1;
        if (n === 2) return 0.5;
        if (i === 0 || i === n - 1) return POSITION_EDGE_SHARE;
        return (1 - 2 * POSITION_EDGE_SHARE) / (n - 2);
      });
      return toAllocations(conversion, touchpoints, weights);
    },
  },
];

export function getAttributionModel(key: AttributionModelKey): AttributionModel {
  const model = ATTRIBUTION_MODELS.find((m) => m.key === key);
  if (!model) throw new Error(`Unknown attribution model: ${key}`);
  return model;
}

/* ------------------------------------------------------------------ */
/* Touchpoint derivation (deterministic, seed-driven)                  */
/* ------------------------------------------------------------------ */

/** weightHint per ChannelExecution status — failed sends never touched anyone. */
const STATUS_WEIGHT_HINT: Record<string, number> = {
  sent: 1,
  sending: 0.75,
  queued: 0.5,
  draft: 0.25,
};

/**
 * Build the campaign's touchpoint sequence from its ChannelExecutions:
 * Campaign → CampaignActivities → Communications → ChannelExecutions,
 * ordered by scheduledAt (fallback: the communication's scheduledAt, then
 * the execution's createdAt) with id as the deterministic tie-break.
 * Failed executions are excluded — they never reached the audience.
 * Same SeedDB input always yields the same output.
 */
export function deriveTouchpoints(db: SeedDB, campaignId: string): Touchpoint[] {
  const activityIds = new Set(
    db.campaignActivities
      .filter((a) => a.campaignId === campaignId)
      .map((a) => a.id),
  );
  const commById = new Map(db.communications.map((c) => [c.id, c]));
  const commIds = new Set(
    db.communications
      .filter((c) => c.campaignActivityId && activityIds.has(c.campaignActivityId))
      .map((c) => c.id),
  );

  return db.channelExecutions
    .filter((x) => commIds.has(x.communicationId) && x.status !== 'failed')
    .map((x) => ({
      execId: x.id,
      channelId: x.channelId,
      at:
        x.scheduledAt ??
        commById.get(x.communicationId)?.scheduledAt ??
        x.createdAt,
      weightHint: STATUS_WEIGHT_HINT[x.status] ?? 0.25,
    }))
    .sort((a, b) =>
      a.at !== b.at ? a.at.localeCompare(b.at, DEFAULT_LOCALE) : a.execId.localeCompare(b.execId, DEFAULT_LOCALE),
    )
    .map(({ channelId, at, weightHint }) => ({ channelId, at, weightHint }));
}

/* ------------------------------------------------------------------ */
/* Campaign-level attribution                                          */
/* ------------------------------------------------------------------ */

/** Metric keys whose KPI tier is 'conversion' (the fixed taxonomy vocabulary). */
function conversionMetricKeys(db: SeedDB): Set<string> {
  return new Set(
    db.kpis.filter((k) => k.tier === 'conversion').map((k) => k.metricKey),
  );
}

/** Total conversion-tier MetricResult volume recorded for one campaign. */
export function campaignConversionTotal(db: SeedDB, campaignId: string): number {
  const keys = conversionMetricKeys(db);
  return db.metricResults
    .filter(
      (m) => m.dimensions.campaignId === campaignId && keys.has(m.metricKey),
    )
    .reduce((sum, m) => sum + m.value, 0);
}

export interface CampaignAttribution {
  campaignId: string;
  modelKey: AttributionModelKey;
  /** The conversion the credit distributes (value may be 0 if none recorded). */
  conversion: Conversion;
  touchpoints: Touchpoint[];
  allocations: CreditAllocation[];
}

/**
 * Run one attribution model over a campaign's derived touchpoints, using the
 * campaign's conversion MetricResult total as the conversion value.
 */
export function attributeCampaign(
  db: SeedDB,
  campaignId: string,
  modelKey: AttributionModelKey,
): CampaignAttribution {
  const touchpoints = deriveTouchpoints(db, campaignId);
  const conversion: Conversion = {
    campaignId,
    value: campaignConversionTotal(db, campaignId),
  };
  const allocations = getAttributionModel(modelKey).attribute(
    conversion,
    touchpoints,
  );
  return { campaignId, modelKey, conversion, touchpoints, allocations };
}
