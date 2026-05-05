import { Body, Controller, Get, Post, Put, Patch, Delete, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateAdminTemplateDto } from './dto/create-template.dto';
import { UpdateAdminTemplateDto } from './dto/update-template.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  RequirePermission,
  ADMIN_SETTINGS, ADMIN_SETTINGS_EDIT, ADMIN_ROLES,
  ADMIN_USERS, ADMIN_USERS_CREATE, ADMIN_USERS_DELETE,
  ADMIN_INTEGRATIONS, ADMIN_TEMPLATES, ADMIN_LABOUR_RATES, ADMIN_STATS,
} from '../common/permissions';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  // ─── Settings ──────────────────────────────────────────
  @Get('settings')
  @RequirePermission(ADMIN_SETTINGS)
  @ApiOperation({ summary: 'All settings' })
  getSettings() { return this.service.getSettings(); }

  @Put('settings')
  @RequirePermission(ADMIN_SETTINGS_EDIT)
  @ApiOperation({ summary: 'Bulk update settings' })
  updateSettings(@Body() body: UpdateSettingsDto, @CurrentUser('sub') userId: string) {
    return this.service.updateSettings(body, userId);
  }

  // ─── Stats ─────────────────────────────────────────────
  @Get('stats')
  @RequirePermission(ADMIN_STATS)
  @ApiOperation({ summary: 'Job stats dashboard summary' })
  getStats() { return this.service.getSummaryReport(); }

  // ─── Labour Rates ───────────────────────────────────────
  @Get('labour-rates')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'List labour rates' })
  getLabourRates() { return this.service.getLabourRates(); }

  @Post('labour-rates')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'Add labour rate' })
  addLabourRate(@Body() body: { name: string; rate_per_hour: number; currency?: string; is_active?: boolean }) {
    return this.service.addLabourRate(body);
  }

  @Patch('labour-rates/:id')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'Update labour rate' })
  updateLabourRate(
    @Param('id') id: string,
    @Body() body: { name?: string; rate_per_hour?: number; currency?: string; is_active?: boolean },
  ) { return this.service.updateLabourRate(id, body); }

  @Delete('labour-rates/:id')
  @RequirePermission(ADMIN_LABOUR_RATES)
  @ApiOperation({ summary: 'Delete labour rate' })
  deleteLabourRate(@Param('id') id: string) { return this.service.deleteLabourRate(id); }

  // ─── Roles ─────────────────────────────────────────────
  @Get('roles')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'List all roles' })
  getRoles() { return this.service.getRoles(); }

  @Post('roles')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'Create role' })
  createRole(@Body() body: CreateRoleDto) {
    return this.service.createRole(body);
  }

  @Patch('roles/:id')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'Update role' })
  updateRole(@Param('id') id: string, @Body() body: UpdateRoleDto) {
    return this.service.updateRole(id, body);
  }

  @Delete('roles/:id')
  @RequirePermission(ADMIN_ROLES)
  @ApiOperation({ summary: 'Delete role (if no users assigned)' })
  deleteRole(@Param('id') id: string) { return this.service.deleteRole(id); }

  // ─── Integrations ──────────────────────────────────────
  @Get('integrations')
  @RequirePermission(ADMIN_INTEGRATIONS)
  @ApiOperation({ summary: 'List integrations' })
  listIntegrations() { return this.service.listIntegrations(); }

  @Post('integrations/:name/test')
  @RequirePermission(ADMIN_INTEGRATIONS)
  @ApiOperation({ summary: 'Test integration connection' })
  testIntegration(@Param('name') name: string) { return this.service.testIntegration(name); }

  // ─── Inspection Templates ──────────────────────────────
  @Get('templates')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'List inspection templates' })
  getTemplates() { return this.service.getTemplates(); }

  @Get('templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Get template with sections/items' })
  getTemplate(@Param('id') id: string) { return this.service.getTemplate(id); }

  @Post('templates')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Create inspection template' })
  createTemplate(@Body() body: CreateAdminTemplateDto, @CurrentUser('sub') userId: string) {
    return this.service.createTemplate(body, userId);
  }

  @Patch('templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update template metadata' })
  updateTemplate(@Param('id') id: string, @Body() body: UpdateAdminTemplateDto) {
    return this.service.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Soft-delete template' })
  deleteTemplate(@Param('id') id: string) { return this.service.deleteTemplate(id); }

  // ─── Sections ──────────────────────────────────────────
  @Post('templates/:id/sections')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add section to template' })
  addSection(@Param('id') id: string, @Body() body: { name: string; icon?: string; sort_order?: number }) {
    return this.service.addSection(id, body);
  }

  @Patch('templates/sections/:sectionId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update section' })
  updateSection(@Param('sectionId') sectionId: string, @Body() body: { name?: string; icon?: string; sort_order?: number; is_active?: boolean }) {
    return this.service.updateSection(sectionId, body);
  }

  @Delete('templates/sections/:sectionId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Delete section and its items' })
  deleteSection(@Param('sectionId') sectionId: string) {
    return this.service.deleteSection(sectionId);
  }

  @Patch('templates/:id/sections/reorder')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Reorder sections' })
  reorderSections(@Param('id') id: string, @Body() body: { sectionIds: string[] }) {
    return this.service.reorderSections(id, body.sectionIds);
  }

  // ─── Items ─────────────────────────────────────────────
  @Post('templates/:id/items')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add item to template section' })
  addItem(
    @Param('id') id: string,
    @Body() body: CreateItemDto,
  ) {
    return this.service.addItem(id, body);
  }

  @Patch('templates/items/:itemId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Update item' })
  updateItem(
    @Param('itemId') itemId: string,
    @Body() body: UpdateItemDto,
  ) {
    return this.service.updateItem(itemId, body);
  }

  @Delete('templates/items/:itemId')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Delete item' })
  deleteItem(@Param('itemId') itemId: string) {
    return this.service.deleteItem(itemId);
  }

  @Patch('templates/sections/:sectionId/items/reorder')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Reorder items within section' })
  reorderItems(@Param('sectionId') sectionId: string, @Body() body: { itemIds: string[] }) {
    return this.service.reorderItems(sectionId, body.itemIds);
  }
}