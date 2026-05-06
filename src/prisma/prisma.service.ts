import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { workshopTenantExtension } from './prisma-tenant.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Raw/unscoped client — for global tables (users, roles, workshops) and platform_admin queries.
   *  We create a separate PrismaClient instance because $extends creates a proxy
   *  that shadows the base models on `this`. The `raw` getter can't return `this`
   *  because `this.tenant` (the extended client) overrides model access. */
  readonly raw = new PrismaClient();

  /** Tenant-scoped client — auto-injects workshop_id from AsyncLocalStorage */
  readonly tenant = this.$extends(workshopTenantExtension);

  async onModuleInit() {
    await this.$connect();
    await this.raw.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.raw.$disconnect();
  }
}