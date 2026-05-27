import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { workshopTenantExtension } from './prisma-tenant.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Unextended base client — same connection pool, no tenant filters.
  // Use for auth guards, billing, admin, and raw SQL queries that must
  // bypass tenant scoping. Previously a separate PrismaClient which
  // doubled the connection pool; now just an alias to `this`.
  readonly raw: PrismaClient = this;

  // Lazy-initialized tenant-scoped client; can't create during class field init
  // because PrismaClient must be connected first
  private _tenant: any = null;

  get tenant(): any {
    if (!this._tenant) {
      this._tenant = this.$extends(workshopTenantExtension);
    }
    return this._tenant;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
