import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, ADMIN_AUDIT } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @RequirePermission(ADMIN_AUDIT)
  @ApiOperation({ summary: 'Filterable audit log list (platform admin only)' })
  findAll(
    @CurrentUser('role') role: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityId') entityId?: string,
    @Query('workshopId') workshopId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (role !== 'platform_admin') {
      throw new ForbiddenException('Audit logs are only available to platform administrators');
    }

    return this.service.findAllPlatform({ page: Number(page), limit: Number(limit) } as PaginationDto, {
      entityType,
      userId,
      action,
      entityId,
      workshopId,
      dateFrom,
      dateTo,
    });
  }
}
