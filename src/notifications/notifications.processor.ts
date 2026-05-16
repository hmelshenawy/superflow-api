import { Injectable, Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { REDIS_CONNECTION } from './redis.constants';

@Injectable()
export class NotificationsProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsProcessor.name);
  private readonly queueName = 'notifications';
  private worker?: Worker;
  private pollTimer?: NodeJS.Timeout;
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @Inject(REDIS_CONNECTION) private connection: IORedis,
  ) {}

  async onModuleInit() {
    // DB rows are the durable source of truth; BullMQ is the delivery engine.
    // On startup we recreate the worker and then requeue anything still marked queued.
    this.worker = new Worker(
      this.queueName,
      async (job: Job) => this.process(job),
      { connection: this.connection, concurrency: 5 },
    );

    this.worker.on('completed', async (job) => {
      this.logger.log(`Notification job ${job.id} completed`);
    });

    this.worker.on('failed', async (job, error) => {
      const notificationId = String(job?.data?.notificationId || job?.id || '');
      if (!notificationId) return;

      const attemptsMade = job?.attemptsMade || 0;
      const maxAttempts = job?.opts?.attempts || 1;
      const terminal = attemptsMade >= maxAttempts;

      // Non-terminal failures are moved back to queued so the DB state matches
      // the retry lifecycle instead of pretending the notification is permanently dead.
      await this.prisma.raw.notifications.update({
        where: { id: notificationId },
        data: {
          status: terminal ? 'failed' : 'queued',
          error_message: error?.message || 'Unknown notification failure',
        },
      }).catch((e) => this.logger.error(`Failed to update notification ${notificationId} status: ${e?.message}`));

      this.logger.warn(`Notification ${notificationId} failed (${attemptsMade}/${maxAttempts}): ${error?.message}`);
    });

    await this.notificationsService.requeuePendingDbNotifications();
    // Poll-based requeue is a safety net for cases where the worker or queue was
    // unavailable earlier but the DB still contains queued notifications.
    this.pollTimer = setInterval(() => {
      this.notificationsService.requeuePendingDbNotifications().catch((e) => this.logger.warn(`Requeue poll failed: ${e?.message}`));
    }, 5000);
  }

  async onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    await this.worker?.close().catch(() => {});
  }

  private getWebhook(channel?: string | null) {
    if (channel === 'email') return process.env.NOTIFICATIONS_EMAIL_WEBHOOK;
    if (channel === 'sms') return process.env.NOTIFICATIONS_SMS_WEBHOOK;
    if (channel === 'whatsapp') return process.env.NOTIFICATIONS_WHATSAPP_WEBHOOK;
    if (channel === 'push') return process.env.NOTIFICATIONS_PUSH_WEBHOOK;
    return undefined;
  }

  private htmlEscape(value?: string | null) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private async sendEmailWithResend(notification: any) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !from) return null;
    if (!notification.recipient) throw new Error('Email notification is missing recipient');

    const body = notification.body_rendered || '';
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">${this.htmlEscape(body).replace(/\n/g, '<br>')}</div>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [notification.recipient],
        subject: notification.subject || 'PrioraFlow notification',
        text: body,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`Resend ${response.status}: ${text}`);

    try {
      const json = JSON.parse(text || '{}');
      return json.id || null;
    } catch {
      return null;
    }
  }

  private normalizeWhatsAppRecipient(recipient?: string | null) {
    const normalized = String(recipient || '')
      .trim()
      .replace(/^00/, '')
      .replace(/\D/g, '');

    if (!normalized) throw new Error('WhatsApp notification is missing recipient');

    return normalized;
  }

  private async sendWhatsAppWithMeta(notification: any) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const version = process.env.WHATSAPP_API_VERSION || 'v25.0';
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

    if (!phoneNumberId || !accessToken) return null;

    const recipient = this.normalizeWhatsAppRecipient(notification.recipient);
    const body = String(notification.body_rendered || notification.subject || 'PrioraFlow notification');
    const apiVersion = version.startsWith('v') ? version : `v${version}`;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Try template message first (required for numbers outside the 24-hour window),
    // then fall back to text message if no template is configured.
    const attempts: { type: string; payload: any }[] = [];

    if (templateName) {
      // Use the body text as a single parameter in the template.
      // The template must have exactly one body variable: {{1}}
      attempts.push({
        type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: body.slice(0, 3000) }],
              },
            ],
          },
        },
      });
    }

    // Free-form text only works within the 24-hour customer service window
    attempts.push({
      type: 'text',
      payload: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body: body.slice(0, 4096) },
      },
    });

    let lastError: string | null = null;
    for (const attempt of attempts) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attempt.payload),
        signal: AbortSignal.timeout(10_000),
      });

      const text = await response.text();
      if (response.ok) {
        try {
          const json = JSON.parse(text || '{}');
          this.logger.log(`WhatsApp ${attempt.type} message sent to ${recipient}`);
          return json.messages?.[0]?.id || null;
        } catch {
          return null;
        }
      }

      lastError = `WhatsApp Cloud API ${attempt.type} ${response.status}: ${text}`;
      this.logger.warn(lastError);

      // If template fails, continue to text attempt. If text fails, throw.
      if (attempt.type === 'template') continue;
    }

    throw new Error(lastError || 'WhatsApp delivery failed');
  }

  private async markSent(notification: any, provider: string, providerMessageId: string | null) {
    await this.prisma.raw.notifications.update({
      where: { id: notification.id },
      data: {
        status: 'sent',
        sent_at: new Date(),
        delivered_at: new Date(),
        provider,
        provider_message_id: providerMessageId || notification.provider_message_id || null,
        error_message: null,
      },
    });
  }

  private async process(job: Job<{ notificationId: string }>) {
    const notification = await this.prisma.raw.notifications.findUnique({ where: { id: job.data.notificationId } });
    if (!notification) throw new Error('Notification not found');

    if (notification.channel === 'email') {
      const resendMessageId = await this.sendEmailWithResend(notification);
      if (resendMessageId !== null) {
        await this.markSent(notification, 'resend', resendMessageId);
        return { delivered: true, provider: 'resend', providerMessageId: resendMessageId };
      }
    }

    if (notification.channel === 'whatsapp') {
      const metaMessageId = await this.sendWhatsAppWithMeta(notification);
      if (metaMessageId !== null) {
        await this.markSent(notification, 'whatsapp_cloud', metaMessageId);
        return { delivered: true, provider: 'whatsapp_cloud', providerMessageId: metaMessageId };
      }
    }

    const webhook = this.getWebhook(notification.channel);

    if (!webhook) {
      // No provider configured is treated as an intentional no-op environment,
      // not an operational failure. The row is marked sent via provider `noop`.
      await this.markSent(notification, notification.provider || 'noop', notification.provider_message_id || null);
      return { delivered: false, provider: 'noop' };
    }

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        body: notification.body_rendered,
        jobId: notification.job_id,
        customerId: notification.customer_id,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Webhook ${response.status}: ${text}`);
    }

    let providerMessageId: string | null = null;
    // Providers return different response shapes, so we accept either `messageId`
    // or `id` and fall back to the existing DB value when parsing is impossible.
    try {
      const json = JSON.parse(text || '{}');
      providerMessageId = json.messageId || json.id || notification.provider_message_id || null;
    } catch {
      providerMessageId = notification.provider_message_id || null;
    }

    await this.markSent(notification, notification.provider || 'webhook', providerMessageId);

    return { delivered: true, provider: notification.provider || 'webhook', providerMessageId };
  }
}
