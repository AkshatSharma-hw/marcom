/**
 * `/assets/:id` — the routed record page for one DAM asset.
 *
 * Replaces the impact sheet that used to slide over the asset library. The
 * sheet had no URL, so an asset could not be linked, bookmarked, opened in a
 * new tab or returned to with the back button — and a rights-expiry
 * notification had nowhere durable to point.
 *
 * The page's reason to exist is rights exposure: when the rights window on an
 * asset closes, what breaks? That question is answered by the `assetImpact`
 * traversal (Asset ← embeds ← ContentVersion → Content → Campaign), extended
 * here with the communications that carry those contents.
 *
 * It is also honest about what the system does NOT hold. "Upload" in this
 * product records a filename; no binary is stored. There is no preview, no
 * dimensions, no checksum — and no visual brand evaluation, because nothing
 * visual exists to evaluate. The page says so rather than drawing an empty
 * image frame where a thumbnail would go.
 */

import { Link, useParams } from "react-router-dom";
import { Images, ShieldCheck } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { seedAssets } from "@/data/seed/content";
import { assetImpact } from "@/data/selectors";
import { EXPIRY_WARNING_DAYS, daysUntil } from "@/lib/assetRights";
import { ExpiryChip } from "@/components/marcomm/ExpiryChip";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { originOf } from "@/data/selectors/originSelectors";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { useRole, type AppRole } from "@/lib/rbac";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Communication, Policy, SeedDB } from "@/data/types";

import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { OriginChip } from "@/components/marcomm/OriginChip";
import { AgentActivityRail } from "@/components/marcomm/AgentActivityRail";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/* Rights expiry                                                       */
/* ------------------------------------------------------------------ */

/** "in 12 days" / "today" / "42 days ago", counted off the demo clock. */
function relativeDayPhrase(days: number): string {
  if (days === 0) return "today";
  if (days > 0) return `in ${days} ${days === 1 ? "day" : "days"}`;
  const past = Math.abs(days);
  return `${past} ${past === 1 ? "day" : "days"} ago`;
}

/* ------------------------------------------------------------------ */
/* Classification masking                                              */
/* ------------------------------------------------------------------ */

/**
 * Roles cleared to read a `Restricted` communication's subject. Mirrors the
 * ABAC rule the communications list applies (see `CommunicationsPage`): a
 * restricted row stays visible and countable, but its subject is masked. A new
 * route to a record must not become a way around that.
 */
const RESTRICTED_READ_ROLES: readonly AppRole[] = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
];

const MASKED_SUBJECT = "Restricted communication";

/* ------------------------------------------------------------------ */
/* Impact                                                              */
/* ------------------------------------------------------------------ */

/**
 * Communications that would carry this asset into market.
 *
 * `assetImpact` stops at Campaign. A communication reaches the asset two ways
 * and both count: it names an affected Content directly (`contentId`), or one
 * of its channel executions ships an affected ContentVersion
 * (`ChannelExecution.contentVersionId`). Union of the two, deduplicated by the
 * communication record itself.
 */
function affectedCommunications(
  db: SeedDB,
  contentIds: Set<string>,
  versionIds: Set<string>,
): Communication[] {
  const viaExecution = new Set(
    db.channelExecutions
      .filter((x) => x.contentVersionId !== undefined && versionIds.has(x.contentVersionId))
      .map((x) => x.communicationId),
  );
  return db.communications.filter(
    (c) => (c.contentId !== undefined && contentIds.has(c.contentId)) || viaExecution.has(c.id),
  );
}

/* Statuses that mean a record is in market right now — the ones for which a
   lapsed rights window is a live compliance problem rather than a planning
   note. Taken from docs/STATE_TAXONOMY.md, per entity. */
const IN_MARKET_CAMPAIGN_STATUSES = ["Live"];
const IN_MARKET_CONTENT_STATUSES = ["Published"];
const IN_MARKET_COMMUNICATION_STATUSES = ["Scheduled", "Live"];

/**
 * The one rule group in the brand guardrail set that reads a classification.
 * An Asset record has none, so it is excluded from an asset's check rather
 * than run against an invented value — the same exclusion the library row's
 * brand check records in its run outcome.
 */
const CLASSIFICATION_SCOPED_POLICY_ID = "POL-005";

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {title} <span className="tabular-nums text-muted-foreground">({count})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">{children}</CardContent>
    </Card>
  );
}

/** A related record: a link to its route, its status, and what holds it. */
function RelatedRow({
  to,
  label,
  status,
  blockerNode,
  meta,
}: {
  to?: string;
  label: string;
  status?: string;
  blockerNode?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-2">
      <span className="flex min-w-0 flex-col gap-0.5">
        {to ? (
          <Link to={to} className="truncate text-sm font-medium text-primary hover:underline">
            {label}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium">{label}</span>
        )}
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </span>
      <span className="flex flex-col items-end gap-1">
        {status && <StatusBadge status={status} />}
        {blockerNode}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useLiveDB();
  const { role } = useRole();

  /* Agency users are hard-scoped to assets embedded by their agency's assigned
     campaigns. Runtime uploads (ids outside the seed) stay reachable so an
     agency's own upload flow keeps working — the same rule the library list
     applies, restated here because a route is a second way in. The top-bar
     brand scope is deliberately NOT applied: that is a view filter, and a deep
     link should still reach a record the list happens to be filtering out. */
  const agencyScope = agencyScopeForRole(db, role);
  const asset = db.assets.find((a) => a.id === id);
  const isSeedAsset = seedAssets.some((a) => a.id === id);
  const permitted =
    asset !== undefined &&
    (!agencyScope || !isSeedAsset || agencyScope.assetIds.has(asset.id));

  if (!asset || !permitted) {
    return (
      <RecordNotFound
        icon={Images}
        noun="asset"
        id={id}
        backTo="/assets"
        backLabel="asset library"
        outOfScope={asset !== undefined}
        scopeHint={agencyScope?.agencyName ?? "your agency"}
      />
    );
  }

  const brand = db.brands.find((b) => b.id === asset.brandId);
  const brandLabel = brand?.name ?? asset.brandId;
  const blocker = blockerFor(db, "Asset", asset.id, asset.status);
  const origin = originOf(db, "Asset", asset.id);

  /* ---------------- impact traversal ---------------- */

  const rawImpact = assetImpact(db, asset.id);

  /* An asset can be embedded by content outside the agency's assigned
     campaigns. The traversal does not know about scoping, so it is narrowed
     here — otherwise this page would report the existence of records the
     agency is not allowed to see. */
  const contents = agencyScope
    ? rawImpact.contents.filter((c) => agencyScope.contentIds.has(c.id))
    : rawImpact.contents;
  const contentIds = new Set(contents.map((c) => c.id));
  const contentVersions = rawImpact.contentVersions.filter((v) => contentIds.has(v.contentId));
  const versionIds = new Set(contentVersions.map((v) => v.id));
  const campaigns = agencyScope
    ? rawImpact.campaigns.filter((c) => agencyScope.campaignIds.has(c.id))
    : rawImpact.campaigns;
  const communications = affectedCommunications(db, contentIds, versionIds);

  const referenceCount =
    campaigns.length + contents.length + communications.length + contentVersions.length;

  /* ---------------- rights exposure ---------------- */

  const rightsExpiry = asset.rightsExpiry;
  const days = rightsExpiry !== undefined ? daysUntil(rightsExpiry) : null;
  const lapsed = days !== null && days < 0;
  const closingSoon = days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS;

  const inMarketCampaigns = campaigns.filter((c) =>
    IN_MARKET_CAMPAIGN_STATUSES.includes(c.status),
  );
  const inMarketContents = contents.filter((c) => IN_MARKET_CONTENT_STATUSES.includes(c.status));
  const inMarketCommunications = communications.filter((c) =>
    IN_MARKET_COMMUNICATION_STATUSES.includes(c.status),
  );
  const inMarketCount =
    inMarketCampaigns.length + inMarketContents.length + inMarketCommunications.length;

  /* ---------------- brand check coverage ---------------- */

  const guardrailIds = brand?.guardrailPolicyIds ?? [];
  const evaluablePolicies: Policy[] = db.policies.filter(
    (p) => guardrailIds.includes(p.id) && p.id !== CLASSIFICATION_SCOPED_POLICY_ID,
  );
  const classificationPolicyExcluded = guardrailIds.includes(CLASSIFICATION_SCOPED_POLICY_ID);

  /* ---------------- display helpers ---------------- */

  const canReadRestricted = RESTRICTED_READ_ROLES.includes(role);
  const subjectOf = (c: Communication): string =>
    c.classification === "Restricted" && !canReadRestricted ? MASKED_SUBJECT : c.subject;
  const contentTitle = (contentId: string): string =>
    db.contents.find((c) => c.id === contentId)?.title ?? contentId;

  const facts: { label: string; value: React.ReactNode; title?: string }[] = [
    { label: "Media type", value: asset.mediaType, title: asset.mediaType },
    { label: "Brand", value: brandLabel, title: brandLabel },
    {
      label: "Rights expiry",
      value: rightsExpiry ? (
        <span className="tabular-nums">{fmtDate(rightsExpiry)}</span>
      ) : (
        <span className="text-muted-foreground">None recorded</span>
      ),
    },
    {
      label: "Rights window",
      value:
        days === null ? (
          <span className="text-muted-foreground">Open-ended</span>
        ) : (
          <span className={cn("tabular-nums", lapsed && "text-destructive")}>
            {lapsed
              ? `Lapsed ${relativeDayPhrase(days)}`
              : days === 0
                ? "Closes today"
                : `${days} ${days === 1 ? "day" : "days"} remaining`}
          </span>
        ),
    },
    { label: "Added", value: <span className="tabular-nums">{fmtDate(asset.createdAt)}</span> },
    {
      label: "Last updated",
      value: <span className="tabular-nums">{fmtDate(asset.updatedAt)}</span>,
    },
  ];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="Asset"
        id={asset.id}
        title={asset.filename}
        description={`${asset.mediaType} · ${brandLabel}`}
        status={asset.status}
        blocker={blocker}
        backTo="/assets"
        backLabel="Asset library"
        actions={<OriginChip info={origin} />}
        chipPrefix={
          rightsExpiry ? (
            <span>
              {/* Tense follows the demo clock: a window that closed six weeks
                  ago must not read as something that is going to happen. */}
              Rights {lapsed ? "expired" : "expire"} {fmtDate(rightsExpiry)} ·{" "}
              {referenceCount === 0
                ? "no records affected"
                : `${referenceCount} ${referenceCount === 1 ? "record" : "records"} affected`}
            </span>
          ) : undefined
        }
      />

      {agencyScope && (
        <p className="text-xs text-muted-foreground">
          Showing records assigned to {agencyScope.agencyName ?? "your agency"}
        </p>
      )}

      {/* Key facts */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 md:grid-cols-3 lg:grid-cols-6">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {f.label}
              </div>
              <div className="mt-0.5 truncate text-sm" title={f.title}>
                {f.value}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rights exposure — the question this page exists to answer. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rights exposure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          {rightsExpiry === undefined ? (
            <p className="text-sm text-muted-foreground">
              No rights expiry is recorded on this asset, so there is no date on which its
              use becomes non-compliant and nothing to count down to.{" "}
              {referenceCount === 0
                ? "Nothing references it either."
                : `${referenceCount} ${referenceCount === 1 ? "record references" : "records reference"} it — listed below.`}{" "}
              An expiry can be set when the asset is added to the library.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "text-sm",
                    lapsed ? "text-destructive" : closingSoon ? "text-warning" : undefined,
                  )}
                >
                  Rights {lapsed ? "lapsed" : "lapse"}{" "}
                  <span className="tabular-nums">{fmtDate(rightsExpiry)}</span> —{" "}
                  {relativeDayPhrase(days ?? 0)}
                </span>
                <ExpiryChip isoDate={rightsExpiry} />
              </div>

              {referenceCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No content version embeds this asset, so the lapse breaks nothing —
                  there is no downstream record to withdraw.
                </p>
              ) : inMarketCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {referenceCount} {referenceCount === 1 ? "record references" : "records reference"}{" "}
                  this asset, but none is in market: no campaign is Live, no content is
                  Published and no communication is Scheduled or Live. A lapse withdraws
                  nothing that is already out — it blocks the ones below from going out.
                </p>
              ) : (
                <p className={cn("text-sm", lapsed ? "text-destructive" : undefined)}>
                  {lapsed ? "Already exposed: " : "On expiry: "}
                  <span className="tabular-nums">{inMarketCount}</span>{" "}
                  {inMarketCount === 1 ? "record is" : "records are"} in market and
                  {lapsed ? " still using" : " would still be using"} this asset —{" "}
                  {[
                    inMarketCampaigns.length > 0
                      ? `${inMarketCampaigns.length} live ${inMarketCampaigns.length === 1 ? "campaign" : "campaigns"}`
                      : undefined,
                    inMarketContents.length > 0
                      ? `${inMarketContents.length} published ${inMarketContents.length === 1 ? "content item" : "content items"}`
                      : undefined,
                    inMarketCommunications.length > 0
                      ? `${inMarketCommunications.length} scheduled or live ${inMarketCommunications.length === 1 ? "communication" : "communications"}`
                      : undefined,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  . Each has to be withdrawn or re-versioned onto a replacement asset.
                </p>
              )}

              {lapsed && asset.status !== "Expired" && asset.status !== "Archived" && (
                <p className="text-sm text-destructive">
                  The rights window closed {relativeDayPhrase(days ?? 0)} but the asset is
                  still recorded as {asset.status}. "Mark expired" on the library row is
                  what reconciles the two.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="impact">
        <TabsList>
          <TabsTrigger value="impact">Impact</TabsTrigger>
          <TabsTrigger value="record">Record</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- */}
        {/* Impact                                                      */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="impact" className="space-y-4">
          {referenceCount === 0 ? (
            <Card>
              <CardContent className="p-4">
                <EmptyState
                  icon={Images}
                  title="Nothing references this asset"
                  hint={
                    agencyScope
                      ? `No content version in ${agencyScope.agencyName ?? "your agency"}'s assigned campaigns embeds this asset, so expiring its rights has no downstream impact you can see.`
                      : "No content version embeds this asset, so it reaches no content, no campaign and no communication. Impact appears here once a version embeds it."
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <SectionCard title="Campaigns affected" count={campaigns.length}>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    None of the {contents.length}{" "}
                    {contents.length === 1 ? "content item" : "content items"} that embed
                    this asset belongs to a campaign, so no campaign plan is exposed.
                  </p>
                ) : (
                  campaigns.map((c) => (
                    <RelatedRow
                      key={c.id}
                      to={`/campaigns/${c.id}`}
                      label={c.name}
                      status={c.status}
                      blockerNode={
                        <BlockerLine blocker={blockerFor(db, "Campaign", c.id, c.status)} />
                      }
                    />
                  ))
                )}
              </SectionCard>

              <SectionCard title="Content affected" count={contents.length}>
                {contents.map((c) => (
                  <RelatedRow
                    key={c.id}
                    to={`/content/${c.id}`}
                    label={c.title}
                    status={c.status}
                    blockerNode={
                      <BlockerLine blocker={blockerFor(db, "Content", c.id, c.status)} />
                    }
                  />
                ))}
              </SectionCard>

              <SectionCard title="Communications affected" count={communications.length}>
                {communications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No communication carries this asset yet. A communication reaches it by
                    naming one of the {contents.length}{" "}
                    {contents.length === 1 ? "content item" : "content items"} above, or by
                    shipping one of its versions on a channel execution — neither has
                    happened, so nothing is scheduled to send it.
                  </p>
                ) : (
                  communications.map((c) => (
                    <RelatedRow
                      key={c.id}
                      to={`/communications/${c.id}`}
                      label={subjectOf(c)}
                      status={c.status}
                      meta={
                        <>
                          {c.commsType}
                          {c.scheduledAt && (
                            <>
                              {" · "}
                              <span className="tabular-nums">{fmtDate(c.scheduledAt)}</span>
                            </>
                          )}
                        </>
                      }
                      blockerNode={
                        <BlockerLine
                          blocker={blockerFor(db, "Communication", c.id, c.status)}
                        />
                      }
                    />
                  ))
                )}
              </SectionCard>

              <SectionCard title="Content versions embedding it" count={contentVersions.length}>
                {contentVersions.map((v) => (
                  <div key={v.id} className="rounded-md border p-2 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/content/${v.contentId}`}
                        className="min-w-0 truncate font-medium text-primary hover:underline"
                      >
                        {contentTitle(v.contentId)} · {v.versionNumber}
                      </Link>
                      <span className="text-xs text-muted-foreground">{v.locale}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.body}</p>
                  </div>
                ))}
              </SectionCard>
            </>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Record — what is held, and what is not                      */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="record" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">What this record holds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4 text-sm text-muted-foreground">
              <p>
                This is a catalog entry, not a file. Adding an asset to this library records
                a filename, a media type, a brand and an optional rights window — no binary
                is stored and none is fetched. There is therefore no preview, no dimensions
                or duration, no file size and no checksum to show, and nothing to compare a
                later version against.
              </p>
              <p>
                Everything on this page is derived from those recorded fields and from the
                records that point at them. The {asset.mediaType} itself is not inspected
                anywhere in the product.
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 md:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wider">Filename</dt>
                  <dd className="mt-0.5 break-all text-sm text-foreground">{asset.filename}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wider">Record id</dt>
                  <dd className="mt-0.5 truncate text-sm tabular-nums text-foreground">
                    {asset.id}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] uppercase tracking-wider">Stored file</dt>
                  <dd className="mt-0.5 text-sm">None — filename only</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Brand check coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4 text-sm text-muted-foreground">
              {brand === undefined ? (
                <p>
                  No Brand record <span className="tabular-nums">{asset.brandId}</span> is on
                  file, so no guardrail policy set can be resolved for this asset and the
                  brand check on its library row cannot run.
                </p>
              ) : evaluablePolicies.length === 0 ? (
                <p>
                  {brandLabel} has no guardrail policy that can be evaluated against an asset
                  record, so the brand check has nothing to check.
                  {classificationPolicyExcluded &&
                    ` Its only guardrail, ${CLASSIFICATION_SCOPED_POLICY_ID}, keys off a classification an asset does not carry.`}
                </p>
              ) : (
                <p>
                  The brand check on this asset&rsquo;s library row evaluates{" "}
                  <span className="tabular-nums">{evaluablePolicies.length}</span> {brandLabel}{" "}
                  guardrail {evaluablePolicies.length === 1 ? "policy" : "policies"} (
                  {evaluablePolicies.map((p) => p.id).join(", ")}) against the filename — the
                  only text an asset record carries.
                  {classificationPolicyExcluded &&
                    ` ${CLASSIFICATION_SCOPED_POLICY_ID} is excluded because it keys off a classification an asset does not have.`}
                </p>
              )}
              <p>
                Visual brand compliance — logo lockup, palette accuracy, typography, imagery
                treatment — is <span className="text-foreground">not evaluated</span>. There
                is no artwork to inspect, so the only visual sign-off on record is the
                reviewer&rsquo;s checklist in the approval gate. The check is advisory
                either way: it never moves the asset&rsquo;s status.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Governance                                                  */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="governance" className="space-y-4">
          <SectionCard title="Approvals on this asset" count={rawImpact.approvals.length}>
            {rawImpact.approvals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approval record names this asset. The library&rsquo;s approval gate is a
                reviewer checklist that moves the status directly, so an Approval row only
                exists where one was raised explicitly.
              </p>
            ) : (
              rawImpact.approvals.map((a) => (
                <RelatedRow
                  key={a.id}
                  to={`/approvals/${a.id}`}
                  label={`Approval ${a.id}`}
                  status={a.status}
                  meta={
                    <>
                      Due <span className="tabular-nums">{fmtDate(a.slaDueAt)}</span>
                    </>
                  }
                />
              ))
            )}
          </SectionCard>

          <SectionCard title="Notifications raised" count={rawImpact.notifications.length}>
            {rawImpact.notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {rightsExpiry === undefined
                  ? "Nothing has been raised about this asset. Rights-expiry notifications are only generated for assets that carry an expiry date, and this one does not."
                  : "Nothing has been raised about this asset yet."}
              </p>
            ) : (
              rawImpact.notifications.map((n) => (
                <div key={n.id} className="rounded-md border p-2">
                  <p className="text-sm">{n.message}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {fmtDate(n.createdAt)}
                  </p>
                </div>
              ))
            )}
          </SectionCard>

          <AgentActivityRail entity="Asset" id={asset.id} />
        </TabsContent>
      </Tabs>

      <RecordAuditTrail entity="Asset" id={asset.id} />
    </RecordDetailPage>
  );
}
