import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '@prisma/prisma.service';
import { PRODUCT_MODE_DISPLAY_NAMES, defaultEnabledModules, normalizeProductMode, type ProductMode } from '@common/product-modes';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { AuthEmailService } from './services/auth-email.service';
import { hashRefreshToken, hashPasswordResetToken, slugify, parsePermissions } from './services/auth-utils';

@Injectable()
export class AuthService {
  private MAX_LOGIN_ATTEMPTS = 5;
  private LOCKOUT_MINUTES = 15;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private emailService: AuthEmailService,
  ) {}

  private async uniqueWorkshopSlug(name: string) {
    const base = slugify(name);
    let slug = base;
    let i = 1;
    while (await this.prisma.raw.workshops.findUnique({ where: { slug } })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    return slug;
  }

  async signup(dto: { workshopName: string; name: string; email: string; password: string; phone?: string; region?: string; productMode?: ProductMode }) {
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
    const productMode = normalizeProductMode(dto.productMode);
    const enabledModules = defaultEnabledModules(productMode);
    const packageName = PRODUCT_MODE_DISPLAY_NAMES[productMode];

    await this.prisma.raw.$transaction([
      this.prisma.raw.workshops.create({
        data: {
          id: workshopId,
          name: dto.workshopName.trim(),
          slug,
          code: dto.workshopName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20) || 'WS' + Math.floor(Math.random() * 10000),
          phone: dto.phone || null,
          email,
          region: dto.region || 'gcc',
          is_active: true,
          plan_id: 'free_trial',
          product_mode: productMode,
          dms_integration_enabled: productMode === 'CONNECT',
          enabled_modules: JSON.stringify(enabledModules),
          package_name: packageName,
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

    await this.emailService.sendSignupWelcomeEmail({
      email,
      name: dto.name.trim(),
      workshopName: dto.workshopName.trim(),
      workshopId,
      trialEndsAt,
    });

    const rolePermissions = parsePermissions(role.permissions);
    const accessToken = this.tokenService.signAccessToken({ sub: userId, role: role.name || 'workshop_admin', permissions: rolePermissions, workshopId });
    const refreshToken = await this.tokenService.createRefreshToken(userId, workshopId);

    return {
      accessToken,
      refreshToken,
      workshopId,
      workshop: {
        id: workshopId,
        name: dto.workshopName.trim(),
        slug,
        plan_id: 'free_trial',
        product_mode: productMode,
        dms_integration_enabled: productMode === 'CONNECT',
        enabled_modules: enabledModules,
        package_name: packageName,
        trial_ends_at: trialEndsAt.toISOString(),
      },
      subscription: { plan_id: 'free_trial', status: 'trialing', trial_ends_at: trialEndsAt.toISOString() },
      user: { id: userId, name: dto.name.trim(), email, role: role.name || 'workshop_admin' },
    };
  }

  async validateUser(email: string, password: string) {
    return this.passwordService.validateUser(email, password);
  }

  async login(email: string, password: string) {
    // Check lockout before validation to give clear error message
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prisma.raw.users.findUnique({ where: { email: normalizedEmail } });
    if (existingUser?.locked_until && new Date(existingUser.locked_until) > new Date()) {
      const remainingMin = Math.ceil((new Date(existingUser.locked_until).getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account temporarily locked. Try again in ${remainingMin} minute${remainingMin !== 1 ? 's' : ''}.`);
    }

    const user = await this.validateUser(email, password);
    if (!user) {
      // Increment failed attempts
      if (existingUser) {
        const attempts = (existingUser.failed_login_attempts || 0) + 1;
        if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
          const lockedUntil = new Date(Date.now() + this.LOCKOUT_MINUTES * 60 * 1000);
          await this.prisma.raw.users.update({
            where: { id: existingUser.id },
            data: { failed_login_attempts: attempts, locked_until: lockedUntil },
          });
          throw new UnauthorizedException(`Account locked due to too many failed attempts. Try again in ${this.LOCKOUT_MINUTES} minutes.`);
        }
        await this.prisma.raw.users.update({
          where: { id: existingUser.id },
          data: { failed_login_attempts: attempts },
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear failed attempts on successful login
    await this.prisma.raw.users.update({ where: { id: user.id }, data: { last_login_at: new Date(), failed_login_attempts: 0, locked_until: null } });

    await this.prisma.raw.refresh_tokens.deleteMany({
      where: { user_id: user.id, OR: [{ revoked_at: { not: null } }, { expires_at: { lte: new Date() } }] },
    }).catch(() => {});

    const rolePermissions = parsePermissions(user.roles?.permissions);
    const roleName = user.roles?.name || 'unknown';

    // Determine workshop context: auto-select if user has exactly one workshop
    const workshops = await this.getUserWorkshops(user.id);
    let workshopId: string | null = null;
    if (workshops.length === 1) {
      workshopId = workshops[0].id;
    }

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, role: roleName, permissions: rolePermissions, workshopId });
    const refreshToken = await this.tokenService.createRefreshToken(user.id, workshopId);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: roleName },
      workshops,
      ...(workshopId && { workshopId }),
    };
  }

  async refresh(refreshToken: string) {
    const matchedToken = await this.tokenService.validateRefreshToken(refreshToken);

    const user = await this.prisma.raw.users.findUnique({ where: { id: matchedToken.user_id! }, include: { roles: true } });
    if (!user?.is_active) {
      await this.tokenService.revokeAllUserSessions(matchedToken.user_id!);
      throw new UnauthorizedException('User account is inactive');
    }

    const rolePermissions = parsePermissions(user.roles?.permissions);
    return this.tokenService.rotateRefreshToken(
      { id: matchedToken.id, user_id: matchedToken.user_id!, workshop_id: matchedToken.workshop_id },
      user,
      rolePermissions,
    );
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
    const tokenHash = hashPasswordResetToken(rawToken);
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

    await this.emailService.sendPasswordResetEmail({
      userId: user.id,
      email: user.email || normalizedEmail,
      name: user.name,
      resetUrl,
    });

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    return this.passwordService.resetPassword(token, newPassword);
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
      role: roles ? { ...roles, permissions: parsePermissions(roles.permissions) } : null,
      workshops,
    };
  }

  async getUserWorkshops(userId: string) {
    const user = await this.prisma.raw.users.findUnique({ where: { id: userId }, include: { roles: true } });
    const roleName = user?.roles?.name;
    // platform_admin sees all active workshops regardless of assignment
    if (roleName === 'platform_admin') {
      return this.prisma.raw.workshops.findMany({ where: { is_active: true }, select: { id: true, name: true, slug: true, is_active: true, plan_id: true, product_mode: true, dms_integration_enabled: true, enabled_modules: true, package_name: true, display_name: true, trial_ends_at: true, subscriptions: { orderBy: { created_at: 'desc' }, take: 1, include: { plans: true } } } as any });
    }
    const accesses = await this.prisma.raw.user_workshop_access.findMany({
      where: { user_id: userId },
      include: { workshops: { select: { id: true, name: true, slug: true, is_active: true, plan_id: true, product_mode: true, dms_integration_enabled: true, enabled_modules: true, package_name: true, display_name: true, trial_ends_at: true, subscriptions: { orderBy: { created_at: 'desc' }, take: 1, include: { plans: true } } } as any } },
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
        features: features.map((f: {
          feature_key: string;
          is_included: boolean;
          ceiling: number | null;
          overage_unit_cents: number | null;
        }) => ({
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

    const rolePermissions = parsePermissions(user.roles?.permissions);
    const accessToken = this.tokenService.signAccessToken({ sub: user.id, role: user.roles?.name || 'unknown', permissions: rolePermissions, workshopId });

    // Update the most recent refresh token to carry the new workshop context
    const latestSession = await this.tokenService.findLatestSession(userId);
    if (latestSession) {
      await this.tokenService.updateSessionWorkshop(latestSession.id, workshopId);
    }

    return {
      accessToken,
      workshop: {
        id: workshop.id,
        name: workshop.name,
        slug: workshop.slug,
        plan_id: workshop.plan_id,
        product_mode: (workshop as any).product_mode,
        dms_integration_enabled: (workshop as any).dms_integration_enabled,
        enabled_modules: (workshop as any).enabled_modules,
        package_name: (workshop as any).package_name,
        display_name: (workshop as any).display_name,
        trial_ends_at: workshop.trial_ends_at,
      },
    };
  }

  async logout(userId: string) {
    // Current behavior is a full logout across all active sessions for the user,
    // not just the device that initiated the request.
    await this.tokenService.revokeAllUserSessions(userId);
  }

  async logoutRefreshToken(refreshToken: string) {
    if (!refreshToken) return;
    const refreshHash = hashRefreshToken(refreshToken);
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
    return this.passwordService.changePassword(userId, currentPassword, newPassword);
  }
}
