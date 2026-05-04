import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Core counts ───────────────────────────────────────
    const [
      totalJobs,
      totalCustomers,
      totalVehicles,
      totalInspections,
      totalEstimateLines,
      totalNotifications,
      sentNotifications,
      pendingDeferred,
    ] = await Promise.all([
      this.prisma.jobs.count({ where: { archived_at: null } }),
      this.prisma.customers.count({ where: { is_active: true } }),
      this.prisma.vehicles.count(),
      this.prisma.inspections.count(),
      this.prisma.estimate_lines.count({ where: { job_id: { not: null } } }),
      this.prisma.notifications.count(),
      this.prisma.notifications.count({ where: { status: 'sent' } }),
      this.prisma.deferred_work.count({ where: { status: 'pending' } }),
    ]);

    // ── Jobs by status ─────────────────────────────────────
    const jobsByStatus = await this.prisma.jobs.groupBy({
      by: ['status'],
      _count: true,
      where: { archived_at: null },
    });

    // ── Jobs created per day (last 30 days) ────────────────
    const jobsPerDay = await this.prisma.jobs.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      select: { created_at: true, status: true },
    });

    const dailyMap = new Map<string, { created: number; closed: number }>();
    for (const j of jobsPerDay) {
      const day = (j.created_at ?? new Date()).toISOString().slice(0, 10);
      const entry = dailyMap.get(day) || { created: 0, closed: 0 };
      entry.created += 1;
      if (j.status === 'closed') entry.closed += 1;
      dailyMap.set(day, entry);
    }

    // Fill in missing days
    const jobsOverTime: { date: string; created: number; closed: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const entry = dailyMap.get(key) || { created: 0, closed: 0 };
      jobsOverTime.push({ date: key, ...entry });
    }

    // ── Estimate revenue by status ─────────────────────────
    const estimateLines = await this.prisma.estimate_lines.findMany({
      where: { job_id: { not: null } },
      select: {
        line_total: true,
        tax_amount: true,
        jobs: { select: { status: true } },
        authorisation_decisions: { select: { decision: true } },
      },
    });

    const revenueByStatus: Record<string, { lines: number; total: number; tax: number }> = {};
    let totalRevenue = 0;
    let approvedRevenue = 0;
    let pendingRevenue = 0;

    for (const line of estimateLines) {
      const status = line.jobs?.status || 'unknown';
      const lt = Number(line.line_total ?? 0);
      const tx = Number(line.tax_amount ?? 0);
      if (!revenueByStatus[status]) revenueByStatus[status] = { lines: 0, total: 0, tax: 0 };
      revenueByStatus[status].lines += 1;
      revenueByStatus[status].total += lt;
      revenueByStatus[status].tax += tx;
      totalRevenue += lt;
      if (status === 'closed' || status === 'ready') {
        approvedRevenue += lt;
      }
      if (status === 'estimate_sent') {
        const hasApproval = line.authorisation_decisions.some((d: any) => d.decision === 'approved');
        if (!hasApproval) pendingRevenue += lt;
      }
    }

    // ── Inspection completion rate ─────────────────────────
    const [submittedInspections, totalInspectionsAll] = await Promise.all([
      this.prisma.inspections.count({ where: { status: { in: ['submitted', 'reviewed', 'approved'] } } }),
      this.prisma.inspections.count(),
    ]);
    const inspectionCompletionRate = totalInspectionsAll > 0 ? Math.round((submittedInspections / totalInspectionsAll) * 100) : 0;

    // ── Portal approval rate ────────────────────────────────
    const [approvedDecisions, declinedDecisions, totalDecisions] = await Promise.all([
      this.prisma.authorisation_decisions.count({ where: { decision: 'approved' } }),
      this.prisma.authorisation_decisions.count({ where: { decision: 'declined' } }),
      this.prisma.authorisation_decisions.count(),
    ]);
    const approvalRate = totalDecisions > 0 ? Math.round((approvedDecisions / totalDecisions) * 100) : 0;

    // ── Deferred work aging ────────────────────────────────
    const deferredByStatus = await this.prisma.deferred_work.groupBy({
      by: ['status'],
      _count: true,
    });

    const overdueReminders = await this.prisma.deferred_work.count({
      where: { status: 'pending', remind_after: { lt: now } },
    });

    // ── Average job turnaround (closed jobs last 30 days) ──
    const closedJobsLast30 = await this.prisma.jobs.findMany({
      where: {
        status: 'closed',
        completed_at: { not: null },
        created_at: { gte: thirtyDaysAgo },
      },
      select: { created_at: true, completed_at: true },
    });

    let avgTurnaroundHours: number | null = null;
    if (closedJobsLast30.length > 0) {
      const totalHours = closedJobsLast30.reduce((sum: number, j: any) => {
        const created = (j.created_at ?? new Date()).getTime();
        const completed = j.completed_at!.getTime();
        return sum + (completed - created) / (1000 * 60 * 60);
      }, 0);
      avgTurnaroundHours = Math.round((totalHours / closedJobsLast30.length) * 10) / 10;
    }

    // ── Overdue jobs (promised date passed, not closed/ready) ──
    const overdueJobs = await this.prisma.jobs.count({
      where: {
        promised_at: { lt: now },
        status: { notIn: ['ready', 'closed'] },
        archived_at: null,
      },
    });


    // ── Arrival / No-show operational metrics ──────────────
    const dubaiOffsetMs = 4 * 60 * 60 * 1000;
    const dubaiNow = new Date(now.getTime() + dubaiOffsetMs);
    const todayDubaiStart = new Date(Date.UTC(dubaiNow.getUTCFullYear(), dubaiNow.getUTCMonth(), dubaiNow.getUTCDate()) - dubaiOffsetMs);
    const tomorrowDubaiStart = new Date(todayDubaiStart.getTime() + 24 * 60 * 60 * 1000);

    const [todayBooked, todayArrived, todayNoShow, noShow30d, arrived30d, booked30d, dueToday] = await Promise.all([
      this.prisma.jobs.count({ where: { created_at: { gte: todayDubaiStart, lt: tomorrowDubaiStart } } }),
      this.prisma.jobs.count({ where: { arrived_at: { gte: todayDubaiStart, lt: tomorrowDubaiStart } } }),
      this.prisma.jobs.count({ where: { status: 'no_show', updated_at: { gte: todayDubaiStart, lt: tomorrowDubaiStart } } }),
      this.prisma.jobs.count({ where: { status: 'no_show', updated_at: { gte: thirtyDaysAgo } } }),
      this.prisma.jobs.count({ where: { arrived_at: { gte: thirtyDaysAgo } } }),
      this.prisma.jobs.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
      this.prisma.jobs.count({ where: { promised_at: { gte: todayDubaiStart, lt: tomorrowDubaiStart }, status: { notIn: ['closed', 'no_show'] }, archived_at: null } }),
    ]);

    const todayPendingArrival = await this.prisma.jobs.count({
      where: { status: 'booked', arrived_at: null, archived_at: null },
    });

    const showRate30d = booked30d > 0 ? Math.round((arrived30d / booked30d) * 100) : 0;

    const attendanceTrend: { date: string; booked: number; arrived: number; noShow: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const start = new Date(todayDubaiStart.getTime() - i * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const date = new Date(start.getTime() + dubaiOffsetMs).toISOString().slice(0, 10);
      const [booked, arrived, noShow] = await Promise.all([
        this.prisma.jobs.count({ where: { created_at: { gte: start, lt: end } } }),
        this.prisma.jobs.count({ where: { arrived_at: { gte: start, lt: end } } }),
        this.prisma.jobs.count({ where: { status: 'no_show', updated_at: { gte: start, lt: end } } }),
      ]);
      attendanceTrend.push({ date, booked, arrived, noShow });
    }

    const advisorJobs = await this.prisma.jobs.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      select: {
        status: true,
        arrived_at: true,
        users_jobs_advisor_idTousers: { select: { name: true, email: true } },
      },
    });
    const advisorMap = new Map<string, { advisor: string; booked: number; arrived: number; noShow: number; closed: number }>();
    for (const job of advisorJobs) {
      const advisor = job.users_jobs_advisor_idTousers?.name || job.users_jobs_advisor_idTousers?.email || 'Unassigned';
      const row = advisorMap.get(advisor) || { advisor, booked: 0, arrived: 0, noShow: 0, closed: 0 };
      row.booked += 1;
      if (job.arrived_at) row.arrived += 1;
      if (job.status === 'no_show') row.noShow += 1;
      if (job.status === 'closed') row.closed += 1;
      advisorMap.set(advisor, row);
    }
    const advisorPerformance = Array.from(advisorMap.values()).map((row) => ({
      ...row,
      showRate: row.booked > 0 ? Math.round((row.arrived / row.booked) * 100) : 0,
    })).sort((a, b) => b.booked - a.booked);

    // ── Recent activity (last 7 days) ─────────────────────
    const [recentJobsCreated, recentJobsClosed, recentInspectionsSubmitted, recentApprovalsSent] = await Promise.all([
      this.prisma.jobs.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      this.prisma.jobs.count({ where: { status: 'closed', updated_at: { gte: sevenDaysAgo } } }),
      this.prisma.inspections.count({ where: { submitted_at: { gte: sevenDaysAgo } } }),
      this.prisma.approval_tokens.count({ where: { issued_at: { gte: sevenDaysAgo } } }),
    ]);

    return {
      counts: {
        jobs: totalJobs,
        customers: totalCustomers,
        vehicles: totalVehicles,
        inspections: totalInspections,
        estimateLines: totalEstimateLines,
        notifications: totalNotifications,
        sentNotifications,
        pendingDeferred,
      },
      jobsByStatus: jobsByStatus.map((row: any) => ({
        status: row.status,
        count: row._count,
      })),
      jobsOverTime,
      attendance: {
        todayBooked,
        todayArrived,
        todayNoShow,
        todayPendingArrival,
        showRate30d,
        noShow30d,
        arrived30d,
        booked30d,
        dueToday,
      },
      attendanceTrend,
      advisorPerformance,
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        approved: Math.round(approvedRevenue * 100) / 100,
        pending: Math.round(pendingRevenue * 100) / 100,
        byStatus: Object.entries(revenueByStatus).map(([status, data]) => ({
          status,
          lines: data.lines,
          total: Math.round(data.total * 100) / 100,
          tax: Math.round(data.tax * 100) / 100,
        })),
      },
      inspectionCompletionRate,
      approvalRate,
      approvalCounts: {
        approved: approvedDecisions,
        declined: declinedDecisions,
        total: totalDecisions,
      },
      deferredByStatus: deferredByStatus.map((row: any) => ({
        status: row.status,
        count: row._count,
      })),
      overdueReminders,
      avgTurnaroundHours,
      overdueJobs,
      recentActivity: {
        last7Days: {
          jobsCreated: recentJobsCreated,
          jobsClosed: recentJobsClosed,
          inspectionsSubmitted: recentInspectionsSubmitted,
          approvalsSent: recentApprovalsSent,
        },
      },
    };
  }
}