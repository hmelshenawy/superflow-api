import { Body, Controller, Get, Post, Put, Patch, Delete, UseGuards, Param, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { RolesService } from './roles.service';
import { LabourRatesService } from './labour-rates.service';
import { TemplatesAdminService } from './templates.admin.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateAdminTemplateDto } from './dto/create-template.dto';
import { UpdateAdminTemplateDto } from './dto/update-template.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { CreateLabourRateDto, UpdateLabourRateDto } from './dto/labour-rate.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  RequirePermission,
  ALL_PERMISSIONS, DEFAULT_ROLES,
  ADMIN_SETTINGS, ADMIN_SETTINGS_EDIT, ADMIN_ROLES,
  ADMIN_INTEGRATIONS, ADMIN_TEMPLATES, ADMIN_LABOUR_RATES, ADMIN_STATS,
} from '../common/permissions';

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
}