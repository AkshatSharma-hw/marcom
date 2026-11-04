import type { ReactNode } from "react";
import type {
  AIReview,
  Policy,
  ReviewFinding,
  ReviewScores,
  ReviewSpan,
} from "@/data/types";
import { cn } from "@/lib/utils";

type Severity = ReviewFinding["severity"];

/** Pastel severity chip styling — mirrors StatusBadge tones. */
const severityTone: Record<Severity, string> = {
  pass: "bg-success/10 text-success border-success/20",
  warn: "bg-warning/10 text-warning border-warning/20",
  block: "bg-destructive/10 text-destructive border-destructive/20",
};

/** In-place highlight for the offending fragment, tinted by severity. */
const markTone: Record<Severity, string> = {
  pass: "bg-success/15 text-success",
  warn: "bg-warning/20 text-warning",
  block: "bg-destructive/20 text-destructive",
};

const severityLabel: Record<Severity, string> = {
  pass: "Pass",
  warn: "Warn",
  block: "Block",
};

function SeverityChip({
  severity,
  children,
  className,
}: {
  severity: Severity;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        severityTone[severity],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Neutral chip for the rule's deterministic confidence. */
function ConfidenceChip({ confidence }: { confidence: number }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-xs font-normal tabular-nums text-muted-foreground"
      title="Deterministic confidence in this rule's match"
    >
      {Math.round(confidence * 100)}% confidence
    </span>
  );
}

/** Score band → token. Kept coarse so the meters read at a glance. */
function scoreTone(value: number): string {
  if (value >= 85) return "bg-success";
  if (value >= 60) return "bg-warning";
  return "bg-destructive";
}

function ScoreMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[6.5rem] flex-1 space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-normal text-muted-foreground">{label}</span>
        <span className="text-xs font-medium tabular-nums">{value}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", scoreTone(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ScoreMeters({ scores }: { scores: ReviewScores }) {
  return (
    <div className="flex flex-wrap gap-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <ScoreMeter label="Tone" value={scores.toneScore} />
      <ScoreMeter label="Readability" value={scores.readabilityScore} />
      <ScoreMeter label="Compliance" value={scores.complianceScore} />
    </div>
  );
}

/** Whitespace collapsed for display; slicing happens before this runs. */
function flatten(fragment: string): string {
  return fragment.replace(/\s+/g, " ");
}

/**
 * The reviewed text around a finding's span, with the offending fragment
 * marked in place. `reviewedText` is the exact string the engine scanned
 * (`${title}\n${body}`), so the offsets land on the right characters.
 */
function SpanExcerpt({
  text,
  span,
  severity,
}: {
  text: string;
  span: ReviewSpan;
  severity: Severity;
}) {
  if (span.start < 0 || span.end > text.length || span.end <= span.start) return null;
  const pad = 56;
  const from = Math.max(0, span.start - pad);
  const to = Math.min(text.length, span.end + pad);
  return (
    <p className="mt-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs font-light leading-relaxed text-muted-foreground">
      {from > 0 && "…"}
      {flatten(text.slice(from, span.start))}
      <mark className={cn("rounded-sm px-0.5 font-medium", markTone[severity])}>
        {flatten(text.slice(span.start, span.end))}
      </mark>
      {flatten(text.slice(span.end, to))}
      {to < text.length && "…"}
    </p>
  );
}

interface ReviewFindingsProps {
  review: AIReview;
  /** Policy registry used to resolve each finding's policyId to its name. */
  policies: Policy[];
  /**
   * The exact text the rule engine scanned (`${title}\n${body}`). Supply it to
   * render each finding's offending fragment highlighted in place; without it
   * the findings still read, just without the excerpt.
   */
  reviewedText?: string;
  className?: string;
}

/**
 * Renders one AIReview run: the deterministic tone / readability / compliance
 * meters, the resolved rule set (jurisdictions, locale, channel), the findings
 * grouped by policy — each with its confidence, in-place span highlight and
 * remediation line — and the approval-gate caption. Pure presentation; the
 * rule engine lives behind `aiService.reviewContent`.
 */
export function ReviewFindings({
  review,
  policies,
  reviewedText,
  className,
}: ReviewFindingsProps) {
  const counts: Record<Severity, number> = { pass: 0, warn: 0, block: 0 };
  for (const f of review.findings) counts[f.severity] += 1;
  const policyName = (policyId?: string) => policies.find((p) => p.id === policyId)?.name;

  // Group by policy, keeping the order the engine emitted the groups in.
  const groups: { policyId?: string; findings: ReviewFinding[] }[] = [];
  for (const finding of review.findings) {
    const existing = groups.find((g) => g.policyId === finding.policyId);
    if (existing) existing.findings.push(finding);
    else groups.push({ policyId: finding.policyId, findings: [finding] });
  }

  const context = review.context;
  const ruleSet = context
    ? [
        context.jurisdictionCodes.length > 0
          ? context.jurisdictionCodes.join(" · ")
          : "no jurisdiction resolved",
        context.locale,
        context.channelKind,
        context.requiredClauseIds.length > 0
          ? `${context.requiredClauseIds.length} required clause${context.requiredClauseIds.length === 1 ? "" : "s"} (${context.requiredClauseIds.join(", ")})`
          : "no mandated clauses",
      ].filter(Boolean)
    : [];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(counts) as Severity[]).map((sev) => (
          <SeverityChip key={sev} severity={sev}>
            {counts[sev]} {sev}
          </SeverityChip>
        ))}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {review.ranAt.slice(0, 16).replace("T", " ")}
        </span>
      </div>

      {review.scores && <ScoreMeters scores={review.scores} />}

      {ruleSet.length > 0 && (
        <p className="text-xs font-light text-muted-foreground">
          <span className="font-medium text-foreground">Rule set:</span>{" "}
          {ruleSet.join(" · ")}
        </p>
      )}

      <div className="space-y-3">
        {groups.map((group, gi) => {
          const name = policyName(group.policyId);
          return (
            <section key={`${group.policyId ?? "none"}-${gi}`} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.policyId ? `${group.policyId}${name ? ` · ${name}` : ""}` : "Other checks"}
              </h4>
              <ul className="space-y-2">
                {group.findings.map((f, i) => (
                  <li key={`${f.ruleId}-${i}`} className="flex items-start gap-2">
                    <SeverityChip severity={f.severity} className="mt-0.5 shrink-0">
                      {severityLabel[f.severity]}
                    </SeverityChip>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-sm font-normal">{f.message}</p>
                        <ConfidenceChip confidence={f.confidence} />
                      </div>
                      {f.span && reviewedText && (
                        <SpanExcerpt
                          text={reviewedText}
                          span={f.span}
                          severity={f.severity}
                        />
                      )}
                      {f.remediation && (
                        <p className="mt-1 text-xs font-light text-muted-foreground">
                          <span className="font-medium text-foreground">How to fix:</span>{" "}
                          {f.remediation}
                        </p>
                      )}
                      <p className="mt-1 text-xs font-light text-muted-foreground">
                        {f.ruleId}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Ran by the Brand Governance Agent · approval-gated: findings advise the
        reviewer, block-level findings hold approval
      </p>
    </div>
  );
}
