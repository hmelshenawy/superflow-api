import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { PRODUCT_MODE_DISPLAY_NAMES, defaultEnabledModules, normalizeProductMode } from '../common/product-modes';

const DEFAULT_QC_TEMPLATE = [
  { name: 'Work Completion', icon: '✅', items: [
    { label: 'All work per estimate completed', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: true },
    { label: 'No loose fasteners or missing clips', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
    { label: 'Fluid levels checked and topped up', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: false },
    { label: 'No fluid leaks visible', input_type: 'pass_fail', requires_photo: true, requires_note_on_fail: true },
  ]},
  { name: 'Workmanship Quality', icon: '🔧', items: [
    { label: 'Paint/panel fit and finish', input_type: 'pass_fail', requires_photo: true, requires_note_on_fail: true },
    { label: 'No scratches or marks on work area', input_type: 'pass_fail', requires_photo: true, requires_note_on_fail: false },
    { label: 'All parts properly torqued', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: true },
    { label: 'Wiring and hoses properly routed', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
  ]},
  { name: 'Safety Verification', icon: '⚠️', items: [
    { label: 'Brake system verified', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
    { label: 'Steering system checked', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
    { label: 'No warning lights on dashboard', input_type: 'yes_no', requires_photo: true, requires_note_on_fail: true },
    { label: 'Tyre condition and pressures confirmed', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: false },
    { label: 'Seatbelt and airbag systems OK', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: true },
  ]},
  { name: 'Customer-Facing Readiness', icon: '🚗', items: [
    { label: 'Vehicle cleaned and presentable', input_type: 'yes_no', requires_photo: true, requires_note_on_fail: false },
    { label: 'Interior left tidy', input_type: 'pass_fail', requires_photo: false, requires_note_on_fail: false },
    { label: 'Odometer reading recorded', input_type: 'text', requires_photo: false, requires_note_on_fail: false },
    { label: 'Final test drive completed', input_type: 'yes_no', requires_photo: false, requires_note_on_fail: true },
  ]},
];

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  private generateWorkshopCode(slug: string): string {
    const code = slug
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 20);
    return code || 'WS' + Math.floor(Math.random() * 10000);
  }

  private productConfigData(dto: Partial<CreateWorkshopDto & UpdateWorkshopDto>) {
    const productMode = normalizeProductMode(dto.productMode);
    const modules = dto.enabledModules ?? defaultEnabledModules(productMode);
    return {
      product_mode: productMode,
      dms_integration_enabled: dto.dmsIntegrationEnabled ?? productMode === 'CONNECT',
      enabled_modules: JSON.stringify(modules),
      package_name: dto.packageName || PRODUCT_MODE_DISPLAY_NAMES[productMode],
      display_name: dto.displayName,
    };
  }

  private updateProductConfigData(dto: UpdateWorkshopDto) {
    const data: any = {};
    if (dto.productMode !== undefined) {
      const productMode = normalizeProductMode(dto.productMode);
      data.product_mode = productMode;
      data.package_name = dto.packageName || PRODUCT_MODE_DISPLAY_NAMES[productMode];
      if (dto.enabledModules === undefined) {
        data.enabled_modules = JSON.stringify(defaultEnabledModules(productMode));
      }
      if (dto.dmsIntegrationEnabled === undefined) {
        data.dms_integration_enabled = productMode === 'CONNECT';
      }
    }
    if (dto.dmsIntegrationEnabled !== undefined) data.dms_integration_enabled = dto.dmsIntegrationEnabled;
    if (dto.enabledModules !== undefined) data.enabled_modules = JSON.stringify(dto.enabledModules);
    if (dto.packageName !== undefined) data.package_name = dto.packageName;
    if (dto.displayName !== undefined) data.display_name = dto.displayName;
    return data;
  }

  async create(dto: CreateWorkshopDto) {
    const existing = await this.prisma.raw.workshops.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException('Workshop slug already exists');

    const workshop = await this.prisma.raw.workshops.create({
      data: {
        id: uuid(),
        name: dto.name,
        slug: dto.slug,
        code: dto.code || this.generateWorkshopCode(dto.slug),
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone,
        ...this.productConfigData(dto),
      },
    });

    // Seed default QC checklist template for the new workshop
    this.seedDefaultQcTemplate(workshop.id).catch(() => {});

    return workshop;
  }

  private async seedDefaultQcTemplate(workshopId: string) {
    const template = await (this.prisma.raw as any).qc_checklist_templates.create({
      data: {
        id: uuid(),
        name: 'Final Quality Control',
        description: 'Standard quality control checklist for completed work',
        is_default: true,
        is_active: true,
        workshop_id: workshopId,
      },
    });

    for (let si = 0; si < DEFAULT_QC_TEMPLATE.length; si++) {
      const sec = DEFAULT_QC_TEMPLATE[si];
      const section = await (this.prisma.raw as any).qc_checklist_sections.create({
        data: {
          id: uuid(),
          template_id: template.id,
          name: sec.name,
          icon: sec.icon,
          sort_order: si + 1,
          is_active: true,
          workshop_id: workshopId,
        },
      });
      for (let ii = 0; ii < sec.items.length; ii++) {
        const item = sec.items[ii];
        await (this.prisma.raw as any).qc_checklist_items.create({
          data: {
            id: uuid(),
            section_id: section.id,
            label: item.label,
            input_type: item.input_type,
            requires_photo: item.requires_photo,
            requires_note_on_fail: item.requires_note_on_fail,
            sort_order: ii + 1,
            is_active: true,
            workshop_id: workshopId,
          },
        });
      }
    }
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
    const { productMode, dmsIntegrationEnabled, enabledModules, packageName, displayName, code, ...workshopDto } = dto;
    const data: any = { ...workshopDto, ...this.updateProductConfigData(dto) };
    if (code !== undefined) data.code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    const updated = await this.prisma.raw.workshops.update({
      where: { id },
      data,
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
