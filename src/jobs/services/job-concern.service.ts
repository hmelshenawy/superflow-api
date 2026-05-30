import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JobConcernService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valid status values for job concerns.
   */
  concernStatusOptions() {
    return [
      { value: 'reviewing', label: 'Under inspection' },
      { value: 'finding_ready', label: 'Diagnosis ready' },
      { value: 'priced', label: 'Pending approval' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'qc_complete', label: 'Completed' },
    ];
  }

  /**
   * Validate that a job exists and is not soft-deleted.
   * Uses a lightweight existence check instead of the heavy findOne query.
   */
  private async assertJobExists(jobId: string) {
    const job = await this.prisma.tenant.jobs.findFirst({
      where: { id: jobId, is_deleted: false },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Job not found');
  }

  async createConcern(jobId: string, dto: any) {
    await this.assertJobExists(jobId);
    const count = await this.prisma.tenant.job_concerns.count({ where: { job_id: jobId } }).catch(() => 0);
    return this.prisma.tenant.job_concerns.create({
      data: {
        id: uuid(),
        job_id: jobId,
        code: dto.code || `C${count + 1}`,
        title: dto.title || 'Customer concern',
        description: dto.description || null,
        status: dto.status || 'reviewing',
        technician_finding: dto.technician_finding || null,
        work_note: dto.work_note || null,
        qc_note: dto.qc_note || null,
        sort_order: dto.sort_order ?? count,
        inspection_response_id: dto.inspection_response_id || null,
      },
    });
  }

  async updateConcern(jobId: string, concernId: string, dto: any) {
    await this.assertJobExists(jobId);
    const existing = await this.prisma.tenant.job_concerns.findFirst({ where: { id: concernId, job_id: jobId } });
    if (!existing) throw new NotFoundException('Concern not found');
    const data: any = { ...dto };
    if (data.description === '') data.description = null;
    if (data.technician_finding === '') data.technician_finding = null;
    if (data.work_note === '') data.work_note = null;
    if (data.qc_note === '') data.qc_note = null;
    if (data.inspection_response_id === '') data.inspection_response_id = null;
    // Validate advisor decision: note is mandatory when a non-null decision is set
    if (data.advisor_decision && !data.advisor_decision_note) {
      throw new BadRequestException('Advisor decision note is required when setting an advisor decision');
    }
    if (data.advisor_decision === null || data.advisor_decision === '') {
      data.advisor_decision = null;
      data.advisor_decision_note = null;
    }
    const validDecisions = ['approved', 'declined', 'deferred'];
    if (data.advisor_decision && !validDecisions.includes(data.advisor_decision)) {
      throw new BadRequestException(`Invalid advisor decision. Must be one of: ${validDecisions.join(', ')}`);
    }
    return this.prisma.tenant.job_concerns.update({ where: { id: concernId }, data });
  }

  async removeConcern(jobId: string, concernId: string) {
    await this.assertJobExists(jobId);
    const existing = await this.prisma.tenant.job_concerns.findFirst({ where: { id: concernId, job_id: jobId } });
    if (!existing) throw new NotFoundException('Concern not found');
    await this.prisma.tenant.estimate_lines.updateMany({ where: { concern_id: concernId }, data: { concern_id: null } });
    return this.prisma.tenant.job_concerns.delete({ where: { id: concernId } });
  }
}