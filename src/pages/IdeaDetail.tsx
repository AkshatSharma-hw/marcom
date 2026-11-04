/**
 * Routed detail page for one Idea — /ideas/:id.
 *
 * The Ideation hub scores ideas and promotes them, but an idea itself had no
 * address: the row could not be linked, opened in a new tab, or returned to.
 * This is that address. It answers three questions the list cannot:
 *
 *  1. What is the idea, in full? (the list truncates the description to a line)
 *  2. Did it become anything? (the promoted campaign, and that campaign's brief
 *     and content — the point at which the idea stops being an idea)
 *  3. If not, WHY not — stated as the promotion rule the hub actually applies,
 *     read off the same exported constants the hub's Promote button uses, so
 *     the two can never disagree.
 *
 * Every figure is read off the live DB or a selector. Nothing is seeded here.
 */

import { Link, useParams } from "react-router-dom";
import { Lightbulb, Rocket, Sparkles, Target } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { fmtDate, fmtPct, fmtStamp } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import type { AgentRun, Campaign } from "@/data/types";

import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROMOTABLE_IDEA_STATUSES, PROMOTE_ROLES } from "@/lib/ideaPromotion";

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useLiveDB();
  const { role } = useRole();

  /* Agency users reach an idea only through a campaign assigned to them —
     exactly the filter the Ideation hub list applies. A detail page is a new
     way to reach a record; it must not become a way around the scope. */
  const agencyScope = agencyScopeForRole(db, role);
  const idea = db.ideas.find((i) => i.id === id);
  const inAgencyScope =
    !agencyScope ||
    (idea?.promotedToCampaignId !== undefined &&
      agencyScope.campaignIds.has(idea.promotedToCampaignId));

  if (!idea || !inAgencyScope) {
    return (
      <RecordNotFound
        icon={Lightbulb}
        noun="idea"
        id={id}
        backTo="/ideas"
        backLabel="ideas"
        outOfScope={idea !== undefined}
        scopeHint={agencyScope?.agencyName ?? "your agency"}
      />
    );
  }

  const brand = db.brands.find((b) => b.id === idea.brandId);
  const bu = db.businessUnits.find((b) => b.id === idea.businessUnitId);
  const region = db.regions.find((r) => r.id === idea.regionId);

  /* The promoted campaign, resolved from BOTH sides of the link — the same
     rule `strategySelectors.promotedCampaignOf` uses, so this page agrees with
     the GTM strategy tab about which campaign an idea produced. A campaign
     found via the reverse link is still subject to the agency scope. */
  const linked: Campaign | undefined = idea.promotedToCampaignId
    ? db.campaigns.find((c) => c.id === idea.promotedToCampaignId)
    : db.campaigns.find((c) => c.ideaId === idea.id);
  const campaign =
    linked && (!agencyScope || agencyScope.campaignIds.has(linked.id))
      ? linked
      : undefined;

  const strategy = campaign?.strategyId
    ? db.strategies.find((s) => s.id === campaign.strategyId)
    : undefined;

  const briefs = campaign ? db.briefs.filter((b) => b.campaignId === campaign.id) : [];
  const contents = campaign
    ? db.contents.filter((c) => c.campaignId === campaign.id)
    : [];

  /* Provenance. There is no `submittedBy` column on Idea, so the submitter can
     only come from an audit event that records the idea being captured.
     Deliberately NOT "the first person in the audit trail": on a promoted idea
     that person is whoever promoted it, and printing a promoter under
     "Submitted by" would be a quiet lie. No capture event, no name. */
  const captureEvent = db.auditRecords
    .filter(
      (a) =>
        a.entityType === "Idea" &&
        a.entityId === idea.id &&
        /^idea\.(created|captured|submitted)$/.test(a.action),
    )
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at, DEFAULT_LOCALE))[0];
  const submitter = captureEvent
    ? db.stakeholders.find((s) => s.id === captureEvent.actorStakeholderId)
    : undefined;

  /* Scoring runs against this idea — the Planning agent's own record of how
     the score in the facts block was arrived at, including the failures. */
  const runs: AgentRun[] = db.agentRuns
    .filter((r) => r.subjectEntity === "Idea" && r.subjectId === idea.id)
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt, DEFAULT_LOCALE));
  const agentName = (agentId: string): string =>
    db.marcomAgents.find((a) => a.id === agentId)?.name ?? agentId;

  const ideaBlocker = blockerFor(db, "Idea", idea.id, idea.status);

  const statusPromotable = PROMOTABLE_IDEA_STATUSES.includes(idea.status);
  const rolePromotable = PROMOTE_ROLES.includes(role);
  const promotableStatusList = PROMOTABLE_IDEA_STATUSES.join(" or ");

  const facts: { label: string; value: string }[] = [
    { label: "Source", value: idea.source },
    { label: "Score", value: `${idea.score} / 100` },
    { label: "Brand", value: brand?.name ?? idea.brandId },
    { label: "Business unit", value: bu?.name ?? idea.businessUnitId },
    { label: "Region", value: region?.name ?? idea.regionId },
    { label: "Submitted by", value: submitter?.name ?? "Not recorded" },
    { label: "Captured", value: fmtDate(idea.createdAt) },
  ];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="Idea"
        id={idea.id}
        title={idea.title}
        description={idea.source}
        status={idea.status}
        blocker={ideaBlocker}
        backTo="/ideas"
        backLabel="Ideation hub"
      />

      {/* Key facts */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 md:grid-cols-4 lg:grid-cols-7">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {f.label}
              </div>
              <div className="mt-0.5 truncate text-sm" title={f.value}>
                {f.value}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* The idea itself */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Description</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground">{idea.description}</p>
          {!submitter && (
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              &ldquo;Submitted by&rdquo; is not a stored field — it is read from an
              audit event recording the idea being captured. No such event exists for
              this idea, so nobody is named. The full audit trail for the record is at
              the foot of this page.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Promotion — the one relationship that matters on an idea */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Promotion</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {campaign ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="min-w-0">
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {campaign.campaignType}
                    {" · "}
                    <span className="tabular-nums">
                      {fmtDate(campaign.startDate)} – {fmtDate(campaign.endDate)}
                    </span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <StatusBadge status={campaign.status} />
                  <BlockerLine
                    blocker={blockerFor(db, "Campaign", campaign.id, campaign.status)}
                  />
                </span>
              </div>

              {/* What the campaign has produced downstream of the idea */}
              <div className="grid gap-4 border-t pt-3 lg:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Briefs ({briefs.length})
                  </div>
                  {briefs.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Promotion creates a brief only when an objective was written in
                      the promote dialog. None was, so {campaign.name} carries no brief
                      — and nothing downstream can be drafted until one is.
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-2">
                      {briefs.map((b) => (
                        <li
                          key={b.id}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <span className="min-w-0 truncate text-sm">{b.title}</span>
                          <span className="flex flex-col items-end gap-1">
                            <StatusBadge status={b.status} />
                            <BlockerLine
                              blocker={blockerFor(db, "Brief", b.id, b.status)}
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Content ({contents.length})
                  </div>
                  {contents.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {briefs.length === 0
                        ? "Content is drafted from a brief, and this campaign has none yet."
                        : briefs.some((b) => b.status === "Approved")
                          ? "The brief is approved, so drafting can start — nothing has been drafted against it yet."
                          : `Drafting starts from an approved brief, and this campaign's brief is still ${briefs[0].status}.`}
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-2">
                      {contents.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <Link
                            to={`/content/${c.id}`}
                            className="min-w-0 truncate text-sm text-primary hover:underline"
                          >
                            {c.title}
                          </Link>
                          <span className="flex flex-col items-end gap-1">
                            <StatusBadge status={c.status} />
                            <BlockerLine
                              blocker={blockerFor(db, "Content", c.id, c.status)}
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Rocket}
              title={
                statusPromotable ? "Not promoted yet" : `Not promotable while ${idea.status}`
              }
              hint={
                statusPromotable
                  ? `The Ideation hub offers Promote to campaign on an idea whose status is ${promotableStatusList}, and only to these roles: ${PROMOTE_ROLES.join(", ")}. This idea is ${idea.status}${
                      rolePromotable
                        ? `, and you are signed in as ${role} — the action is available on the hub.`
                        : `, but you are signed in as ${role}, so the action is not offered to you.`
                    }`
                  : `Promotion requires a status of ${promotableStatusList}. This idea is ${idea.status}, so the hub offers no Promote action and no campaign exists to link to.`
              }
              actionSlot={
                <Button asChild size="sm" variant="outline">
                  <Link to={`/ideas?id=${idea.id}`}>Open in the Ideation hub</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Strategic alignment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ladders to</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {strategy ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Target className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-medium">{strategy.title}</span>
                <span className="text-xs text-muted-foreground">{strategy.horizon}</span>
              </div>
              {strategy.objectives.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  This strategy records no objectives, so there is nothing for the idea
                  to ladder to beyond the strategy itself.
                </p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {strategy.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              )}
              <p className="border-t pt-2 text-xs text-muted-foreground">
                An idea reaches a strategy through the campaign it was promoted into —
                idea &rarr; {campaign?.name} &rarr; strategy. There is no direct
                idea-to-strategy link in the model.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {campaign
                ? `${campaign.name} ladders to no strategy, so this idea reaches none either. An idea inherits its strategic objective from the campaign it was promoted into; that campaign has no strategy set.`
                : "An idea reaches a strategy only through the campaign it is promoted into. This idea has not been promoted, so it ladders to nothing yet."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scoring runs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Scoring runs ({runs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No agent run recorded against this idea. The score of {idea.score} was
              entered with the record rather than produced by a scoring run, so there
              is no working to show.
            </p>
          ) : (
            <ul className="space-y-3">
              {runs.map((run) => (
                <li key={run.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                      {agentName(run.agentId)}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {run.outcomeSummary ??
                      run.error ??
                      `Run is ${run.status} — it has reported no outcome.`}
                  </p>
                  <div className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                    {fmtStamp(run.startedAt)}
                    {run.confidence !== undefined && (
                      <> · confidence {fmtPct(run.confidence)}</>
                    )}
                    {run.ruleSetVersion && <> · {run.ruleSetVersion}</>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <RecordAuditTrail entity="Idea" id={idea.id} />
    </RecordDetailPage>
  );
}
