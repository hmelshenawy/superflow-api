import { Module } from '@nestjs/common';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  imports: [PrismaModule],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}