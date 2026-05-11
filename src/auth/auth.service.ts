import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private notifications: NotificationsService,
  ) {}

  private hashRefreshToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private hashPasswordResetToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'workshop';
  }

  private async uniqueWorkshopSlug(name: string) {
    const base = this.slugify(name);
    let slug = base;
    let i = 1;
    while (await this.prisma.raw.workshops.findUnique({ where: { slug } })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    return slug;
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

  async signup(dto: { workshopName: string; name: string; email: string; password: string; phone?: string; region?: string }) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.raw.users.findUnique({ where: { email } });
    if (existingUser) throw new ConflictException('Email already exists');

    const role = await this.prisma.raw.roles.findFirst({ where: { name: 'workshop_admin' } });
    if (!role) throw new BadRequestException('Default workshop_admin role is missing');

    const workshopId = uuid();
    const userId = uuid();
    const slug = await this.uniqueWorkshopSlug(dto.workshopName);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await this.prisma.raw.$transaction([
      this.prisma.raw.workshops.create({
        data: {
          id: workshopId,
          name: dto.workshopName.trim(),
          slug,
          phone: dto.phone || null,
          email,
          region: dto.region || 'gcc',
          is_active: true,
          plan_id: 'free_trial',
          trial_ends_at: trialEndsAt,
        },
      }),
      this.prisma.raw.users.create({
        data: {
          id: userId,
          role_id: role.id,
          name: dto.name.trim(),
          email,
          password_hash: passwordHash,
          is_active: true,
        },
      }),
      this.prisma.raw.user_workshop_access.create({
        data: { id: uuid(), user_id: userId, workshop_id: workshopId, assigned_at: new Date() },
      }),
      this.prisma.raw.subscriptions.create({
        data: {
          id: uuid(),
          workshop_id: workshopId,
          plan_id: 'free_trial',
          region: dto.region || 'gcc',
          status: 'trialing',
          trial_ends_at: trialEndsAt,
          current_period_starts_at: new Date(),
          current_period_ends_at: trialEndsAt,
          billing_email: email,
        },
      }),
    ]);

    await this.notifications.enqueue({
      channel: 'email',
      recipient: email,
      subject: 'Welcome to PrioraFlow',
      workshopId,
      body: [
        `Hi ${dto.name.trim()},`,
        '',
        `Your PrioraFlow workspace "${dto.workshopName.trim()}" is ready.`,
        '',
        'You can now log in and start setting up your workshop team, jobs, customers, and approvals.',
        '',
        `Your 14-day free trial ends on ${trialEndsAt.toISOString().slice(0, 10)}.`,
      ].join('\n'),
      provider: 'resend',
    }).catch(() => {});

    const rolePermissions = this.parsePermissions(role.permissions);
    const accessToken = this.jwt.sign({ sub: userId, role: role.name || 'workshop_admin', permissions: rolePermissions, workshopId });
    const refreshToken = uuid();
    await this.prisma.raw.refresh_tokens.create({
      data: {
        id: uuid(),
        user_id: userId,
        token_hash: this.hashRefreshToken(refreshToken),
        workshop_id: workshopId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      workshopId,
      workshop: { id: workshopId, name: dto.workshopName.trim(), slug, plan_id: 'free_trial', trial_ends_at: trialEndsAt.toISOString() },
      subscription: { plan_id: 'free_trial', status: 'trialing', trial_ends_at: trialEndsAt.toISOString() },
      user: { id: userId, name: dto.name.trim(), email, role: role.name || 'workshop_admin' },
    };
  }

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
    if (!user?.is_active) {
      await this.prisma.raw.refresh_tokens.updateMany({
        where: { user_id: matchedToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      throw new UnauthorizedException('User account is inactive');
    }

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


  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.raw.users.findUnique({ where: { email: normalizedEmail } });

    // Always return success to prevent email enumeration.
    if (!user?.id || !user.is_active) {
      return { success: true };
    }

    await this.prisma.raw.password_reset_tokens.updateMany({
      where: { user_id: user.id, used_at: null, expires_at: { gt: new Date() } },
      data: { used_at: new Date() },
    }).catch(() => {});

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.raw.password_reset_tokens.create({
      data: {
        id: uuid(),
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    const appUrl = (this.config.get<string>('APP_URL') || this.config.get<string>('FRONTEND_URL') || `https://${this.config.get<string>('APP_DOMAIN', 'prioraflow.com')}`).replace(/\/$/, '');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    const userWorkshop = await this.prisma.raw.user_workshop_access.findFirst({
      where: { user_id: user.id },
      select: { workshop_id: true },
    });
    const fallbackWorkshop = userWorkshop?.workshop_id
      ? null
      : await this.prisma.raw.workshops.findFirst({ where: { is_active: true }, select: { id: true } });

    await this.notifications.enqueue({
      channel: 'email',
      recipient: user.email || normalizedEmail,
      subject: 'Reset your PrioraFlow password',
      workshopId: userWorkshop?.workshop_id || fallbackWorkshop?.id || null,
      body: [
        `Hi ${user.name || 'there'},`,
        '',
        'We received a request to reset your PrioraFlow password.',
        '',
        `Reset link: ${resetUrl}`,
        '',
        'This link expires in 1 hour. If you did not request this, you can ignore this email.',
      ].join('\n'),
      provider: 'resend',
    });

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashPasswordResetToken(token);
    const resetToken = await this.prisma.raw.password_reset_tokens.findUnique({ where: { token_hash: tokenHash } });

    if (!resetToken?.user_id || resetToken.used_at || resetToken.expires_at <= new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.raw.$transaction([
      this.prisma.raw.users.update({ where: { id: resetToken.user_id }, data: { password_hash: hashed } }),
      this.prisma.raw.password_reset_tokens.update({ where: { id: resetToken.id }, data: { used_at: new Date() } }),
      this.prisma.raw.refresh_tokens.updateMany({
        where: { user_id: resetToken.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.raw.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, is_active: true, avatar_url: true, last_login_at: true, created_at: true, roles: { select: { id: true, name: true, permissions: true } } },
    });
    if (!user?.is_active) throw new UnauthorizedException();
    const { roles, ...rest } = user;
    const workshops = await this.getUserWorkshops(userId);
    return {
      ...rest,
      role: roles ? { ...roles, permissions: this.parsePermissions(roles.permissions) } : null,
      workshops,
    };
  }

  async getUserWorkshops(userId: string) {
    const user = await this.prisma.raw.users.findUnique({ where: { id: userId }, include: { roles: true } });
    const roleName = user?.roles?.name;
    // platform_admin sees all active workshops regardless of assignment
    if (roleName === 'platform_admin') {
      return this.prisma.raw.workshops.findMany({ where: { is_active: true }, select: { id: true, name: true, slug: true, is_active: true, plan_id: true, trial_ends_at: true, subscriptions: { orderBy: { created_at: 'desc' }, take: 1, include: { plans: true } } } });
    }
    const accesses = await this.prisma.raw.user_workshop_access.findMany({
      where: { user_id: userId },
      include: { workshops: { select: { id: true, name: true, slug: true, is_active: true, plan_id: true, trial_ends_at: true, subscriptions: { orderBy: { created_at: 'desc' }, take: 1, include: { plans: true } } } } },
    });
    return accesses.map((a: any) => a.workshops).filter((w: any) => w.is_active);
  }

  async getSubscriptionStatus(workshopId: string) {
    const subscription = await this.prisma.raw.subscriptions.findFirst({
      where: { workshop_id: workshopId },
      orderBy: { created_at: 'desc' },
      include: { plans: true },
    });
    if (!subscription) return null;

    const planId = subscription.plan_id || 'free_trial';
    const region = subscription.region || 'gcc';

    const [features, regionPrice] = await Promise.all([
      this.prisma.raw.plan_features.findMany({ where: { plan_id: planId } }),
      this.prisma.raw.plan_regions.findUnique({
        where: { plan_id_region: { plan_id: planId, region } },
      }),
    ]);

    return {
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.plan_id,
      region: subscription.region,
      additional_locations: subscription.additional_locations,
      billing_model: subscription.billing_model,
      trial_ends_at: subscription.trial_ends_at,
      current_period_ends_at: subscription.current_period_ends_at,
      provider_name: subscription.provider_name,
      provider_customer_id: subscription.provider_customer_id,
      provider_subscription_id: subscription.provider_subscription_id,
      billing_email: subscription.billing_email,
      cancel_at_period_end: subscription.cancel_at_period_end,
      plan: {
        ...subscription.plans,
        price: regionPrice?.price_monthly_cents ?? subscription.plans.price_monthly_cents,
        currency: regionPrice?.currency ?? subscription.plans.currency,
        features: features.map(f => ({
          key: f.feature_key,
          isIncluded: f.is_included,
          ceiling: f.ceiling,
          overageUnitCents: f.overage_unit_cents,
        })),
      },
    };
  }

  async getBillingOverview(workshopId: string) {
    const [subscription, invoices, payments, gateways] = await Promise.all([
      this.getSubscriptionStatus(workshopId),
      this.prisma.raw.invoices.findMany({
        where: { workshop_id: workshopId },
        orderBy: [{ issued_at: 'desc' }, { created_at: 'desc' }],
        take: 10,
        include: { invoice_items: true },
      }),
      this.prisma.raw.payments.findMany({
        where: { workshop_id: workshopId },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { payment_gateways: true },
      }),
      this.prisma.raw.payment_gateways.findMany({
        where: { is_active: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      subscription,
      invoices,
      payments,
      gateways,
      gateway_locked: false,
    };
  }

  async selectWorkshop(userId: string, workshopId: string) {
    const user = await this.prisma.raw.users.findUnique({ where: { id: userId }, include: { roles: true } });
    if (!user?.is_active) throw new UnauthorizedException();

    const roleName = user.roles?.name;
    // platform_admin can select any workshop; others must have explicit access
    if (roleName !== 'platform_admin') {
      const access = await this.prisma.raw.user_workshop_access.findUnique({
        where: { user_id_workshop_id: { user_id: userId, workshop_id: workshopId } },
      });
      if (!access) throw new BadRequestException('You do not have access to this workshop');
    }

    const workshop = await this.prisma.raw.workshops.findUnique({ where: { id: workshopId } });
    if (!workshop || !workshop.is_active) throw new BadRequestException('Workshop not found or inactive');

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
      workshop: { id: workshop.id, name: workshop.name, slug: workshop.slug, plan_id: workshop.plan_id, trial_ends_at: workshop.trial_ends_at },
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

  async logoutRefreshToken(refreshToken: string) {
    if (!refreshToken) return;
    const refreshHash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.raw.refresh_tokens.findUnique({
      where: { token_hash: refreshHash },
    });
    if (!session?.user_id) return;
    await this.logout(session.user_id);
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
