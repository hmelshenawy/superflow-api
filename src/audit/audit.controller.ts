import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Filterable audit log list (admin only)' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.service.findAll({ page: Number(page), limit: Number(limit) } as PaginationDto, {
      entityType,
      userId,
      action,
      entityId,
    });
  }
}
