import { useCurrentUser } from "../profile/useCurrentUser";

// DeployGuard ships two staff roles: Admin and Engineer. Admin may add,
// change and remove deployments, verify, cancel and manage people; Engineer
// may add deployments, verify, and cancel their own runs, but may not remove
// a deployment or manage people. A signed-in person with no explicit staff
// role yet is treated as an Admin so the first operator is never locked out.
export const ROLE_ADMIN = "deployguard-admin";
export const ROLE_ENGINEER = "deployguard-engineer";
export const STAFF_ROLE_SLUGS = [ROLE_ADMIN, ROLE_ENGINEER] as const;

export function staffRoleSlug(roles?: string[]): string | undefined {
  const list = roles ?? [];
  return STAFF_ROLE_SLUGS.find((slug) => list.includes(slug));
}

export function isAdminRoles(roles?: string[]): boolean {
  const list = roles ?? [];
  if (list.includes(ROLE_ADMIN)) return true;
  if (list.includes(ROLE_ENGINEER)) return false;
  // No DeployGuard staff role assigned yet -- fall back to a name-based hint
  // (e.g. a tenant role literally called "Admin") before defaulting to Admin.
  return !list.some((role) => /engineer|developer|viewer|read/i.test(role));
}

export function useIsAdmin(): boolean {
  const me = useCurrentUser();
  return isAdminRoles(me.data?.data?.roles);
}

export function useStaffRole(): "Admin" | "Engineer" {
  const me = useCurrentUser();
  return isAdminRoles(me.data?.data?.roles) ? "Admin" : "Engineer";
}