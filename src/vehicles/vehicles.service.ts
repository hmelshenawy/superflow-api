import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  private cleanString(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  /** Normalize VIN: uppercase and trim to 17 chars (some DMS systems append an extra digit) */
  private normalizeVin(value?: string | null): string | null {
    const cleaned = this.cleanString(value)?.toUpperCase() ?? null;
    if (!cleaned) return null;
    return cleaned.length > 17 ? cleaned.substring(0, 17) : cleaned;
  }

  async create(dto: CreateVehicleDto) {
    // VIN deduplication: if a vehicle with the same VIN already exists, update
    // it instead of creating a duplicate. This handles repeated intake flows
    // where the same car comes back for a new job.
    const vin = this.normalizeVin(dto.vin);
    const plate = this.cleanString(dto.plate);
    const make = this.cleanString(dto.make);
    const model = this.cleanString(dto.model);
    const color = this.cleanString(dto.color);
    const engine = this.cleanString(dto.engine);

    if (vin) {
      const existing = await this.prisma.tenant.vehicles.findFirst({ where: { vin } });
      if (existing) {
        // Existing VIN found — merge incoming fields over the existing record
        // so we never duplicate vehicles on repeated job creation.
        return this.prisma.tenant.vehicles.update({
          where: { id: existing.id },
          data: {
            customer_id: dto.customer_id || existing.customer_id,
            make: make ?? existing.make,
            model: model ?? existing.model,
            year: dto.year ?? existing.year,
            plate: plate ?? existing.plate,
            color: color ?? existing.color,
            odometer_km: dto.odometer_km ?? existing.odometer_km,
            vehicle_type: dto.vehicle_type || existing.vehicle_type || undefined,
            engine: engine ?? existing.engine,
          },
        });
      }
    }

    return this.prisma.tenant.vehicles.create({
      data: {
        id: uuid(),
        customer_id: dto.customer_id,
        vin,
        make: make ?? dto.make,
        model: model ?? dto.model,
        year: dto.year,
        plate,
        color,
        odometer_km: dto.odometer_km,
        vehicle_type: dto.vehicle_type || undefined,
        engine,
      },
    });
  }

  async findAll(pagination: PaginationDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      this.prisma.tenant.vehicles.findMany({
        skip,
        take: pagination.limit,
        include: { customers: { select: { id: true, name: true, phone: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.tenant.vehicles.count(),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.tenant.vehicles.findUnique({
      where: { id },
      include: { customers: true, jobs: true, vehicle_service_history: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async serviceHistory(id: string) {
    await this.findOne(id);

    const [jobs, manualEntries] = await Promise.all([
      this.prisma.tenant.jobs.findMany({
        where: { vehicle_id: id, is_deleted: false },
        include: {
          customers: { select: { id: true, name: true, phone: true } },
          users_jobs_advisor_idTousers: { select: { id: true, name: true, email: true } },
          users_jobs_technician_idTousers: { select: { id: true, name: true, email: true } },
          estimate_lines: {
            select: {
              id: true,
              type: true,
              description: true,
              quantity: true,
              line_total: true,
              is_recommended: true,
              created_at: true,
            },
            orderBy: { created_at: 'asc' },
          },
          inspections: { select: { id: true, status: true, started_at: true, submitted_at: true } },
          media_files: { where: { is_deleted: false }, select: { id: true } },
        },
        orderBy: [{ completed_at: 'desc' }, { created_at: 'desc' }],
      }),
      this.prisma.tenant.vehicle_service_history.findMany({
        where: { vehicle_id: id },
        include: { jobs: { select: { id: true, job_number: true } } },
        orderBy: [{ serviced_at: 'desc' }],
      }),
    ]);

    const jobEntries = jobs.map((job: any) => ({
      id: job.id,
      type: 'job',
      job_id: job.id,
      job_number: job.job_number,
      status: job.status,
      workshop_stage: job.workshop_stage,
      parts_status: job.parts_status,
      customer: job.customers,
      advisor: job.users_jobs_advisor_idTousers,
      technician: job.users_jobs_technician_idTousers,
      odometer_km: job.odometer_in,
      summary: job.customer_concern,
      service_date: job.completed_at || job.invoiced_at || job.created_at,
      promised_at: job.promised_at,
      completed_at: job.completed_at,
      created_at: job.created_at,
      estimate_total: (job.estimate_lines ?? []).reduce((sum: number, line: any) => sum + Number(line.line_total ?? 0), 0),
      estimate_lines: job.estimate_lines ?? [],
      inspection: job.inspections ?? null,
      media_count: job.media_files?.length ?? 0,
      dms_ro_number: job.dms_ro_number,
    }));

    const manualHistory = manualEntries.map((entry: any) => ({
      id: entry.id,
      type: 'manual',
      job_id: entry.job_id,
      job_number: entry.jobs?.job_number ?? null,
      status: null,
      workshop_stage: null,
      parts_status: null,
      customer: null,
      advisor: null,
      technician: null,
      odometer_km: entry.odometer_km,
      summary: entry.summary,
      service_date: entry.serviced_at || entry.created_at,
      promised_at: null,
      completed_at: null,
      created_at: entry.created_at,
      estimate_total: null,
      estimate_lines: [],
      inspection: null,
      media_count: 0,
      dms_ro_number: null,
    }));

    const entries = [...jobEntries, ...manualHistory].sort((a, b) => {
      const left = a.service_date ? new Date(a.service_date).getTime() : 0;
      const right = b.service_date ? new Date(b.service_date).getTime() : 0;
      return right - left;
    });

    const totals = entries.reduce(
      (acc, entry: any) => {
        if (entry.type === 'job') acc.jobs += 1;
        if (entry.status === 'closed') acc.closedJobs += 1;
        if (typeof entry.estimate_total === 'number') acc.revenue += entry.estimate_total;
        return acc;
      },
      { jobs: 0, closedJobs: 0, revenue: 0 },
    );

    return { vehicleId: id, totals, entries };
  }

  async findByVin(vin: string) {
    // VIN must be exactly 17 characters — enforced here because the DB
    // unique constraint only guarantees uniqueness, not format correctness.
    const normalizedVin = vin.trim().toUpperCase().substring(0, 17);
    if (normalizedVin.length !== 17) throw new BadRequestException('VIN must be exactly 17 characters');

    const existingVehicle = await this.prisma.tenant.vehicles.findFirst({
      where: { vin: normalizedVin },
      include: { customers: { select: { id: true, name: true, phone: true } } },
    });

    // NHTSA VIN decode provides make/model/year pre-fill for new vehicles.
    // Failure is non-blocking — the response just omits the decoded block.
    let decoded: any = null;
    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${normalizedVin}?format=json`);
      const data: any = await response.json();
      const row = data?.Results?.[0];
      if (row) {
        decoded = {
          vin: normalizedVin,
          make: row.Make || null,
          model: row.Model || null,
          year: row.ModelYear ? Number(row.ModelYear) : null,
          bodyClass: row.BodyClass || null,
          engine: row.EngineModel || row.DisplacementL || null,
          fuelType: row.FuelTypePrimary || null,
          manufacturer: row.Manufacturer || null,
          plantCountry: row.PlantCountry || null,
          errorCode: row.ErrorCode || null,
          errorText: row.ErrorText || null,
        };
      }
    } catch {
      decoded = null;
    }

    return {
      vin: normalizedVin,
      existingVehicle,
      decoded,
    };
  }

  async findByCustomer(customerId: string) {
    return this.prisma.tenant.vehicles.findMany({ where: { customer_id: customerId }, orderBy: { created_at: 'desc' } });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.tenant.vehicles.update({
      where: { id },
      data: {
        ...dto,
        vin: this.normalizeVin(dto.vin),
        plate: this.cleanString(dto.plate),
        color: this.cleanString(dto.color),
        engine: this.cleanString(dto.engine),
        make: this.cleanString(dto.make) ?? undefined,
        model: this.cleanString(dto.model) ?? undefined,
        vehicle_type: dto.vehicle_type || undefined,
      },
    });
  }
}
