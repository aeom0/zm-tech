import type { Session, User } from "@supabase/supabase-js";
import type { OdentalJwtClaims, OdentalRole } from "./types";

const ROLES: ReadonlySet<string> = new Set([
  "dev",
  "dentist-owner",
  "assistant",
  "specialist",
]);

function asRole(value: unknown): OdentalRole | null {
  if (typeof value === "string" && ROLES.has(value)) {
    return value as OdentalRole;
  }
  return null;
}

/**
 * Extrae claims Odental del JWT / user.
 * Preferencia: app_metadata (seguro) → user_metadata (solo legacy, no usar para authz en RLS).
 */
export function extractOdentalClaims(
  session: Session | null | undefined,
): OdentalJwtClaims {
  const user = session?.user;
  if (!user) {
    return { tenantId: null, role: null, employeeId: null };
  }
  return extractOdentalClaimsFromUser(user);
}

export function extractOdentalClaimsFromUser(user: User): OdentalJwtClaims {
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const tenantId =
    typeof app.tenant_id === "string" && app.tenant_id.length > 0
      ? app.tenant_id
      : null;
  const employeeId =
    typeof app.employee_id === "string" && app.employee_id.length > 0
      ? app.employee_id
      : null;
  const role = asRole(app.role);

  return { tenantId, role, employeeId };
}

export function isOdentalAdmin(role: OdentalRole | null): boolean {
  return role === "dev" || role === "dentist-owner";
}
