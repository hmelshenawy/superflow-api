import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/permissions/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PURCHASE_ORDERS_READ, PURCHASE_ORDERS_CREATE, PURCHASE_ORDERS_UPDATE } from '../common/permissions/permissions';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePoItemDto } from './dto/receive-po-item.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  @RequirePermission(PURCHASE_ORDERS_READ)
  @ApiOperation({ summary: 'List purchase orders' })
  findAll(@Query() query: ListPurchaseOrdersDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @RequirePermission(PURCHASE_ORDERS_READ)
  @ApiOperation({ summary: 'Get purchase order details' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermission(PURCHASE_ORDERS_CREATE)
  @ApiOperation({ summary: 'Create a purchase order' })
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.create(dto);
  }

  @Patch(':id/status')
  @RequirePermission(PURCHASE_ORDERS_UPDATE)
  @ApiOperation({ summary: 'Update purchase order status' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status);
  }

  @Post(':id/items/:itemId/receive')
  @RequirePermission(PURCHASE_ORDERS_UPDATE)
  @ApiOperation({ summary: 'Receive a purchase order item' })
  receiveItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: ReceivePoItemDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.receiveItem(itemId, dto, userId);
  }

  @Patch(':id/cancel')
  @RequirePermission(PURCHASE_ORDERS_UPDATE)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}