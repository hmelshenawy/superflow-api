import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });
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

    const accessToken = this.jwt.sign({ sub: user.id, role: user.role_id });
    const refreshToken = uuid();
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refresh_tokens.create({
      data: {
        id: uuid(),
        user_id: user.id,
        token_hash: refreshHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email } };
  }

  async refresh(userId: string, refreshToken: string) {
    const tokens = await this.prisma.refresh_tokens.findMany({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
    });

    let matched = false;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.token_hash || '')) {
        matched = true;
        await this.prisma.refresh_tokens.update({ where: { id: t.id }, data: { revoked_at: new Date() } });
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const accessToken = this.jwt.sign({ sub: user.id, role: user.role_id });
    const newRefresh = uuid();
    const newHash = await bcrypt.hash(newRefresh, 10);
    await this.prisma.refresh_tokens.create({
      data: { id: uuid(), user_id: userId, token_hash: newHash, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return { accessToken, refreshToken: newRefresh };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, is_active: true, avatar_url: true, last_login_at: true, created_at: true, roles: { select: { id: true, name: true, permissions: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async logout(userId: string) {
    await this.prisma.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }
}