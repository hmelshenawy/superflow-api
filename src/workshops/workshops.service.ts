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

  private async revokeWorkshopSessions(workshopId: string) {
    await this.prisma.raw.refresh_tokens.updateMany({
      where: { workshop_id: workshopId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
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
    const updated = await this.prisma.raw.workshops.update({
      where: { id },
      data: dto,
    });
    if (dto.is_active === false) {
      await this.revokeWorkshopSessions(id);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const updated = await this.prisma.raw.workshops.update({
      where: { id },
      data: { is_active: false },
    });
    await this.revokeWorkshopSessions(id);
    return updated;
  }

  async exportData(id: string) {
    const workshop = await this.findOne(id);
    const where = { workshop_id: id };

    const [
      assignedUsers,
      customers,
      vehicles,
      jobs,
      quoteGroups,
      estimateLines,
      inspections,
      inspectionResponses,
      deferredWork,
      mediaFiles,
      jobStatusHistory,
      labourRates,
      settings,
      bookingImportTemplates,
      notifications,
      auditLogs,
    ] = await Promise.all([
      this.prisma.raw.user_workshop_access.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role_id: true,
              employee_code: true,
              is_active: true,
              last_login_at: true,
              created_at: true,
              updated_at: true,
              roles: { select: { id: true, name: true, description: true } },
            },
          },
        },
      }),
      this.prisma.raw.customers.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.vehicles.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.jobs.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.quote_groups.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.estimate_lines.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.inspections.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.inspection_responses.findMany({ where, orderBy: { recorded_at: 'asc' } }),
      this.prisma.raw.deferred_work.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.media_files.findMany({
        where,
        orderBy: { uploaded_at: 'asc' },
        select: {
          id: true,
          job_id: true,
          inspection_response_id: true,
          uploaded_by: true,
          workshop_id: true,
          file_type: true,
          mime_type: true,
          original_filename: true,
          size_bytes: true,
          width_px: true,
          height_px: true,
          duration_sec: true,
          scan_status: true,
          is_deleted: true,
          uploaded_at: true,
        },
      }),
      this.prisma.raw.job_status_history.findMany({ where, orderBy: { changed_at: 'asc' } }),
      this.prisma.raw.labour_rates.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.settings.findMany({ where, orderBy: { updated_at: 'asc' } }),
      this.prisma.raw.booking_import_templates.findMany({ where, orderBy: { created_at: 'asc' } }),
      this.prisma.raw.notifications.findMany({ where, orderBy: { queued_at: 'asc' } }),
      this.prisma.raw.audit_logs.findMany({
        where,
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          user_id: true,
          entity_type: true,
          entity_id: true,
          action: true,
          ip_address: true,
          workshop_id: true,
          created_at: true,
        },
      }),
    ]);

    return {
      export_version: 1,
      generated_at: new Date().toISOString(),
      note: 'Media export contains metadata only. Binary media files are not included.',
      workshop,
      assigned_users: assignedUsers,
      customers,
      vehicles,
      jobs,
      quote_groups: quoteGroups,
      estimate_lines: estimateLines,
      inspections,
      inspection_responses: inspectionResponses,
      deferred_work: deferredWork,
      media_files: mediaFiles,
      job_status_history: jobStatusHistory,
      labour_rates: labourRates,
      settings,
      booking_import_templates: bookingImportTemplates,
      notifications,
      audit_logs: auditLogs,
    };
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
    const workshop = await this.findOne(workshopId);
    if (!workshop.is_active) throw new BadRequestException('Cannot assign users to an inactive workshop');
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
