import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('Sentry: No SENTRY_DSN set — skipping init');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || 'superflow-api@0.1.0',

    // Performance monitoring
    tracesSampleRate: 0.15, // 15% of transactions

    // Don't send PII
    sendDefaultPii: false,

    // Ignore noisy non-error stuff
    ignoreErrors: [
      'NotFoundException',
      'UnauthorizedException',
      'BadRequestException',
      'ThrottlerException',
    ],

    // Integrate with NestJS HTTP
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],

    // Before send — redact any remaining sensitive data
    beforeSend(event: Sentry.ErrorEvent, _hint: Sentry.EventHint) {
      // Redact request headers that might contain tokens
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  });

  console.log(`Sentry: initialized in ${process.env.NODE_ENV || 'development'}`);
}