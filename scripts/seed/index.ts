#!/usr/bin/env tsx

/**
 * Database Seed Script
 *
 * Populates the ChapterCheck database with realistic test data.
 *
 * Usage:
 *   npm run seed                     # Seed with defaults
 *   npm run seed -- --nuke           # Nuke database first, then seed
 *   npm run seed -- --users=50       # Custom user count
 *   npm run seed -- --authors=100    # Custom author count
 *   npm run seed -- --books=200      # Custom book count
 *   npm run seed -- --help           # Show usage
 *
 * Safety:
 *   - Automatically proceeds on dev deployment
 *   - Requires confirmation phrase for non-dev deployments
 */

import { ConvexHttpClient } from "convex/browser";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as readline from "readline";

import { api } from "../../packages/convex-backend/convex/_generated/api";
import {
  generateAuthors,
  generateBooks,
  generateReviews,
  generateSeries,
  generateUsers,
} from "./generators";

// ============================================
// SAFETY CONFIGURATION
// ============================================

const ALLOWED_DEPLOYMENT = "dev:exciting-pika-251";
const ALLOWED_URL = "https://exciting-pika-251.convex.cloud";

const SUMMON_PHRASE = "I SUMMON THE SEED DEMON";
const DESTROY_PHRASE = "DESTROY";

// ============================================
// DEFAULT COUNTS
// ============================================

const DEFAULT_USERS = 100;
const DEFAULT_AUTHORS = 150;
const DEFAULT_BOOKS = 500;

// Batch size for mutations (to avoid timeout)
const BATCH_SIZE = 50;

// ============================================
// TYPES
// ============================================

interface SeedConfig {
  nuke: boolean;
  userCount: number;
  authorCount: number;
  bookCount: number;
}

interface SeedStats {
  users: number;
  authors: number;
  series: number;
  books: number;
  bookAuthors: number;
  reviews: number;
}

// ============================================
// LOAD ENVIRONMENT VARIABLES
// ============================================

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

// ============================================
// CLI HELPERS
// ============================================

function printUsage(): void {
  console.log(`
ChapterCheck Database Seed Script

Usage:
  npm run seed [options]

Options:
  --nuke, -n       Nuke (clear) the database before seeding
  --users=N        Number of users to create (default: ${DEFAULT_USERS})
  --authors=N      Number of authors to create (default: ${DEFAULT_AUTHORS})
  --books=N        Number of books to create (default: ${DEFAULT_BOOKS})
  --help, -h       Show this help message

Examples:
  npm run seed                           # Seed with defaults
  npm run seed -- --nuke                 # Clear database first
  npm run seed -- --users=50 --books=200 # Custom counts
  npm run seed:nuke                      # Alias for --nuke

Safety:
  The script will automatically proceed on the dev deployment.
  For other deployments, you'll need to type a confirmation phrase.
`);
}

function parseArgs(): SeedConfig | null {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return null;
  }

  const config: SeedConfig = {
    nuke: args.includes("--nuke") || args.includes("-n"),
    userCount: DEFAULT_USERS,
    authorCount: DEFAULT_AUTHORS,
    bookCount: DEFAULT_BOOKS,
  };

  for (const arg of args) {
    if (arg.startsWith("--users=")) {
      const value = parseInt(arg.split("=")[1], 10);
      if (!isNaN(value) && value > 0) config.userCount = value;
    } else if (arg.startsWith("--authors=")) {
      const value = parseInt(arg.split("=")[1], 10);
      if (!isNaN(value) && value > 0) config.authorCount = value;
    } else if (arg.startsWith("--books=")) {
      const value = parseInt(arg.split("=")[1], 10);
      if (!isNaN(value) && value > 0) config.bookCount = value;
    }
  }

  return config;
}

// ============================================
// INTERACTIVE INPUT
// ============================================

async function promptUser(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ============================================
// SAFETY CHECKS
// ============================================

async function performSafetyCheck(): Promise<boolean> {
  const deployment = process.env.CONVEX_DEPLOYMENT;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  console.log("\n--- Safety Check ---");
  console.log(`Deployment: ${deployment}`);
  console.log(`URL: ${url}`);

  // Check if this is the allowed dev deployment
  // Deployment string may have a comment suffix like "# team: ..., project: ..."
  const isAllowedDeployment = deployment?.startsWith(ALLOWED_DEPLOYMENT);
  const isAllowedUrl = url === ALLOWED_URL;

  if (isAllowedDeployment && isAllowedUrl) {
    const answer = await promptUser("\nDev deployment detected. Proceed with seed? (y/N): ");
    if (answer.toLowerCase() === "y") {
      console.log("");
      return true;
    }
    console.log("\nAborted.\n");
    return false;
  }

  // Non-dev deployment - require confirmation
  console.log(`
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                          !!
!!  WARNING: NON-DEV DEPLOYMENT DETECTED                    !!
!!                                                          !!
!!  You are about to seed a database that is NOT the        !!
!!  designated development environment.                      !!
!!                                                          !!
!!  This action may:                                        !!
!!  - Overwrite existing production data                    !!
!!  - Create fake users, books, and reviews                 !!
!!  - Potentially corrupt your database state               !!
!!                                                          !!
!!  If you REALLY want to proceed, type exactly:            !!
!!  "${SUMMON_PHRASE}"                          !!
!!                                                          !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`);

  const answer = await promptUser("Type the confirmation phrase: ");

  if (answer === SUMMON_PHRASE) {
    console.log("\nConfirmation accepted. Proceeding with seed...\n");
    return true;
  }

  console.log("\nIncorrect phrase. Aborting seed operation.\n");
  return false;
}

async function confirmNuke(): Promise<boolean> {
  const deployment = process.env.CONVEX_DEPLOYMENT;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;

  // Auto-confirm for dev deployment
  // Deployment string may have a comment suffix like "# team: ..., project: ..."
  const isAllowedDeployment = deployment?.startsWith(ALLOWED_DEPLOYMENT);
  const isAllowedUrl = url === ALLOWED_URL;

  if (isAllowedDeployment && isAllowedUrl) {
    const answer = await promptUser("Dev deployment. Confirm NUKE? (y/N): ");
    if (answer.toLowerCase() === "y") {
      console.log("");
      return true;
    }
    console.log("\nSkipping nuke operation.\n");
    return false;
  }

  // Require additional confirmation for non-dev
  console.log(`
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!                                                          !!
!!  DANGER: DATABASE NUKE REQUESTED                         !!
!!                                                          !!
!!  This will PERMANENTLY DELETE all data from:             !!
!!  - users                                                 !!
!!  - authors                                               !!
!!  - series                                                !!
!!  - books                                                 !!
!!  - bookAuthors                                           !!
!!  - bookUserData                                          !!
!!  - audioFiles                                            !!
!!  - storageAccounts                                       !!
!!                                                          !!
!!  This cannot be undone!                                  !!
!!                                                          !!
!!  To confirm, type exactly: "${DESTROY_PHRASE}"                      !!
!!                                                          !!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
`);

  const answer = await promptUser("Type the confirmation phrase: ");

  if (answer === DESTROY_PHRASE) {
    console.log("\nDestruction confirmed. Nuking database...\n");
    return true;
  }

  console.log("\nIncorrect phrase. Skipping nuke operation.\n");
  return false;
}

// ============================================
// PROGRESS HELPERS
// ============================================

const SPINNER_FRAMES = ["|", "/", "-", "\\"];
let spinnerIndex = 0;

function spinner(): string {
  const frame = SPINNER_FRAMES[spinnerIndex];
  spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
  return frame;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function nukeDatabase(client: ConvexHttpClient): Promise<void> {
  console.log("Nuking database...\n");

  // Order matters: delete dependent tables first
  const tables = [
    "bookUserData",
    "bookAuthors",
    "audioFiles",
    "books",
    "series",
    "authors",
    "storageAccounts",
    "users",
  ] as const;

  // Get IDs to preserve
  const { preservedUserIds, preservedStorageAccountIds } = await client.mutation(
    api.seed.mutations.getPreservedIds,
    {}
  );

  const deletedCounts: Record<string, number> = {};
  const preservedCounts: Record<string, number> = {};

  for (const table of tables) {
    let totalDeleted = 0;
    let totalPreserved = 0;
    let done = false;

    while (!done) {
      process.stdout.write(
        `\r  ${spinner()} Nuking ${table}... ${formatNumber(totalDeleted)} deleted`
      );

      const result = await client.mutation(api.seed.mutations.nukeTable, {
        table,
        preservedUserIds,
        preservedStorageAccountIds,
      });

      totalDeleted += result.deleted;
      totalPreserved += result.preserved;
      done = result.done;
    }

    process.stdout.write(
      `\r  [OK] ${table}: ${formatNumber(totalDeleted)} deleted${totalPreserved > 0 ? `, ${formatNumber(totalPreserved)} preserved` : ""}                    \n`
    );

    if (totalDeleted > 0) deletedCounts[table] = totalDeleted;
    if (totalPreserved > 0) preservedCounts[table] = totalPreserved;
  }

  console.log("\nNuke complete!");
  if (Object.keys(preservedCounts).length > 0) {
    console.log(
      "Preserved:",
      Object.entries(preservedCounts)
        .map(([t, c]) => `${c} ${t}`)
        .join(", ")
    );
  }
  console.log("");
}

async function seedInBatches<T, R>(
  items: T[],
  batchSize: number,
  seedFn: (batch: T[]) => Promise<R[]>,
  label: string
): Promise<R[]> {
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    process.stdout.write(
      `\r  ${spinner()} Seeding ${label}... batch ${batchNum}/${totalBatches} (${formatNumber(Math.min(i + batchSize, items.length))}/${formatNumber(items.length)})`
    );

    const batchResults = await seedFn(batch);
    results.push(...batchResults);
  }

  process.stdout.write(
    `\r  [OK] Seeded ${formatNumber(results.length)} ${label}                                    \n`
  );

  return results;
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seed(client: ConvexHttpClient, config: SeedConfig): Promise<SeedStats> {
  const stats: SeedStats = {
    users: 0,
    authors: 0,
    series: 0,
    books: 0,
    bookAuthors: 0,
    reviews: 0,
  };

  console.log("Starting database seed...\n");
  console.log(`Configuration:`);
  console.log(`  - Users: ${formatNumber(config.userCount)}`);
  console.log(`  - Authors: ${formatNumber(config.authorCount)}`);
  console.log(`  - Books: ${formatNumber(config.bookCount)}`);
  console.log("");

  // ==========================================
  // Step 1: Seed Users
  // ==========================================
  console.log("Step 1/6: Seeding users...");
  const usersData = generateUsers(config.userCount);
  const userIds = await seedInBatches(
    usersData,
    BATCH_SIZE,
    async (batch) => {
      return await client.mutation(api.seed.mutations.seedUsers, { users: batch });
    },
    "users"
  );
  stats.users = userIds.length;

  // ==========================================
  // Step 2: Seed Authors
  // ==========================================
  console.log("\nStep 2/6: Seeding authors...");
  const authorsData = generateAuthors(config.authorCount);
  const authorIds = await seedInBatches(
    authorsData,
    BATCH_SIZE,
    async (batch) => {
      return await client.mutation(api.seed.mutations.seedAuthors, { authors: batch });
    },
    "authors"
  );
  stats.authors = authorIds.length;

  // ==========================================
  // Step 3: Seed Series
  // ==========================================
  console.log("\nStep 3/6: Seeding series...");
  // Generate series based on book count (roughly 1 series per 5 books)
  const seriesCount = Math.ceil(config.bookCount / 5);
  const seriesData = generateSeries(seriesCount);
  const seriesIds = await seedInBatches(
    seriesData,
    BATCH_SIZE,
    async (batch) => {
      return await client.mutation(api.seed.mutations.seedSeries, { series: batch });
    },
    "series"
  );
  stats.series = seriesIds.length;

  // ==========================================
  // Step 4: Seed Books
  // ==========================================
  console.log("\nStep 4/6: Seeding books...");
  const booksData = generateBooks(config.bookCount, authorIds, seriesIds);
  const bookIds = await seedInBatches(
    booksData,
    BATCH_SIZE,
    async (batch) => {
      return await client.mutation(api.seed.mutations.seedBooks, { books: batch });
    },
    "books"
  );
  stats.books = bookIds.length;
  // Each book has 1-3 authors, estimate average of 1.5
  stats.bookAuthors = Math.round(bookIds.length * 1.5);

  // ==========================================
  // Step 5: Seed Reviews
  // ==========================================
  console.log("\nStep 5/6: Seeding reviews...");
  // Generate reviews for ~30% of user-book combinations
  const reviewCount = Math.min(
    Math.floor(config.userCount * config.bookCount * 0.3),
    5000 // Cap at 5000 reviews
  );
  const reviewsData = generateReviews(reviewCount, userIds, bookIds);
  const reviewIds = await seedInBatches(
    reviewsData,
    BATCH_SIZE,
    async (batch) => {
      return await client.mutation(api.seed.mutations.seedBookUserData, { reviews: batch });
    },
    "reviews"
  );
  stats.reviews = reviewIds.length;

  // ==========================================
  // Step 6: Recalculate Book Ratings
  // ==========================================
  console.log("\nStep 6/6: Recalculating book ratings...");
  let hasMore = true;
  let cursor: string | undefined;
  let totalProcessed = 0;

  while (hasMore) {
    process.stdout.write(
      `\r  ${spinner()} Recalculating ratings... ${formatNumber(totalProcessed)} books processed`
    );

    const result = await client.mutation(api.seed.mutations.recalculateAllBookRatings, {
      cursor,
    });

    totalProcessed += result.processed;
    hasMore = result.hasMore;
    cursor = result.nextCursor ?? undefined;
  }

  process.stdout.write(
    `\r  [OK] Recalculated ratings for ${formatNumber(totalProcessed)} books                    \n`
  );

  return stats;
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("ChapterCheck Database Seed Script");
  console.log("=".repeat(60));

  // Parse arguments
  const config = parseArgs();
  if (!config) {
    process.exit(0);
  }

  // Check environment
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("\nError: NEXT_PUBLIC_CONVEX_URL environment variable not set");
    console.error("Run: source .env.local");
    process.exit(1);
  }

  // Safety check
  const safetyPassed = await performSafetyCheck();
  if (!safetyPassed) {
    process.exit(1);
  }

  // Initialize Convex client
  const client = new ConvexHttpClient(convexUrl);

  // Handle nuke if requested
  if (config.nuke) {
    const nukeConfirmed = await confirmNuke();
    if (nukeConfirmed) {
      try {
        await nukeDatabase(client);
      } catch (error) {
        console.error("Error nuking database:", error);
        process.exit(1);
      }
    } else {
      console.log("Continuing with seed without nuking...\n");
    }
  }

  // Run seed
  const startTime = Date.now();
  let stats: SeedStats;

  try {
    stats = await seed(client, config);
  } catch (error) {
    console.error("\n\nError during seeding:", error);
    console.error("\nSeed operation failed. Some data may have been created.");
    process.exit(1);
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log("Seed Complete!");
  console.log("=".repeat(60));
  console.log("\nSummary:");
  console.log(`  - Users:        ${formatNumber(stats.users)}`);
  console.log(`  - Authors:      ${formatNumber(stats.authors)}`);
  console.log(`  - Series:       ${formatNumber(stats.series)}`);
  console.log(`  - Books:        ${formatNumber(stats.books)}`);
  console.log(`  - Book-Authors: ${formatNumber(stats.bookAuthors)} (relationships)`);
  console.log(`  - Reviews:      ${formatNumber(stats.reviews)}`);
  console.log(`\nDuration: ${duration}s`);
  console.log("");
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  process.exit(1);
});
