import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PartsService } from './parts.service';
import { PartsAnalyticsService } from './parts-analytics.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { ListPartsDto } from './dto/list-parts.dto';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission, PARTS_READ, PARTS_CREATE, PARTS_UPDATE, PARTS_DELETE, STOCK_ANALYTICS } from '../common/permissions';

@ApiTags('Parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('parts')
export class PartsController {
  constructor(
    private service: PartsService,
    private analytics: PartsAnalyticsService,
  ) {}

  @Get('search')
  @RequirePermission(PARTS_READ)
  @ApiOperation({ summary: 'Search parts by name/part number/barcode/brand' })
  search(@Query('q') q: string) { return this.service.search(q); }

  @Get('analytics/demand/:partId')
  @RequirePermission(STOCK_ANALYTICS)
  @ApiOperation({ summary: 'Get demand history for a part' })
  demandHistory(
    @Param('partId') partId: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) { return this.analytics.partDemandHistory(partId, dateFrom, dateTo); }

  @Get('analytics/fast-moving')
  @RequirePermission(STOCK_ANALYTICS)
  @ApiOperation({ summary: 'Get fast-moving parts' })
  fastMoving(
    @Query('limit') limit?: number,
    @Query('days') days?: number,
  ) { return this.analytics.fastMovingParts(limit ? Number(limit) : 20, days ? Number(days) : 30); }

  @Get('analytics/dead-stock')
  @RequirePermission(STOCK_ANALYTICS)
  @ApiOperation({ summary: 'Get dead stock (parts with stock but no consumption)' })
  deadStock(@Query('months') months?: number) {
    return this.analytics.deadStock(months ? Number(months) : 6);
  }

  @Get('analytics/profit')
  @RequirePermission(STOCK_ANALYTICS)
  @ApiOperation({ summary: 'Get parts profit analysis' })
  profit(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) { return this.analytics.partsProfit(dateFrom, dateTo); }

  @Get()
  @RequirePermission(PARTS_READ)
  findAll(@Query() query: ListPartsDto) { return this.service.findAll(query); }

  @Get(':id')
  @RequirePermission(PARTS_READ)
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @RequirePermission(PARTS_CREATE)
  create(@Body() dto: CreatePartDto) { return this.service.create(dto); }

  @Patch(':id')
  @RequirePermission(PARTS_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdatePartDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @RequirePermission(PARTS_DELETE)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}