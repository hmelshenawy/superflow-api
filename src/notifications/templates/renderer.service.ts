import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RendererService {
  constructor(private prisma: PrismaService) {}

  async render(templateName: string, variables: Record<string, string>) {
    const template = await this.prisma.notification_templates.findUnique({ where: { name: templateName } });
    if (!template) return null;

    let body = template.body || '';
    let subject = template.subject || '';

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      body = body.replace(regex, value);
      subject = subject.replace(regex, value);
    }

    return { subject, body, channel: template.channel, language: template.language };
  }
}