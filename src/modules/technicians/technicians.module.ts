import { Module } from '@nestjs/common';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';
import { PrismaModule } from '@prisma/prisma.module';
import { PriorityModule } from '@modules/jobs/priority/priority.module';

@Module({
  imports: [PrismaModule, PriorityModule],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService],
})
export class TechniciansModule {}
