import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { BulkDeleteJobsDto } from './dto/bulk-delete.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, JOBS_READ, JOBS_CREATE, JOBS_UPDATE, JOBS_DELETE, JOBS_ASSIGN, JOBS_TRANSITION } from '../common/permissions';
import { PlanFeatureGuard } from '../common/guards/plan-feature.guard';
import { RequirePlanFeature } from '../common/plan-features/require-plan-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('jobs')
export class JobsController {
  constructor(private service: JobsService) {}

  @Get()
  @RequirePermission(JOBS_READ)
  @ApiOperation({ summary: 'List jobs, filtered by role, optional ?status=' })
  findAll(
    @Query() query: ListJobsDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.service.findAll(query, query.status, query.search, userId, role);
  }

  @Get(':id')
  @RequirePermission(JOBS_READ)
  @ApiOperation({ summary: 'Full job details' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(JOBS_CREATE)
  @UseGuards(PlanFeatureGuard)
  @RequirePlanFeature('jobs')
  @ApiOperation({ summary: 'Create job' })
  create(@Body() dto: CreateJobDto, @CurrentUser('sub') userId: string) { return this.service.create(dto, userId); }

  @Post(':id/concerns')
  @RequirePermission(JOBS_UPDATE)
  @ApiOperation({ summary: 'Create a customer/job concern' })
  createConcern(@Param('id') id: string, @Body() dto: any) { return this.service.createConcern(id, dto); }

  @Patch(':id/concerns/:concernId')
  @RequirePermission(JOBS_UPDATE)
  @ApiOperation({ summary: 'Update a customer/job concern' })
  updateConcern(@Param('id') id: string, @Param('concernId') concernId: string, @Body() dto: any) { return this.service.updateConcern(id, concernId, dto); }

  @Delete(':id/concerns/:concernId')
  @RequirePermission(JOBS_UPDATE)
  @ApiOperation({ summary: 'Delete a customer/job concern' })
  removeConcern(@Param('id') id: string, @Param('concernId') concernId: string) { return this.service.removeConcern(id, concernId); }

  @Patch(':id')
  @RequirePermission(JOBS_UPDATE)
  @ApiOperation({ summary: 'Update job' })
  update(@Param('id') id: string, @Body() dto: UpdateJobDto, @CurrentUser('sub') userId: string) { return this.service.update(id, dto, userId); }

  @Patch(':id/status')
  @RequirePermission(JOBS_TRANSITION)
  @ApiOperation({ summary: 'State transition' })
  transition(@Param('id') id: string, @Body() dto: TransitionStatusDto, @CurrentUser('sub') userId: string) {
    return this.service.transition(id, dto, userId);
  }

  @Post(':id/assign')
  @RequirePermission(JOBS_ASSIGN)
  @ApiOperation({ summary: 'Assign technician' })
  assign(@Param('id') id: string, @Body() dto: AssignTechnicianDto) {
    return this.service.assignTechnician(id, dto.technician_id ?? null);
  }

  @Patch(':id/archive')
  @RequirePermission(JOBS_UPDATE)
  @ApiOperation({ summary: 'Archive a closed job' })
  archive(@Param('id') id: string) {
    return this.service.archiveJob(id);
  }

  @Patch(':id/unarchive')
  @RequirePermission(JOBS_UPDATE)
  @ApiOperation({ summary: 'Unarchive a job back to the board' })
  unarchive(@Param('id') id: string) {
    return this.service.unarchiveJob(id);
  }

  @Delete(':id')
  @RequirePermission(JOBS_DELETE)
  @ApiOperation({ summary: 'Delete a job (admin only)' })
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Delete()
  @RequirePermission(JOBS_DELETE)
  @ApiOperation({ summary: 'Delete ALL jobs (bulk clear)' })
  removeAll(@Body() dto: BulkDeleteJobsDto) {
    if (!dto.confirm) {
      throw new Error('Bulk delete requires confirm: true');
    }
    return this.service.removeAll();
  }
}