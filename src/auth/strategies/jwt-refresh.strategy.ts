import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => req?.body?.refreshToken as string,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_REFRESH_SECRET', 'superflow-refresh-secret-change-me'),
    });
  }

  async validate(payload: any) {
    return { sub: payload.sub, role: payload.role };
  }
}