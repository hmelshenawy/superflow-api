import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class WorkshopGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // JwtAuthGuard handles missing user

    // platform_admin and admin can operate without a workshop context
    if (user.role === 'platform_admin' || user.role === 'admin') return true;

    // All other roles must have a workshopId in their token
    if (!user.workshopId) {
      throw new ForbiddenException('No workshop selected. Use POST /auth/select-workshop first.');
    }
    return true;
  }
}