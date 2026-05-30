import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService } from './token.service';
import { hashPasswordResetToken } from './auth-utils';

@Injectable()
export class PasswordService {
  constructor(
    private prisma: PrismaService,
    private tokenService: TokenService,
  ) {}

  /**
   * Validate a user's email/password credentials, checking account lockout.
   * Returns the user record if valid, null if credentials don't match.
   * Throws if the account is temporarily locked.
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.raw.users.findUnique({ where: { email }, include: { roles: true } });
    if (!user || !user.is_active) return null;

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMin = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account temporarily locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`);
    }

    // Clear lockout if expired
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await this.prisma.raw.users.update({ where: { id: user.id }, data: { failed_login_attempts: 0, locked_until: null } });
    }

    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) return null;
    return user;
  }

  /**
   * Change a user's password after verifying the current one.
   * Revokes all other sessions (keeps the most recent one).
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.raw.users.findUnique({ where: { id: userId } });
    if (!user || !user.password_hash) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.raw.users.update({ where: { id: userId }, data: { password_hash: hashed } });

    // Revoke all other sessions (keep current one).
    // This reduces account takeover risk after a password change while avoiding
    // the awkward UX of immediately kicking out the session that changed it.
    const currentSessions = await this.prisma.raw.refresh_tokens.findMany({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
    // Keep only the most recent session, revoke the rest
    if (currentSessions.length > 1) {
      const keepId = currentSessions[0].id;
      await this.tokenService.revokeOtherSessions(userId, keepId);
    }

    return { success: true };
  }

  /**
   * Reset a user's password using a reset token emailed via forgotPassword.
   * Invalidates the token and revokes all sessions.
   */
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashPasswordResetToken(token);
    const resetToken = await this.prisma.raw.password_reset_tokens.findUnique({ where: { token_hash: tokenHash } });

    if (!resetToken?.user_id || resetToken.used_at || resetToken.expires_at <= new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.raw.$transaction([
      this.prisma.raw.users.update({ where: { id: resetToken.user_id }, data: { password_hash: hashed, failed_login_attempts: 0, locked_until: null } }),
      this.prisma.raw.password_reset_tokens.update({ where: { id: resetToken.id }, data: { used_at: new Date() } }),
      this.prisma.raw.refresh_tokens.updateMany({
        where: { user_id: resetToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    return { success: true };
  }
}