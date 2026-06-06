import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceCalcService } from './invoices-calc.service';
import { InvoiceNumberService } from './invoice-number.service';
import { CreateInvoiceDto, CreateLineItemDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto, UpdateLineItemDto } from './dto/update-invoice.dto';
import { ListInvoicesDto, InvoiceStatusFilter } from './dto/list-invoices.dto';
import { InvoiceStatus } from './dto/invoice-response.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private calc: InvoiceCalcService,
    private numberService: InvoiceNumberService,
  ) {}

  private mapLineItemDtoToCalc(item: CreateLineItemDto | UpdateLineItemDto) {
    return {
      quantity: Number(item.quantity ?? 1),
      unit_price_cents: Number(item.unit_price_cents ?? 0),
      discount_cents: Number(item.discount_cents ?? 0),
      vat_rate: Number(item.vat_rate ?? 0),
      vat_applicable: item.vat_applicable ?? true,
    };
  }

  private mapLineItemToPrisma(item: CreateLineItemDto | UpdateLineItemDto, sortOrder: number) {
    const calc = this.calc.calculateLine(this.mapLineItemDtoToCalc(item));
    return {
      type: item.type,
      description: item.description,
      sku: item.sku,
      quantity: Number(item.quantity),
      unit_price_cents: item.unit_price_cents,
      discount_cents: item.discount_cents ?? 0,
      line_total_cents: calc.line_total_cents,
      vat_rate: item.vat_rate ?? 0,
      vat_applicable: item.vat_applicable ?? true,
      line_vat_cents: calc.line_vat_cents,
      sort_order: sortOrder,
    };
  }

  async create(dto: CreateInvoiceDto, workshopId: string, userId: string) {
    if (!dto.branch_id) {
      throw new BadRequestException('Branch is required to generate an invoice number.');
    }
    if (!dto.customer_id) {
      throw new BadRequestException('Customer is required to generate an invoice.');
    }
    if (!dto.vehicle_id) {
      throw new BadRequestException('Vehicle is required to generate an invoice.');
    }

    const { invoice_number, invoice_year, invoice_serial_number, workshop_code_snapshot, branch_code_snapshot } =
      await this.numberService.generateNextInvoiceNumber(workshopId, dto.branch_id);

    const [customer, vehicle, advisor] = await Promise.all([
      this.prisma.tenant.customers.findUnique({ where: { id: dto.customer_id } }),
      this.prisma.tenant.vehicles.findUnique({ where: { id: dto.vehicle_id } }),
      this.prisma.raw.users.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);

    if (!customer) {
      throw new BadRequestException('Customer not found.');
    }
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found.');
    }

    const lines = dto.items.map((item, i) => this.mapLineItemToPrisma(item, i + 1));
    const globalDiscount = dto.discount_total_cents ?? 0;
    const { totals } = this.calc.recalculate(
      dto.items.map((item) => this.mapLineItemDtoToCalc(item)),
      globalDiscount,
    );

    const invoice = await this.prisma.tenant.workshop_invoices.create({
      data: {
        invoice_number,
        invoice_year,
        invoice_serial_number,
        workshop_code_snapshot,
        branch_code_snapshot,
        invoice_date: new Date(),
        branch_id: dto.branch_id,
        job_id: dto.job_id,
        customer_id: dto.customer_id,
        vehicle_id: dto.vehicle_id,
        created_by_user_id: userId,
        notes: dto.notes,
        internal_notes: dto.internal_notes,
        status: InvoiceStatus.DRAFT,
        subtotal_cents: totals.subtotal_cents,
        discount_total_cents: totals.discount_total_cents,
        tax_total_cents: totals.tax_total_cents,
        grand_total_cents: totals.grand_total_cents,
        total_cents: totals.total_cents,
        snapshot_customer_name: customer.name ?? 'Customer',
        snapshot_customer_email: customer.email,
        snapshot_customer_phone: customer.phone,
        snapshot_vehicle_vin: (vehicle as any).vin,
        snapshot_vehicle_plate: (vehicle as any).plate,
        snapshot_vehicle_make: (vehicle as any).make,
        snapshot_vehicle_model: (vehicle as any).vehicle_model,
        snapshot_vehicle_year: (vehicle as any).year,
        snapshot_vehicle_color: (vehicle as any).color,
        snapshot_advisor_name: advisor?.name,
        items: {
          create: lines,
        },
      },
      include: { items: true },
    });

    return invoice;
  }

  async findOne(id: string, workshopId?: string | null) {
    const invoice = workshopId
      ? await this.prisma.raw.workshop_invoices.findFirst({
          where: { id, workshop_id: workshopId },
          include: { items: { orderBy: { sort_order: 'asc' } } },
        })
      : await this.prisma.tenant.workshop_invoices.findUnique({
          where: { id },
          include: { items: { orderBy: { sort_order: 'asc' } } },
        });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async findAll(dto: ListInvoicesDto) {
    const page = Math.max(1, dto.page ?? 1);
    const limit = Math.max(1, Math.min(100, dto.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status && dto.status !== InvoiceStatusFilter.ALL) {
      where.status = dto.status;
    }
    if (dto.customer_id) {
      where.customer_id = dto.customer_id;
    }
    if (dto.vehicle_id) {
      where.vehicle_id = dto.vehicle_id;
    }
    if (dto.branch_id) {
      where.branch_id = dto.branch_id;
    }
    if (dto.search) {
      where.invoice_number = { contains: dto.search };
    }

    const [invoices, total] = await Promise.all([
      this.prisma.tenant.workshop_invoices.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: { items: { orderBy: { sort_order: 'asc' } } },
      }),
      this.prisma.tenant.workshop_invoices.count({ where }),
    ]);

    return { data: invoices, total, page, limit };
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ForbiddenException('Only draft invoices can be edited.');
    }

    if (dto.branch_id && dto.branch_id !== invoice.branch_id) {
      throw new BadRequestException('Branch cannot be changed after invoice creation.');
    }

    const data: any = {};
    if (dto.customer_id !== undefined) data.customer_id = dto.customer_id;
    if (dto.vehicle_id !== undefined) data.vehicle_id = dto.vehicle_id;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.internal_notes !== undefined) data.internal_notes = dto.internal_notes;
    if (dto.discount_total_cents !== undefined) data.discount_total_cents = dto.discount_total_cents;

    if (dto.items && dto.items.length > 0) {
      const lines = dto.items.map((item, i) => this.mapLineItemToPrisma(item, i + 1));
      const globalDiscount = dto.discount_total_cents ?? invoice.discount_total_cents ?? 0;
      const { totals } = this.calc.recalculate(
        dto.items.map((item) => this.mapLineItemDtoToCalc(item)),
        globalDiscount,
      );

      data.subtotal_cents = totals.subtotal_cents;
      data.discount_total_cents = totals.discount_total_cents;
      data.tax_total_cents = totals.tax_total_cents;
      data.grand_total_cents = totals.grand_total_cents;
      data.total_cents = totals.total_cents;

      await this.prisma.tenant.workshop_invoice_items.deleteMany({ where: { invoice_id: id } });
      await this.prisma.tenant.workshop_invoice_items.createMany({
        data: lines.map((line: any) => ({ ...line, invoice_id: id })),
      });
    } else if (dto.discount_total_cents !== undefined) {
      // Recalculate totals with new global discount but same items
      const currentItems = await this.prisma.tenant.workshop_invoice_items.findMany({
        where: { invoice_id: id },
      });
      const calcItems = currentItems.map((item: any) => ({
        quantity: Number(item.quantity),
        unit_price_cents: Number(item.unit_price_cents),
        discount_cents: Number(item.discount_cents),
        vat_rate: Number(item.vat_rate),
        vat_applicable: item.vat_applicable,
      }));
      const { totals } = this.calc.recalculate(calcItems, dto.discount_total_cents);
      data.subtotal_cents = totals.subtotal_cents;
      data.discount_total_cents = totals.discount_total_cents;
      data.tax_total_cents = totals.tax_total_cents;
      data.grand_total_cents = totals.grand_total_cents;
      data.total_cents = totals.total_cents;
    }

    const updated = await this.prisma.tenant.workshop_invoices.update({
      where: { id },
      data,
      include: { items: { orderBy: { sort_order: 'asc' } } },
    });

    return updated;
  }

  async issue(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new ForbiddenException('Only draft invoices can be issued.');
    }

    // Fetch live customer and vehicle data for snapshot
    const [customer, vehicle, workshop, branch] = await Promise.all([
      invoice.customer_id
        ? this.prisma.tenant.customers.findUnique({ where: { id: invoice.customer_id } })
        : Promise.resolve(null),
      invoice.vehicle_id
        ? this.prisma.tenant.vehicles.findUnique({ where: { id: invoice.vehicle_id } })
        : Promise.resolve(null),
      this.prisma.raw.workshops.findUnique({ where: { id: invoice.workshop_id }, select: { code: true } }),
      invoice.branch_id
        ? this.prisma.raw.branches.findUnique({ where: { id: invoice.branch_id }, select: { code: true } })
        : Promise.resolve(null),
    ]);

    const updated = await this.prisma.tenant.workshop_invoices.update({
      where: { id },
      data: {
        status: InvoiceStatus.ISSUED,
        issued_at: new Date(),
        workshop_code_snapshot: workshop?.code?.toUpperCase() ?? invoice.workshop_code_snapshot,
        branch_code_snapshot: branch?.code?.toUpperCase() ?? invoice.branch_code_snapshot,
        snapshot_customer_name: customer?.name ?? null,
        snapshot_customer_email: customer?.email ?? null,
        snapshot_customer_phone: customer?.phone ?? null,
        snapshot_vehicle_vin: (vehicle as any)?.vin ?? null,
        snapshot_vehicle_plate: (vehicle as any)?.plate ?? null,
        snapshot_vehicle_make: (vehicle as any)?.make ?? null,
        snapshot_vehicle_model: (vehicle as any)?.vehicle_model ?? null,
        snapshot_vehicle_year: (vehicle as any)?.year ?? null,
        snapshot_vehicle_color: (vehicle as any)?.color ?? null,
      },
      include: { items: { orderBy: { sort_order: 'asc' } } },
    });

    return updated;
  }

  async cancel(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new ForbiddenException('Only issued invoices can be cancelled.');
    }

    const updated = await this.prisma.tenant.workshop_invoices.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelled_at: new Date(),
      },
      include: { items: { orderBy: { sort_order: 'asc' } } },
    });

    return updated;
  }

  async generateFromJob(jobId: string, workshopId: string, userId: string) {
    const job = await this.prisma.tenant.jobs.findUnique({
      where: { id: jobId },
      include: {
        customers: true,
        vehicles: true,
        estimate_lines: {
          where: {
            authorisation_decisions: {
              some: { decision: 'approved' },
            },
          },
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    let branchId = job.branch_id;
    if (!branchId) {
      const branches = await this.prisma.tenant.branches.findMany({
        where: { workshop_id: workshopId },
        select: { id: true },
        take: 2,
      });
      if (branches.length !== 1) {
        throw new BadRequestException('Job must have a branch assigned to generate an invoice.');
      }
      branchId = branches[0].id;
    }

    const items = job.estimate_lines.map((line: any, i: number) => {
      const lineType = line.type === 'labour' ? 'labour' : line.type === 'part' ? 'part' : 'other';
      const unitPriceCents = line.unit_price
        ? Math.round(parseFloat(String(line.unit_price)) * 100)
        : 0;
      const qty = Math.max(0, parseFloat(String(line.quantity ?? 1)));
      const discountPct = Math.max(0, parseFloat(String(line.discount_pct ?? 0)));
      const discountCents = Math.round(qty * unitPriceCents * (discountPct / 100));
      const vatRate = Math.max(0, parseFloat(String(line.tax_rate_pct ?? 0))) / 100;
      return {
        type: lineType as any,
        description: line.description || 'Work item',
        sku: line.part_number || undefined,
        quantity: qty,
        unit_price_cents: unitPriceCents,
        discount_cents: discountCents,
        vat_rate: vatRate,
        vat_applicable: true,
        sort_order: i + 1,
      } as CreateLineItemDto;
    });

    const createDto: CreateInvoiceDto = {
      branch_id: branchId,
      job_id: jobId,
      customer_id: job.customer_id ?? undefined,
      vehicle_id: job.vehicle_id ?? undefined,
      items,
    };

    return this.create(createDto, workshopId, userId);
  }
}
