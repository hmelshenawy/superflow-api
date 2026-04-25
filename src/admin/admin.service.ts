import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private parseSettingValue(value: string | null, valueType: string | null | undefined) {
    if (value == null) return null;
    if (valueType === 'number') return Number(value);
    if (valueType === 'boolean') return value === 'true';
    if (valueType === 'json') {
      try { return JSON.parse(value); } catch { return value; }
    }
    return value;
  }

  async getSettings() {
    const rows = await this.prisma.settings.findMany({
      include: { users: { select: { id: true, name: true, email: true } } },
      orderBy: { key: 'asc' },
    });

    return rows.map((row: Prisma.settingsGetPayload<{include: {users: {select: {id: true, name: true, email: true}}}}>) => ({
      ...row,
      parsed_value: this.parseSettingValue(row.value, row.value_type),
    }));
  }

  async updateSettings(body: any, userId: string) {
    const settings = Array.isArray(body?.settings)
      ? body.settings
      : Object.entries(body || {}).map(([key, value]) => ({ key, value, valueType: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'object' ? 'json' : 'string' }));

    if (!settings.length) throw new BadRequestException('No settings provided');

    const result = [];
    for (const item of settings) {
      const key = item.key;
      const valueType = item.valueType || 'string';
      const value = valueType === 'json' ? JSON.stringify(item.value) : String(item.value ?? '');

      const existing = await this.prisma.settings.findUnique({ where: { key } });
      if (existing) {
        result.push(await this.prisma.settings.update({
          where: { id: existing.id },
          data: { value, value_type: valueType as any, description: item.description, updated_by: userId },
        }));
      } else {
        result.push(await this.prisma.settings.create({
          data: { id: uuid(), key, value, value_type: valueType as any, description: item.description, updated_by: userId },
        }));
      }
    }

    return result;
  }

  async getLabourRates() {
    return this.prisma.labour_rates.findMany({ orderBy: { name: 'asc' } });
  }

  async addLabourRate(body: { name: string; rate_per_hour: number; currency?: string; is_active?: boolean }) {
    if (!body?.name || body?.rate_per_hour == null) throw new BadRequestException('name and rate_per_hour are required');
    return this.prisma.labour_rates.create({
      data: {
        id: uuid(),
        name: body.name,
        rate_per_hour: body.rate_per_hour,
        currency: body.currency || 'AED',
        is_active: body.is_active ?? true,
      },
    });
  }

  async listIntegrations() {
    const rows = await this.prisma.integrations.findMany({
      include: {
        integration_events: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((row: Prisma.integrationsGetPayload<{include: {integration_events: true}}>) => ({
      ...row,
      parsed_config: row.config ? (() => { try { return JSON.parse(row.config); } catch { return row.config; } })() : null,
    }));
  }

  async testIntegration(name: string) {
    const integration = await this.prisma.integrations.findUnique({ where: { name } });
    if (!integration) throw new NotFoundException('Integration not found');

    let parsedConfig: any = {};
    try { parsedConfig = integration.config ? JSON.parse(integration.config) : {}; } catch { parsedConfig = {}; }

    const testUrl = parsedConfig.testUrl || parsedConfig.url || parsedConfig.webhookUrl;
    const method = String(parsedConfig.method || 'GET').toUpperCase();
    const headers = parsedConfig.headers || {};
    const payload = parsedConfig.testPayload || {};

    const eventId = uuid();
    const start = new Date();

    if (!testUrl) {
      await this.prisma.integration_events.create({
        data: {
          id: eventId,
          integration_id: integration.id,
          event_type: 'test_connection',
          direction: 'outbound',
          payload: JSON.stringify(payload),
          status: 'failed',
          error_message: 'Integration config missing testUrl/url/webhookUrl',
        },
      });

      await this.prisma.integrations.update({
        where: { id: integration.id },
        data: { last_tested_at: start, last_test_status: 'failed' },
      });

      throw new BadRequestException('Integration config missing testUrl/url/webhookUrl');
    }

    try {
      const response = await fetch(testUrl, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: method === 'GET' ? undefined : JSON.stringify(payload),
      });
      const text = await response.text();

      await this.prisma.integration_events.create({
        data: {
          id: eventId,
          integration_id: integration.id,
          event_type: 'test_connection',
          direction: 'outbound',
          payload: JSON.stringify(payload),
          response: text,
          status: response.ok ? 'success' : 'failed',
          http_status: response.status,
          attempt_count: 1,
          error_message: response.ok ? null : text.slice(0, 1000),
        },
      });

      await this.prisma.integrations.update({
        where: { id: integration.id },
        data: { last_tested_at: start, last_test_status: response.ok ? 'success' : 'failed' },
      });

      return {
        ok: response.ok,
        status: response.status,
        integration: name,
        response: text,
      };
    } catch (error: any) {
      await this.prisma.integration_events.create({
        data: {
          id: eventId,
          integration_id: integration.id,
          event_type: 'test_connection',
          direction: 'outbound',
          payload: JSON.stringify(payload),
          status: 'failed',
          attempt_count: 1,
          error_message: error?.message || 'Unknown error',
        },
      });

      await this.prisma.integrations.update({
        where: { id: integration.id },
        data: { last_tested_at: start, last_test_status: 'failed' },
      });

      throw new BadRequestException(error?.message || 'Integration test failed');
    }
  }

  async getSummaryReport() {
    const [
      totalJobs,
      openJobs,
      inProgressJobs,
      completedJobs,
      totalCustomers,
      totalVehicles,
      pendingDeferred,
      totalInspections,
      submittedInspections,
      totalEstimateLines,
      totalNotifications,
      sentNotifications,
    ] = await Promise.all([
      this.prisma.jobs.count(),
      this.prisma.jobs.count({ where: { status: 'booked' } }),
      this.prisma.jobs.count({ where: { status: 'in_progress' } }),
      this.prisma.jobs.count({ where: { status: 'completed' } }),
      this.prisma.customers.count({ where: { is_active: true } }),
      this.prisma.vehicles.count(),
      this.prisma.deferred_work.count({ where: { status: 'pending' } }),
      this.prisma.inspections.count(),
      this.prisma.inspections.count({ where: { status: 'submitted' } }),
      this.prisma.estimate_lines.count(),
      this.prisma.notifications.count(),
      this.prisma.notifications.count({ where: { status: 'sent' } }),
    ]);

    const jobsByStatus = await this.prisma.jobs.groupBy({ by: ['status'], _count: true });

    return {
      totals: {
        jobs: totalJobs,
        customers: totalCustomers,
        vehicles: totalVehicles,
        inspections: totalInspections,
        estimateLines: totalEstimateLines,
        notifications: totalNotifications,
      },
      jobs: {
        open: openJobs,
        in_progress: inProgressJobs,
        completed: completedJobs,
        by_status: jobsByStatus,
      },
      inspections: {
        submitted: submittedInspections,
      },
      deferred: {
        pending: pendingDeferred,
      },
      notifications: {
        sent: sentNotifications,
        queued_or_other: totalNotifications - sentNotifications,
      },
    };
  }

  // ─── Roles ─────────────────────────────────────────────
  async getRoles() {
    return this.prisma.roles.findMany({ orderBy: { name: 'asc' } });
  }

  async createRole(body: { name: string; permissions?: any; description?: string }) {
    if (!body?.name) throw new BadRequestException('name is required');
    return this.prisma.roles.create({
      data: {
        id: uuid(),
        name: body.name,
        permissions: body.permissions ? JSON.stringify(body.permissions) : null,
        description: body.description || null,
      },
    });
  }

  async updateRole(id: string, body: { name?: string; permissions?: any; description?: string }) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.roles.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.permissions !== undefined && { permissions: JSON.stringify(body.permissions) }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    // Check if any users still use this role
    const usersWithRole = await this.prisma.users.count({ where: { role_id: id } });
    if (usersWithRole > 0) throw new BadRequestException(`Cannot delete: ${usersWithRole} user(s) assigned to this role`);
    return this.prisma.roles.delete({ where: { id } });
  }

  // ─── Labour Rates CRUD ──────────────────────────────────
  async updateLabourRate(id: string, body: { name?: string; rate_per_hour?: number; currency?: string; is_active?: boolean }) {
    const rate = await this.prisma.labour_rates.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Labour rate not found');
    return this.prisma.labour_rates.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.rate_per_hour !== undefined && { rate_per_hour: body.rate_per_hour }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
      },
    });
  }

  async deleteLabourRate(id: string) {
    const rate = await this.prisma.labour_rates.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Labour rate not found');
    return this.prisma.labour_rates.delete({ where: { id } });
  }

  // ─── Inspection Templates ──────────────────────────────
  async getTemplates() {
    return this.prisma.inspection_templates.findMany({
      include: {
        inspection_sections: {
          include: { inspection_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.inspection_templates.findUnique({
      where: { id },
      include: {
        inspection_sections: {
          include: { inspection_items: { where: { is_active: true }, orderBy: { sort_order: 'asc' } } },
          orderBy: { sort_order: 'asc' },
        },
      },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async createTemplate(body: any, userId: string) {
    if (!body?.name) throw new BadRequestException('name is required');
    return this.prisma.inspection_templates.create({
      data: {
        id: uuid(),
        name: body.name,
        vehicle_type: body.vehicle_type || null,
        description: body.description || null,
        is_default: body.is_default ?? false,
        is_active: body.is_active ?? true,
        created_by: userId,
      },
    });
  }

  async updateTemplate(id: string, body: any) {
    const template = await this.prisma.inspection_templates.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return this.prisma.inspection_templates.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.vehicle_type !== undefined && { vehicle_type: body.vehicle_type }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.is_default !== undefined && { is_default: body.is_default }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
      },
    });
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.inspection_templates.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    // Soft-delete by setting is_active = false
    return this.prisma.inspection_templates.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
