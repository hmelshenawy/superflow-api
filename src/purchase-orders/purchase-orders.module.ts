import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  imports: [PrismaModule, InventoryModule],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}