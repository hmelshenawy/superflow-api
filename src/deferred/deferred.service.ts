import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDeferredDto } from './dto/update-deferred.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class DeferredService {
  constructor(private prisma: PrismaService) {}

  async findAll(pagination: PaginationDto, status?: string) {
    const skip = (pagination.page - 1) * pagination.limit;
    const where = status ? { status: status as any } : {};
    const [items, total] = await Promise.all([
      this.prisma.deferred_work.findMany({
        skip,
        take: pagination.limit,
        where,
        include: {
          customers: { select: { id: true, name: true, phone: true, email: true } },
          vehicles: { select: { id: true, make: true, model: true, plate: true, year: true } },
          estimate_lines: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.deferred_work.count({ where }),
    ]);
    const data = items.map((item: (typeof items)[number]) => ({
      ...item,
      customer: item.customers,
      vehicle: item.vehicles,
    }));
    return { items: data, data, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const item = await this.prisma.deferred_work.findUnique({
      where: { id },
      include: {
        customers: true,
        vehicles: true,
        jobs_deferred_work_original_job_idTojobs: true,
        jobs_deferred_work_booked_job_idTojobs: true,
        estimate_lines: true,
        deferred_work_reminders: { orderBy: { sent_at: 'desc' } },
      },
    });
    if (!item) throw new NotFoundException('Deferred work not found');
    return item;
  }

  async update(id: string, dto: UpdateDeferredDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.remind_after) data.remind_after = new Date(dto.remind_after);
    return this.prisma.deferred_work.update({ where: { id }, data });
  }

  async remindNow(id: string) {
    const item = await this.findOne(id);
    if (!item.customers) throw new BadRequestException('Deferred item has no customer');

    const customer = item.customers;
    const recipient = customer.phone || customer.email || 'customer';

    const reminder = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = await tx.deferred_work_reminders.create({
        data: {
          id: uuid(),
          deferred_work_id: id,
          channel: customer.phone ? 'whatsapp' : 'email',
          sent_to: recipient,
          delivery_status: 'sent',
        },
      });

      await tx.deferred_work.update({
        where: { id },
        data: {
          status: item.status === 'pending' ? 'reminded' : item.status,
          remind_count: (item.remind_count || 0) + 1,
          last_reminded_at: new Date(),
        },
      });

      await tx.notifications.create({
        data: {
          id: uuid(),
          customer_id: item.customer_id,
          job_id: item.original_job_id,
          channel: customer.phone ? 'whatsapp' : 'email',
          recipient,
          subject: 'Deferred work reminder',
          body_rendered: `Reminder: ${item.estimate_lines?.description || 'recommended work'} is still pending for your vehicle.`,
          status: 'queued',
          provider: 'internal',
        },
      }).catch(() => {});

      return row;
    });

    return reminder;
  }

  async book(id: string, advisorId?: string) {
    const item = await this.findOne(id);
    if (!item.customer_id || !item.vehicle_id) throw new BadRequestException('Deferred item missing customer or vehicle');
    if (item.booked_job_id) throw new BadRequestException('Deferred item already booked');

    const jobNumber = `SF-${Date.now().toString(36).toUpperCase()}`;
    const description = item.estimate_lines?.description || 'Deferred work booking';

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newJob = await tx.jobs.create({
        data: {
          id: uuid(),
          job_number: jobNumber,
          customer_id: item.customer_id,
          vehicle_id: item.vehicle_id,
          advisor_id: advisorId || item.jobs_deferred_work_original_job_idTojobs?.advisor_id || null,
          status: 'booked',
          customer_concern: `Booked from deferred work: ${description}`,
        },
      });

      if (item.estimate_lines) {
        await tx.estimate_lines.create({
          data: {
            id: uuid(),
            job_id: newJob.id,
            type: item.estimate_lines.type,
            description: item.estimate_lines.description,
            part_number: item.estimate_lines.part_number,
            quantity: item.estimate_lines.quantity,
            unit_price: item.estimate_lines.unit_price,
            discount_pct: item.estimate_lines.discount_pct,
            tax_rate_pct: item.estimate_lines.tax_rate_pct,
            line_total: item.estimate_lines.line_total,
            tax_amount: item.estimate_lines.tax_amount,
            is_recommended: false,
            added_by: advisorId || item.jobs_deferred_work_original_job_idTojobs?.advisor_id || null,
          },
        });
      }

      const updated = await tx.deferred_work.update({
        where: { id },
        data: {
          status: 'booked',
          booked_job_id: newJob.id,
        },
      });

      return { deferred: updated, job: newJob };
    });

    return result;
  }

  async getDueReminders() {
    return this.prisma.deferred_work.findMany({
      where: { status: 'pending', remind_after: { lte: new Date() } },
      include: { customers: true, vehicles: true },
    });
  }
}
