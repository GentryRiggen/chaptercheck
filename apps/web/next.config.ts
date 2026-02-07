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
};

export default nextConfig;
