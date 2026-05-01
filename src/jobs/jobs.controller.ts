import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private service: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs, filtered by role, optional ?status=' })
  findAll(
    @Query() query: ListJobsDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.service.findAll(query, query.status, query.search, userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full job details' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('admin', 'manager', 'service_advisor')
  @ApiOperation({ summary: 'Create job' })
  create(@Body() dto: CreateJobDto, @CurrentUser('sub') userId: string) { return this.service.create(dto, userId); }

  @Patch(':id')
  @Roles('admin', 'manager', 'service_advisor')
  @ApiOperation({ summary: 'Update job' })
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) { return this.service.update(id, dto); }

  @Patch(':id/status')
  @Roles('admin', 'manager', 'service_advisor')
  @ApiOperation({ summary: 'State transition' })
  transition(@Param('id') id: string, @Body() dto: TransitionStatusDto, @CurrentUser('sub') userId: string) {
    return this.service.transition(id, dto, userId);
  }

  @Post(':id/assign')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Assign technician' })
  assign(@Param('id') id: string, @Body() dto: AssignTechnicianDto) {
    return this.service.assignTechnician(id, dto.technician_id ?? null);
  }

  @Patch(':id/archive')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Archive a closed job' })
  archive(@Param('id') id: string) {
    return this.service.archiveJob(id);
  }

  @Patch(':id/unarchive')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Unarchive a job back to the board' })
  unarchive(@Param('id') id: string) {
    return this.service.unarchiveJob(id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a job (admin only)' })
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Delete()
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete ALL jobs (bulk clear)' })
  removeAll() { return this.service.removeAll(); }
}
