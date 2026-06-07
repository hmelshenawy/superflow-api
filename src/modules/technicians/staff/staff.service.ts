import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { getWorkshopContext } from '../../../prisma/workshop-context';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  private dateOnly(value: string) { return new Date(`${value}T00:00:00.000Z`); }

  private async getWorkshopUser(userId: string) {
    const { workshopId } = getWorkshopContext();
    if (!workshopId) throw new BadRequestException('Workshop context is required');
    const access = await (this.prisma.raw as any).user_workshop_access.findFirst({
      where: { workshop_id: workshopId, user_id: userId },
      include: { users: { select: { id: true, name: true, email: true, is_active: true } } },
    });
    if (!access?.users || access.users.is_active === false) throw new NotFoundException('Selected advisor/staff user not found in this workshop');
    return access.users;
  }

  async findAll(isActive?: string) {
    const where: any = {};
    if (isActive !== undefined) where.is_active = isActive !== 'false';
    return (this.prisma.tenant as any).staff_members.findMany({
      where,
      include: { users: { select: { id: true, name: true, email: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateStaffDto) {
    let name = dto.name?.trim();
    if (dto.user_id) {
      const user = await this.getWorkshopUser(dto.user_id);
      name = user.name || user.email || name;
    }
    if (!name) throw new BadRequestException('Select an advisor/staff user or provide a name');
    return (this.prisma.tenant as any).staff_members.create({
      data: { id: uuid(), user_id: dto.user_id, name, role: dto.role, working_days: dto.working_days, max_concurrent_jobs: dto.max_concurrent_jobs ?? 1 },
      include: { users: { select: { id: true, name: true, email: true } } },
    });
  }

  async findOne(id: string) {
    const staff = await (this.prisma.tenant as any).staff_members.findUnique({
      where: { id },
      include: { users: { select: { id: true, name: true, email: true } } },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    return staff;
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.user_id) {
      const user = await this.getWorkshopUser(dto.user_id);
      data.name = dto.name?.trim() || user.name || user.email;
    }
    return (this.prisma.tenant as any).staff_members.update({ where: { id }, data, include: { users: { select: { id: true, name: true, email: true } } } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return (this.prisma.tenant as any).staff_members.update({ where: { id }, data: { is_active: false } });
  }

  async leaves(id: string) {
    await this.findOne(id);
    return (this.prisma.tenant as any).staff_leaves.findMany({ where: { staff_id: id }, orderBy: { start_date: 'desc' } });
  }

  async createLeave(id: string, dto: CreateLeaveDto) {
    await this.findOne(id);
    const start = this.dateOnly(dto.start_date);
    const end = this.dateOnly(dto.end_date);
    if (end < start) throw new BadRequestException('end_date must be on or after start_date');
    return (this.prisma.tenant as any).staff_leaves.create({ data: { id: uuid(), staff_id: id, start_date: start, end_date: end, reason: dto.reason } });
  }

  async deleteLeave(id: string, leaveId: string) {
    await this.findOne(id);
    const leave = await (this.prisma.tenant as any).staff_leaves.findFirst({ where: { id: leaveId, staff_id: id } });
    if (!leave) throw new NotFoundException('Staff leave not found');
    return (this.prisma.tenant as any).staff_leaves.delete({ where: { id: leaveId } });
  }
}
