import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Download, Megaphone, Plus, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { getSeedDB } from "@/data/seed";
import { useLiveDB } from "@/data/useLiveDB";
import { campaignsInScope } from "@/data/selectors";
import { DEMO_NOW_ISO, TODAY } from "@/data/selectors/campaignSelectors";
import { originOf, proposedCount } from "@/data/selectors/originSelectors";
import { blockerFor, blockerSummary } from "@/data/selectors/blockerSelectors";
import type { Campaign, CampaignStatus } from "@/data/types";
import { useCollection } from "@/store/DataStore";
import { useScope } from "@/lib/scope";
import { useRole } from "@/lib/rbac";
import { agencyScopeForRole } from "@/lib/agencyScope";
/* The campaign authoring rules live on the detail page, which owns the
   lifecycle; the list imports them rather than restating them, so "what a new
   campaign may be" and "what an existing one may become" can never diverge. */
import {
  CampaignFormFields,
  DraftErrors,
  campaignDraftFields,
  canWriteCampaigns,
  validateCampaignDraft,
  type CampaignDraft,
} from "@/pages/CampaignDetail";
import { fmtCurrency, fmtDateShort } from "@/lib/format";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DEFAULT_LOCALE } from "@/lib/i18n";

const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "Draft",
  "Planned",
  "In Approval",
  "Approved",
  "Live",
  "Paused",
  "Completed",
  "Archived",
  "Cancelled",
];

/** Proposed-vs-authored filter (UI change instructions item 1). */
type OriginFilter = "all" | "proposed" | "authored";

const ORIGIN_FILTER_LABELS: Record<OriginFilter, string> = {
  all: "All",
  proposed: "Proposed",
  authored: "Authored",
};

interface ListFilters {
  statuses: string[];
  search: string;
  /** Optional so views saved before this filter existed still apply cleanly. */
  origin?: OriginFilter;
}

const EMPTY_FILTERS: ListFilters = { statuses: [], search: "", origin: "all" };

/**
 * The campaign workflow shipped in the ACTIVE demo pack's governance seed.
 *
 * Same lookup (and same fallback) as the promote-from-idea flow in
 * IdeationHub: a campaign created here must be governed by the same workflow
 * as one created there, or the approvals it needs would never be raised.
 */
const CAMPAIGN_WORKFLOW_ID =
  getSeedDB().workflows.find((w) => w.appliesTo === "Campaign")?.id ?? "WF-002";

/** Days added to the demo clock for a new campaign's default window. */
const DEFAULT_LEAD_DAYS = 30;
const DEFAULT_RUN_DAYS = 90;

/** `TODAY` plus n days, as an ISO date. */
function isoDaysFromToday(days: number): string {
  const d = new Date(`${TODAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CampaignList() {
  const db = useLiveDB();
  const { brandId, businessUnitId, regionId } = useScope();
  const { role } = useRole();
  // Agency users are hard-scoped to their agency's assigned campaigns
  // (blueprint) — applied before the brand/BU/region scope filters below.
  const agencyScope = agencyScopeForRole(db, role);

  const navigate = useNavigate();
  /* Same collection id the read side overlays, so a campaign created here is
     immediately the record every other surface renders. */
  const campaignsCol = useCollection<Campaign>("campaigns", getSeedDB().campaigns);
  const canAuthor = canWriteCampaigns(role, agencyScope);

  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [viewName, setViewName] = useState("");
  const { views, saveView, applyView, deleteView } = useSavedViews<ListFilters>(
    "campaigns",
    setFilters,
  );

  const campaigns = campaignsInScope(db, { brandId, businessUnitId, regionId })
    .filter((c) => !agencyScope || agencyScope.campaignIds.has(c.id))
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE));

  const search = filters.search.trim().toLowerCase();
  const originFilter: OriginFilter = filters.origin ?? "all";
  const filtered = campaigns.filter((c) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) return false;
    if (search !== "" && !c.name.toLowerCase().includes(search)) return false;
    if (originFilter === "all") return true;
    const isProposed = originOf(db, "Campaign", c.id).origin === "agent";
    return originFilter === "proposed" ? isProposed : !isProposed;
  });

  // Derived from real provenance: a campaign only counts as proposed when an
  // agent produced it and nobody has confirmed it yet.
  const proposed = proposedCount(
    db,
    "Campaign",
    campaigns.map((c) => c.id),
  );

  const brandName = (id: string): string => db.brands.find((b) => b.id === id)?.name ?? id;
  const buName = (id: string): string =>
    db.businessUnits.find((b) => b.id === id)?.name ?? id;
  const regionCodes = (ids: string[]): string =>
    ids.map((id) => db.regions.find((r) => r.id === id)?.code ?? id).join(", ");
  const ownerName = (id: string): string =>
    db.stakeholders.find((s) => s.id === id)?.name ?? id;

  // The scope actually in force, so an empty list can name its own precondition
  // instead of telling the user to widen filters it never identifies.
  const activeScope = [
    brandId ? `brand ${brandName(brandId)}` : null,
    businessUnitId ? `business unit ${buName(businessUnitId)}` : null,
    regionId ? `region ${regionCodes([regionId])}` : null,
  ].filter((part): part is string => part !== null);

  // The filters actually narrowing the list, for the same reason.
  const activeFilters = [
    search !== "" ? `matching "${filters.search.trim()}"` : null,
    filters.statuses.length > 0 ? `with status ${filters.statuses.join(", ")}` : null,
    originFilter === "proposed" ? "proposed by an agent and awaiting review" : null,
    originFilter === "authored" ? "authored by a person" : null,
  ].filter((part): part is string => part !== null);

  const toggleStatus = (status: string, checked: boolean): void => {
    setFilters((prev) => ({
      ...prev,
      statuses: checked
        ? [...prev.statuses, status]
        : prev.statuses.filter((s) => s !== status),
    }));
  };

  /**
   * A new campaign, pre-filled from what the session already implies.
   *
   * Scope wins where it is set: creating a campaign while scoped to a brand
   * and then having it vanish from the list you created it on is the kind of
   * "created an invisible record" behaviour the audit flagged elsewhere. The
   * window is anchored to the pinned demo clock (`TODAY`), never `Date.now()`,
   * so a created campaign lands inside the dataset's date universe and its
   * schedule progress means what every other surface means by it.
   */
  const newDraft = (): CampaignDraft => ({
    name: "",
    campaignType: "product-launch",
    classification: "Internal",
    brandId: brandId ?? db.brands[0]?.id ?? "",
    businessUnitId: businessUnitId ?? db.businessUnits[0]?.id ?? "",
    regionIds: regionId ? [regionId] : [],
    ownerStakeholderId:
      db.stakeholders.find((s) => s.role === role)?.id ?? db.stakeholders[0]?.id ?? "",
    budget: "",
    startDate: isoDaysFromToday(DEFAULT_LEAD_DAYS),
    endDate: isoDaysFromToday(DEFAULT_LEAD_DAYS + DEFAULT_RUN_DAYS),
    kpiIds: [],
  });

  const draftErrors = draft ? validateCampaignDraft(draft) : [];

  const createCampaign = (): void => {
    // Belt and braces against a stale dialog: the button is only rendered for
    // an authoring role, and the write refuses one anyway.
    if (!draft || !canAuthor || draftErrors.length > 0) return;
    const fields = campaignDraftFields(draft);
    const newId = campaignsCol.createIn(
      {
        ...fields,
        /* Every campaign starts at the lifecycle origin. Letting the create
           form pick a status would put a record straight into Live or
           Completed without any of the transitions — and its spend, KPI and
           stage numbers would be describing a history that never happened. */
        status: "Draft",
        workflowId: CAMPAIGN_WORKFLOW_ID,
        createdAt: DEMO_NOW_ISO,
        updatedAt: DEMO_NOW_ISO,
      },
      "CMP-",
    );
    setDraft(null);
    toast.success(`Created draft campaign '${fields.name}'`, {
      description: `${newId} · ${fields.kpiIds.length === 0 ? "no KPIs attached yet" : `${fields.kpiIds.length} KPI${fields.kpiIds.length === 1 ? "" : "s"} attached`}`,
      action: { label: "Open", onClick: () => navigate(`/campaigns/${newId}`) },
    });
  };

  const handleExport = (): void => {
    exportCsv(
      "campaigns.csv",
      filtered.map((c) => ({
        Campaign: c.name,
        Type: c.campaignType,
        Brand: brandName(c.brandId),
        "Business unit": buName(c.businessUnitId),
        Regions: regionCodes(c.regionIds),
        "Start date": c.startDate,
        "End date": c.endDate,
        // Agency users have no budget visibility (blueprint)
        ...(agencyScope ? {} : { Budget: c.budgetAllocation }),
        Owner: ownerName(c.ownerStakeholderId),
        Status: c.status,
      })),
    );
  };

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Campaigns"
        description={
          proposed > 0
            ? `Every campaign in scope, with budget and ownership · ${proposed} proposed awaiting review`
            : "Every campaign in scope, with budget and ownership"
        }
        actions={
          <>
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search campaigns"
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
                {CAMPAIGN_STATUSES.map((status) => (
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Proposed or authored</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={originFilter}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, origin: value as OriginFilter }))
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
            {/* Authoring is gated by role AND by agency scope — an Agency User
                reaches this list through assigned activities, which is read
                access to someone else's campaign, never authorship. */}
            {canAuthor && (
              <Button size="sm" onClick={() => setDraft(newDraft())}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                New campaign
              </Button>
            )}
          </>
        }
      />

      {agencyScope && (
        <p className="text-xs text-muted-foreground">
          Showing records assigned to {agencyScope.agencyName ?? "your agency"}
        </p>
      )}

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns in this scope"
          hint={
            agencyScope
              ? `No campaign is assigned to ${agencyScope.agencyName ?? "your agency"}${
                  activeScope.length > 0 ? ` within ${activeScope.join(", ")}` : ""
                }. Assignment happens when an activity on a campaign is given to the agency.`
              : activeScope.length > 0
                ? `Nothing matches the scope in force (${activeScope.join(", ")}). Widen the brand, business unit, or region filters in the top bar to see more campaigns.`
                : "The database holds no campaigns yet, so there is nothing to scope."
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No campaigns match these filters"
          hint={`None of the ${campaigns.length} campaigns in scope ${
            campaigns.length === 1 ? "is" : "are"
          } ${activeFilters.join(" and ")}.`}
          action={{ label: "Clear filters", onClick: () => setFilters(EMPTY_FILTERS) }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Business unit</TableHead>
                  <TableHead>Regions</TableHead>
                  <TableHead>Dates</TableHead>
                  {!agencyScope && <TableHead className="text-right">Budget</TableHead>}
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-56">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const origin = originOf(db, "Campaign", c.id);
                  const blocker = blockerFor(db, "Campaign", c.id, c.status);
                  return (
                  <TableRow key={c.id} className={proposedRowClass(origin.origin)}>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/campaigns/${c.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                        <OriginChip info={origin} />
                      </span>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {c.campaignType}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{brandName(c.brandId)}</TableCell>
                    <TableCell className="text-sm">{buName(c.businessUnitId)}</TableCell>
                    <TableCell className="text-sm">{regionCodes(c.regionIds)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {fmtDateShort(c.startDate)} – {fmtDateShort(c.endDate)}
                    </TableCell>
                    {!agencyScope && (
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmtCurrency(c.budgetAllocation)}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">{ownerName(c.ownerStakeholderId)}</TableCell>
                    <TableCell>
                      {/* The blocker line needs a DEFINITE max width, not
                          `max-w-full`: a percentage resolves against a cell
                          that auto-layout has already sized to its content, so
                          the `w-56` above was ignored and the column grew to
                          fit the longest blocker string — 435px, pushing 241px
                          of the table off the right edge at 1280. */}
                      <div className="flex min-w-0 flex-col items-start gap-1">
                        <StatusBadge status={c.status} />
                        {blocker && (
                          // Bounding the width makes long blockers ellipsise,
                          // so the full line has to stay readable somewhere.
                          <span className="block max-w-48" title={blockerSummary(blocker)}>
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

      {/* ------------------------------------------------------------ */}
      {/* New campaign                                                  */}
      {/* ------------------------------------------------------------ */}
      <Dialog
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
            <DialogDescription>
              Creates a Draft campaign. It moves through the lifecycle from its own
              page, where the legal transitions are offered.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <>
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <CampaignFormFields
                  db={db}
                  draft={draft}
                  onChange={setDraft}
                  idPrefix="campaign-new"
                />
              </div>
              <DraftErrors errors={draftErrors} />
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              onClick={createCampaign}
              disabled={draft === null || draftErrors.length > 0}
            >
              <Plus className="mr-1 h-4 w-4" />
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
