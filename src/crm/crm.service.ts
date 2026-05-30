import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { getWorkshopContext } from '../prisma/workshop-context';
import { CrmDashboardQueryDto } from './dto/crm-dashboard-query.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CreateCrmCustomerDto } from './dto/create-crm-customer.dto';
import { UpdateCrmCustomerDto } from './dto/update-crm-customer.dto';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if the current workshop has access to CRM module.
   * CRM is only available for 'WORKSHOP' product mode (PrioraFlow Workshop).
   */
  private async ensureCrmAccess(): Promise<string> {
    const ctx = getWorkshopContext();
    if (!ctx.workshopId) {
      throw new ForbiddenException('Workshop context required');
    }

    const workshop = await this.prisma.raw.workshops.findUnique({
      where: { id: ctx.workshopId },
      select: { product_mode: true },
    });

    if (!workshop || workshop.product_mode !== 'WORKSHOP') {
      throw new ForbiddenException('CRM module is only available for PrioraFlow Workshop');
    }

    return ctx.workshopId;
  }

  // ─── Overview ──────────────────────────────────────────────

  async getCrmOverview() {
    const workshopId = await this.ensureCrmAccess();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalActiveCustomers, newCustomersThisMonth, totalVehicles, overdueReminders] = await Promise.all([
      this.prisma.tenant.customers.count({ where: { is_active: true } }),
      this.prisma.tenant.customers.count({ where: { is_active: true, created_at: { gte: startOfMonth } } }),
      this.prisma.tenant.vehicles.count({ where: { is_deleted: false } }),
      this.prisma.tenant.customer_activities.count({
        where: { type: 'reminder', is_done: false, due_at: { lt: now } },
      }),
    ]);

    // Top customers by revenue (sum of closed/invoiced jobs)
    const topCustomers = await this.prisma.$queryRaw<Array<{ id: string; name: string; revenue: bigint }>>`
      SELECT c.id, c.name, COALESCE(SUM(el.line_total), 0) as revenue
      FROM customers c
      LEFT JOIN jobs j ON j.customer_id = c.id AND j.status = 'closed' AND j.workshop_id = ${workshopId}
      LEFT JOIN estimate_lines el ON el.job_id = j.id AND el.workshop_id = ${workshopId}
      WHERE c.workshop_id = ${workshopId} AND c.is_active = 1
      GROUP BY c.id
      ORDER BY revenue DESC
      LIMIT 5
    `;

    return {
      totalActiveCustomers,
      newCustomersThisMonth,
      totalVehicles,
      customersWithOverdueReminders: overdueReminders,
      topCustomersByRevenue: topCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        revenue: Number(c.revenue),
      })),
    };
  }

  // ─── Customer List ──────────────────────────────────────────

  async listCustomers(query: CrmDashboardQueryDto) {
    const workshopId = await this.ensureCrmAccess();
    const { search, tag, lead_source, sort = 'created_at', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { is_active: true };
    if (lead_source) where.lead_source = lead_source;

    // Search across name, phone, email, mobile
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { mobile: { contains: search } },
      ];
    }

    const term = search?.toLowerCase();
    const orderBy =
      sort === 'name'
        ? Prisma.sql`c.name ASC`
        : sort === 'last_visit'
          ? Prisma.sql`last_visit DESC`
          : Prisma.sql`c.created_at DESC`;

    // Get customers with computed stats via raw query for efficiency.
    // Use Prisma.sql fragments only; nested $queryRaw calls inside a template produce invalid SQL.
    const customers = await this.prisma.$queryRaw<any[]>`
      SELECT
        c.id, c.name, c.email, c.phone, c.mobile, c.address, c.city, c.tags, c.lead_source,
        c.preferred_contact, c.language, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id = c.id AND v.workshop_id = ${workshopId}) as vehicle_count,
        (SELECT COUNT(*) FROM jobs j WHERE j.customer_id = c.id AND j.workshop_id = ${workshopId}) as job_count,
        (SELECT MAX(j2.created_at) FROM jobs j2 WHERE j2.customer_id = c.id AND j2.workshop_id = ${workshopId}) as last_visit
      FROM customers c
      WHERE c.workshop_id = ${workshopId}
        AND c.is_active = 1
        ${term ? Prisma.sql`AND (
          LOWER(c.name) LIKE ${`%${term}%`}
          OR LOWER(c.phone) LIKE ${`%${term}%`}
          OR LOWER(c.email) LIKE ${`%${term}%`}
          OR LOWER(c.mobile) LIKE ${`%${term}%`}
        )` : Prisma.empty}
        ${lead_source ? Prisma.sql`AND c.lead_source = ${lead_source}` : Prisma.empty}
        ${tag ? Prisma.sql`AND JSON_CONTAINS(c.tags, ${JSON.stringify(tag)})` : Prisma.empty}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${skip}
    `;

    const total = await this.prisma.tenant.customers.count({ where });

    return {
      items: customers.map((c) => ({
        ...c,
        vehicle_count: Number(c.vehicle_count || 0),
        job_count: Number(c.job_count || 0),
      })),
      total,
      page,
      limit,
    };
  }

  // ─── Customer Dashboard (360°) ──────────────────────────────

  async getCustomerDashboard(customerId: string) {
    await this.ensureCrmAccess();

    const customer = await this.prisma.tenant.customers.findUnique({
      where: { id: customerId },
      include: {
        vehicles: { select: { id: true, make: true, vehicle_model: true, year: true, plate: true, vin: true } },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    // Get stats
    const [jobStats, recentActivities, recentJobs] = await Promise.all([
      this.prisma.$queryRaw<Array<{ total_jobs: bigint; total_revenue: bigint }>>`
        SELECT COUNT(DISTINCT j.id) as total_jobs, COALESCE(SUM(el.line_total), 0) as total_revenue
        FROM jobs j
        LEFT JOIN estimate_lines el ON el.job_id = j.id
        WHERE j.customer_id = ${customerId}
      `,
      this.prisma.tenant.customer_activities.findMany({
        where: { customer_id: customerId },
        orderBy: { created_at: 'desc' },
        take: 20,
        include: { users: { select: { id: true, name: true } } },
      }),
      this.prisma.tenant.jobs.findMany({
        where: { customer_id: customerId },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { vehicles: { select: { make: true, vehicle_model: true, plate: true } } },
      }),
    ]);

    const lastVisit = await this.prisma.tenant.jobs.findFirst({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    return {
      customer,
      vehicles: customer.vehicles,
      stats: {
        totalJobs: Number(jobStats[0]?.total_jobs || 0),
        totalRevenue: Number(jobStats[0]?.total_revenue || 0),
        lastVisitDate: lastVisit?.created_at || null,
        totalVisits: Number(jobStats[0]?.total_jobs || 0),
      },
      recentActivities,
      recentJobs,
    };
  }

  // ─── Customer CRUD ──────────────────────────────────────────

  async createCustomer(dto: CreateCrmCustomerDto) {
    await this.ensureCrmAccess();
    return this.prisma.tenant.customers.create({
      data: {
        id: uuid(),
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        preferred_contact: dto.preferred_contact as any,
        language: dto.language,
        notes: dto.notes,
        address: dto.address,
        city: dto.city,
        tags: dto.tags as any,
        lead_source: dto.lead_source,
      },
    });
  }

  async updateCustomer(customerId: string, dto: UpdateCrmCustomerDto) {
    await this.ensureCrmAccess();
    const customer = await this.prisma.tenant.customers.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.tenant.customers.update({
      where: { id: customerId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        preferred_contact: dto.preferred_contact as any,
        language: dto.language,
        notes: dto.notes,
        address: dto.address,
        city: dto.city,
        tags: dto.tags as any,
        lead_source: dto.lead_source,
        is_active: dto.is_active,
      },
    });
  }

  // ─── Activities ─────────────────────────────────────────────

  async createActivity(customerId: string, dto: CreateActivityDto, userId: string | null) {
    await this.ensureCrmAccess();
    return this.prisma.tenant.customer_activities.create({
      data: {
        id: uuid(),
        customer_id: customerId,
        type: dto.type,
        content: dto.content,
        created_by: userId,
        due_at: dto.due_at ? new Date(dto.due_at) : null,
      },
    });
  }

  async listActivities(customerId: string, type?: string) {
    await this.ensureCrmAccess();
    const where: any = { customer_id: customerId };
    if (type) where.type = type;

    return this.prisma.tenant.customer_activities.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { users: { select: { id: true, name: true } } },
    });
  }

  async updateActivity(activityId: string, dto: UpdateActivityDto) {
    await this.ensureCrmAccess();
    const activity = await this.prisma.tenant.customer_activities.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.tenant.customer_activities.update({
      where: { id: activityId },
      data: {
        content: dto.content,
        is_done: dto.is_done,
      },
    });
  }

  async deleteActivity(activityId: string) {
    await this.ensureCrmAccess();
    const activity = await this.prisma.tenant.customer_activities.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    return this.prisma.tenant.customer_activities.delete({ where: { id: activityId } });
  }

  // ─── Vehicle List ──────────────────────────────────────────

  async listVehicles(query: { search?: string; make?: string; year?: number; page: number; limit: number }) {
    await this.ensureCrmAccess();
    const { search, make, year, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { is_deleted: false };
    if (make) where.make = make;
    if (year) where.year = year;

    // Search by plate, VIN, make, model
    if (search) {
      where.OR = [
        { plate: { contains: search } },
        { vin: { contains: search } },
        { make: { contains: search } },
        { vehicle_model: { contains: search } },
      ];
    }

    const vehicles = await this.prisma.tenant.vehicles.findMany({
      where,
      skip,
      take: limit,
      include: {
        customers: { select: { id: true, name: true, phone: true } },
        _count: { select: { jobs: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const total = await this.prisma.tenant.vehicles.count({ where });

    return {
      items: vehicles.map((v: any) => ({
        ...v,
        customer_name: v.customers?.name || null,
        job_count: v._count?.jobs || 0,
        is_orphan: !v.customer_id,
      })),
      total,
      page,
      limit,
    };
  }

  // ─── Vehicle Dashboard ─────────────────────────────────────

  async getVehicleDashboard(vehicleId: string) {
    await this.ensureCrmAccess();

    const vehicle = await this.prisma.tenant.vehicles.findUnique({
      where: { id: vehicleId },
      include: { customers: true },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const jobStats = await this.prisma.$queryRaw<Array<{ total_jobs: bigint; total_revenue: bigint; last_service: Date }>>`
      SELECT COUNT(DISTINCT j.id) as total_jobs, COALESCE(SUM(el.line_total), 0) as total_revenue, MAX(j.created_at) as last_service
      FROM jobs j
      LEFT JOIN estimate_lines el ON el.job_id = j.id
      WHERE j.vehicle_id = ${vehicleId}
    `;

    const [jobHistory, manualHistory] = await Promise.all([
      this.prisma.tenant.jobs.findMany({
        where: { vehicle_id: vehicleId, is_deleted: false },
        select: {
          id: true,
          job_number: true,
          status: true,
          customer_concern: true,
          odometer_in: true,
          dms_ro_number: true,
          completed_at: true,
          invoiced_at: true,
          created_at: true,
          estimate_lines: { select: { description: true, line_total: true }, orderBy: { created_at: 'asc' } },
        },
        orderBy: [{ completed_at: 'desc' }, { created_at: 'desc' }],
        take: 20,
      }),
      this.prisma.tenant.vehicle_service_history.findMany({
        where: { vehicle_id: vehicleId },
        orderBy: { serviced_at: 'desc' },
        take: 20,
      }),
    ]);

    const serviceHistory = [
      ...jobHistory.map((job: any) => ({
        id: job.id,
        type: 'job',
        job_id: job.id,
        job_number: job.job_number,
        status: job.status,
        summary:
          job.customer_concern ||
          (job.estimate_lines ?? [])
            .map((line: any) => line.description)
            .filter(Boolean)
            .slice(0, 2)
            .join(' / ') ||
          job.dms_ro_number ||
          job.job_number ||
          'Workshop job',
        odometer_km: job.odometer_in,
        serviced_at: job.completed_at || job.invoiced_at || job.created_at,
        estimate_total: (job.estimate_lines ?? []).reduce((sum: number, line: any) => sum + Number(line.line_total ?? 0), 0),
      })),
      ...manualHistory.map((entry: any) => ({ ...entry, type: 'manual' })),
    ]
      .sort((a: any, b: any) => {
        const left = a.serviced_at ? new Date(a.serviced_at).getTime() : 0;
        const right = b.serviced_at ? new Date(b.serviced_at).getTime() : 0;
        return right - left;
      })
      .slice(0, 20);

    return {
      vehicle,
      customer: vehicle.customers,
      stats: {
        totalJobs: Number(jobStats[0]?.total_jobs || 0),
        totalRevenue: Number(jobStats[0]?.total_revenue || 0),
        lastServiceDate: jobStats[0]?.last_service || null,
        currentOdometer: vehicle.odometer_km,
      },
      serviceHistory,
    };
  }
}