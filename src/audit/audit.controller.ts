import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, ADMIN_AUDIT } from '../common/permissions';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @RequirePermission(ADMIN_AUDIT)
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