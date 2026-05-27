import { Body, Controller, Get, HttpCode, Logger, Post, Query, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ message?: string; title?: string; code?: number }>;
};

@Controller('whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    if (mode === 'subscribe' && verifyToken && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge || '';
    }

    throw new UnauthorizedException('Invalid WhatsApp webhook verification token');
  }

  @Post('webhook')
  @HttpCode(200)
  receiveWebhook(@Body() payload: any) {
    void this.processStatuses(payload).catch((error) => {
      this.logger.error(`Failed to process WhatsApp webhook: ${error?.message}`);
    });

    return { received: true };
  }

  private extractStatuses(payload: any): WhatsAppStatus[] {
    if (!payload?.entry?.length) return [];

    return payload.entry.flatMap((entry: any) =>
      (entry.changes || []).flatMap((change: any) => change.value?.statuses || []),
    );
  }

  private mapStatus(status?: string) {
    if (status === 'failed') return 'failed';
    if (status === 'delivered' || status === 'read') return 'delivered';
    if (status === 'sent') return 'sent';
    return null;
  }

  private statusDate(status: WhatsAppStatus) {
    const timestamp = Number(status.timestamp);
    return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : new Date();
  }

  private errorMessage(status: WhatsAppStatus) {
    const error = status.errors?.[0];
    if (!error) return null;

    return error.message || error.title || (error.code ? `WhatsApp error ${error.code}` : 'WhatsApp delivery failed');
  }

  private async processStatuses(payload: any) {
    const statuses = this.extractStatuses(payload);

    for (const status of statuses) {
      if (!status.id) continue;

      const mappedStatus = this.mapStatus(status.status);
      if (!mappedStatus) continue;

      const timestamp = this.statusDate(status);
      const data: any = {
        status: mappedStatus,
        error_message: mappedStatus === 'failed' ? this.errorMessage(status) : null,
      };

      if (mappedStatus === 'sent') {
        data.sent_at = timestamp;
      }

      if (mappedStatus === 'delivered') {
        data.delivered_at = timestamp;
      }

      await this.prisma.raw.notifications.updateMany({
        where: {
          provider: 'whatsapp_cloud',
          provider_message_id: status.id,
        },
        data,
      });
    }
  }
}
