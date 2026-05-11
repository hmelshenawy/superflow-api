import { ApiProperty, ApiQuery, ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, PRIORITY_READ } from '../common/permissions';
import { RequirePlanFeature } from '../common/plan-features';
import { PriorityService } from './priority.service';
import { PriorityResultDto, BulkPriorityResultDto } from './dto/priority-result.dto';

@ApiTags('Priority')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('priority')
export class PriorityController {
  constructor(private readonly priorityService: PriorityService) {}

  @Get()
  @RequirePlanFeature('priority_engine')
  @RequirePermission(PRIORITY_READ)
  @ApiOperation({ summary: 'Get priority scores for all active jobs' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (comma-separated)' })
  @ApiQuery({ name: 'advisor_id', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('status') status?: string,
    @Query('advisor_id') advisorId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<BulkPriorityResultDto> {
    console.log('[PriorityController] findAll called, computing all priorities');
    return this.priorityService.computeAll({ status, advisorId, limit }).catch(err => {
      console.error('[PriorityController] Error computing priorities:', err.message, err.stack?.slice(0, 500));
      throw err;
    });
  }

  @Get(':id')
  @RequirePlanFeature('priority_engine')
  @RequirePermission(PRIORITY_READ)
  @ApiOperation({ summary: 'Get priority score for a single job' })
  findOne(@Query('id') id: string): Promise<PriorityResultDto> {
    return this.priorityService.computeOne(id);
  }
}
