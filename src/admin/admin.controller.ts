import { Controller, Get, Post, Put, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard stats' })
  getStats() { return this.service.getStats(); }

  @Get('settings')
  getSettings() { return this.service.getSettings(); }

  @Post('settings')
  @ApiOperation({ summary: 'Create or update a setting' })
  upsertSetting(@Body() body: { key: string; value: string; valueType: string }, @CurrentUser('sub') userId: string) {
    return this.service.upsertSetting(body.key, body.value, body.valueType, userId);
  }

  @Get('labour-rates')
  getLabourRates() { return this.service.getLabourRates(); }
}