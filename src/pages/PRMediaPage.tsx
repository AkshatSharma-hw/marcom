/**
 * PR & media workspace — earned-media coverage, journalist CRM, and press
 * releases.
 *
 * Three tabs:
 *  - Coverage: KPI strip (total reach / items this quarter / % positive) over
 *    the scoped CoverageItems, plus the coverage table. Items with no linked
 *    campaign are crisis-adjacent and carry a "Crisis watch" chip linking to
 *    the governance center.
 *  - Media contacts: journalist CRM with relationship strength and recency;
 *    the name cell links to the routed record page at /pr/contacts/:id. It
 *    used to open a Sheet, which had no URL — a contact could not be linked,
 *    bookmarked, opened in a new tab, or returned to with the back button.
 *  - Press releases: Content rows whose contentType is 'PR', with status and
 *    campaign lineage.
 *
 * All numbers are derived from the seed graph; scope (brand / BU / region)
 * narrows each tab where the entity graph allows it.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Megaphone, Newspaper, Users } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { TODAY } from "@/data/selectors";
import { canSeeNav, useRole } from "@/lib/rbac";
import { useScope } from "@/lib/scope";
import { fmtCompact, fmtDate, fmtPct } from "@/lib/format";

import { PageHeader } from "@/components/marcomm/PageHeader";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { KpiTile } from "@/components/marcomm/KpiTile";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
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
import { Chip } from "@/components/marcomm/Chip";
import {
  relationshipTone,
  relativeToToday,
  scopedCoverage,
  sentimentTone,
} from "@/lib/coverage";

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Derivations                                                         */
/* ------------------------------------------------------------------ */

/** True when `iso` falls inside the calendar quarter containing TODAY. */
function inCurrentQuarter(iso: string): boolean {
  const today = new Date(`${TODAY}T00:00:00Z`);
  const qStartMonth = Math.floor(today.getUTCMonth() / 3) * 3;
  const start = Date.UTC(today.getUTCFullYear(), qStartMonth, 1);
  const end = Date.UTC(today.getUTCFullYear(), qStartMonth + 3, 1);
  const t = Date.parse(iso);
  return t >= start && t < end;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PRMediaPage() {
  const db = useLiveDB();
  const { brandId, businessUnitId, regionId } = useScope();
  const { role } = useRole();
  // PR Manager reaches this page but not the governance center — linking the
  // crisis chip there would land them on the restricted-area notice.
  const canOpenGovernance = canSeeNav(role, "governance");

  const campaignById = useMemo(
    () => new Map(db.campaigns.map((c) => [c.id, c])),
    [db],
  );
  const contactById = useMemo(
    () => new Map(db.mediaContacts.map((m) => [m.id, m])),
    [db],
  );
  const regionName = (id: string): string =>
    db.regions.find((r) => r.id === id)?.name ?? id;

  /* -- Coverage: the shared rule, so /pr/contacts/:id cannot disagree --- */
  const coverage = useMemo(
    () => scopedCoverage(db, { brandId, businessUnitId, regionId }),
    [db, brandId, businessUnitId, regionId],
  );

  const totalReach = coverage.reduce((sum, item) => sum + item.reach, 0);
  const itemsThisQuarter = coverage.filter((item) =>
    inCurrentQuarter(item.publishedAt),
  ).length;
  const positiveShare =
    coverage.length === 0
      ? 0
      : coverage.filter((item) => item.sentiment === "Positive").length /
        coverage.length;

  /* -- Media contacts (region is the only scopable field) ------------ */
  const contacts = useMemo(() => {
    return db.mediaContacts
      .filter((contact) => !regionId || contact.regionId === regionId)
      .slice()
      .sort((a, b) => b.lastInteractionAt.localeCompare(a.lastInteractionAt, DEFAULT_LOCALE));
  }, [db, regionId]);

  /* -- Press releases: Content whose contentType is the 'PR' kind ---- */
  const pressReleases = useMemo(() => {
    return db.contents
      .filter((content) => {
        if (content.contentType !== "PR") return false;
        if (brandId && content.brandId !== brandId) return false;
        if (businessUnitId || regionId) {
          const campaign = content.campaignId
            ? campaignById.get(content.campaignId)
            : undefined;
          if (!campaign) return false;
          if (businessUnitId && campaign.businessUnitId !== businessUnitId)
            return false;
          if (regionId && !campaign.regionIds.includes(regionId)) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt, DEFAULT_LOCALE));
  }, [db, campaignById, brandId, businessUnitId, regionId]);

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="PR & media"
        description="Earned coverage, journalist relationships, and press releases"
      />

      <Tabs defaultValue="coverage">
        <TabsList>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="contacts">Media contacts</TabsTrigger>
          <TabsTrigger value="releases">Press releases</TabsTrigger>
        </TabsList>

        {/* ---------------- Coverage ---------------- */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiTile
              label="Total coverage reach"
              value={fmtCompact(totalReach)}
              sub={`across ${coverage.length} coverage item${coverage.length === 1 ? "" : "s"}`}
            />
            <KpiTile
              label="Items this quarter"
              value={itemsThisQuarter}
              sub="published this calendar quarter"
            />
            <KpiTile
              label="Positive sentiment"
              value={fmtPct(positiveShare)}
              sub="share of coverage rated positive"
            />
          </div>

          {coverage.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="No coverage in this scope"
              hint="Widen the brand, business unit, or region filters in the top bar to see more coverage."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Headline</TableHead>
                      <TableHead className="w-40">Outlet</TableHead>
                      <TableHead className="w-36">Contact</TableHead>
                      <TableHead className="w-48">Campaign</TableHead>
                      <TableHead className="w-28">Published</TableHead>
                      <TableHead className="w-28">Sentiment</TableHead>
                      <TableHead className="w-24 text-right">Reach</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverage.map((item) => {
                      const campaign = item.campaignId
                        ? campaignById.get(item.campaignId)
                        : undefined;
                      const contact = item.mediaContactId
                        ? contactById.get(item.mediaContactId)
                        : undefined;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.headline}
                          </TableCell>
                          <TableCell className="text-sm">{item.outlet}</TableCell>
                          <TableCell className="text-sm">
                            {contact ? (
                              <Link
                                to={`/pr/contacts/${contact.id}`}
                                className="text-primary hover:underline"
                              >
                                {contact.name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
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

        {/* ---------------- Media contacts ---------------- */}
        <TabsContent value="contacts" className="space-y-4">
          {contacts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No media contacts in this scope"
              hint="Widen the region filter in the top bar to see more contacts."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-44">Outlet</TableHead>
                      <TableHead>Beat</TableHead>
                      <TableHead className="w-36">Region</TableHead>
                      <TableHead className="w-32">Relationship</TableHead>
                      <TableHead className="w-36">Last interaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/pr/contacts/${contact.id}`}
                            className="text-primary hover:underline"
                          >
                            {contact.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{contact.outlet}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.beat}
                        </TableCell>
                        <TableCell className="text-sm">
                          {regionName(contact.regionId)}
                        </TableCell>
                        <TableCell>
                          <Chip tone={relationshipTone[contact.relationship]}>
                            {contact.relationship}
                          </Chip>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {relativeToToday(contact.lastInteractionAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------- Press releases ---------------- */}
        <TabsContent value="releases" className="space-y-4">
          {pressReleases.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No press releases in this scope"
              hint="Widen the brand, business unit, or region filters in the top bar to see more press releases."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-48">Campaign</TableHead>
                      <TableHead className="w-36">Brand</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-28">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pressReleases.map((content) => {
                      const campaign = content.campaignId
                        ? campaignById.get(content.campaignId)
                        : undefined;
                      return (
                        <TableRow key={content.id}>
                          <TableCell>
                            <Link
                              to={`/content/${content.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {content.title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">
                            {campaign ? (
                              <Link
                                to={`/campaigns/${campaign.id}`}
                                className="text-primary hover:underline"
                              >
                                {campaign.name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {db.brands.find((b) => b.id === content.brandId)?.name ??
                              content.brandId}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={content.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fmtDate(content.updatedAt)}
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
      </Tabs>
    </div>
  );
}
