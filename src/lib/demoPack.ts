/**
 * Which industry demo pack is active.
 *
 * A demo pack is a complete, self-consistent `SeedDB` written in one industry's
 * language. Packs are alternatives, never overlays: exactly one is loaded, and
 * every pack reuses the same id prefixes and the same record shapes so a bug
 * found in one pack is found in all of them.
 *
 * WIRED. `src/data/seed/index.ts` imports `activeDemoPackId()` and selects the
 * matching `SeedDB`, so setting the env var below really does change the data
 * the app loads. Only packs listed in `DEMO_PACKS` are selectable; a value
 * naming an unbuilt pack falls back to the default *and warns*, so a build can
 * never quietly demo the wrong industry.
 *
 * What this module does is resolve and validate a pack id:
 *
 * ```sh
 * # .env.local
 * VITE_DEMO_PACK=renewable
 * ```
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so pack selection is
 * intended to be a rebuild (or a dev-server restart), not a runtime toggle.
 * That is deliberate: the seed is a frozen object assembled at module load, and
 * a runtime switch would mean re-deriving every memoised selector mid-session.
 *
 * This module is intentionally *only* the resolver. It does not import any
 * seed data — importing it must never pull a pack's several thousand records
 * into a bundle that does not need them.
 */

/** Packs that are actually built and loadable today. */
export type DemoPackId = 'default' | 'renewable' | 'cloud' | 'lifesciences';

/** The env var a build reads to choose a pack. */
export const DEMO_PACK_ENV_VAR = 'VITE_DEMO_PACK';

/** Used whenever the env var is absent, empty, or not a built pack. */
/** Used whenever the env var is absent, empty, or not a built pack. */
export const DEFAULT_DEMO_PACK: DemoPackId = 'default';

export interface DemoPackMeta {
  id: DemoPackId;
  /** Short name for a pack switcher or an admin surface. */
  label: string;
  /** The vertical the record names are written in. */
  industry: string;
  /** What this pack is the right choice for, in one sentence. */
  bestFor: string;
  /** The differentiating moment the pack was built to reach quickly. */
  showcaseMoment: string;
}

/**
 * Registry of built packs. Ordered: the default first, then packs in the order
 * they were built.
 */
export const DEMO_PACKS: Readonly<Record<DemoPackId, DemoPackMeta>> = Object.freeze({
  default: {
    id: 'default',
    label: 'Consumer & enterprise technology',
    industry: 'Consumer devices, smart home and enterprise infrastructure',
    bestFor:
      'General audiences and any prospect whose marketing problems are volume and coordination rather than regulation.',
    showcaseMoment:
      'A talent licence lapses inside the expiry horizon while the asset is still embedded in live content.',
  },
  renewable: {
    id: 'renewable',
    label: 'Renewable energy',
    industry: 'Utility-scale solar and wind, residential solar and storage, grid-scale batteries',
    bestFor:
      'Energy, utilities, infrastructure, MENA prospects and sustainability-led corporates — claims substantiation and asset rights carry real regulatory weight here.',
    showcaseMoment:
      "A homeowner testimonial's filmed consent expires in six weeks while a live campaign still depends on it — consent expiry, not licence expiry, and invisible in every other tool.",
  },
  cloud: {
    id: 'cloud',
    label: 'Cloud & enterprise software',
    industry: 'Cloud infrastructure, AI/ML services, sovereign and data-residency cloud',
    bestFor:
      'Technology, SaaS, telco and any high-velocity marketing org — content volume, launch embargoes and benchmark-claim compliance are the everyday pressures here.',
    showcaseMoment:
      'An outage is declared and the platform freezes the campaign whose core claim the incident contradicts — governance and incident response proving they belong in one system.',
  },
  lifesciences: {
    id: 'lifesciences',
    label: 'Pharmaceutical & life sciences',
    industry: 'Prescription oncology, vaccines and public health, consumer OTC health',
    bestFor:
      'Pharma, medtech and any heavily regulated buyer — the pack where non-waivable approval gates and jurisdiction-specific rules are the everyday case rather than the exception.',
    showcaseMoment:
      'The safety-information block moves to a new version and the graph names every piece of content still embedding the old one — across campaigns, congress materials and HCP email.',
  },
});

/**
 * Packs named in the demo-pack specification that are not built yet. Kept as
 * data rather than prose so a pack switcher can show them as unavailable
 * instead of silently offering a value that would fall back to the default.
 *
 * Empty today, and that is the accurate state: every pack the specification
 * names — A renewable, B cloud, C life sciences — is built, assembled and
 * registered in `DEMO_PACKS` above. The array stays because `resolveDemoPackId`
 * reads it to explain a fallback, and the next spec pack should land here first.
 */
export const PLANNED_DEMO_PACKS: readonly { id: string; label: string; note: string }[] =
  Object.freeze([]);

/** Narrows an arbitrary value to a built pack id. */
export function isDemoPackId(value: unknown): value is DemoPackId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DEMO_PACKS, value);
}

/**
 * Resolves a raw env value to a built pack id.
 *
 * An unrecognised value falls back to the default *and says so*: a silent
 * fallback would leave a salesperson demoing the wrong industry to a prospect
 * without ever learning that their typo was ignored.
 */
export function resolveDemoPackId(raw: string | undefined | null): DemoPackId {
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_DEMO_PACK;
  if (isDemoPackId(trimmed)) return trimmed;

  const planned = PLANNED_DEMO_PACKS.find((p) => p.id === trimmed);
  const built = Object.keys(DEMO_PACKS).join(', ');
  console.warn(
    planned
      ? `[demoPack] ${DEMO_PACK_ENV_VAR}='${trimmed}' names a planned pack that is not built yet (${planned.note}). Falling back to '${DEFAULT_DEMO_PACK}'. Built packs: ${built}.`
      : `[demoPack] ${DEMO_PACK_ENV_VAR}='${trimmed}' is not a known pack. Falling back to '${DEFAULT_DEMO_PACK}'. Built packs: ${built}.`,
  );
  return DEFAULT_DEMO_PACK;
}

/** The pack this build is running, resolved from the environment. */
export function activeDemoPackId(): DemoPackId {
  return resolveDemoPackId(
    (import.meta.env as Record<string, string | undefined> | undefined)?.[DEMO_PACK_ENV_VAR],
  );
}

/** Metadata for the pack this build is running. */
export function activeDemoPack(): DemoPackMeta {
  return DEMO_PACKS[activeDemoPackId()];
}
