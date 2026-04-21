import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private service: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List vehicles' })
  findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }

  @Get('vin/:vin')
  @ApiOperation({ summary: 'Lookup by VIN, local DB + NHTSA decode' })
  findByVin(@Param('vin') vin: string) { return this.service.findByVin(vin); }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'List vehicles for a customer' })
  findByCustomer(@Param('customerId') customerId: string) { return this.service.findByCustomer(customerId); }

  @Get(':id')
  @ApiOperation({ summary: 'Vehicle details' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Create vehicle' })
  create(@Body() dto: CreateVehicleDto) { return this.service.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) { return this.service.update(id, dto); }
}
