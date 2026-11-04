/**
 * Routed record page for a media contact — /pr/contacts/:id.
 *
 * Replaces the detail Sheet that used to open over the PR & media list. A
 * sheet has no URL: a journalist could not be linked to a colleague,
 * bookmarked, opened in a new tab, or returned to with the back button.
 *
 * Two things this page is deliberate about:
 *
 *  1. SCOPE. The coverage figures here are scoped by the same brand /
 *     business-unit / region rule the Coverage tab applies, via the shared
 *     `scopedCoverage` used by both — so the two screens can never report
 *     different numbers for the same contact under the same filters. The
 *     scope in force is named on the page, and when it hides items the page
 *     says how many and where to find them, rather than quietly showing a
 *     smaller list than the relationship chips in the header count.
 *
 *  2. RELATIONSHIP HISTORY. There isn't any. A `MediaContact` carries a single
 *     `lastInteractionAt` timestamp — not a log of touchpoints, not a channel,
 *     not a note. So this page shows that one timestamp and says what it is.
 *     Rendering a timeline here would be inventing events.
 */

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Newspaper, Users } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import type { CoverageItem } from "@/data/types";
import { canSeeNav, useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { useScope } from "@/lib/scope";
import { fmtCompact, fmtDate, fmtPct, fmtStamp } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n";

import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Chip } from "@/components/marcomm/Chip";
import {
  relationshipTone,
  relativeToToday,
  scopedCoverage,
  sentimentTone,
} from "@/lib/coverage";

const BACK_TO = "/pr";
const BACK_LABEL = "PR & media";

export default function MediaContactDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useLiveDB();
  const { role } = useRole();
  const { brandId, businessUnitId, regionId } = useScope();
  // PR Manager reaches this page but not the governance center — linking the
  // crisis line there would land them on the restricted-area notice.
  const canOpenGovernance = canSeeNav(role, "governance");

  // Agency users are hard-scoped to their agency's assigned work and have no
  // PR or crisis visibility at all (blueprint). The nav and <RequireRole> keep
  // them off /pr; a detail route is a second door to the same records, so it
  // is closed here too. Checked BEFORE the record is looked up: answering
  // "not found" for a missing id and "not available" for a real one would let
  // an out-of-scope user enumerate the contact list by watching the wording.
  const agencyScope = agencyScopeForRole(db, role);

  const contact = db.mediaContacts.find((c) => c.id === id);

  /* Every coverage item that names this contact, and the subset the current
     brand / BU / region filters leave visible. The scoped list drives every
     figure on the page; the difference between the two is stated, never
     silently dropped. */
  const { allItems, scopedItems } = useMemo(() => {
    if (!id) return { allItems: [] as CoverageItem[], scopedItems: [] as CoverageItem[] };
    const mine = (item: CoverageItem) => item.mediaContactId === id;
    return {
      allItems: db.coverageItems
        .filter(mine)
        .slice()
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt, DEFAULT_LOCALE)),
      scopedItems: scopedCoverage(db, { brandId, businessUnitId, regionId }).filter(mine),
    };
  }, [db, id, brandId, businessUnitId, regionId]);

  if (agencyScope) {
    return (
      <RecordNotFound
        icon={Users}
        noun="media contact"
        id={id}
        backTo="/dashboard"
        backLabel="dashboard"
        outOfScope
        scopeHint={agencyScope.agencyName ?? "your agency"}
      />
    );
  }

  if (!contact) {
    return (
      <RecordNotFound
        icon={Users}
        noun="media contact"
        id={id}
        backTo={BACK_TO}
        backLabel={BACK_LABEL}
      />
    );
  }

  const campaignById = new Map(db.campaigns.map((c) => [c.id, c]));
  const regionOf = (rid: string): string =>
    db.regions.find((r) => r.id === rid)?.name ?? rid;

  /* -- The scope caption, built from the filters actually set ---------- */
  const activeFilters: string[] = [];
  if (brandId) {
    activeFilters.push(db.brands.find((b) => b.id === brandId)?.name ?? brandId);
  }
  if (businessUnitId) {
    activeFilters.push(
      db.businessUnits.find((b) => b.id === businessUnitId)?.name ?? businessUnitId,
    );
  }
  if (regionId) activeFilters.push(regionOf(regionId));
  const scopeActive = activeFilters.length > 0;
  const hiddenCount = allItems.length - scopedItems.length;

  /* -- Figures, all off the scoped list -------------------------------- */
  const totalReach = scopedItems.reduce((sum, item) => sum + item.reach, 0);
  const positiveShare =
    scopedItems.length === 0
      ? 0
      : scopedItems.filter((item) => item.sentiment === "Positive").length /
        scopedItems.length;

  /* -- Campaigns this contact's coverage lands against ----------------- */
  const campaignCounts = new Map<string, number>();
  let crisisAdjacent = 0;
  for (const item of scopedItems) {
    if (item.campaignId) {
      campaignCounts.set(item.campaignId, (campaignCounts.get(item.campaignId) ?? 0) + 1);
    } else {
      crisisAdjacent += 1;
    }
  }
  const campaignsCovered = [...campaignCounts.entries()]
    .map(([campaignId, count]) => ({
      campaign: campaignById.get(campaignId),
      campaignId,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const facts: { label: string; value: string }[] = [
    { label: "Outlet", value: contact.outlet },
    { label: "Beat", value: contact.beat },
    { label: "Region", value: regionOf(contact.regionId) },
    { label: "Last interaction", value: relativeToToday(contact.lastInteractionAt) },
    { label: "On record since", value: fmtDate(contact.createdAt) },
    { label: "Email", value: contact.email },
  ];

  const scopeLine =
    allItems.length === 0
      ? "No coverage item names this contact, so there is nothing for the brand, business unit or region filters to narrow."
      : scopeActive
        ? `Scoped to ${activeFilters.join(" · ")} — the same brand, business unit and region filters the Coverage tab applies. ${
            hiddenCount > 0
              ? `${hiddenCount} of this contact's ${allItems.length} coverage item${
                  allItems.length === 1 ? "" : "s"
                } ${hiddenCount === 1 ? "is" : "are"} outside it and ${
                  hiddenCount === 1 ? "is" : "are"
                } not counted below; the relationship chips above count all ${allItems.length}.`
              : `All ${allItems.length} of this contact's coverage item${
                  allItems.length === 1 ? "" : "s"
                } fall inside it.`
          }`
        : `No brand, business unit or region filter is active, so these are all ${allItems.length} coverage item${
            allItems.length === 1 ? "" : "s"
          } linked to this contact.`;

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="MediaContact"
        id={contact.id}
        title={contact.name}
        description={`${contact.outlet} · ${contact.beat}`}
        // A media contact has no lifecycle status in the state taxonomy —
        // relationship strength is a stored attribute, not a state, so it is a
        // chip here and never a StatusBadge. `blockerFor` still runs: it
        // resolves any approval raised against this record, which is the only
        // way a contact can be waiting on someone.
        blocker={blockerFor(db, "MediaContact", contact.id)}
        backTo={BACK_TO}
        backLabel={BACK_LABEL}
        actions={
          <Chip tone={relationshipTone[contact.relationship]}>
            {contact.relationship} relationship
          </Chip>
        }
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 md:grid-cols-3 lg:grid-cols-6">
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

      <Tabs defaultValue="coverage">
        <TabsList>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="relationship">Relationship</TabsTrigger>
        </TabsList>

        {/* ---------------- Coverage ---------------- */}
        <TabsContent value="coverage" className="space-y-4">
          <p className="text-xs text-muted-foreground">{scopeLine}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <KpiTile
              label="Coverage items"
              value={scopedItems.length}
              sub={
                scopeActive ? "in the current scope" : "linked to this contact"
              }
            />
            <KpiTile
              label="Reach"
              value={fmtCompact(totalReach)}
              sub={`summed across ${scopedItems.length} item${
                scopedItems.length === 1 ? "" : "s"
              }`}
            />
            <KpiTile
              label="Positive sentiment"
              value={scopedItems.length === 0 ? "—" : fmtPct(positiveShare)}
              sub={
                scopedItems.length === 0
                  ? "no items to rate"
                  : "share of these items rated positive"
              }
            />
          </div>

          {scopedItems.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title={
                allItems.length === 0
                  ? "No coverage attributed to this contact"
                  : "No coverage from this contact in the current scope"
              }
              hint={
                allItems.length === 0
                  ? `Coverage is attributed to a journalist by naming them on the item, and no coverage item names ${contact.name}. Items from ${contact.outlet} written by someone else sit under that colleague instead.`
                  : `All ${allItems.length} of this contact's coverage item${
                      allItems.length === 1 ? " falls" : "s fall"
                    } outside ${activeFilters.join(" · ")}. Clear the brand, business unit or region filters in the top bar to see ${
                      allItems.length === 1 ? "it" : "them"
                    }.`
              }
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Headline</TableHead>
                      <TableHead className="w-40">Outlet</TableHead>
                      <TableHead className="w-48">Campaign</TableHead>
                      <TableHead className="w-28">Published</TableHead>
                      <TableHead className="w-28">Sentiment</TableHead>
                      <TableHead className="w-24 text-right">Reach</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scopedItems.map((item) => {
                      const campaign = item.campaignId
                        ? campaignById.get(item.campaignId)
                        : undefined;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.headline}</TableCell>
                          <TableCell className="text-sm">{item.outlet}</TableCell>
                          <TableCell className="text-sm">
                            {campaign ? (
                              <Link
                                to={`/campaigns/${campaign.id}`}
                                className="text-primary hover:underline"
                              >
                                {campaign.name}
                              </Link>
                            ) : canOpenGovernance ? (
                              <Link to="/governance">
                                <Chip tone="warning">Crisis watch</Chip>
                              </Link>
                            ) : (
                              <span title="Not linked to a campaign — tracked in the governance center">
                                <Chip tone="warning">Crisis watch</Chip>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {fmtDate(item.publishedAt)}
                          </TableCell>
                          <TableCell>
                            <Chip tone={sentimentTone[item.sentiment]}>
                              {item.sentiment}
                            </Chip>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {fmtCompact(item.reach)}
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

        {/* ---------------- Relationship ---------------- */}
        <TabsContent value="relationship" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Relationship record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Strength
                  </div>
                  <div className="mt-1">
                    <Chip tone={relationshipTone[contact.relationship]}>
                      {contact.relationship}
                    </Chip>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Last interaction
                  </div>
                  <div className="mt-1 text-sm">
                    {relativeToToday(contact.lastInteractionAt)}
                    <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                      {fmtStamp(contact.lastInteractionAt)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Record updated
                  </div>
                  <div className="mt-1 text-sm tabular-nums">{fmtStamp(contact.updatedAt)}</div>
                </div>
              </div>
              {/* The honest limit of this record. One timestamp is not a
                  history, and drawing a timeline from it would be fabricating
                  the events between the dates. */}
              <p className="border-t pt-3 text-xs text-muted-foreground">
                A contact carries one{" "}
                <span className="font-medium">last interaction</span> timestamp,
                not a log of touchpoints. What that interaction was — a call, a
                briefing, an email — and everything before it is not recorded,
                so there is no interaction history to show. The coverage list is
                the only dated trail this contact has.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Campaigns covered</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {campaignsCovered.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {scopedItems.length === 0
                    ? `A campaign is reached from this contact through the coverage they wrote, and ${
                        allItems.length === 0
                          ? "no coverage item names them"
                          : `none of their ${allItems.length} coverage item${
                              allItems.length === 1 ? "" : "s"
                            } falls inside ${activeFilters.join(" · ")}`
                      }.`
                    : `None of this contact's ${scopedItems.length} coverage item${
                        scopedItems.length === 1 ? " is" : "s are"
                      } linked to a campaign — ${
                        scopedItems.length === 1 ? "it is" : "they are"
                      } tracked as crisis-adjacent instead.`}
                </p>
              ) : (
                <ul className="space-y-2">
                  {campaignsCovered.map(({ campaign, campaignId, count }) => (
                    <li
                      key={campaignId}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      {campaign ? (
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="truncate text-sm text-primary hover:underline"
                        >
                          {campaign.name}
                        </Link>
                      ) : (
                        <span className="truncate text-sm text-muted-foreground">
                          {campaignId}
                        </span>
                      )}
                      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {count} coverage item{count === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {crisisAdjacent > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <span>
                    {crisisAdjacent} further item
                    {crisisAdjacent === 1 ? "" : "s"} in this scope{" "}
                    {crisisAdjacent === 1 ? "belongs" : "belong"} to no campaign
                  </span>
                  {canOpenGovernance ? (
                    <Link to="/governance">
                      <Chip tone="warning">Crisis watch</Chip>
                    </Link>
                  ) : (
                    <span title="Not linked to a campaign — tracked in the governance center">
                      <Chip tone="warning">Crisis watch</Chip>
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordAuditTrail entity="MediaContact" id={contact.id} />
    </RecordDetailPage>
  );
}
