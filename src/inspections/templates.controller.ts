import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Inspection Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspection-templates')
export class TemplatesController {
  constructor(private service: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List templates, optional ?vehicleType= filter' })
  findAll(@Query('vehicleType') vehicleType?: string) { return this.service.findAll(vehicleType); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateTemplateDto, @CurrentUser('sub') userId: string) { return this.service.create(dto, userId); }
}