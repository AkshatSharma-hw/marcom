/**
 * Brand rulebook — the Govern-stage home for the A1 Brand Governance agent.
 *
 * Everything an agent checks against lives here, in the machine-readable form
 * the checks actually read: the brand system (identity, voice, guardrails,
 * sub-brand inheritance), the versioned legal clause library, the controlled
 * terminology list, and the brand-health readout derived from what the checks
 * have found so far.
 *
 * Five tabs:
 *  - Brand system (FR-BG-02/03/04): one card per Brand — palette swatches
 *    carrying HEX, CMYK and Pantone side by side, typography, logo, clear-space
 *    and minimum-size rules, imagery direction, voice/tone, and guardrail
 *    policies as chips. Where `parentBrandId` is set the card carries an
 *    "Inherits from {parent}" chip, lists the guardrails it picks up from the
 *    parent separately from its own, and states the override precedence.
 *  - Legal library (FR-BG-15): db.legalClauses grouped by jurisdiction, with
 *    jurisdiction and locale filters, the kind, the mandated channels, the
 *    version and effective-from date, and a "Superseded by v{n}" chip wherever
 *    a later version names this clause in its `supersedesId`. Arabic clause
 *    bodies render right-to-left in an Arabic-capable face; the chrome stays
 *    LTR English.
 *  - Terminology (FR-BG-25): the glossary — approved rendering, the renderings
 *    that must never ship (muted, struck through), locale, and the Latin
 *    transliteration where the entry is in a non-Latin script.
 *  - Validation verdict (FR-BG-12/19): the rulebook applied to one chosen
 *    content version — every check that ran with its own confidence, the
 *    offending fragments marked in place in the reviewed copy, the engine's
 *    remediation line per failure, the policies and clause versions that
 *    produced the verdict, legal failures marked non-waivable by marketing
 *    roles, and an explicit "not evaluated" for every identity rule that needs
 *    the asset file the graph does not hold. Computed live, stored nowhere.
 *  - Brand health (FR-BG-29): review pass rate (every recorded run, not a
 *    first-pass rate — a re-scan appends a fresh set without retiring the
 *    last), top failure
 *    categories ranked by finding count, open remediation items, and assets at
 *    rights risk — every figure derived from the live graph, nothing stored.
 *    "Re-scan library against current rulebook" (Brand Manager / Platform Admin)
 *    runs the same `aiService.reviewContent` rule engine the content studio
 *    uses over every Approved/Published content version and writes the results
 *    to the shared `aiReviews` collection — FR-BG-26/27 as a demonstrable
 *    action: a rulebook change surfaces as fresh findings against material that
 *    already shipped.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileWarning,
  Gavel,
  Languages,
  Palette,
  RefreshCw,
  ScanText,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { LocaleChip, LocaleText } from "@/components/marcomm/LocaleText";
import { ValidationVerdict } from "@/components/marcomm/ValidationVerdict";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getSeedDB } from "@/data/seed";
import { TODAY } from "@/data/selectors";
import type {
  AIReview,
  Asset,
  Brand,
  Content,
  ContentStatus,
  ContentVersion,
  GlossaryTerm,
  Jurisdiction,
  LegalClause,
  LegalClauseKind,
  Policy,
  SeedDB,
} from "@/data/types";
import { useLiveDB } from "@/data/useLiveDB";
import { fmtDate, fmtPct } from "@/lib/format";
import {
  DEFAULT_LOCALE,
  localeDir,
  localeName,
  localeScript,
} from "@/lib/i18n";

/**
 * Tailwind class carrying the face a locale's own script needs, or undefined
 * when the chrome face (Poppins) already covers it. Keyed on script rather
 * than direction — ja-JP is left-to-right and still needs the CJK stack.
 */
function scriptFontClass(locale: string): string | undefined {
  switch (localeScript(locale)) {
    case "arabic":
      return "font-rtl";
    case "cjk":
      return "font-cjk";
    default:
      return undefined;
  }
}
import { useRole, type AppRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { aiService, type AIReviewResult, type ReviewInput } from "@/services/ai";
import { useCollection } from "@/store/DataStore";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Roles allowed to run a library-wide re-scan (FR-BG-26). */
const RESCAN_ROLES: readonly AppRole[] = ["Brand Manager", "Platform Admin"];

/** Content states the re-scan covers — material that has already cleared review. */
const SCANNED_STATUSES: readonly ContentStatus[] = ["Approved", "Published"];

/** Rights expiring within this many days of TODAY count as at risk. */
const RIGHTS_RISK_DAYS = 30;

/** Asset states that need someone to act before the asset can be used again. */
const REMEDIATION_ASSET_STATUSES: readonly Asset["status"][] = ["Rejected", "Expired"];

/** Content state that needs someone to act before the item can move on. */
const REMEDIATION_CONTENT_STATUS: ContentStatus = "Rework";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from TODAY until an ISO date (negative = already past). */
function daysUntil(isoDate: string): number {
  return Math.round((Date.parse(isoDate) - Date.parse(TODAY)) / DAY_MS);
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

type ChipTone = "muted" | "info" | "warning" | "success" | "destructive";

const chipTone: Record<ChipTone, string> = {
  muted: "border-border bg-muted text-muted-foreground",
  info: "border-primary/20 bg-primary/10 text-primary",
  warning: "border-warning/20 bg-warning/10 text-warning",
  success: "border-success/20 bg-success/10 text-success",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
};

function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        chipTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

function EnforcementChip({ enforcement }: { enforcement: Policy["enforcement"] }) {
  return (
    <Chip tone={enforcement === "block" ? "destructive" : "warning"}>
      {enforcement === "block" ? "Blocks approval" : "Warns"}
    </Chip>
  );
}

const CLAUSE_KIND_TONE: Record<LegalClauseKind, ChipTone> = {
  disclaimer: "info",
  trademark: "muted",
  regulatory: "warning",
};

/* ------------------------------------------------------------------ */
/* Shared derivations                                                  */
/* ------------------------------------------------------------------ */

/**
 * The policy set a review runs against for one brand — the brand's own
 * guardrails plus every block-enforced policy, deduped. Same rule the content
 * studio applies, so a re-scan and a single-item check agree.
 */
function reviewPoliciesFor(db: SeedDB, brand: Brand): Policy[] {
  const ids = new Set<string>(brand.guardrailPolicyIds ?? []);
  for (const p of db.policies) if (p.enforcement === "block") ids.add(p.id);
  return db.policies.filter((p) => ids.has(p.id));
}

/**
 * The exact engine input for one content version — the joins a review needs:
 * the brand whose rulebook applies, the campaign's regions (which resolve the
 * jurisdictions), and the version's own locale. Shared by the library re-scan
 * and the validation-verdict tab so the two never disagree about what ran.
 */
function reviewInputFor(
  db: SeedDB,
  content: Content,
  version: ContentVersion,
  reviewDate: string,
): ReviewInput | undefined {
  const brand = db.brands.find((b) => b.id === content.brandId);
  if (!brand) return undefined;
  const campaign = content.campaignId
    ? db.campaigns.find((c) => c.id === content.campaignId)
    : undefined;
  const regionCodes = campaign
    ? campaign.regionIds
        .map((rid) => db.regions.find((r) => r.id === rid)?.code)
        .filter((c): c is string => Boolean(c))
    : undefined;
  return {
    title: content.title,
    body: version.body,
    brand,
    classification: content.classification,
    regionCodes,
    regionIds: campaign?.regionIds,
    locale: version.locale,
    campaignStartDate: campaign?.startDate,
    reviewDate,
  };
}

/** Next free numeric suffix in the AIR- id sequence. */
function nextReviewNumber(reviews: ReadonlyArray<{ id: string }>): number {
  let max = 0;
  for (const r of reviews) {
    const m = r.id.match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/* ------------------------------------------------------------------ */
/* Tab 1 — Brand system                                                */
/* ------------------------------------------------------------------ */

interface BrandSystem {
  brand: Brand;
  parent?: Brand;
  /** Guardrails set on the brand itself. */
  own: Policy[];
  /** Parent guardrails the brand does not restate — inherited unchanged. */
  inherited: Policy[];
  /** Guardrails set on both parent and child; the local rule takes precedence. */
  overridden: Policy[];
  /** Brands that name this brand as their parent. */
  children: Brand[];
}

function buildBrandSystems(db: SeedDB): BrandSystem[] {
  const policyById = new Map(db.policies.map((p) => [p.id, p]));
  const resolve = (ids: readonly string[] | undefined): Policy[] =>
    (ids ?? []).map((id) => policyById.get(id)).filter((p): p is Policy => Boolean(p));

  return db.brands.map((brand) => {
    const parent = brand.parentBrandId
      ? db.brands.find((b) => b.id === brand.parentBrandId)
      : undefined;
    const own = resolve(brand.guardrailPolicyIds);
    const ownIds = new Set(own.map((p) => p.id));
    const parentPolicies = resolve(parent?.guardrailPolicyIds);
    return {
      brand,
      parent,
      own,
      inherited: parentPolicies.filter((p) => !ownIds.has(p.id)),
      overridden: parentPolicies.filter((p) => ownIds.has(p.id)),
      children: db.brands.filter((b) => b.parentBrandId === brand.id),
    };
  });
}

function PaletteSwatch({
  color,
}: {
  color: { name: string; value: string; cmyk?: string; pantone?: string };
}) {
  return (
    <div className="rounded-md border p-2">
      {/* Brand DATA — the swatch fill is the brand's own colour value, not UI theming. */}
      <span
        aria-hidden
        className="block h-9 w-full rounded-sm border"
        style={{ backgroundColor: color.value }}
      />
      <div className="mt-1.5 truncate text-xs font-medium" title={color.name}>
        {color.name}
      </div>
      <dl className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
        <div className="flex items-baseline justify-between gap-2">
          <dt>HEX</dt>
          <dd className="tabular-nums uppercase">{color.value}</dd>
        </div>
        {color.cmyk && (
          <div className="flex items-baseline justify-between gap-2">
            <dt>CMYK</dt>
            <dd className="tabular-nums">{color.cmyk}</dd>
          </div>
        )}
        {color.pantone && (
          <div className="flex items-baseline justify-between gap-2">
            <dt>Pantone</dt>
            <dd className="truncate" title={color.pantone}>
              {color.pantone}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function BrandSystemCard({ system }: { system: BrandSystem }) {
  const { brand, parent, own, inherited, overridden, children } = system;
  const palette = brand.colorPalette ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{brand.name}</CardTitle>
          {parent && <Chip tone="info">Inherits from {parent.name}</Chip>}
          {children.length > 0 && (
            <Chip>
              {children.length === 1
                ? `${children[0].name} inherits from this brand`
                : `${children.length} sub-brands inherit from this brand`}
            </Chip>
          )}
        </div>
        {brand.tone && <CardDescription className="mt-1.5">{brand.tone}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Colour ------------------------------------------------------ */}
        {palette.length > 0 && (
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Colour — screen and print values
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {palette.map((c) => (
                <PaletteSwatch key={c.name} color={c} />
              ))}
            </div>
          </section>
        )}

        {/* Identity rules --------------------------------------------- */}
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Identity rules
          </h3>
          <dl className="mt-2 space-y-2.5">
            <RuleRow label="Typography" value={brand.typography} />
            <RuleRow label="Logo" value={brand.logoDescription} />
            <RuleRow label="Clear space" value={brand.clearSpaceRule} />
            <RuleRow label="Minimum size" value={brand.minSizeRule} />
            <RuleRow label="Imagery" value={brand.imageryGuidelines} />
            <RuleRow label="Voice and tone" value={brand.tone} />
          </dl>
        </section>

        {/* Guardrails -------------------------------------------------- */}
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Guardrail policies ({own.length + inherited.length})
          </h3>
          {own.length + inherited.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No guardrail policies attached to this brand.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {own.map((p) => (
                <Chip key={p.id} tone={p.enforcement === "block" ? "destructive" : "warning"}>
                  {p.name}
                  <span className="opacity-70">· {p.policyKind}</span>
                </Chip>
              ))}
              {inherited.map((p) => (
                <Chip key={p.id}>
                  {p.name}
                  <span className="opacity-70">· inherited</span>
                </Chip>
              ))}
            </div>
          )}
        </section>

        {/* Inheritance precedence (FR-BG-04) --------------------------- */}
        {parent && (
          <div className="rounded-md border bg-muted/30 p-2.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Override precedence.</span>{" "}
              {brand.name} starts from the {parent.name} rulebook.
              {overridden.length > 0 ? (
                <>
                  {" "}
                  Where both set a rule for the same policy —{" "}
                  {overridden.map((p) => p.name).join(", ")} — the {brand.name} rule wins.
                </>
              ) : (
                <> {brand.name} restates none of the parent policies, so none are overridden.</>
              )}{" "}
              {inherited.length > 0 ? (
                <>
                  Everything {brand.name} does not restate stays inherited:{" "}
                  {inherited.map((p) => p.name).join(", ")}.
                </>
              ) : (
                <>Nothing is left to inherit — {brand.name} restates the whole parent set.</>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BrandSystemTab({ db }: { db: SeedDB }) {
  const systems = useMemo(() => buildBrandSystems(db), [db]);

  if (systems.length === 0) {
    return (
      <EmptyState
        icon={Palette}
        title="No brands defined"
        hint="The rulebook renders one card per brand in the graph."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {systems.map((s) => (
        <BrandSystemCard key={s.brand.id} system={s} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2 — Legal library                                               */
/* ------------------------------------------------------------------ */

const ALL = "all";

interface ClauseGroup {
  jurisdiction: Jurisdiction;
  clauses: LegalClause[];
}

function LegalLibraryTab({ db }: { db: SeedDB }) {
  const [jurisdictionId, setJurisdictionId] = useState<string>(ALL);
  // The top-bar language scope drives this filter rather than sitting beside
  // it: two independent language controls on one screen disagree, and a global
  // control that this page ignored would be inert exactly where clause locale
  // matters most. The local select still narrows further within the page.
  const { localeId } = useScope();
  const [locale, setLocale] = useState<string>(localeId ?? ALL);
  useEffect(() => {
    setLocale(localeId ?? ALL);
  }, [localeId]);

  /** Clause id → the later version that supersedes it. */
  const supersededBy = useMemo(() => {
    const map = new Map<string, LegalClause>();
    for (const c of db.legalClauses) {
      if (c.supersedesId) map.set(c.supersedesId, c);
    }
    return map;
  }, [db.legalClauses]);

  // The active language scope is always an option, even when no clause is held
  // in it: without it the select would carry a value it has no item for and
  // render blank while silently filtering the library to nothing.
  const locales = useMemo(() => {
    const set = new Set(db.legalClauses.map((c) => c.locale));
    if (localeId) set.add(localeId);
    return [...set].sort((a, b) => a.localeCompare(b, DEFAULT_LOCALE));
  }, [db.legalClauses, localeId]);

  const filtered = useMemo(
    () =>
      db.legalClauses.filter(
        (c) =>
          (jurisdictionId === ALL || c.jurisdictionId === jurisdictionId) &&
          (locale === ALL || c.locale === locale),
      ),
    [db.legalClauses, jurisdictionId, locale],
  );

  const groups = useMemo<ClauseGroup[]>(
    () =>
      db.jurisdictions
        .map((jurisdiction) => ({
          jurisdiction,
          clauses: filtered
            .filter((c) => c.jurisdictionId === jurisdiction.id)
            .slice()
            .sort(
              (a, b) =>
                a.kind.localeCompare(b.kind, DEFAULT_LOCALE) ||
                a.locale.localeCompare(b.locale, DEFAULT_LOCALE) ||
                a.version - b.version,
            ),
        }))
        .filter((g) => g.clauses.length > 0),
    [db.jurisdictions, filtered],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label className="text-xs text-muted-foreground" htmlFor="clause-jurisdiction">
            Jurisdiction
          </label>
          <Select value={jurisdictionId} onValueChange={setJurisdictionId}>
            <SelectTrigger id="clause-jurisdiction" className="mt-1">
              <SelectValue placeholder="All jurisdictions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All jurisdictions</SelectItem>
              {db.jurisdictions.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.code} — {j.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-56">
          <label className="text-xs text-muted-foreground" htmlFor="clause-locale">
            Locale
          </label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger id="clause-locale" className="mt-1">
              <SelectValue placeholder="All locales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All locales</SelectItem>
              {locales.map((l) => (
                <SelectItem key={l} value={l}>
                  {l} — {localeName(l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="pb-2 text-xs text-muted-foreground">
          Showing <span className="tabular-nums">{filtered.length}</span> of{" "}
          <span className="tabular-nums">{db.legalClauses.length}</span> clauses across{" "}
          <span className="tabular-nums">{groups.length}</span>{" "}
          {groups.length === 1 ? "jurisdiction" : "jurisdictions"}. Clauses are superseded,
          never edited in place, so published material still resolves to the version in force
          when it shipped.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No clauses match these filters"
          hint="Widen the jurisdiction or locale filter to see the rest of the library."
        />
      ) : (
        groups.map(({ jurisdiction, clauses }) => (
          <Card key={jurisdiction.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{jurisdiction.name}</CardTitle>
                <Chip>{jurisdiction.code}</Chip>
                <Chip>
                  {clauses.length} {clauses.length === 1 ? "clause" : "clauses"}
                </Chip>
              </div>
              <CardDescription className="mt-1.5">{jurisdiction.notes}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[38%]">Clause</TableHead>
                      <TableHead>Locale</TableHead>
                      <TableHead>Channels</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Effective from</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clauses.map((clause) => {
                      const successor = supersededBy.get(clause.id);
                      return (
                        <TableRow key={clause.id}>
                          {/* Clause bodies run well past three lines — the
                              longest in the library is 13 — and the clamp is
                              what keeps the row scannable, so the full text
                              has to be reachable from the cell itself. */}
                          <TableCell className="align-top" title={clause.text}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Chip tone={CLAUSE_KIND_TONE[clause.kind]}>{clause.kind}</Chip>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {clause.id}
                              </span>
                              {clause.productCategory && (
                                <Chip>{clause.productCategory}</Chip>
                              )}
                            </div>
                            {/* Arabic clause bodies render RTL in an Arabic-capable face. */}
                            <LocaleText
                              locale={clause.locale}
                              showChip={false}
                              clamp={3}
                              className="mt-1.5"
                            >
                              {clause.text}
                            </LocaleText>
                          </TableCell>
                          <TableCell className="align-top">
                            <LocaleChip locale={clause.locale} />
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-1">
                              {clause.channelKinds.map((k) => (
                                <Chip key={k}>{k}</Chip>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="align-top tabular-nums">
                            v{clause.version}
                          </TableCell>
                          <TableCell className="align-top whitespace-nowrap tabular-nums">
                            {fmtDate(clause.effectiveFrom)}
                          </TableCell>
                          <TableCell className="align-top">
                            {successor ? (
                              <Chip tone="warning">Superseded by v{successor.version}</Chip>
                            ) : (
                              <Chip tone="success">In force</Chip>
                            )}
                            {clause.supersedesId && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Replaces {clause.supersedesId}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 3 — Terminology                                                 */
/* ------------------------------------------------------------------ */

function TerminologyTab({ db }: { db: SeedDB }) {
  const terms = useMemo<GlossaryTerm[]>(
    () =>
      db.glossaryTerms
        .slice()
        .sort(
          (a, b) => a.locale.localeCompare(b.locale, DEFAULT_LOCALE) || a.term.localeCompare(b.term, DEFAULT_LOCALE),
        ),
    [db.glossaryTerms],
  );

  const avoidCount = useMemo(
    () => terms.reduce((sum, t) => sum + t.avoid.length, 0),
    [terms],
  );

  if (terms.length === 0) {
    return (
      <EmptyState
        icon={Languages}
        title="No glossary entries"
        hint="Controlled terminology is what the terminology check reads — add entries to enforce it."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Controlled terminology</CardTitle>
        <CardDescription>
          <span className="tabular-nums">{terms.length}</span> approved{" "}
          {terms.length === 1 ? "term" : "terms"} and{" "}
          <span className="tabular-nums">{avoidCount}</span> renderings that must never ship.
          Non-Latin entries carry a transliteration so English-language reviewers can discuss
          the term without reading the script.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Approved rendering</TableHead>
                <TableHead className="w-[34%]">Never use</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Transliteration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((t) => {
                // The face follows the script, not the direction: Japanese is
                // LTR and still needs a CJK stack, or kanji render as tofu.
                const scriptFont = scriptFontClass(t.locale);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="align-top">
                      <span
                        dir={localeDir(t.locale)}
                        lang={t.locale}
                        className={cn("text-sm font-medium", scriptFont)}
                      >
                        {t.term}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <span
                        dir={localeDir(t.locale)}
                        lang={t.locale}
                        className={cn("text-sm", scriptFont)}
                      >
                        {t.approved}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-1">
                        {t.avoid.map((a) => (
                          <span
                            key={a}
                            dir={localeDir(t.locale)}
                            lang={t.locale}
                            className={cn(
                              "inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground line-through",
                              scriptFont,
                            )}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <LocaleChip locale={t.locale} />
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {t.transliteration ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 4 — Brand health                                                */
/* ------------------------------------------------------------------ */

interface FailureCategory {
  policyId: string;
  label: string;
  kind?: Policy["policyKind"];
  enforcement?: Policy["enforcement"];
  count: number;
}

interface RemediationItem {
  id: string;
  label: string;
  kind: "Content" | "Asset";
  brandName: string;
  status: string;
  to?: string;
}

interface RiskAsset {
  asset: Asset;
  brandName: string;
  days: number;
}

interface BrandHealth {
  totalReviews: number;
  passedReviews: number;
  /** Null when no review has ever run — the rate is undefined, not zero. */
  firstPassRate: number | null;
  failureCategories: FailureCategory[];
  totalFailureFindings: number;
  remediation: RemediationItem[];
  reworkCount: number;
  assetRemediationCount: number;
  riskAssets: RiskAsset[];
  scanTargetCount: number;
}

function buildBrandHealth(db: SeedDB): BrandHealth {
  const totalReviews = db.aiReviews.length;
  const passedReviews = db.aiReviews.filter((r) => r.overallSeverity === "pass").length;

  /* Top failure categories — warn/block findings grouped by the policy they cite. */
  const policyById = new Map(db.policies.map((p) => [p.id, p]));
  const counts = new Map<string, number>();
  let totalFailureFindings = 0;
  for (const review of db.aiReviews) {
    for (const f of review.findings) {
      if (f.severity === "pass") continue;
      const key = f.policyId ?? "unattributed";
      counts.set(key, (counts.get(key) ?? 0) + 1);
      totalFailureFindings += 1;
    }
  }
  const failureCategories: FailureCategory[] = [...counts.entries()]
    .map(([policyId, count]) => {
      const policy = policyById.get(policyId);
      return {
        policyId,
        label: policy?.name ?? "Findings with no policy attached",
        kind: policy?.policyKind,
        enforcement: policy?.enforcement,
        count,
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, DEFAULT_LOCALE));

  /* Open remediation — contents in rework plus rejected/expired assets. */
  const brandName = (id: string): string =>
    db.brands.find((b) => b.id === id)?.name ?? id;

  const reworkContents: Content[] = db.contents.filter(
    (c) => c.status === REMEDIATION_CONTENT_STATUS,
  );
  const remediationAssets: Asset[] = db.assets.filter((a) =>
    REMEDIATION_ASSET_STATUSES.includes(a.status),
  );

  const remediation: RemediationItem[] = [
    ...reworkContents.map((c) => ({
      id: c.id,
      label: c.title,
      kind: "Content" as const,
      brandName: brandName(c.brandId),
      status: c.status,
      to: `/content/${c.id}`,
    })),
    ...remediationAssets.map((a) => ({
      id: a.id,
      label: a.filename,
      kind: "Asset" as const,
      brandName: brandName(a.brandId),
      status: a.status,
      to: "/assets",
    })),
  ];

  /* Assets at risk — rights lapsing inside the warning window. */
  const riskAssets: RiskAsset[] = db.assets
    .filter((a) => Boolean(a.rightsExpiry))
    .map((a) => ({
      asset: a,
      brandName: brandName(a.brandId),
      days: daysUntil(a.rightsExpiry as string),
    }))
    .filter((r) => r.days >= 0 && r.days <= RIGHTS_RISK_DAYS)
    .sort((a, b) => a.days - b.days);

  /* How much material a re-scan would cover, from the same joins the scan uses. */
  const scanTargetIds = new Set(
    db.contents.filter((c) => SCANNED_STATUSES.includes(c.status)).map((c) => c.id),
  );
  const scanTargetCount = db.contentVersions.filter((v) =>
    scanTargetIds.has(v.contentId),
  ).length;

  return {
    totalReviews,
    passedReviews,
    firstPassRate: totalReviews === 0 ? null : passedReviews / totalReviews,
    failureCategories,
    totalFailureFindings,
    remediation,
    reworkCount: reworkContents.length,
    assetRemediationCount: remediationAssets.length,
    riskAssets,
    scanTargetCount,
  };
}

function BrandHealthTab({ db }: { db: SeedDB }) {
  const { role } = useRole();
  const reviewsCol = useCollection<AIReview>("aiReviews", getSeedDB().aiReviews);
  const health = useMemo(() => buildBrandHealth(db), [db]);
  const canRescan = RESCAN_ROLES.includes(role);

  /**
   * FR-BG-26/27 — run the live rule engine over every Approved/Published
   * content version and persist one AIReview per version. Ids are assigned
   * here rather than by the store, because the store derives its next id from
   * a snapshot that does not advance inside a single handler.
   */
  const handleRescan = () => {
    const now = new Date().toISOString();
    const reviewDate = now.slice(0, 10);
    const actorId =
      db.stakeholders.find((s) => s.role === role)?.id ?? db.stakeholders[0]?.id ?? "";
    let seq = nextReviewNumber(reviewsCol.records);
    let scanned = 0;
    let warn = 0;
    let block = 0;

    for (const content of db.contents) {
      if (!SCANNED_STATUSES.includes(content.status)) continue;
      const brand = db.brands.find((b) => b.id === content.brandId);
      if (!brand) continue;

      const policies = reviewPoliciesFor(db, brand);

      for (const version of db.contentVersions.filter((v) => v.contentId === content.id)) {
        const input = reviewInputFor(db, content, version, reviewDate);
        if (!input) continue;
        const result = aiService.reviewContent(input, policies, { db });
        reviewsCol.createIn({
          id: `AIR-${String(seq++).padStart(3, "0")}`,
          subjectEntity: "Content",
          subjectId: content.id,
          subjectVersionId: version.id,
          findings: result.findings,
          overallSeverity: result.overallSeverity,
          scores: result.scores,
          context: result.context,
          ranAt: now,
          ranByStakeholderId: actorId,
          createdAt: now,
          updatedAt: now,
        });
        scanned += 1;
        if (result.overallSeverity === "warn") warn += 1;
        if (result.overallSeverity === "block") block += 1;
      }
    }

    if (scanned === 0) {
      toast.info("Nothing to re-scan — no approved or published versions in the library.");
      return;
    }
    toast.success(`${scanned} scanned · ${warn} warn · ${block} block`, {
      description:
        "Every approved and published version re-checked against the current rulebook — results written to the review log.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Every figure below is derived from the live graph — review runs, content states,
          asset states and rights windows. Nothing here is a stored score.
        </p>
        {canRescan ? (
          <Button onClick={handleRescan}>
            <RefreshCw />
            Re-scan library against current rulebook
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Re-scanning the library is available to {RESCAN_ROLES.join(" and ")}.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          /* Not a first-pass rate: the denominator is every review run ever
             recorded over this library, and re-scanning appends a fresh set
             without retiring the last. The sub-line was already honest; the
             label was not. */
          label="Review pass rate"
          value={health.firstPassRate === null ? "—" : fmtPct(health.firstPassRate)}
          sub={
            health.firstPassRate === null
              ? "no reviews recorded yet"
              : `${health.passedReviews} of ${health.totalReviews} review runs passed with no warn or block finding`
          }
        />
        <KpiTile
          label="Failure findings"
          value={health.totalFailureFindings}
          sub={
            health.failureCategories.length === 0
              ? "no warn or block findings recorded"
              : `across ${health.failureCategories.length} ${health.failureCategories.length === 1 ? "policy" : "policies"}`
          }
        />
        <KpiTile
          label="Open remediation items"
          value={health.remediation.length}
          sub={`${health.reworkCount} content in rework · ${health.assetRemediationCount} assets rejected or expired`}
        />
        <KpiTile
          label="Assets at rights risk"
          value={health.riskAssets.length}
          sub={`rights lapsing within ${RIGHTS_RISK_DAYS} days of ${fmtDate(TODAY)}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Top failure categories -------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top failure categories</CardTitle>
            <CardDescription>
              Warn and block findings grouped by the policy they cite, ranked by volume.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {health.failureCategories.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No failure findings recorded"
                hint={
                  health.totalReviews === 0
                    ? "No reviews recorded yet — run a re-scan to check the library against the current rulebook."
                    : "Every recorded finding passed. Nothing to rank."
                }
              />
            ) : (
              <ol className="space-y-2.5">
                {health.failureCategories.map((cat, i) => (
                  <li key={cat.policyId}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm">
                        <span className="mr-1.5 tabular-nums text-muted-foreground">
                          {i + 1}.
                        </span>
                        {cat.label}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums">{cat.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/40"
                        style={{
                          width: `${Math.round((cat.count / health.totalFailureFindings) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {cat.policyId}
                      </span>
                      {cat.kind && <Chip>{cat.kind}</Chip>}
                      {cat.enforcement && <EnforcementChip enforcement={cat.enforcement} />}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Open remediation -------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Open remediation items</CardTitle>
            <CardDescription>
              Content returned for rework, plus assets rejected or out of rights — the work
              queue a compliance failure creates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {health.remediation.length === 0 ? (
              <EmptyState
                icon={FileWarning}
                title="Nothing open"
                hint="No content in rework and no rejected or expired assets."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {health.remediation.map((item) => (
                      <TableRow key={`${item.kind}-${item.id}`}>
                        <TableCell className="max-w-[220px]">
                          {item.to ? (
                            <Link to={item.to} className="truncate hover:underline">
                              {item.label}
                            </Link>
                          ) : (
                            <span className="truncate">{item.label}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.kind}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.brandName}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assets at risk ------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assets at rights risk</CardTitle>
          <CardDescription>
            Rights windows closing within {RIGHTS_RISK_DAYS} days of {fmtDate(TODAY)} — an
            asset whose licence lapses becomes non-compliant without anyone editing it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {health.riskAssets.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No rights lapsing in the window"
              hint={`No asset licence expires within ${RIGHTS_RISK_DAYS} days of ${fmtDate(TODAY)}.`}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rights expiry</TableHead>
                    <TableHead>Window</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {health.riskAssets.map(({ asset, brandName, days }) => (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <Link to="/assets" className="hover:underline">
                          {asset.filename}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{brandName}</TableCell>
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {fmtDate(asset.rightsExpiry as string)}
                      </TableCell>
                      <TableCell>
                        <Chip tone="warning">
                          {days === 0 ? "Expires today" : `${days} ${days === 1 ? "day" : "days"} left`}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        A re-scan covers{" "}
        <span className="tabular-nums">{health.scanTargetCount}</span>{" "}
        {health.scanTargetCount === 1 ? "version" : "versions"} of approved and published
        content and writes one review run per version, so a rulebook change shows up as fresh
        findings against material that already shipped. Findings advise the reviewer —
        block-level findings hold approval, they never auto-reject.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 5 — Validation verdict                                          */
/* ------------------------------------------------------------------ */

interface VersionOption {
  content: Content;
  version: ContentVersion;
  brand: Brand;
  policies: Policy[];
  result: AIReviewResult;
  /** ISO timestamp of the run that produced `result`. */
  ranAt: string;
  label: string;
  /** Failures whose span the reviewed text can actually support. */
  locatedFailures: number;
  blocks: number;
  warns: number;
}

/** Severity ordering shared by the option ranking and the picker chips. */
const VERDICT_RANK: Record<AIReviewResult["overallSeverity"], number> = {
  pass: 0,
  warn: 1,
  block: 2,
};

/**
 * FR-BG-12/19 — the rulebook applied to one piece. The other tabs state what
 * the rules *are*; this states what the engine *did* with them on a chosen
 * content version: every check with its own confidence, the offending
 * fragments marked in the copy, the remediation line per failure, and the
 * clause versions and policies that produced the verdict.
 *
 * The verdict is computed live rather than read from the review log —
 * `reviewContent` is a pure function, so the same version always yields the
 * same verdict, and a version nobody has re-scanned still has an answer here.
 * Persisting a run stays the re-scan's job on the Brand health tab.
 */
function ValidationVerdictTab({ db }: { db: SeedDB }) {
  /**
   * One live verdict per version, computed once per graph. The engine is a
   * pure function of its inputs, so running it across the library here costs
   * nothing in correctness and lets the picker state each version's outcome
   * before it is opened — and lets the tab open on the version the rulebook
   * has the most to say about, rather than whichever sorts first.
   */
  const options = useMemo<VersionOption[]>(() => {
    const contentById = new Map(db.contents.map((c) => [c.id, c]));
    const built: VersionOption[] = [];
    // The runs happen here, so this is when they ran — no stored review is
    // read or written by this tab.
    const ranAt = new Date().toISOString();
    for (const version of db.contentVersions) {
      const content = contentById.get(version.contentId);
      if (!content) continue;
      const brand = db.brands.find((b) => b.id === content.brandId);
      if (!brand) continue;
      const input = reviewInputFor(db, content, version, TODAY);
      if (!input) continue;
      const policies = reviewPoliciesFor(db, brand);
      const result = aiService.reviewContent(input, policies, { db });
      const textLength = `${content.title}\n${version.body}`.length;
      built.push({
        content,
        version,
        brand,
        policies,
        result,
        ranAt,
        label: `${content.title} · ${version.versionNumber} · ${version.locale}`,
        locatedFailures: result.findings.filter(
          (f) =>
            f.severity !== "pass" &&
            f.span !== undefined &&
            f.span.start >= 0 &&
            f.span.end <= textLength &&
            f.span.end > f.span.start,
        ).length,
        blocks: result.findings.filter((f) => f.severity === "block").length,
        warns: result.findings.filter((f) => f.severity === "warn").length,
      });
    }
    return built.sort(
      (a, b) =>
        a.content.title.localeCompare(b.content.title, DEFAULT_LOCALE) ||
        a.version.versionNumber.localeCompare(b.version.versionNumber, DEFAULT_LOCALE),
    );
  }, [db]);

  /** Worst verdict first, then the most annotations — the default landing. */
  const defaultOption = useMemo(
    () =>
      options
        .slice()
        .sort(
          (a, b) =>
            VERDICT_RANK[b.result.overallSeverity] - VERDICT_RANK[a.result.overallSeverity] ||
            b.blocks - a.blocks ||
            b.locatedFailures - a.locatedFailures ||
            b.warns - a.warns,
        )[0],
    [options],
  );

  const [versionId, setVersionId] = useState<string>("");
  const selected = options.find((o) => o.version.id === versionId) ?? defaultOption;

  if (options.length === 0) {
    return (
      <EmptyState
        icon={ScanText}
        title="No content versions to validate"
        hint="A verdict needs copy to run against — the engine reads a version's title and body."
      />
    );
  }

  const versionAssets: Asset[] = selected
    ? (selected.version.assetIds ?? [])
        .map((id) => db.assets.find((a) => a.id === id))
        .filter((a): a is Asset => Boolean(a))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-96 max-w-full">
          <label className="text-xs text-muted-foreground" htmlFor="verdict-version">
            Content version
          </label>
          <Select value={selected?.version.id ?? ""} onValueChange={setVersionId}>
            <SelectTrigger id="verdict-version" className="mt-1">
              <SelectValue placeholder="Choose a version" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.version.id} value={o.version.id}>
                  {o.label}
                  <span className="ml-1.5 text-muted-foreground">
                    ·{" "}
                    {o.blocks > 0
                      ? `${o.blocks} block`
                      : o.warns > 0
                        ? `${o.warns} warn`
                        : "all checks pass"}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selected && (
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            <StatusBadge status={selected.content.status} />
            <Chip>{selected.content.contentType}</Chip>
            <Chip>{selected.content.classification}</Chip>
            <Link to={`/content/${selected.content.id}`} className="text-xs hover:underline">
              Open {selected.content.id}
            </Link>
          </div>
        )}
        <p className="pb-2 text-xs text-muted-foreground">
          Every one of the <span className="tabular-nums">{options.length}</span>{" "}
          {options.length === 1 ? "version" : "versions"} in the library carries its outcome in
          the list; the tab opens on the worst verdict of the set.
        </p>
      </div>

      {!selected ? (
        <EmptyState
          icon={ScanText}
          title="No rulebook resolves for these versions"
          hint="A verdict needs the version's content record to name a brand in the graph — without one there is no rule set to run."
        />
      ) : (
        <ValidationVerdict
          title={selected.content.title}
          body={selected.version.body}
          findings={selected.result.findings}
          overallSeverity={selected.result.overallSeverity}
          scores={selected.result.scores}
          context={selected.result.context}
          policies={selected.policies}
          legalClauses={db.legalClauses}
          brand={selected.brand}
          assets={versionAssets}
          asOfDate={TODAY}
          ranAt={selected.ranAt}
          subjectLabel={`${selected.content.id} · ${selected.version.versionNumber}`}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Computed live by the same `aiService.reviewContent` engine the content studio and the
        library re-scan call — deterministic, so this version always reads the same way. This
        tab writes nothing to the review log; the Brand health tab's re-scan is what records
        runs against the library.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RulebookPage() {
  const db = useLiveDB();

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Brand rulebook"
        description="The machine-readable rules every agent checks against — one rulebook, many checks."
      />

      <Tabs defaultValue="brand-system">
        <TabsList>
          <TabsTrigger value="brand-system">
            <Palette className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Brand system
          </TabsTrigger>
          <TabsTrigger value="legal">
            <ScrollText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Legal library
          </TabsTrigger>
          <TabsTrigger value="terminology">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Terminology
          </TabsTrigger>
          <TabsTrigger value="verdict">
            <ScanText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Validation verdict
          </TabsTrigger>
          <TabsTrigger value="health">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Brand health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brand-system" className="mt-4">
          <BrandSystemTab db={db} />
        </TabsContent>

        <TabsContent value="legal" className="mt-4">
          <LegalLibraryTab db={db} />
        </TabsContent>

        <TabsContent value="terminology" className="mt-4">
          <TerminologyTab db={db} />
        </TabsContent>

        <TabsContent value="verdict" className="mt-4">
          <ValidationVerdictTab db={db} />
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <BrandHealthTab db={db} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
