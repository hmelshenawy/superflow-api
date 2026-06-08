import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EstimatesService } from './estimates.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { BulkReplaceLinesDto } from './dto/bulk-replace-lines.dto';
import { CreateGroupDto, RenameGroupDto } from './dto/group-ops.dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { JwtAuthGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RequirePermission, ESTIMATES_READ, ESTIMATES_CREATE, ESTIMATES_UPDATE, ESTIMATES_DELETE } from '@common/permissions';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { MODULE_KEYS, ProductModuleGuard, RequireModule } from '@common/product-modes';
import { getWorkshopContext } from '@prisma/workshop-context';

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error: any) {
    return `[unserializable: ${error?.message ?? String(error)}]`;
  }
}

@ApiTags('Estimates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProductModuleGuard, PermissionsGuard)
@RequireModule(MODULE_KEYS.ESTIMATES)
@Controller('estimates')
export class EstimatesController {
  private readonly logger = new Logger(EstimatesController.name);

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
  async bulkReplace(
    @Param('jobId') jobId: string,
    @Body() body: BulkReplaceLinesDto,
    @CurrentUser() user: any,
  ) {
    const { workshopId } = getWorkshopContext();
    const lines = Array.isArray(body?.lines) ? body.lines : [];
    this.logger.log(`ESTIMATE_BULK_FIX_ACTIVE_V2 controller start ${safeJson({
      event: 'estimates.bulkReplace.request',
      jobId,
      bodyKeys: Object.keys(body ?? {}),
      body,
      userId: user?.sub,
      tenantId: user?.tenantId ?? null,
      tokenWorkshopId: user?.workshopId,
      contextWorkshopId: workshopId,
      lineCount: lines.length,
      sampleLine: lines[0] ?? null,
    })}`);

    try {
      const result = await this.service.bulkReplace(jobId, lines, user?.sub);
      this.logger.log(`ESTIMATE_BULK_FIX_ACTIVE_V2 controller success ${safeJson({
        jobId,
        userId: user?.sub,
        workshopId,
        returnedLines: Array.isArray(result) ? result.length : null,
      })}`);
      return result;
    } catch (error: any) {
      const responseBody = typeof error?.getResponse === 'function' ? error.getResponse() : undefined;
      this.logger.error(
        `ESTIMATE_BULK_FIX_ACTIVE_V2 controller error ${safeJson({
          jobId,
          userId: user?.sub,
          tenantId: user?.tenantId ?? null,
          tokenWorkshopId: user?.workshopId,
          contextWorkshopId: workshopId,
          errorName: error?.name,
          errorMessage: error?.message,
          errorCode: error?.code,
          responseBody,
        })}`,
        error?.stack ?? String(error),
      );
      throw error;
    }
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
