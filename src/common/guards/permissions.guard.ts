import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../permissions/require-permission.decorator';

/**
 * Permission-based guard that replaces the old role-name-only RolesGuard.
 *
 * Reads the @RequirePermission() metadata and checks if the user's JWT
 * contains at least one of the required permissions.
 *
 * The `admin` role always passes every permission check, even if the
 * permissions array in the token is empty.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Admin always passes
    if (user.role === 'admin') return true;

    const userPermissions: string[] = user.permissions ?? [];
    return requiredPermissions.some((p) => userPermissions.includes(p));
  }
}