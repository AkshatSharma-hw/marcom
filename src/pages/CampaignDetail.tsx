import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  ChevronDown,
  Lightbulb,
  Megaphone,
  Pencil,
  Send,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getSeedDB } from "@/data/seed";
import { useLiveDB } from "@/data/useLiveDB";
import {
  campaignAgencies,
  campaignCommunications,
  campaignHealth,
  campaignKpiIds,
  campaignSpend,
  campaignTeam,
  kpiAttainment,
} from "@/data/selectors";
import { DEMO_NOW_ISO, TODAY } from "@/data/selectors/campaignSelectors";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { originOf } from "@/data/selectors/originSelectors";
import type {
  Approval,
  Campaign,
  CampaignStatus,
  CampaignType,
  Classification,
  SeedDB,
  Stakeholder,
  WorkflowStage,
} from "@/data/types";
import { useCollection } from "@/store/DataStore";
import { canSeeNav, useRole, type AppRole } from "@/lib/rbac";
import { agencyScopeForRole, type AgencyScope } from "@/lib/agencyScope";
import { lifecycleStageFor } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";
import { fmtCurrency, fmtDate, fmtPct, plural } from "@/lib/format";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { LifecycleStepper } from "@/components/marcomm/LifecycleStepper";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { RelationshipChips } from "@/components/marcomm/RelationshipChips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ================================================================== */
/* Campaign authoring — who may write, what may change, and when       */
/* ================================================================== */

/*
 * This block is the single definition of campaign create/edit/transition
 * legality. It lives here rather than in each screen because the list creates
 * campaigns and the detail page edits them: two copies of "which status may
 * follow which" would drift, and the first symptom would be a button that
 * writes a state the rest of the app cannot explain. CampaignList imports
 * these; so does src/test/campaign-mutations.test.ts, which is why every
 * function below is pure — no db, no hooks, no clock of its own.
 */

/**
 * Roles allowed to author campaigns (create, edit, and move through the
 * lifecycle).
 *
 * Deliberately the same three roles as `PROMOTE_ROLES` in
 * src/lib/ideaPromotion.ts: promoting an idea already CREATES a campaign, so
 * anything narrower here would mean a role could bring a campaign into
 * existence and then be unable to fix the record it just made. Agency User is
 * absent by design — the blueprint hard-scopes agencies to *reading* the
 * campaigns they execute activities for, and `canWriteCampaigns` rejects any
 * agency-scoped session outright as well, so the exclusion does not depend on
 * this list staying correct.
 */
export const CAMPAIGN_WRITE_ROLES: readonly AppRole[] = [
  "CMO",
  "Campaign Manager",
  "Platform Admin",
];

/**
 * Whether the signed-in session may mutate campaigns at all.
 *
 * Three independent gates, all of which must pass:
 *  1. no agency scope — an Agency User sees a campaign only because one of its
 *     activities was assigned to them, which is read access to someone else's
 *     record, never authorship of it;
 *  2. `canSeeNav(role, "campaigns")` — a role that cannot open the section
 *     must not gain a write path through a deep link;
 *  3. membership of CAMPAIGN_WRITE_ROLES.
 */
export function canWriteCampaigns(
  role: AppRole,
  agencyScope: AgencyScope | null,
): boolean {
  if (agencyScope !== null) return false;
  if (!canSeeNav(role, "campaigns")) return false;
  return CAMPAIGN_WRITE_ROLES.includes(role);
}

/**
 * The legal successor states for each campaign status.
 *
 * Every status in `CampaignStatus` is a key, so adding one to the union fails
 * the build here instead of silently becoming unreachable — which is exactly
 * how the app arrived at seeded Live/Completed/Cancelled/Archived campaigns
 * that no UI could produce (docs/MARKET_READINESS_AUDIT_PASS2.md).
 *
 * Two shapes are load-bearing:
 *
 *  - `In Approval` cannot reach `Approved` from this page. Approval decisions
 *    are written by `useApprovalDecisions` (Approved → 'Approved', rejected or
 *    changes-requested → 'Planned'), and letting the campaign owner self-approve
 *    from the record would bypass the segregation-of-duties rule that hook
 *    enforces. Withdrawing back to `Planned` is offered instead, and only while
 *    no approval is actually pending — see `transitionBlockReason`.
 *  - `Archived` is terminal, and `Completed`/`Cancelled` lead only to it. A
 *    finished campaign's spend, KPI attainment and lifecycle placement are all
 *    read as history; reopening one would silently restate closed numbers.
 */
export const CAMPAIGN_TRANSITIONS: Readonly<
  Record<CampaignStatus, readonly CampaignStatus[]>
> = {
  Draft: ["Planned", "Cancelled"],
  Planned: ["In Approval", "Draft", "Cancelled"],
  "In Approval": ["Planned", "Cancelled"],
  Approved: ["Live", "Planned", "Cancelled"],
  Live: ["Paused", "Completed", "Cancelled"],
  Paused: ["Live", "Completed", "Cancelled"],
  Completed: ["Archived"],
  Cancelled: ["Archived"],
  Archived: [],
};

/** The statuses a campaign in `status` may move to, in menu order. */
export function allowedTransitions(status: CampaignStatus): readonly CampaignStatus[] {
  return CAMPAIGN_TRANSITIONS[status] ?? [];
}

export interface TransitionGuardInput {
  /** ISO date the campaign starts. */
  startDate: string;
  /** ISO date the campaign ends. */
  endDate: string;
  /** True when an approval on this campaign is still open. */
  hasPendingApproval: boolean;
  /**
   * Whether an approval can actually be routed — see `campaignApprovalRoute`.
   * Defaults to true so pure tests of the other rules need not supply it.
   */
  approvalRouteAvailable?: boolean;
  /** Demo clock date; defaults to the pinned TODAY. Never `Date.now()`. */
  today?: string;
}

/**
 * Why a transition is refused, or null when it is allowed.
 *
 * Legality is more than the map: the derived surfaces (`campaignHealth`'s
 * schedule progress, the prorated burn on this page, the lifecycle stepper)
 * all read status *against dates*, so a state that contradicts the window
 * produces numbers the page then has to apologise for — a Live campaign that
 * has not started reads 0% elapsed while claiming to be running. The date
 * guards below keep status and window mutually consistent, and the fix is
 * always available to the user: edit the window, then transition.
 */
export function transitionBlockReason(
  from: CampaignStatus,
  to: CampaignStatus,
  input: TransitionGuardInput,
): string | null {
  if (!allowedTransitions(from).includes(to)) {
    return `${from} → ${to} is not a legal transition`;
  }
  const today = input.today ?? TODAY;

  // An open approval owns this campaign's status until it is decided. Writing
  // 'Planned' or 'Cancelled' underneath it would leave the approval pending
  // against a record that has moved on, which is the exact dangling state the
  // blocker line is designed to surface.
  if (from === "In Approval" && input.hasPendingApproval) {
    return "an approval is still open — decide or withdraw it in the approvals inbox first";
  }

  // Submitting for approval RAISES the approval (see `applyTransition`). If
  // the dataset has no stage or no eligible approver, the campaign would land
  // in 'In Approval' with nothing to decide — the dead state the withdraw path
  // above exists to rescue records from. Refuse the move instead of creating
  // one more of them.
  if (to === "In Approval" && input.approvalRouteAvailable === false) {
    return "no approver is configured for this campaign's workflow, so an approval cannot be raised";
  }

  if (to === "Live" && input.startDate > today) {
    return `the campaign window starts on ${input.startDate} — edit the start date to go live before then`;
  }
  if (to === "Completed" && input.startDate > today) {
    return `the campaign has not started yet (starts ${input.startDate}) — cancel it instead of completing it`;
  }
  return null;
}

/**
 * The record patch a transition writes.
 *
 * Completing a campaign whose window still runs closes the window on the demo
 * clock rather than leaving `endDate` in the future. A Completed campaign with
 * an unfinished window is a record every derived surface disagrees about: the
 * stepper puts it in Measure, `campaignHealth` reports schedule progress below
 * 100%, and the burn bar keeps prorating an in-progress activity against time
 * that has not elapsed. Because `transitionBlockReason` refuses `Completed`
 * for a campaign that has not started, `today` here is always ≥ `startDate`,
 * so this can never write the end-before-start record
 * src/test/detail-facts.test.ts forbids. The UI states the date change in the
 * confirmation before it happens — nothing is rewritten silently.
 */
export function campaignTransitionPatch(
  campaign: Pick<Campaign, "startDate" | "endDate">,
  to: CampaignStatus,
  today: string = TODAY,
): Partial<Campaign> {
  const patch: Partial<Campaign> = { status: to, updatedAt: DEMO_NOW_ISO };
  if (to === "Completed" && campaign.endDate > today) patch.endDate = today;
  return patch;
}

/**
 * Where a campaign's approval goes when it is submitted, or null when it
 * cannot be routed at all.
 *
 * `Approved` is deliberately absent from this page's transition map because
 * `useApprovalDecisions` owns it — but that hook can only write it if an
 * approval EXISTS, and nothing in the app ever raised one for a campaign that
 * was not hand-seeded. That is why a promoted campaign could never leave Draft
 * for anything but Cancelled. Submitting now creates the approval, so the
 * governed path (submit → decide in the inbox → Approved → Live) is one a user
 * can actually walk.
 *
 * The campaign's own `workflowId` picks the stage — same workflow the
 * governance screens route against — and the first stage with an eligible
 * approver wins. The campaign owner is never eligible: `useApprovalDecisions`
 * refuses a decision by the subject's owner (segregation of duties), so
 * routing to them would manufacture an approval nobody can decide.
 */
export function campaignApprovalRoute(
  db: SeedDB,
  campaign: Campaign,
): { stage: WorkflowStage; approver: Stakeholder } | null {
  const stages = db.workflowStages
    .filter((s) => s.workflowId === campaign.workflowId)
    .slice()
    .sort((a, b) => a.order - b.order);
  for (const stage of stages) {
    const approver = db.stakeholders.find(
      (s) => s.role === stage.assigneeRole && s.id !== campaign.ownerStakeholderId,
    );
    if (approver) return { stage, approver };
  }
  return null;
}

/** The editable shape of a campaign — everything except its status and lineage. */
export interface CampaignDraft {
  name: string;
  campaignType: CampaignType;
  classification: Classification;
  brandId: string;
  businessUnitId: string;
  regionIds: string[];
  ownerStakeholderId: string;
  /** Raw input text, so an unparseable budget is a validation error not a NaN. */
  budget: string;
  /** ISO date (yyyy-mm-dd). */
  startDate: string;
  /** ISO date (yyyy-mm-dd). */
  endDate: string;
  kpiIds: string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A budget input as a number, or null when it is not a usable amount. */
export function parseBudget(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

/**
 * Everything wrong with a draft, as sentences the dialog can print.
 *
 * The end-before-start rule is the one with teeth: `detail-facts.test.ts`
 * asserts across all four demo packs that no campaign ends before it starts,
 * and an authoring path that could write one would turn a data invariant into
 * a flaky test. Required foreign keys are checked as *present*, not as
 * resolvable — the dialogs only ever offer ids that exist in the live db, so a
 * presence check is the honest boundary for a pure function.
 */
export function validateCampaignDraft(draft: CampaignDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim() === "") errors.push("Name is required.");
  if (draft.brandId === "") errors.push("Brand is required.");
  if (draft.businessUnitId === "") errors.push("Business unit is required.");
  if (draft.regionIds.length === 0) errors.push("At least one region is required.");
  if (draft.ownerStakeholderId === "") errors.push("Owner is required.");
  if (parseBudget(draft.budget) === null) {
    errors.push("Budget must be a number of 0 or more.");
  }
  const startOk = ISO_DATE.test(draft.startDate) && !Number.isNaN(Date.parse(draft.startDate));
  const endOk = ISO_DATE.test(draft.endDate) && !Number.isNaN(Date.parse(draft.endDate));
  if (!startOk) errors.push("Start date must be a date (yyyy-mm-dd).");
  if (!endOk) errors.push("End date must be a date (yyyy-mm-dd).");
  if (startOk && endOk && Date.parse(draft.endDate) < Date.parse(draft.startDate)) {
    errors.push("End date cannot be before the start date.");
  }
  return errors;
}

/**
 * The draft as the persisted fields of a Campaign.
 *
 * Callers add `id`, `status` and lineage; this owns the type coercion so the
 * list's create and the detail page's save cannot disagree about, say, whether
 * the budget was rounded. Call only on a draft that validated — the `?? 0` is
 * a type-level fallback, not a second opinion about a bad input.
 */
export function campaignDraftFields(
  draft: CampaignDraft,
): Omit<Campaign, "id" | "status" | "workflowId" | "createdAt" | "updatedAt"> {
  return {
    name: draft.name.trim(),
    campaignType: draft.campaignType,
    classification: draft.classification,
    brandId: draft.brandId,
    businessUnitId: draft.businessUnitId,
    regionIds: [...draft.regionIds],
    budgetAllocation: parseBudget(draft.budget) ?? 0,
    ownerStakeholderId: draft.ownerStakeholderId,
    startDate: draft.startDate,
    endDate: draft.endDate,
    kpiIds: [...draft.kpiIds],
  };
}

/** A campaign as an editable draft. */
export function draftFromCampaign(campaign: Campaign): CampaignDraft {
  return {
    name: campaign.name,
    campaignType: campaign.campaignType,
    classification: campaign.classification,
    brandId: campaign.brandId,
    businessUnitId: campaign.businessUnitId,
    regionIds: [...campaign.regionIds],
    ownerStakeholderId: campaign.ownerStakeholderId,
    budget: String(campaign.budgetAllocation),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    kpiIds: [...campaign.kpiIds],
  };
}

const CAMPAIGN_TYPES: CampaignType[] = [
  "product-launch",
  "seasonal",
  "always-on",
  "internal",
  "thought-leadership",
];

const CLASSIFICATIONS: Classification[] = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
];

/**
 * The field set shared by "New campaign" (list) and "Edit campaign" (detail).
 *
 * One component rather than two similar forms: the create and edit paths must
 * offer exactly the same fields, or a campaign gains a property at birth that
 * can never be corrected — which is the shape of the defect this work exists
 * to fix (`kpiIds: []` written by the promote flow, uneditable ever after).
 * Status is deliberately absent: it moves only through the transition menu,
 * where the legality map applies.
 */
export function CampaignFormFields({
  db,
  draft,
  onChange,
  idPrefix,
}: {
  db: SeedDB;
  draft: CampaignDraft;
  onChange: (next: CampaignDraft) => void;
  /** Distinguishes label/input ids when both dialogs exist in one tree. */
  idPrefix: string;
}) {
  const set = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]): void =>
    onChange({ ...draft, [key]: value });

  const toggleId = (key: "regionIds" | "kpiIds", id: string, on: boolean): void =>
    set(
      key,
      on ? [...draft[key], id] : draft[key].filter((existing) => existing !== id),
    );

  return (
    <div className="space-y-4 py-1">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          placeholder="e.g. Volt5 launch — EMEA"
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={draft.campaignType}
            onValueChange={(v) => set("campaignType", v as CampaignType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Classification</Label>
          <Select
            value={draft.classification}
            onValueChange={(v) => set("classification", v as Classification)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Classification" />
            </SelectTrigger>
            <SelectContent>
              {CLASSIFICATIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Select value={draft.brandId} onValueChange={(v) => set("brandId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Brand" />
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
          <Label>Business unit</Label>
          <Select
            value={draft.businessUnitId}
            onValueChange={(v) => set("businessUnitId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Business unit" />
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
      </div>

      <div className="space-y-1.5">
        <Label>Regions</Label>
        <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-md border p-2">
          {db.regions.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.regionIds.includes(r.id)}
                onCheckedChange={(checked) =>
                  toggleId("regionIds", r.id, checked === true)
                }
              />
              <span>
                {r.code} — {r.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-start`}>Start date</Label>
          <Input
            id={`${idPrefix}-start`}
            type="date"
            value={draft.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-end`}>End date</Label>
          <Input
            id={`${idPrefix}-end`}
            type="date"
            value={draft.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-budget`}>Budget allocation</Label>
          <Input
            id={`${idPrefix}-budget`}
            inputMode="numeric"
            value={draft.budget}
            onChange={(e) => set("budget", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Select
            value={draft.ownerStakeholderId}
            onValueChange={(v) => set("ownerStakeholderId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              {db.stakeholders.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} — {s.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>KPIs</Label>
        {/* The reason this field exists: the promote-from-idea flow writes
            `kpiIds: []`, and until now nothing could ever attach one — the
            campaign was measurable by nobody for the rest of its life. */}
        <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-md border p-2">
          {db.kpis.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No KPIs defined in this dataset.
            </p>
          ) : (
            db.kpis.map((k) => (
              <label key={k.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.kpiIds.includes(k.id)}
                  onCheckedChange={(checked) => toggleId("kpiIds", k.id, checked === true)}
                />
                <span className="truncate">
                  {k.name} <span className="text-muted-foreground">· {k.tier}</span>
                </span>
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Validation errors, rendered the same way in both dialogs. */
export function DraftErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useLiveDB();
  const { role } = useRole();
  // Agency users are hard-scoped to their agency's assigned campaigns and have
  // no budget or KPI visibility (blueprint).
  const agencyScope = agencyScopeForRole(db, role);

  /* Write handle on the same collection id the read side overlays
     (`useLiveDB` registers "campaigns"), so an edit made here is the record
     every other surface renders a moment later. Hooks run before the
     not-found early return below, which is why they sit up here. */
  const campaignsCol = useCollection<Campaign>("campaigns", getSeedDB().campaigns);
  /* Submitting for approval has to CREATE the approval — see
     `campaignApprovalRoute` for why the lifecycle is otherwise a dead end. */
  const approvalsCol = useCollection<Approval>("approvals", getSeedDB().approvals);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [pendingStatus, setPendingStatus] = useState<CampaignStatus | null>(null);

  const campaign = db.campaigns.find((c) => c.id === id);

  if (!campaign || (agencyScope && !agencyScope.campaignIds.has(campaign.id))) {
    // Two different preconditions produce this screen: the record does not
    // exist, or it exists and is not assigned to the agency. Say which.
    const outOfAgencyScope = campaign !== undefined;
    return (
      <div className="p-6">
        <EmptyState
          icon={Megaphone}
          title={outOfAgencyScope ? "Campaign not available" : "Campaign not found"}
          hint={
            outOfAgencyScope
              ? `This campaign is not assigned to ${
                  agencyScope?.agencyName ?? "your agency"
                }. Access follows activity assignment — you see a campaign once one of its activities is assigned to you.`
              : `No campaign with id '${id ?? ""}' exists in the database.`
          }
          actionSlot={
            <Button asChild size="sm" variant="outline">
              <Link to="/campaigns">Back to campaigns</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const brand = db.brands.find((b) => b.id === campaign.brandId);
  const bu = db.businessUnits.find((b) => b.id === campaign.businessUnitId);
  const regions = campaign.regionIds
    .map((rid) => db.regions.find((r) => r.id === rid)?.code ?? rid)
    .join(", ");
  const owner = db.stakeholders.find((s) => s.id === campaign.ownerStakeholderId);

  const activities = db.campaignActivities
    .filter((a) => a.campaignId === campaign.id)
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate, DEFAULT_LOCALE));
  const spend = campaignSpend(db, campaign.id);

  /* Burn comes from `campaignHealth`, the app's single definition of it, so
     this page cannot disagree with the RAG reasons, the at-risk list, or the
     board pack about the same campaign. It previously used
     `campaignCommittedSpend`, which counts an In Progress activity's whole
     allocation the day it starts, while `campaignHealth().budgetBurn` prorates
     it by elapsed schedule: CMP-009 read 76% here and 25% everywhere else, and
     CMP-007 showed 82% above an at-risk reason saying "Budget burn 51%".
     Prorated wins because it is the definition the rest of the app renders and
     the one `CampaignHealth.budgetBurn` documents.
     Committed money is the burn fraction applied to the allocation the bar is
     drawn against — the same quantity, not a second sum. (A dedicated
     `campaignCommittedToDate` selector would be cleaner; both
     `campaignSelectors.ts` and `budgetSelectors.ts` are owned elsewhere.) */
  const health = campaignHealth(db, campaign.id);
  const burnFraction = health?.budgetBurn ?? 0;
  const burnPct = burnFraction * 100;
  const committed = burnFraction * campaign.budgetAllocation;
  // Variance is measured against what has been ALLOCATED to activities, not
  // against burn — a different base from the bar below it, so it says so.
  const variance = campaign.budgetAllocation - spend;

  const team = campaignTeam(db, campaign.id);
  const agencies = campaignAgencies(db, campaign.id);
  const communications = campaignCommunications(db, campaign.id);

  /* Both directions of the campaign↔KPI relation. Reading `campaign.kpiIds`
     alone hid every KPI that names this campaign instead of being named by it —
     on CMP-009 that meant one row reading "Actual — · No data" while the four
     measured KPIs, and the "5 KPIs" chip in the header, went unexplained. */
  const kpiRows = campaignKpiIds(db, campaign.id)
    .map((kpiId) => {
      const kpi = db.kpis.find((k) => k.id === kpiId);
      return kpi ? { kpi, attainment: kpiAttainment(db, kpiId, campaign.id) } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const briefs = db.briefs.filter((b) => b.campaignId === campaign.id);
  const contents = db.contents.filter((c) => c.campaignId === campaign.id);

  const campaignBlocker = blockerFor(db, "Campaign", campaign.id, campaign.status);

  /* ------------------------------------------------------------------ */
  /* Authoring                                                           */
  /* ------------------------------------------------------------------ */

  const canAuthor = canWriteCampaigns(role, agencyScope);

  /* Whether an approval is open is not a second opinion — it is read off the
     same `blockerFor` call the header already renders, which only returns an
     `approvalId` for a *pending* approval. One definition, so the reason the
     transition menu gives can never contradict the blocker line above it. */
  const hasPendingApproval = campaignBlocker?.approvalId !== undefined;

  const approvalRoute = campaignApprovalRoute(db, campaign);

  const guardInput = {
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    hasPendingApproval,
    approvalRouteAvailable: approvalRoute !== null,
  };

  const transitionOptions = allowedTransitions(campaign.status).map((to) => ({
    to,
    blockedReason: transitionBlockReason(campaign.status, to, guardInput),
  }));

  /**
   * What the confirmation tells the user will happen — every consequence is
   * read off the record, not asserted. A transition that quietly restates
   * spend or closes a window is the kind of mutation this app has been
   * criticised for depicting rather than performing.
   */
  const transitionConsequences = (to: CampaignStatus): string[] => {
    const lines = [`Lifecycle stage moves to ${lifecycleStageFor("Campaign", to) ?? "—"}.`];
    if (to === "In Approval" && approvalRoute) {
      lines.push(
        `An approval is raised at the ${approvalRoute.stage.name} stage for ${approvalRoute.approver.name}, due in ${approvalRoute.stage.slaHours} hours. Only that decision can move this campaign to Approved.`,
      );
    }
    if (to === "Completed" && campaign.endDate > TODAY) {
      lines.push(
        `The end date moves from ${fmtDate(campaign.endDate)} to ${fmtDate(
          TODAY,
        )} — completing today closes the window, so schedule progress and budget burn agree with the status.`,
      );
    }
    if (to === "Live" || to === "Paused") {
      lines.push(
        `Committed spend keeps deriving from this campaign's ${plural(
          activities.length,
          "activity",
          "activities",
        )}; nothing on the budget is rewritten.`,
      );
    }
    if (to === "Archived") {
      lines.push("Archived is terminal — the record cannot be reopened from here.");
    }
    if (to === "Cancelled") {
      lines.push(
        "Cancelling leaves activities, briefs and content as they are; only the campaign's own status changes.",
      );
    }
    return lines;
  };

  const applyTransition = (to: CampaignStatus): void => {
    // Re-checked at the call site, not just at render: the menu is built from
    // the same guard, but a stale menu (an approval decided in another tab)
    // must not be able to write an illegal status.
    const reason = transitionBlockReason(campaign.status, to, guardInput);
    if (!canAuthor || reason) {
      toast.error(`Cannot move ${campaign.id} to ${to}`, {
        description: reason ?? "Your role cannot change campaign status.",
      });
      setPendingStatus(null);
      return;
    }
    const patch = campaignTransitionPatch(campaign, to);
    campaignsCol.updateIn(campaign.id, patch);

    /* Submitting raises the real approval record, so the campaign appears in
       the approvals inbox, the blocker line resolves to it, and the Approved
       status is written by the decision rather than asserted here. */
    let raisedApprovalId: string | null = null;
    if (to === "In Approval" && approvalRoute) {
      raisedApprovalId = approvalsCol.createIn(
        {
          subjectEntity: "Campaign",
          subjectId: campaign.id,
          workflowStageId: approvalRoute.stage.id,
          approverStakeholderId: approvalRoute.approver.id,
          status: "Requested",
          // SLA is measured from the pinned demo clock, the same instant
          // blockerSelectors compares against — a wall-clock stamp here would
          // make every new approval read as breached or as negative-aged.
          slaDueAt: new Date(
            Date.parse(DEMO_NOW_ISO) + approvalRoute.stage.slaHours * 3_600_000,
          ).toISOString(),
          createdAt: DEMO_NOW_ISO,
          updatedAt: DEMO_NOW_ISO,
        },
        "APR-",
      );
    }

    setPendingStatus(null);
    toast.success(`${campaign.name} is now ${to}`, {
      description:
        raisedApprovalId !== null
          ? `${campaign.id} · ${raisedApprovalId} raised for ${approvalRoute?.approver.name ?? "the approver"}`
          : patch.endDate !== undefined
            ? `${campaign.id} · end date closed at ${fmtDate(patch.endDate)}`
            : `${campaign.id} · was ${campaign.status}`,
    });
  };

  const openEdit = (): void => {
    setDraft(draftFromCampaign(campaign));
    setEditing(true);
  };

  const draftErrors = draft ? validateCampaignDraft(draft) : [];

  const saveEdit = (): void => {
    if (!draft || !canAuthor || draftErrors.length > 0) return;
    campaignsCol.updateIn(campaign.id, {
      ...campaignDraftFields(draft),
      // Status is not part of the draft — it moves only through the transition
      // menu, where the legality map applies.
      updatedAt: DEMO_NOW_ISO,
    });
    setEditing(false);
    toast.success(`Saved ${draft.name.trim()}`, {
      description: `${campaign.id} · ${draft.kpiIds.length === 0 ? "no KPIs attached" : plural(draft.kpiIds.length, "KPI", "KPIs") + " attached"}`,
    });
  };

  // Content is drafted from a brief, so an empty content list is explained by
  // the state of this campaign's briefs — and the blocking approval, if the
  // brief is sitting in one, is a real place to go next.
  const approvedBriefs = briefs.filter((b) => b.status === "Approved");
  const unapprovedBrief = briefs.find((b) => b.status !== "Approved");
  const unapprovedBriefBlocker = unapprovedBrief
    ? blockerFor(db, "Brief", unapprovedBrief.id, unapprovedBrief.status)
    : null;

  const channelName = (cid: string): string =>
    db.channels.find((ch) => ch.id === cid)?.name ?? cid;
  const stakeholderName = (sid: string): string =>
    db.stakeholders.find((s) => s.id === sid)?.name ?? sid;

  const facts: { label: string; value: string }[] = [
    { label: "Brand", value: brand?.name ?? campaign.brandId },
    { label: "Business unit", value: bu?.name ?? campaign.businessUnitId },
    { label: "Regions", value: regions },
    { label: "Type", value: campaign.campaignType },
    { label: "Owner", value: owner?.name ?? campaign.ownerStakeholderId },
    {
      label: "Window",
      value: `${fmtDate(campaign.startDate)} – ${fmtDate(campaign.endDate)}`,
    },
  ];

  const budgetSummaryCard = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="tabular-nums">
            {fmtCurrency(committed)}{" "}
            <span className="text-muted-foreground">committed to date ·</span>{" "}
            {fmtCurrency(spend)}{" "}
            <span className="text-muted-foreground">allocated to activities of</span>{" "}
            {fmtCurrency(campaign.budgetAllocation)}
          </span>
          <span
            className="text-xs tabular-nums text-muted-foreground"
            title="Completed activities in full plus in-progress activities prorated by elapsed schedule, over the campaign allocation."
          >
            {Math.round(burnPct)}% burn
          </span>
        </div>
        <Progress value={Math.min(100, burnPct)} className="h-2" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 h-7 px-2 text-xs">
          <Link to="/campaigns">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Campaigns
          </Link>
        </Button>
        <PageHeader
          title={campaign.name}
          description={`${campaign.classification} · ${campaign.id}`}
          actions={
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <StatusBadge status={campaign.status} />
                {canAuthor && (
                  <>
                    <Button variant="outline" size="sm" onClick={openEdit}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={transitionOptions.length === 0}
                          title={
                            transitionOptions.length === 0
                              ? `${campaign.status} is a terminal status — there is nothing to move to.`
                              : undefined
                          }
                        >
                          Change status
                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      {/* Only the legal successors appear. A status this
                          campaign cannot reach is never offered and then
                          refused — the menu IS the transition map. */}
                      <DropdownMenuContent align="end" className="w-72">
                        <DropdownMenuLabel>Move from {campaign.status} to</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {transitionOptions.map(({ to, blockedReason }) => (
                          <DropdownMenuItem
                            key={to}
                            disabled={blockedReason !== null}
                            onSelect={() => setPendingStatus(to)}
                            className="flex-col items-start gap-0.5"
                          >
                            <span>{to}</span>
                            {blockedReason && (
                              <span className="text-xs text-muted-foreground">
                                Blocked: {blockedReason}
                              </span>
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
              <BlockerLine blocker={campaignBlocker} />
            </div>
          }
        />
        {/* Item 11 — what this campaign is connected to, counted off the same
            traversal the Graph explorer uses, deep-linked into it. */}
        <RelationshipChips
          db={db}
          entity="Campaign"
          id={campaign.id}
          className="mt-2"
        />
        <LifecycleStepper
          stage={lifecycleStageFor("Campaign", campaign.status)}
          record={{ db, entity: "Campaign", id: campaign.id }}
          className="mt-2"
        />
      </div>

      {/* Key facts */}
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
          {(campaign.ideaId || campaign.strategyId) && (
            <div className="col-span-2 flex flex-wrap items-center gap-2 border-t pt-3 md:col-span-3 lg:col-span-6">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Lineage
              </span>
              {campaign.ideaId && (
                <Link
                  to="/ideas"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Lightbulb className="h-3 w-3" aria-hidden="true" />
                  Promoted from idea:{" "}
                  {db.ideas.find((i) => i.id === campaign.ideaId)?.title ?? campaign.ideaId}
                </Link>
              )}
              {campaign.strategyId && (
                <Link
                  to="/ideas"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Target className="h-3 w-3" aria-hidden="true" />
                  Ladders to:{" "}
                  {db.strategies.find((s) => s.id === campaign.strategyId)?.title ??
                    campaign.strategyId}
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team &amp; agencies</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          {!agencyScope && <TabsTrigger value="budget">Budget</TabsTrigger>}
        </TabsList>

        {/* ---------------------------------------------------------- */}
        {/* Overview                                                    */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4">
          {!agencyScope && budgetSummaryCard}

          {/* Activities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Activities</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {activities.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Megaphone}
                    title="No activities yet"
                    hint={`Activities are what commit budget and carry communications, and this campaign has none — it is ${campaign.status}${
                      agencyScope
                        ? ""
                        : `, with the whole ${fmtCurrency(campaign.budgetAllocation)} allocation still uncommitted`
                    }.`}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Dates</TableHead>
                      {!agencyScope && (
                        <TableHead className="text-right">Spend allocated</TableHead>
                      )}
                      <TableHead>Owner</TableHead>
                      <TableHead className="w-56">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-sm">{channelName(a.channelId)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                        </TableCell>
                        {!agencyScope && (
                          <TableCell className="text-right text-sm tabular-nums">
                            {fmtCurrency(a.spendAllocated)}
                          </TableCell>
                        )}
                        <TableCell className="text-sm">
                          {stakeholderName(a.ownerStakeholderId)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={a.status} />
                          <BlockerLine
                            blocker={blockerFor(db, "CampaignActivity", a.id, a.status)}
                            className="mt-1 flex"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* KPIs */}
          {!agencyScope && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">KPIs</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-0">
                {kpiRows.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    No KPIs attached to this campaign, so nothing measures it. Results
                    roll up here only for KPIs linked to the campaign at plan time.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Attainment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiRows.map(({ kpi, attainment }) => (
                        <TableRow key={kpi.id}>
                          <TableCell className="font-medium">{kpi.name}</TableCell>
                          <TableCell className="text-sm">{kpi.tier}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {attainment
                              ? attainment.actual.toLocaleString("en-US", {
                                  maximumFractionDigits: 1,
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {kpi.target.toLocaleString("en-US")} {kpi.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {attainment ? fmtPct(attainment.attainment) : "No data"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Linked briefs & content */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Briefs</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {briefs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No brief yet. Content for this campaign is drafted from a brief, so
                    nothing downstream can start until one is written and approved.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {briefs.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="truncate text-sm">{b.title}</span>
                        <span className="flex flex-col items-end gap-1">
                          <StatusBadge status={b.status} />
                          <BlockerLine blocker={blockerFor(db, "Brief", b.id, b.status)} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Content</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {contents.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {briefs.length === 0
                        ? "No content yet. Drafting starts from a brief, and this campaign has none."
                        : approvedBriefs.length === 0 && unapprovedBrief
                          ? `No content yet. Drafting starts from an approved brief — “${unapprovedBrief.title}” is still ${unapprovedBrief.status}.`
                          : `No content yet. “${approvedBriefs[0].title}” is approved, so drafting can start against it.`}
                    </p>
                    {approvedBriefs.length === 0 && unapprovedBriefBlocker?.approvalId && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/approvals?focus=${unapprovedBriefBlocker.approvalId}`}>
                          Open the brief&rsquo;s approval
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {contents.map((c) => {
                      const origin = originOf(db, "Content", c.id);
                      return (
                        <li
                          key={c.id}
                          className={cn(
                            "flex flex-wrap items-center justify-between gap-2 pl-2",
                            proposedRowClass(origin.origin),
                          )}
                        >
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <Link
                              to={`/content/${c.id}`}
                              className="truncate text-sm text-primary hover:underline"
                            >
                              {c.title}
                            </Link>
                            <OriginChip info={origin} />
                          </span>
                          <span className="flex flex-col items-end gap-1">
                            <StatusBadge status={c.status} />
                            <BlockerLine
                              blocker={blockerFor(db, "Content", c.id, c.status)}
                            />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Team & agencies                                             */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Team</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {team.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No team members"
                  hint="The team is derived from the campaign owner, activity owners, brief authors and approvers. None of those resolves to a stakeholder record, so there is nobody to list."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {team.map(({ stakeholder, involvement }) => (
                    <li
                      key={stakeholder.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {stakeholder.avatar}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{stakeholder.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {stakeholder.role}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {involvement.map((label) => (
                          <Badge key={label} variant="secondary" className="font-normal">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Agencies</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {agencies.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No agencies engaged"
                  hint={
                    activities.length === 0
                      ? "An agency is engaged by assigning it an activity, and this campaign has no activities yet."
                      : `None of this campaign's ${plural(activities.length, "activity", "activities")} is assigned to an agency.`
                  }
                />
              ) : (
                <div className="space-y-4">
                  {agencies.map(({ agency, activities: agencyActivities }) => (
                    <div key={agency.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{agency.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agency.capabilities.join(" · ")}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {agencyActivities.map((a) => (
                          <li
                            key={a.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span className="min-w-0 truncate">{a.name}</span>
                            <span className="flex flex-col items-end gap-1">
                              <span className="flex items-center gap-2">
                                <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                  {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                                </span>
                                <StatusBadge status={a.status} />
                              </span>
                              <BlockerLine
                                blocker={blockerFor(db, "CampaignActivity", a.id, a.status)}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Communications                                              */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Communications</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {communications.length === 0 ? (
                <EmptyState
                  icon={Send}
                  title="No communications"
                  hint={
                    activities.length === 0
                      ? "Communications hang off an activity, and this campaign has no activities yet — so there is nothing for one to be scheduled against."
                      : `None of this campaign's ${plural(activities.length, "activity", "activities")} has a communication scheduled against it.`
                  }
                />
              ) : (
                <div className="space-y-3">
                  {communications.map(({ communication, activity, audience, executions }) => (
                    <div key={communication.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">
                          {communication.subject}
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <StatusBadge status={communication.status} />
                          <BlockerLine
                            blocker={blockerFor(
                              db,
                              "Communication",
                              communication.id,
                              communication.status,
                            )}
                          />
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {activity.name}
                        {" · "}
                        {audience?.name ?? communication.audienceId}
                        {communication.scheduledAt && (
                          <>
                            {" · "}
                            <span className="tabular-nums">
                              {fmtDate(communication.scheduledAt)}
                            </span>
                          </>
                        )}
                      </div>
                      {executions.length === 0 ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          No channel executions yet — a send is created per channel once
                          the communication is scheduled, and this one is{" "}
                          {communication.status}.
                        </div>
                      ) : (
                        <ul className="mt-2 space-y-1.5">
                          {executions.map((x) => (
                            <li
                              key={x.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-sm"
                            >
                              <span className="min-w-0 truncate">
                                {channelName(x.channelId)}
                              </span>
                              <span className="flex items-center gap-2">
                                {x.scheduledAt && (
                                  <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                    {fmtDate(x.scheduledAt)}
                                  </span>
                                )}
                                <StatusBadge status={x.status} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Budget                                                      */}
        {/* ---------------------------------------------------------- */}
        {!agencyScope && (
          <TabsContent value="budget" className="space-y-4">
            {budgetSummaryCard}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Variance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  {/* Names its own base. The headline is allocation minus what
                      is allocated to activities; the bar underneath is burn
                      over the same allocation. Two different numerators over
                      one denominator, so each says which it is rather than
                      both reading as "remaining". */}
                  <span className="tabular-nums">
                    {fmtCurrency(Math.abs(variance))}{" "}
                    <span className="text-muted-foreground">
                      {variance >= 0
                        ? "of allocation not yet assigned to activities"
                        : "assigned to activities beyond allocation"}
                    </span>
                  </span>
                  <StatusBadge
                    status={variance < 0 ? "Over budget" : "Under budget"}
                    className={
                      variance < 0
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-success/10 text-success border-success/20"
                    }
                  />
                </div>
                <Progress value={Math.min(100, burnPct)} className="h-2" />
                {/* The bar above is committed / budgetAllocation, so its two
                    end labels must be exactly that numerator and denominator.
                    Labelling the left end with `spend` (allocation across all
                    activities, whatever their status) put a second, larger
                    number under the word "committed" than the Budget card two
                    rows up — the same page stating two different committed
                    figures, neither matching the bar. */}
                <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                  <span>{fmtCurrency(committed)} committed to date</span>
                  <span>{fmtCurrency(campaign.budgetAllocation)} allocation</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Spend by activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-0">
                {activities.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Spend is allocated per activity, and this campaign has no activities —
                    so its {fmtCurrency(campaign.budgetAllocation)} allocation is entirely
                    uncommitted.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Activity</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead className="w-56">Status</TableHead>
                        <TableHead className="text-right">Spend allocated</TableHead>
                        <TableHead className="text-right">Share of spend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell className="text-sm">
                            {channelName(a.channelId)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={a.status} />
                            <BlockerLine
                              blocker={blockerFor(db, "CampaignActivity", a.id, a.status)}
                              className="mt-1 flex"
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {fmtCurrency(a.spendAllocated)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {spend > 0 ? fmtPct(a.spendAllocated / spend) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <RecordAuditTrail entity="Campaign" id={campaign.id} />

      {/* ---------------------------------------------------------- */}
      {/* Edit                                                        */}
      {/* ---------------------------------------------------------- */}
      <Dialog
        open={editing && draft !== null}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) setDraft(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
            <DialogDescription>
              {campaign.id} · status stays {campaign.status}; use Change status to move
              it through the lifecycle.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <>
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                <CampaignFormFields
                  db={db}
                  draft={draft}
                  onChange={setDraft}
                  idPrefix="campaign-edit"
                />
              </div>
              <DraftErrors errors={draftErrors} />
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false);
                setDraft(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={draft === null || draftErrors.length > 0}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------- */}
      {/* Status transition — confirmed, with its consequences named  */}
      {/* ---------------------------------------------------------- */}
      <Dialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Move to {pendingStatus ?? ""}?
            </DialogTitle>
            <DialogDescription>
              {campaign.name} is {campaign.status}.
            </DialogDescription>
          </DialogHeader>
          {pendingStatus && (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {transitionConsequences(pendingStatus).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatus(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => pendingStatus && applyTransition(pendingStatus)}
              disabled={pendingStatus === null}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
