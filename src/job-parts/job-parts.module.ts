import { Module } from '@nestjs/common';
import { JobPartsController } from './job-parts.controller';
import { JobPartsService } from './job-parts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [JobPartsController],
  providers: [JobPartsService],
  imports: [PrismaModule],
  exports: [JobPartsService],
})
export class JobPartsModule {}