import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { UseGuards } from '@nestjs/common';
import { RequirePermission, INSIGHTS_DASHBOARD } from '../common/permissions';
import { RequirePlanFeature } from '../common/plan-features';

@ApiTags('Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('insights')
export class InsightsController {
  constructor(private service: InsightsService) {}

  @Get('dashboard')
  @RequirePlanFeature('analytics')
  @RequirePermission(INSIGHTS_DASHBOARD)
  @ApiOperation({ summary: 'Workshop dashboard statistics and insights' })
  getDashboard() {
    return this.service.getDashboard();
  }
}