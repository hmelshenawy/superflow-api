import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma/prisma.module';
import { DmsController } from './dms.controller';
import { DmsService } from './dms.service';

@Module({
  imports: [PrismaModule],
  controllers: [DmsController],
  providers: [DmsService],
})
export class DmsModule {}
