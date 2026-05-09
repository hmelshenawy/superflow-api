import { JwtService } from '@nestjs/jwt';

export type RateLimitUser = {
  sub?: string | null;
  role?: string | null;
  workshopId?: string | null;
};

export type RateLimitRequestLike = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: RateLimitUser;
};

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getClientIp(req: RateLimitRequestLike): string {
  const forwardedFor = firstHeader(req.headers?.['x-forwarded-for']);
  const realIp = firstHeader(req.headers?.['x-real-ip']);

  return (
    forwardedFor?.split(',')[0]?.trim() ||
    realIp?.trim() ||
    req.ip ||
    'unknown'
  );
}

function getBearerToken(req: RateLimitRequestLike): string | null {
  const authorization = firstHeader(req.headers?.authorization) ?? firstHeader(req.headers?.Authorization);
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function safePart(value: string | null | undefined): string {
  return (value || 'unknown').replace(/[^a-zA-Z0-9:_-]/g, '_');
}

export function resolveRateLimitUser(req: RateLimitRequestLike, jwtService: JwtService): RateLimitUser | null {
  if (req.user?.sub || req.user?.workshopId || req.user?.role) {
    return req.user;
  }

  const token = getBearerToken(req);
  if (!token) return null;

  try {
    return jwtService.verify<RateLimitUser>(token);
  } catch {
    return null;
  }
}

export function buildRateLimitTracker(req: RateLimitRequestLike, jwtService: JwtService): string {
  const ip = safePart(getClientIp(req));
  const user = resolveRateLimitUser(req, jwtService);

  if (user?.workshopId) {
    // Tenant-scoped bucket: one workshop cannot consume another workshop's quota.
    return `tenant:${safePart(user.workshopId)}`;
  }

  if (user?.sub) {
    // Authenticated platform/admin users without selected workshop get their own bucket.
    return `user:${safePart(user.sub)}`;
  }

  // Public/unauthenticated endpoints: fallback to client IP.
  return `ip:${ip}`;
}
