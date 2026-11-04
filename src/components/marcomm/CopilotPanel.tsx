/**
 * MarCom Copilot rail — the conversational surface of agent A8
 * (BLUEPRINT.md FR-CP-01..06).
 *
 * A RAIL, not a modal. It is docked to the right edge and rendered into
 * `document.body`, so navigating to a record does not dismiss it: the
 * conversation, the session context and any open action survive the route
 * change, which is the whole point of asking a question and then going to look
 * at the record it cited.
 *
 * It is PAGE-AWARE. The route the user is on is parsed by
 * `pageContextForPath()` and handed to the router, so "why is this at risk"
 * resolves against the campaign on screen and "run the compliance check"
 * against the content on screen. When a subject is taken from the page rather
 * than the question, the answer says so — an assumed subject the reader cannot
 * see would be worse than no answer.
 *
 * It ACTS, and every action leaves records behind:
 *
 *   - the router only ever *plans* an action (`CopilotAnswer.action`), because
 *     it is a pure function with no clock and no store;
 *   - this component executes the plan — writing ContentVersions or an
 *     AIReview through the same DataStore collections the content studio
 *     writes, so the records appear on the record's own page, not just here;
 *   - every produced record is booked as an `AgentRun`, one run per record,
 *     the same convention the seeded ledger uses, so the work shows up in
 *     agent activity attributable to the agent that did it;
 *   - the reply is then built by `buildActionReceipt()` from the ids the store
 *     actually returned, and links to each of them. An action is never
 *     reported as prose alone, and a run that produced nothing is recorded as
 *     failed rather than dressed up.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  FileText,
  Info,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { useLiveDBWith } from "@/data/useLiveDB";
import { getSeedDB } from "@/data/seed";
import type {
  AgentRun,
  AIReview,
  Content,
  ContentVersion,
} from "@/data/types";
import { nextId, useCollection } from "@/store/DataStore";
import { aiService } from "@/services/ai";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import {
  buildActionReceipt,
  pageContextForPath,
  plural,
  routeIntent,
  startersFor,
  type CopilotActionPlan,
  type CopilotActionReceipt,
  type CopilotAnswer,
  type CopilotConfidence,
  type CopilotCreatedRecord,
} from "@/services/copilot";

/** How many turns of session context the conversation keeps (FR-CP-02). */
const MAX_TURNS = 12;

/** Generator identity stamped on every version this surface writes (FR-CS-12). */
const GENERATOR = "simulated-ai · deterministic";

const CONFIDENCE_STYLES: Record<CopilotConfidence, string> = {
  high: "border-success/20 bg-success/10 text-success",
  medium: "border-warning/20 bg-warning/10 text-warning",
  low: "border-border bg-muted text-muted-foreground",
};

interface UserTurn {
  kind: "user";
  id: number;
  text: string;
}

interface AgentTurn {
  kind: "agent";
  id: number;
  answer: CopilotAnswer;
}

type Turn = UserTurn | AgentTurn;

/**
 * Next draft-fork version number — the same rule the content studio applies
 * (V1 → V1.1 → V1.2), so versions written from the rail sit in one sequence
 * with versions written on the page.
 */
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

/* ------------------------------------------------------------------ */
/* Agent turn                                                          */
/* ------------------------------------------------------------------ */

function AgentBubble({
  answer,
  ran,
  onNavigate,
  onRun,
}: {
  answer: CopilotAnswer;
  /** True once this turn's action has been executed — it runs once. */
  ran: boolean;
  /** Suggested-action navigation. The rail stays open behind the route change. */
  onNavigate: (to: string) => void;
  onRun: (plan: CopilotActionPlan) => void;
}) {
  const [explainOpen, setExplainOpen] = useState(false);
  const ActionIcon = answer.action?.kind === "compliance-review" ? ShieldAlert : Wand2;

  return (
    <div className="flex gap-2">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10"
        aria-hidden="true"
      >
        <Bot className="h-3.5 w-3.5 text-primary" />
      </span>

      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="rounded-lg border bg-card px-3 py-2.5 text-sm leading-relaxed">
          <p className="whitespace-pre-line break-words">{answer.answer}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
              CONFIDENCE_STYLES[answer.confidence],
            )}
          >
            {answer.confidence} confidence
          </span>
          <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {answer.intent}
          </span>
        </div>

        {/* An action is offered with its consequences stated first: what it
            writes, and where those records land. */}
        {answer.action && (
          <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {ran ? "Action taken" : "Action available"}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Creates {answer.action.creates}.
            </p>
            {ran ? (
              <p className="text-xs text-muted-foreground">
                Already run from this turn — the receipt below lists every
                record it wrote.
              </p>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-7 max-w-full px-2.5 text-[11px]"
                onClick={() => onRun(answer.action as CopilotActionPlan)}
              >
                <ActionIcon className="mr-1.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{answer.action.label}</span>
              </Button>
            )}
          </div>
        )}

        {answer.citations.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Sources
            </p>
            <div className="flex flex-wrap gap-1.5">
              {answer.citations.map((citation, i) =>
                citation.to ? (
                  <Link
                    key={`${citation.label}-${i}`}
                    to={citation.to}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] text-primary transition-colors hover:bg-muted"
                  >
                    <span className="truncate">{citation.label}</span>
                    <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </Link>
                ) : (
                  <span
                    key={`${citation.label}-${i}`}
                    className="inline-flex max-w-full items-center rounded-full border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    title="Your role cannot open this record"
                  >
                    <span className="truncate">{citation.label}</span>
                  </span>
                ),
              )}
            </div>
          </div>
        )}

        <Collapsible open={explainOpen} onOpenChange={setExplainOpen}>
          <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Info className="h-3 w-3" aria-hidden="true" />
            Explain this answer
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                explainOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="mt-1.5 whitespace-pre-line rounded-md border border-dashed bg-muted/40 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {answer.explanation}
            </p>
          </CollapsibleContent>
        </Collapsible>

        {answer.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {answer.suggestedActions.map((action) => (
              <Button
                key={`${action.label}-${action.to}`}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 max-w-full px-2 text-[11px]"
                onClick={() => onNavigate(action.to)}
              >
                <span className="truncate">{action.label}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rail                                                                */
/* ------------------------------------------------------------------ */

export function CopilotPanel() {
  const { role, currentUser } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  // Write handles for the collections an action touches. Same collection ids
  // the content studio and governance surfaces use, so a record written here
  // is the same record they render.
  const versionsCol = useCollection<ContentVersion>("contentVersions", getSeedDB().contentVersions);
  const reviewsCol = useCollection<AIReview>("aiReviews", getSeedDB().aiReviews);
  const runsCol = useCollection<AgentRun>("agentRuns", getSeedDB().agentRuns);

  // `useLiveDB` does not yet carry agentRuns as a live collection, so the
  // ledger is layered on here — otherwise the rail would write runs it could
  // not then read back when numbering the next one.
  const runOverride = useMemo(() => ({ agentRuns: runsCol.records }), [runsCol.records]);
  const db = useLiveDBWith(runOverride);

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [ranTurnIds, setRanTurnIds] = useState<number[]>([]);
  const nextTurnId = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  /** The route the asker is on — parsed by the router, not by this component. */
  const page = useMemo(() => pageContextForPath(pathname), [pathname]);

  /** Readable label for the record on the page, when there is one. */
  const pageRecordLabel = useMemo(() => {
    if (page.entity === "Campaign") {
      return db.campaigns.find((c) => c.id === page.id)?.name;
    }
    if (page.entity === "Content") {
      return db.contents.find((c) => c.id === page.id)?.title;
    }
    return undefined;
  }, [db.campaigns, db.contents, page]);

  // The signed-in identity maps to the seed stakeholder holding that role —
  // the same join the approvals inbox uses, so "pending on me" agrees with it.
  const stakeholderId = useMemo(
    () => db.stakeholders.find((s) => s.role === role)?.id,
    [db.stakeholders, role],
  );

  const appendAgentTurn = useCallback((answer: CopilotAnswer) => {
    setTurns((prev) =>
      [...prev, { kind: "agent", id: nextTurnId.current++, answer } as AgentTurn].slice(
        -MAX_TURNS,
      ),
    );
  }, []);

  const ask = useCallback(
    (query: string) => {
      const text = query.trim();
      if (text === "") return;

      // FR-CP-02 — the newest agent turn is the session context handed back to
      // the router, so a bare "why?" resolves against the previous answer.
      const lastAgent = [...turns].reverse().find((t): t is AgentTurn => t.kind === "agent");
      const lastUser = [...turns].reverse().find((t): t is UserTurn => t.kind === "user");

      const answer = routeIntent(text, db, {
        role,
        stakeholderId,
        page,
        priorIntent: lastAgent?.answer.intent,
        priorSubjectId: lastAgent?.answer.subjectId,
        priorQuery: lastUser?.text,
        // Provenance travels with the answer, so "why?" quotes what was
        // actually said rather than re-deriving a possibly different branch.
        priorExplanation: lastAgent?.answer.explanation,
        priorConfidence: lastAgent?.answer.confidence,
        priorCitations: lastAgent?.answer.citations,
      });

      const userTurn: UserTurn = { kind: "user", id: nextTurnId.current++, text };
      const agentTurn: AgentTurn = { kind: "agent", id: nextTurnId.current++, answer };
      setTurns((prev) => [...prev, userTurn, agentTurn].slice(-MAX_TURNS));
      setDraft("");
    },
    [db, page, role, stakeholderId, turns],
  );

  /* -- Action execution ---------------------------------------------- */

  /**
   * Book one ledger entry per produced record — the convention the seeded runs
   * follow, so `runsForAgent`, `acceptanceRate` and the produced-record join
   * all read this run exactly like a seeded one.
   *
   * Ids are computed against a locally-growing pool rather than re-reading the
   * store: several records are written in one tick, and the store derives its
   * next id from state that has not re-rendered yet.
   */
  const bookRun = useCallback(
    (pool: AgentRun[], run: Omit<AgentRun, "id">): string => {
      const id = nextId(pool, "ARN-");
      pool.push({ ...run, id });
      runsCol.createIn({ ...run, id });
      return id;
    },
    [runsCol],
  );

  const runDraftVariants = useCallback(
    (plan: CopilotActionPlan, content: Content, now: string): CopilotActionReceipt => {
      const runPool = [...db.agentRuns];
      const variants = aiService.generateVariants(content, {
        db,
        channels: plan.channelIds ?? [],
      });

      if (variants.length === 0) {
        const error = `The variant generator returned no output for ${plural(plan.channelIds?.length ?? 0, "channel")} on this record.`;
        const runId = bookRun(runPool, {
          agentId: plan.agentId,
          subjectEntity: "Content",
          subjectId: content.id,
          status: "failed",
          startedAt: now,
          finishedAt: now,
          error,
          ...(stakeholderId ? { triggeredByStakeholderId: stakeholderId } : {}),
          createdAt: now,
          updatedAt: now,
        });
        return { plan, created: [], runIds: [runId], notes: [], error };
      }

      const contentVersions = db.contentVersions.filter((v) => v.contentId === content.id);
      const current =
        contentVersions.find((v) => v.id === content.currentVersionId) ??
        [...contentVersions].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt, DEFAULT_LOCALE),
        )[0];

      const versionPool = [...db.contentVersions];
      const numbering = [...contentVersions];
      const created: CopilotCreatedRecord[] = [];
      const runIds: string[] = [];
      const notes: string[] = [];

      for (const variant of variants) {
        const versionId = nextId(versionPool, "CV-");
        const versionNumber = nextDraftVersion(numbering);
        const newVersion: ContentVersion = {
          id: versionId,
          contentId: content.id,
          versionNumber,
          locale: current?.locale ?? DEFAULT_LOCALE,
          body: variant.body,
          aiGenerated: true,
          provenance: {
            source: "variant",
            generator: GENERATOR,
            basis: variant.basis,
            ...(current ? { derivedFromVersionId: current.id } : {}),
            ...(variant.personaId ? { personaId: variant.personaId } : {}),
            ...(variant.channelId ? { channelId: variant.channelId } : {}),
          },
          createdAt: now,
          updatedAt: now,
        };
        versionPool.push(newVersion);
        numbering.push(newVersion);
        versionsCol.createIn(newVersion);

        created.push({
          entity: "ContentVersion",
          id: versionId,
          label: `${versionNumber} — ${variant.label}`,
          to: `/content/${content.id}`,
        });

        runIds.push(
          bookRun(runPool, {
            agentId: plan.agentId,
            subjectEntity: "Content",
            subjectId: content.id,
            status: "succeeded",
            startedAt: now,
            finishedAt: now,
            outcomeSummary: `Drafted ${versionNumber} of "${content.title}" as the ${variant.label} variant — ${variant.hypothesis}`,
            producedEntity: "ContentVersion",
            producedId: versionId,
            ...(stakeholderId ? { triggeredByStakeholderId: stakeholderId } : {}),
            createdAt: now,
            updatedAt: now,
          }),
        );

        if (!variant.withinConstraints) {
          notes.push(
            `${versionNumber} breached a channel constraint and was truncated by ${plural(variant.overBy, "character")} — ${variant.violations[0]}`,
          );
        }
      }

      if (notes.length === 0) {
        notes.push("Every variant fits the constraints of the channel it was written for.");
      }
      notes.push(
        "They are drafts: nothing is published, approved or scheduled by this — route them like any other version.",
      );

      return { plan, created, runIds, notes };
    },
    [bookRun, db, stakeholderId, versionsCol],
  );

  const runComplianceReview = useCallback(
    (plan: CopilotActionPlan, content: Content, now: string): CopilotActionReceipt => {
      const runPool = [...db.agentRuns];
      const version = db.contentVersions.find((v) => v.id === plan.versionId);
      const brand = db.brands.find((b) => b.id === content.brandId);

      if (!version || !brand) {
        const error = version
          ? `Brand ${content.brandId} no longer resolves to a Brand record, so there are no guardrails to check against.`
          : `Version ${plan.versionId ?? ""} is no longer in the workspace, so there is no copy to check.`;
        const runId = bookRun(runPool, {
          agentId: plan.agentId,
          subjectEntity: "Content",
          subjectId: content.id,
          status: "failed",
          startedAt: now,
          finishedAt: now,
          error,
          ...(stakeholderId ? { triggeredByStakeholderId: stakeholderId } : {}),
          createdAt: now,
          updatedAt: now,
        });
        return { plan, created: [], runIds: [runId], notes: [], error };
      }

      const campaign = content.campaignId
        ? db.campaigns.find((c) => c.id === content.campaignId)
        : undefined;
      const regionCodes = campaign
        ? campaign.regionIds
            .map((rid) => db.regions.find((r) => r.id === rid)?.code)
            .filter((c): c is string => Boolean(c))
        : undefined;
      const execution = db.channelExecutions.find((x) => x.contentVersionId === version.id);
      const channelKind = execution
        ? db.channels.find((c) => c.id === execution.channelId)?.channelKind
        : undefined;
      const policies = db.policies.filter((p) => (plan.policyIds ?? []).includes(p.id));

      const result = aiService.reviewContent(
        {
          title: content.title,
          body: version.body,
          brand,
          classification: content.classification,
          regionCodes,
          regionIds: campaign?.regionIds,
          locale: version.locale,
          channelKind,
          campaignStartDate: campaign?.startDate,
          reviewDate: now.slice(0, 10),
        },
        policies,
        { db },
      );

      const reviewId = nextId([...db.aiReviews], "AIR-");
      reviewsCol.createIn({
        id: reviewId,
        subjectEntity: "Content",
        subjectId: content.id,
        subjectVersionId: version.id,
        findings: result.findings,
        overallSeverity: result.overallSeverity,
        scores: result.scores,
        context: result.context,
        ranAt: now,
        ranByStakeholderId: stakeholderId ?? content.ownerStakeholderId,
        createdAt: now,
        updatedAt: now,
      });

      const blocks = result.findings.filter((f) => f.severity === "block").length;
      const warns = result.findings.filter((f) => f.severity === "warn").length;
      const passes = result.findings.filter((f) => f.severity === "pass").length;

      const runId = bookRun(runPool, {
        agentId: plan.agentId,
        subjectEntity: "Content",
        subjectId: content.id,
        status: "succeeded",
        startedAt: now,
        finishedAt: now,
        outcomeSummary: `Brand & compliance check on ${version.versionNumber} of "${content.title}": ${result.overallSeverity} — ${blocks} block, ${warns} warn.`,
        producedEntity: "AIReview",
        producedId: reviewId,
        ...(stakeholderId ? { triggeredByStakeholderId: stakeholderId } : {}),
        createdAt: now,
        updatedAt: now,
      });

      const notes = [
        `Overall ${result.overallSeverity} — ${plural(blocks, "block finding")}, ${plural(warns, "warn finding")}, ${plural(passes, "rule")} passed.`,
        `Scores — tone ${result.scores.toneScore}, readability ${result.scores.readabilityScore}, compliance ${result.scores.complianceScore}.`,
        blocks > 0
          ? "A block-severity finding holds approval until it is resolved. I have not changed the record's status — that decision stays with the reviewer."
          : "Nothing blocks approval from this run.",
      ];

      return {
        plan,
        created: [
          {
            entity: "AIReview",
            id: reviewId,
            label: `Brand & compliance review of ${version.versionNumber} — ${result.overallSeverity}`,
            to: `/content/${content.id}`,
          },
        ],
        runIds: [runId],
        notes,
      };
    },
    [bookRun, db, reviewsCol, stakeholderId],
  );

  const runPlan = useCallback(
    (turnId: number, plan: CopilotActionPlan) => {
      if (ranTurnIds.includes(turnId)) return;
      const content = db.contents.find((c) => c.id === plan.subjectId);
      const now = new Date().toISOString();

      const receipt: CopilotActionReceipt = !content
        ? {
            plan,
            created: [],
            runIds: [],
            notes: [],
            error: `${plan.subjectId} is no longer in the workspace, so nothing was run and nothing was written.`,
          }
        : plan.kind === "draft-variants"
          ? runDraftVariants(plan, content, now)
          : runComplianceReview(plan, content, now);

      setRanTurnIds((prev) => [...prev, turnId]);
      appendAgentTurn(buildActionReceipt(receipt, { role, stakeholderId, page }));

      if (receipt.created.length === 0) {
        toast.error(`${plan.label} produced nothing`, {
          description: receipt.error,
        });
      } else {
        toast.success(
          `${plural(receipt.created.length, "record")} written on ${plan.subjectLabel}`,
          {
            description: `Open it from the copilot rail — ${plural(receipt.runIds.length, "run")} recorded in the agent ledger.`,
          },
        );
      }
    },
    [
      appendAgentTurn,
      db.contents,
      page,
      ranTurnIds,
      role,
      runComplianceReview,
      runDraftVariants,
      stakeholderId,
    ],
  );

  /* -- Rail plumbing -------------------------------------------------- */

  const goTo = useCallback(
    (to: string) => {
      // The rail is the point: it stays open across the route change. On a
      // phone it covers the page it just navigated to, so there it steps aside.
      if (isMobile) setOpen(false);
      navigate(to);
    },
    [isMobile, navigate],
  );

  // On a phone the rail is full-bleed; following a link should reveal the page.
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile, pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, open]);

  const starters = startersFor(page);

  return (
    <>
      <button
        type="button"
        aria-label="Ask MarCom copilot"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:w-8 max-md:justify-center max-md:px-0",
          open
            ? "border-primary/30 bg-primary/10 text-primary"
            : "bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="max-md:hidden">Ask MarCom</span>
      </button>

      {open &&
        createPortal(
          <aside
            // Docked below the topbar on a real screen, so the search, scope
            // switchers and identity menu stay reachable while it is open;
            // full-bleed on a phone, where there is no room to share.
            className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-border bg-background shadow-xl sm:top-14 sm:w-[420px]"
            aria-label="MarCom copilot"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
                  Ask MarCom
                </p>
                <p className="text-xs text-muted-foreground">
                  Answering as {currentUser.name} · {role}. Answers cover the
                  whole workspace, not the topbar scope filter.
                </p>
                {/* Page awareness, stated rather than implied. */}
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <FileText className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  {pageRecordLabel && page.id ? (
                    <span className="break-words">
                      Reading{" "}
                      <span className="text-foreground">{pageRecordLabel}</span>{" "}
                      ({page.id}) — "this" means this record
                    </span>
                  ) : (
                    <span className="break-words">
                      No record open on {page.path} — name what you are asking
                      about
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close copilot"
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Conversation */}
            <div
              ref={logRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
              role="log"
              aria-live="polite"
              aria-label="Copilot conversation"
            >
              {turns.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Ask about the work in flight"
                  hint="Approvals, launch dates, campaign risk, budget and ROI, policy blocks, brand guidelines, crisis status, asset rights. Every answer is derived from records in this workspace and cites them — and on a content record I can draft variants or run the brand & compliance check, which writes records you can open."
                  className="px-4 py-8"
                />
              ) : (
                turns.map((turn) =>
                  turn.kind === "user" ? (
                    <div key={turn.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {turn.text}
                      </p>
                    </div>
                  ) : (
                    <AgentBubble
                      key={turn.id}
                      answer={turn.answer}
                      ran={ranTurnIds.includes(turn.id)}
                      onNavigate={goTo}
                      onRun={(plan) => runPlan(turn.id, plan)}
                    />
                  ),
                )
              )}
            </div>

            {/* Starter prompts — route-aware, so they only offer what this
                page can actually answer or produce. */}
            <div className="shrink-0 border-t px-4 pt-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Try asking
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => ask(starter)}
                    className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer */}
            <form
              className="shrink-0 px-4 pb-2 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
            >
              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(draft);
                    }
                  }}
                  placeholder="Ask about approvals, risk, budget, policy…"
                  aria-label="Ask the MarCom copilot a question"
                  className="h-9 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 shrink-0 px-3"
                  disabled={draft.trim() === ""}
                  aria-label="Send question"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </form>

            <p className="shrink-0 px-4 pb-4 text-[11px] leading-relaxed text-muted-foreground">
              The copilot answers from this workspace's data only — it never
              invents records. Anything it writes is a draft, carries its
              provenance, and is booked in the agent ledger.
            </p>
          </aside>,
          document.body,
        )}
    </>
  );
}
