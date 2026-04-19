import { Injectable, NotFoundException } from '@nestjs/common';
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
        skip, take: pagination.limit, where,
        include: { customers: { select: { name: true, phone: true } }, vehicles: { select: { make: true, model: true, plate: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.deferred_work.count({ where }),
    ]);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string) {
    const item = await this.prisma.deferred_work.findUnique({
      where: { id },
      include: { customers: true, vehicles: true, jobs_deferred_work_original_job_idTojobs: true, estimate_lines: true, deferred_work_reminders: true },
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

  async getDueReminders() {
    return this.prisma.deferred_work.findMany({
      where: { status: 'pending', remind_after: { lte: new Date() } },
      include: { customers: true, vehicles: true },
    });
  }
}