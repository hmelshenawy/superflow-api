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

      await this.prisma.notifications.update({
        where: { id: notificationId },
        data: {
          status: terminal ? 'failed' : 'queued',
          error_message: error?.message || 'Unknown notification failure',
        },
      }).catch(() => {});

      this.logger.warn(`Notification ${notificationId} failed (${attemptsMade}/${maxAttempts}): ${error?.message}`);
    });

    await this.notificationsService.requeuePendingDbNotifications();
    this.pollTimer = setInterval(() => {
      this.notificationsService.requeuePendingDbNotifications().catch(() => {});
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

  private async process(job: Job<{ notificationId: string }>) {
    const notification = await this.prisma.notifications.findUnique({ where: { id: job.data.notificationId } });
    if (!notification) throw new Error('Notification not found');

    const webhook = this.getWebhook(notification.channel);

    if (!webhook) {
      await this.prisma.notifications.update({
        where: { id: notification.id },
        data: {
          status: 'sent',
          sent_at: new Date(),
          delivered_at: new Date(),
          provider: notification.provider || 'noop',
          error_message: null,
        },
      });
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
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Webhook ${response.status}: ${text}`);
    }

    let providerMessageId: string | null = null;
    try {
      const json = JSON.parse(text || '{}');
      providerMessageId = json.messageId || json.id || notification.provider_message_id || null;
    } catch {
      providerMessageId = notification.provider_message_id || null;
    }

    await this.prisma.notifications.update({
      where: { id: notification.id },
      data: {
        status: 'sent',
        sent_at: new Date(),
        delivered_at: new Date(),
        provider_message_id: providerMessageId,
        error_message: null,
      },
    });

    return { delivered: true, providerMessageId };
  }
}
