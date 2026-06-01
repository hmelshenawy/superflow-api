import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { UseGuards } from '@nestjs/common';
import { RequirePermission, INSIGHTS_DASHBOARD } from '../common/permissions';
import { RequirePlanFeature } from '../common/plan-features';
import { MODULE_KEYS, ProductModuleGuard, RequireModule } from '../common/product-modes';

@ApiTags('Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProductModuleGuard, PermissionsGuard)
@RequireModule(MODULE_KEYS.OPERATIONAL_ANALYTICS)
@Controller('insights')
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);
  constructor(private service: InsightsService) {}

  @Get('dashboard')
  @RequirePlanFeature('analytics')
  @RequirePermission(INSIGHTS_DASHBOARD)
  @ApiOperation({ summary: 'Workshop dashboard statistics and insights' })
  async getDashboard() {
    try {
      return await this.service.getDashboard();
    } catch (err) {
      this.logger.error('Failed to load dashboard:', err);
      throw err;
    }
  }
}
