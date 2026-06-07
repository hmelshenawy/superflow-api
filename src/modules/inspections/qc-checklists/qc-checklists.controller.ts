import { Controller, Get, Post, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QcChecklistsService } from './qc-checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { SaveResponseDto } from './dto/save-response.dto';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission, QC_READ, QC_CREATE, QC_SUBMIT, QC_REOPEN } from '../../../common/permissions';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePlanFeature } from '../../../common/plan-features';

@ApiTags('QC Checklists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('qc-checklists')
export class QcChecklistsController {
  constructor(private service: QcChecklistsService) {}

  @Get()
  @RequirePermission(QC_READ)
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get(':id')
  @RequirePermission(QC_READ)
  @ApiOperation({ summary: 'Get QC checklist + responses' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePlanFeature('qc_checklists')
  @RequirePermission(QC_CREATE)
  @ApiOperation({ summary: 'Start QC checklist for a job' })
  create(@Body() body: CreateChecklistDto, @CurrentUser('sub') userId: string) {
    return this.service.create(body.jobId, body.templateId, body.checkerId || userId);
  }

  @Put(':id/responses')
  @RequirePlanFeature('qc_checklists')
  @RequirePermission(QC_SUBMIT)
  @ApiOperation({ summary: 'Save QC responses in batch' })
  saveResponses(@Param('id') id: string, @Body() dto: SaveResponseDto) {
    return this.service.saveResponses(id, dto);
  }

  @Post(':id/submit')
  @RequirePlanFeature('qc_checklists')
  @RequirePermission(QC_SUBMIT)
  @ApiOperation({ summary: 'Finalize QC checklist, compute result, transition job status' })
  submit(@Param('id') id: string, @Body() dto: SubmitChecklistDto, @CurrentUser('sub') userId: string) {
    return this.service.submit(id, dto, userId);
  }

  @Post(':id/reopen')
  @RequirePermission(QC_REOPEN)
  @ApiOperation({ summary: 'Re-open a locked QC checklist for edits' })
  reopen(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.service.reopen(id, userId);
  }
}