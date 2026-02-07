#!/usr/bin/env tsx

/**
 * E2E Seed Script (CI-friendly, non-interactive)
 *
 * Ensures minimal test data exists in the Convex database for E2E tests.
 * Idempotent: if data already exists, it's a no-op.
 *
 * Usage:
 *   npm run seed:e2e
 */

import { ConvexHttpClient } from "convex/browser";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { api } from "../convex/_generated/api";

// Load .env.local if present (CI provides env vars directly)
function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (key && !process.env[key]) {
      process.env[key] = valueParts.join("=");
    }
  }
}

loadEnvFile();

async function main(): Promise<void> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("Error: NEXT_PUBLIC_CONVEX_URL not set");
    process.exit(1);
  }

  console.log("E2E Seed: Ensuring test data exists...");

  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation(api.seed.mutations.ensureE2ESeedData, {});

  if (result.seeded) {
    console.log(
      `E2E Seed: Created ${result.authors} authors, ${result.series} series, ${result.books} books`
    );
  } else {
    console.log("E2E Seed: Data already present, skipping.");
  }
}

main().catch((error) => {
  console.error("E2E Seed failed:", error);
  process.exit(1);
});
