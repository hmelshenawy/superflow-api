// Client-side Sentry initialization
// This file runs in the browser and is auto-detected by Next.js + @sentry/nextjs
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust in production
  tracesSampleRate: 0.15,

  debug: false,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration(),
  ],

  ignoreErrors: [
    'Hydration',
    'MinifiedReactError',
    'NetworkError',
    'Failed to fetch',
    'CancelledError',
  ],

  sendDefaultPii: false,
});

// Instrument navigations for Sentry performance tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;