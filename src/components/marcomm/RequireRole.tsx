import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { APP_ROLES, canSeeNav, useRole, type NavKey } from "@/lib/rbac";
import { EmptyState } from "@/components/marcomm/EmptyState";

interface RequireRoleProps {
  /** Nav key whose NAV_RESTRICTIONS entry gates this route. */
  navKey: NavKey;
  children: ReactNode;
}

/**
 * Route-level RBAC guard. Renders children only when the current role can
 * see `navKey` (same rule the sidebar uses via canSeeNav), closing the
 * deep-link hole where restricted sections stayed reachable by URL.
 */
export function RequireRole({ navKey, children }: RequireRoleProps) {
  const { role } = useRole();
  const navigate = useNavigate();

  if (canSeeNav(role, navKey)) return <>{children}</>;

  const allowedRoles = APP_ROLES.filter((r) => canSeeNav(r, navKey));

  return (
    <div className="p-6">
      <EmptyState
        icon={Lock}
        title="This area is restricted"
        hint={`Available to: ${allowedRoles.join(", ")}. You are signed in as ${role}.`}
        action={{ label: "Switch identity", onClick: () => navigate("/login") }}
      />
    </div>
  );
}
