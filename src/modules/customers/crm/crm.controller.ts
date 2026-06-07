import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RequirePermission, CRM_READ, CRM_CREATE, CRM_UPDATE, CRM_DELETE } from '@common/permissions';
import { CrmService } from './crm.service';
import { CrmDashboardQueryDto } from './dto/crm-dashboard-query.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CreateCrmCustomerDto } from './dto/create-crm-customer.dto';
import { UpdateCrmCustomerDto } from './dto/update-crm-customer.dto';

@ApiTags('CRM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm')
export class CrmController {
  constructor(private service: CrmService) {}

  // ─── Overview ─────────────────────────────────────────────
  @Get('overview')
  @RequirePermission(CRM_READ)
  @ApiOperation({ summary: 'CRM dashboard overview stats' })
  getOverview() {
    return this.service.getCrmOverview();
  }

  // ─── Customers ────────────────────────────────────────────
  @Get('customers')
  @RequirePermission(CRM_READ)
  @ApiOperation({ summary: 'List customers with CRM stats and filters' })
  listCustomers(@Query() query: CrmDashboardQueryDto) {
    return this.service.listCustomers(query);
  }

  @Get('customers/:id')
  @RequirePermission(CRM_READ)
  @ApiOperation({ summary: '360° customer profile dashboard' })
  getCustomerDashboard(@Param('id') id: string) {
    return this.service.getCustomerDashboard(id);
  }

  @Post('customers')
  @RequirePermission(CRM_CREATE)
  @ApiOperation({ summary: 'Create customer with CRM fields' })
  createCustomer(@Body() dto: CreateCrmCustomerDto) {
    return this.service.createCustomer(dto);
  }

  @Patch('customers/:id')
  @RequirePermission(CRM_UPDATE)
  @ApiOperation({ summary: 'Update customer CRM fields' })
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCrmCustomerDto) {
    return this.service.updateCustomer(id, dto);
  }

  // ─── Activities ───────────────────────────────────────────
  @Get('customers/:id/activities')
  @RequirePermission(CRM_READ)
  @ApiOperation({ summary: 'Activity timeline for a customer' })
  listActivities(@Param('id') id: string, @Query('type') type?: string) {
    return this.service.listActivities(id, type);
  }

  @Post('customers/:id/activities')
  @RequirePermission(CRM_CREATE)
  @ApiOperation({ summary: 'Log activity / set reminder' })
  createActivity(@Param('id') id: string, @Body() dto: CreateActivityDto, @Req() req: any) {
    return this.service.createActivity(id, dto, req.user?.id);
  }

  @Patch('activities/:activityId')
  @RequirePermission(CRM_UPDATE)
  @ApiOperation({ summary: 'Update activity (e.g. mark reminder done)' })
  updateActivity(@Param('activityId') id: string, @Body() dto: UpdateActivityDto) {
    return this.service.updateActivity(id, dto);
  }

  @Delete('activities/:activityId')
  @RequirePermission(CRM_DELETE)
  @ApiOperation({ summary: 'Delete activity' })
  deleteActivity(@Param('activityId') id: string) {
    return this.service.deleteActivity(id);
  }

  // ─── Vehicles ─────────────────────────────────────────────
  @Get('vehicles')
  @RequirePermission(CRM_READ)
  @ApiOperation({ summary: 'List vehicles with filters' })
  listVehicles(
    @Query('search') search?: string,
    @Query('make') make?: string,
    @Query('year') year?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listVehicles({ search, make, year, page: page || 1, limit: limit || 20 });
  }

  @Get('vehicles/:id')
  @RequirePermission(CRM_READ)
  @ApiOperation({ summary: 'Vehicle detail dashboard' })
  getVehicleDashboard(@Param('id') id: string) {
    return this.service.getVehicleDashboard(id);
  }
}