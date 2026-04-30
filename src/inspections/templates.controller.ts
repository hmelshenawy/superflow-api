import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Inspection Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspection-templates')
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List templates, optional ?vehicleType= filter' })
  findAll(@Query('vehicleType') vehicleType?: string) { return this.service.findAll(vehicleType); }

  @Get(':id')
  @ApiOperation({ summary: 'Template + sections + items' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create template' })
  create(@Body() dto: CreateTemplateDto, @CurrentUser('sub') userId: string) { return this.service.create(dto, userId); }

  @Post(':id/sections')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Add section to template' })
  addSection(@Param('id') id: string, @Body() body: { name: string; icon?: string; sort_order?: number }) {
    return this.service.addSection(id, body);
  }

  @Post(':id/items')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Add item to template section' })
  addItem(
    @Param('id') id: string,
    @Body()
    body: {
      section_id: string;
      label: string;
      input_type?: 'pass_fail' | 'yes_no' | 'ok_warn_fail' | 'number' | 'odometer' | 'fuel_level' | 'text' | 'toggle' | 'photo';
      options?: any;
      unit?: string;
      requires_photo?: boolean;
      requires_note_on?: string;
      help_text?: string;
      sort_order?: number;
    },
  ) {
    return this.service.addItem(id, body);
  }

  @Patch(':id/publish')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Publish / activate template' })
  publish(@Param('id') id: string) { return this.service.publish(id); }
}
