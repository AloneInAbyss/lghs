/**
 * Returns true when the member has the configured admin role.
 * Role IDs come from Discord guild configuration, not from display names.
 */
export function memberHasAdminRole(
  memberRoleIds: ReadonlySet<string> | readonly string[],
  adminRoleId: string,
): boolean {
  if (memberRoleIds instanceof Set) {
    return memberRoleIds.has(adminRoleId);
  }
  return (memberRoleIds as readonly string[]).includes(adminRoleId);
}
