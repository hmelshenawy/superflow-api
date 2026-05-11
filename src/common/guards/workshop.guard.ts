import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkshopGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const { user } = req;
    if (!user) return true; // JwtAuthGuard handles missing user

    // platform_admin can operate without a workshop context
    if (user.role === 'platform_admin') return true;

    // If JWT has workshopId, it's already resolved
    if (user.workshopId) return true;

    // Fall back to DB: if user has exactly one workshop, set it on the request
    if (user.sub) {
      try {
        const access = await this.prisma.raw.user_workshop_access.findFirst({
          where: { user_id: user.sub },
        });
        if (access) {
          user.workshopId = access.workshop_id;
          return true;
        }
      } catch {
        // DB lookup failed — fall through to ForbiddenException
      }
    }

    throw new ForbiddenException('No workshop selected. Use POST /auth/select-workshop first.');
  }
}