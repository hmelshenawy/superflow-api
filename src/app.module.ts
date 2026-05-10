import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { InsightsModule } from './insights/insights.module';
import { BookingImportModule } from './booking-import/booking-import.module';
import { PriorityModule } from './priority/priority.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { WorkshopContextInterceptor } from './common/interceptors/workshop-context.interceptor';
import { TenantThrottlerGuard } from './common/rate-limit/tenant-throttler.guard';
import { validateEnvironment } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
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
    ScheduleModule.forRoot(),
    SchedulerModule,
    InsightsModule,
    BookingImportModule,
    PriorityModule,
    WorkshopsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: WorkshopContextInterceptor,
    },
  ],
})
export class AppModule {}
