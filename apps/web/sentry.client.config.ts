import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  // Keep bundle small for Cloudflare Workers — no replay integration
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
});
