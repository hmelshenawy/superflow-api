import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Batch 1: Independent counts + groupBys (parallel) ────
    const [
      totalJobs,
      totalCustomers,
      totalVehicles,
      totalInspections,
      totalEstimateLines,
      totalNotifications,
      sentNotifications,
      pendingDeferred,
      jobsByStatus,
      submittedInspections,
      approvedDecisions,
      declinedDecisions,
      totalDecisions,
      deferredByStatus,
      overdueReminders,
      overdueJobs,
      recentJobsCreated,
      recentJobsClosed,
      recentInspectionsSubmitted,
      recentApprovalsSent,
    ] = await Promise.all([
      this.prisma.tenant.jobs.count({ where: { archived_at: null } }),
      this.prisma.tenant.customers.count({ where: { is_active: true } }),
      this.prisma.tenant.vehicles.count(),
      this.prisma.tenant.inspections.count(),
      this.prisma.tenant.estimate_lines.count({ where: { job_id: { not: null } } }),
      this.prisma.tenant.notifications.count(),
      this.prisma.tenant.notifications.count({ where: { status: 'sent' } }),
      this.prisma.tenant.deferred_work.count({ where: { status: 'pending' } }),
      this.prisma.tenant.jobs.groupBy({ by: ['status'], _count: true, where: { archived_at: null } }),
      this.prisma.tenant.inspections.count({ where: { status: { in: ['submitted', 'reviewed', 'approved'] } } }),
      this.prisma.tenant.authorisation_decisions.count({ where: { decision: 'approved' } }),
      this.prisma.tenant.authorisation_decisions.count({ where: { decision: 'declined' } }),
      this.prisma.tenant.authorisation_decisions.count(),
      this.prisma.tenant.deferred_work.groupBy({ by: ['status'], _count: true }),
      this.prisma.tenant.deferred_work.count({ where: { status: 'pending', remind_after: { lt: now } } }),
      this.prisma.tenant.jobs.count({ where: { promised_at: { lt: now }, status: { notIn: ['ready', 'closed'] }, archived_at: null } }),
      this.prisma.tenant.jobs.count({ where: { created_at: { gte: sevenDaysAgo } } }),
      this.prisma.tenant.jobs.count({ where: { status: 'closed', updated_at: { gte: sevenDaysAgo } } }),
      this.prisma.tenant.inspections.count({ where: { submitted_at: { gte: sevenDaysAgo } } }),
      this.prisma.tenant.approval_tokens.count({ where: { issued_at: { gte: sevenDaysAgo } } }),
    ]);

    const inspectionCompletionRate = totalInspections > 0 ? Math.round((submittedInspections / totalInspections) * 100) : 0;
    const approvalRate = totalDecisions > 0 ? Math.round((approvedDecisions / totalDecisions) * 100) : 0;

    // ── Batch 2: Aggregated time-series queries (parallel) ───
    const [jobsOverTimeRows, attendanceTrendRows, closedJobsAgg, todayAttendance] = await Promise.all([
      // Jobs created/closed per day — single aggregated query
      this.prisma.raw.$queryRaw<Array<{ date: string; created: bigint; closed: bigint }>>`
        SELECT DATE(created_at) AS date,
               COUNT(*) AS created,
               SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed
        FROM jobs
        WHERE created_at >= ${thirtyDaysAgo} AND archived_at IS NULL
        GROUP BY DATE(created_at)
      `,

      // Attendance trend per day — single aggregated query
      this.prisma.raw.$queryRaw<Array<{ date: string; booked: bigint; arrived: bigint; noShow: bigint }>>`
        SELECT DATE(created_at) AS date,
               COUNT(*) AS booked,
               SUM(CASE WHEN arrived_at IS NOT NULL THEN 1 ELSE 0 END) AS arrived,
               SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS noShow
        FROM jobs
        WHERE created_at >= ${new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)}
        GROUP BY DATE(created_at)
      `,

      // Average turnaround — single aggregated query
      this.prisma.raw.$queryRaw<Array<{ avgHours: number }>>`
        SELECT ROUND(AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) / 3600, 1) AS avgHours
        FROM jobs
        WHERE status = 'closed' AND completed_at IS NOT NULL AND created_at >= ${thirtyDaysAgo}
      `,

      // Today's attendance counts — single aggregated query
      this.prisma.raw.$queryRaw<Array<{ todayBooked: bigint; todayArrived: bigint; todayNoShow: bigint; dueToday: bigint }>>`
        SELECT
          SUM(CASE WHEN created_at >= ${this.todayStart(now)} AND created_at < ${this.tomorrowStart(now)} THEN 1 ELSE 0 END) AS todayBooked,
          SUM(CASE WHEN arrived_at >= ${this.todayStart(now)} AND arrived_at < ${this.tomorrowStart(now)} THEN 1 ELSE 0 END) AS todayArrived,
          SUM(CASE WHEN status = 'no_show' AND updated_at >= ${this.todayStart(now)} AND updated_at < ${this.tomorrowStart(now)} THEN 1 ELSE 0 END) AS todayNoShow,
          SUM(CASE WHEN promised_at >= ${this.todayStart(now)} AND promised_at < ${this.tomorrowStart(now)} AND status NOT IN ('closed', 'no_show') AND archived_at IS NULL THEN 1 ELSE 0 END) AS dueToday
        FROM jobs
      `,
    ]);

    // ── Build time series from aggregated results ────────────
    const jobsMap = new Map(jobsOverTimeRows.map((r: any) => [String(r.date).slice(0, 10), { created: Number(r.created), closed: Number(r.closed) }]));
    const jobsOverTime = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      return { date: key, ...(jobsMap.get(key) || { created: 0, closed: 0 }) };
    });

    const attMap = new Map(attendanceTrendRows.map((r: any) => [String(r.date).slice(0, 10), { booked: Number(r.booked), arrived: Number(r.arrived), noShow: Number(r.noShow) }]));
    const attendanceTrend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(now.getTime() - (13 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      return { date: key, ...(attMap.get(key) || { booked: 0, arrived: 0, noShow: 0 }) };
    });

    const todayRow = todayAttendance[0] || {};
    const todayBooked = Number(todayRow.todayBooked || 0);
    const todayArrived = Number(todayRow.todayArrived || 0);
    const todayNoShow = Number(todayRow.todayNoShow || 0);
    const dueToday = Number(todayRow.dueToday || 0);

    // ── Batch 3: Revenue + 30d attendance + advisor (parallel) ──
    const [revenueRows, attendance30d, advisorJobs, todayPendingArrival] = await Promise.all([
      // Revenue by job status — single aggregated query
      this.prisma.raw.$queryRaw<Array<{ status: string; lines: bigint; total: number; tax: number; approvedPending: number }>>`
        SELECT j.status,
               COUNT(el.id) AS lines,
               ROUND(SUM(el.line_total), 2) AS total,
               ROUND(SUM(el.tax_amount), 2) AS tax,
               SUM(CASE WHEN j.status = 'estimate_sent' AND NOT EXISTS (
                 SELECT 1 FROM authorisation_decisions ad WHERE ad.estimate_line_id = el.id AND ad.decision = 'approved'
               ) THEN el.line_total ELSE 0 END) AS approvedPending
        FROM estimate_lines el
        JOIN jobs j ON el.job_id = j.id
        WHERE el.job_id IS NOT NULL
        GROUP BY j.status
      `,

      // 30-day attendance aggregates
      this.prisma.raw.$queryRaw<Array<{ noShow30d: bigint; arrived30d: bigint; booked30d: bigint }>>`
        SELECT
          SUM(CASE WHEN status = 'no_show' AND updated_at >= ${thirtyDaysAgo} THEN 1 ELSE 0 END) AS noShow30d,
          SUM(CASE WHEN arrived_at >= ${thirtyDaysAgo} THEN 1 ELSE 0 END) AS arrived30d,
          SUM(CASE WHEN created_at >= ${thirtyDaysAgo} THEN 1 ELSE 0 END) AS booked30d
        FROM jobs
      `,

      // Advisor performance — single query, process in JS
      this.prisma.tenant.jobs.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: {
          status: true,
          arrived_at: true,
          users_jobs_advisor_idTousers: { select: { name: true, email: true } },
        },
      }),

      this.prisma.tenant.jobs.count({ where: { status: 'booked', arrived_at: null, archived_at: null } }),
    ]);

    // Revenue processing
    let totalRevenue = 0;
    let approvedRevenue = 0;
    let pendingRevenue = 0;
    const revenueByStatus: Record<string, { lines: number; total: number; tax: number }> = {};
    for (const row of revenueRows) {
      const status = row.status;
      const lt = Number(row.total);
      const tx = Number(row.tax);
      const lines = Number(row.lines);
      revenueByStatus[status] = { lines, total: Math.round(lt * 100) / 100, tax: Math.round(tx * 100) / 100 };
      totalRevenue += lt;
      if (status === 'closed' || status === 'ready') approvedRevenue += lt;
    }
    pendingRevenue = Number(revenueRows.reduce((sum, r) => sum + Number(r.approvedPending || 0), 0));

    // Attendance 30d
    const att30 = attendance30d[0] || {};
    const showRate30d = Number(att30.booked30d) > 0 ? Math.round((Number(att30.arrived30d) / Number(att30.booked30d)) * 100) : 0;

    // Advisor processing
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

    // Average turnaround
    const avgTurnaroundHours = closedJobsAgg[0]?.avgHours ?? null;

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
        noShow30d: Number(att30.noShow30d),
        arrived30d: Number(att30.arrived30d),
        booked30d: Number(att30.booked30d),
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
          total: data.total,
          tax: data.tax,
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

  private todayStart(now: Date): Date {
    const offset = 4 * 60 * 60 * 1000;
    const dubai = new Date(now.getTime() + offset);
    return new Date(Date.UTC(dubai.getUTCFullYear(), dubai.getUTCMonth(), dubai.getUTCDate()) - offset);
  }

  private tomorrowStart(now: Date): Date {
    return new Date(this.todayStart(now).getTime() + 24 * 60 * 60 * 1000);
  }
}