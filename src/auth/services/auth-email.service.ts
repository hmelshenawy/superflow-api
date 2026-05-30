import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AuthEmailService {
  constructor(
    private notifications: NotificationsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Send a welcome email to a newly signed-up user.
   */
  async sendSignupWelcomeEmail(params: {
    email: string;
    name: string;
    workshopName: string;
    workshopId: string;
    trialEndsAt: Date;
  }) {
    await this.notifications.enqueue({
      channel: 'email',
      recipient: params.email,
      subject: 'Welcome to PrioraFlow',
      workshopId: params.workshopId,
      body: [
        `Hi ${params.name},`,
        '',
        `Your PrioraFlow workspace "${params.workshopName}" is ready.`,
        '',
        'You can now log in and start setting up your workshop team, jobs, customers, and approvals.',
        '',
        `Your 14-day free trial ends on ${params.trialEndsAt.toISOString().slice(0, 10)}.`,
      ].join('\n'),
      provider: 'resend',
    }).catch(() => {});
  }

  /**
   * Send a password reset email to a user.
   * Returns the user's workshop ID (or null) for caller use.
   */
  async sendPasswordResetEmail(params: {
    userId: string;
    email: string;
    name: string | null;
    resetUrl: string;
  }) {
    const userWorkshop = await this.prisma.raw.user_workshop_access.findFirst({
      where: { user_id: params.userId },
      select: { workshop_id: true },
    });
    const fallbackWorkshop = userWorkshop?.workshop_id
      ? null
      : await this.prisma.raw.workshops.findFirst({ where: { is_active: true }, select: { id: true } });

    await this.notifications.enqueue({
      channel: 'email',
      recipient: params.email,
      subject: 'Reset your PrioraFlow password',
      workshopId: userWorkshop?.workshop_id || fallbackWorkshop?.id || null,
      body: [
        `Hi ${params.name || 'there'},`,
        '',
        'We received a request to reset your PrioraFlow password.',
        '',
        `Reset link: ${params.resetUrl}`,
        '',
        'This link expires in 1 hour. If you did not request this, you can ignore this email.',
      ].join('\n'),
      provider: 'resend',
    });

    return { success: true };
  }
}