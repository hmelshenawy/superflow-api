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

  private parsePermissions(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // Access tokens are short-lived JWTs, but refresh tokens are treated like
  // durable session secrets. We store only their hash so a DB leak does not
  // expose reusable raw refresh tokens.
  async validateUser(email: string, password: string) {
    const user = await this.prisma.raw.users.findUnique({ where: { email }, include: { roles: true } });
    if (!user || !user.is_active) return null;
    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) return null;
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.raw.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

    await this.prisma.raw.refresh_tokens.deleteMany({
      where: { user_id: user.id, OR: [{ revoked_at: { not: null } }, { expires_at: { lte: new Date() } }] },
    }).catch(() => {});

    const rolePermissions = this.parsePermissions(user.roles?.permissions);
    const roleName = user.roles?.name || 'unknown';

    // Determine workshop context: auto-select if user has exactly one workshop
    const workshops = await this.getUserWorkshops(user.id);
    let workshopId: string | null = null;
    if (workshops.length === 1) {
      workshopId = workshops[0].id;
    }

    const accessToken = this.jwt.sign({ sub: user.id, role: roleName, permissions: rolePermissions, workshopId });
    const refreshToken = uuid();
    const refreshHash = this.hashRefreshToken(refreshToken);

    await this.prisma.raw.refresh_tokens.create({
      data: {
        id: uuid(),
        user_id: user.id,
        token_hash: refreshHash,
        workshop_id: workshopId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: roleName },
      workshops,
      ...(workshopId && { workshopId }),
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token is required');

    const refreshHash = this.hashRefreshToken(refreshToken);
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
        if (await bcrypt.compare(refreshToken, t.token_hash || '')) {
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
    if (matchedToken.expires_at && matchedToken.expires_at <= new Date()) throw new UnauthorizedException('Refresh token expired');

    // Refresh tokens are rotated on every use. Once one refresh succeeds, the
    // previous token is revoked and a brand new refresh token is issued.
    await this.prisma.raw.refresh_tokens.update({ where: { id: matchedToken.id }, data: { revoked_at: new Date() } });

    const user = await this.prisma.raw.users.findUnique({ where: { id: matchedToken.user_id }, include: { roles: true } });
    if (!user) throw new UnauthorizedException();

    const rolePermissions = this.parsePermissions(user.roles?.permissions);
    const workshopId = matchedToken.workshop_id ?? null;
    const accessToken = this.jwt.sign({ sub: user.id, role: user.roles?.name || 'unknown', permissions: rolePermissions, workshopId });
    const newRefresh = uuid();
    const newHash = this.hashRefreshToken(newRefresh);
    await this.prisma.raw.refresh_tokens.create({
      data: { id: uuid(), user_id: user.id, token_hash: newHash, workshop_id: workshopId, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return {
      accessToken,
      refreshToken: newRefresh,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.raw.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, is_active: true, avatar_url: true, last_login_at: true, created_at: true, roles: { select: { id: true, name: true, permissions: true } } },
    });
    if (!user) throw new UnauthorizedException();
    const { roles, ...rest } = user;
    const workshops = await this.getUserWorkshops(userId);
    return {
      ...rest,
      role: roles ? { ...roles, permissions: this.parsePermissions(roles.permissions) } : null,
      workshops,
    };
  }

  async getUserWorkshops(userId: string) {
    const accesses = await this.prisma.raw.user_workshop_access.findMany({
      where: { user_id: userId },
      include: { workshops: { select: { id: true, name: true, slug: true, is_active: true } } },
    });
    return accesses.map((a: any) => a.workshops).filter((w: any) => w.is_active);
  }

  async selectWorkshop(userId: string, workshopId: string) {
    const access = await this.prisma.raw.user_workshop_access.findUnique({
      where: { user_id_workshop_id: { user_id: userId, workshop_id: workshopId } },
    });
    if (!access) throw new BadRequestException('You do not have access to this workshop');

    const workshop = await this.prisma.raw.workshops.findUnique({ where: { id: workshopId } });
    if (!workshop || !workshop.is_active) throw new BadRequestException('Workshop not found or inactive');

    const user = await this.prisma.raw.users.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!user) throw new UnauthorizedException();

    const rolePermissions = this.parsePermissions(user.roles?.permissions);
    const accessToken = this.jwt.sign({ sub: user.id, role: user.roles?.name || 'unknown', permissions: rolePermissions, workshopId });

    // Update the most recent refresh token to carry the new workshop context
    const latestSession = await this.prisma.raw.refresh_tokens.findFirst({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      orderBy: { created_at: 'desc' },
    });
    if (latestSession) {
      await this.prisma.raw.refresh_tokens.update({ where: { id: latestSession.id }, data: { workshop_id: workshopId } });
    }

    return {
      accessToken,
      workshop: { id: workshop.id, name: workshop.name, slug: workshop.slug },
    };
  }

  async logout(userId: string) {
    // Current behavior is a full logout across all active sessions for the user,
    // not just the device that initiated the request.
    await this.prisma.raw.refresh_tokens.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  async listSessions(userId: string) {
    const sessions = await this.prisma.raw.refresh_tokens.findMany({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } },
      select: { id: true, created_at: true, expires_at: true },
      orderBy: { created_at: 'desc' },
    });
    return { sessions };
  }

  async revokeSession(sessionId: string, userId: string) {
    const session = await this.prisma.raw.refresh_tokens.findUnique({ where: { id: sessionId } });
    if (!session || session.user_id !== userId) throw new UnauthorizedException('Session not found');
    await this.prisma.raw.refresh_tokens.update({ where: { id: sessionId }, data: { revoked_at: new Date() } });
    return { success: true };
  }

  async updateProfile(userId: string, dto: { name?: string; avatar_url?: string }) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.avatar_url !== undefined) data.avatar_url = dto.avatar_url;
    if (Object.keys(data).length === 0) throw new BadRequestException('No fields to update');

    const user = await this.prisma.raw.users.update({ where: { id: userId }, data, include: { roles: true } });
    const { password_hash, ...result } = user;
    return { ...result, role: result.roles };
  }

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
      await this.prisma.raw.refresh_tokens.updateMany({
        where: { user_id: userId, id: { not: keepId }, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    }

    return { success: true };
  }
}