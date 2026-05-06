import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RendererService {
  constructor(private prisma: PrismaService) {}

  private applyVariables(input: string, variables: Record<string, any>) {
    let output = input || '';
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      output = output.replace(regex, String(value ?? ''));
    }
    return output;
  }

  async render(templateName: string, variables: Record<string, any>) {
    const template = await this.prisma.tenant.notification_templates.findFirst({ where: { name: templateName } });
    if (!template) return null;

    const subject = this.applyVariables(template.subject || '', variables);
    const body = this.applyVariables(template.body || '', variables);

    return {
      templateId: template.id,
      subject,
      body,
      channel: template.channel,
      language: template.language,
    };
  }
}
