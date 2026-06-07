import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QcChecklistTemplatesService } from './qc-checklist-templates.service';
import { CreateQcTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RequirePermission, ADMIN_TEMPLATES } from '@common/permissions';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('QC Checklist Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('qc-checklist-templates')
export class QcChecklistTemplatesController {
  constructor(private service: QcChecklistTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List QC checklist templates' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get QC checklist template with sections and items' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Create a QC checklist template' })
  create(@Body() dto: CreateQcTemplateDto, @CurrentUser('sub') userId: string) {
    return this.service.create(dto, userId);
  }

  @Post(':id/sections')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add a section to a QC checklist template' })
  addSection(@Param('id') templateId: string, @Body() body: { name: string; icon?: string; sort_order?: number }) {
    return this.service.addSection(templateId, body);
  }

  @Post(':id/items')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Add an item to a QC checklist section' })
  addItem(
    @Param('id') templateId: string,
    @Body() body: { section_id: string; label: string; input_type?: string; requires_photo?: boolean; requires_note_on_fail?: boolean; help_text?: string; sort_order?: number },
  ) {
    return this.service.addItem(templateId, body.section_id, body);
  }

  @Patch(':id/publish')
  @RequirePermission(ADMIN_TEMPLATES)
  @ApiOperation({ summary: 'Publish/activate a QC checklist template' })
  publish(@Param('id') id: string) { return this.service.publish(id); }
}