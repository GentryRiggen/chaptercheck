import { createRequire } from "node:module";
import path from "node:path";

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const convexModulePath = path.dirname(require.resolve("convex/package.json"));

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    // Injected by GitHub Actions in CI, falls back to "dev" locally
    NEXT_PUBLIC_GIT_HASH: process.env.NEXT_PUBLIC_GIT_HASH ?? "dev",
    NEXT_PUBLIC_DEPLOY_DATE: process.env.NEXT_PUBLIC_DEPLOY_DATE ?? new Date().toISOString(),
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? "",
  },
  webpack: (config) => {
    // Ensure shared packages use the same convex instance as the web app
    // to avoid "Could not find Convex client" errors from duplicate modules
    config.resolve.alias = {
      ...config.resolve.alias,
      convex: convexModulePath,
    };
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "willful-divide",
  project: "chaptercheck-web",
  // Suppress source map upload logs outside CI
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  // Disable automatic instrumentation for Cloudflare Workers compatibility
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
});
