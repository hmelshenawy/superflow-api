import { Module } from '@nestjs/common';
import { BookingImportController } from './booking-import.controller';
import { BookingImportService } from './booking-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  ],
  controllers: [BookingImportController],
  providers: [BookingImportService],
  exports: [BookingImportService],
})
export class BookingImportModule {}