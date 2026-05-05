import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, VEHICLES_READ, VEHICLES_CREATE, VEHICLES_UPDATE } from '../common/permissions';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private service: VehiclesService) {}

  @Get()
  @RequirePermission(VEHICLES_READ)
  @ApiOperation({ summary: 'List vehicles' })
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get('vin/:vin')
  @RequirePermission(VEHICLES_READ)
  @ApiOperation({ summary: 'Lookup by VIN, local DB + NHTSA decode' })
  findByVin(@Param('vin') vin: string) { return this.service.findByVin(vin); }

  @Get('customer/:customerId')
  @RequirePermission(VEHICLES_READ)
  @ApiOperation({ summary: 'List vehicles for a customer' })
  findByCustomer(@Param('customerId') customerId: string) { return this.service.findByCustomer(customerId); }

  @Get(':id')
  @RequirePermission(VEHICLES_READ)
  @ApiOperation({ summary: 'Vehicle details' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(VEHICLES_CREATE)
  @ApiOperation({ summary: 'Create vehicle' })
  create(@Body() dto: CreateVehicleDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermission(VEHICLES_UPDATE)
  @ApiOperation({ summary: 'Update vehicle' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) { return this.service.update(id, dto); }
}