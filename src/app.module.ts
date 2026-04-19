import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { JobsModule } from './jobs/jobs.module';
import { InspectionsModule } from './inspections/inspections.module';
import { EstimatesModule } from './estimates/estimates.module';
import { AuthorisationModule } from './authorisation/authorisation.module';
import { DeferredModule } from './deferred/deferred.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    VehiclesModule,
    JobsModule,
    InspectionsModule,
    EstimatesModule,
    AuthorisationModule,
    DeferredModule,
    MediaModule,
    NotificationsModule,
    AuditModule,
    AdminModule,
  ],
})
export class AppModule {}