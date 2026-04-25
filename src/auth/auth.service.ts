import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private hashRefreshToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.users.findUnique({ where: { email }, include: { roles: true } });
    if (!user || !user.is_active) return null;
    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) return null;
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Update last login
    await this.prisma.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

    const accessToken = this.jwt.sign({ sub: user.id, role: user.roles?.name || 'unknown' });
    const refreshToken = uuid();
    const refreshHash = this.hashRefreshToken(refreshToken);

    await this.prisma.refresh_tokens.create({
      data: {
        id: uuid(),
        user_id: user.id,
        token_hash: refreshHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.roles?.name },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const refreshHash = this.hashRefreshToken(refreshToken);
    let matchedToken = await this.prisma.refresh_tokens.findUnique({
      where: { token_hash: refreshHash },
    });

    // Backward compatibility for legacy bcrypt-hashed refresh tokens.
    if (!matchedToken) {
      const legacyTokens = await this.prisma.refresh_tokens.findMany({
        where: {
          revoked_at: null,
          expires_at: { gt: new Date() },
          token_hash: { startsWith: '$2' },
        },
      });

      for (const t of legacyTokens) {
        if (await bcrypt.compare(refreshToken, t.token_hash || '')) {
          matchedToken = t;
          break;
        }
      }
    }

    if (!matchedToken?.user_id) throw new UnauthorizedException('Invalid refresh token');
    if (matchedToken.revoked_at) throw new UnauthorizedException('Refresh token revoked');
    if (matchedToken.expires_at && matchedToken.expires_at <= new Date()) throw new UnauthorizedException('Refresh token expired');

    await this.prisma.refresh_tokens.update({ where: { id: matchedToken.id }, data: { revoked_at: new Date() } });

    const user = await this.prisma.users.findUnique({ where: { id: matchedToken.user_id }, include: { roles: true } });
    if (!user) throw new UnauthorizedException();

    const accessToken = this.jwt.sign({ sub: user.id, role: user.roles?.name || 'unknown' });
    const newRefresh = uuid();
    const newHash = this.hashRefreshToken(newRefresh);
    await this.prisma.refresh_tokens.create({
      data: { id: uuid(), user_id: user.id, token_hash: newHash, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return {
      accessToken,
      refreshToken: newRefresh,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, is_active: true, avatar_url: true, last_login_at: true, created_at: true, roles: { select: { id: true, name: true, permissions: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return {
      ...user,
      role: user.roles,
    };
  }

  async logout(userId: string) {
    await this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }
}