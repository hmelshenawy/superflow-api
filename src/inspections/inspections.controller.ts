import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InspectionsService } from './inspections.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private service: InspectionsService) {}

  @Get()
  @Roles('admin', 'manager', 'service_advisor')
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get(':id')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Get inspection + responses' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Start inspection session' })
  create(@Body() body: { jobId: string; templateId: string }, @CurrentUser('sub') userId: string) {
    return this.service.create(body.jobId, body.templateId, userId);
  }

  @Put(':id/responses')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Save answers in batch, supports offline draft payload' })
  saveResponses(@Param('id') id: string, @Body() dto: CreateResponseDto) {
    return this.service.saveResponses(id, dto);
  }

  @Post(':id/submit')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Lock and finalize inspection, queues advisor alert' })
  submit(@Param('id') id: string, @Body() dto: SubmitInspectionDto, @CurrentUser('sub') userId: string) {
    return this.service.submit(id, dto, userId);
  }

  @Post(':id/reopen')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Re-open a locked inspection for edits' })
  reopen(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.reopen(id, userId);
  }
}
