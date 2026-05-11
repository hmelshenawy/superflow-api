import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../common/plan-features/usage.service';
import { FeatureKey } from '../common/plan-features/feature-keys';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService, private usageService: UsageService) {}

  /** Get all plans with regional pricing and features for a given region */
  async getPricing(region: string) {
    const [plans, planFeatures, planRegions, addOns] = await Promise.all([
      this.prisma.raw.plans.findMany({ where: { is_active: true }, orderBy: { price_monthly_cents: 'asc' } }),
      this.prisma.raw.plan_features.findMany({ orderBy: [{ plan_id: 'asc' }, { feature_key: 'asc' }] }),
      this.prisma.raw.plan_regions.findMany({ where: { region } }),
      this.prisma.raw.plan_add_ons.findMany({ include: { plan_add_on_prices: { where: { region } } } }),
    ]);

    const featuresByPlan = new Map<string, typeof planFeatures>();
    for (const pf of planFeatures) {
      if (!featuresByPlan.has(pf.plan_id)) featuresByPlan.set(pf.plan_id, []);
      featuresByPlan.get(pf.plan_id)!.push(pf);
    }

    const priceByPlanRegion = new Map<string, typeof planRegions[0]>();
    for (const pr of planRegions) {
      priceByPlanRegion.set(`${pr.plan_id}:${pr.region}`, pr);
    }

    return plans.map(plan => {
      const regionPrice = priceByPlanRegion.get(`${plan.id}:${region}`);
      const features = featuresByPlan.get(plan.id) || [];
      return {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: regionPrice?.price_monthly_cents ?? plan.price_monthly_cents,
        currency: regionPrice?.currency ?? plan.currency,
        displayName: regionPrice?.display_name ?? plan.name,
        features: features.map(f => ({
          key: f.feature_key,
          isIncluded: f.is_included,
          ceiling: f.ceiling,
          overageUnitCents: f.overage_unit_cents,
        })),
      };
    });
  }

  /** Get current subscription details including plan features and usage */
  async getSubscription(workshopId: string) {
    const subscription = await this.prisma.raw.subscriptions.findFirst({
      where: { workshop_id: workshopId, status: { in: ['active', 'paid', 'manual_active', 'trialing'] } },
      orderBy: { created_at: 'desc' },
    });

    const planId = subscription?.plan_id || 'free_trial';
    const plan = await this.prisma.raw.plans.findUnique({ where: { id: planId } });
    const features = await this.prisma.raw.plan_features.findMany({ where: { plan_id: planId } });
    const usage = await this.usageService.getUsageSummary(workshopId);

    const region = subscription?.region || 'gcc';
    const regionPrice = await this.prisma.raw.plan_regions.findUnique({
      where: { plan_id_region: { plan_id: planId, region } },
    });

    return {
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.plan_id,
        region: subscription.region,
        additionalLocations: subscription.additional_locations,
        billingModel: subscription.billing_model,
        trialEndsAt: subscription.trial_ends_at,
        currentPeriodStartsAt: subscription.current_period_starts_at,
        currentPeriodEndsAt: subscription.current_period_ends_at,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      } : null,
      plan: {
        id: plan?.id,
        name: plan?.name,
        description: plan?.description,
        price: regionPrice?.price_monthly_cents ?? plan?.price_monthly_cents,
        currency: regionPrice?.currency ?? plan?.currency,
      },
      features: features.map(f => ({
        key: f.feature_key,
        isIncluded: f.is_included,
        ceiling: f.ceiling,
        overageUnitCents: f.overage_unit_cents,
      })),
      usage,
    };
  }

  /** Get usage summary for a workshop */
  async getUsage(workshopId: string) {
    return this.usageService.getUsageSummary(workshopId);
  }

  /** Check if a feature is available for a workshop's plan */
  async checkFeature(workshopId: string, featureKey: FeatureKey) {
    return this.usageService.checkCeiling(workshopId, featureKey);
  }
}