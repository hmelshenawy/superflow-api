type PermissionUser = {
  role?: { name?: string | null; permissions?: string[] | string | null } | null;
  role_id?: string | null;
} | null;

export function isPlatformAdmin(user: PermissionUser): boolean {
  return user?.role?.name?.toLowerCase() === "platform_admin";
}

export function isAdmin(user: PermissionUser): boolean {
  if (!user) return false;
  const roleName = user.role?.name?.toLowerCase();
  if (roleName === "admin" || roleName === "administrator" || roleName === "super_admin" || roleName === "platform_admin" || roleName === "workshop_admin") return true;
  const roleId = user.role_id;
  if (roleId === "admin" || roleId === "super_admin") return true;
  return false;
}

export function getUserPermissions(user: PermissionUser): Set<string> {
  if (!user) return new Set();
  if (isAdmin(user)) return new Set(["*"]);
  const perms = user.role?.permissions;
  if (!perms) return new Set();
  if (Array.isArray(perms)) return new Set(perms);
  try { return new Set(JSON.parse(String(perms))); } catch { return new Set(); }
}

export function hasPermission(user: PermissionUser, permission: string): boolean {
  if (isAdmin(user)) return true;
  return getUserPermissions(user).has(permission);
}

export function hasAnyPermission(user: PermissionUser, permissions: string[]): boolean {
  if (permissions.length === 0) return true;
  if (isAdmin(user)) return true;
  const userPerms = getUserPermissions(user);
  return permissions.some(p => userPerms.has(p));
}

export const SETTINGS_TAB_PERMISSIONS: Record<string, string[]> = {
  account: [],
  workshop: ["admin:settings:edit"],
  workflow: ["admin:settings:edit"],
  priority: ["admin:settings:edit"],
  schedule: ["admin:settings:edit"],
  jobTypes: ["admin:settings:edit"],
  inspection: ["admin:templates"],
  qc: ["admin:templates"],
  billing: ["admin:billing"],
  notifications: ["admin:settings:edit"],
  integrations: ["admin:integrations"],
};