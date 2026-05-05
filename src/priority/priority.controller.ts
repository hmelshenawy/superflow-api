import { ApiProperty, ApiQuery, ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PriorityService } from './priority.service';
import { PriorityResultDto, BulkPriorityResultDto } from './dto/priority-result.dto';

@ApiTags('Priority')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('priority')
export class PriorityController {
  constructor(private readonly priorityService: PriorityService) {}

  @Get()
  @ApiOperation({ summary: 'Get priority scores for all active jobs' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (comma-separated)' })
  @ApiQuery({ name: 'advisor_id', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Roles('admin', 'manager', 'service_advisor')
  findAll(
    @Query('status') status?: string,
    @Query('advisor_id') advisorId?: string,
    @Query('limit') limit?: number,
  ): Promise<BulkPriorityResultDto> {
    return this.priorityService.computeAll({ status, advisorId, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get priority score for a single job' })
  @Roles('admin', 'manager', 'service_advisor')
  findOne(@Query('id') id: string): Promise<PriorityResultDto> {
    return this.priorityService.computeOne(id);
  }
}