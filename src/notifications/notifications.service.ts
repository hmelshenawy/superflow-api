import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RendererService } from './templates/renderer.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private renderer: RendererService,
  ) {}

  async sendFromTemplate(templateName: string, recipient: string, variables: Record<string, string>, jobId?: string, customerId?: string) {
    const rendered = await this.renderer.render(templateName, variables);
    if (!rendered) return null;

    return this.prisma.notifications.create({
      data: {
        id: uuid(), template_id: null, channel: rendered.channel as any,
        recipient, subject: rendered.subject, body_rendered: rendered.body,
        status: 'queued', job_id: jobId, customer_id: customerId,
      },
    });
  }

  async findByJob(jobId: string) {
    return this.prisma.notifications.findMany({ where: { job_id: jobId }, orderBy: { queued_at: 'desc' } });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.notifications.findMany({ where: { customer_id: customerId }, orderBy: { queued_at: 'desc' } });
  }
}