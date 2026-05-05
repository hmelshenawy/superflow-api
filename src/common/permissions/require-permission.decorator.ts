import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Marks an endpoint as requiring one or more permissions.
 * The PermissionsGuard checks that the authenticated user's role
 * includes at least one of the specified permissions.
 *
 * The `admin` role always passes regardless of the permissions array.
 *
 * @example
 * @RequirePermission('jobs:create')
 * @RequirePermission('jobs:read', 'jobs:update')  // any one is sufficient
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);