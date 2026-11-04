import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Lightbulb, Plus, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getSeedDB } from "@/data/seed";
import { TODAY } from "@/data/selectors";
import type { Brief, Campaign, Idea } from "@/data/types";
import { aiService } from "@/services/ai";
import { useCollection } from "@/store/DataStore";
import { useRole, type AppRole } from "@/lib/rbac";
import {
  IDEA_CRITERIA,
  SOURCE_CREDIBILITY,
  scoreIdea,
  scoreOrigin,
  type ScorableIdea,
  type ScoreOrigin,
} from "@/lib/ideaScoring";
import { agencyScopeForRole } from "@/lib/agencyScope";
import {
  PROMOTABLE_IDEA_STATUSES,
  PROMOTE_ROLES,
} from "@/lib/ideaPromotion";
import { useScope } from "@/lib/scope";
import { fmtCurrency } from "@/lib/format";
import { lifecycleStageFor } from "@/lib/lifecycle";
import { originOf, proposedCount } from "@/data/selectors/originSelectors";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { LifecycleStepper } from "@/components/marcomm/LifecycleStepper";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { StrategyPanel } from "@/components/marcomm/StrategyPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ideaInScope(
  idea: Idea,
  scope: { brandId?: string; businessUnitId?: string; regionId?: string },
): boolean {
  if (scope.brandId && idea.brandId !== scope.brandId) return false;
  if (scope.businessUnitId && idea.businessUnitId !== scope.businessUnitId) return false;
  if (scope.regionId && idea.regionId !== scope.regionId) return false;
  return true;
}

/**
 * The campaign-launch workflow shipped in the governance seed — read off the
 * ACTIVE demo pack, so a promoted campaign is never stamped with a workflow id
 * that belongs to a different pack.
 */
const CAMPAIGN_LAUNCH_WORKFLOW_ID =
  getSeedDB().workflows.find((w) => w.appliesTo === "Campaign")?.id ?? "WF-002";

interface PromoteForm {
  name: string;
  objective: string;
  budget: string;
}

/** Proposed-vs-authored list filter (item 1). */
type OriginFilter = "all" | "proposed" | "authored";

/* ------------------------------------------------------------------ */
/* Capture — the New idea intake                                       */
/* ------------------------------------------------------------------ */

/**
 * Roles allowed to capture a new idea.
 *
 * Wider than `PROMOTE_ROLES` on purpose: writing an idea down is not a
 * commitment of budget, and every marketing persona runs the workshops and
 * customer conversations ideas come out of. Deciding one becomes a campaign is
 * the gated act, and that gate already exists.
 *
 * Excluded, and why: Agency User (blueprint hard-scopes agencies to their
 * assigned campaigns, and this page only ever shows them ideas that already
 * produced one), Executive and Legal/Compliance Reviewer (oversight personas —
 * they read and rule on the pipeline rather than feed it).
 */
const CAPTURE_ROLES: readonly AppRole[] = [
  "CMO",
  "Campaign Manager",
  "Corporate Comms Manager",
  "Content Manager",
  "Brand Manager",
  "PR Manager",
  "Internal Comms Manager",
  "Platform Admin",
];

/**
 * The source picker offers exactly the sources the rubric scores, read off the
 * rubric itself and ordered by credibility.
 *
 * Typing a free-text source would let a user hit the "unrecognised source"
 * floor without ever being told such a floor exists — the picker cannot
 * silently cost someone points for a word choice.
 */
const SOURCE_OPTIONS: readonly string[] = Object.keys(SOURCE_CREDIBILITY).sort(
  (a, b) => SOURCE_CREDIBILITY[b] - SOURCE_CREDIBILITY[a],
);

const sourceLabel = (source: string): string =>
  source.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

interface CaptureForm {
  title: string;
  description: string;
  source: string;
  brandId: string;
  businessUnitId: string;
  regionId: string;
}

const EMPTY_CAPTURE: CaptureForm = {
  title: "",
  description: "",
  source: SOURCE_OPTIONS[0] ?? "workshop",
  brandId: "",
  businessUnitId: "",
  regionId: "",
};

/* ------------------------------------------------------------------ */
/* Score breakdown                                                     */
/* ------------------------------------------------------------------ */

/** One criterion row: what it is worth, what this idea earned, and off what. */
function CriteriaTable({ idea }: { idea: ScorableIdea }) {
  const score = scoreIdea(idea);
  return (
    <div className="space-y-2">
      {score.criteria.map((c) => (
        <div key={c.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            {/* The rationale lives in the title attribute rather than on the
                row: five criteria each with a sentence of justification would
                bury the numbers the popover exists to show. */}
            <span
              className="text-xs font-medium"
              title={IDEA_CRITERIA.find((d) => d.key === c.key)?.rationale}
            >
              {c.label}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              <span className="font-medium text-foreground">
                {c.points.toFixed(1)}
              </span>
              {" / "}
              {c.weight}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(c.ratio * 100)}%` }}
            />
          </div>
          <div className="text-[11px] leading-tight text-muted-foreground">
            {c.detail}
          </div>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t pt-2 text-xs font-medium">
        <span>Rubric composite</span>
        <span className="tabular-nums">{score.total} / 100</span>
      </div>
    </div>
  );
}

/**
 * The score cell — the number, where it came from, and the criteria behind it.
 *
 * A seeded row shows its shipped number and labels the rubric result as a
 * comparison; a captured row shows the rubric composite and the breakdown *is*
 * the number. See the header comment in src/lib/ideaScoring.ts for why the two
 * are never merged.
 */
function ScoreCell({ idea, origin }: { idea: Idea; origin: ScoreOrigin }) {
  const rubric = scoreIdea(idea);
  const delta = rubric.total - idea.score;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ml-auto flex flex-col items-end rounded px-1 py-0.5 text-right hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Score ${idea.score} (${origin}) — show the criteria breakdown`}
        >
          <span className="tabular-nums">{idea.score}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {origin === "seeded" ? "seeded" : "rubric"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium">Score breakdown</div>
            {origin === "seeded" ? (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">{idea.score}</span>{" "}
                is a hand-authored score that shipped with this idea — the rubric
                did not produce it and does not overwrite it. Below is what the
                rubric <em>would</em> score it today:{" "}
                <span className="font-medium text-foreground">{rubric.total}</span>
                {delta === 0
                  ? ", the same number."
                  : `, ${Math.abs(delta)} ${delta > 0 ? "higher" : "lower"}.`}
              </p>
            ) : (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">{idea.score}</span>{" "}
                is the rubric composite below, computed from this idea&rsquo;s own
                fields when it was captured.
              </p>
            )}
          </div>
          <CriteriaTable idea={idea} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function inferCampaignType(idea: Idea): Campaign["campaignType"] {
  const text = `${idea.title} ${idea.description}`.toLowerCase();
  if (/employee|internal/.test(text)) return "internal";
  if (/launch|new product|unveil/.test(text)) return "product-launch";
  if (/season|holiday|summer|autumn|winter|spring|clearance/.test(text)) return "seasonal";
  if (/thought|report|whitepaper|insights/.test(text)) return "thought-leadership";
  return "always-on";
}

export default function IdeationHub() {
  const db = getSeedDB();
  const navigate = useNavigate();
  const { role } = useRole();
  // Agency users are hard-scoped to their agency's assigned campaigns
  // (blueprint) — no market/competitor intelligence, and only ideas that
  // produced one of those campaigns.
  const agencyScope = agencyScopeForRole(db, role);
  const { brandId, businessUnitId, regionId, setScope } = useScope();
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  /* Global search links here as `/ideas?id=<IDE-…>`. There is no idea detail
     sheet to open, so the row is highlighted and scrolled to — the result
     behaves like the link to a record it presents itself as, rather than
     dropping the user at the top of an unfiltered list. */
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get("id");
  useEffect(() => {
    if (!focusId) return;
    document
      .getElementById(`idea-${focusId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId]);
  const [proposalIdea, setProposalIdea] = useState<Idea | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureForm, setCaptureForm] = useState<CaptureForm>(EMPTY_CAPTURE);
  const [promoteIdea, setPromoteIdea] = useState<Idea | null>(null);
  const [promoteForm, setPromoteForm] = useState<PromoteForm>({
    name: "",
    objective: "",
    budget: "",
  });

  const ideasCol = useCollection<Idea>("ideas", getSeedDB().ideas);
  const briefsCol = useCollection<Brief>("briefs", getSeedDB().briefs);
  const campaignsCol = useCollection<Campaign>("campaigns", getSeedDB().campaigns);

  const canPromote = PROMOTE_ROLES.includes(role);
  const canCapture = CAPTURE_ROLES.includes(role);

  /**
   * The ids the dataset shipped. Membership decides whether a row's number is
   * a hand-authored seed score or a rubric composite — read off `getSeedDB()`
   * (the shipped seed) and not off `ideasCol.records` (seed + everything
   * captured this session), which is the whole distinction.
   */
  const seededIdeaIds = useMemo(
    () => new Set(getSeedDB().ideas.map((i) => i.id)),
    [],
  );

  const proposal = proposalIdea ? aiService.proposeCampaign(proposalIdea, { db }) : null;
  const proposalAudience = proposal
    ? db.audiences.find((a) => a.id === proposal.audienceId)
    : undefined;
  const proposalChannelNames = proposal
    ? proposal.channels.map(
        (cid) => db.channels.find((c) => c.id === cid)?.name ?? cid,
      )
    : [];

  const agencyIdeas = ideasCol.records.filter(
    (i) =>
      !agencyScope ||
      (i.promotedToCampaignId !== undefined &&
        agencyScope.campaignIds.has(i.promotedToCampaignId)),
  );
  const scopedIdeas = agencyIdeas
    .filter((i) => ideaInScope(i, { brandId, businessUnitId, regionId }))
    .slice()
    .sort((a, b) => b.score - a.score);

  const scopeActive = Boolean(brandId || businessUnitId || regionId);
  const clearScope = (): void =>
    setScope({ brandId: undefined, businessUnitId: undefined, regionId: undefined });

  // Origin is derived provenance: an idea reads as proposed only when an agent
  // actually produced it, so this is zero until that happens.
  const proposedInScope = proposedCount(
    db,
    "Idea",
    scopedIdeas.map((i) => i.id),
  );

  const ideas = scopedIdeas.filter((i) => {
    if (originFilter === "all") return true;
    const isProposed = originOf(db, "Idea", i.id).origin === "agent";
    return originFilter === "proposed" ? isProposed : !isProposed;
  });

  const brandName = (id: string): string =>
    db.brands.find((b) => b.id === id)?.name ?? id;

  /**
   * The live rubric result for whatever is currently typed into the capture
   * dialog. `createdAt` is deliberately omitted: the record does not exist yet,
   * so the Freshness criterion reads "captured now" and the preview equals the
   * score the record will be saved with (the save stamps the demo clock, whose
   * age in days is 0).
   */
  const capturePreview = scoreIdea(captureForm);

  const openCapture = (): void => {
    // Prefill from the top-bar scope: if the user is already looking at one
    // brand's world, the idea they are writing down almost certainly belongs to
    // it, and Scope is 20 points of the rubric.
    setCaptureForm({
      ...EMPTY_CAPTURE,
      brandId: brandId ?? "",
      businessUnitId: businessUnitId ?? "",
      regionId: regionId ?? "",
    });
    setCaptureOpen(true);
  };

  const confirmCapture = (): void => {
    // The dataset's fixed clock, matching the promote path below — a wall-clock
    // stamp would put the new idea outside the seed's date universe and make it
    // score differently from the preview the user just approved.
    const now = `${TODAY}T00:00:00.000Z`;
    const scored = scoreIdea({ ...captureForm, createdAt: now });

    const newId = ideasCol.createIn(
      {
        title: captureForm.title.trim(),
        description: captureForm.description.trim(),
        source: captureForm.source,
        score: scored.total,
        // "Scored", not "Draft": the rubric ran at capture and the row displays
        // a real composite. Storing Draft would claim the idea has no score
        // while showing one — the seed reserves Draft for exactly that case
        // (IDE-006 carries score 0), and the promote gate reads this status.
        status: "Scored",
        brandId: captureForm.brandId,
        businessUnitId: captureForm.businessUnitId,
        regionId: captureForm.regionId,
        createdAt: now,
        updatedAt: now,
      },
      "IDE-",
    );

    setCaptureOpen(false);
    toast.success(`Idea captured — rubric scored it ${scored.total}/100`, {
      description: `${newId} · ${captureForm.title.trim()}`,
      action: {
        label: "Open idea",
        onClick: () => navigate(`/ideas/${newId}`),
      },
    });
  };

  const openPromote = (idea: Idea): void => {
    const p = aiService.proposeCampaign(idea, { db });
    setPromoteForm({
      name: p.name,
      objective: p.objective,
      budget: String(p.budgetEstimate),
    });
    setPromoteIdea(idea);
  };

  const confirmPromote = (): void => {
    if (!promoteIdea) return;
    const idea = promoteIdea;
    // Anchor all derived dates to the dataset's fixed TODAY, not the wall clock,
    // so promoted campaigns land inside the seed's date universe.
    const now = `${TODAY}T00:00:00.000Z`;
    const start = new Date(`${TODAY}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() + 30);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 90);
    const toIso = (d: Date): string => d.toISOString().slice(0, 10);
    const budget = Number(promoteForm.budget);
    const ownerStakeholderId =
      db.stakeholders.find((s) => s.role === role)?.id ?? db.stakeholders[0]?.id ?? "";

    const newId = campaignsCol.createIn(
      {
        name: promoteForm.name.trim() || idea.title,
        campaignType: inferCampaignType(idea),
        status: "Draft",
        classification: "Internal",
        ideaId: idea.id,
        brandId: idea.brandId,
        businessUnitId: idea.businessUnitId,
        regionIds: [idea.regionId],
        budgetAllocation: Number.isFinite(budget) && budget > 0 ? Math.round(budget) : 0,
        ownerStakeholderId,
        startDate: toIso(start),
        endDate: toIso(end),
        kpiIds: [],
        workflowId: CAMPAIGN_LAUNCH_WORKFLOW_ID,
        createdAt: now,
        updatedAt: now,
      },
      "CMP-",
    );

    // The objective the user edited belongs on a Brief — Campaign has no such
    // field, and dropping it would make the dialog input a lie.
    const objective = promoteForm.objective.trim();
    if (objective) {
      briefsCol.createIn(
        {
          title: `${promoteForm.name.trim() || idea.title} — campaign brief`,
          objective,
          keyMessages: [],
          campaignId: newId,
          authorStakeholderId: ownerStakeholderId,
          status: "Draft",
          createdAt: now,
          updatedAt: now,
        },
        "BRF-",
      );
    }

    ideasCol.updateIn(idea.id, {
      status: "Promoted",
      promotedToCampaignId: newId,
      updatedAt: now,
    });

    setPromoteIdea(null);
    toast.success("Idea promoted — campaign created as draft", {
      description: `${newId} · ${promoteForm.name.trim() || idea.title}`,
      action: {
        label: "View campaign",
        onClick: () => navigate(`/campaigns/${newId}`),
      },
    });
  };

  /**
   * Why the ideas list is empty, and what would fill it — read off the real
   * record counts at each filtering step.
   */
  const renderIdeasEmptyState = () => {
    if (ideasCol.records.length === 0) {
      return (
        <EmptyState
          icon={Lightbulb}
          title="No ideas captured yet"
          hint="Ideas are scored before they appear here, and a scored idea is what a campaign can be promoted from. None has been captured."
          action={
            canCapture
              ? { label: "Capture the first idea", onClick: openCapture }
              : undefined
          }
        />
      );
    }

    if (agencyScope && agencyIdeas.length === 0) {
      return (
        <EmptyState
          icon={Lightbulb}
          title="No ideas behind your agency's campaigns"
          hint={`Ideas reach this list only once they have been promoted into a campaign assigned to ${
            agencyScope.agencyName ?? "your agency"
          }. None of those campaigns records an originating idea.`}
        />
      );
    }

    if (scopeActive && scopedIdeas.length === 0) {
      return (
        <EmptyState
          icon={Lightbulb}
          title="No ideas in this scope"
          hint={`${agencyIdeas.length} ideas exist, but none carries the brand, business unit and region currently selected in the top bar.`}
          action={{ label: "Clear scope filters", onClick: clearScope }}
        />
      );
    }

    return (
      <EmptyState
        icon={Lightbulb}
        title={
          originFilter === "proposed"
            ? "Nothing proposed awaiting review"
            : "Every idea here was proposed by an agent"
        }
        hint={
          originFilter === "proposed"
            ? `All ${scopedIdeas.length} ideas in scope were authored by a person. A row lands here when an agent produces one and nobody has accepted it yet.`
            : `All ${scopedIdeas.length} ideas in scope were produced by an agent and are still awaiting review.`
        }
        action={{ label: "Show all origins", onClick: () => setOriginFilter("all") }}
      />
    );
  };

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Ideation hub"
        description="Scored campaign ideas and their promotion status"
        actions={
          <div className="flex items-center gap-2">
            {proposedInScope > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {proposedInScope} proposed awaiting review
              </span>
            )}
            {canCapture && (
              <Button size="sm" onClick={openCapture}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                New idea
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="ideas">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="ideas">Ideas</TabsTrigger>
            {/*
              Market intelligence moved to its own Understand-stage page
              (/market); this tab keeps the authored half — positioning,
              messaging and strategy alignment.
            */}
            {!agencyScope && <TabsTrigger value="strategy">GTM strategy</TabsTrigger>}
          </TabsList>
          {/*
            The origin filter appears once the list actually holds an
            agent-proposed idea. Origin is real provenance, so before that the
            filter could only ever return the same list.
          */}
          {proposedInScope > 0 && (
            <Select
              value={originFilter}
              onValueChange={(v) => setOriginFilter(v as OriginFilter)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Origin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All origins</SelectItem>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="authored">Authored</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="ideas" className="mt-4">
          {ideas.length === 0 ? (
            renderIdeasEmptyState()
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Idea</TableHead>
                      {/* The header states the rule the cells then apply
                          per-row, so the "seeded"/"rubric" tag under each
                          number is not an unexplained piece of jargon. */}
                      <TableHead
                        className="w-24 text-right"
                        title="Ideas captured in the app are scored by the rubric; ideas that shipped with the dataset keep their hand-authored score. Open a score to see the criteria."
                      >
                        Score
                      </TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-36">Brand</TableHead>
                      <TableHead>Promoted to</TableHead>
                      <TableHead className="w-56 text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ideas.map((idea) => {
                      const promoted = idea.promotedToCampaignId
                        ? campaignsCol.records.find(
                            (c) => c.id === idea.promotedToCampaignId,
                          )
                        : undefined;
                      const promotable =
                        canPromote && PROMOTABLE_IDEA_STATUSES.includes(idea.status);
                      const origin = originOf(db, "Idea", idea.id);
                      return (
                        <TableRow
                          key={idea.id}
                          id={`idea-${idea.id}`}
                          className={cn(
                            proposedRowClass(origin.origin),
                            idea.id === focusId && "bg-accent",
                          )}
                        >
                          <TableCell>
                            {/* The title is the row's primary cell and the way
                                into /ideas/:id — a real link, so it is keyboard
                                reachable and cmd-click opens a new tab. An
                                onClick on the row would be neither. */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/ideas/${idea.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {idea.title}
                              </Link>
                              <OriginChip info={origin} />
                            </div>
                            <div
                              className="mt-0.5 line-clamp-1 text-xs text-muted-foreground"
                              title={idea.description}
                            >
                              {idea.description}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <ScoreCell
                              idea={idea}
                              origin={scoreOrigin(idea.id, seededIdeaIds)}
                            />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={idea.status} />
                            <BlockerLine
                              blocker={blockerFor(db, "Idea", idea.id, idea.status)}
                              className="mt-1 flex max-w-[15rem]"
                            />
                          </TableCell>
                          <TableCell className="text-sm">{brandName(idea.brandId)}</TableCell>
                          <TableCell>
                            {promoted ? (
                              <Link
                                to={`/campaigns/${promoted.id}`}
                                className="text-sm text-primary hover:underline"
                              >
                                {promoted.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {PROMOTABLE_IDEA_STATUSES.includes(idea.status)
                                  ? "Not promoted yet"
                                  : `Not promotable while ${idea.status}`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Both labels are nowrap, so on one line the cell's
                                min-content width overran the w-56 the header
                                asks for and took it out of the Idea column.
                                Wrapping lets the column hold its declared size. */}
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                title="AI campaign proposal"
                                onClick={() => setProposalIdea(idea)}
                              >
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                                AI proposal
                              </Button>
                              {promotable && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  title="Promote to campaign"
                                  onClick={() => openPromote(idea)}
                                >
                                  <Rocket className="mr-1 h-3.5 w-3.5" />
                                  Promote to campaign
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {!agencyScope && (
          <TabsContent value="strategy" className="mt-4">
            <StrategyPanel />
          </TabsContent>
        )}
      </Tabs>

      <Dialog
        open={captureOpen}
        onOpenChange={(open) => {
          if (!open) setCaptureOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              New idea
            </DialogTitle>
            <DialogDescription>
              Captured ideas are scored by the rubric on the right as you type —
              the number that lands in the list is the one shown there, and it is
              made of the five criteria beside it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
            <div className="space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="idea-title">Title</Label>
                <Input
                  id="idea-title"
                  value={captureForm.title}
                  placeholder="What is the idea, in one line?"
                  onChange={(e) =>
                    setCaptureForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idea-description">Description</Label>
                <Textarea
                  id="idea-description"
                  rows={6}
                  value={captureForm.description}
                  placeholder="What would run, who it is for, and what result it is meant to produce."
                  onChange={(e) =>
                    setCaptureForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idea-source">Where it came from</Label>
                <Select
                  value={captureForm.source}
                  onValueChange={(v) => setCaptureForm((f) => ({ ...f, source: v }))}
                >
                  <SelectTrigger id="idea-source">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {sourceLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="idea-brand">Brand</Label>
                  <Select
                    value={captureForm.brandId}
                    onValueChange={(v) =>
                      setCaptureForm((f) => ({ ...f, brandId: v }))
                    }
                  >
                    <SelectTrigger id="idea-brand">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {db.brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idea-bu">Business unit</Label>
                  <Select
                    value={captureForm.businessUnitId}
                    onValueChange={(v) =>
                      setCaptureForm((f) => ({ ...f, businessUnitId: v }))
                    }
                  >
                    <SelectTrigger id="idea-bu">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {db.businessUnits.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idea-region">Region</Label>
                  <Select
                    value={captureForm.regionId}
                    onValueChange={(v) =>
                      setCaptureForm((f) => ({ ...f, regionId: v }))
                    }
                  >
                    <SelectTrigger id="idea-region">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {db.regions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.code} — {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* The rubric, live. Showing the score only after saving would put
                the user back where the seeded scores left them: a number with
                no visible cause. */}
            <div className="space-y-3 rounded-md border bg-muted/30 p-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Rubric score
                </div>
                <div className="text-2xl font-semibold tabular-nums">
                  {capturePreview.total}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / 100
                  </span>
                </div>
              </div>
              <CriteriaTable idea={captureForm} />
              <p className="text-[11px] leading-snug text-muted-foreground">
                This is the whole rubric — no other input affects the number.
                Status and promotion are deliberately excluded, so a score can
                never justify itself with the decision it is meant to inform.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCaptureOpen(false)}>
              Cancel
            </Button>
            {/* Scope is required to save because `Idea` types brand, business
                unit and region as non-optional — a record saved without them
                would be malformed, not merely low-scoring. So the Scope
                criterion is always full marks on a captured idea; it earns its
                20 points on records that reach the rubric another way (the
                recompute shown against seeded rows, and anything an agent
                proposes with a partial scope). */}
            <Button
              onClick={confirmCapture}
              disabled={
                !captureForm.title.trim() ||
                !captureForm.brandId ||
                !captureForm.businessUnitId ||
                !captureForm.regionId
              }
            >
              Capture idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={proposalIdea !== null}
        onOpenChange={(open) => {
          if (!open) setProposalIdea(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI campaign proposal
            </DialogTitle>
            <DialogDescription>
              Generated from &ldquo;{proposalIdea?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>

          {proposal && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Name</div>
                <div className="mt-0.5 font-medium">{proposal.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Objective</div>
                <p className="mt-0.5 text-muted-foreground">{proposal.objective}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Recommended channels
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {proposalChannelNames.map((name) => (
                    <StatusBadge key={name} status="queued">
                      {name}
                    </StatusBadge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Audience</div>
                  <div className="mt-0.5">
                    {proposalAudience?.name ?? proposal.audienceId}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Budget estimate
                  </div>
                  <div className="mt-0.5 tabular-nums">
                    {fmtCurrency(proposal.budgetEstimate)}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Estimated ROI
                </div>
                {proposal.estimatedRoi !== null ? (
                  <div className="mt-0.5">
                    <span
                      className={
                        "rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums " +
                        (proposal.estimatedRoi >= 0
                          ? "border-success/20 bg-success/10 text-success"
                          : "border-destructive/20 bg-destructive/10 text-destructive")
                      }
                    >
                      {proposal.estimatedRoi >= 0 ? "+" : ""}
                      {Math.round(proposal.estimatedRoi * 100)}%
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">{proposal.roiNote}</p>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <span className="text-muted-foreground">Not enough history</span>
                    <p className="mt-1 text-xs text-muted-foreground">{proposal.roiNote}</p>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Suggested KPIs
                </div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                  {proposal.kpiSuggestions.map((kpi) => (
                    <li key={kpi}>{kpi}</li>
                  ))}
                </ul>
              </div>
              <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                Preview only — use Promote to campaign to create the draft.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalIdea(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={promoteIdea !== null}
        onOpenChange={(open) => {
          if (!open) setPromoteIdea(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Promote to campaign
            </DialogTitle>
            <DialogDescription>
              Creates a draft campaign from &ldquo;{promoteIdea?.title}&rdquo; — brand,
              business unit, and region are inherited from the idea.
            </DialogDescription>
            {/* Indicator only: a stage link here would navigate away and
                abandon the promotion the user is part-way through. */}
            {promoteIdea && (
              <LifecycleStepper
                stage={lifecycleStageFor("Idea", promoteIdea.status)}
                interactive={false}
              />
            )}
          </DialogHeader>

          {promoteIdea && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="promote-name">Campaign name</Label>
                <Input
                  id="promote-name"
                  value={promoteForm.name}
                  onChange={(e) =>
                    setPromoteForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promote-objective">Objective</Label>
                <Textarea
                  id="promote-objective"
                  rows={3}
                  value={promoteForm.objective}
                  onChange={(e) =>
                    setPromoteForm((f) => ({ ...f, objective: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="promote-budget">Budget estimate</Label>
                  <Input
                    id="promote-budget"
                    type="number"
                    min={0}
                    step={5000}
                    value={promoteForm.budget}
                    onChange={(e) =>
                      setPromoteForm((f) => ({ ...f, budget: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Scope</div>
                  <div className="mt-1.5 text-sm">
                    {brandName(promoteIdea.brandId)}
                    <span className="text-muted-foreground">
                      {" · "}
                      {db.businessUnits.find((b) => b.id === promoteIdea.businessUnitId)
                        ?.name ?? promoteIdea.businessUnitId}
                      {" · "}
                      {db.regions.find((r) => r.id === promoteIdea.regionId)?.code ??
                        promoteIdea.regionId}
                    </span>
                  </div>
                </div>
              </div>
              <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                The idea stays linked — the campaign records its origin.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteIdea(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPromote} disabled={!promoteForm.name.trim()}>
              Create draft campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
