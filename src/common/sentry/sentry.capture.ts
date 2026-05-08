import * as Sentry from '@sentry/node';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Sentry error capture — call this inside a NestJS exception filter
 * or wherever you catch unhandled errors.
 *
 * Only reports 5xx server errors to Sentry. 4xx client errors are ignored.
 */
export function captureSentryError(exception: unknown) {
  const status =
    exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

  if (status >= 500) {
    Sentry.captureException(exception);
  }
}