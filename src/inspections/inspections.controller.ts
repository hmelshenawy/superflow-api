import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InspectionsService } from './inspections.service';
import { CreateResponseDto } from './dto/create-response.dto';
import { SubmitInspectionDto } from './dto/submit-inspection.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, INSPECTIONS_READ, INSPECTIONS_CREATE, INSPECTIONS_SUBMIT, INSPECTIONS_REOPEN } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Inspections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private service: InspectionsService) {}

  @Get()
  @RequirePermission(INSPECTIONS_READ)
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get(':id')
  @RequirePermission(INSPECTIONS_READ)
  @ApiOperation({ summary: 'Get inspection + responses' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(INSPECTIONS_CREATE)
  @ApiOperation({ summary: 'Start inspection session' })
  create(@Body() body: { jobId: string; templateId: string }, @CurrentUser('sub') userId: string) {
    return this.service.create(body.jobId, body.templateId, userId);
  }

  @Put(':id/responses')
  @RequirePermission(INSPECTIONS_SUBMIT)
  @ApiOperation({ summary: 'Save answers in batch, supports offline draft payload' })
  saveResponses(@Param('id') id: string, @Body() dto: CreateResponseDto) {
    return this.service.saveResponses(id, dto);
  }

  @Post(':id/submit')
  @RequirePermission(INSPECTIONS_SUBMIT)
  @ApiOperation({ summary: 'Lock and finalize inspection, queues advisor alert' })
  submit(@Param('id') id: string, @Body() dto: SubmitInspectionDto, @CurrentUser('sub') userId: string) {
    return this.service.submit(id, dto, userId);
  }

  @Post(':id/reopen')
  @RequirePermission(INSPECTIONS_REOPEN)
  @ApiOperation({ summary: 'Re-open a locked inspection for edits' })
  reopen(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.reopen(id, userId);
  }
}