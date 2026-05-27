import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, ADMIN_INTEGRATIONS } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MODULE_KEYS, ProductModuleGuard, RequireModule } from '../common/product-modes';
import { DmsService } from './dms.service';

@ApiTags('DMS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProductModuleGuard, PermissionsGuard)
@RequireModule(MODULE_KEYS.DMS_INTEGRATION)
@Controller('dms')
export class DmsController {
  constructor(private dms: DmsService) {}

  @Get('status')
  @RequirePermission(ADMIN_INTEGRATIONS)
  @ApiOperation({ summary: 'DMS provider config and sync status' })
  getStatus(@CurrentUser('workshopId') workshopId: string) {
    return this.dms.getStatus(workshopId);
  }

  @Post('sync/mock')
  @RequirePermission(ADMIN_INTEGRATIONS)
  @ApiOperation({ summary: 'Run mock DMS sync through the adapter abstraction' })
  sync(@CurrentUser('workshopId') workshopId: string) {
    return this.dms.sync(workshopId);
  }
}
