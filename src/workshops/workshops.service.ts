import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkshopDto) {
    const existing = await this.prisma.raw.workshops.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Workshop slug already exists');

    return this.prisma.raw.workshops.create({
      data: {
        id: uuid(),
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone,
      },
    });
  }

  async findAll() {
    return this.prisma.raw.workshops.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { user_workshop_access: true } } },
    });
  }

  async findAllForUser(userId: string) {
    const accesses = await this.prisma.raw.user_workshop_access.findMany({
      where: { user_id: userId },
      select: { workshop_id: true },
    });
    const workshopIds = accesses.map((a: any) => a.workshop_id);
    return this.prisma.raw.workshops.findMany({
      where: { id: { in: workshopIds } },
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { user_workshop_access: true } } },
    });
  }

  async verifyUserAccess(workshopId: string, userId: string) {
    const access = await this.prisma.raw.user_workshop_access.findUnique({
      where: { user_id_workshop_id: { user_id: userId, workshop_id: workshopId } },
    });
    if (!access) {
      throw new ForbiddenException('You do not have access to this workshop');
    }
  }

  async findOne(id: string) {
    const workshop = await this.prisma.raw.workshops.findUnique({
      where: { id },
      include: { _count: { select: { user_workshop_access: true } } },
    });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return workshop;
  }

  async update(id: string, dto: UpdateWorkshopDto) {
    await this.findOne(id);
    return this.prisma.raw.workshops.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.raw.workshops.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getWorkshopUsers(workshopId: string) {
    await this.findOne(workshopId);
    const accesses = await this.prisma.raw.user_workshop_access.findMany({
      where: { workshop_id: workshopId },
      include: {
        users: { select: { id: true, name: true, email: true, is_active: true, roles: { select: { name: true } } } },
      },
    });
    return accesses.map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      assignedAt: a.assigned_at,
      user: a.users,
    }));
  }

  async assignUser(workshopId: string, userId: string) {
    await this.findOne(workshopId);
    const user = await this.prisma.raw.users.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.raw.user_workshop_access.findUnique({
      where: { user_id_workshop_id: { user_id: userId, workshop_id: workshopId } },
    });
    if (existing) throw new BadRequestException('User already assigned to this workshop');

    return this.prisma.raw.user_workshop_access.create({
      data: {
        id: uuid(),
        user_id: userId,
        workshop_id: workshopId,
        assigned_at: new Date(),
      },
    });
  }

  async removeUser(workshopId: string, userId: string) {
    await this.findOne(workshopId);
    const access = await this.prisma.raw.user_workshop_access.findUnique({
      where: { user_id_workshop_id: { user_id: userId, workshop_id: workshopId } },
    });
    if (!access) throw new NotFoundException('User is not assigned to this workshop');

    await this.prisma.raw.user_workshop_access.delete({
      where: { id: access.id },
    });
    return { success: true };
  }
}
