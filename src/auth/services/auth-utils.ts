import * as crypto from 'crypto';

/**
 * Hash a refresh token using SHA-256. Refresh tokens are stored hashed
 * so a DB leak does not expose reusable raw tokens.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Hash a password reset token using SHA-256. Reset tokens are stored
 * hashed for the same reason as refresh tokens.
 */
export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Convert a workshop name into a URL-safe slug.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'workshop';
}

/**
 * Parse a JSON-encoded permissions string into a string array.
 * Returns an empty array for null/undefined/unparseable values.
 */
export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}