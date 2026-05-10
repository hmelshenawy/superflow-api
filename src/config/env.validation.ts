type Env = Record<string, string | undefined>;

const MIN_SECRET_LENGTH = 32;

function isProduction(env: Env) {
  return env.NODE_ENV === 'production';
}

function isBlank(value?: string) {
  return !value || value.trim().length === 0;
}

function isUnsafeSecret(value?: string) {
  if (isBlank(value)) return true;
  const normalized = String(value).toLowerCase();
  return normalized.includes('change-me') || normalized.includes('secret') || normalized.length < MIN_SECRET_LENGTH;
}

function requireVar(env: Env, key: string, errors: string[]) {
  if (isBlank(env[key])) errors.push(`${key} is required`);
}

function requireUrl(env: Env, key: string, errors: string[], allowedProtocols: string[]) {
  const value = env[key];
  requireVar(env, key, errors);
  if (isBlank(value)) return;

  try {
    const url = new URL(value as string);
    if (!allowedProtocols.includes(url.protocol)) {
      errors.push(`${key} must use one of: ${allowedProtocols.join(', ')}`);
    }
  } catch {
    errors.push(`${key} must be a valid URL`);
  }
}

function warn(message: string) {
  // Config validation runs before Nest logging is available.
  console.warn(`[env] ${message}`);
}

export function validateEnvironment(config: Env) {
  const errors: string[] = [];
  const prod = isProduction(config);

  if (prod) {
    requireUrl(config, 'DATABASE_URL', errors, ['mysql:']);
    requireVar(config, 'APP_DOMAIN', errors);
    requireVar(config, 'CORS_ORIGINS', errors);
    requireUrl(config, 'CUSTOMER_PORTAL_URL', errors, ['https:']);
    requireVar(config, 'JWT_SECRET', errors);
    requireVar(config, 'REDIS_HOST', errors);
    requireVar(config, 'REDIS_PORT', errors);
    requireVar(config, 'S3_ENDPOINT', errors);
    requireVar(config, 'S3_REGION', errors);
    requireVar(config, 'S3_BUCKET', errors);
    requireVar(config, 'S3_ACCESS_KEY', errors);
    requireVar(config, 'S3_SECRET_KEY', errors);

    if (isUnsafeSecret(config.JWT_SECRET)) {
      errors.push(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters and not use a placeholder`);
    }
    if (config.JWT_REFRESH_SECRET && isUnsafeSecret(config.JWT_REFRESH_SECRET)) {
      errors.push(`JWT_REFRESH_SECRET must be at least ${MIN_SECRET_LENGTH} characters and not use a placeholder`);
    }
    if (config.CORS_ORIGINS?.split(',').some((origin) => origin.trim() === '*')) {
      errors.push('CORS_ORIGINS must not contain wildcard "*" in production');
    }
    if (config.REDIS_HOST === '127.0.0.1' || config.REDIS_HOST === 'localhost') {
      warn('REDIS_HOST points to localhost in production. In Docker Compose this should usually be "redis".');
    }
    if (config.S3_ACCESS_KEY === 'minioadmin' || config.S3_SECRET_KEY === 'minioadmin') {
      errors.push('S3_ACCESS_KEY/S3_SECRET_KEY must not use default minioadmin credentials in production');
    }
  } else {
    if (isBlank(config.DATABASE_URL)) warn('DATABASE_URL is not set; Prisma-backed flows will fail until configured.');
    if (isBlank(config.JWT_SECRET)) warn('JWT_SECRET is not set; authenticated flows will fail until configured.');
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return config;
}
