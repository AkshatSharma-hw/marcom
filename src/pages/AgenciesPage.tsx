/**
 * Agencies page — external agency partners as governed participants
 * (BLUEPRINT.md Part 5, module 18). One card per agency with its derived
 * workload: the CampaignActivities it executes, committed spend, activity
 * status mix, and the campaigns it touches. Every number is computed from
 * the seed graph — never hardcoded.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { useLiveDB } from "@/data/useLiveDB";
import type { Agency, CampaignActivityStatus, SeedDB } from "@/data/types";
import { ContactRow } from "@/components/marcomm/ContactRow";
import { activitiesOf, agencyContacts, campaignsTouched } from "@/lib/agencyWorkload";
import { fmtCurrency, fmtDateShort } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { DEFAULT_LOCALE } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Derivations (pure over SeedDB)                                      */
/* ------------------------------------------------------------------ */

const ACTIVITY_STATUSES: CampaignActivityStatus[] = [
  "Planned",
  "In Progress",
  "Completed",
  "Blocked",
];

/* ------------------------------------------------------------------ */
/* Small presentational bits                                           */
/* ------------------------------------------------------------------ */

function CapabilityChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
      {label.replace(/-/g, " ")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Agency card                                                         */
/* ------------------------------------------------------------------ */

function AgencyCard({ db, agency }: { db: SeedDB; agency: Agency }) {
  const activities = activitiesOf(db, agency.id);
  const campaigns = campaignsTouched(db, activities);
  const { external, internal } = agencyContacts(db, agency, activities);
  const committedSpend = activities.reduce((sum, a) => sum + a.spendAllocated, 0);
  const statusCounts = ACTIVITY_STATUSES.map((status) => ({
    status,
    count: activities.filter((a) => a.status === status).length,
  })).filter((s) => s.count > 0);

  const regionCodes = agency.regionIds
    .map((id) => db.regions.find((r) => r.id === id)?.code ?? id)
    .join(", ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {/* The agency name is the row's primary cell: a real link, so it is
                keyboard reachable, opens in a new tab on cmd-click, and can be
                bookmarked. The card stays a summary; /agencies/:id is the
                record. */}
            <CardTitle className="text-base">
              <Link
                to={`/agencies/${agency.id}`}
                className="rounded-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {agency.name}
              </Link>
            </CardTitle>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {agency.capabilities.map((cap) => (
                <CapabilityChip key={cap} label={cap} />
              ))}
              <span className="text-xs text-muted-foreground">{regionCodes}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">Committed spend</div>
            <div className="text-lg font-medium tabular-nums">
              {fmtCurrency(committedSpend)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contacts */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Agency contacts
            </h3>
            <div className="mt-2 space-y-2">
              {external.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No external stakeholder registered for this agency.
                </p>
              ) : (
                external.map((s) => <ContactRow key={s.id} person={s} note={s.email} />)
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Internal owners
            </h3>
            <div className="mt-2 space-y-2">
              {internal.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activities assigned yet.</p>
              ) : (
                internal.map((s) => <ContactRow key={s.id} person={s} note={s.role} />)
              )}
            </div>
          </div>
        </div>

        {/* Status mix + campaigns touched */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-xs text-muted-foreground">
            {activities.length} {activities.length === 1 ? "activity" : "activities"}
          </span>
          {statusCounts.map(({ status, count }) => (
            <StatusBadge key={status} status={status}>
              {status} · {count}
            </StatusBadge>
          ))}
          {campaigns.length > 0 && (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Campaigns:</span>
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {c.name}
                </Link>
              ))}
            </span>
          )}
        </div>

        {/* Workload table */}
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This agency has no campaign activities assigned.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="w-40">Dates</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28 text-right">Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a) => {
                const campaign = db.campaigns.find((c) => c.id === a.campaignId);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      {campaign ? (
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="text-primary hover:underline"
                        >
                          {campaign.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{a.campaignId}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDateShort(a.startDate)} – {fmtDateShort(a.endDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {fmtCurrency(a.spendAllocated)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AgenciesPage() {
  return (
    <ErrorBoundary>
      <AgenciesPageContent />
    </ErrorBoundary>
  );
}

function AgenciesPageContent() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  /* Live, not frozen: the workload table names campaigns, and a campaign
     created or renamed at runtime was stale here while every other surface
     had it. */
  const db = useLiveDB();
  const { regionId } = useScope();

  // Region scope: an agency is in scope when it operates in the selected region.
  const agencies = useMemo(
    () =>
      db.agencies
        .filter((a) => !regionId || a.regionIds.includes(regionId))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE)),
    [db, regionId],
  );

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Agencies"
        description="External agency partners, their assigned workload, and committed spend"
      />

      {/* Scoped external access callout */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="text-sm">
          <span className="font-medium">Agency view.</span>{" "}
          <span className="text-muted-foreground">
            Agencies participate in the workflow through scoped external access: an
            agency user sees only the briefs and campaigns explicitly assigned to their
            agency — an allowlist, not scope inheritance. Sign in as the Agency User
            role from the login picker to see the restricted navigation this produces.
          </span>
        </div>
      </div>

      {agencies.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No agencies in this scope"
          hint="Widen the region filter in the top bar to see more agencies."
        />
      ) : (
        <div className="space-y-4">
          {agencies.map((agency) => (
            <AgencyCard key={agency.id} db={db} agency={agency} />
          ))}
        </div>
      )}
    </div>
  );
}
