import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, CUSTOMERS_READ, CUSTOMERS_CREATE, CUSTOMERS_UPDATE, CUSTOMERS_DELETE } from '../common/permissions';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  @RequirePermission(CUSTOMERS_READ)
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get('search')
  @RequirePermission(CUSTOMERS_READ)
  @ApiOperation({ summary: 'Search customers by name/email/phone' })
  search(@Query('q') query: string) { return this.service.search(query); }

  @Get(':id/jobs')
  @RequirePermission(CUSTOMERS_READ)
  @ApiOperation({ summary: 'Get job history for a customer' })
  getJobs(@Param('id') id: string, @Query() pagination: PaginationDto) { return this.service.getJobs(id, pagination); }

  @Get(':id/deferred')
  @RequirePermission(CUSTOMERS_READ)
  @ApiOperation({ summary: 'Get deferred work for a customer' })
  getDeferred(@Param('id') id: string, @Query() pagination: PaginationDto) { return this.service.getDeferred(id, pagination); }

  @Get(':id')
  @RequirePermission(CUSTOMERS_READ)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(CUSTOMERS_CREATE)
  create(@Body() dto: CreateCustomerDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermission(CUSTOMERS_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @RequirePermission(CUSTOMERS_DELETE)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}