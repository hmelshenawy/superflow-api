const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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