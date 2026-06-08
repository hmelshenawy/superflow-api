import { BadRequestException } from '@nestjs/common';
import { JobMetaService } from './job-meta.service';
import { JobsService } from './jobs.service';

describe('JobMetaService parts status editability', () => {
  const priorityService = {
    computeForJob: jest.fn().mockReturnValue({
      score: 10,
      level: 'low',
      factors: [],
      idleHours: 0,
      hoursToPromise: null,
      isOverdue: false,
      nextAction: null,
    }),
  };

  const workflowService = {
    resolveStageKeyForStatus: jest.fn(async (status: string) => status),
  };

  const service = new JobMetaService(priorityService as any, workflowService as any);

  const job = (status: string, partsStatus = 'backorder') => ({
    id: 'job-1',
    job_number: 'SF-1',
    status,
    parts_status: partsStatus,
    updated_at: new Date(),
    estimate_lines: [],
    job_concerns: [],
    job_parts: [],
  });

  it('includes parts_status in editableFields for waiting_parts jobs', async () => {
    const meta = await service.computeJobMeta(job('waiting_parts'));

    expect(meta.editableFields).toContain('parts_status');
  });

  it.each(['closed', 'no_show'])('does not include parts_status for %s jobs', async (status) => {
    const meta = await service.computeJobMeta(job(status));

    expect(meta.editableFields).not.toContain('parts_status');
  });
});

describe('JobsService parts status update guard', () => {
  function makeService() {
    const prisma = {
      tenant: {
        jobs: {
          update: jest.fn(async ({ data }) => data),
        },
      },
    };
    const service = new JobsService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { prisma, service };
  }

  it('allows parts_status updates while waiting_parts', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'job-1',
      status: 'waiting_parts',
      parts_status: 'backorder',
    } as any);

    await service.update('job-1', { parts_status: 'parts_ready' } as any, 'user-1');

    expect(prisma.tenant.jobs.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { parts_status: 'parts_ready', promised_at: undefined, workshop_stage: 'waiting_technician', workflow_stage_key: 'in_progress' },
    });
  });

  it.each(['closed', 'no_show'])('blocks parts_status updates while %s', async (status) => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'job-1',
      status,
      parts_status: 'backorder',
    } as any);

    await expect(service.update('job-1', { parts_status: 'parts_ready' } as any, 'user-1'))
      .rejects
      .toBeInstanceOf(BadRequestException);
    expect(prisma.tenant.jobs.update).not.toHaveBeenCalled();
  });
});
