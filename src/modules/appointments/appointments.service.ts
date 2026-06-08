import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '@prisma/prisma.service';
import { getWorkshopContext } from '@prisma/workshop-context';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const DEFAULT_APPOINTMENT_DURATION_MIN = 30;

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  private async getWorkshopTimezone() {
    const workshopId = getWorkshopContext().workshopId;
    if (!workshopId) return 'Asia/Dubai';
    const workshop = await this.prisma.workshops.findUnique({ where: { id: workshopId }, select: { timezone: true } });
    return workshop?.timezone || 'Asia/Dubai';
  }

  private partsInTimezone(date: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(date);
    const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
    return { year: pick('year'), month: pick('month'), day: pick('day'), hour: pick('hour'), minute: pick('minute'), second: pick('second') };
  }

  private zonedDateTime(date: string, time: string, timezone: string) {
    const [year, month, day] = date.slice(0, 10).split('-').map(Number);
    const [hour, minute] = time.slice(0, 5).split(':').map(Number);
    // Build a UTC timestamp for the local date/time, then subtract the timezone offset
    // to get the correct UTC instant. Offset is positive for east of UTC (e.g. +4h for Dubai).
    const localMs = Date.UTC(year, month - 1, day, hour, minute, 0);
    // Get the offset at that approximate instant by formatting a nearby UTC date in the target tz
    const utcDate = new Date(localMs);
    const parts = this.partsInTimezone(utcDate, timezone);
    const offsetMs = (parts.hour * 60 + parts.minute - (utcDate.getUTCHours() * 60 + utcDate.getUTCMinutes())) * 60000
      - (utcDate.getUTCSeconds() - parts.second) * 1000
      + (parts.day - utcDate.getUTCDate()) * 86400000;
    return new Date(localMs - offsetMs);
  }

  private parseAppointmentStart(value: string, timezone: string) {
    if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) return new Date(value);
    const [date, rawTime = '00:00'] = value.split('T');
    return this.zonedDateTime(date, rawTime, timezone);
  }

  private dateOnly(value: string | Date, timezone = 'Asia/Dubai') {
    const iso = typeof value === 'string'
      ? value.slice(0, 10)
      : `${this.partsInTimezone(value, timezone).year}-${String(this.partsInTimezone(value, timezone).month).padStart(2, '0')}-${String(this.partsInTimezone(value, timezone).day).padStart(2, '0')}`;
    return this.zonedDateTime(iso, '00:00', timezone);
  }

  private nextDay(date: Date) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + 1); return next; }

  private nextLocalDay(dateString: string, timezone: string) {
    const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
    const p = this.partsInTimezone(next, 'UTC');
    return this.zonedDateTime(`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, '00:00', timezone);
  }

  private localDay(date: Date, timezone: string) {
    const p = this.partsInTimezone(date, timezone);
    return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  }

  private localMinutes(date: Date, timezone: string) { const p = this.partsInTimezone(date, timezone); return p.hour * 60 + p.minute; }

  private timeToMinutes(value: any) {
    if (typeof value === 'string') {
      const [h, m] = value.slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    }
    const date = new Date(value);
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  async findAll(query: QueryAppointmentsDto) {
    let start: Date;
    let end: Date;
    const timezone = await this.getWorkshopTimezone();
    if (query.start && query.end) {
      start = this.dateOnly(query.start, timezone);
      end = this.nextLocalDay(query.end, timezone);
      if ((end.getTime() - start.getTime()) / 86400000 > 15) throw new BadRequestException('Date range cannot exceed 14 days');
    } else {
      const date = typeof query.date === 'string' ? query.date : `${this.partsInTimezone(new Date(), timezone).year}-${String(this.partsInTimezone(new Date(), timezone).month).padStart(2, '0')}-${String(this.partsInTimezone(new Date(), timezone).day).padStart(2, '0')}`;
      start = this.dateOnly(date, timezone);
      end = this.nextLocalDay(date, timezone);
    }
    return (this.prisma.tenant as any).appointments.findMany({
      where: { start_time: { gte: start, lt: end } },
      include: { staff_members: true, job_types: true, customers: true },
      orderBy: { start_time: 'asc' },
    });
  }

  private async validateStaff(staffId: string, start: Date, timezone: string) {
    const staff = await (this.prisma.tenant as any).staff_members.findFirst({ where: { id: staffId, is_active: true } });
    if (!staff) throw new NotFoundException('Staff member not found');
    const day = this.localDay(start, timezone);
    const workingDays = Array.isArray(staff.working_days) ? staff.working_days : JSON.parse(String(staff.working_days || '[]'));
    if (!workingDays.includes(day)) throw new BadRequestException('Staff member is not working on this day');
    const date = this.dateOnly(start, timezone);
    const leave = await (this.prisma.tenant as any).staff_leaves.findFirst({ where: { staff_id: staffId, start_date: { lte: date }, end_date: { gte: date } } });
    if (leave) throw new BadRequestException('Staff member is on leave');
    return staff;
  }

  private async validateOpenSlot(start: Date, durationMin: number, timezone: string) {
    const date = this.dateOnly(start, timezone);
    const day = this.localDay(start, timezone);
    const config = await (this.prisma.tenant as any).schedule_config.findFirst({ where: { day_of_week: day } });
    const open = config ? this.timeToMinutes(config.open_time) : 8 * 60;
    const close = config ? this.timeToMinutes(config.close_time) : 17 * 60;
    if (config && !config.is_open) throw new BadRequestException('Workshop is closed on this day');
    const holiday = await (this.prisma.tenant as any).holidays.findFirst({ where: { date, is_full_day: true } });
    if (holiday) throw new BadRequestException(holiday.label || 'Workshop holiday');
    const startMinute = this.localMinutes(start, timezone);
    const endMinute = startMinute + durationMin;
    if (startMinute < open || endMinute > close) throw new BadRequestException('Appointment must be within workshop opening hours');
    const breaks = await (this.prisma.tenant as any).schedule_breaks.findMany({ where: { day_of_week: day } });
    const overlapsBreak = breaks.some((item: any) => startMinute < this.timeToMinutes(item.end_time) && endMinute > this.timeToMinutes(item.start_time));
    if (overlapsBreak) throw new BadRequestException('Appointment overlaps a schedule break');
  }

  private async getDefaultDurationForStart(start: Date, timezone: string) {
    const day = this.localDay(start, timezone);
    const config = await (this.prisma.tenant as any).schedule_config.findFirst({ where: { day_of_week: day } });
    return config?.slot_duration_min || DEFAULT_APPOINTMENT_DURATION_MIN;
  }

  private async checkConflict(staff: any, start: Date, end: Date, excludeId?: string) {
    const where: any = {
      staff_id: staff.id,
      status: { notIn: ['cancelled', 'done'] },
      start_time: { lt: end },
      end_time: { gt: start },
    };
    if (excludeId) where.id = { not: excludeId };
    const count = await (this.prisma.tenant as any).appointments.count({ where });
    if (count >= staff.max_concurrent_jobs) {
      throw new ConflictException(`This time slot is already fully booked for ${staff.name}`);
    }
  }

  private async resolveJobType(jobTypeId?: string | null) {
    if (!jobTypeId) return null;
    const jobType = await (this.prisma.tenant as any).job_types.findFirst({ where: { id: jobTypeId, is_active: true } });
    if (!jobType) throw new NotFoundException('Job type not found');
    return jobType;
  }

  async create(dto: CreateAppointmentDto, userId?: string) {
    const jobType = await this.resolveJobType(dto.job_type_id);
    const timezone = await this.getWorkshopTimezone();
    const start = this.parseAppointmentStart(dto.start_time, timezone);
    const duration = dto.duration_min ?? jobType?.duration_min ?? await this.getDefaultDurationForStart(start, timezone);
    const end = new Date(start.getTime() + duration * 60000);
    await this.validateOpenSlot(start, duration, timezone);
    const staff = await this.validateStaff(dto.staff_id, start, timezone);
    await this.checkConflict(staff, start, end);
    return (this.prisma.tenant as any).appointments.create({
      data: {
        id: uuid(),
        staff_id: dto.staff_id,
        job_type_id: dto.job_type_id,
        customer_id: dto.customer_id,
        work_order_id: dto.work_order_id,
        title: dto.title || jobType?.name || 'Appointment',
        start_time: start,
        end_time: end,
        duration_min: duration,
        notes: dto.notes,
        created_by: userId,
      },
      include: { staff_members: true, job_types: true, customers: true },
    });
  }

  async findOne(id: string) {
    const appointment = await (this.prisma.tenant as any).appointments.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async updateStatus(id: string, dto: UpdateAppointmentStatusDto) {
    await this.findOne(id);
    return (this.prisma.tenant as any).appointments.update({ where: { id }, data: { status: dto.status } });
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const timezone = await this.getWorkshopTimezone();
    const current = await this.findOne(id);
    const jobType = await this.resolveJobType(dto.job_type_id ?? current.job_type_id);
    const staffId = dto.staff_id ?? current.staff_id;
    const start = dto.start_time ? this.parseAppointmentStart(dto.start_time, timezone) : current.start_time;
    const duration = dto.duration_min ?? current.duration_min ?? jobType?.duration_min ?? DEFAULT_APPOINTMENT_DURATION_MIN;
    const end = new Date(start.getTime() + duration * 60000);
    if (dto.staff_id || dto.start_time || dto.duration_min) {
      await this.validateOpenSlot(start, duration, timezone);
      const staff = await this.validateStaff(staffId, start, timezone);
      await this.checkConflict(staff, start, end, id);
    }
    return (this.prisma.tenant as any).appointments.update({
      where: { id },
      data: {
        title: dto.title,
        staff_id: dto.staff_id,
        start_time: dto.start_time ? start : undefined,
        end_time: dto.start_time || dto.duration_min ? end : undefined,
        duration_min: dto.duration_min,
        notes: dto.notes,
        job_type_id: dto.job_type_id,
        customer_id: dto.customer_id,
        work_order_id: dto.work_order_id,
      },
      include: { staff_members: true, job_types: true, customers: true },
    });
  }

  async remove(id: string) {
    const appointment = await this.findOne(id);
    if (!['scheduled', 'cancelled'].includes(appointment.status)) {
      throw new BadRequestException('Only scheduled or cancelled appointments can be deleted');
    }
    return (this.prisma.tenant as any).appointments.delete({ where: { id } });
  }
}
