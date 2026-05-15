import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, SUPPLIERS_READ, SUPPLIERS_CREATE, SUPPLIERS_UPDATE } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private service: SuppliersService) {}

  @Get()
  @RequirePermission(SUPPLIERS_READ)
  @ApiOperation({ summary: 'List suppliers with pagination and optional search' })
  findAll(@Query() dto: ListSuppliersDto) {
    return this.service.findAll(dto);
  }

  @Get(':id')
  @RequirePermission(SUPPLIERS_READ)
  @ApiOperation({ summary: 'Get a single supplier by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission(SUPPLIERS_CREATE)
  @ApiOperation({ summary: 'Create a new supplier' })
  create(@Body() dto: CreateSupplierDto, @CurrentUser('sub') userId: string) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermission(SUPPLIERS_UPDATE)
  @ApiOperation({ summary: 'Update a supplier' })
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(SUPPLIERS_UPDATE)
  @ApiOperation({ summary: 'Soft-delete a supplier' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}