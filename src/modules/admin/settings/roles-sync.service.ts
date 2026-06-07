import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_ROLES, ALL_PERMISSIONS } from '../../../common/permissions';
import { FEATURE_KEYS } from '../../../common/plan-features/feature-keys';
import { v4 as uuid } from 'uuid';

const PLAN_FEATURE_DEFAULTS: Record<string, { feature_key: string; is_included: boolean; ceiling?: number }[]> = {
  free_trial: [
    { feature_key: FEATURE_KEYS.JOB_BOARD, is_included: true },
    { feature_key: FEATURE_KEYS.STAGES, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL, is_included: true },
    { feature_key: FEATURE_KEYS.DVI_REPORTS, is_included: true },
    { feature_key: FEATURE_KEYS.ESTIMATES, is_included: true },
    { feature_key: FEATURE_KEYS.QC_CHECKLISTS, is_included: true },
    { feature_key: FEATURE_KEYS.JOBS, is_included: true, ceiling: 50 },
    { feature_key: FEATURE_KEYS.MAX_USERS, is_included: true, ceiling: 5 },
    { feature_key: FEATURE_KEYS.MAX_LOCATIONS, is_included: true, ceiling: 1 },
  ],
  starter: [
    { feature_key: FEATURE_KEYS.JOB_BOARD, is_included: true },
    { feature_key: FEATURE_KEYS.STAGES, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL, is_included: true },
    { feature_key: FEATURE_KEYS.DVI_REPORTS, is_included: true },
    { feature_key: FEATURE_KEYS.ESTIMATES, is_included: true },
    { feature_key: FEATURE_KEYS.QC_CHECKLISTS, is_included: true },
    { feature_key: FEATURE_KEYS.JOBS, is_included: true, ceiling: 200 },
    { feature_key: FEATURE_KEYS.MAX_USERS, is_included: true, ceiling: 10 },
    { feature_key: FEATURE_KEYS.MAX_LOCATIONS, is_included: true, ceiling: 1 },
  ],
  professional: [
    { feature_key: FEATURE_KEYS.JOB_BOARD, is_included: true },
    { feature_key: FEATURE_KEYS.STAGES, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL, is_included: true },
    { feature_key: FEATURE_KEYS.DVI_REPORTS, is_included: true },
    { feature_key: FEATURE_KEYS.ESTIMATES, is_included: true },
    { feature_key: FEATURE_KEYS.QC_CHECKLISTS, is_included: true },
    { feature_key: FEATURE_KEYS.PRIORITY_ENGINE, is_included: true },
    { feature_key: FEATURE_KEYS.NBA, is_included: true },
    { feature_key: FEATURE_KEYS.DELIVERY_RISK, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL_SMS, is_included: true },
    { feature_key: FEATURE_KEYS.INVENTORY, is_included: true },
    { feature_key: FEATURE_KEYS.PURCHASE_ORDERS, is_included: true },
    { feature_key: FEATURE_KEYS.JOBS, is_included: true, ceiling: 1000 },
    { feature_key: FEATURE_KEYS.MAX_USERS, is_included: true, ceiling: 25 },
    { feature_key: FEATURE_KEYS.MAX_LOCATIONS, is_included: true, ceiling: 3 },
  ],
  pro: [
    { feature_key: FEATURE_KEYS.JOB_BOARD, is_included: true },
    { feature_key: FEATURE_KEYS.STAGES, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL, is_included: true },
    { feature_key: FEATURE_KEYS.DVI_REPORTS, is_included: true },
    { feature_key: FEATURE_KEYS.ESTIMATES, is_included: true },
    { feature_key: FEATURE_KEYS.QC_CHECKLISTS, is_included: true },
    { feature_key: FEATURE_KEYS.PRIORITY_ENGINE, is_included: true },
    { feature_key: FEATURE_KEYS.NBA, is_included: true },
    { feature_key: FEATURE_KEYS.DELIVERY_RISK, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL_SMS, is_included: true },
    { feature_key: FEATURE_KEYS.INVENTORY, is_included: true },
    { feature_key: FEATURE_KEYS.PURCHASE_ORDERS, is_included: true },
    { feature_key: FEATURE_KEYS.JOBS, is_included: true, ceiling: 5000 },
    { feature_key: FEATURE_KEYS.MAX_USERS, is_included: true, ceiling: 50 },
    { feature_key: FEATURE_KEYS.MAX_LOCATIONS, is_included: true, ceiling: 10 },
  ],
  enterprise: [
    { feature_key: FEATURE_KEYS.JOB_BOARD, is_included: true },
    { feature_key: FEATURE_KEYS.STAGES, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL, is_included: true },
    { feature_key: FEATURE_KEYS.DVI_REPORTS, is_included: true },
    { feature_key: FEATURE_KEYS.ESTIMATES, is_included: true },
    { feature_key: FEATURE_KEYS.QC_CHECKLISTS, is_included: true },
    { feature_key: FEATURE_KEYS.PRIORITY_ENGINE, is_included: true },
    { feature_key: FEATURE_KEYS.NBA, is_included: true },
    { feature_key: FEATURE_KEYS.DELIVERY_RISK, is_included: true },
    { feature_key: FEATURE_KEYS.CUSTOMER_APPROVAL_SMS, is_included: true },
    { feature_key: FEATURE_KEYS.INVENTORY, is_included: true },
    { feature_key: FEATURE_KEYS.PURCHASE_ORDERS, is_included: true },
    { feature_key: FEATURE_KEYS.AI_SCORED_JOBS, is_included: true },
    { feature_key: FEATURE_KEYS.AI_MESSAGE_DRAFTS, is_included: true },
    { feature_key: FEATURE_KEYS.ANALYTICS, is_included: true },
    { feature_key: FEATURE_KEYS.MULTI_SHOP, is_included: true },
    { feature_key: FEATURE_KEYS.ADVISOR_WORKLOAD, is_included: true },
    { feature_key: FEATURE_KEYS.JOBS, is_included: true },
    { feature_key: FEATURE_KEYS.MAX_USERS, is_included: true },
    { feature_key: FEATURE_KEYS.MAX_LOCATIONS, is_included: true },
  ],
};

@Injectable()
export class RolesSyncService implements OnModuleInit {
  private readonly logger = new Logger(RolesSyncService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncRoles();
    await this.syncPlanFeatures();
  }

  async syncRoles() {
    const dbRoles = await this.prisma.raw.roles.findMany();
    let synced = 0;

    for (const dbRole of dbRoles) {
      const name = dbRole.name;
      if (!name) continue;
      // workshop_admin is an alias for admin — gets full permissions
      const template = name === 'workshop_admin'
        ? { name: 'workshop_admin', description: 'Full system access — workshop administrator', permissions: ALL_PERMISSIONS }
        : DEFAULT_ROLES[name];

      if (!template) continue;

      const existingPerms: string[] = dbRole.permissions ? JSON.parse(dbRole.permissions) : [];
      const targetPerms: string[] = template.permissions;

      const missing = targetPerms.filter(p => !existingPerms.includes(p));
      if (missing.length === 0) continue;

      const merged = [...new Set([...existingPerms, ...targetPerms])];
      await this.prisma.raw.roles.update({
        where: { id: dbRole.id },
        data: {
          permissions: JSON.stringify(merged),
          description: template.description || dbRole.description,
        },
      });
      this.logger.log(`Synced role "${name}": added ${missing.join(', ')}`);
      synced++;
    }

    // Create any DEFAULT_ROLES that don't exist in DB yet
    const dbRoleNames = new Set(dbRoles.map((r: { name: string | null }) => r.name));
    for (const [name, template] of Object.entries(DEFAULT_ROLES)) {
      if (dbRoleNames.has(name)) continue;
      await this.prisma.raw.roles.create({
        data: {
          id: uuid(),
          name: template.name,
          permissions: JSON.stringify(template.permissions),
          description: template.description,
        },
      });
      this.logger.log(`Created missing role "${name}"`);
      synced++;
    }

    if (synced === 0) {
      this.logger.log('All roles already in sync — no changes needed');
    }
  }

  async syncPlanFeatures() {
    const plans = await this.prisma.raw.plans.findMany({ select: { id: true } });
    const existingFeatures = await this.prisma.raw.plan_features.findMany({
      select: { plan_id: true, feature_key: true },
    });
    const existing = new Set(existingFeatures.map((f: { plan_id: string; feature_key: string }) => `${f.plan_id}:${f.feature_key}`));

    let created = 0;
    for (const [planId, features] of Object.entries(PLAN_FEATURE_DEFAULTS)) {
      const planExists = plans.some((p: { id: string }) => p.id === planId);
      if (!planExists) continue;

      for (const feat of features) {
        const key = `${planId}:${feat.feature_key}`;
        if (existing.has(key)) continue;

        await this.prisma.raw.plan_features.create({
          data: {
            id: uuid(),
            plan_id: planId,
            feature_key: feat.feature_key,
            is_included: feat.is_included,
            ceiling: feat.ceiling ?? null,
          },
        });
        this.logger.log(`Added plan feature "${feat.feature_key}" to plan "${planId}"`);
        created++;
      }
    }

    if (created === 0) {
      this.logger.log('All plan features already in sync — no changes needed');
    }
  }
}
