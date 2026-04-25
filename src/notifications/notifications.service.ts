import { Injectable, Inject, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { RendererService } from './templates/renderer.service';
import { REDIS_CONNECTION } from './redis.constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly queueName = 'notifications';
  private queue?: Queue;

  constructor(
    private prisma: PrismaService,
    private renderer: RendererService,
    @Inject(REDIS_CONNECTION) private connection: IORedis,
  ) {
    try {
      this.queue = new Queue(this.queueName, { connection: this.connection });
    } catch (error) {
      this.logger.warn('BullMQ queue not initialized, notifications will remain queued in DB');
    }
  }

  async enqueue(params: {
    channel: 'email' | 'sms' | 'whatsapp' | 'push';
    recipient: string;
    subject?: string;
    body: string;
    provider?: string;
    templateId?: string | null;
    jobId?: string;
    customerId?: string;
  }) {
    const notification = await this.prisma.notifications.create({
      data: {
        id: uuid(),
        template_id: params.templateId || null,
        job_id: params.jobId,
        customer_id: params.customerId,
        channel: params.channel,
        recipient: params.recipient,
        subject: params.subject,
        body_rendered: params.body,
        status: 'queued',
        provider: params.provider || 'bullmq',
      },
    });

    await this.enqueueExisting(notification.id);
    return notification;
  }

  async enqueueExisting(notificationId: string) {
    if (!this.queue) return null;

    const notification = await this.prisma.notifications.findUnique({ where: { id: notificationId } });
    if (!notification) return null;
    if (notification.status !== 'queued') return notification;

    const job = await this.queue.add(
      'send',
      { notificationId },
      {
        jobId: notificationId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    await this.prisma.notifications.update({
      where: { id: notificationId },
      data: { provider_message_id: job.id || notificationId },
    });

    return job;
  }

  async requeuePendingDbNotifications() {
    const pending = await this.prisma.notifications.findMany({
      where: { status: 'queued' },
      orderBy: { queued_at: 'asc' },
      take: 100,
    });

    for (const row of pending) {
      await this.enqueueExisting(row.id).catch((error) => {
        this.logger.warn(`Failed to enqueue notification ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
      });
    }

    return pending.length;
  }

  async sendFromTemplate(templateName: string, recipient: string, variables: Record<string, any>, jobId?: string, customerId?: string) {
    const rendered = await this.renderer.render(templateName, variables);
    if (!rendered) return null;

    return this.enqueue({
      channel: rendered.channel as any,
      recipient,
      subject: rendered.subject,
      body: rendered.body,
      templateId: rendered.templateId,
      jobId,
      customerId,
    });
  }

  async findByJob(jobId: string) {
    return this.prisma.notifications.findMany({ where: { job_id: jobId }, orderBy: { queued_at: 'desc' } });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.notifications.findMany({ where: { customer_id: customerId }, orderBy: { queued_at: 'desc' } });
  }
}
