import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  FileText,
  Gauge,
  Globe,
  Languages,
  Layers,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useLiveDB } from "@/data/useLiveDB";
import { getSeedDB } from "@/data/seed";
import type {
  AgentRun,
  AIReview,
  ChannelKind,
  Content,
  ContentProvenance,
  ContentVersion,
  ProvenanceSource,
  ReviewScores,
} from "@/data/types";
import { originOf, versionOrigin } from "@/data/selectors/originSelectors";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { useCollection } from "@/store/DataStore";
import { aiService, asyncAIService, contentParagraphs } from "@/services/ai";
import type { ContentVariant, CreativeBrief, ReviewInput } from "@/services/ai";
import { useRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { fmtDate } from "@/lib/format";
import { lifecycleStageFor } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LOCALE,
  TARGET_LOCALES,
  formatDateWithCalendarHint,
  isRtl,
  localeMeta,
  localeName,
  localeScript,
} from "@/lib/i18n";
import { LocaleChip, LocaleText } from "@/components/marcomm/LocaleText";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { ReviewFindings } from "@/components/marcomm/ReviewFindings";
import { LifecycleStepper } from "@/components/marcomm/LifecycleStepper";
import { RelationshipChips } from "@/components/marcomm/RelationshipChips";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { AgentActivityRail } from "@/components/marcomm/AgentActivityRail";
import { BRAND_GUARDRAIL_RULE_SET } from "@/components/marcomm/AgentTrace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

/* Target locales (now including ar-SA) and the source locale both come from
   src/lib/i18n.ts, so the dialog and the locale grouping can never drift. */

/** Next draft-fork version number: V1 → V1.1, V1.1 → V1.2, V2 → V2.1. */
function nextDraftVersion(versions: ContentVersion[]): string {
  let major = 1;
  let minor = 0;
  let found = false;
  for (const v of versions) {
    const m = v.versionNumber.match(/^V(\d+)(?:\.(\d+))?$/);
    if (!m) continue;
    const maj = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (!found || maj > major || (maj === major && min > minor)) {
      major = maj;
      minor = min;
      found = true;
    }
  }
  return found ? `V${major}.${minor + 1}` : "V1";
}

/**
 * Placeholder body for a simulated transcreation.
 *
 * Locales whose script Poppins cannot render — Arabic and CJK — get a
 * placeholder written in that script, so the resulting version genuinely
 * exercises direction and font handling instead of showing right-aligned or
 * tofu-rendered English. Latin-script targets keep the tagged English draft,
 * which is honest about being untranslated.
 */
function localizedPlaceholder(
  locale: string,
  sourceTitle: string,
  draftBody: string,
): string {
  switch (localeScript(locale)) {
    case "arabic":
      return `مسودة مترجمة (محاكاة) إلى ${locale} — تمر عبر مسار الموافقات القياسي مثل أي نسخة أخرى. النص المصدر: «${sourceTitle}».`;
    case "cjk":
      return `${locale} への翻訳ドラフト（シミュレーション）— 他のバージョンと同様に、標準の承認フローを通ります。原文：「${sourceTitle}」。`;
    default:
      return `[Simulated transcreation to ${locale}] ${draftBody}`;
  }
}

/** The generator recorded on every AI-produced version (FR-CS-12). */
const GENERATOR = "simulated-ai · deterministic";

/**
 * The agent whose ledger a row-level quality review is recorded against. A1
 * owns brand and compliance review over content versions (see its capability
 * list in `seed/module.ts`), which is exactly what the rule engine runs here.
 */
const QUALITY_REVIEW_AGENT_ID = "AGT-A1";

/**
 * Per-version state of a quality review started from the version history.
 *
 * The run itself is persisted as an `AgentRun`; this is only what the row shows
 * while and after it runs. No timers and no synthetic latency: the seam
 * resolves as soon as the deterministic engine returns, so `running` is usually
 * a single frame — it is a real state, not a progress theatre.
 */
type QualityRunState =
  | { phase: "running"; runId: string }
  | {
      phase: "done";
      runId: string;
      reviewId: string;
      severity: "pass" | "warn" | "block";
      blocks: number;
      warns: number;
      checks: number;
      scores: ReviewScores;
    }
  | { phase: "error"; runId: string; message: string };

/** How each provenance source reads in the version history. */
const PROVENANCE_LABEL: Record<ProvenanceSource, string> = {
  "ai-draft": "AI draft",
  variant: "AI variant",
  refinement: "AI refinement",
  localization: "AI localization",
  manual: "Authored",
};

/**
 * Provenance for a row that predates the field: `aiGenerated` is all those
 * versions ever recorded, so it is all we may claim for them (FR-CS-12).
 */
function provenanceOf(version: ContentVersion): ContentProvenance {
  return (
    version.provenance ?? {
      source: version.aiGenerated ? "ai-draft" : "manual",
      ...(version.aiGenerated
        ? { basis: "Recorded before provenance capture — generator and basis unknown." }
        : {}),
    }
  );
}

/**
 * The constraint chip on a variant card (FR-CS-06).
 *
 * `overBy` is measured on the composed copy, before the generator truncates it,
 * while the character count beside this chip is the body as it now stands. "Over
 * by 70 chars" next to "280 chars" read as a contradiction; when the body was
 * cut, the chip says it was cut.
 */
function constraintChip(variant: ContentVariant): { label: string; over: boolean } {
  if (variant.withinConstraints) return { label: "Within limits", over: false };
  if (variant.overBy > 0)
    return {
      label: variant.truncated
        ? `Trimmed by ${variant.overBy} chars`
        : `Over by ${variant.overBy} chars`,
      over: true,
    };
  return { label: "Outside limits", over: true };
}

/** The creative brief as a plain-text block, for the clipboard. */
function briefToText(title: string, brief: CreativeBrief): string {
  return [
    `Creative brief — ${title}`,
    "",
    "Objective",
    brief.objective,
    "",
    "Audience",
    brief.audience,
    "",
    "Deliverables",
    ...brief.deliverables.map((d) => `- ${d.format}: ${d.spec}`),
    "",
    "Mandatories",
    ...brief.mandatories.map((m) => `- ${m}`),
  ].join("\n");
}

/**
 * The inline result of a row-level quality review — running, the verdict, or
 * the real failure with a way to try again. Every figure comes off the run's
 * own result; nothing is shown before there is something to show.
 */
function QualityRunLine({
  state,
  onRetry,
}: {
  state?: QualityRunState;
  onRetry: () => void;
}) {
  if (!state) return null;

  if (state.phase === "running") {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Quality review running as{" "}
        <span className="tabular-nums">{state.runId}</span> — the rule engine is
        evaluating this version.
      </p>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-2">
        <p className="text-xs text-destructive">
          <span className="font-medium">
            Quality review <span className="tabular-nums">{state.runId}</span> failed.
          </span>{" "}
          {state.message}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 px-2 text-xs"
          onClick={onRetry}
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={
            state.severity === "block"
              ? "blocked"
              : state.severity === "warn"
                ? "in review"
                : "on track"
          }
        >
          {state.severity === "block"
            ? "Blocked by policy"
            : state.severity === "warn"
              ? "Findings for a reviewer"
              : "All checks passed"}
        </StatusBadge>
        <span className="tabular-nums text-muted-foreground">
          {state.blocks} block · {state.warns} warn · {state.checks} checks
        </span>
      </div>
      <p className="mt-1 tabular-nums text-muted-foreground">
        Tone {state.scores.toneScore} · readability {state.scores.readabilityScore} ·
        compliance {state.scores.complianceScore} out of 100. Recorded as{" "}
        {state.reviewId} by run {state.runId}.
      </p>
    </div>
  );
}

/**
 * A review that was persisted against this version in an earlier session.
 *
 * The card at the top of the page only renders reviews of the *current*
 * version, and the inline verdict above is component state — so a review of an
 * older version survived a reload in the store with nothing on the page reading
 * it. This is that record, on the row it actually ran against.
 */
function PersistedReviewLine({ review }: { review: AIReview }) {
  const blocks = review.findings.filter((f) => f.severity === "block").length;
  const warns = review.findings.filter((f) => f.severity === "warn").length;
  return (
    <div className="mt-2 rounded-md border border-border bg-muted/40 px-2.5 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          status={
            review.overallSeverity === "block"
              ? "blocked"
              : review.overallSeverity === "warn"
                ? "in review"
                : "on track"
          }
        >
          {review.overallSeverity === "block"
            ? "Blocked by policy"
            : review.overallSeverity === "warn"
              ? "Findings for a reviewer"
              : "All checks passed"}
        </StatusBadge>
        <span className="tabular-nums text-muted-foreground">
          {blocks} block · {warns} warn · {review.findings.length} checks
        </span>
      </div>
      <p className="mt-1 tabular-nums text-muted-foreground">
        Tone {review.scores.toneScore} · readability {review.scores.readabilityScore} ·
        compliance {review.scores.complianceScore} out of 100. Recorded as {review.id} on{" "}
        {fmtDate(review.ranAt)}.
      </p>
    </div>
  );
}

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  // Live read-side view (contents, approvals, contentVersions, …); the
  // versions collection handle below is kept for writes only — same
  // "contentVersions" id, so created drafts appear in db.contentVersions.
  const db = useLiveDB();
  const content = db.contents.find((c) => c.id === id);
  const versionsCol = useCollection<ContentVersion>(
    "contentVersions",
    getSeedDB().contentVersions,
  );
  const contentsCol = useCollection<Content>("contents", getSeedDB().contents);
  const reviewsCol = useCollection<AIReview>("aiReviews", getSeedDB().aiReviews);
  // The agent execution ledger — row-level reviews are recorded here, and the
  // activity rail reads the same collection back.
  const runsCol = useCollection<AgentRun>("agentRuns", getSeedDB().agentRuns);
  const { role } = useRole();
  // The top bar's language scope. Locale lives on the versions, so it narrows
  // the version history rather than hiding the record itself — a content item
  // is one record whatever languages it is written in.
  const { localeId } = useScope();
  // Agency users only see content on their agency's assigned campaigns
  // (blueprint hard scoping) — an out-of-scope id reads as not found.
  const agencyScope = agencyScopeForRole(db, role);
  const [localizeOpen, setLocalizeOpen] = useState(false);
  const [targetLocale, setTargetLocale] = useState<string>("");
  const [targetRegionId, setTargetRegionId] = useState<string>("");
  // Variant deck (FR-CS-02/06/08) — regenerated on demand, never persisted
  // until the writer saves one as a version.
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [pickedPersonas, setPickedPersonas] = useState<string[]>([]);
  const [pickedChannels, setPickedChannels] = useState<string[]>([]);
  const [variants, setVariants] = useState<ContentVariant[]>([]);
  // Refinement (FR-CS-09).
  const [refineOpen, setRefineOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [preserved, setPreserved] = useState<string[]>([]);
  // Creative brief (FR-CS-10).
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  // Row-level quality reviews, keyed by version id.
  const [qualityRuns, setQualityRuns] = useState<Record<string, QualityRunState>>({});

  /* These three dialogs stay mounted, so closing one without submitting used to
     leave its form filled: reopening Refine showed the previous feedback text
     and preserved-paragraph ticks — which belonged to whatever version was
     current when they were made — and Localize reopened on the last target
     locale. Reset on close, the way the creative-brief dialog already does. */
  const changeVariantsOpen = (open: boolean): void => {
    setVariantsOpen(open);
    if (!open) {
      setPickedPersonas([]);
      setPickedChannels([]);
    }
  };
  const changeRefineOpen = (open: boolean): void => {
    setRefineOpen(open);
    if (!open) {
      setFeedback("");
      setPreserved([]);
    }
  };
  const changeLocalizeOpen = (open: boolean): void => {
    setLocalizeOpen(open);
    if (!open) {
      setTargetLocale("");
      setTargetRegionId("");
    }
  };

  if (!content || (agencyScope && !agencyScope.contentIds.has(content.id))) {
    return (
      <div className="p-6">
        <EmptyState
          icon={FileText}
          title="Content not found"
          hint={
            agencyScope
              ? `No content item with id '${id ?? ""}' is visible to ${agencyScope.agencyName ?? "your agency"} — agency access is limited to content on assigned campaigns, so an unassigned item reads as missing.`
              : `No content item with id '${id ?? ""}' exists. It may have been discarded, or the link may be stale.`
          }
          actionSlot={
            <Button asChild size="sm" variant="outline">
              <Link to="/content">Back to content studio</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const brand = db.brands.find((b) => b.id === content.brandId);
  const campaign = content.campaignId
    ? db.campaigns.find((c) => c.id === content.campaignId)
    : undefined;
  /* The brief this content works from — its state is the precondition the
     "no versions yet" empty state has to name (item 8). */
  const linkedBrief = content.briefId
    ? db.briefs.find((b) => b.id === content.briefId)
    : undefined;

  /* Origin resolves through the version provenance chain: the most recent
     version's provenance is what makes this record agent-proposed or authored
     (item 1). Seeded versions carry no provenance and so read as authored —
     the chip appears once a generated version is saved. */
  const contentOrigin = originOf(db, "Content", content.id);
  const contentBlocker = blockerFor(db, "Content", content.id, content.status);

  const versions = db.contentVersions
    .filter((v) => v.contentId === content.id)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt, DEFAULT_LOCALE));

  /** The version the check runs against — current pointer, else latest. */
  const currentVersion =
    versions.find((v) => v.id === content.currentVersionId) ?? versions[0];

  /* The version history honours the top bar's language scope. Only the list
     is narrowed: numbering, the current-version pointer, provenance lookups
     and the localization coverage panel all keep reading the full set, because
     a filtered view of the history must not change what the next version is
     called or make a parent version look like it never existed. */
  const visibleVersions = localeId
    ? versions.filter((v) => v.locale === localeId)
    : versions;
  const versionsHiddenByLocale = versions.length - visibleVersions.length;

  /* Agent runs are recorded against the version they actually ran on, so the
     activity rail is told which versions belong to this content item rather
     than being left to guess that the parent was the subject. */
  const versionSubjects = versions.map((v) => ({
    entity: "ContentVersion" as const,
    id: v.id,
    label: v.versionNumber,
  }));

  /**
   * Record a newly created version on the content record itself.
   *
   * A fork written in the same language becomes the current version. Everything
   * else in the model reads `currentVersionId` as "the latest version of this
   * item" — the seed invariant is that it points at the highest version number
   * (SEED_MANIFEST §coherence 5), and the resolver right above falls back to the
   * newest version when the pointer is missing. Leaving it on the parent meant
   * the "Current" badge, "Refine current version" and the brand & compliance
   * check all kept working on the version the user had just superseded, with
   * nothing on screen saying so.
   *
   * A localization fork is deliberately excluded: it is written in another
   * language, and moving the pointer onto it would switch the refine target and
   * the compliance check to a different locale. It is added alongside, and the
   * toast says that.
   *
   * `updatedAt` moves either way — a new version is a change to the record, and
   * the content list sorts on it.
   */
  const recordNewVersion = (versionId: string, locale: string, now: string): boolean => {
    const promote = !currentVersion || currentVersion.locale === locale;
    contentsCol.updateIn(content.id, {
      ...(promote ? { currentVersionId: versionId } : {}),
      updatedAt: now,
    });
    return promote;
  };

  const handleGenerateDraft = () => {
    const draft = aiService.generateDraft(content, { db });
    const versionNumber = nextDraftVersion(versions);
    const now = new Date().toISOString();
    const locale = currentVersion?.locale ?? DEFAULT_LOCALE;
    const newId = versionsCol.createIn({
      contentId: content.id,
      versionNumber,
      locale,
      body: draft.body,
      aiGenerated: true,
      provenance: {
        source: "ai-draft",
        generator: GENERATOR,
        basis: `Draft of "${content.title}" composed from ${content.briefId ? `brief ${content.briefId}` : "the content record"} for ${brand?.name ?? content.brandId}.`,
        ...(currentVersion ? { derivedFromVersionId: currentVersion.id } : {}),
      },
      createdAt: now,
      updatedAt: now,
    });
    recordNewVersion(newId, locale, now);
    toast.success(`AI draft ${versionNumber} created`, {
      description:
        "Added to the version history as the current version — the refine and compliance actions now work on it. Route it for approval like any other draft.",
    });
  };

  /** Brand guardrail policies + every block-enforced policy, deduped. */
  /** Channel a given version ships on — drives channel-scoped legal clauses. */
  const channelKindFor = (version?: ContentVersion): ChannelKind | undefined => {
    const exec = db.channelExecutions.find((x) => x.contentVersionId === version?.id);
    const channel = exec && db.channels.find((c) => c.id === exec.channelId);
    return channel?.channelKind;
  };

  const reviewPolicies = (() => {
    const ids = new Set<string>(brand?.guardrailPolicyIds ?? []);
    for (const p of db.policies) if (p.enforcement === "block") ids.add(p.id);
    return db.policies.filter((p) => ids.has(p.id));
  })();

  /** Every persisted review of this content item, newest first. */
  const reviewsForContent = db.aiReviews
    .filter((r) => r.subjectId === content.id)
    .slice()
    .sort((a, b) => b.ranAt.localeCompare(a.ranAt, DEFAULT_LOCALE));

  /** Latest persisted review of the current version. */
  const latestReview = reviewsForContent.find(
    (r) => r.subjectVersionId === currentVersion?.id,
  );

  /** Latest persisted review per version, for the version-history rows. */
  const latestReviewByVersion = new Map<string, AIReview>();
  for (const r of reviewsForContent) {
    if (r.subjectVersionId && !latestReviewByVersion.has(r.subjectVersionId)) {
      latestReviewByVersion.set(r.subjectVersionId, r);
    }
  }

  const handleRunReview = () => {
    if (!currentVersion || !brand) return;
    const now = new Date().toISOString();
    const input = reviewInputFor(currentVersion, now);
    if (!input) return;
    const result = aiService.reviewContent(input, reviewPolicies, { db });
    const ranBy =
      db.stakeholders.find((s) => s.role === role)?.id ?? content.ownerStakeholderId;
    reviewsCol.createIn(
      {
        subjectEntity: "Content",
        subjectId: content.id,
        subjectVersionId: currentVersion.id,
        findings: result.findings,
        overallSeverity: result.overallSeverity,
        scores: result.scores,
        context: result.context,
        ranAt: now,
        ranByStakeholderId: ranBy,
        createdAt: now,
        updatedAt: now,
      },
      "AIR-",
    );
    const blocks = result.findings.filter((f) => f.severity === "block").length;
    const warns = result.findings.filter((f) => f.severity === "warn").length;
    toast.success(
      `Brand & compliance check complete — ${result.overallSeverity === "pass" ? "all checks passed" : `${blocks} block, ${warns} warn`}`,
    );
    if (result.overallSeverity === "block" && content.status === "In Review") {
      const blockingPolicyId = result.findings.find((f) => f.severity === "block")?.policyId;
      const blockingPolicy =
        reviewPolicies.find((p) => p.id === blockingPolicyId)?.name ?? "policy";
      contentsCol.updateIn(content.id, { status: "Rework", updatedAt: now });
      toast.error(`Returned to rework: blocked by ${blockingPolicy}`);
    }
  };

  /* -- Row-level quality review ------------------------------------- */

  /** Everything the rule engine needs to review one version, all of it joined
   *  off the record — nothing about the copy is assumed. */
  const reviewInputFor = (version: ContentVersion, asOf: string): ReviewInput | null => {
    if (!brand) return null;
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
      channelKind: channelKindFor(version),
      campaignStartDate: campaign?.startDate,
      reviewDate: asOf.slice(0, 10),
    };
  };

  /**
   * Quality review of one version, recorded as an `AgentRun`.
   *
   * The run is written to the ledger before the work starts and updated with
   * its outcome when it finishes, so a failure leaves a `failed` row carrying
   * the real reason rather than no trace at all. The findings are persisted as
   * an `AIReview`, but the run does not claim it as a produced record: produced
   * records feed the acceptance rate, and an `AIReview` is never something a
   * person accepts or rejects — counting it would invent a rejection.
   *
   * No `confidence` is recorded either. This engine reports certainty per
   * finding, not per run, and averaging those would be a number nobody
   * computed. The trace says so rather than showing a figure.
   */
  const handleQualityReview = async (version: ContentVersion) => {
    const startedAt = new Date().toISOString();
    const triggeredBy =
      db.stakeholders.find((s) => s.role === role)?.id ?? content.ownerStakeholderId;
    const runId = runsCol.createIn(
      {
        agentId: QUALITY_REVIEW_AGENT_ID,
        subjectEntity: "ContentVersion",
        subjectId: version.id,
        status: "running",
        startedAt,
        ruleSetVersion: BRAND_GUARDRAIL_RULE_SET,
        triggeredByStakeholderId: triggeredBy,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
      "ARN-",
    );
    setQualityRuns((prev) => ({ ...prev, [version.id]: { phase: "running", runId } }));

    try {
      const input = reviewInputFor(version, startedAt);
      if (!input) {
        throw new Error(
          `No Brand record '${content.brandId}' is on file, so the guardrail policy set for this content cannot be resolved.`,
        );
      }
      if (reviewPolicies.length === 0) {
        throw new Error(
          `${brand?.name ?? content.brandId} has no guardrail policies on file and no policy is block-enforced, so there is nothing to evaluate.`,
        );
      }
      const result = await asyncAIService.reviewContent(input, reviewPolicies, { db });
      const finishedAt = new Date().toISOString();
      const blocks = result.findings.filter((f) => f.severity === "block").length;
      const warns = result.findings.filter((f) => f.severity === "warn").length;

      const reviewId = reviewsCol.createIn(
        {
          subjectEntity: "Content",
          subjectId: content.id,
          subjectVersionId: version.id,
          findings: result.findings,
          overallSeverity: result.overallSeverity,
          scores: result.scores,
          context: result.context,
          ranAt: finishedAt,
          ranByStakeholderId: triggeredBy,
          createdAt: finishedAt,
          updatedAt: finishedAt,
        },
        "AIR-",
      );

      runsCol.updateIn(runId, {
        status: "succeeded",
        finishedAt,
        updatedAt: finishedAt,
        outcomeSummary: `Quality review of ${version.versionNumber} against ${reviewPolicies
          .map((p) => p.id)
          .join(", ")} — ${blocks} block, ${warns} warn across ${result.findings.length} checks. Tone ${result.scores.toneScore}, readability ${result.scores.readabilityScore}, compliance ${result.scores.complianceScore} out of 100. Findings recorded as ${reviewId}; approval stays with the named reviewer.`,
      });

      setQualityRuns((prev) => ({
        ...prev,
        [version.id]: {
          phase: "done",
          runId,
          reviewId,
          severity: result.overallSeverity,
          blocks,
          warns,
          checks: result.findings.length,
          scores: result.scores,
        },
      }));
      toast.success(
        `Quality review of ${version.versionNumber} — ${result.overallSeverity === "pass" ? "all checks passed" : `${blocks} block, ${warns} warn`}`,
      );
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const message = err instanceof Error ? err.message : String(err);
      runsCol.updateIn(runId, {
        status: "failed",
        finishedAt,
        updatedAt: finishedAt,
        error: message,
      });
      setQualityRuns((prev) => ({
        ...prev,
        [version.id]: { phase: "error", runId, message },
      }));
      toast.error(`Quality review of ${version.versionNumber} failed`, {
        description: message,
      });
    }
  };

  /* -- Variants (FR-CS-02 / 06 / 08) -------------------------------- */

  /** Personas offered in the picker, brand-agnostic: a persona is a reader,
   *  not a brand asset, and cross-brand reuse is the point of the library. */
  const personaOptions = db.customerPersonas
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id, DEFAULT_LOCALE));

  const handleGenerateVariants = () => {
    const generated = aiService.generateVariants(content, {
      db,
      personas: pickedPersonas,
      channels: pickedChannels,
    });
    setVariants(generated);
    setVariantsOpen(false);
    const flagged = generated.filter((v) => !v.withinConstraints).length;
    toast.success(
      `${generated.length} variant${generated.length === 1 ? "" : "s"} generated`,
      {
        description:
          flagged > 0
            ? `${flagged} breached a channel constraint and ${flagged === 1 ? "was" : "were"} truncated to fit — each card says how much was trimmed.`
            : "Every variant fits its channel constraints. Save the ones worth testing as versions.",
      },
    );
  };

  /** A variant becomes a real ContentVersion — same lifecycle as any draft. */
  const handleSaveVariant = (variant: ContentVariant) => {
    const versionNumber = nextDraftVersion(versions);
    const now = new Date().toISOString();
    const locale = currentVersion?.locale ?? DEFAULT_LOCALE;
    const newId = versionsCol.createIn({
      contentId: content.id,
      versionNumber,
      locale,
      body: variant.body,
      aiGenerated: true,
      provenance: {
        source: "variant",
        generator: GENERATOR,
        basis: variant.basis,
        ...(currentVersion ? { derivedFromVersionId: currentVersion.id } : {}),
        ...(variant.personaId ? { personaId: variant.personaId } : {}),
        ...(variant.channelId ? { channelId: variant.channelId } : {}),
      },
      createdAt: now,
      updatedAt: now,
    });
    recordNewVersion(newId, locale, now);
    toast.success(`${versionNumber} saved from the ${variant.label} variant`, {
      description: variant.withinConstraints
        ? "Added to the version history as the current version — route it for approval like any other draft."
        : `Saved as the current version with its constraint breach recorded: ${variant.violations[0]}`,
    });
  };

  /* -- Refinement (FR-CS-09) ---------------------------------------- */

  /** The units the preserve picker offers — the same split refineDraft honours. */
  const refineParagraphs = currentVersion ? contentParagraphs(currentVersion.body) : [];

  const handleRefine = () => {
    if (!currentVersion) return;
    const refined = aiService.refineDraft(currentVersion.body, feedback, preserved);
    const versionNumber = nextDraftVersion(versions);
    const now = new Date().toISOString();
    const refinedFrom = currentVersion;
    const newId = versionsCol.createIn({
      contentId: content.id,
      versionNumber,
      locale: currentVersion.locale,
      ...(currentVersion.regionId ? { regionId: currentVersion.regionId } : {}),
      body: refined.body,
      aiGenerated: true,
      provenance: {
        source: "refinement",
        generator: GENERATOR,
        basis: refined.basis,
        derivedFromVersionId: currentVersion.id,
        feedback,
        preservedFragments: refined.preserved,
      },
      createdAt: now,
      updatedAt: now,
    });
    recordNewVersion(newId, refinedFrom.locale, now);
    changeRefineOpen(false);
    toast.success(`${versionNumber} created from ${refinedFrom.versionNumber}`, {
      description: `${refined.changes.join(" ")} ${refined.preserved.length} approved fragment${refined.preserved.length === 1 ? "" : "s"} carried through verbatim. ${versionNumber} is now the current version.`,
    });
  };

  /* -- Creative brief (FR-CS-10) ------------------------------------ */

  const handleGenerateBrief = () => setBrief(aiService.generateCreativeBrief(content, { db }));

  const handleCopyBrief = async () => {
    if (!brief) return;
    const text = briefToText(content.title, brief);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Creative brief copied to the clipboard");
    } catch {
      toast.error("Clipboard unavailable — select the brief text and copy it manually");
    }
  };

  /** Versions grouped by locale — en-US (default) group first, then A→Z. */
  const localeGroups = (() => {
    const map = new Map<string, ContentVersion[]>();
    for (const v of versions) {
      const group = map.get(v.locale);
      if (group) group.push(v);
      else map.set(v.locale, [v]);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === DEFAULT_LOCALE) return -1;
      if (b === DEFAULT_LOCALE) return 1;
      return a.localeCompare(b, DEFAULT_LOCALE);
    });
  })();

  /* Right-to-left locales are listed under their own heading so the direction
     switch is an explicit, labelled state rather than a surprise mid-list. */
  const ltrLocaleGroups = localeGroups.filter(([locale]) => !isRtl(locale));
  const rtlLocaleGroups = localeGroups.filter(([locale]) => isRtl(locale));

  /** One locale row: header metadata (always LTR) + the latest body copy
   *  rendered in the locale's own direction. */
  const renderLocaleGroup = (
    [locale, group]: [string, ContentVersion[]],
    i: number,
  ) => {
    const latest = group[0];
    const rtl = isRtl(locale);
    const script = localeScript(locale);
    // Locales that carry a cultural calendar note beside the Gregorian date.
    const localized = Boolean(localeMeta(locale)?.secondaryCalendar);
    const region = latest.regionId
      ? db.regions.find((r) => r.id === latest.regionId)
      : undefined;
    const approval = latest.approvalId
      ? db.approvals.find((a) => a.id === latest.approvalId)
      : undefined;
    return (
      <div key={locale}>
        {i > 0 && <Separator className="mb-4" />}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{localeName(locale)}</span>
          <LocaleChip locale={locale} />
          {locale === DEFAULT_LOCALE && <Badge variant="secondary">Default</Badge>}
          {region && (
            <span className="text-xs text-muted-foreground">{region.name}</span>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">
            Latest {latest.versionNumber}
          </span>
          {latest.aiGenerated && (
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI draft
            </Badge>
          )}
          {approval ? (
            <StatusBadge status={approval.status}>
              Approval: {approval.status}
            </StatusBadge>
          ) : (
            <span className="text-xs text-muted-foreground">No approval linked</span>
          )}
          {/* The row is English chrome and stays LTR; only the date is in the
              content's locale, so it goes in a <bdi> to keep the bidi
              algorithm from reordering the English words around it. Locales
              with a cultural calendar carry it beside the Gregorian date —
              the Hijri note for ar-SA, the imperial era for ja-JP. The test
              is the calendar, not the direction: Japanese is LTR and still
              needs the note. */}
          <span dir="ltr" className="ml-auto text-xs tabular-nums text-muted-foreground">
            {group.length} version{group.length === 1 ? "" : "s"} ·{" "}
            <bdi
              lang={localized ? locale : undefined}
              className={cn(
                script === "arabic" && "font-rtl",
                script === "cjk" && "font-cjk",
              )}
            >
              {localized
                ? formatDateWithCalendarHint(latest.createdAt, locale)
                : fmtDate(latest.createdAt)}
            </bdi>
          </span>
        </div>
        <LocaleText locale={locale} clamp={2} showChip={false} className="mt-2">
          {latest.body}
        </LocaleText>
      </div>
    );
  };

  const handleRequestLocalization = () => {
    if (!targetLocale || !targetRegionId) return;
    const draft = aiService.generateDraft(content, { db });
    const versionNumber = nextDraftVersion(versions);
    const now = new Date().toISOString();
    const newId = versionsCol.createIn({
      contentId: content.id,
      versionNumber,
      locale: targetLocale,
      regionId: targetRegionId,
      // Targets whose script differs from the source get a placeholder written
      // in that script: a Latin draft tagged ar-SA or ja-JP would render in the
      // wrong face and tell us nothing about whether direction and font
      // handling actually work. French shares the Latin script, so its
      // placeholder only has to prove the locale plumbing, not the typography.
      body: localizedPlaceholder(targetLocale, content.title, draft.body),
      aiGenerated: true,
      provenance: {
        source: "localization",
        generator: GENERATOR,
        basis: `Transcreation of "${content.title}" into ${localeName(targetLocale)} (${targetLocale}) for ${db.regions.find((r) => r.id === targetRegionId)?.name ?? targetRegionId}.`,
        ...(currentVersion ? { derivedFromVersionId: currentVersion.id } : {}),
      },
      createdAt: now,
      updatedAt: now,
    });
    const promoted = recordNewVersion(newId, targetLocale, now);
    const localeLabel = `${localeName(targetLocale)} (${targetLocale})`;
    changeLocalizeOpen(false);
    toast.success(`Localization draft ${versionNumber} created in ${localeLabel}`, {
      description: promoted
        ? "Set as the current version and routed through the standard workflow."
        : `Added alongside the current ${currentVersion ? localeName(currentVersion.locale) : "source"} version, which stays current — the refine and compliance actions keep working on it. Routes through the standard workflow.`,
    });
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-7 px-2 text-xs">
          <Link to="/content">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Content studio
          </Link>
        </Button>
        <PageHeader
          title={content.title}
          description={[
            content.contentType,
            brand?.name ?? content.brandId,
            campaign?.name,
          ]
            .filter(Boolean)
            .join(" · ")}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={content.status} />
              <OriginChip info={contentOrigin} />
              <Button size="sm" variant="outline" onClick={handleGenerateDraft}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Generate draft with AI
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRunReview}
                disabled={!currentVersion || !brand}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Run brand &amp; compliance check
              </Button>
              <Button size="sm" variant="outline" onClick={handleGenerateBrief}>
                <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                Creative brief
              </Button>
            </div>
          }
        />
        {/* Item 11 — what this content item is connected to, counted off the
            same traversal the Graph explorer uses, deep-linked into it. */}
        <RelationshipChips
          db={db}
          entity="Content"
          id={content.id}
          className="mt-2"
        />
        {/* Where this record sits in Brand to Demand, derived from its status
            (item 10) — renders nothing when the stage cannot be derived. */}
        <LifecycleStepper
          stage={lifecycleStageFor("Content", content.status)}
          record={{ db, entity: "Content", id: content.id }}
          className="mt-2"
        />
        {/* What is actually holding it up, and a link straight to it (item 9). */}
        <BlockerLine blocker={contentBlocker} className="mt-1" />
      </div>

      {campaign && (
        <div className="text-sm text-muted-foreground">
          Linked campaign:{" "}
          <Link to={`/campaigns/${campaign.id}`} className="text-primary hover:underline">
            {campaign.name}
          </Link>
        </div>
      )}

      {latestReview && (
        <>
          {/* The check demotes an item only from "In Review" — a Published or
              Approved item keeps its status, so the alert says what the check
              found and what that did to this record, instead of asserting a
              "blocked" state next to a badge that reads Published. */}
          {latestReview.overallSeverity === "block" && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>
                Blocking findings on{" "}
                {currentVersion?.versionNumber ?? "the current version"}
              </AlertTitle>
              <AlertDescription>
                {(() => {
                  const blocking = latestReview.findings.filter(
                    (f) => f.severity === "block",
                  ).length;
                  const lead = `${blocking} blocking finding${blocking === 1 ? "" : "s"} against ${content.status === "Rework" ? "this version" : `this ${content.contentType}`}.`;
                  return content.status === "Rework"
                    ? `${lead} The item is in rework — resolve them before it goes back for approval.`
                    : `${lead} The item stays ${content.status} — the check records findings, it does not move the record. Resolve them and route a new version through approval.`;
                })()}
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Brand &amp; compliance check
                {currentVersion ? ` — ${currentVersion.versionNumber}` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ReviewFindings
                review={latestReview}
                policies={db.policies}
                reviewedText={`${content.title}\n${currentVersion?.body ?? ""}`}
              />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Variants</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setVariantsOpen(true)}>
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Generate variants
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {variants.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No variants generated"
              hint={
                personaOptions.length + db.channels.length === 0
                  ? "Variants are written per persona and per channel, and neither is registered yet — there is nothing to generate against."
                  : `Variants are generated on demand and never persisted, so this stays empty until you pick from the ${personaOptions.length} persona${personaOptions.length === 1 ? "" : "s"} and ${db.channels.length} channel${db.channels.length === 1 ? "" : "s"} available. Each variant states the hypothesis it carries and is checked against the channel's character limits before it reaches you.`
              }
              action={
                personaOptions.length + db.channels.length > 0
                  ? { label: "Pick personas and channels", onClick: () => setVariantsOpen(true) }
                  : undefined
              }
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {variants.map((variant) => {
                const chip = constraintChip(variant);
                const persona = variant.personaId
                  ? db.customerPersonas.find((p) => p.id === variant.personaId)
                  : undefined;
                const channel = variant.channelId
                  ? db.channels.find((c) => c.id === variant.channelId)
                  : undefined;
                const sizedAgainst = variant.constrainedByChannelId
                  ? db.channels.find((c) => c.id === variant.constrainedByChannelId)
                  : undefined;
                return (
                  <div
                    key={variant.id}
                    data-testid="content-variant"
                    className="flex flex-col rounded-md border border-border p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{variant.label}</span>
                      <Badge variant="outline">
                        {persona ? "Persona" : channel ? "Channel" : "Variant"}
                      </Badge>
                      <Badge
                        variant={chip.over ? "destructive" : "secondary"}
                        className="tabular-nums"
                      >
                        {chip.label}
                      </Badge>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {variant.body.length} chars
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">Hypothesis</span>{" "}
                      {variant.hypothesis}
                    </p>

                    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                      Subject: <span className="text-foreground/80">{variant.subject}</span>
                    </p>

                    <p className="mt-2 line-clamp-4 text-sm text-foreground/90">
                      {variant.body}
                    </p>

                    {variant.violations.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {variant.violations.map((v) => (
                          <li key={v} className="text-xs text-destructive">
                            {v}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-3">
                      <span className="text-xs text-muted-foreground">
                        {sizedAgainst
                          ? `Sized against ${sizedAgainst.name}${variant.constraintId ? ` · ${variant.constraintId}` : ""}`
                          : "No channel constraint registered"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() => handleSaveVariant(variant)}
                      >
                        Save as version
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Variants are generated copy, not versions — nothing enters the version
            history or the approval path until you save one.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-medium">Version history</CardTitle>
            {/* The language scope is doing something here, so it says so
                rather than leaving the list quietly short. */}
            {localeId && (
              <span className="text-xs text-muted-foreground">
                {localeName(localeId)} only
                {versionsHiddenByLocale > 0 &&
                  ` · ${versionsHiddenByLocale} in other languages hidden`}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRefineOpen(true)}
            disabled={!currentVersion}
          >
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
            Refine current version
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {versions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No versions yet"
              hint={
                linkedBrief
                  ? `Nothing has been drafted for this content item. It works from the brief "${linkedBrief.title}", which is currently ${linkedBrief.status} — a draft composed from it enters here as V1 and routes through the standard approval workflow.`
                  : "Nothing has been drafted for this content item, and no brief is linked to it — a draft is composed from the content record and the brand's guidelines instead, entering here as V1."
              }
              action={{ label: "Generate draft with AI", onClick: handleGenerateDraft }}
            />
          ) : visibleVersions.length === 0 ? (
            /* Nothing is missing — the language scope is hiding everything this
               content item has. Name the language, the count it is hiding, and
               the two ways out. */
            <EmptyState
              icon={Languages}
              title={`No ${localeId ? localeName(localeId) : ""} versions of this content`}
              hint={`The top bar scopes this page to ${localeId ? localeName(localeId) : "one language"}, and every one of this item's ${versions.length} version${versions.length === 1 ? "" : "s"} is in another language (${[...new Set(versions.map((v) => localeName(v.locale)))].join(", ")}). Switch the language scope back to all languages to see them, or request localization to fork one into this language.`}
              action={{
                label: "Request localization",
                onClick: () => setLocalizeOpen(true),
              }}
            />
          ) : (
            <div className="space-y-4">
              {visibleVersions.map((v, i) => {
                const approval = v.approvalId
                  ? db.approvals.find((a) => a.id === v.approvalId)
                  : undefined;
                const isCurrent = content.currentVersionId === v.id;
                const prov = provenanceOf(v);
                const derivedFrom = prov.derivedFromVersionId
                  ? versions.find((p) => p.id === prov.derivedFromVersionId)
                  : undefined;
                const provPersona = prov.personaId
                  ? db.customerPersonas.find((p) => p.id === prov.personaId)
                  : undefined;
                const provChannel = prov.channelId
                  ? db.channels.find((c) => c.id === prov.channelId)
                  : undefined;
                // Item 1 — read straight off this version's own provenance, so
                // the chip tracks the chain rather than a second flag.
                const vOrigin = versionOrigin(db, v.id);
                const persistedReview = latestReviewByVersion.get(v.id);
                return (
                  <div key={v.id}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div
                      className={cn(
                        proposedRowClass(vOrigin.origin),
                        vOrigin.origin === "agent" && "rounded-r-md py-1 pl-3",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">
                          {v.versionNumber}
                        </span>
                        <OriginChip info={vOrigin} />
                        <LocaleChip locale={v.locale} />
                        {isCurrent && <Badge variant="secondary">Current</Badge>}
                        {/* One badge carries the origin (FR-CS-12): which surface
                            produced this version, not merely that a machine did. */}
                        <Badge variant="outline" className="gap-1">
                          {prov.source !== "manual" && <Sparkles className="h-3 w-3" />}
                          {PROVENANCE_LABEL[prov.source]}
                        </Badge>
                        {approval ? (
                          <>
                            <StatusBadge status={approval.status}>
                              Approval: {approval.status}
                            </StatusBadge>
                            {/* Item 9 — names the approval holding this version,
                                when one is recorded against the version itself. */}
                            <BlockerLine
                              blocker={blockerFor(db, "ContentVersion", v.id, approval.status)}
                            />
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No approval linked</span>
                        )}
                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                          {fmtDate(v.createdAt)}
                        </span>
                        {/* Row-level agent action: the rule engine runs against
                            this version and the run lands on the ledger. */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={qualityRuns[v.id]?.phase === "running"}
                          onClick={() => void handleQualityReview(v)}
                        >
                          <Gauge className="mr-1.5 h-3.5 w-3.5" />
                          {qualityRuns[v.id]?.phase === "running"
                            ? "Running…"
                            : "Run quality review"}
                        </Button>
                      </div>

                      <QualityRunLine
                        state={qualityRuns[v.id]}
                        onRetry={() => void handleQualityReview(v)}
                      />
                      {/* Nothing ran in this session, but a review of this
                          version is on file — show the record rather than
                          leaving it unread on every surface. */}
                      {!qualityRuns[v.id] && persistedReview && (
                        <PersistedReviewLine review={persistedReview} />
                      )}
                      {/* Every version body renders through its own locale's
                          direction — the seeded ar-SA versions come out RTL. */}
                      <LocaleText
                        locale={v.locale}
                        clamp={3}
                        showChip={false}
                        className="mt-2"
                      >
                        {v.body}
                      </LocaleText>

                      {/* FR-CS-12 — the prompt-ish basis, so a reviewer can see
                          what the generator was asked for, not just that it ran. */}
                      <div
                        dir="ltr"
                        data-testid="version-provenance"
                        className="mt-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground"
                      >
                        <span className="font-medium text-foreground/80">Provenance</span>{" "}
                        {PROVENANCE_LABEL[prov.source]}
                        {prov.generator ? ` · ${prov.generator}` : ""}
                        {derivedFrom ? ` · from ${derivedFrom.versionNumber}` : ""}
                        {provPersona ? ` · persona ${provPersona.name}` : ""}
                        {provChannel ? ` · channel ${provChannel.name}` : ""}
                        {prov.basis && <span className="block pt-1 italic">{prov.basis}</span>}
                        {prov.feedback && (
                          <span className="block pt-1">
                            Feedback: <span className="italic">{prov.feedback}</span>
                          </span>
                        )}
                        {prov.preservedFragments && prov.preservedFragments.length > 0 && (
                          <span className="block pt-1">
                            {prov.preservedFragments.length} approved fragment
                            {prov.preservedFragments.length === 1 ? "" : "s"} held verbatim.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-sm font-medium">Localization</CardTitle>
            {/* Deliberately not narrowed by the language scope: this panel's
                whole job is to show which languages the item does and does not
                cover, and one row is not coverage. */}
            {localeId && (
              <span className="text-xs text-muted-foreground">
                All languages — coverage is the point of this panel
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => setLocalizeOpen(true)}>
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            Request localization
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {localeGroups.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No locales yet"
              hint="Localization forks an existing version into a target locale and region, so it needs a source version to work from. This content item has none yet — draft one first and the source locale will appear here."
              action={{ label: "Generate draft with AI", onClick: handleGenerateDraft }}
            />
          ) : (
            <>
              <div className="space-y-4">{ltrLocaleGroups.map(renderLocaleGroup)}</div>

              {rtlLocaleGroups.length > 0 && (
                <div
                  className="mt-5 border-t border-border pt-4"
                  data-testid="rtl-locale-group"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium">
                      Arabic &amp; right-to-left locales
                    </h3>
                    <Badge variant="outline" className="gap-1">
                      <Languages className="h-3 w-3" />
                      RTL
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Body copy renders right-to-left, in Arabic numerals, with the
                      Hijri date alongside the Gregorian one.
                    </span>
                  </div>
                  <div className="space-y-4">{rtlLocaleGroups.map(renderLocaleGroup)}</div>
                </div>
              )}
            </>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Localized variants are ContentVersions — same lifecycle, same approvals, per-region policy sets apply.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Content-level bilingual support. Full UI localisation is a platform-phase
            item.
          </p>
        </CardContent>
      </Card>

      <Dialog open={variantsOpen} onOpenChange={changeVariantsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate variants</DialogTitle>
            <DialogDescription>
              One variant per selected persona and one per selected channel, each with
              the hypothesis it tests. Channel character limits, subject limits and
              alt-text rules are applied while the copy is written, not after.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Personas</p>
              {personaOptions.map((persona) => (
                <label
                  key={persona.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm"
                >
                  <Checkbox
                    checked={pickedPersonas.includes(persona.id)}
                    onCheckedChange={(v) =>
                      setPickedPersonas((prev) =>
                        v === true
                          ? [...prev, persona.id]
                          : prev.filter((id) => id !== persona.id),
                      )
                    }
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    {persona.name}
                    <span className="block text-xs text-muted-foreground">
                      {persona.cohortSize.toLocaleString("en-US")} addressable ·{" "}
                      {persona.preferredChannelKinds.join(", ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Channels</p>
              {db.channels.map((channel) => {
                const constraint = db.channelConstraints.find(
                  (c) => c.channelId === channel.id,
                );
                return (
                  <label
                    key={channel.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm"
                  >
                    <Checkbox
                      checked={pickedChannels.includes(channel.id)}
                      onCheckedChange={(v) =>
                        setPickedChannels((prev) =>
                          v === true
                            ? [...prev, channel.id]
                            : prev.filter((id) => id !== channel.id),
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      {channel.name}
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {constraint?.maxChars !== undefined
                          ? `${constraint.maxChars}-char body`
                          : "no body limit"}
                        {constraint?.subjectMaxChars !== undefined
                          ? ` · ${constraint.subjectMaxChars}-char subject`
                          : ""}
                        {constraint?.requiresAltText ? " · alt text required" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => changeVariantsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateVariants}
              disabled={pickedPersonas.length === 0 && pickedChannels.length === 0}
            >
              Generate {pickedPersonas.length + pickedChannels.length} variant
              {pickedPersonas.length + pickedChannels.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refineOpen} onOpenChange={changeRefineOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Refine {currentVersion?.versionNumber ?? "the current version"}
            </DialogTitle>
            <DialogDescription>
              Feedback drives the rewrite; anything ticked below is carried into the new
              version verbatim, so approved wording survives the regeneration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="refine-feedback">
                Feedback
              </label>
              <Textarea
                id="refine-feedback"
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. Shorter, plainer language, and add a clear call to action."
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Preserve verbatim</p>
              {refineParagraphs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This version has no copy to preserve.
                </p>
              ) : (
                refineParagraphs.map((paragraph) => (
                  <label
                    key={paragraph}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm"
                  >
                    <Checkbox
                      checked={preserved.includes(paragraph)}
                      onCheckedChange={(v) =>
                        setPreserved((prev) =>
                          v === true
                            ? [...prev, paragraph]
                            : prev.filter((p) => p !== paragraph),
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0">{paragraph}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => changeRefineOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefine} disabled={!currentVersion || !feedback.trim()}>
              Refine into a new version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={brief !== null} onOpenChange={(open) => !open && setBrief(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Creative brief — {content.title}</DialogTitle>
            <DialogDescription>
              Generated from the linked brief, the targeted audience, the channels this
              content ships on and the clause library. Hand it to the design team as is.
            </DialogDescription>
          </DialogHeader>
          {brief && (
            <div className="space-y-4 py-2 text-sm">
              <div>
                <p className="text-sm font-medium">Objective</p>
                <p className="mt-1 text-muted-foreground">{brief.objective}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Audience</p>
                <p className="mt-1 text-muted-foreground">{brief.audience}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Deliverables</p>
                <ul className="mt-1 space-y-2">
                  {brief.deliverables.map((d) => (
                    <li key={d.format} className="rounded-md border p-2.5">
                      <span className="font-medium">{d.format}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {d.spec}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium">Mandatories</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                  {brief.mandatories.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrief(null)}>
              Close
            </Button>
            <Button onClick={handleCopyBrief}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy to clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={localizeOpen} onOpenChange={changeLocalizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request localization</DialogTitle>
            <DialogDescription>
              Creates an AI-transcreated draft fork for the target locale and region. It routes
              through the standard approval workflow like any other version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="localize-locale">
                Target locale
              </label>
              <Select value={targetLocale} onValueChange={setTargetLocale}>
                <SelectTrigger id="localize-locale">
                  <SelectValue placeholder="Select locale" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_LOCALES.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{loc}</span>
                        <span className="text-muted-foreground">
                          {localeName(loc)}
                        </span>
                        {isRtl(loc) && (
                          <span className="rounded-[3px] bg-muted px-1 text-[11px] text-muted-foreground">
                            RTL
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="localize-region">
                Target region
              </label>
              <Select value={targetRegionId} onValueChange={setTargetRegionId}>
                <SelectTrigger id="localize-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {db.regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => changeLocalizeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestLocalization}
              disabled={!targetLocale || !targetRegionId}
            >
              Create localization draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One history for the record: agent runs (recorded against this item and
          against its versions) alongside what people did to it. */}
      <AgentActivityRail
        entity="Content"
        id={content.id}
        related={versionSubjects}
      />

      <RecordAuditTrail entity="Content" id={content.id} />
    </div>
  );
}
