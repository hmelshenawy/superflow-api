import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RunImportDto, SaveTemplateDto } from './dto/booking-import.dto';
import * as XLSX from 'xlsx';

/** Header-like customer names that should be skipped during import */
const HEADER_LIKE_NAMES = new Set([
  'customer name', 'customer', 'name', 'customer_name', 'customername',
  'client name', 'client', 'contact name', 'contact',
]);

/** Normalize VIN: uppercase, trim, cut to 17 chars (DMS may append extra digit) */
function normalizeVin(v?: string | null): string | null {
  const c = v?.trim().toUpperCase() ?? null;
  if (!c) return null;
  return c.length > 17 ? c.substring(0, 17) : c;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface BookingRow {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  vehicle_vin?: string;
  job_number?: string;
  advisor_id?: string;
  customer_concern?: string;
  promised_at?: string;
  dms_ro_number?: string;
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  preview: Record<string, string>[];  // first 5 rows for mapping UI
  totalRows: number;
}

function resolveImportedVehicleFields(row: BookingRow): { make: string | null; model: string } {
  const rawMake = row.vehicle_make?.trim() || '';
  const rawModel = row.vehicle_model?.trim() || '';

  // PrioraFlow booking imports are Mercedes-only for now.
  // If the sheet provides one combined vehicle description column,
  // keep make blank and store the value as model to avoid duplication.
  if (!rawModel) {
    return {
      make: null,
      model: rawMake,
    };
  }

  return {
    make: rawMake || null,
    model: rawModel,
  };
}

const ALLOWED_IMPORT_EXTENSIONS = ['xlsx', 'xls', 'csv'];

// Strip CSV/Excel formula injection characters from cell values.
// Leading = + - @ \t \r characters can trigger formula execution
// when the data is later exported to Excel.
function sanitizeCell(value: string): string {
  return value
    .replace(/^[\t\r=+\-@]/, match => match === '\t' || match === '\r' ? '' : ` '${match.slice(1)}`)
    .replace(/\r/g, '');
}

@Injectable()
export class BookingImportService {
  constructor(private prisma: PrismaService) {}

  // ─── File Parsing ──────────────────────────────────────

  async parseFile(file: Express.Multer.File): Promise<ParseResult> {
    const ext = file.originalname?.toLowerCase().split('.').pop() || '';
    if (!ALLOWED_IMPORT_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(`File extension .${ext} is not allowed. Supported: ${ALLOWED_IMPORT_EXTENSIONS.join(', ')}`);
    }

    let workbook: XLSX.WorkBook;
    try {
      if (ext === 'csv') {
        workbook = XLSX.read(file.buffer, { type: 'buffer', raw: true });
      } else {
        workbook = XLSX.read(file.buffer, { type: 'buffer', raw: true });
      }
    } catch {
      throw new BadRequestException('Could not parse file. Supported formats: .xlsx, .xls, .csv');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, {
      defval: '',
      raw: true,  // get raw values so we can format numbers ourselves
    });

    if (!jsonData.length) {
      throw new BadRequestException('File contains no data rows');
    }

    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map((row) => {
      const clean: Record<string, string> = {};
      for (const h of headers) {
        const val = row[h];
        if (typeof val === 'number') {
          // Numbers with 10+ digits are likely phone/VIN — format as integer string, no scientific notation
          clean[h] = Number.isInteger(val) ? String(val) : String(val);
        } else {
          clean[h] = sanitizeCell(String(val ?? '').trim());
        }
      }
      return clean;
    });

    return {
      headers,
      rows,
      preview: rows.slice(0, 5),
      totalRows: rows.length,
    };
  }

  // ─── Template CRUD ─────────────────────────────────────

  async listTemplates() {
    const templates = await this.prisma.tenant.booking_import_templates.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
    return templates.map((t: any) => ({ ...t, mappings: JSON.parse(t.mappings) }));
  }

  async getTemplate(id: string) {
    const t = await this.prisma.tenant.booking_import_templates.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return { ...t, mappings: JSON.parse(t.mappings) };
  }

  async saveTemplate(dto: SaveTemplateDto, userId: string) {
    return this.prisma.tenant.booking_import_templates.create({
      data: {
        id: uuid(),
        name: dto.name,
        mappings: JSON.stringify(dto.mappings),
        created_by: userId,
      },
    });
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id);
    return this.prisma.tenant.booking_import_templates.update({
      where: { id },
      data: { is_active: false },
    });
  }

  // ─── Import Logic ──────────────────────────────────────

  async runImport(dto: RunImportDto, userId: string): Promise<ImportResult> {
    let mappings: { source: string; target: string }[];

    if (dto.mappings?.length) {
      mappings = dto.mappings;
    } else if (dto.template_id) {
      const template = await this.getTemplate(dto.template_id);
      mappings = JSON.parse(template.mappings as any);
    } else {
      throw new BadRequestException('Provide either mappings or template_id');
    }

    const result: ImportResult = { total: dto.rows.length, created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < dto.rows.length; i++) {
      const rawRow = dto.rows[i];

      try {
        const row = this.mapRow(rawRow, mappings);

        if (!row.customer_name?.trim()) {
          result.skipped++;
          continue;
        }

        // Skip header-like rows (e.g. "Customer name", "Name", etc.)
        const nameLower = row.customer_name.trim().toLowerCase();
        if (HEADER_LIKE_NAMES.has(nameLower)) {
          result.skipped++;
          continue;
        }

        // 1. Find or create customer
        let customer = await this.findCustomer(row);
        if (!customer) {
          customer = await this.prisma.tenant.customers.create({
            data: {
              id: uuid(),
              name: row.customer_name.trim(),
              email: row.customer_email?.trim() || null,
              phone: row.customer_phone?.trim() || null,
            },
          });
        }

        // 2. Find or create vehicle
        let vehicle = await this.findVehicle(row, customer.id);
        const vehicleFields = resolveImportedVehicleFields(row);
        if (!vehicle) {
          vehicle = await this.prisma.tenant.vehicles.create({
            data: {
              id: uuid(),
              customer_id: customer.id,
              vin: normalizeVin(row.vehicle_vin),
              make: vehicleFields.make,
              model: vehicleFields.model,
              plate: row.vehicle_plate?.trim() || null,
            },
          });
        } else {
          const updateData: any = { customer_id: customer.id };
          const existingMake = vehicle.make?.trim() || '';
          const existingModel = vehicle.model?.trim() || '';
          const isLegacyDuplicatedVehicle = !!existingMake && existingMake === existingModel;

          if (vehicleFields.make && !vehicle.make) updateData.make = vehicleFields.make;
          if (vehicleFields.model && !vehicle.model) updateData.model = vehicleFields.model;

          // Self-heal old Mercedes booking imports where one description value
          // was saved into both make and model.
          if (!vehicleFields.make && vehicleFields.model && isLegacyDuplicatedVehicle) {
            updateData.make = null;
            updateData.model = vehicleFields.model;
          }

          if (row.vehicle_plate?.trim() && !vehicle.plate) updateData.plate = row.vehicle_plate.trim();
          if (row.vehicle_vin?.trim() && !vehicle.vin) updateData.vin = normalizeVin(row.vehicle_vin);
          if (Object.keys(updateData).length > 1) {
            await this.prisma.tenant.vehicles.update({ where: { id: vehicle.id }, data: updateData });
          }
        }

        // 3. Duplicate check: WIP/job_number first, then VIN
        // a) Match by WIP/job_number — if exists, skip (duplicate booking)
        if (row.job_number?.trim()) {
          const existingJob = await this.prisma.tenant.jobs.findFirst({
            where: { job_number: row.job_number.trim() },
          });
          if (existingJob) {
            result.skipped++;
            continue;
          }
        }

        // b) Match by VIN — if same VIN has an active booked job, skip (car already in booking column)
        const vinToCheck = normalizeVin(row.vehicle_vin);
        if (vinToCheck) {
          const vinVehicle = await this.prisma.tenant.vehicles.findFirst({ where: { vin: vinToCheck } });
          if (vinVehicle) {
            const activeBooking = await this.prisma.tenant.jobs.findFirst({
              where: { vehicle_id: vinVehicle.id, status: 'booked' },
            });
            if (activeBooking) {
              result.skipped++;
              continue;
            }
          }
        }

        // 4. Resolve advisor by employee_code, name, or email
        let advisorId: string | null = null;
        const ownerCode = row.advisor_id?.trim() || null;
        if (ownerCode) {
          const advisor = await this.prisma.raw.users.findFirst({
            where: {
              OR: [
                { employee_code: ownerCode },
                { name: { contains: ownerCode } },
                { email: { contains: ownerCode } },
              ],
            },
          });
          if (advisor) advisorId = advisor.id;
        }

        // 5. Create job
        await this.prisma.tenant.jobs.create({
          data: {
            id: uuid(),
            job_number: row.job_number?.trim() || null,
            customer_id: customer.id,
            vehicle_id: vehicle.id,
            advisor_id: advisorId,
            owner_code: ownerCode,
            customer_concern: row.customer_concern?.trim() || null,
            dms_ro_number: row.dms_ro_number?.trim() || null,
            promised_at: row.promised_at ? new Date(row.promised_at) : null,
            status: 'booked',
          },
        });

        result.created++;
      } catch (err: any) {
        result.errors.push({ row: i + 1, message: err.message || 'Unknown error' });
      }
    }

    return result;
  }

  // ─── Helpers ────────────────────────────────────────────

  private mapRow(
    rawRow: Record<string, string>,
    mappings: { source: string; target: string }[],
  ): BookingRow {
    const mapped: BookingRow = {};
    for (const m of mappings) {
      if (m.target === '_ignore' || !(m.source in rawRow)) continue;
      (mapped as any)[m.target] = rawRow[m.source] ?? '';
    }
    return mapped;
  }

  private async findCustomer(row: BookingRow) {
    if (row.customer_phone?.trim()) {
      const byPhone = await this.prisma.tenant.customers.findFirst({
        where: { phone: row.customer_phone.trim(), is_active: true },
      });
      if (byPhone) return byPhone;
    }
    if (row.customer_email?.trim()) {
      const byEmail = await this.prisma.tenant.customers.findFirst({
        where: { email: row.customer_email.trim(), is_active: true },
      });
      if (byEmail) return byEmail;
    }
    if (row.customer_name?.trim()) {
      const byName = await this.prisma.tenant.customers.findFirst({
        where: { name: { equals: row.customer_name.trim() }, is_active: true },
      });
      if (byName) return byName;
    }
    return null;
  }

  private async findVehicle(row: BookingRow, customerId: string) {
    if (row.vehicle_vin?.trim()) {
      const byVin = await this.prisma.tenant.vehicles.findFirst({
        where: { vin: normalizeVin(row.vehicle_vin)! },
      });
      if (byVin) return byVin;
    }
    if (row.vehicle_plate?.trim()) {
      const byPlate = await this.prisma.tenant.vehicles.findFirst({
        where: { plate: row.vehicle_plate.trim(), customer_id: customerId },
      });
      if (byPlate) return byPlate;
    }
    return null;
  }
}