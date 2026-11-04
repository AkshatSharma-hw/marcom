import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { seedBrands, seedBusinessUnits, seedRegions } from "@/data/seed/org";
import { seedContentVersions } from "@/data/seed/content";
import { SUPPORTED_LOCALES, localeName } from "@/lib/i18n";

export type BrandId = string;
export type BusinessUnitId = string;
export type RegionId = string;
/** A BCP-47 tag exactly as stored on `ContentVersion.locale`. */
export type LocaleId = string;

export interface Scope {
  /** undefined = all brands */
  brandId?: BrandId;
  /** undefined = all business units */
  businessUnitId?: BusinessUnitId;
  /** undefined = all regions */
  regionId?: RegionId;
  /** undefined = all languages */
  localeId?: LocaleId;
}

export interface ScopeContextValue extends Scope {
  setScope: (patch: Partial<Scope>) => void;
}

// Scope options derive from the seed graph — never hardcoded labels.
export const BRANDS: { id: BrandId; label: string }[] = seedBrands.map((b) => ({
  id: b.id,
  label: b.name,
}));

export const BUSINESS_UNITS: { id: BusinessUnitId; label: string }[] =
  seedBusinessUnits.map((bu) => ({ id: bu.id, label: bu.name }));

export const REGIONS: { id: RegionId; label: string }[] = seedRegions.map((r) => ({
  id: r.id,
  label: r.name,
}));

/**
 * Language options, from the two places locale is real: `SUPPORTED_LOCALES` in
 * src/lib/i18n.ts (what the app can render and localize into) and the locales
 * content is actually held in (`ContentVersion.locale`). Neither alone is
 * enough — the first would offer languages nothing is written in, the second
 * would drop a supported language the moment the seed stops using it — so the
 * options are the union, supported locales first in their declared order (the
 * source locale leads) and anything seeded beyond them appended.
 */
export const LOCALES: { id: LocaleId; label: string }[] = (() => {
  const supported = SUPPORTED_LOCALES.map((l) => l.code);
  const seeded = [...new Set(seedContentVersions.map((v) => v.locale))];
  const extra = seeded
    .filter((code) => !supported.includes(code))
    .sort((a, b) => a.localeCompare(b, "en-US"));
  return [...supported, ...extra].map((code) => ({
    id: code,
    // localeName falls back to the raw tag, so an unlisted seeded locale still
    // reads as itself rather than being silently relabelled.
    label: localeName(code),
  }));
})();

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<Scope>({});

  const setScope = useCallback((patch: Partial<Scope>) => {
    setScopeState((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<ScopeContextValue>(
    () => ({ ...scope, setScope }),
    [scope, setScope],
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error("useScope must be used within a ScopeProvider");
  }
  return ctx;
}
