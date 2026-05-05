import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const SOFT_DELETE_MODELS = new Set(['jobs', 'vehicles', 'media_files']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    this.$use(async (params, next) => {
      if (SOFT_DELETE_MODELS.has(params.model)) {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.action = 'findFirst';
          params.args.where = { ...params.args.where, is_deleted: false };
        } else if (params.action === 'findMany') {
          if (!params.args.where) params.args.where = {};
          if (params.args.where.is_deleted === undefined) {
            params.args.where = { ...params.args.where, is_deleted: false };
          }
        } else if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { is_deleted: true };
        } else if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          if (!params.args.data) params.args.data = {};
          params.args.data = { ...params.args.data, is_deleted: true };
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}