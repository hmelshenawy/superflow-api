import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SettingsService {
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
    const rows = await this.prisma.tenant.settings.findMany({
      include: { users: { select: { id: true, name: true, email: true } } },
      orderBy: { key: 'asc' },
    });

    return rows.map((row: (typeof rows)[number]) => ({
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

      const existing = await this.prisma.tenant.settings.findFirst({ where: { key } });
      if (existing) {
        result.push(await this.prisma.tenant.settings.update({
          where: { id: existing.id },
          data: { value, value_type: valueType as any, description: item.description, updated_by: userId },
        }));
      } else {
        result.push(await this.prisma.tenant.settings.create({
          data: { id: uuid(), key, value, value_type: valueType as any, description: item.description, updated_by: userId },
        }));
      }
    }

    return result;
  }

  // Sensitive keys that must never be exposed via the API.
  private static readonly SENSITIVE_KEYS = new Set([
    'password', 'secret', 'token', 'apikey', 'api_key', 'apiSecret',
    'api_secret', 'auth', 'authorization', 'credentials', 'private_key',
    'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  ]);

  private maskConfig(config: any): any {
    if (!config || typeof config !== 'object') return config;
    const masked = { ...config };
    for (const key of Object.keys(masked)) {
      const lower = key.toLowerCase();
      if (SettingsService.SENSITIVE_KEYS.has(lower) || SettingsService.SENSITIVE_KEYS.has(lower.replace(/[_-]/g, ''))) {
        masked[key] = '********';
      } else if (typeof masked[key] === 'object' && masked[key] !== null && !Array.isArray(masked[key])) {
        masked[key] = this.maskConfig(masked[key]);
      }
    }
    return masked;
  }

  async listIntegrations() {
    const rows = await this.prisma.tenant.integrations.findMany({
      include: {
        integration_events: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((row: (typeof rows)[number]) => {
      const parsedConfig = row.config ? (() => { try { return JSON.parse(row.config); } catch { return row.config; } })() : null;
      return {
        ...row,
        config: '********',
        parsed_config: parsedConfig ? this.maskConfig(parsedConfig) : null,
      };
    });
  }

  async testIntegration(name: string) {
    const integration = await this.prisma.tenant.integrations.findFirst({ where: { name } });
    if (!integration) throw new NotFoundException('Integration not found');

    let parsedConfig: any = {};
    try { parsedConfig = integration.config ? JSON.parse(integration.config) : {}; } catch { parsedConfig = {}; }

    const testUrl = parsedConfig.testUrl || parsedConfig.url || parsedConfig.webhookUrl;
    const method = String(parsedConfig.method || 'GET').toUpperCase();
    const headers = parsedConfig.headers || {};
    const payload = parsedConfig.testPayload || {};

    const eventId = uuid();
    const start = new Date();

    // SSRF protection: block internal/private network URLs
    if (testUrl) {
      try {
        const parsed = new URL(testUrl);
        const blockedProtocols = ['file:', 'ftp:', 'data:'];
        if (blockedProtocols.includes(parsed.protocol)) {
          throw new BadRequestException(`Protocol ${parsed.protocol} is not allowed`);
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new BadRequestException(`Protocol ${parsed.protocol} is not allowed. Only http: and https: are supported.`);
        }
        const hostname = parsed.hostname.toLowerCase();
        const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
        if (blockedHosts.includes(hostname)) {
          throw new BadRequestException('Requests to localhost are not allowed');
        }
        if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
          throw new BadRequestException('Requests to internal domains are not allowed');
        }
        const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
        if (ipMatch) {
          const [, a, b] = ipMatch.map(Number);
          if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127 || a === 0) {
            throw new BadRequestException('Requests to private network addresses are not allowed');
          }
        }
      } catch (e) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('Invalid URL provided for integration test');
      }
    }

    if (!testUrl) {
      await this.prisma.tenant.integration_events.create({
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

      await this.prisma.tenant.integrations.update({
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

      await this.prisma.tenant.integration_events.create({
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

      await this.prisma.tenant.integrations.update({
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
      await this.prisma.tenant.integration_events.create({
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

      await this.prisma.tenant.integrations.update({
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
      this.prisma.tenant.jobs.count(),
      this.prisma.tenant.jobs.count({ where: { status: 'booked' } }),
      this.prisma.tenant.jobs.count({ where: { status: 'in_progress' } }),
      this.prisma.tenant.jobs.count({ where: { status: 'ready' } }),
      this.prisma.tenant.customers.count({ where: { is_active: true } }),
      this.prisma.tenant.vehicles.count(),
      this.prisma.tenant.deferred_work.count({ where: { status: 'pending' } }),
      this.prisma.tenant.inspections.count(),
      this.prisma.tenant.inspections.count({ where: { status: 'submitted' } }),
      this.prisma.tenant.estimate_lines.count(),
      this.prisma.tenant.notifications.count(),
      this.prisma.tenant.notifications.count({ where: { status: 'sent' } }),
    ]);

    const jobsByStatus = await this.prisma.tenant.jobs.groupBy({ by: ['status'], _count: true });

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
}