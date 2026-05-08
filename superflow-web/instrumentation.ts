// Server-side Sentry initialization
// Next.js automatically calls this file's register() function on server startup
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.15,
      debug: false,
      sendDefaultPii: false,
      ignoreErrors: [
        'NotFoundError',
        'UnauthorizedError',
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.15,
      debug: false,
      sendDefaultPii: false,
    });
  }
}