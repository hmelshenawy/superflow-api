import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_TOKEN_EXPIRED'
  | 'AUTH_TOKEN_INVALID'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_PERMISSION_DENIED'
  | 'AUTH_TRIAL_EXPIRED'
  | 'AUTH_WORKSHOP_REQUIRED'
  | 'PLAN_FEATURE_REQUIRED'
  | 'PLAN_LIMIT_REACHED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'BAD_REQUEST'
  | 'MEDIA_FILE_BLOCKED'
  | 'MEDIA_FILE_PENDING'
  | 'MEDIA_FILE_TYPE_NOT_ALLOWED'
  | 'MEDIA_FILE_TOO_LARGE'
  | 'INTERNAL_ERROR';

export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, status: number, details?: Record<string, unknown>) {
    super({ statusCode: status, code, message, ...(details && { details }) }, status);
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppException {
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super('NOT_FOUND', message, HttpStatus.NOT_FOUND, details);
  }
}

export class ForbiddenError extends AppException {
  constructor(message = 'Access denied', details?: Record<string, unknown>) {
    super('AUTH_FORBIDDEN', message, HttpStatus.FORBIDDEN, details);
  }
}

export class PermissionDeniedError extends AppException {
  constructor(message = 'Missing permission', details?: Record<string, unknown>) {
    super('AUTH_PERMISSION_DENIED', message, HttpStatus.FORBIDDEN, details);
  }
}

export class TrialExpiredError extends AppException {
  constructor(message = 'Trial has expired', details?: Record<string, unknown>) {
    super('AUTH_TRIAL_EXPIRED', message, HttpStatus.PAYMENT_REQUIRED, details);
  }
}

export class PlanFeatureRequiredError extends AppException {
  constructor(featureKey: string, currentPlan: string, message?: string) {
    super('PLAN_FEATURE_REQUIRED', message || `This feature requires a higher plan.`, HttpStatus.FORBIDDEN, { featureKey, currentPlan });
  }
}

export class PlanLimitReachedError extends AppException {
  constructor(featureKey: string, ceiling: number, current: number, planId: string, message?: string) {
    super('PLAN_LIMIT_REACHED', message || `Plan limit reached for ${featureKey}.`, HttpStatus.PAYMENT_REQUIRED, { featureKey, ceiling, current, planId });
  }
}

export class ConflictError extends AppException {
  constructor(message = 'Resource already exists', details?: Record<string, unknown>) {
    super('CONFLICT', message, HttpStatus.CONFLICT, details);
  }
}

export class BadRequestError extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BAD_REQUEST', message, HttpStatus.BAD_REQUEST, details);
  }
}

export class ValidationError extends AppException {
  constructor(message: string | string[], details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', Array.isArray(message) ? message.join('; ') : message, HttpStatus.BAD_REQUEST, details);
  }
}