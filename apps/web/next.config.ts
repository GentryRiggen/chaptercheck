import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  env: {
    // Injected by GitHub Actions in CI, falls back to "dev" locally
    NEXT_PUBLIC_GIT_HASH: process.env.NEXT_PUBLIC_GIT_HASH ?? "dev",
    NEXT_PUBLIC_DEPLOY_DATE: process.env.NEXT_PUBLIC_DEPLOY_DATE ?? new Date().toISOString(),
  },
  webpack: (config) => {
    // Ensure shared packages use the same convex instance as the web app
    // to avoid "Could not find Convex client" errors from duplicate modules
    config.resolve.alias = {
      ...config.resolve.alias,
      convex: path.resolve(__dirname, "node_modules/convex"),
    };
    return config;
  },
};

export default nextConfig;
