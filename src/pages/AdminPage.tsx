/**
 * Administration — Platform Admin-only surface.
 *
 * Three tabs:
 *  - Workflows: the versioned workflow designer, embedded (behavior unchanged).
 *  - Org structure: read-only tree Organization → BusinessUnits → Brands with
 *    derived counts (campaigns per BU, contents per brand), plus the Regions list.
 *  - Users & roles: seeded stakeholder table with a "Sign in as" action, and the
 *    role × nav-key visibility matrix rendered straight from canSeeNav.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  Globe2,
  Landmark,
  LogIn,
  Minus,
  ShieldAlert,
  Tag,
  RotateCcw,
} from "lucide-react";
import { getSeedDB } from "@/data/seed";
import type { Campaign, Content } from "@/data/types";
import { APP_ROLES, canSeeNav, NAV_KEYS, useRole } from "@/lib/rbac";
// The matrix documents the sidebar, so it reads the sidebar's own labels rather
// than keeping a second copy that can drift out of step with it.
import { NAV_LABELS } from "@/lib/navLabels";
import { toast } from "sonner";
import { useCollection } from "@/store/DataStore";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { WorkflowDesignerPanel } from "@/pages/WorkflowDesigner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

/*
 * Reference rows come from the ACTIVE demo pack, never from the default pack's
 * seed modules. Importing `seedOrganization` / `seedStakeholders` directly
 * rendered Aureon's org tree and Aureon's people over another pack's campaign
 * and content counts — the same split-brain `rbac.ts` calls out for identities.
 */
const seedOrganization = getSeedDB().org;
const seedBusinessUnits = getSeedDB().businessUnits;
const seedBrands = getSeedDB().brands;
const seedRegions = getSeedDB().regions;
const seedStakeholders = getSeedDB().stakeholders;

const buNameById = new Map(seedBusinessUnits.map((bu) => [bu.id, bu.name]));
const regionById = new Map(seedRegions.map((r) => [r.id, r]));
const brandById = new Map(seedBrands.map((b) => [b.id, b]));
const policyById = new Map(getSeedDB().policies.map((p) => [p.id, p]));


/* ------------------------------------------------------------------ */
/* Org structure tab                                                   */
/* ------------------------------------------------------------------ */

function OrgStructureTab() {
  const campaigns = useCollection<Campaign>("campaigns", getSeedDB().campaigns);
  const contents = useCollection<Content>("contents", getSeedDB().contents);

  const campaignsByBu = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of campaigns.records)
      m.set(c.businessUnitId, (m.get(c.businessUnitId) ?? 0) + 1);
    return m;
  }, [campaigns.records]);

  const contentsByBrand = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contents.records) m.set(c.brandId, (m.get(c.brandId) ?? 0) + 1);
    return m;
  }, [contents.records]);

  // Brands hang off the Organization in the data model; the tree places each
  // brand under the business units its campaigns actually run in (derived).
  const brandIdsByBu = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of campaigns.records) {
      const list = m.get(c.businessUnitId) ?? [];
      if (!list.includes(c.brandId)) list.push(c.brandId);
      m.set(c.businessUnitId, list);
    }
    return m;
  }, [campaigns.records]);

  const placedBrandIds = useMemo(
    () => new Set([...brandIdsByBu.values()].flat()),
    [brandIdsByBu],
  );
  const unplacedBrands = seedBrands.filter((b) => !placedBrandIds.has(b.id));

  const renderBrand = (brandId: string) => {
    const brand = brandById.get(brandId);
    if (!brand) return null;
    const contentCount = contentsByBrand.get(brand.id) ?? 0;
    return (
      <div key={brand.id} className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{brand.name}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
            {brand.id}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {contentCount} {contentCount === 1 ? "content item" : "content items"}
          </span>
        </div>
        {brand.tone && (
          <p className="mt-1.5 text-xs italic text-muted-foreground">{brand.tone}</p>
        )}
        {brand.guardrailPolicyIds && brand.guardrailPolicyIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {brand.guardrailPolicyIds.map((pid) => {
              const policy = policyById.get(pid);
              return (
                <Badge
                  key={pid}
                  variant={policy?.enforcement === "block" ? "destructive" : "secondary"}
                  className="h-5 px-1.5 text-[10px] font-normal"
                >
                  {policy?.name ?? pid}
                  {policy && ` · ${policy.enforcement}`}
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* -------------------------------------------------- Org tree */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
            Organization structure
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Read-only — brands attach to the organization and are shown under the
            business units their campaigns run in.
          </p>
        </CardHeader>
        <CardContent>
          {/* Organization root */}
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-semibold">{seedOrganization.name}</span>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
              {seedOrganization.id}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {seedBusinessUnits.length} business units · {seedBrands.length} brands
            </span>
          </div>

          {/* Business units */}
          <div className="ml-2 mt-3 space-y-4 border-l pl-4">
            {seedBusinessUnits.map((bu) => {
              const campaignCount = campaignsByBu.get(bu.id) ?? 0;
              const buBrandIds = brandIdsByBu.get(bu.id) ?? [];
              return (
                <div key={bu.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{bu.name}</span>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                      {bu.id}
                    </Badge>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                      {campaignCount} {campaignCount === 1 ? "campaign" : "campaigns"}
                    </Badge>
                  </div>
                  {buBrandIds.length > 0 && (
                    <div className="ml-2 mt-2 space-y-2 border-l pl-4">
                      {buBrandIds.map(renderBrand)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Brands with no campaigns in any BU stay at org level */}
            {unplacedBrands.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Organization-wide (no campaigns yet)
                </div>
                <div className="ml-2 mt-2 space-y-2 border-l pl-4">
                  {unplacedBrands.map((b) => renderBrand(b.id))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------- Regions */}
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
            Regions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {seedRegions.map((region) => (
            <div
              key={region.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{region.name}</div>
                <div className="text-[11px] text-muted-foreground">{region.id}</div>
              </div>
              <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px] font-normal">
                {region.code}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Users & roles tab                                                   */
/* ------------------------------------------------------------------ */

function UsersRolesTab() {
  const { setRole } = useRole();
  const navigate = useNavigate();

  // A nav key belongs in the matrix iff at least one role cannot see it.
  const restrictedNavKeys = useMemo(
    () => NAV_KEYS.filter((key) => APP_ROLES.some((role) => !canSeeNav(role, key))),
    [],
  );

  return (
    <div className="space-y-4">
      {/* -------------------------------------------- Stakeholder table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Users</CardTitle>
          <p className="text-xs text-muted-foreground">
            One identity per role — signing in as a person drives navigation and
            data scoping across the app.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Business unit</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Brands</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {seedStakeholders.map((person) => {
                  const region = regionById.get(person.regionId);
                  return (
                    <TableRow key={person.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                            {person.avatar}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{person.name}</div>
                            <div className="text-[11px] text-muted-foreground">{person.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="h-5 whitespace-nowrap px-1.5 text-[10px] font-normal">
                          {person.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {buNameById.get(person.businessUnitId) ?? person.businessUnitId}
                      </TableCell>
                      <TableCell className="text-sm">
                        {region?.code ?? person.regionId}
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-52 flex-wrap gap-1">
                          {person.brandIds.map((brandId) => (
                            <Badge
                              key={brandId}
                              variant="secondary"
                              className="h-5 px-1.5 text-[10px] font-normal"
                            >
                              {brandById.get(brandId)?.name ?? brandId}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {person.email}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Sign in as ${person.name}, ${person.role}`}
                          onClick={() => {
                            setRole(person.role);
                            navigate("/dashboard");
                          }}
                        >
                          <LogIn className="mr-1 h-3.5 w-3.5" />
                          Sign in as
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------- Nav visibility matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Navigation visibility by role</CardTitle>
          <p className="text-xs text-muted-foreground">
            Navigation follows the role matrix — scoping happens in data, not hidden
            buttons
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nav entry</TableHead>
                  {APP_ROLES.map((role) => (
                    <TableHead
                      key={role}
                      className="whitespace-nowrap text-center text-[11px]"
                    >
                      {role}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {restrictedNavKeys.map((key) => (
                  <TableRow key={key}>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {NAV_LABELS[key]}
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                        {key}
                      </span>
                    </TableCell>
                    {APP_ROLES.map((role) => {
                      const visible = canSeeNav(role, key);
                      return (
                        <TableCell key={role} className="text-center">
                          {visible ? (
                            <Check
                              aria-label={`${role} can see ${NAV_LABELS[key]}`}
                              className="mx-auto h-4 w-4 text-primary"
                            />
                          ) : (
                            <Minus
                              aria-label={`${role} cannot see ${NAV_LABELS[key]}`}
                              className="mx-auto h-4 w-4 text-muted-foreground/40"
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const { role } = useRole();

  if (role !== "Platform Admin") {
    return (
      <div className="space-y-4 p-6">
        <PageHeader
          title="Administration"
          description="Workflows, org structure, and users & roles"
        />
        <EmptyState
          icon={ShieldAlert}
          title="Platform administration is restricted"
          hint="Only the Platform Admin identity can manage workflows, the org structure, and user roles. Sign in as Sam Whitfield to administer the platform."
          actionSlot={
            <Button size="sm" variant="outline" asChild>
              <Link to="/login">
                <LogIn className="mr-1 h-3.5 w-3.5" />
                Switch identity
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Administration"
        description="Workflows, org structure, and users & roles"
      />

      <Tabs defaultValue="workflows">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="org">Org structure</TabsTrigger>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-4">
          <WorkflowDesignerPanel />
        </TabsContent>

        <TabsContent value="org" className="mt-4">
          <OrgStructureTab />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersRolesTab />
        </TabsContent>
      </Tabs>

      <DemoDataPanel />
    </div>
  );
}

/**
 * Restore the shipped dataset (FR-ADM demo operations).
 *
 * Every decision taken in the app — approving an item, promoting an idea,
 * pausing a send — is written to the browser-local store and persists across
 * reloads. That is correct behaviour, but it means a presenter who works
 * through a queue empties it permanently for that browser, and the next demo
 * opens on an approvals inbox with nothing in it and no way back short of
 * clearing site data by hand. This is that way back.
 *
 * It discards local edits only. The shipped seed is never modified, so this
 * cannot lose anything that was not made in this browser.
 */
function DemoDataPanel() {
  // Any collection handle exposes the same store-wide reset; campaigns is
  // simply one this page already registers.
  const { resetAll } = useCollection<Campaign>("campaigns", getSeedDB().campaigns);
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <RotateCcw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Demo data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-sm text-muted-foreground">
          Decisions made in this browser — approvals, promotions, send freezes — are
          saved locally and survive a reload. Restoring puts every collection back to
          the dataset the build shipped with, so a queue that has been worked through
          comes back for the next run.
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              Discard every change made in this browser?
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                resetAll();
                setConfirming(false);
                toast.success("Demo data restored", {
                  description: "Every collection is back to the shipped dataset.",
                });
              }}
            >
              Restore shipped data
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Restore shipped data
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
