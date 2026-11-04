/**
 * Asset library (DAM, increments 2–3) — two tabs:
 *
 * - "Assets": every Asset in scope with rights intelligence, the DAM lifecycle
 *   (Uploaded → Cataloged → Approved/Rejected via row actions), an upload dialog
 *   gated to authoring roles, and derived collections (per campaign via
 *   content-version embeds, plus rights expiring soon) as filter chips. "Submit
 *   for approval" opens a brand-derived checklist dialog: Approve is gated on
 *   all checks; Request fixes rejects with a required reason. A filename links
 *   to `/assets/:id` — the routed record page, where the rights exposure and
 *   the assetImpact traversal live. Legacy `?id=` deep links (global search,
 *   rights-expiry notifications) redirect to that route rather than opening a
 *   sheet, so old links still land on the record they named.
 * - "Brand center" (module 16, brand governance): one card per Brand in scope
 *   with tone, visual identity (palette swatches, typography, logo, imagery),
 *   guardrail Policies, and derived campaign/content/asset counts — all computed
 *   from the seed graph, never hardcoded. Brand Manager / Platform Admin can
 *   propose tone changes; the edit routes to the CMO as a pending Approval
 *   (shared 'approvals' collection) instead of applying directly, and open
 *   requests surface as a "Pending guideline change" chip.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Images, Pencil, RotateCw, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { PageSkeleton } from "@/components/marcomm/PageSkeleton";
import { ErrorBoundary } from "@/components/marcomm/ErrorBoundary";
import { OriginChip, proposedRowClass } from "@/components/marcomm/OriginChip";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { BRAND_GUARDRAIL_RULE_SET } from "@/components/marcomm/AgentTrace";

import { getSeedDB } from "@/data/seed";
import { seedAssets } from "@/data/seed/content";
import { asyncAIService } from "@/services/ai";
import { originOf, proposedCount } from "@/data/selectors/originSelectors";
import { blockerFor, blockerSummary } from "@/data/selectors/blockerSelectors";
/* One rights vocabulary for the whole app: a single definition of the warning
   horizon and of "days from the demo clock", so the chip on a row and the chip
   on the record it links to can never disagree about the same asset. */
import { ExpiryChip } from "@/components/marcomm/ExpiryChip";
import { EXPIRY_WARNING_DAYS, daysUntil } from "@/lib/assetRights";
import type {
  AgentRun,
  Approval,
  Asset,
  Brand,
  MediaType,
  Policy,
  SeedDB,
} from "@/data/types";
import { useLiveDB } from "@/data/useLiveDB";
import { fmtDate } from "@/lib/format";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { useRole, type AppRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { useCollection } from "@/store/DataStore";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Upload & lifecycle                                                  */
/* ------------------------------------------------------------------ */

/** Roles allowed to add assets to the library (DAM authoring personas). */
const UPLOAD_ROLES: readonly AppRole[] = [
  "Content Manager",
  "Brand Manager",
  "Agency User",
  "Platform Admin",
];

const MEDIA_TYPES: readonly MediaType[] = ["image", "video", "audio", "document"];

interface UploadValues {
  filename: string;
  mediaType: MediaType;
  brandId: string;
  rightsExpiry?: string;
}

function UploadAssetDialog({
  brands,
  defaultBrandId,
  onUpload,
  onClose,
}: {
  brands: Brand[];
  defaultBrandId?: string;
  onUpload: (values: UploadValues) => void;
  onClose: () => void;
}) {
  const [filename, setFilename] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [brandId, setBrandId] = useState(defaultBrandId ?? "");
  const [rightsExpiry, setRightsExpiry] = useState("");

  const canSubmit = filename.trim().length > 0 && brandId.length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload asset</DialogTitle>
          <DialogDescription>
            New assets enter the library as "Uploaded" and move through
            cataloging and approval before use.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="asset-filename">Filename</Label>
            <Input
              id="asset-filename"
              placeholder="e.g. autumn-hero-banner.png"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Media type</Label>
            <Select
              value={mediaType}
              onValueChange={(v) => setMediaType(v as MediaType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select media type" />
              </SelectTrigger>
              <SelectContent>
                {MEDIA_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="asset-rights-expiry">Rights expiry (optional)</Label>
            <Input
              id="asset-rights-expiry"
              type="date"
              value={rightsExpiry}
              onChange={(e) => setRightsExpiry(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!canSubmit}
            onClick={() =>
              onUpload({
                filename: filename.trim(),
                mediaType,
                brandId,
                rightsExpiry: rightsExpiry || undefined,
              })
            }
          >
            Upload asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Brand approval checklist                                            */
/* ------------------------------------------------------------------ */

/**
 * Checklist items derived from the asset's brand identity — always 5 items so
 * the confirmation toast ("All 5 brand checks confirmed") stays truthful.
 */
function brandChecklistItems(brand: Brand | undefined, brandLabel: string): string[] {
  return [
    `Logo used per guideline: ${brand?.logoDescription ?? "no logo guideline on file"}`,
    `Colors within the ${brandLabel} palette`,
    `Typography follows: ${brand?.typography ?? "no typography guideline on file"}`,
    `Imagery follows: ${brand?.imageryGuidelines ?? "no imagery guideline on file"}`,
    "Required disclaimers present",
  ];
}

function ApprovalChecklistDialog({
  asset,
  brand,
  onApprove,
  onRequestFixes,
  onClose,
}: {
  asset: Asset;
  brand?: Brand;
  onApprove: () => void;
  onRequestFixes: (reason: string) => void;
  onClose: () => void;
}) {
  const brandLabel = brand?.name ?? asset.brandId;
  const items = brandChecklistItems(brand, brandLabel);
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));
  const [reason, setReason] = useState("");

  const allChecked = checked.every(Boolean);
  const canRequestFixes = reason.trim().length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Brand approval checklist</DialogTitle>
          <DialogDescription className="break-all">
            Confirm {asset.filename} against the {brandLabel} brand guidelines
            before approving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((item, i) => (
            <label
              key={item}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 text-sm"
            >
              <Checkbox
                checked={checked[i]}
                onCheckedChange={(v) =>
                  setChecked((prev) => prev.map((c, idx) => (idx === i ? v === true : c)))
                }
                className="mt-0.5"
              />
              <span className="min-w-0">{item}</span>
            </label>
          ))}

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="fix-reason">Reason (required to request fixes)</Label>
            <Input
              id="fix-reason"
              placeholder="e.g. wrong logo lockup on dark background"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            disabled={!canRequestFixes}
            onClick={() => onRequestFixes(reason.trim())}
          >
            Request fixes
          </Button>
          <Button disabled={!allChecked} onClick={onApprove}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

/**
 * Proposed vs authored (item 1). Origin is derived from real provenance, so an
 * asset only ever reads as proposed when an agent genuinely produced it — today
 * assets have no agent production path, so "Proposed" legitimately selects
 * nothing. The control stays because the filter is part of the contract, not
 * because a count was manufactured to justify it.
 */
type OriginFilter = "all" | "proposed" | "authored";

/* "Authored or accepted" rather than "Authored": the bucket is the complement of
   proposed, so it holds records a person wrote AND agent-produced records a
   person has since signed off (origin `agent-accepted`, which keeps its sparkle
   marker). Calling it "Authored" made those rows look mislabelled. */
const ORIGIN_FILTER_LABELS: Record<OriginFilter, string> = {
  all: "All origins",
  proposed: "Proposed",
  authored: "Authored or accepted",
};

const EXPIRING_SOON_KEY = "expiring-soon";

/** Rights window still open but closing within the warning horizon. */
function expiringSoon(asset: Asset): boolean {
  if (!asset.rightsExpiry) return false;
  const days = daysUntil(asset.rightsExpiry);
  return days >= 0 && days <= EXPIRY_WARNING_DAYS;
}

interface AssetCollectionChip {
  key: string;
  name: string;
  count: number;
  matches: (asset: Asset) => boolean;
}

/**
 * Named collections derived from the graph: one per campaign whose content
 * versions embed assets (Campaign → Content → ContentVersion → assetIds),
 * plus a rights-driven "Expiring soon" collection. Counts come from the live
 * in-scope asset list — never hardcoded. Zero-count chips are dropped.
 */
function deriveCollections(db: SeedDB, assets: Asset[]): AssetCollectionChip[] {
  const chips: AssetCollectionChip[] = db.campaigns.map((campaign) => {
    const contentIds = new Set(
      db.contents.filter((c) => c.campaignId === campaign.id).map((c) => c.id),
    );
    const assetIds = new Set(
      db.contentVersions
        .filter((v) => contentIds.has(v.contentId))
        .flatMap((v) => v.assetIds ?? []),
    );
    const matches = (asset: Asset) => assetIds.has(asset.id);
    return {
      key: campaign.id,
      name: campaign.name,
      count: assets.filter(matches).length,
      matches,
    };
  });

  chips.push({
    key: EXPIRING_SOON_KEY,
    name: "Expiring soon",
    count: assets.filter(expiringSoon).length,
    matches: expiringSoon,
  });

  return chips.filter((c) => c.count > 0);
}

/* ------------------------------------------------------------------ */
/* Row-level brand check                                               */
/* ------------------------------------------------------------------ */

/**
 * The agent whose ledger a row-level brand check is recorded against. A1 owns
 * the brand guardrails and the check that evaluates records against them (see
 * its capability list in `seed/module.ts`).
 */
const BRAND_CHECK_AGENT_ID = "AGT-A1";

/**
 * The one rule group that reads `ReviewInput.classification` (the legal-clause
 * library, FR-BG-15/16). An Asset record carries no classification and no copy,
 * so the group is dropped from an asset's policy set rather than run against an
 * invented value — and the run says so in its outcome.
 */
const CLASSIFICATION_SCOPED_POLICY_ID = "POL-005";

/**
 * Per-asset state of a brand check started from a row.
 *
 * The run is persisted as an `AgentRun`; this is only what the row shows. There
 * is no synthetic latency — the deterministic engine returns immediately, so
 * `running` is a real state that is usually over within a frame.
 */
type BrandCheckState =
  | { phase: "running"; runId: string }
  | {
      phase: "done";
      runId: string;
      severity: "pass" | "warn" | "block";
      blocks: number;
      warns: number;
      checks: number;
      toneScore: number;
    }
  | { phase: "error"; runId: string; message: string };

/**
 * The inline result of a row-level brand check — running, the verdict, or the
 * real failure with a way to try again. Nothing renders until the run has
 * produced something to render.
 */
function BrandCheckLine({
  state,
  onRetry,
}: {
  state?: BrandCheckState;
  onRetry: () => void;
}) {
  if (!state) return null;

  if (state.phase === "running") {
    return (
      <p className="mt-1.5 text-xs text-muted-foreground">
        Brand check <span className="tabular-nums">{state.runId}</span> running…
      </p>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="mt-1.5 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-left">
        <p className="text-xs text-destructive">
          <span className="font-medium">
            Brand check <span className="tabular-nums">{state.runId}</span> failed.
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
    <div className="mt-1.5 flex flex-col items-end gap-1">
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
      <span className="text-xs tabular-nums text-muted-foreground">
        {state.blocks} block · {state.warns} warn · {state.checks} checks · tone{" "}
        {state.toneScore}/100
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brand center                                                        */
/* ------------------------------------------------------------------ */

function EnforcementChip({ enforcement }: { enforcement: Policy["enforcement"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        enforcement === "block"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-warning/20 bg-warning/10 text-warning",
      )}
    >
      {enforcement}
    </span>
  );
}

/** Derived per-brand rollup — every number computed from the seed graph. */
interface BrandGovernance {
  brand: Brand;
  guardrails: Policy[];
  campaignCount: number;
  contentCount: number;
  assetCount: number;
  /** Contents currently sitting in 'In Review' or 'Rework' for this brand. */
  complianceGateCount: number;
}

function brandGovernance(db: SeedDB, brand: Brand): BrandGovernance {
  const guardrails = (brand.guardrailPolicyIds ?? [])
    .map((id) => db.policies.find((p) => p.id === id))
    .filter((p): p is Policy => Boolean(p));

  return {
    brand,
    guardrails,
    campaignCount: db.campaigns.filter((c) => c.brandId === brand.id).length,
    contentCount: db.contents.filter((c) => c.brandId === brand.id).length,
    assetCount: db.assets.filter((a) => a.brandId === brand.id).length,
    complianceGateCount: db.contents.filter(
      (c) =>
        c.brandId === brand.id && (c.status === "In Review" || c.status === "Rework"),
    ).length,
  };
}

/**
 * A derived per-brand count.
 *
 * None of these is a link. "Campaigns" used to be one, pointing at `/campaigns`,
 * which lists every campaign in the workspace — clicking a brand-scoped 5
 * landed on all 20, and the two tiles beside it were not clickable at all.
 * Neither the campaign list nor the content list takes a brand parameter, so
 * there is no target that means what the number means; the three read as what
 * they are instead.
 */
function CountStat({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col rounded-md border p-2">
      <span className="text-lg font-semibold tabular-nums">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Roles allowed to propose brand guideline changes. */
const GUIDELINE_EDIT_ROLES: readonly AppRole[] = ["Brand Manager", "Platform Admin"];

/** Workflow stage a proposed guideline change is routed through. */
const BRAND_APPROVAL_STAGE_ID = "WFS-003";

function EditGuidelinesDialog({
  brand,
  onSubmit,
  onClose,
}: {
  brand: Brand;
  onSubmit: (proposedTone: string) => void;
  onClose: () => void;
}) {
  const [tone, setTone] = useState(brand.tone ?? "");
  const canSubmit = tone.trim().length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit guidelines — {brand.name}</DialogTitle>
          <DialogDescription>
            Propose a change to the brand tone. The change does not apply until
            the CMO approves it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="brand-tone">Tone</Label>
          <Textarea
            id="brand-tone"
            rows={4}
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button disabled={!canSubmit} onClick={() => onSubmit(tone.trim())}>
            Submit for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BrandCard({
  gov,
  canEdit,
  pendingChange,
  onEdit,
}: {
  gov: BrandGovernance;
  canEdit: boolean;
  pendingChange: boolean;
  onEdit: () => void;
}) {
  const { brand, guardrails } = gov;
  const hasIdentity =
    (brand.colorPalette?.length ?? 0) > 0 ||
    Boolean(brand.logoDescription) ||
    Boolean(brand.typography) ||
    Boolean(brand.imageryGuidelines);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{brand.name}</CardTitle>
              {pendingChange && (
                <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  Pending guideline change
                </span>
              )}
            </div>
            {brand.tone && (
              <CardDescription className="mt-1.5">{brand.tone}</CardDescription>
            )}
          </div>
          {canEdit && (
            <Button size="sm" variant="outline" className="shrink-0" onClick={onEdit}>
              <Pencil />
              Edit guidelines
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual identity (brand DATA — swatch values are exempt from the UI no-hex rule) */}
        {hasIdentity && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Visual identity
            </h3>
            {brand.colorPalette && brand.colorPalette.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                {brand.colorPalette.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-5 w-5 shrink-0 rounded-md border"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="text-xs text-muted-foreground">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
            <dl className="mt-2.5 space-y-2 text-sm">
              {brand.typography && (
                <div>
                  <dt className="text-xs text-muted-foreground">Typography</dt>
                  <dd className="mt-0.5">{brand.typography}</dd>
                </div>
              )}
              {brand.logoDescription && (
                <div>
                  <dt className="text-xs text-muted-foreground">Logo</dt>
                  <dd className="mt-0.5">{brand.logoDescription}</dd>
                </div>
              )}
              {brand.imageryGuidelines && (
                <div>
                  <dt className="text-xs text-muted-foreground">Imagery</dt>
                  <dd className="mt-0.5">{brand.imageryGuidelines}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Guardrail policies */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Brand guidelines ({guardrails.length})
          </h3>
          <div className="mt-2 space-y-2">
            {guardrails.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No brand guidelines attached to this brand.
              </p>
            ) : (
              guardrails.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{p.name}</span>
                  <EnforcementChip enforcement={p.enforcement} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Derived counts */}
        <div className="grid grid-cols-3 gap-2">
          <CountStat label="Campaigns" count={gov.campaignCount} />
          <CountStat label="Contents" count={gov.contentCount} />
          <CountStat label="Assets" count={gov.assetCount} />
        </div>

        {/* Brand compliance note */}
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium tabular-nums">{gov.complianceGateCount}</span>{" "}
            <span className="text-muted-foreground">
              {gov.complianceGateCount === 1 ? "content item" : "content items"} in
              review or rework — awaiting brand or compliance gates
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandCenter({ db, brandId }: { db: SeedDB; brandId?: string }) {
  const { role } = useRole();
  const approvalsCol = useCollection<Approval>("approvals", getSeedDB().approvals);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  const brands = useMemo(
    () => db.brands.filter((b) => !brandId || b.id === brandId),
    [db, brandId],
  );

  const canEdit = GUIDELINE_EDIT_ROLES.includes(role);

  // Brands with an open (Requested / In Review) guideline-change approval.
  const pendingBrandIds = useMemo(
    () =>
      new Set(
        approvalsCol.records
          .filter(
            (a) =>
              a.subjectEntity === "Brand" &&
              (a.status === "Requested" || a.status === "In Review"),
          )
          .map((a) => a.subjectId),
      ),
    [approvalsCol.records],
  );

  const submitToneChange = (brand: Brand, proposedTone: string) => {
    // Guideline changes route to the CMO through the shared approvals
    // collection — the tone itself is NOT applied here.
    const cmo = db.stakeholders.find((s) => s.role === "CMO");
    const now = new Date().toISOString();
    /* The due date is the stage's own SLA measured from submission, not a
       fixed date: a literal makes every request ever submitted share one
       deadline and contradicts the slaHours WFS-003 actually declares. */
    const stage = db.workflowStages.find((s) => s.id === BRAND_APPROVAL_STAGE_ID);
    const slaDueAt = new Date(
      Date.parse(now) + (stage?.slaHours ?? 24) * 60 * 60 * 1000,
    ).toISOString();
    approvalsCol.createIn(
      {
        subjectEntity: "Brand",
        subjectId: brand.id,
        workflowStageId: BRAND_APPROVAL_STAGE_ID,
        approverStakeholderId: cmo?.id ?? "STK-001",
        status: "In Review",
        slaDueAt,
        comment: `Proposed tone: ${proposedTone}`,
        createdAt: now,
        updatedAt: now,
      },
      "APR-",
    );
    setEditingBrandId(null);
    toast.success("Guideline change submitted for approval");
  };

  const editingBrand = editingBrandId
    ? brands.find((b) => b.id === editingBrandId)
    : undefined;

  if (brands.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No brands in this scope"
        hint={
          db.brands.length > 0
            ? `The top bar scopes this view to a single brand that is not in the current data set. ${db.brands.length} ${db.brands.length === 1 ? "brand is" : "brands are"} registered — clear the brand filter in the top bar to see them.`
            : "No brands are registered yet, so there are no guidelines, guardrail policies or derived counts to govern."
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {brands.map((b) => (
          <BrandCard
            key={b.id}
            gov={brandGovernance(db, b)}
            canEdit={canEdit}
            pendingChange={pendingBrandIds.has(b.id)}
            onEdit={() => setEditingBrandId(b.id)}
          />
        ))}
      </div>

      {editingBrand && (
        <EditGuidelinesDialog
          brand={editingBrand}
          onSubmit={(tone) => submitToneChange(editingBrand, tone)}
          onClose={() => setEditingBrandId(null)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AssetLibrary() {
  return (
    <ErrorBoundary>
      <AssetLibraryContent />
    </ErrorBoundary>
  );
}

function AssetLibraryContent() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  const [searchParams] = useSearchParams();
  /* Legacy deep links from global search and rights-expiry notifications carry
     `?id=`. The record they name now has its own route, so the id is handed
     straight to it (replace, so Back returns to wherever the link was clicked
     rather than to this redirect). An id that resolves to nothing — or to an
     asset the agency scope withholds — is answered by the record page's own
     not-found states, which say which of the two it is. */
  const deepLinkId = searchParams.get("id");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeCollectionKey, setActiveCollectionKey] = useState<string | null>(null);
  const [checklistAssetId, setChecklistAssetId] = useState<string | null>(null);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");

  const [brandChecks, setBrandChecks] = useState<Record<string, BrandCheckState>>({});

  const db = useLiveDB();
  const { brandId } = useScope();
  const { role } = useRole();
  const assetsCol = useCollection<Asset>("assets", getSeedDB().assets);
  // The agent execution ledger — row-level brand checks are recorded here, and
  // the activity rail on the asset's record page reads the same collection back.
  const runsCol = useCollection<AgentRun>("agentRuns", getSeedDB().agentRuns);

  // Agency users are hard-scoped to assets embedded by their agency's assigned
  // campaigns (blueprint). Runtime uploads (non-seed ids) stay visible so the
  // agency's own upload flow keeps working.
  const agencyScope = useMemo(() => agencyScopeForRole(db, role), [db, role]);
  const seedAssetIds = useMemo(() => new Set(seedAssets.map((a) => a.id)), []);

  /* Agency hard scoping, as a predicate rather than an inline filter: the
     deep-link lookup below has to apply exactly the same rule, or ?id= would
     open a sheet on a record the agency is not allowed to see. */
  const permittedToRole = useMemo(
    () => (a: Asset) =>
      !agencyScope || agencyScope.assetIds.has(a.id) || !seedAssetIds.has(a.id),
    [agencyScope, seedAssetIds],
  );

  const assets = useMemo(
    () =>
      assetsCol.records
        .filter(permittedToRole)
        .filter((a) => !brandId || a.brandId === brandId)
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt, DEFAULT_LOCALE)),
    [assetsCol.records, brandId, permittedToRole],
  );

  /* Origin is applied *before* the collection chips are derived, so a chip can
     never advertise a count the table below it does not show. Counting against
     the unfiltered set let a chip read "Volt5 5G Launch 3" while the table
     rendered its empty state. */
  const originFiltered = useMemo(() => {
    if (originFilter === "all") return assets;
    return assets.filter((a) => {
      const isProposed = originOf(db, "Asset", a.id).origin === "agent";
      return originFilter === "proposed" ? isProposed : !isProposed;
    });
  }, [assets, originFilter, db]);

  const collections = useMemo(
    () => deriveCollections(db, originFiltered),
    [db, originFiltered],
  );
  const activeCollection =
    collections.find((c) => c.key === activeCollectionKey) ?? null;
  const visibleAssets = useMemo(
    () => (activeCollection ? originFiltered.filter(activeCollection.matches) : originFiltered),
    [originFiltered, activeCollection],
  );

  /** Agent-proposed assets still awaiting a reviewer, across everything in scope. */
  const proposed = useMemo(
    () =>
      proposedCount(
        db,
        "Asset",
        assets.map((a) => a.id),
      ),
    [db, assets],
  );

  const canUpload = UPLOAD_ROLES.includes(role);

  const handleUpload = (values: UploadValues) => {
    const now = new Date().toISOString();
    assetsCol.createIn(
      { ...values, status: "Uploaded", createdAt: now, updatedAt: now },
      "AST-",
    );
    setUploadOpen(false);
    toast.success("Asset uploaded — pending cataloging");
  };

  /**
   * Every lifecycle move the row actions perform, in one place: a status patch
   * on the asset record plus the timestamp the list sorts on. The approval gate
   * keeps its checklist dialog (`approveAsset` / `rejectAsset`) because it has a
   * precondition to enforce; the rest are single-step transitions.
   *
   * The set below covers the whole `AssetStatus` union the data uses. Before
   * this, "Rejected" was a dead end — an asset a reviewer sent back could never
   * be resubmitted — and "Approved" had no route to In Use, Archived or Expired
   * although the seed carries assets in all three.
   */
  const moveAsset = (asset: Asset, status: Asset["status"], message: string) => {
    assetsCol.updateIn(asset.id, { status, updatedAt: new Date().toISOString() });
    toast.success(message);
  };

  const catalogAsset = (asset: Asset) => {
    moveAsset(asset, "Cataloged", "Asset cataloged — ready for approval");
  };

  /**
   * Checklist "Approve" — only reachable once every brand check is ticked.
   * The count is read off the checklist rather than written into the string:
   * `brandChecklistItems` happens to return five today, and a toast that states
   * a number should not be the thing that breaks when it returns six.
   */
  const approveAsset = (asset: Asset) => {
    const checks = brandChecklistItems(
      db.brands.find((b) => b.id === asset.brandId),
      asset.brandId,
    ).length;
    setChecklistAssetId(null);
    moveAsset(asset, "Approved", `Reviewer attested ${checks} brand checks — asset approved`);
  };

  /** Checklist "Request fixes" — rejects with the reviewer's reason. */
  const rejectAsset = (asset: Asset, reason: string) => {
    assetsCol.updateIn(asset.id, {
      status: "Rejected",
      updatedAt: new Date().toISOString(),
    });
    setChecklistAssetId(null);
    toast.error(`Fixes requested — ${reason}`);
  };

  /**
   * Row-level brand check, recorded as an `AgentRun`.
   *
   * The run is written to the ledger before the work starts and updated with
   * its outcome when it finishes, so a failure leaves a `failed` row carrying
   * the real reason rather than no trace at all. The check is advisory: it
   * never moves the asset's status, because clearing an asset is a person's
   * decision and the DAM lifecycle already says whose.
   *
   * No `confidence` is recorded — this engine reports certainty per finding,
   * not per run, and averaging those would be a number nobody computed. The
   * trace on the activity rail says so rather than showing a figure.
   */
  const handleBrandCheck = async (asset: Asset) => {
    const startedAt = new Date().toISOString();
    const triggeredBy = db.stakeholders.find((s) => s.role === role)?.id;
    const runId = runsCol.createIn(
      {
        agentId: BRAND_CHECK_AGENT_ID,
        subjectEntity: "Asset",
        subjectId: asset.id,
        status: "running",
        startedAt,
        ruleSetVersion: BRAND_GUARDRAIL_RULE_SET,
        ...(triggeredBy ? { triggeredByStakeholderId: triggeredBy } : {}),
        createdAt: startedAt,
        updatedAt: startedAt,
      },
      "ARN-",
    );
    setBrandChecks((prev) => ({ ...prev, [asset.id]: { phase: "running", runId } }));

    try {
      const brand = db.brands.find((b) => b.id === asset.brandId);
      if (!brand) {
        throw new Error(
          `No Brand record '${asset.brandId}' is on file, so this asset's guardrail policy set cannot be resolved.`,
        );
      }
      const guardrailIds = brand.guardrailPolicyIds ?? [];
      // POL-005 is the only group that reads a classification, which an asset
      // does not have — so it is excluded rather than run against a guess.
      const policies = db.policies.filter(
        (p) => guardrailIds.includes(p.id) && p.id !== CLASSIFICATION_SCOPED_POLICY_ID,
      );
      const excluded = guardrailIds.includes(CLASSIFICATION_SCOPED_POLICY_ID);
      if (policies.length === 0) {
        throw new Error(
          `${brand.name} has no guardrail policies the brand check can evaluate against an asset record, so there is nothing to check.`,
        );
      }

      const result = await asyncAIService.reviewContent(
        {
          title: asset.filename,
          // An Asset record carries no copy — the filename is the only text the
          // rule set can read, and the outcome says so rather than implying the
          // artwork itself was inspected.
          body: "",
          brand,
          // Required by ReviewInput because copy carries a classification; an
          // asset does not. The one rule group that reads it is excluded above,
          // so this value is never evaluated.
          classification: "Internal",
          reviewDate: startedAt.slice(0, 10),
        },
        policies,
        { db },
      );

      const finishedAt = new Date().toISOString();
      const blocks = result.findings.filter((f) => f.severity === "block").length;
      const warns = result.findings.filter((f) => f.severity === "warn").length;

      runsCol.updateIn(runId, {
        status: "succeeded",
        finishedAt,
        updatedAt: finishedAt,
        outcomeSummary: `Brand guardrails ${policies
          .map((p) => p.id)
          .join(", ")} evaluated against "${asset.filename}" — ${blocks} block, ${warns} warn across ${result.findings.length} checks (tone ${result.scores.toneScore}/100). An asset record carries no copy, so the filename is the only text the rule set could read${excluded ? `; ${CLASSIFICATION_SCOPED_POLICY_ID} was not evaluated because it keys off a classification an asset does not have` : ""}. Advisory only — the asset's status is unchanged.`,
      });

      setBrandChecks((prev) => ({
        ...prev,
        [asset.id]: {
          phase: "done",
          runId,
          severity: result.overallSeverity,
          blocks,
          warns,
          checks: result.findings.length,
          toneScore: result.scores.toneScore,
        },
      }));
      toast.success(
        `Brand check on ${asset.filename} — ${result.overallSeverity === "pass" ? "all checks passed" : `${blocks} block, ${warns} warn`}`,
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
      setBrandChecks((prev) => ({
        ...prev,
        [asset.id]: { phase: "error", runId, message },
      }));
      toast.error(`Brand check on ${asset.filename} failed`, { description: message });
    }
  };

  const brandName = (id: string): string => db.brands.find((b) => b.id === id)?.name ?? id;

  /* Empty states name the precondition actually holding them empty (item 8),
     read off the live scope and filter state rather than a generic message. */
  const scopeBrandName = brandId ? brandName(brandId) : undefined;
  const emptyFilterLabels = [
    activeCollection ? `collection "${activeCollection.name}"` : undefined,
    originFilter !== "all"
      ? `origin ${ORIGIN_FILTER_LABELS[originFilter].toLowerCase()}`
      : undefined,
  ].filter((label): label is string => Boolean(label));

  // Every hook above runs unconditionally, so the redirect and the skeleton are
  // both safe to return from here.
  if (deepLinkId) return <Navigate to={`/assets/${deepLinkId}`} replace />;

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Asset library"
        // Only surfaced when something genuinely awaits review (item 1).
        description={
          proposed > 0
            ? `Assets in scope with rights intelligence — open a filename for its record and impact analysis · ${proposed} proposed awaiting review`
            : "Assets in scope with rights intelligence — open a filename for its record and impact analysis"
        }
        actions={
          canUpload ? (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload />
              Upload asset
            </Button>
          ) : undefined
        }
      />

      {agencyScope && (
        <p className="text-xs text-muted-foreground">
          Showing records assigned to {agencyScope.agencyName ?? "your agency"}
        </p>
      )}

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          {/* Brand center exposes guardrail Policies — hidden from agency users */}
          {!agencyScope && <TabsTrigger value="brand-center">Brand center</TabsTrigger>}
        </TabsList>

        <TabsContent value="assets" className="mt-4 space-y-4">
          {assets.length === 0 ? (
            <EmptyState
              icon={Images}
              title="No assets in this scope"
              hint={
                scopeBrandName
                  ? `The top bar scopes this library to ${scopeBrandName}, and no asset belongs to that brand. ${assetsCol.records.length} ${assetsCol.records.length === 1 ? "asset exists" : "assets exist"} in total — widen the brand filter in the top bar to reach them.`
                  : agencyScope
                    ? `Assets are limited to those embedded by campaigns assigned to ${agencyScope.agencyName ?? "your agency"}, and none of those campaigns embeds an asset yet.`
                    : canUpload
                      ? "The library is empty. Assets enter it through upload and move through cataloging and approval before use."
                      : "The library is empty, and your role cannot upload — a Content Manager, Brand Manager or Agency User has to add the first asset."
              }
              action={
                assetsCol.records.length === 0 && canUpload
                  ? { label: "Upload asset", onClick: () => setUploadOpen(true) }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Origin
                </span>
                <Select
                  value={originFilter}
                  onValueChange={(v) => setOriginFilter(v as OriginFilter)}
                >
                  <SelectTrigger className="h-8 w-44" aria-label="Filter by origin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ORIGIN_FILTER_LABELS) as OriginFilter[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {ORIGIN_FILTER_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {collections.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Collections
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {collections.map((c) => {
                      const active = c.key === activeCollection?.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() =>
                            setActiveCollectionKey(active ? null : c.key)
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            active
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <span>{c.name}</span>
                          <span
                            className={cn(
                              "tabular-nums",
                              !active && "text-muted-foreground",
                            )}
                          >
                            {c.count}
                          </span>
                          {active && <X className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {visibleAssets.length === 0 ? (
                <EmptyState
                  icon={Images}
                  title="No assets match these filters"
                  hint={`${assets.length} ${assets.length === 1 ? "asset is" : "assets are"} in scope, but none match ${emptyFilterLabels.join(" · ")}.${originFilter === "proposed" ? " Origin is read from a record's provenance chain, so nothing reads as proposed until an agent actually produces an asset." : ""}`}
                  action={{
                    label: "Clear filters",
                    onClick: () => {
                      setActiveCollectionKey(null);
                      setOriginFilter("all");
                    },
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filename</TableHead>
                          <TableHead className="w-28">Media type</TableHead>
                          <TableHead className="w-36">Brand</TableHead>
                          <TableHead className="w-56">Status</TableHead>
                          <TableHead className="w-56">Rights expiry</TableHead>
                          <TableHead className="w-60 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleAssets.map((a) => {
                          const origin = originOf(db, "Asset", a.id);
                          const blocker = blockerFor(db, "Asset", a.id, a.status);
                          /* Bound once so the expiry action can narrow it:
                             the rights window has to have actually closed
                             before "Mark expired" is offered. */
                          const rightsExpiry = a.rightsExpiry;
                          const rightsLapsed =
                            rightsExpiry !== undefined && daysUntil(rightsExpiry) < 0;
                          return (
                            <TableRow key={a.id} className={proposedRowClass(origin.origin)}>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* A real link, not a click handler on the
                                      row: keyboard reachable, middle- and
                                      cmd-clickable into a new tab, and the
                                      record it opens has a URL to share. */}
                                  <Link
                                    to={`/assets/${a.id}`}
                                    className="font-medium text-primary hover:underline"
                                  >
                                    {a.filename}
                                  </Link>
                                  <OriginChip info={origin} />
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{a.mediaType}</TableCell>
                              <TableCell className="text-sm">{brandName(a.brandId)}</TableCell>
                              <TableCell>
                                {/* A definite width, not `max-w-full`: a
                                    percentage resolves against a cell that
                                    auto-layout has already sized to its
                                    content, so `w-56` above was ignored and
                                    the column grew to 346px. w-56 minus the
                                    cell's p-4 padding is what the column
                                    actually declares. */}
                                <div className="flex min-w-0 flex-col items-start gap-1">
                                  <StatusBadge status={a.status} />
                                  {blocker && (
                                    // Bounding the width makes long blockers
                                    // ellipsise, so the full line has to stay
                                    // readable somewhere.
                                    <span
                                      className="block max-w-48"
                                      title={blockerSummary(blocker)}
                                    >
                                      <BlockerLine
                                        blocker={blocker}
                                        className="max-w-full"
                                      />
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                                  {a.rightsExpiry ? (
                                    <>
                                      <span
                                        className={cn(
                                          "tabular-nums",
                                          daysUntil(a.rightsExpiry) < 0 && "text-muted-foreground",
                                        )}
                                      >
                                        {fmtDate(a.rightsExpiry)}
                                      </span>
                                      <ExpiryChip isoDate={a.rightsExpiry} />
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  {a.status === "Uploaded" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => catalogAsset(a)}
                                    >
                                      Catalog
                                    </Button>
                                  )}
                                  {/* Rejected re-enters the same gate: the
                                      reviewer's reason is on the record, and the
                                      checklist is what clears it. */}
                                  {(a.status === "Cataloged" || a.status === "Rejected") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setChecklistAssetId(a.id)}
                                    >
                                      {a.status === "Rejected"
                                        ? "Resubmit for approval"
                                        : "Submit for approval"}
                                    </Button>
                                  )}
                                  {a.status === "Approved" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        moveAsset(
                                          a,
                                          "In Use",
                                          `${a.filename} is now in use`,
                                        )
                                      }
                                    >
                                      Mark in use
                                    </Button>
                                  )}
                                  {/* Only offered once the rights window has
                                      actually closed — the status follows the
                                      recorded expiry rather than declaring it. */}
                                  {(a.status === "Approved" || a.status === "In Use") &&
                                    rightsLapsed &&
                                    rightsExpiry !== undefined && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          moveAsset(
                                            a,
                                            "Expired",
                                            `${a.filename} marked expired — rights lapsed ${fmtDate(rightsExpiry)}`,
                                          )
                                        }
                                      >
                                        Mark expired
                                      </Button>
                                    )}
                                  {(a.status === "Approved" || a.status === "In Use") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        moveAsset(a, "Archived", `${a.filename} archived`)
                                      }
                                    >
                                      Archive
                                    </Button>
                                  )}
                                  {/* Row-level agent action: the brand guardrail
                                      rule set runs against this asset and the run
                                      lands on the ledger. */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs"
                                    disabled={brandChecks[a.id]?.phase === "running"}
                                    onClick={() => void handleBrandCheck(a)}
                                  >
                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                    {brandChecks[a.id]?.phase === "running"
                                      ? "Running…"
                                      : "Run brand check"}
                                  </Button>
                                </div>
                                <BrandCheckLine
                                  state={brandChecks[a.id]}
                                  onRetry={() => void handleBrandCheck(a)}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {!agencyScope && (
          <TabsContent value="brand-center" className="mt-4">
            <BrandCenter db={db} brandId={brandId} />
          </TabsContent>
        )}
      </Tabs>

      {checklistAssetId &&
        (() => {
          const asset = assetsCol.records.find((a) => a.id === checklistAssetId);
          if (!asset) return null;
          return (
            <ApprovalChecklistDialog
              asset={asset}
              brand={db.brands.find((b) => b.id === asset.brandId)}
              onApprove={() => approveAsset(asset)}
              onRequestFixes={(reason) => rejectAsset(asset, reason)}
              onClose={() => setChecklistAssetId(null)}
            />
          );
        })()}

      {uploadOpen && (
        <UploadAssetDialog
          brands={db.brands}
          defaultBrandId={brandId}
          onUpload={handleUpload}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  );
}
