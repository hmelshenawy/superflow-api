import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Get all plans with regional pricing and features' })
  getPricing(@Query('region') region: string = 'gcc') {
    return this.billingService.getPricing(region);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription, plan features, and usage' })
  getSubscription(@CurrentUser() user: any) {
    return this.billingService.getSubscription(user.workshopId);
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current month usage vs ceilings for all features' })
  getUsage(@CurrentUser() user: any) {
    return this.billingService.getUsage(user.workshopId);
  }
}