import { Injectable, CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_FEATURE_KEY } from '../plan-features/require-plan-feature.decorator';
import { FeatureKey } from '../plan-features/feature-keys';

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(PLAN_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.workshopId) throw new ForbiddenException('Workshop context required');
    if (user.role === 'platform_admin') return true;

    // Get the workshop's active subscription
    const subscription = await this.prisma.raw.subscriptions.findFirst({
      where: { workshop_id: user.workshopId, status: { in: ['active', 'paid', 'manual_active', 'trialing'] } },
      orderBy: { created_at: 'desc' },
      select: { id: true, plan_id: true, status: true, trial_ends_at: true },
    });

    // No subscription — treat as free trial
    const planId = subscription?.plan_id || 'free_trial';

    // Check if the feature is included in the plan
    const planFeature = await this.prisma.raw.plan_features.findUnique({
      where: { plan_id_feature_key: { plan_id: planId, feature_key: requiredFeature as FeatureKey } },
    });

    if (!planFeature?.is_included) {
      throw new HttpException(
        {
          statusCode: 403,
          message: `This feature requires a higher plan. Upgrade to access ${requiredFeature}.`,
          error: 'Plan Feature Required',
          featureKey: requiredFeature,
          currentPlan: planId,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}