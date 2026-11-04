/**
 * Agency record page — /agencies/:id.
 *
 * The agencies list is a grid of summary cards: it shows an agency's workload
 * but has no URL for the agency itself, so an agency could not be linked,
 * bookmarked or opened in a new tab. This is that record.
 *
 * Every figure is derived: the workload comes from `activitiesOf` (the same
 * function the list card uses), the money from `CampaignActivity.spendAllocated`
 * and `campaignSpend` in the budget selectors, and the contacts from
 * `agencyContacts` — again the list's own derivation, so the card and the
 * record can never disagree about who the agency's people are.
 */

import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Briefcase, Megaphone, Users } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { campaignSpend } from "@/data/selectors";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { useRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { agencyScopeForRole } from "@/lib/agencyScope";
import { fmtCurrency, fmtDate, fmtPct } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n";

import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { activitiesOf, agencyContacts, campaignsTouched } from "@/lib/agencyWorkload";
import { ContactRow } from "@/components/marcomm/ContactRow";

export default function AgencyDetail() {
  const { id } = useParams<{ id: string }>();
  const db = useLiveDB();
  const { role } = useRole();
  const { regionId } = useScope();

  /* An Agency User is hard-scoped to their own agency and has no budget
     visibility (blueprint). The route is already gated by <RequireRole>, but a
     detail page is a NEW way to reach a record and must not become a way
     around the scope — so it is enforced here too rather than assumed. */
  const agencyScope = agencyScopeForRole(db, role);
  const agency = db.agencies.find((a) => a.id === id);

  const activities = useMemo(
    () => (agency ? activitiesOf(db, agency.id) : []),
    [db, agency],
  );

  if (!agency || (agencyScope && agencyScope.agencyId !== agency.id)) {
    return (
      <RecordNotFound
        icon={Briefcase}
        noun="agency"
        id={id}
        backTo="/agencies"
        backLabel="agencies"
        outOfScope={agency !== undefined}
        scopeHint={agencyScope?.agencyName ?? "your agency"}
      />
    );
  }

  const campaigns = campaignsTouched(db, activities);
  const { external, internal } = agencyContacts(db, agency, activities);

  /* Money. `spendAllocated` on the activities this agency executes is the only
     honest figure available — the dataset holds no agency invoice or fee line,
     so this is what the agency's work has been allocated, not what it has
     billed. The share column divides it by `campaignSpend`, the app's
     definition of a campaign's total activity allocation. */
  const allocated = activities.reduce((sum, a) => sum + a.spendAllocated, 0);
  const perCampaign = campaigns
    .map((c) => {
      const agencyPortion = activities
        .filter((a) => a.campaignId === c.id)
        .reduce((sum, a) => sum + a.spendAllocated, 0);
      const total = campaignSpend(db, c.id);
      return { campaign: c, agencyPortion, total };
    })
    .sort((a, b) => b.agencyPortion - a.agencyPortion);

  const regionCodes = agency.regionIds
    .map((rid) => db.regions.find((r) => r.id === rid)?.code ?? rid)
    .join(", ");
  const scopeRegionCode = regionId
    ? db.regions.find((r) => r.id === regionId)?.code ?? regionId
    : null;
  const outsideScopeRegion = Boolean(regionId && !agency.regionIds.includes(regionId));

  const campaignName = (cid: string): string =>
    db.campaigns.find((c) => c.id === cid)?.name ?? cid;
  const channelName = (cid: string): string =>
    db.channels.find((ch) => ch.id === cid)?.name ?? cid;
  const stakeholderName = (sid: string): string =>
    db.stakeholders.find((s) => s.id === sid)?.name ?? sid;

  const disciplines = agency.capabilities.map((c) => c.replace(/-/g, " ")).join(" · ");

  const facts: { label: string; value: string }[] = [
    { label: "Disciplines", value: disciplines || "None recorded" },
    { label: "Regions", value: regionCodes || "None recorded" },
    {
      label: "Activities",
      value: `${activities.length} assigned`,
    },
    {
      label: "Campaigns",
      value: `${campaigns.length} touched`,
    },
    ...(agencyScope
      ? []
      : [{ label: "Spend allocated", value: fmtCurrency(allocated) }]),
    { label: "On the roster since", value: fmtDate(agency.createdAt) },
  ];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="Agency"
        id={agency.id}
        title={agency.name}
        description={disciplines || "No disciplines recorded"}
        backTo="/agencies"
        backLabel="Agencies"
      />

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
          {outsideScopeRegion && scopeRegionCode && (
            <div className="col-span-2 border-t pt-3 text-xs text-muted-foreground md:col-span-3 lg:col-span-6">
              This agency operates in {regionCodes} and the region filter is set to{" "}
              {scopeRegionCode}, so it is hidden on the agencies list right now. The
              record is unchanged — only the list is filtered.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts — the same derivation the list card uses. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Agency contacts
              </h3>
              <div className="mt-2 space-y-2">
                {external.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No stakeholder is registered against {agency.name} — an agency
                    contact appears here once a stakeholder carries the Agency User
                    role and this agency&rsquo;s affiliation.
                  </p>
                ) : (
                  external.map((s) => <ContactRow key={s.id} person={s} note={s.email} />)
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Internal owners
              </h3>
              <div className="mt-2 space-y-2">
                {internal.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {activities.length === 0
                      ? "Internal owners are the people who own this agency's activities, and none is assigned yet."
                      : "None of this agency's activities resolves to a stakeholder record, so there is no internal owner to name."}
                  </p>
                ) : (
                  internal.map((s) => <ContactRow key={s.id} person={s} note={s.role} />)
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned work — the graph made navigable: every campaign is a link. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Assigned work</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {activities.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Megaphone}
                title="No activities assigned"
                hint={`An agency is engaged by assigning it a campaign activity, and no activity in the dataset names ${agency.name}. Until one does, there is no campaign, no owner and no spend to attribute to it.`}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Owner</TableHead>
                  {!agencyScope && (
                    <TableHead className="text-right">Spend allocated</TableHead>
                  )}
                  <TableHead className="w-56">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm">
                      {db.campaigns.some((c) => c.id === a.campaignId) ? (
                        <Link
                          to={`/campaigns/${a.campaignId}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {campaignName(a.campaignId)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{a.campaignId}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{channelName(a.channelId)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {fmtDate(a.startDate)} – {fmtDate(a.endDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {stakeholderName(a.ownerStakeholderId)}
                    </TableCell>
                    {!agencyScope && (
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmtCurrency(a.spendAllocated)}
                      </TableCell>
                    )}
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

      {/* Spend allocated across the assigned activities, per campaign. */}
      {!agencyScope && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spend allocated</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-0">
            {perCampaign.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Spend reaches an agency only through the activities it executes, and{" "}
                {agency.name} has none — so nothing is allocated to it.
              </div>
            ) : (
              <>
                <div className="px-4 pt-3 text-sm tabular-nums">
                  {fmtCurrency(allocated)}{" "}
                  <span className="text-muted-foreground">
                    allocated across {activities.length}{" "}
                    {activities.length === 1 ? "activity" : "activities"} in{" "}
                    {perCampaign.length}{" "}
                    {perCampaign.length === 1 ? "campaign" : "campaigns"}. This is
                    allocation, not billing — the dataset holds no agency invoice.
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Allocated to this agency</TableHead>
                      <TableHead className="text-right">
                        Campaign activity allocation
                      </TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perCampaign.map(({ campaign, agencyPortion, total }) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {campaign.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmtCurrency(agencyPortion)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmtCurrency(total)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {total > 0 ? fmtPct(agencyPortion / total) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Related campaigns, as links — the point of a record page. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No campaigns"
              hint="A campaign reaches this record only through an activity assigned to the agency. With no activities assigned, there is no campaign to link to."
            />
          ) : (
            <ul className="divide-y divide-border">
              {campaigns
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE))
                .map((c) => {
                  const own = activities.filter((a) => a.campaignId === c.id);
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <Link
                          to={`/campaigns/${c.id}`}
                          className="truncate text-sm text-primary underline-offset-2 hover:underline"
                        >
                          {c.name}
                        </Link>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {c.id} · {own.length}{" "}
                          {own.length === 1 ? "activity" : "activities"} executed by{" "}
                          {agency.name}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <StatusBadge status={c.status} />
                        <BlockerLine blocker={blockerFor(db, "Campaign", c.id, c.status)} />
                      </span>
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>

      <RecordAuditTrail entity="Agency" id={agency.id} />
    </RecordDetailPage>
  );
}
