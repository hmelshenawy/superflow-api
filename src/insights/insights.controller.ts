import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('insights')
export class InsightsController {
  constructor(private service: InsightsService) {}

  @Get('dashboard')
  @Roles('admin', 'manager', 'service_advisor')
  @ApiOperation({ summary: 'Workshop dashboard statistics and insights' })
  getDashboard() {
    return this.service.getDashboard();
  }
}