import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { EstimatesModule } from './modules/estimates/estimates.module';
import { AuthorisationModule } from './modules/authorisations/authorisation.module';
import { DeferredModule } from './deferred/deferred.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { AdminModule } from './admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { InsightsModule } from './modules/insights/insights.module';
import { BookingImportModule } from './booking-import/booking-import.module';
import { PriorityModule } from './priority/priority.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { BillingModule } from './billing/billing.module';
import { BlockersModule } from './blockers/blockers.module';
import { SuppliersModule } from './modules/parts/suppliers/suppliers.module';
import { WarehousesModule } from './modules/inventory/warehouses/warehouses.module';
import { PartsModule } from './modules/parts/parts.module';
import { StockMovementsModule } from './modules/parts/stock-movements/stock-movements.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { JobPartsModule } from './job-parts/job-parts.module';
import { PurchaseOrdersModule } from './modules/parts/purchase-orders/purchase-orders.module';
import { QcChecklistsModule } from './qc-checklists/qc-checklists.module';
import { DmsModule } from './dms/dms.module';
import { CrmModule } from './modules/customers/crm/crm.module';
import { JobTypesModule } from './job-types/job-types.module';
import { WorkshopScheduleModule } from './schedule/schedule.module';
import { StaffModule } from './modules/technicians/staff/staff.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { WorkshopContextInterceptor } from './common/interceptors/workshop-context.interceptor';
import { TenantThrottlerGuard } from './common/rate-limit/tenant-throttler.guard';
import { PlanFeatureGuard } from './common/guards/plan-feature.guard';
import { WorkshopGuard } from './common/guards/workshop.guard';
import { ProductModuleGuard } from './common/product-modes';
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
    BillingModule,
    BlockersModule,
    SuppliersModule,
    WarehousesModule,
    PartsModule,
    StockMovementsModule,
    InventoryModule,
    JobPartsModule,
    PurchaseOrdersModule,
    QcChecklistsModule,
    DmsModule,
    CrmModule,
    JobTypesModule,
    WorkshopScheduleModule,
    StaffModule,
    AppointmentsModule,
    InvoicesModule,
    TechniciansModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: WorkshopGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PlanFeatureGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ProductModuleGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: WorkshopContextInterceptor,
    },
  ],
})
export class AppModule {}
