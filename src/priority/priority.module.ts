import { Module } from '@nestjs/common';
import { PriorityController } from './priority.controller';
import { PriorityService } from './priority.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PriorityController],
  providers: [PriorityService],
  exports: [PriorityService],
})
export class PriorityModule {}