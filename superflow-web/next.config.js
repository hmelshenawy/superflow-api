const { withSentryConfig } = require("@sentry/nextjs");

const isProduction = process.env.NODE_ENV === "production";

function getOrigin(url) {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

const apiOrigin = getOrigin(process.env.NEXT_PUBLIC_API_URL);
const connectSrc = [
  "'self'",
  apiOrigin && apiOrigin !== "'self'" ? apiOrigin : null,
  "https://*.ingest.sentry.io",
  "https://*.ingest.us.sentry.io",
  "https://*.sentry.io",
].filter(Boolean);

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(" ")}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isProduction ? "upgrade-insecure-requests" : "",
].filter(Boolean);

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry webpack plugin — uploads source maps and injects Sentry init
const sentryWebpackPluginOptions = {
  org: "prioraflow",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Hides source maps from being served to users
  hideSourceMaps: true,
  // Only upload in production builds, silence logs
  silent: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
