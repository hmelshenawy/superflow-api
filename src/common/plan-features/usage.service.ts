import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeatureKey } from './feature-keys';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  /** Get current period string (YYYY-MM) */
  private getCurrentPeriod(): string {
    return new Date().toISOString().slice(0, 7);
  }

  /**
   * Increment usage counter for a feature. Does NOT enforce ceilings —
   * only tracks usage for dashboard display. Enforcement comes later.
   */
  async increment(workshopId: string, featureKey: FeatureKey, delta: number = 1): Promise<{ count: number }> {
    const period = this.getCurrentPeriod();

    const existing = await this.prisma.raw.usage_records.findUnique({
      where: { workshop_id_feature_key_period: { workshop_id: workshopId, feature_key: featureKey, period } },
    });

    if (existing) {
      const updated = await this.prisma.raw.usage_records.update({
        where: { id: existing.id },
        data: { count: { increment: delta }, updated_at: new Date() },
      });
      return { count: updated.count };
    }

    const created = await this.prisma.raw.usage_records.create({
      data: { id: uuidv4(), workshop_id: workshopId, feature_key: featureKey, period, count: delta },
    });
    return { count: created.count };
  }

  /**
   * Check current usage against the plan ceiling for a feature.
   * Returns usage data for dashboard display. Does NOT block — just reports.
   */
  async checkCeiling(workshopId: string, featureKey: FeatureKey): Promise<{
    count: number;
    ceiling: number | null;
    allowed: boolean;
    planId: string;
  }> {
    const period = this.getCurrentPeriod();

    const [usage, subscription] = await Promise.all([
      this.prisma.raw.usage_records.findUnique({
        where: { workshop_id_feature_key_period: { workshop_id: workshopId, feature_key: featureKey, period } },
      }),
      this.prisma.raw.subscriptions.findFirst({
        where: { workshop_id: workshopId, status: { in: ['active', 'paid', 'manual_active', 'trialing'] } },
        orderBy: { created_at: 'desc' },
        select: { plan_id: true },
      }),
    ]);

    const planId = subscription?.plan_id || 'free_trial';
    const count = usage?.count ?? 0;

    const planFeature = await this.prisma.raw.plan_features.findUnique({
      where: { plan_id_feature_key: { plan_id: planId, feature_key: featureKey } },
    });

    const ceiling = planFeature?.ceiling ?? null;
    const allowed = ceiling === null || count < ceiling;

    return { count, ceiling, allowed, planId };
  }

  /**
   * Get full usage summary for a workshop — all features with current count and ceiling.
   */
  async getUsageSummary(workshopId: string): Promise<Array<{
    featureKey: string;
    count: number;
    ceiling: number | null;
    isIncluded: boolean;
    overageUnitCents: number;
  }>> {
    const period = this.getCurrentPeriod();

    const subscription = await this.prisma.raw.subscriptions.findFirst({
      where: { workshop_id: workshopId, status: { in: ['active', 'paid', 'manual_active', 'trialing'] } },
      orderBy: { created_at: 'desc' },
      select: { plan_id: true },
    });

    const planId = subscription?.plan_id || 'free_trial';

    const [planFeatures, usageRecords] = await Promise.all([
      this.prisma.raw.plan_features.findMany({ where: { plan_id: planId } }),
      this.prisma.raw.usage_records.findMany({
        where: { workshop_id: workshopId, period },
      }),
    ]);

    const usageMap = new Map(usageRecords.map(r => [r.feature_key, r.count]));

    return planFeatures.map(pf => ({
      featureKey: pf.feature_key,
      count: usageMap.get(pf.feature_key) ?? 0,
      ceiling: pf.ceiling,
      isIncluded: pf.is_included,
      overageUnitCents: pf.overage_unit_cents,
    }));
  }
}