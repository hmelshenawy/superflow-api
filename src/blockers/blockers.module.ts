import { Module } from '@nestjs/common';
import { BlockersService } from './blockers.service';
import { BlockersController } from './blockers.controller';

@Module({
  controllers: [BlockersController],
  providers: [BlockersService],
  exports: [BlockersService],
})
export class BlockersModule {}