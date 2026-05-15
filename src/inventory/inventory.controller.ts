import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/permissions/require-permission.decorator';
import { PARTS_READ, STOCK_ADJUST, STOCK_TRANSFER } from '../common/permissions/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('low-stock')
  @RequirePermission(PARTS_READ)
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Get(':partId')
  @RequirePermission(PARTS_READ)
  @ApiOperation({ summary: 'Get stock by part' })
  getStockByPart(@Param('partId') partId: string) {
    return this.inventoryService.getStockByPart(partId);
  }

  @Post('adjust')
  @RequirePermission(STOCK_ADJUST)
  @ApiOperation({ summary: 'Adjust stock manually' })
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.adjustStock(dto, userId);
  }

  @Post('transfer')
  @RequirePermission(STOCK_TRANSFER)
  @ApiOperation({ summary: 'Transfer stock between warehouses' })
  transferStock(@Body() dto: TransferStockDto, @CurrentUser('sub') userId: string) {
    return this.inventoryService.transferStock(dto, userId);
  }
}