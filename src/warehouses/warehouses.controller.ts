import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, WAREHOUSES_READ, WAREHOUSES_CREATE, WAREHOUSES_UPDATE } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private service: WarehousesService) {}

  @Get()
  @RequirePermission(WAREHOUSES_READ)
  @ApiOperation({ summary: 'List warehouses' })
  findAll() { return this.service.findAll(); }

  @Get(':id')
  @RequirePermission(WAREHOUSES_READ)
  @ApiOperation({ summary: 'Get warehouse details' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(WAREHOUSES_CREATE)
  @ApiOperation({ summary: 'Create warehouse' })
  create(@Body() dto: CreateWarehouseDto, @CurrentUser('sub') userId: string) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermission(WAREHOUSES_UPDATE)
  @ApiOperation({ summary: 'Update warehouse' })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) { return this.service.update(id, dto); }
}