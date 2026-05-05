import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstimatesService } from './estimates.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { BulkReplaceLinesDto } from './dto/bulk-replace-lines.dto';
import { CreateGroupDto, RenameGroupDto } from './dto/group-ops.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, ESTIMATES_READ, ESTIMATES_CREATE, ESTIMATES_UPDATE, ESTIMATES_DELETE } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Estimates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('estimates')
export class EstimatesController {
  constructor(private service: EstimatesService) {}

  @Get('defaults')
  @RequirePermission(ESTIMATES_READ)
  @ApiOperation({ summary: 'Get default tax and standard labour rate for quote builder' })
  getDefaults() { return this.service.getDefaults(); }

  @Get('job/:jobId')
  @RequirePermission(ESTIMATES_READ)
  @ApiOperation({ summary: 'List estimate lines for a job' })
  findByJob(@Param('jobId') jobId: string) { return this.service.findByJob(jobId); }

  @Get()
  @RequirePermission(ESTIMATES_READ)
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get(':id')
  @RequirePermission(ESTIMATES_READ)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(ESTIMATES_CREATE)
  create(@Body() dto: CreateLineDto, @CurrentUser('sub') userId: string) { return this.service.create(dto, userId); }

  @Put(':id')
  @RequirePermission(ESTIMATES_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateLineDto, @CurrentUser('sub') userId: string) { return this.service.update(id, dto, userId); }

  @Delete(':id')
  @RequirePermission(ESTIMATES_DELETE)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Put('job/:jobId/bulk')
  @RequirePermission(ESTIMATES_UPDATE)
  @ApiOperation({ summary: 'Bulk replace all estimate lines for a job' })
  bulkReplace(
    @Param('jobId') jobId: string,
    @Body() body: BulkReplaceLinesDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.bulkReplace(jobId, body.lines, userId);
  }

  @Post('groups')
  @RequirePermission(ESTIMATES_CREATE)
  @ApiOperation({ summary: 'Create a quote group' })
  createGroup(@Body() dto: CreateGroupDto) { return this.service.createGroup(dto.job_id, dto.title ?? 'New group'); }

  @Patch('groups/:id')
  @RequirePermission(ESTIMATES_UPDATE)
  @ApiOperation({ summary: 'Rename a quote group' })
  renameGroup(@Param('id') id: string, @Body() dto: RenameGroupDto) { return this.service.renameGroup(id, dto.title); }

  @Delete('groups/:id')
  @RequirePermission(ESTIMATES_DELETE)
  @ApiOperation({ summary: 'Delete a quote group (detaches lines, does not delete them)' })
  deleteGroup(@Param('id') id: string) { return this.service.deleteGroup(id); }
}