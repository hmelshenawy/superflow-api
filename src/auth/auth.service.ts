import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

    // Clean up expired/revoked refresh tokens for this user
    await this.prisma.refresh_tokens.deleteMany({
      where: { user_id: user.id, OR: [{ revoked_at: { not: null } }, { expires_at: { lte: new Date() } }] },
    }).catch(() => {});

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

  async listSessions(userId: string) {
    const sessions = await this.prisma.refresh_tokens.findMany({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      select: { id: true, created_at: true, expires_at: true },
      orderBy: { created_at: 'desc' },
    });
    return { sessions };
  }

  async revokeSession(sessionId: string, userId: string) {
    const session = await this.prisma.refresh_tokens.findUnique({ where: { id: sessionId } });
    if (!session || session.user_id !== userId) throw new UnauthorizedException('Session not found');
    await this.prisma.refresh_tokens.update({ where: { id: sessionId }, data: { revoked_at: new Date() } });
    return { success: true };
  }

  async updateProfile(userId: string, dto: { name?: string; avatar_url?: string }) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.avatar_url !== undefined) data.avatar_url = dto.avatar_url;
    if (Object.keys(data).length === 0) throw new BadRequestException('No fields to update');

    const user = await this.prisma.users.update({ where: { id: userId }, data, include: { roles: true } });
    const { password_hash, ...result } = user;
    return { ...result, role: result.roles };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || !user.password_hash) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.users.update({ where: { id: userId }, data: { password_hash: hashed } });

    // Revoke all other sessions (keep current one)
    const currentSessions = await this.prisma.refresh_tokens.findMany({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
    // Keep only the most recent session, revoke the rest
    if (currentSessions.length > 1) {
      const keepId = currentSessions[0].id;
      await this.prisma.refresh_tokens.updateMany({
        where: { user_id: userId, id: { not: keepId }, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    return { success: true };
  }
}