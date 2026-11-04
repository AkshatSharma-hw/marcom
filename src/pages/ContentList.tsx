import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Download, FileText, SearchX, X } from "lucide-react";
import { useLiveDB } from "@/data/useLiveDB";
import type { Content, ContentStatus } from "@/data/types";
import { originOf, proposedCount } from "@/data/selectors/originSelectors";
import { blockerFor, blockerSummary } from "@/data/selectors/blockerSelectors";
import { useScope } from "@/lib/scope";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { exportCsv } from "@/lib/csv";
import { useSavedViews } from "@/hooks/useSavedViews";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_LOCALE, localeName } from "@/lib/i18n";

const CONTENT_STATUSES: ContentStatus[] = [
  "Draft",
  "In Review",
  "Rework",
  "Approved",
  "Published",
  "Retired",
  "Archived",
  "Discarded",
];

/**
 * Proposed vs authored (UI change instructions item 1). Origin is derived from
 * the version provenance chain, so "Proposed" only ever selects rows an agent
 * genuinely produced and nobody has confirmed yet.
 */
type OriginFilter = "all" | "proposed" | "authored";

const ORIGIN_FILTER_LABELS: Record<OriginFilter, string> = {
  all: "All",
  proposed: "Proposed",
  authored: "Authored",
};

interface ListFilters {
  statuses: string[];
  search: string;
  /** Optional so saved views written before this filter existed still apply. */
  origin?: OriginFilter;
}

const EMPTY_FILTERS: ListFilters = { statuses: [], search: "", origin: "all" };

export default function ContentList() {
  const db = useLiveDB();
  const { brandId, businessUnitId, regionId, localeId } = useScope();
  const { role } = useRole();
  // Agency users only see content on their agency's assigned campaigns
  // (blueprint hard scoping) — applied before the topbar scope filter.
  const agencyScope = agencyScopeForRole(db, role);

  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [viewName, setViewName] = useState("");
  const { views, saveView, applyView, deleteView } = useSavedViews<ListFilters>(
    "content",
    setFilters,
  );

  /* Language is a property of the versions, not of the content record: a
     content item is "in" a language when it holds at least one version written
     in it. Collected once here rather than scanned per row. */
  const contentIdsInLocale = new Set(
    localeId
      ? db.contentVersions.filter((v) => v.locale === localeId).map((v) => v.contentId)
      : [],
  );

  const inScope = (content: Content): boolean => {
    if (brandId && content.brandId !== brandId) return false;
    if (localeId && !contentIdsInLocale.has(content.id)) return false;
    if (businessUnitId || regionId) {
      // BU and region live on the linked campaign; content without a campaign
      // cannot match a BU/region filter.
      const campaign = content.campaignId
        ? db.campaigns.find((c) => c.id === content.campaignId)
        : undefined;
      if (!campaign) return false;
      if (businessUnitId && campaign.businessUnitId !== businessUnitId) return false;
      if (regionId && !campaign.regionIds.includes(regionId)) return false;
    }
    return true;
  };

  const contents = db.contents
    .filter((c) => !agencyScope || agencyScope.contentIds.has(c.id))
    .filter(inScope)
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt, DEFAULT_LOCALE));

  const search = filters.search.trim().toLowerCase();
  const originFilter: OriginFilter = filters.origin ?? "all";
  const filtered = contents.filter((c) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) return false;
    if (search !== "" && !c.title.toLowerCase().includes(search)) return false;
    if (originFilter !== "all") {
      const isProposed = originOf(db, "Content", c.id).origin === "agent";
      if (originFilter === "proposed" ? !isProposed : isProposed) return false;
    }
    return true;
  });

  /** Agent-proposed rows still awaiting a reviewer, across everything in scope. */
  const proposed = proposedCount(
    db,
    "Content",
    contents.map((c) => c.id),
  );

  const brandName = (id: string): string => db.brands.find((b) => b.id === id)?.name ?? id;
  /* Counts the versions the language scope actually admits, so the number in
     the row can never contradict the filter that selected the row. */
  const versionCount = (contentId: string): number =>
    db.contentVersions.filter(
      (v) => v.contentId === contentId && (!localeId || v.locale === localeId),
    ).length;

  const toggleStatus = (status: string, checked: boolean): void => {
    setFilters((prev) => ({
      ...prev,
      statuses: checked
        ? [...prev.statuses, status]
        : prev.statuses.filter((s) => s !== status),
    }));
  };

  /* Empty states name the precondition that is actually holding them empty
     (UI change instructions item 8), derived from the live scope and filters —
     never a generic "nothing here". */
  const scopeLabels = [
    brandId ? db.brands.find((b) => b.id === brandId)?.name : undefined,
    businessUnitId
      ? db.businessUnits.find((u) => u.id === businessUnitId)?.name
      : undefined,
    regionId ? db.regions.find((r) => r.id === regionId)?.name : undefined,
    localeId ? localeName(localeId) : undefined,
  ].filter((label): label is string => Boolean(label));

  /** Versions written in the scoped language, anywhere in the workspace. */
  const localeVersionCount = localeId
    ? db.contentVersions.filter((v) => v.locale === localeId).length
    : 0;

  const activeFilterLabels = [
    filters.statuses.length > 0 ? `status ${filters.statuses.join(", ")}` : undefined,
    search !== "" ? `search "${filters.search.trim()}"` : undefined,
    originFilter !== "all"
      ? `origin ${ORIGIN_FILTER_LABELS[originFilter].toLowerCase()}`
      : undefined,
  ].filter((label): label is string => Boolean(label));

  const handleExport = (): void => {
    exportCsv(
      "content.csv",
      filtered.map((c) => ({
        Title: c.title,
        Type: c.contentType,
        Brand: brandName(c.brandId),
        Versions: versionCount(c.id),
        Status: c.status,
      })),
    );
  };

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Content studio"
        // The proposed count is only shown when there genuinely is something
        // waiting — a "0 proposed" line is noise, not information.
        description={
          proposed > 0
            ? `All content items in scope, with version history · ${proposed} proposed awaiting review`
            : "All content items in scope, with version history"
        }
        actions={
          <>
            {/* The filter matches titles only, so the placeholder names titles
                rather than implying it searches bodies as well. */}
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search titles"
              className="h-9 w-52"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Status
                  {filters.statuses.length > 0 && ` (${filters.statuses.length})`}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {CONTENT_STATUSES.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filters.statuses.includes(status)}
                    onCheckedChange={(checked) => toggleStatus(status, checked)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Origin
                  {originFilter !== "all" && `: ${ORIGIN_FILTER_LABELS[originFilter]}`}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by origin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={originFilter}
                  onValueChange={(v) =>
                    setFilters((prev) => ({ ...prev, origin: v as OriginFilter }))
                  }
                >
                  {(Object.keys(ORIGIN_FILTER_LABELS) as OriginFilter[]).map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {ORIGIN_FILTER_LABELS[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Saved views
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Saved views</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {views.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No saved views yet
                  </div>
                ) : (
                  views.map((view) => (
                    <DropdownMenuItem
                      key={view.name}
                      onSelect={() => applyView(view.name)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{view.name}</span>
                      <button
                        type="button"
                        aria-label={`Delete view ${view.name}`}
                        className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteView(view.name);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <div
                  className="flex items-center gap-2 p-2"
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Input
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="View name"
                    className="h-8"
                  />
                  <Button
                    size="sm"
                    disabled={viewName.trim() === ""}
                    onClick={() => {
                      saveView(viewName, filters);
                      setViewName("");
                    }}
                  >
                    Save
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </>
        }
      />

      {agencyScope && (
        <p className="text-xs text-muted-foreground">
          Showing records assigned to {agencyScope.agencyName ?? "your agency"}
        </p>
      )}

      {/* The language scope changes what a row means, so it says so: only
          content holding a version in that language is listed, and the version
          count is that language's versions rather than all of them. */}
      {localeId && (
        <p className="text-xs text-muted-foreground">
          Language scope {localeName(localeId)} — listing content that holds at least
          one version in this language; version counts cover this language only.
        </p>
      )}

      {contents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content in this scope"
          hint={
            scopeLabels.length > 0
              ? `The top bar scopes this list to ${scopeLabels.join(" · ")}, and no content matches.${localeId ? ` Content only counts as ${localeName(localeId)} when it holds a version written in that language, and ${localeVersionCount === 0 ? "nothing has been localized into it yet — request localization from a content item to create the first version" : `${localeVersionCount} ${localeVersionCount === 1 ? "version is" : "versions are"} in it, all on content this view does not reach`}.` : ""} ${db.contents.length} content ${db.contents.length === 1 ? "item exists" : "items exist"} in total — widen the scope in the top bar to reach them.`
              : agencyScope
                ? `Content is limited to campaigns assigned to ${agencyScope.agencyName ?? "your agency"}, and none of those campaigns has content yet.`
                : "No content records exist yet. Content is created against a campaign, so start from a campaign and add a content item to it."
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No content matches these filters"
          hint={
            activeFilterLabels.length > 0
              ? `${contents.length} content ${contents.length === 1 ? "item is" : "items are"} in scope, but none match ${activeFilterLabels.join(" · ")}.`
              : `${contents.length} content ${contents.length === 1 ? "item is" : "items are"} in scope but none are shown — clear the filters above.`
          }
          action={{ label: "Clear filters", onClick: () => setFilters(EMPTY_FILTERS) }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-36">Brand</TableHead>
                  <TableHead className="w-24 text-right">Versions</TableHead>
                  <TableHead className="w-64">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const origin = originOf(db, "Content", c.id);
                  const blocker = blockerFor(db, "Content", c.id, c.status);
                  return (
                    <TableRow key={c.id} className={proposedRowClass(origin.origin)}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/content/${c.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {c.title}
                          </Link>
                          <OriginChip info={origin} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.contentType}</TableCell>
                      <TableCell className="text-sm">{brandName(c.brandId)}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {versionCount(c.id)}
                      </TableCell>
                      <TableCell>
                        {/* A definite width, not `max-w-full`: a percentage
                            resolves against a cell auto-layout has already
                            sized to its content, so `w-64` above was ignored
                            and the column grew to 433px. w-64 minus the cell's
                            p-4 padding is the width the column actually
                            declares. */}
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          <StatusBadge status={c.status} />
                          {blocker && (
                            // Bounding the width makes long blockers ellipsise,
                            // so the full line has to stay readable somewhere.
                            <span className="block max-w-56" title={blockerSummary(blocker)}>
                              <BlockerLine blocker={blocker} className="max-w-full" />
                            </span>
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
    </div>
  );
}
