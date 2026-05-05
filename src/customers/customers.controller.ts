import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Get()
  @Roles('admin', 'manager', 'service_advisor')
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get('search')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Search customers by name/email/phone' })
  search(@Query('q') query: string) { return this.service.search(query); }

  @Get(':id/jobs')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Get job history for a customer' })
  getJobs(@Param('id') id: string, @Query() pagination: PaginationDto) { return this.service.getJobs(id, pagination); }

  @Get(':id/deferred')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  @ApiOperation({ summary: 'Get deferred work for a customer' })
  getDeferred(@Param('id') id: string, @Query() pagination: PaginationDto) { return this.service.getDeferred(id, pagination); }

  @Get(':id')
  @Roles('admin', 'manager', 'service_advisor', 'technician')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @Roles('admin', 'manager', 'service_advisor')
  create(@Body() dto: CreateCustomerDto) { return this.service.create(dto); }

  @Patch(':id')
  @Roles('admin', 'manager', 'service_advisor')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) { return this.service.remove(id); }
}