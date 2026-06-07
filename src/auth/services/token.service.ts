import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@prisma/prisma.service';
import { hashRefreshToken } from './auth-utils';

@Injectable()
export class TokenService {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Sign a JWT access token with the given payload fields.
   */
  signAccessToken(payload: { sub: string; role: string; permissions: string[]; workshopId: string | null }): string {
    return this.jwt.sign(payload);
  }

  /**
   * Create a new refresh token row in the database.
   * Returns the raw token (shown to the client only once) and stores the hash.
   */
  async createRefreshToken(userId: string, workshopId: string | null): Promise<string> {
    const refreshToken = uuid();
    const refreshHash = hashRefreshToken(refreshToken);
    await this.prisma.raw.refresh_tokens.create({
      data: {
        id: uuid(),
        user_id: userId,
        token_hash: refreshHash,
        workshop_id: workshopId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return refreshToken;
  }

  /**
   * Validate a refresh token, handling both modern SHA-256 and legacy bcrypt hashes.
   * Returns the matched token row or throws.
   * Also detects token reuse (theft indicator) and revokes all sessions if found.
   */
  async validateRefreshToken(rawToken: string) {
    if (!rawToken) throw new UnauthorizedException('Refresh token is required');

    const refreshHash = hashRefreshToken(rawToken);
    let matchedToken = await this.prisma.raw.refresh_tokens.findUnique({
      where: { token_hash: refreshHash },
    });

    // Backward compatibility for legacy bcrypt-hashed refresh tokens.
    // Newer rows use direct SHA-256 lookup for O(1) fetch instead of scanning.
    if (!matchedToken) {
      const legacyTokens = await this.prisma.raw.refresh_tokens.findMany({
        where: {
          revoked_at: null,
          expires_at: { gt: new Date() },
          token_hash: { startsWith: '$2' },
        },
      });

      for (const t of legacyTokens) {
        if (await bcrypt.compare(rawToken, t.token_hash || '')) {
          matchedToken = t;
          break;
        }
      }
    }

    if (!matchedToken?.user_id) throw new UnauthorizedException('Invalid refresh token');

    if (matchedToken.revoked_at) {
      // A revoked token being reused strongly suggests theft: the legitimate user
      // already used this token (which revoked it), so someone else has a copy.
      // Revoke all sessions for this user to contain the damage.
      await this.prisma.raw.refresh_tokens.updateMany({
        where: { user_id: matchedToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected — all sessions revoked');
    }

    if (matchedToken.expires_at && matchedToken.expires_at <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    return matchedToken;
  }

  /**
   * Rotate a refresh token: revoke the old one and issue a new one.
   * Returns { accessToken, refreshToken }.
   */
  async rotateRefreshToken(
    matchedToken: { id: string; user_id: string; workshop_id: string | null },
    user: any,
    rolePermissions: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Revoke the old token
    await this.prisma.raw.refresh_tokens.update({
      where: { id: matchedToken.id },
      data: { revoked_at: new Date() },
    });

    if (!user.is_active) {
      await this.prisma.raw.refresh_tokens.updateMany({
        where: { user_id: matchedToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      throw new UnauthorizedException('User account is inactive');
    }

    const workshopId = matchedToken.workshop_id ?? null;
    const accessToken = this.signAccessToken({
      sub: user.id,
      role: user.roles?.name || 'unknown',
      permissions: rolePermissions,
      workshopId,
    });
    const newRefresh = await this.createRefreshToken(user.id, workshopId);

    return { accessToken, refreshToken: newRefresh };
  }

  /**
   * Revoke all active refresh tokens for a user (full logout).
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.raw.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  /**
   * Revoke all refresh tokens for a user except the most recent one.
   * Used after password change to keep the current session alive.
   */
  async revokeOtherSessions(userId: string, keepSessionId?: string): Promise<void> {
    if (!keepSessionId) {
      await this.revokeAllUserSessions(userId);
      return;
    }
    await this.prisma.raw.refresh_tokens.updateMany({
      where: { user_id: userId, id: { not: keepSessionId }, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  /**
   * Find the most recent active refresh token for a user.
   */
  async findLatestSession(userId: string) {
    return this.prisma.raw.refresh_tokens.findFirst({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Update the workshop_id on a specific refresh token session.
   */
  async updateSessionWorkshop(sessionId: string, workshopId: string): Promise<void> {
    await this.prisma.raw.refresh_tokens.update({
      where: { id: sessionId },
      data: { workshop_id: workshopId },
    });
  }
}