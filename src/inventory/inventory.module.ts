import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  imports: [PrismaModule],
  exports: [InventoryService],
})
export class InventoryModule {}