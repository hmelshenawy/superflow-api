import { Body, Controller, Get, Post, Put, Patch, Delete, UseGuards, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { RolesService } from './roles.service';
import { LabourRatesService } from './labour-rates.service';
import { TemplatesAdminService } from './templates.admin.service';
import { QcTemplatesAdminService } from './qc-templates.admin.service';
import { WorkflowService } from './workflow.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateAdminTemplateDto } from './dto/create-template.dto';
import { UpdateAdminTemplateDto } from './dto/update-template.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { CreateLabourRateDto, UpdateLabourRateDto } from './dto/labour-rate.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import {
  RequirePermission,
  ALL_PERMISSIONS, DEFAULT_ROLES,
  ADMIN_SETTINGS, ADMIN_SETTINGS_EDIT, ADMIN_ROLES,
  ADMIN_INTEGRATIONS, ADMIN_TEMPLATES, ADMIN_LABOUR_RATES, ADMIN_STATS,
} from '../../../common/permissions';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private settings: SettingsService,
    private roles: RolesService,
    private labourRates: LabourRatesService,
    private templates: TemplatesAdminService,
    private qcTemplates: QcTemplatesAdminService,
    private workflow: WorkflowService,
  ) {}

  // ─── Settings ──────────────────────────────────────────
  @Get('settings')
  @RequirePermission(ADMIN_SETTINGS)
  @ApiOperation({ summary: 'All settings' })
  getSettings() { return this.settings.getSettings(); }

  @Put('settings')
  @RequirePermission(ADMIN_SETTINGS_EDIT)
  @ApiOperation({ summary: 'Bulk update settings' })
  updateSettings(@Body() body: UpdateSettingsDto, @CurrentUser('sub') userId: string) {
    return this.settings.updateSettings(body, userId);
  }

  // ─── Workflow Stages ───────────────────────────────────
  @Get('workflow')
  @RequirePermission(ADMIN_SETTINGS)
  @ApiOperation({ summary: 'Get workshop job workflow stages and templates' })
  getWorkflow() { return this.workflow.getWorkflow(); }

  @Put('workflow')
  @RequirePermission(ADMIN_SETTINGS_EDIT)
  @ApiOperation({ summary: 'Replace workshop job workflow stages' })
  updateWorkflow(@Body() body: { stages: any[] }, @CurrentUser('sub') userId: string) {
    return this.workflow.updateStages(body.stages, userId);
  }

  @Post('workflow/templates/:templateKey/apply')
  @RequirePermission(ADMIN_SETTINGS_EDIT)
  @ApiOperation({ summary: 'Apply a built-in workflow template' })
  applyWorkflowTemplate(@Param('templateKey') templateKey: string, @CurrentUser('sub') userId: string) {
    return this.workflow.applyTemplate(templateKey, userId);
  }

  // ─── Stats ─────────────────────────────────────────────
  @Get('stats')
  @RequirePermission(ADMIN_STATS)
  @ApiOperation({ summary: 'Job stats dashboard summary' })
  getStats() { return this.settings.getSummaryReport(); }

  // ─── Labour Rates ───────────────────────────────────────
  @Get('labour-rates')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'List labour rates' })
  getLabourRates() { return this.labourRates.getLabourRates(); }

  @Post('labour-rates')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'Add labour rate' })
  addLabourRate(@Body() body: CreateLabourRateDto) {
    return this.labourRates.addLabourRate(body);
  }

  @Patch('labour-rates/:id')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'Update labour rate' })
  updateLabourRate(
    @Param('id') id: string,
    @Body() body: UpdateLabourRateDto,
  ) { return this.labourRates.updateLabourRate(id, body); }

  @Delete('labour-rates/:id')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'Delete labour rate' })
  deleteLabourRate(@Param('id') id: string) { return this.labourRates.deleteLabourRate(id); }

  // ─── Permissions catalogue ──────────────────────────────
  @Get('permissions')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'All available permissions + default role templates' })
  getPermissions() {
    return { permissions: ALL_PERMISSIONS, defaultRoles: DEFAULT_ROLES };
  }

  // ─── Roles ─────────────────────────────────────────────
  @Get('roles')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'List all roles' })
  getRoles(@Request() req: any) { return this.roles.getRoles(req.user); }

  @Post('roles')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'Create role' })
  createRole(@Body() body: CreateRoleDto) {
    return this.roles.createRole(body);
  }

  @Patch('roles/:id')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'Update role' })
  updateRole(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.roles.updateRole(id, body);
  }

  @Delete('roles/:id')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'Delete role (if no users assigned)' })
  deleteRole(@Param('id') id: string) { return this.roles.deleteRole(id); }

  // ─── Integrations ──────────────────────────────────────
  @Get('integrations')
  @RequirePermission(ADMIN_INTEGRATIONS)
  @ApiOperation({ summary: 'List integrations' })
  listIntegrations() { return this.settings.listIntegrations(); }

  @Post('integrations/:name/test')
  @RequirePermission(ADMIN_INTEGRATIONS)
  @ApiOperation({ summary: 'Test integration connection' })
  testIntegration(@Param('name') name: string) { return this.settings.testIntegration(name); }

  // ─── Inspection Templates ──────────────────────────────
  @Get('templates')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'List inspection templates' })
  getTemplates() { return this.templates.getTemplates(); }

  @Get('templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Get template with sections/items' })
  getTemplate(@Param('id') id: string) { return this.templates.getTemplate(id); }

  @Post('templates')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Create inspection template' })
  createTemplate(@Body() body: CreateAdminTemplateDto, @CurrentUser('sub') userId: string) {
    return this.templates.createTemplate(body, userId);
  }

  @Patch('templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update template metadata' })
  updateTemplate(@Param('id') id: string, @Body() body: UpdateAdminTemplateDto) {
    return this.templates.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Soft-delete template' })
  deleteTemplate(@Param('id') id: string) { return this.templates.deleteTemplate(id); }

  // ─── Sections ──────────────────────────────────────────
  @Post('templates/:id/sections')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add section to template' })
  addSection(@Param('id') id: string, @Body() body: { name: string; icon?: string; sort_order?: number }) {
    return this.templates.addSection(id, body);
  }

  @Patch('templates/sections/:sectionId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update section' })
  updateSection(@Param('sectionId') sectionId: string, @Body() body: { name?: string; icon?: string; sort_order?: number; is_active?: boolean }) {
    return this.templates.updateSection(sectionId, body);
  }

  @Delete('templates/sections/:sectionId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Delete section and its items' })
  deleteSection(@Param('sectionId') sectionId: string) {
    return this.templates.deleteSection(sectionId);
  }

  @Patch('templates/:id/sections/reorder')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Reorder sections' })
  reorderSections(@Param('id') id: string, @Body() body: { sectionIds: string[] }) {
    return this.templates.reorderSections(id, body.sectionIds);
  }

  // ─── Items ─────────────────────────────────────────────
  @Post('templates/:id/items')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add item to template section' })
  addItem(
    @Param('id') id: string,
    @Body() body: CreateItemDto,
  ) {
    return this.templates.addItem(id, body);
  }

  @Patch('templates/items/:itemId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update item' })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemDto,
  ) {
    return this.templates.updateItem(itemId, body);
  }

  @Delete('templates/items/:itemId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Delete item' })
  deleteItem(@Param('itemId') itemId: string) {
    return this.templates.deleteItem(itemId);
  }

  @Patch('templates/sections/:sectionId/items/reorder')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Reorder items within section' })
  reorderItems(@Param('sectionId') sectionId: string, @Body() body: { itemIds: string[] }) {
    return this.templates.reorderItems(sectionId, body.itemIds);
  }

  // ─── QC Checklist Templates ─────────────────────────────
  @Get('qc-templates')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'List QC checklist templates' })
  getQcTemplates() { return this.qcTemplates.getTemplates(); }

  @Get('qc-templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Get QC checklist template with sections/items' })
  getQcTemplate(@Param('id') id: string) { return this.qcTemplates.getTemplate(id); }

  @Post('qc-templates')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Create QC checklist template' })
  createQcTemplate(@Body() body: { name: string; description?: string; is_default?: boolean; is_active?: boolean }, @CurrentUser('sub') userId: string) {
    return this.qcTemplates.createTemplate(body, userId);
  }

  @Patch('qc-templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update QC checklist template metadata' })
  updateQcTemplate(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.qcTemplates.updateTemplate(id, body);
  }

  @Delete('qc-templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Soft-delete QC checklist template' })
  deleteQcTemplate(@Param('id') id: string) { return this.qcTemplates.deleteTemplate(id); }

  // ─── QC Sections ────────────────────────────────────────
  @Post('qc-templates/:id/sections')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add section to QC checklist template' })
  addQcSection(@Param('id') id: string, @Body() body: { name: string; icon?: string; sort_order?: number }) {
    return this.qcTemplates.addSection(id, body);
  }

  @Patch('qc-templates/sections/:sectionId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update QC section' })
  updateQcSection(@Param('sectionId') sectionId: string, @Body() body: Record<string, any>) {
    return this.qcTemplates.updateSection(sectionId, body);
  }

  @Delete('qc-templates/sections/:sectionId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Delete QC section and its items' })
  deleteQcSection(@Param('sectionId') sectionId: string) {
    return this.qcTemplates.deleteSection(sectionId);
  }

  @Patch('qc-templates/:id/sections/reorder')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Reorder QC sections' })
  reorderQcSections(@Param('id') id: string, @Body() body: { sectionIds: string[] }) {
    return this.qcTemplates.reorderSections(id, body.sectionIds);
  }

  // ─── QC Items ───────────────────────────────────────────
  @Post('qc-templates/:id/items')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add item to QC checklist section' })
  addQcItem(@Param('id') id: string, @Body() body: {
    section_id: string; label: string; input_type?: string;
    requires_photo?: boolean; requires_note_on_fail?: boolean;
    help_text?: string; sort_order?: number;
  }) {
    return this.qcTemplates.addItem(id, body);
  }

  @Patch('qc-templates/items/:itemId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update QC item' })
  updateQcItem(@Param('itemId') itemId: string, @Body() body: Record<string, any>) {
    return this.qcTemplates.updateItem(itemId, body);
  }

  @Delete('qc-templates/items/:itemId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Delete QC item' })
  deleteQcItem(@Param('itemId') itemId: string) { return this.qcTemplates.deleteItem(itemId); }

  @Patch('qc-templates/sections/:sectionId/items/reorder')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Reorder QC items within section' })
  reorderQcItems(@Param('sectionId') sectionId: string, @Body() body: { itemIds: string[] }) {
    return this.qcTemplates.reorderItems(sectionId, body.itemIds);
  }
}
