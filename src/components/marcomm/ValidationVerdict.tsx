/**
 * Validation verdict — what the rulebook actually *did* to one reviewed
 * content version.
 *
 * The Brand rulebook states the rules; this states the outcome of running
 * them, at the granularity a reviewer can argue with:
 *
 *  (a) every check that ran, pass / warn / block, each carrying its own
 *      deterministic confidence — rendered by the existing `ReviewFindings`,
 *      which this composes rather than replaces;
 *  (b) the reviewed copy itself with every locatable failure marked in place,
 *      from `ReviewFinding.span` offsets into `${title}\n${body}` — the exact
 *      string the engine scanned. Overlapping and adjacent spans are segmented
 *      at their boundaries so the text is never duplicated or lost, and
 *      findings the engine could not locate are listed under the copy instead
 *      of being dropped;
 *  (c) the engine's own remediation line per failure — never a bare rule id;
 *  (d) the rule set that produced the verdict: policies in force with their
 *      enforcement, the mandated legal clauses *at the version in force on the
 *      as-of date*, and the jurisdiction / locale / channel from ReviewContext;
 *  (e) legal and regulatory failures separated out and marked non-waivable by
 *      marketing roles — the same GR-07 rule GovernancePage enforces on the
 *      waiver dialog, restated where the failure is first seen.
 *
 * Honesty boundary: the engine is text-only. It reads `${title}\n${body}` and
 * the reference libraries — it never opens an asset, because the graph holds a
 * filename, media type and rights window, not the file. Every identity rule
 * that needs pixels (logo clear space, minimum size, palette conformance,
 * imagery direction, typography rendering) is therefore reported as *not
 * evaluated*, in the same shape the engine uses when a reference library is
 * missing. None of them is ever shown as passing.
 */

import { useMemo, type ReactNode } from "react";
import { FileWarning, Image as ImageIcon, Scale, ScrollText } from "lucide-react";

import { ReviewFindings } from "@/components/marcomm/ReviewFindings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AIReview,
  Asset,
  Brand,
  LegalClause,
  Policy,
  ReviewContext,
  ReviewFinding,
  ReviewScores,
} from "@/data/types";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Severity = ReviewFinding["severity"];

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const severityTone: Record<Severity, string> = {
  pass: "border-success/20 bg-success/10 text-success",
  warn: "border-warning/20 bg-warning/10 text-warning",
  block: "border-destructive/20 bg-destructive/10 text-destructive",
};

/** In-place highlight for an offending fragment, tinted by severity. */
const markTone: Record<Severity, string> = {
  pass: "bg-success/15 text-success ring-success/30",
  warn: "bg-warning/20 text-warning ring-warning/30",
  block: "bg-destructive/20 text-destructive ring-destructive/40",
};

const severityLabel: Record<Severity, string> = {
  pass: "Pass",
  warn: "Warn",
  block: "Block",
};

const severityRank: Record<Severity, number> = { pass: 0, warn: 1, block: 2 };

/** Policy kinds a marketing role may never waive — GR-07, as GovernancePage. */
const NON_WAIVABLE_KINDS: ReadonlyArray<Policy["policyKind"]> = ["legal", "regulatory"];

/**
 * Restated from GovernancePage's waiver gate so the reviewer meets the rule
 * where the failure appears, not only when they try to waive it.
 */
const NON_WAIVABLE_NOTICE =
  "Legal and regulatory findings cannot be waived by marketing roles. Only a Legal/Compliance Reviewer or Platform Admin can sign an exception — route it to Legal/Compliance from Governance → Exceptions.";

function Chip({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SeverityChip({ severity, className }: { severity: Severity; className?: string }) {
  return <Chip className={cn(severityTone[severity], className)}>{severityLabel[severity]}</Chip>;
}

/* ------------------------------------------------------------------ */
/* (b) Annotation — spans marked in the reviewed copy                  */
/* ------------------------------------------------------------------ */

interface Segment {
  start: number;
  end: number;
  /** Findings whose span covers this segment; empty for untouched copy. */
  covering: ReviewFinding[];
}

/**
 * Cut the reviewed text at every span boundary, so overlapping and adjacent
 * spans each land on their own segment and the concatenation of all segments
 * is byte-for-byte the original text. Spans outside the text, or inverted, are
 * ignored — a finding with a span the text cannot support is treated as
 * unlocatable rather than silently shifting the copy.
 */
function segmentBySpans(text: string, findings: readonly ReviewFinding[]): Segment[] {
  const located = findings.filter(
    (f) =>
      f.span !== undefined &&
      f.span.start >= 0 &&
      f.span.end <= text.length &&
      f.span.end > f.span.start,
  );
  if (located.length === 0) return [{ start: 0, end: text.length, covering: [] }];

  const cuts = new Set<number>([0, text.length]);
  for (const f of located) {
    cuts.add(f.span!.start);
    cuts.add(f.span!.end);
  }
  const bounds = [...cuts].sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const start = bounds[i];
    const end = bounds[i + 1];
    if (end <= start) continue;
    segments.push({
      start,
      end,
      covering: located.filter((f) => f.span!.start <= start && f.span!.end >= end),
    });
  }
  return segments;
}

/** True when the finding has a span this text can actually support. */
function isLocatable(text: string, f: ReviewFinding): boolean {
  return (
    f.span !== undefined &&
    f.span.start >= 0 &&
    f.span.end <= text.length &&
    f.span.end > f.span.start
  );
}

function worstSeverity(findings: readonly ReviewFinding[]): Severity {
  return findings.reduce<Severity>(
    (worst, f) => (severityRank[f.severity] > severityRank[worst] ? f.severity : worst),
    "pass",
  );
}

function AnnotatedCopy({ text, findings }: { text: string; findings: readonly ReviewFinding[] }) {
  const segments = useMemo(() => segmentBySpans(text, findings), [text, findings]);

  return (
    <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm font-light leading-relaxed">
      {segments.map((seg) => {
        const fragment = text.slice(seg.start, seg.end);
        if (seg.covering.length === 0) {
          return <span key={seg.start}>{fragment}</span>;
        }
        const severity = worstSeverity(seg.covering);
        return (
          <mark
            key={seg.start}
            // Adjacent spans keep their own ring, so two failures that touch
            // still read as two marks rather than one long highlight.
            className={cn(
              "rounded-sm px-0.5 font-normal ring-1 ring-inset",
              markTone[severity],
            )}
            title={seg.covering.map((f) => `${severityLabel[f.severity]} · ${f.message}`).join("\n")}
          >
            {fragment}
          </mark>
        );
      })}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Visual checks — declared not evaluated, never passed                */
/* ------------------------------------------------------------------ */

interface VisualCheck {
  label: string;
  rule: string;
}

function visualChecksFor(brand: Brand): VisualCheck[] {
  const checks: VisualCheck[] = [];
  if (brand.clearSpaceRule) checks.push({ label: "Logo clear space", rule: brand.clearSpaceRule });
  if (brand.minSizeRule) checks.push({ label: "Minimum size", rule: brand.minSizeRule });
  if (brand.logoDescription) checks.push({ label: "Logo lock-up", rule: brand.logoDescription });
  if ((brand.colorPalette ?? []).length > 0) {
    checks.push({
      label: "Palette conformance",
      rule: `${brand.colorPalette!.length} approved colours with HEX, CMYK and Pantone values`,
    });
  }
  if (brand.imageryGuidelines) checks.push({ label: "Imagery direction", rule: brand.imageryGuidelines });
  if (brand.typography) checks.push({ label: "Typography rendering", rule: brand.typography });
  return checks;
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface ValidationVerdictProps {
  /** Title of the reviewed content — the first line of the scanned text. */
  title: string;
  /** Body of the reviewed version — everything after the first newline. */
  body: string;
  findings: ReviewFinding[];
  overallSeverity: Severity;
  scores: ReviewScores;
  context: ReviewContext;
  /** The policy set the run was given — resolves policyId to name and kind. */
  policies: Policy[];
  /** Clause library, to resolve `context.requiredClauseIds` to their versions. */
  legalClauses: LegalClause[];
  /** Brand whose identity rules the text-only engine cannot check. */
  brand: Brand;
  /** Assets this version embeds — filename only; the graph holds no file. */
  assets: Asset[];
  /** ISO date the run resolved clause currency against. */
  asOfDate: string;
  /** ISO timestamp of this run — it happened when the screen computed it. */
  ranAt: string;
  /** Readable identity of the reviewed version, e.g. 'CNT-001 · V2'. */
  subjectLabel: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ValidationVerdict({
  title,
  body,
  findings,
  overallSeverity,
  scores,
  context,
  policies,
  legalClauses,
  brand,
  assets,
  asOfDate,
  ranAt,
  subjectLabel,
  className,
}: ValidationVerdictProps) {
  /** Exactly the string the engine scanned — spans index into this. */
  const reviewedText = `${title}\n${body}`;

  const policyById = useMemo(() => new Map(policies.map((p) => [p.id, p])), [policies]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { pass: 0, warn: 0, block: 0 };
    for (const f of findings) c[f.severity] += 1;
    return c;
  }, [findings]);

  /** Failures the engine could not point at — listed, never dropped. */
  const unlocatedFailures = useMemo(
    () => findings.filter((f) => f.severity !== "pass" && !isLocatable(reviewedText, f)),
    [findings, reviewedText],
  );
  const locatedFailures = useMemo(
    () => findings.filter((f) => f.severity !== "pass" && isLocatable(reviewedText, f)),
    [findings, reviewedText],
  );

  /** (e) GR-07 — legal and regulatory failures, non-waivable by marketing. */
  const nonWaivable = useMemo(
    () =>
      findings.filter((f) => {
        if (f.severity === "pass") return false;
        const kind = f.policyId ? policyById.get(f.policyId)?.policyKind : undefined;
        return kind !== undefined && NON_WAIVABLE_KINDS.includes(kind);
      }),
    [findings, policyById],
  );

  /** (d) Clause versions the run required, at the version in force as-of. */
  const clausesInForce = useMemo(
    () =>
      context.requiredClauseIds
        .map((id) => legalClauses.find((c) => c.id === id))
        .filter((c): c is LegalClause => Boolean(c)),
    [context.requiredClauseIds, legalClauses],
  );

  const visualChecks = useMemo(() => visualChecksFor(brand), [brand]);

  /**
   * ReviewFindings takes a run record; this run is live, not stored, so the
   * record is assembled here from the engine's own return value. The id names
   * it as a live verdict rather than borrowing an AIR- id that was never
   * written to the review log.
   */
  const review: AIReview = {
    id: `live-verdict:${subjectLabel}`,
    subjectEntity: "Content",
    subjectId: subjectLabel,
    findings,
    overallSeverity,
    scores,
    context,
    ranAt,
    ranByStakeholderId: "",
    createdAt: ranAt,
    updatedAt: ranAt,
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Verdict headline ------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Verdict — {subjectLabel}</CardTitle>
            <SeverityChip severity={overallSeverity} />
            <Chip className={severityTone.block}>{counts.block} block</Chip>
            <Chip className={severityTone.warn}>{counts.warn} warn</Chip>
            <Chip className={severityTone.pass}>{counts.pass} pass</Chip>
          </div>
          <CardDescription className="mt-1.5">
            {findings.length} {findings.length === 1 ? "check" : "checks"} ran against this
            version — {locatedFailures.length} failure
            {locatedFailures.length === 1 ? "" : "s"} located in the copy,{" "}
            {unlocatedFailures.length}{" "}
            {unlocatedFailures.length === 1 ? "that applies" : "that apply"} to the piece as a
            whole. Computed live from the rule engine as of {fmtDate(asOfDate)}; nothing on
            this screen is stored.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* (d) Which rule set produced the verdict ------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rule set that produced this verdict</CardTitle>
          <CardDescription>
            Resolved by the run itself — the jurisdictions the content's regions map to, the
            locale it was read as, the policies handed to the engine, and the clause versions in
            force on {fmtDate(asOfDate)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Jurisdictions</dt>
              <dd className="mt-0.5 text-sm">
                {context.jurisdictionCodes.length > 0
                  ? context.jurisdictionCodes.join(" · ")
                  : "No jurisdiction resolved"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Locale read as</dt>
              <dd className="mt-0.5 text-sm">{context.locale}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Channel</dt>
              <dd className="mt-0.5 text-sm">
                {context.channelKind ?? "No channel resolved for this version"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Brand rulebook</dt>
              <dd className="mt-0.5 text-sm">{brand.name}</dd>
            </div>
          </dl>

          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Policies in force ({policies.length})
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {policies.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No policies were handed to this run — every rule group stayed unevaluated.
                </p>
              ) : (
                policies.map((p) => (
                  <Chip
                    key={p.id}
                    title={p.ruleText}
                    className={
                      p.enforcement === "block"
                        ? severityTone.block
                        : severityTone.warn
                    }
                  >
                    {p.id} · {p.name}
                    <span className="opacity-70">
                      · {p.policyKind} · {p.enforcement === "block" ? "blocks approval" : "warns"}
                    </span>
                  </Chip>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
              Clause versions this run required ({clausesInForce.length})
            </h4>
            {clausesInForce.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                No clause is mandated for this jurisdiction, locale and channel combination, so
                the clause checks had nothing to require.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {clausesInForce.map((c) => (
                  <Chip key={c.id} title={c.text}>
                    {c.id} · v{c.version} · {c.kind}
                    <span className="opacity-70">· effective {fmtDate(c.effectiveFrom)}</span>
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* (e) Legal and regulatory failures — non-waivable ---------------- */}
      {nonWaivable.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Scale className="h-4 w-4 text-destructive" aria-hidden="true" />
              <CardTitle className="text-base text-destructive">
                Legal and regulatory failures ({nonWaivable.length})
              </CardTitle>
              <Chip className={severityTone.block}>Non-waivable by marketing roles</Chip>
            </div>
            <CardDescription className="mt-1.5">{NON_WAIVABLE_NOTICE}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {nonWaivable.map((f, i) => {
                const policy = f.policyId ? policyById.get(f.policyId) : undefined;
                return (
                  <li
                    key={`${f.ruleId}-${i}`}
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityChip severity={f.severity} />
                      <span className="text-sm">{f.message}</span>
                    </div>
                    {f.remediation && (
                      <p className="mt-1 text-xs font-light text-muted-foreground">
                        <span className="font-medium text-foreground">How to fix:</span>{" "}
                        {f.remediation}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {policy ? `${policy.id} · ${policy.name} · ${policy.policyKind}` : "no policy attached"}
                      {" · "}
                      {Math.round(f.confidence * 100)}% confidence · {f.ruleId}
                    </p>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* (b) The annotation --------------------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reviewed copy, annotated</CardTitle>
          <CardDescription>
            The exact string the engine scanned — the title, then the version body. Every
            fragment a check could locate is marked where it occurs; hover a mark for the rule
            that objected. Overlapping marks take the more severe colour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Marks:</span>
            <Chip className={severityTone.block}>Block — holds approval</Chip>
            <Chip className={severityTone.warn}>Warn — reviewer judgement</Chip>
            <Chip>
              {reviewedText.length} characters scanned · {locatedFailures.length} marked
            </Chip>
          </div>

          <AnnotatedCopy text={reviewedText} findings={findings} />

          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />
              Failures with no location in the copy ({unlocatedFailures.length})
            </h4>
            {unlocatedFailures.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Every failure this run raised is marked in the copy above.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {unlocatedFailures.map((f, i) => {
                  const policy = f.policyId ? policyById.get(f.policyId) : undefined;
                  return (
                    <li key={`${f.ruleId}-${i}`} className="flex items-start gap-2">
                      <SeverityChip severity={f.severity} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{f.message}</p>
                        {f.remediation && (
                          <p className="mt-0.5 text-xs font-light text-muted-foreground">
                            <span className="font-medium text-foreground">How to fix:</span>{" "}
                            {f.remediation}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {policy ? `${policy.id} · ${policy.name}` : "no policy attached"} ·{" "}
                          {Math.round(f.confidence * 100)}% confidence · {f.ruleId}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              A missing clause or an absent disclaimer has no offending fragment to point at —
              the failure is the absence, so it is reported against the piece as a whole.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* (a) + (c) Per-check results — the existing findings renderer ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Every check that ran</CardTitle>
          <CardDescription>
            Grouped by the policy that produced it, each with its own deterministic confidence
            and the engine's remediation line. Passes are listed too — a check that ran and
            found nothing is evidence, not silence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewFindings review={review} policies={policies} reviewedText={reviewedText} />
        </CardContent>
      </Card>

      {/* Honesty — visual checks are not evaluated ----------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Visual checks — not evaluated</CardTitle>
            <Chip>Text-only engine</Chip>
          </div>
          <CardDescription className="mt-1.5">
            The rule engine reads {reviewedText.length} characters of copy and the reference
            libraries. It never opens an asset: the graph holds a filename, media type and
            rights window, not the file. The identity rules below therefore have no verdict —
            they are not passing, they are unchecked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visualChecks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {brand.name} documents no logo, clear-space, size, palette, imagery or typography
              rule, so there is nothing a visual check would evaluate even with the file.
            </p>
          ) : (
            <ul className="space-y-2">
              {visualChecks.map((check) => (
                <li key={check.label} className="flex items-start gap-2">
                  <Chip className="mt-0.5 shrink-0">Not evaluated</Chip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {check.label} not evaluated — no asset file is supplied to the run.
                    </p>
                    <p className="mt-0.5 text-xs font-light text-muted-foreground">
                      Rule on file: {check.rule}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-md border bg-muted/30 p-2.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                What would fill this: the asset files.
              </span>{" "}
              {assets.length === 0 ? (
                <>
                  This version embeds no assets, so there is no candidate file to check either
                  way.
                </>
              ) : (
                <>
                  This version embeds {assets.length}{" "}
                  {assets.length === 1 ? "asset" : "assets"} — {" "}
                  {assets.map((a) => `${a.filename} (${a.mediaType})`).join(", ")} — recorded by
                  name only. Rendering the logo clear-space or palette verdict on them needs the
                  file itself plus an image-capable check; neither is present, so no result is
                  claimed.
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
