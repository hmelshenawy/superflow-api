import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { getWorkshopContext } from '@prisma/workshop-context';
import { ClockEventDto, TechnicianProductivityQueryDto } from './dto/technician.dto';
import { technician_clock_event_type } from '@prisma/client';

@Injectable()
export class TechniciansService {
  constructor(private prisma: PrismaService) {}

  // ─── Board View ─────────────────────────────────────────────

  async getBoard(date?: string) {
    const { workshopId } = getWorkshopContext();
    if (!workshopId) throw new BadRequestException('Workshop context required');

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all technicians with workshop access
    const techRoleId = await this.getTechnicianRoleId();
    const technicians = await this.prisma.raw.users.findMany({
      where: {
        is_active: true,
        role_id: techRoleId,
        user_workshop_access: { some: { workshop_id: workshopId } },
      },
      select: {
        id: true,
        name: true,
        avatar_url: true,
        employee_code: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get latest clock event per technician
    const clockEvents = await this.prisma.raw.technician_clock_events.findMany({
      where: { workshop_id: workshopId },
      orderBy: { timestamp: 'desc' },
    });

    const latestClockByTech = new Map<string, { event_type: technician_clock_event_type; timestamp: Date }>();
    for (const ev of clockEvents) {
      if (!latestClockByTech.has(ev.technician_id)) {
        latestClockByTech.set(ev.technician_id, { event_type: ev.event_type, timestamp: ev.timestamp });
      }
    }

    // Get all active (non-archived, non-deleted) jobs for this workshop
    const jobs = await this.prisma.tenant.jobs.findMany({
      where: {
        workshop_id: workshopId,
        is_deleted: false,
        archived_at: null,
        status: { notIn: ['closed', 'no_show'] },
      },
      include: {
        vehicles: { select: { make: true, vehicle_model: true, year: true, plate: true, color: true } },
        job_status_history: {
          where: { changed_at: { gte: startOfDay } },
          orderBy: { changed_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Derive latest stage change time per job.
    // Query the last status history entry per job using Prisma (tenant-scoped).
    const activeJobIds: string[] = jobs.map((j: { id: string }) => j.id);
    const stageChangeMap = new Map<string, Date>();
    if (activeJobIds.length > 0) {
      // Fetch all status history entries for active jobs, then pick the latest per job in JS
      const historyEntries = await this.prisma.tenant.job_status_history.findMany({
        where: {
          job_id: { in: activeJobIds },
        },
        orderBy: { changed_at: 'desc' },
        select: { job_id: true, changed_at: true },
      });
      // Since ordered by changed_at desc, the first entry per job_id is the latest
      for (const entry of historyEntries) {
        if (!stageChangeMap.has(entry.job_id)) {
          stageChangeMap.set(entry.job_id, new Date(entry.changed_at));
        }
      }
    }

    // Build technician data
    const now = new Date();
    const technicianData = technicians.map((tech: { id: string; name: string | null; avatar_url: string | null; employee_code: string | null }) => {
      const techJobs = jobs.filter((j: { technician_id: string | null }) => j.technician_id === tech.id);
      const clockStatus = latestClockByTech.get(tech.id);
      const clockInEvent = clockStatus?.event_type === 'clock_in' || clockStatus?.event_type === 'break_end' ? 'on_shift' : clockStatus?.event_type === 'break_start' ? 'on_break' : clockStatus?.event_type === 'clock_out' ? 'off_shift' : 'unknown';

      const jobsWithTiming = techJobs.map((job: any) => {
        const stageStartedAt = stageChangeMap.get(job.id) || job.created_at;
        const minutesInStage = Math.max(0, Math.round((now.getTime() - new Date(stageStartedAt).getTime()) / 60000));
        const promisedAt: Date | null = job.promised_at;
        const isPromisedAtRisk = promisedAt ? new Date(promisedAt).getTime() - now.getTime() < 3600000 : false;

        return {
          id: job.id as string,
          job_number: job.job_number as string | null,
          vehicle: job.vehicles ? `${job.vehicles.make || ''} ${job.vehicles.vehicle_model || ''} ${job.vehicles.year || ''}`.trim() : 'Unknown',
          vehicle_plate: (job.vehicles?.plate as string) || '',
          vehicle_color: (job.vehicles?.color as string) || '',
          workshop_stage: job.workshop_stage as string | null,
          status: job.status as string,
          parts_status: job.parts_status as string | null,
          customer_concern: job.customer_concern as string | null,
          promised_at: job.promised_at as string | null,
          is_customer_waiting: job.is_customer_waiting as boolean | null,
          stage_started_at: stageStartedAt,
          minutes_in_stage: minutesInStage,
          is_promised_at_risk: isPromisedAtRisk,
          priority_score: (job.priority_score as number) ?? null,
        };
      });

      const inProgress = jobsWithTiming.filter((j: { workshop_stage: string | null }) =>
        ['work_in_progress', 'diagnosis', 'estimate_prep', 'final_test', 'quality_check'].includes(j.workshop_stage || ''),
      );
      const waiting = jobsWithTiming.filter((j: { workshop_stage: string | null }) =>
        ['waiting_technician', 'customer_approval'].includes(j.workshop_stage || ''),
      );
      const waitingParts = jobsWithTiming.filter((j: { parts_status: string | null }) =>
        j.parts_status != null && ['order_parts', 'waiting_warehouse', 'backorder'].includes(j.parts_status),
      );

      return {
        id: tech.id,
        name: tech.name,
        avatar_url: tech.avatar_url,
        employee_code: tech.employee_code,
        clock_status: clockInEvent,
        shift_started_at: clockStatus?.timestamp || null,
        total_jobs: techJobs.length,
        job_counts: {
          in_progress: inProgress.length,
          waiting: waiting.length,
          waiting_parts: waitingParts.length,
          completed_today: 0,
        },
        jobs: jobsWithTiming,
      };
    });

    // Completed today count per technician
    const completedToday = await this.prisma.tenant.jobs.findMany({
      where: {
        workshop_id: workshopId,
        is_deleted: false,
        status: 'closed',
        completed_at: { gte: startOfDay, lte: endOfDay },
      },
      select: { technician_id: true },
    });
    const completedCountByTech = new Map<string, number>();
    for (const j of completedToday) {
      if (j.technician_id) {
        completedCountByTech.set(j.technician_id, (completedCountByTech.get(j.technician_id) || 0) + 1);
      }
    }
    for (const td of technicianData) {
      td.job_counts.completed_today = completedCountByTech.get(td.id) || 0;
    }

    // Unassigned jobs
    const unassignedJobs = jobs
      .filter((j: { technician_id: string | null }) => !j.technician_id)
      .map((job: any) => {
        const stageStartedAt = stageChangeMap.get(job.id as string) || job.created_at;
        const minutesInStage = Math.max(0, Math.round((now.getTime() - new Date(stageStartedAt).getTime()) / 60000));
        return {
          id: job.id as string,
          job_number: job.job_number as string | null,
          vehicle: job.vehicles ? `${job.vehicles.make || ''} ${job.vehicles.vehicle_model || ''} ${job.vehicles.year || ''}`.trim() : 'Unknown',
          vehicle_plate: (job.vehicles?.plate as string) || '',
          vehicle_color: (job.vehicles?.color as string) || '',
          workshop_stage: job.workshop_stage as string | null,
          status: job.status as string,
          parts_status: job.parts_status as string | null,
          customer_concern: job.customer_concern as string | null,
          promised_at: job.promised_at as string | null,
          is_customer_waiting: job.is_customer_waiting as boolean | null,
          minutes_waiting: minutesInStage,
        };
      });

    // Summary stats
    const totalInProgress = technicianData.reduce((sum: number, t: { job_counts: { in_progress: number } }) => sum + t.job_counts.in_progress, 0);
    const totalWaitingTech = unassignedJobs.length + technicianData.reduce((sum: number, t: { job_counts: { waiting: number } }) => sum + t.job_counts.waiting, 0);
    const onShift = technicianData.filter((t: { clock_status: string }) => t.clock_status === 'on_shift' || t.clock_status === 'on_break').length;
    const promisedAtRisk = technicianData.reduce((sum: number, t: { jobs: Array<{ is_promised_at_risk: boolean }> }) => sum + t.jobs.filter((j: { is_promised_at_risk: boolean }) => j.is_promised_at_risk).length, 0);
    const allStageMinutes: number[] = technicianData.flatMap((t: { jobs: Array<{ minutes_in_stage: number }> }) => t.jobs.map((j: { minutes_in_stage: number }) => j.minutes_in_stage));
    const avgStageTime = allStageMinutes.length > 0 ? Math.round(allStageMinutes.reduce((a: number, b: number) => a + b, 0) / allStageMinutes.length) : 0;

    return {
      summary: {
        on_shift: onShift,
        total_technicians: technicians.length,
        jobs_in_progress: totalInProgress,
        jobs_waiting_tech: totalWaitingTech,
        avg_stage_time_minutes: avgStageTime,
        promised_at_risk: promisedAtRisk,
      },
      technicians: technicianData,
      unassigned_jobs: unassignedJobs,
    };
  }

  // ─── Productivity ─────────────────────────────────────────

  async getProductivity(technicianId: string, query: TechnicianProductivityQueryDto) {
    const { workshopId } = getWorkshopContext();
    if (!workshopId) throw new BadRequestException('Workshop context required');

    const tech = await this.prisma.raw.users.findUnique({ where: { id: technicianId } });
    if (!tech || !tech.is_active) throw new NotFoundException('Technician not found');

    const now = new Date();
    let from: Date, to: Date;

    if (query.from && query.to) {
      from = new Date(query.from);
      to = new Date(query.to);
    } else {
      const period = query.period || 'week';
      from = new Date(now);
      switch (period) {
        case 'today':
          from.setHours(0, 0, 0, 0);
          break;
        case 'month':
          from.setDate(from.getDate() - 30);
          break;
        case 'week':
        default:
          from.setDate(from.getDate() - 7);
          break;
      }
      to = now;
    }

    // Jobs completed in period
    const completedJobs = await this.prisma.tenant.jobs.findMany({
      where: {
        workshop_id: workshopId,
        technician_id: technicianId,
        is_deleted: false,
        completed_at: { gte: from, lte: to },
      },
      select: {
        id: true,
        job_number: true,
        created_at: true,
        completed_at: true,
        workshop_stage: true,
        status: true,
      },
    });

    // Jobs started in period
    const startedJobs = await this.prisma.tenant.jobs.findMany({
      where: {
        workshop_id: workshopId,
        technician_id: technicianId,
        is_deleted: false,
        created_at: { gte: from, lte: to },
      },
      select: { id: true },
    });

    // Average completion time
    const completionTimes: number[] = completedJobs
      .filter((j: { created_at: Date; completed_at: Date | null }) => j.created_at && j.completed_at)
      .map((j: { created_at: Date; completed_at: Date }) => (new Date(j.completed_at).getTime() - new Date(j.created_at).getTime()) / 60000);
    const avgCompletionTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length)
      : 0;

    // On-time delivery rate
    const completedWithPromised = await this.prisma.tenant.jobs.findMany({
      where: {
        workshop_id: workshopId,
        technician_id: technicianId,
        is_deleted: false,
        completed_at: { gte: from, lte: to },
        promised_at: { not: null },
      },
      select: { completed_at: true, promised_at: true },
    });
    const onTimeDeliveries = completedWithPromised.filter((j: { completed_at: Date | null; promised_at: Date | null }) =>
      j.completed_at && j.promised_at && new Date(j.completed_at) <= new Date(j.promised_at!),
    ).length;
    const onTimeRate = completedWithPromised.length > 0 ? Math.round((onTimeDeliveries / completedWithPromised.length) * 100) : 0;

    // Clock events for utilization
    const clockEvents = await this.prisma.raw.technician_clock_events.findMany({
      where: {
        technician_id: technicianId,
        workshop_id: workshopId,
        timestamp: { gte: from, lte: to },
      },
      orderBy: { timestamp: 'asc' },
    });

    let totalShiftMinutes = 0;
    let lastClockIn: Date | null = null;
    for (const ev of clockEvents) {
      if (ev.event_type === 'clock_in') {
        lastClockIn = new Date(ev.timestamp);
      } else if (ev.event_type === 'clock_out' && lastClockIn) {
        totalShiftMinutes += (new Date(ev.timestamp).getTime() - lastClockIn.getTime()) / 60000;
        lastClockIn = null;
      }
    }
    if (lastClockIn) {
      totalShiftMinutes += (now.getTime() - lastClockIn.getTime()) / 60000;
    }

    const utilizationPercent = totalShiftMinutes > 0
      ? Math.min(100, Math.round((completionTimes.reduce((a: number, b: number) => a + b, 0) / totalShiftMinutes) * 100))
      : 0;

    // Idle/break time
    let totalBreakMinutes = 0;
    let lastBreakStart: Date | null = null;
    for (const ev of clockEvents) {
      if (ev.event_type === 'break_start') {
        lastBreakStart = new Date(ev.timestamp);
      } else if (ev.event_type === 'break_end' && lastBreakStart) {
        totalBreakMinutes += (new Date(ev.timestamp).getTime() - lastBreakStart.getTime()) / 60000;
        lastBreakStart = null;
      }
    }

    return {
      technician_id: technicianId,
      name: tech.name,
      period: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] },
      today: {
        jobs_started: startedJobs.length,
        jobs_completed: completedJobs.length,
        avg_job_time_minutes: avgCompletionTime,
        utilization_percent: utilizationPercent,
        idle_minutes: Math.round(totalBreakMinutes),
      },
      this_period: {
        jobs_completed: completedJobs.length,
        avg_completion_time_minutes: avgCompletionTime,
        on_time_delivery_percent: onTimeRate,
      },
      shift_summary: {
        total_shift_minutes: Math.round(totalShiftMinutes),
        break_minutes: Math.round(totalBreakMinutes),
        clock_events: clockEvents.length,
      },
    };
  }

  // ─── Clock Events ──────────────────────────────────────────

  async clockEvent(dto: ClockEventDto, changedBy: string) {
    const { workshopId } = getWorkshopContext();
    if (!workshopId) throw new BadRequestException('Workshop context required');

    const tech = await this.prisma.raw.users.findUnique({ where: { id: dto.technician_id } });
    if (!tech || !tech.is_active) throw new NotFoundException('Technician not found');

    const access = await this.prisma.raw.user_workshop_access.findUnique({
      where: { user_id_workshop_id: { user_id: dto.technician_id, workshop_id: workshopId } },
    });
    if (!access) throw new BadRequestException('Technician does not have access to this workshop');

    // Validate clock sequence
    const lastEvent = await this.prisma.raw.technician_clock_events.findFirst({
      where: { technician_id: dto.technician_id, workshop_id: workshopId },
      orderBy: { timestamp: 'desc' },
    });

    if (lastEvent) {
      const validTransitions: Record<string, string[]> = {
        clock_in: ['clock_out'],
        clock_out: ['clock_in'],
        break_start: ['clock_in', 'break_end'],
        break_end: ['break_start'],
      };
      const allowed = validTransitions[dto.event_type] || [];
      if (lastEvent.event_type && !allowed.includes(lastEvent.event_type)) {
        throw new BadRequestException(`Cannot ${dto.event_type} after ${lastEvent.event_type}. Expected one of: ${allowed.join(', ')}`);
      }
    } else if (dto.event_type !== 'clock_in') {
      throw new BadRequestException('First clock event must be clock_in');
    }

    return this.prisma.raw.technician_clock_events.create({
      data: {
        id: crypto.randomUUID(),
        technician_id: dto.technician_id,
        workshop_id: workshopId,
        event_type: dto.event_type,
        note: dto.note,
        changed_by: changedBy,
      },
    });
  }

  async getClockStatus(technicianId: string) {
    const { workshopId } = getWorkshopContext();
    if (!workshopId) throw new BadRequestException('Workshop context required');

    const lastEvent = await this.prisma.raw.technician_clock_events.findFirst({
      where: { technician_id: technicianId, workshop_id: workshopId },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastEvent) {
      return { status: 'never_clocked', since: null, break_minutes: 0 };
    }

    const statusMap: Record<string, string> = {
      clock_in: 'on_shift',
      clock_out: 'off_shift',
      break_start: 'on_break',
      break_end: 'on_shift',
    };

    // Calculate break time for current shift
    const lastClockIn = await this.prisma.raw.technician_clock_events.findFirst({
      where: {
        technician_id: technicianId,
        workshop_id: workshopId,
        event_type: 'clock_in',
        timestamp: { lte: new Date() },
      },
      orderBy: { timestamp: 'desc' },
    });

    let breakMinutes = 0;
    if (lastClockIn) {
      const breakEvents = await this.prisma.raw.technician_clock_events.findMany({
        where: {
          technician_id: technicianId,
          workshop_id: workshopId,
          event_type: { in: ['break_start', 'break_end'] },
          timestamp: { gte: lastClockIn.timestamp },
        },
        orderBy: { timestamp: 'asc' },
      });
      let breakStart: Date | null = null;
      for (const ev of breakEvents) {
        if (ev.event_type === 'break_start') breakStart = new Date(ev.timestamp);
        else if (ev.event_type === 'break_end' && breakStart) {
          breakMinutes += (new Date(ev.timestamp).getTime() - breakStart.getTime()) / 60000;
          breakStart = null;
        }
      }
      if (breakStart) {
        breakMinutes += (new Date().getTime() - breakStart.getTime()) / 60000;
      }
    }

    return {
      status: statusMap[lastEvent.event_type] || 'unknown',
      since: lastEvent.timestamp,
      break_minutes: Math.round(breakMinutes),
    };
  }

  // ─── Helpers ───────────────────────────────────────────────

  private async getTechnicianRoleId(): Promise<string | null> {
    const role = await this.prisma.raw.roles.findFirst({ where: { name: 'technician' } });
    return role?.id ?? null;
  }
}