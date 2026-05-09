import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { buildRateLimitTracker } from './rate-limit-tracker';

@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  private readonly jwtService: JwtService;

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    config: ConfigService,
  ) {
    super(options, storageService, reflector);
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not set in environment');
    this.jwtService = new JwtService({ secret });
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return buildRateLimitTracker(req, this.jwtService);
  }
}
