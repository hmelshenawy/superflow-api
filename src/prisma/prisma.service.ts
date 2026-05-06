import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { workshopTenantExtension } from './prisma-tenant.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Tenant-scoped client — auto-injects workshop_id from AsyncLocalStorage */
  readonly tenant = this.$extends(workshopTenantExtension);

  /** Raw/unscoped client — for global tables (users, roles, workshops) and platform_admin queries */
  get raw(): PrismaClient {
    return this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}