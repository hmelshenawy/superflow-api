import { Module } from '@nestjs/common';
import { WorkshopsController } from './workshops.controller';
import { BranchesController } from './branches.controller';
import { WorkshopsService } from './workshops.service';

@Module({
  controllers: [WorkshopsController, BranchesController],
  providers: [WorkshopsService],
})
export class WorkshopsModule {}
