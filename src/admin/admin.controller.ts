import { Body, Controller, Get, Post, Put, Patch, Delete, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateAdminTemplateDto } from './dto/create-template.dto';
import { UpdateAdminTemplateDto } from './dto/update-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  // ─── Settings ──────────────────────────────────────────
  @Get('settings')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'All settings' })
  getSettings() { return this.service.getSettings(); }

  @Put('settings')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Bulk update settings' })
  updateSettings(@Body() body: UpdateSettingsDto, @CurrentUser('sub') userId: string) {
    return this.service.updateSettings(body, userId);
  }

  // ─── Stats ─────────────────────────────────────────────
  @Get('stats')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Job stats dashboard summary' })
  getStats() { return this.service.getSummaryReport(); }

  // ─── Labour Rates ───────────────────────────────────────
  @Get('labour-rates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List labour rates' })
  getLabourRates() { return this.service.getLabourRates(); }

  @Post('labour-rates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Add labour rate' })
  addLabourRate(@Body() body: { name: string; rate_per_hour: number; currency?: string; is_active?: boolean }) {
    return this.service.addLabourRate(body);
  }

  @Patch('labour-rates/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update labour rate' })
  updateLabourRate(
    @Param('id') id: string,
    @Body() body: { name?: string; rate_per_hour?: number; currency?: string; is_active?: boolean },
  ) { return this.service.updateLabourRate(id, body); }

  @Delete('labour-rates/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete labour rate' })
  deleteLabourRate(@Param('id') id: string) { return this.service.deleteLabourRate(id); }

  // ─── Roles ─────────────────────────────────────────────
  @Get('roles')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List all roles' })
  getRoles() { return this.service.getRoles(); }

  @Post('roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Create role' })
  createRole(@Body() body: { name: string; permissions?: any; description?: string }) {
    return this.service.createRole(body);
  }

  @Patch('roles/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update role' })
  updateRole(@Param('id') id: string, @Body() body: { name?: string; permissions?: any; description?: string }) {
    return this.service.updateRole(id, body);
  }

  @Delete('roles/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete role (if no users assigned)' })
  deleteRole(@Param('id') id: string) { return this.service.deleteRole(id); }

  // ─── Integrations ──────────────────────────────────────
  @Get('integrations')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List integrations' })
  listIntegrations() { return this.service.listIntegrations(); }

  @Post('integrations/:name/test')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Test integration connection' })
  testIntegration(@Param('name') name: string) { return this.service.testIntegration(name); }

  // ─── Inspection Templates ──────────────────────────────
  @Get('templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List inspection templates' })
  getTemplates() { return this.service.getTemplates(); }

  @Get('templates/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get template with sections/items' })
  getTemplate(@Param('id') id: string) { return this.service.getTemplate(id); }

  @Post('templates')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create inspection template' })
  createTemplate(@Body() body: CreateAdminTemplateDto, @CurrentUser('sub') userId: string) {
    return this.service.createTemplate(body, userId);
  }

  @Patch('templates/:id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update template metadata' })
  updateTemplate(@Param('id') id: string, @Body() body: UpdateAdminTemplateDto) {
    return this.service.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Soft-delete template' })
  deleteTemplate(@Param('id') id: string) { return this.service.deleteTemplate(id); }
}