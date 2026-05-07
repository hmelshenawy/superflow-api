import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { workshopTenantExtension } from './prisma-tenant.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  readonly raw = new PrismaClient();
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
    await this.raw.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.raw.$disconnect();
  }
}
