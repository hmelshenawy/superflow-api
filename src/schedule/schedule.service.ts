import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '@prisma/prisma.service';
import { getWorkshopContext } from '@prisma/workshop-context';
import { CreateBreakDto } from './dto/create-break.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpsertScheduleDayDto } from './dto/upsert-schedule-day.dto';

@Injectable()
export class WorkshopScheduleService {
  constructor(private prisma: PrismaService) {}

  private timeToDate(value: string) {
    const [h, m] = value.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, h, m, 0));
  }

  private timeToMinutes(value: any) {
    if (typeof value === 'string') {
      const [h, m] = value.slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    }
    const date = new Date(value);
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  private minutesToTime(minutes: number) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  private dateOnly(value: string | Date) {
    const date = typeof value === 'string' ? value : value.toISOString().slice(0, 10);
    return new Date(`${date}T00:00:00.000Z`);
  }

  async findAll() {
    const today = new Date();
    const until = new Date(today);
    until.setMonth(until.getMonth() + 3);
    const days = await (this.prisma.tenant as any).schedule_config.findMany({ orderBy: { day_of_week: 'asc' } });
    const breaks = await (this.prisma.tenant as any).schedule_breaks.findMany({ orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }] });
    const holidays = await (this.prisma.tenant as any).holidays.findMany({
      where: { date: { gte: this.dateOnly(today), lte: this.dateOnly(until) } },
      orderBy: { date: 'asc' },
    });
    const byDay = new Map(days.map((day: any) => [day.day_of_week, day]));
    return {
      days: Array.from({ length: 7 }, (_, day) => byDay.get(day) || { day_of_week: day, is_open: true, open_time: '08:00', close_time: '17:00', slot_duration_min: 30 }),
      breaks,
      holidays,
    };
  }

  async upsertDay(dayOfWeek: number, dto: UpsertScheduleDayDto) {
    if (dayOfWeek < 0 || dayOfWeek > 6) throw new BadRequestException('dayOfWeek must be 0-6');
    const { workshopId } = getWorkshopContext();
    return (this.prisma.tenant as any).schedule_config.upsert({
      where: { workshop_id_day_of_week: { workshop_id: workshopId, day_of_week: dayOfWeek } },
      create: {
        id: uuid(),
        workshop_id: workshopId,
        day_of_week: dayOfWeek,
        is_open: dto.is_open ?? true,
        open_time: this.timeToDate(dto.open_time),
        close_time: this.timeToDate(dto.close_time),
        slot_duration_min: dto.slot_duration_min ?? 30,
      },
      update: {
        is_open: dto.is_open ?? true,
        open_time: this.timeToDate(dto.open_time),
        close_time: this.timeToDate(dto.close_time),
        slot_duration_min: dto.slot_duration_min ?? 30,
      },
    });
  }

  createBreak(dto: CreateBreakDto) {
    return (this.prisma.tenant as any).schedule_breaks.create({
      data: { id: uuid(), day_of_week: dto.day_of_week, start_time: this.timeToDate(dto.start_time), end_time: this.timeToDate(dto.end_time), label: dto.label },
    });
  }

  async deleteBreak(id: string) {
    const existing = await (this.prisma.tenant as any).schedule_breaks.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Schedule break not found');
    return (this.prisma.tenant as any).schedule_breaks.delete({ where: { id } });
  }

  createHoliday(dto: CreateHolidayDto) {
    return (this.prisma.tenant as any).holidays.create({
      data: { id: uuid(), date: this.dateOnly(dto.date), label: dto.label, is_full_day: dto.is_full_day ?? true },
    });
  }

  async deleteHoliday(id: string) {
    const existing = await (this.prisma.tenant as any).holidays.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Holiday not found');
    return (this.prisma.tenant as any).holidays.delete({ where: { id } });
  }

  async slots(date: string, staffId?: string) {
    if (!date) throw new BadRequestException('date query parameter is required');
    const target = this.dateOnly(date);
    const dayOfWeek = target.getUTCDay();
    const config = await (this.prisma.tenant as any).schedule_config.findFirst({ where: { day_of_week: dayOfWeek } });
    const dayConfig = config || { is_open: true, open_time: '08:00', close_time: '17:00', slot_duration_min: 30 };
    const open = this.timeToMinutes(dayConfig.open_time);
    const close = this.timeToMinutes(dayConfig.close_time);
    const step = dayConfig.slot_duration_min || 30;
    const slots: Array<{ time: string; is_available: boolean; blocked_reason?: string }> = [];
    for (let minute = open; minute < close; minute += step) slots.push({ time: this.minutesToTime(minute), is_available: true });

    const blockAll = (reason: string) => slots.map((slot) => ({ ...slot, is_available: false, blocked_reason: reason }));
    if (!dayConfig.is_open) return blockAll('Workshop closed');

    const holiday = await (this.prisma.tenant as any).holidays.findFirst({ where: { date: target, is_full_day: true } });
    if (holiday) return blockAll(holiday.label || 'Holiday');

    const breaks = await (this.prisma.tenant as any).schedule_breaks.findMany({ where: { day_of_week: dayOfWeek } });
    for (const slot of slots) {
      const minute = this.timeToMinutes(slot.time);
      const brk = breaks.find((item: any) => minute >= this.timeToMinutes(item.start_time) && minute < this.timeToMinutes(item.end_time));
      if (brk) Object.assign(slot, { is_available: false, blocked_reason: brk.label || 'Break' });
    }

    if (staffId) {
      const staff = await (this.prisma.tenant as any).staff_members.findUnique({ where: { id: staffId } });
      if (!staff) throw new NotFoundException('Staff member not found');
      const workingDays = Array.isArray(staff.working_days) ? staff.working_days : JSON.parse(String(staff.working_days || '[]'));
      if (!workingDays.includes(dayOfWeek)) return blockAll('Staff not working');
      const leave = await (this.prisma.tenant as any).staff_leaves.findFirst({ where: { staff_id: staffId, start_date: { lte: target }, end_date: { gte: target } } });
      if (leave) return blockAll('Staff on leave');
      const next = new Date(target); next.setUTCDate(next.getUTCDate() + 1);
      const appointments = await (this.prisma.tenant as any).appointments.findMany({
        where: { staff_id: staffId, status: { notIn: ['cancelled', 'done'] }, start_time: { lt: next }, end_time: { gt: target } },
      });
      for (const slot of slots) {
        if (!slot.is_available) continue;
        const [h, m] = slot.time.split(':').map(Number);
        const slotStart = new Date(target); slotStart.setUTCHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + step * 60000);
        const count = appointments.filter((appt: any) => appt.start_time < slotEnd && appt.end_time > slotStart).length;
        if (count >= staff.max_concurrent_jobs) Object.assign(slot, { is_available: false, blocked_reason: 'Booked' });
      }
    }

    return slots;
  }
}
