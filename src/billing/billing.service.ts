import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
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
      where: { workshop_id: workshopId, status: { in: ['active', 'paid', 'manual_active', 'trialing', 'comped'] } },
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
        priceOverrideCents: subscription.price_override_cents,
        discountPct: subscription.discount_pct,
        internalNotes: subscription.internal_notes,
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

  /** Admin: Manually activate a subscription for a workshop */
  async activateSubscription(
    workshopId: string, planId: string, region: string, activatedBy: string,
    opts?: { priceOverrideCents?: number; discountPct?: number; internalNotes?: string; status?: string },
  ) {
    const workshop = await this.prisma.raw.workshops.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new NotFoundException('Workshop not found');

    const plan = await this.prisma.raw.plans.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const status = opts?.status || 'manual_active';

    // Deactivate existing active subscriptions
    await this.prisma.raw.subscriptions.updateMany({
      where: { workshop_id: workshopId, status: { in: ['active', 'paid', 'manual_active', 'trialing', 'comped'] } },
      data: { status: 'replaced' },
    });

    const subscription = await this.prisma.raw.subscriptions.create({
      data: {
        id: uuid(),
        workshop_id: workshopId,
        plan_id: planId,
        region,
        status,
        current_period_starts_at: now,
        current_period_ends_at: periodEnd,
        billing_email: workshop.email,
        billing_model: 'manual',
        price_override_cents: opts?.priceOverrideCents ?? null,
        discount_pct: opts?.discountPct ?? null,
        internal_notes: opts?.internalNotes ?? null,
      },
    });

    // Update workshop plan_id
    await this.prisma.raw.workshops.update({
      where: { id: workshopId },
      data: { plan_id: planId },
    });

    return {
      id: subscription.id,
      status: subscription.status,
      planId: subscription.plan_id,
      region: subscription.region,
      currentPeriodStartsAt: subscription.current_period_starts_at,
      currentPeriodEndsAt: subscription.current_period_ends_at,
      priceOverrideCents: subscription.price_override_cents,
      discountPct: subscription.discount_pct,
      internalNotes: subscription.internal_notes,
      activatedBy,
    };
  }

  /** Admin: Create a manual invoice for a workshop */
  async createInvoice(workshopId: string, planId: string, region: string, periodStart?: string, periodEnd?: string) {
    const workshop = await this.prisma.raw.workshops.findUnique({ where: { id: workshopId } });
    if (!workshop) throw new NotFoundException('Workshop not found');

    const regionPrice = await this.prisma.raw.plan_regions.findUnique({
      where: { plan_id_region: { plan_id: planId, region } },
    });
    if (!regionPrice) throw new BadRequestException('No pricing found for this plan/region combination');

    // Look up subscription for custom pricing overrides
    const subscription = await this.prisma.raw.subscriptions.findFirst({
      where: { workshop_id: workshopId, plan_id: planId, status: { in: ['active', 'paid', 'manual_active', 'trialing', 'comped'] } },
    });

    const basePrice = subscription?.price_override_cents ?? regionPrice.price_monthly_cents;
    const discountPct = subscription?.discount_pct ?? 0;
    const discountCents = discountPct ? Math.round(basePrice * discountPct / 100) : 0;
    const totalCents = basePrice - discountCents;

    const now = new Date();
    const startDate = periodStart ? new Date(periodStart) : now;
    const endDate = periodEnd ? new Date(periodEnd) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const invoice = await this.prisma.raw.invoices.create({
      data: {
        id: uuid(),
        workshop_id: workshopId,
        subscription_id: subscription?.id ?? null,
        invoice_number: invoiceNumber,
        status: 'draft',
        currency: regionPrice.currency,
        subtotal_cents: basePrice,
        tax_cents: 0,
        total_cents: totalCents,
        amount_paid_cents: 0,
        due_at: dueDate,
        issued_at: now,
      },
    });

    await this.prisma.raw.invoice_items.create({
      data: {
        id: uuid(),
        invoice_id: invoice.id,
        type: 'plan',
        feature_key: planId,
        description: `${planId} plan — ${region.toUpperCase()} — monthly${discountPct ? ` (${discountPct}% discount)` : ''}`,
        quantity: 1,
        unit_amount_cents: basePrice,
        total_cents: totalCents,
        period: `${startDate.toISOString().slice(0, 7)}`,
      },
    });

    // Add discount line if applicable
    if (discountCents > 0) {
      await this.prisma.raw.invoice_items.create({
        data: {
          id: uuid(),
          invoice_id: invoice.id,
          type: 'discount',
          feature_key: 'discount',
          description: `${discountPct}% discount`,
          quantity: 1,
          unit_amount_cents: -discountCents,
          total_cents: -discountCents,
          period: `${startDate.toISOString().slice(0, 7)}`,
        },
      });
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      status: invoice.status,
      totalCents: invoice.total_cents,
      currency: invoice.currency,
      dueAt: invoice.due_at,
      issuedAt: invoice.issued_at,
    };
  }

  /** Admin: Get full billing overview for a workshop (subscription + invoices + payments) */
  async getWorkshopBillingOverview(workshopId: string) {
    const base = await this.getSubscription(workshopId);

    const invoices = await this.prisma.raw.invoices.findMany({
      where: { workshop_id: workshopId },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: { invoice_items: true, payments: true },
    });

    return {
      ...base,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        status: inv.status,
        totalCents: inv.total_cents,
        currency: inv.currency,
        dueAt: inv.due_at,
        issuedAt: inv.issued_at,
        paidAt: inv.paid_at,
        items: inv.invoice_items.map(ii => ({
          id: ii.id,
          description: ii.description,
          quantity: ii.quantity,
          unitAmountCents: ii.unit_amount_cents,
          totalCents: ii.total_cents,
          type: ii.type,
          period: ii.period,
        })),
        payments: inv.payments.map(p => ({
          id: p.id,
          status: p.status,
          amountCents: p.amount_cents,
          currency: p.currency,
          method: p.method,
          providerName: p.provider_name,
          paidAt: p.paid_at,
        })),
      })),
    };
  }

  /** Admin: Mark an invoice as paid (manual payment reconciliation) */
  async markInvoicePaid(invoiceId: string, method: string, reference?: string) {
    const invoice = await this.prisma.raw.invoices.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === 'paid') throw new BadRequestException('Invoice is already paid');

    const now = new Date();

    await this.prisma.raw.$transaction([
      this.prisma.raw.invoices.update({
        where: { id: invoiceId },
        data: { status: 'paid', amount_paid_cents: invoice.total_cents, paid_at: now },
      }),
      this.prisma.raw.payments.create({
        data: {
          id: uuid(),
          invoice_id: invoiceId,
          workshop_id: invoice.workshop_id,
          status: 'succeeded',
          amount_cents: invoice.total_cents,
          currency: invoice.currency,
          method,
          provider_name: 'manual',
          provider_payment_id: reference || null,
          paid_at: now,
        },
      }),
    ]);

    return { id: invoiceId, status: 'paid', paidAt: now };
  }
}