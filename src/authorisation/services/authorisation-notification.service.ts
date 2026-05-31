import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AuthorisationNotificationService {
  private readonly logger = new Logger(AuthorisationNotificationService.name);

  constructor(private notificationsService: NotificationsService) {}

  /**
   * Send notification to the customer that their estimate approval is requested.
   * Extracted from AuthorisationService.requestAuthorisation().
   */
  async sendCustomerApprovalNotification(
    job: {
      id: string;
      job_number: string;
      customer_id: string | null;
      customers: { email?: string | null; phone?: string | null; name?: string | null } | null;
      vehicles: { make?: string | null; vehicle_model?: string | null } | null;
    },
    channel: string,
    sentTo: string | undefined,
    portalUrl: string,
  ) {
    const effectiveChannel = channel === 'link' ? 'push' : channel;
    const customerRecipient =
      sentTo || (channel === 'email' ? job.customers?.email : job.customers?.phone) || job.customers?.email || job.customers?.phone || 'customer';
    const customerMessage = [
      `Please review and approve the estimate for job ${job.job_number}.`,
      `${job.vehicles?.make || ''} ${job.vehicles?.vehicle_model || ''}`.trim(),
      '',
      `Approval link: ${portalUrl}`,
      '',
      'This link expires in 7 days.',
    ].filter((line) => line !== undefined).join('\n');

    try {
      await this.notificationsService.enqueue({
        channel: effectiveChannel as 'email' | 'sms' | 'whatsapp' | 'push',
        recipient: customerRecipient,
        subject: `Approval request for ${job.job_number}`,
        body: customerMessage,
        provider: channel === 'email' ? 'resend' : 'internal',
        jobId: job.id,
        ...(job.customer_id ? { customerId: job.customer_id } : {}),
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue customer approval notification for job ${job.job_number}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send notification to the advisor that an estimate has been sent.
   * Extracted from AuthorisationService.requestAuthorisation().
   */
  async sendAdvisorEstimateNotification(
    job: {
      id: string;
      job_number: string;
      customer_id: string | null;
      advisor_id: string | null;
      customers: { name?: string | null } | null;
      vehicles: { make?: string | null; vehicle_model?: string | null } | null;
      users_jobs_advisor_idTousers: { email?: string | null; name?: string | null } | null;
    },
  ) {
    if (!job.advisor_id) return;

    try {
      await this.notificationsService.enqueue({
        channel: 'push',
        recipient: job.users_jobs_advisor_idTousers?.email || job.users_jobs_advisor_idTousers?.name || 'advisor',
        subject: `Estimate sent for ${job.job_number}`,
        body: `Approval link generated for ${job.customers?.name || 'customer'} / ${job.vehicles?.make || ''} ${job.vehicles?.vehicle_model || ''}. Job moved to Estimate Sent.`,
        provider: 'internal',
        jobId: job.id,
        ...(job.customer_id ? { customerId: job.customer_id } : {}),
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue advisor estimate notification for job ${job.job_number}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send notification to the advisor that the customer has submitted their decisions.
   * Extracted from AuthorisationService.decideFromPortal().
   */
  async sendAdvisorDecisionNotification(
    token: any,
    decisions: { decision: string }[],
  ) {
    if (!token.jobs?.advisor_id) return;

    const approvedCount = decisions.filter((item) => item.decision === 'approved').length;
    const declinedCount = decisions.filter((item) => item.decision === 'declined').length;
    const deferredCount = decisions.filter((item) => item.decision === 'deferred').length;

    try {
      await this.notificationsService.enqueue({
        channel: 'push',
        recipient: token.jobs.users_jobs_advisor_idTousers?.email || token.jobs.users_jobs_advisor_idTousers?.name || 'advisor',
        subject: `Customer replied to estimate for ${token.jobs?.job_number}`,
        body: `Customer submitted estimate decisions for ${token.jobs?.customers?.name || 'customer'} / ${token.jobs?.vehicles?.make || ''} ${token.jobs?.vehicles?.vehicle_model || ''}. Approved: ${approvedCount}, Rejected: ${declinedCount}, Deferred: ${deferredCount}. Job moved to Approved.`,
        provider: 'internal',
        jobId: token.job_id,
        ...(token.jobs?.customer_id ? { customerId: token.jobs.customer_id } : {}),
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue advisor decision notification for job ${token.jobs?.job_number}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}