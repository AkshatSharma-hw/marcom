// Seeded-identity login picker (BLUEPRINT.md Part 6 §4): the persona is
// chosen by signing in as a seeded person — choosing a person, not
// flipping a switch. Rendered full-screen outside AppLayout.

import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { useRole } from "@/lib/rbac";
import { getSeedDB } from "@/data/seed";

const { brands: seedBrands, businessUnits: seedBusinessUnits, regions: seedRegions, stakeholders: seedStakeholders } = getSeedDB();

const buNameById = new Map(seedBusinessUnits.map((bu) => [bu.id, bu.name]));
const regionById = new Map(seedRegions.map((r) => [r.id, r]));
const brandNameById = new Map(seedBrands.map((b) => [b.id, b.name]));

export default function LoginPicker() {
  const { role, setRole } = useRole();
  // Before a first sign-in the role context still reports its default, so the
  // badge would claim an identity the visitor never chose.
  const hasSignedIn = (() => {
    try {
      return localStorage.getItem("marcomm-role") !== null;
    } catch {
      return true;
    }
  })();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">MarCom</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Brand to Demand · Enterprise Singularity Platform
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose an identity to sign in as — the role drives your home
            screen, navigation, and data access
          </p>
        </header>

        {seedStakeholders.length === 0 && (
          <EmptyState
            icon={Users}
            title="No identities available"
            hint="No seeded people were found to sign in as."
          />
        )}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {seedStakeholders.map((person) => {
            const region = regionById.get(person.regionId);
            const isCurrent = hasSignedIn && person.role === role;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => {
                    setRole(person.role);
                    navigate("/dashboard");
                  }}
                  aria-label={`Sign in as ${person.name}, ${person.role}`}
                  className={
                    "flex h-full w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                    (isCurrent ? "border-primary" : "border-border")
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                      {person.avatar}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {person.name}
                        </span>
                        {isCurrent && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            Signed in
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {person.role}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {buNameById.get(person.businessUnitId)} ·{" "}
                    {region?.code ?? person.regionId}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {person.brandIds.map((brandId) => (
                      <Badge
                        key={brandId}
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {brandNameById.get(brandId) ?? brandId}
                      </Badge>
                    ))}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
