import { Injectable, CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../permissions/require-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private async assertTrialAllowsRequest(user: any, method: string) {
    if (!user?.workshopId || user.role === 'platform_admin') return;
    if (method.toUpperCase() === 'GET') return;

    const subscription = await this.prisma.raw.subscriptions.findFirst({
      where: { workshop_id: user.workshopId },
      orderBy: { created_at: 'desc' },
      select: {
        status: true,
        trial_ends_at: true,
        current_period_ends_at: true,
      },
    });

    const activeStatuses = new Set(['active', 'paid', 'manual_active', 'comped']);
    if (subscription?.status && activeStatuses.has(subscription.status)) return;

    const workshop = subscription ? null : await this.prisma.raw.workshops.findUnique({
      where: { id: user.workshopId },
      select: { trial_ends_at: true },
    });
    const expiry = subscription?.trial_ends_at || subscription?.current_period_ends_at || workshop?.trial_ends_at;
    if (!expiry || expiry > new Date()) return;

    throw new HttpException(
      'Your PrioraFlow trial has expired. Contact admin@prioraflow.com to activate your workspace.',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) {
      throw new ForbiddenException('Missing permission: authentication required');
    }

    // Admin and platform_admin always pass
    if (user.role === 'platform_admin') return true;

    await this.assertTrialAllowsRequest(user, request.method);

    const userPermissions: string[] = user.permissions ?? [];
    const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p));
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${requiredPermissions.join(', ')} — contact your admin to update your role`,
      );
    }
    return true;
  }
}
