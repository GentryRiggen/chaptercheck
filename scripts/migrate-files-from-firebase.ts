#!/usr/bin/env tsx

/**
 * File Migration Script: Firebase Storage -> ChapterCheck R2
 *
 * This script migrates audio files from the old Firebase "books-bro" app
 * to the new ChapterCheck R2 storage with friendly file names.
 *
 * Prerequisites:
 *   - Books and authors must already be migrated (run migrate-from-firebase.ts first)
 *   - firebase-service-account.json with Firebase credentials
 *   - .env.local with Convex and R2 credentials
 *   - MIGRATION_CLERK_ID set to your Clerk user ID
 *
 * Usage:
 *   npm run migrate:files              # Run full migration
 *   npm run migrate:files:dry-run      # Preview without uploading
 *   npm run migrate:files:test         # Test with 5 books
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import * as readline from "readline";

// ============================================
// CONFIRMATION HELPER
// ============================================

async function confirmContinue(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

import type { Id } from "../convex/_generated/dataModel";

// ============================================
// TYPES
// ============================================

interface BookWithFirebaseId {
  _id: Id<"books">;
  title: string;
  firebaseId: string | null;
  seriesName: string | null;
  seriesOrder: number | null;
}

interface FirebaseFile {
  name: string;
  fullPath: string;
  size: number;
}

interface StorageAccount {
  _id: Id<"storageAccounts">;
  r2PathPrefix: string;
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
// CONFIGURATION (read after env file is loaded)
// ============================================

// These are read as functions to ensure env vars are loaded first
const getConfig = () => ({
  CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  FIREBASE_SERVICE_ACCOUNT_PATH:
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json",
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "books-bro.appspot.com",
  MIGRATION_CLERK_ID: process.env.MIGRATION_CLERK_ID,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  STORAGE_ENV: process.env.STORAGE_ENV || process.env.NODE_ENV || "dev",
});

// API references
const api = {
  migration: {
    mutations: {
      listBooksWithFirebaseId: anyApi.migration.mutations.listBooksWithFirebaseId,
      createMigratedAudioFile: anyApi.migration.mutations.createMigratedAudioFile,
      getOrCreateStorageAccount: anyApi.migration.mutations.getOrCreateStorageAccount,
      checkAudioFileExists: anyApi.migration.mutations.checkAudioFileExists,
    },
  },
};

const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

// Parse numeric argument helper
function parseNumericArg(argName: string, defaultValue: number): number {
  const argIndex = process.argv.findIndex(
    (a) => a === `--${argName}` || a.startsWith(`--${argName}=`)
  );
  if (argIndex === -1) return defaultValue;
  const arg = process.argv[argIndex];
  if (arg.startsWith(`--${argName}=`)) {
    return parseInt(arg.split("=")[1] || String(defaultValue));
  }
  return parseInt(process.argv[argIndex + 1] || String(defaultValue));
}

const LIMIT = parseNumericArg("limit", 0);
const NO_CONCURRENCY = process.argv.includes("--no-concurrency");
const CONCURRENCY = NO_CONCURRENCY ? 1 : parseNumericArg("concurrency", 3);

// ============================================
// CONCURRENCY HELPER
// ============================================

/**
 * Process items with limited concurrency
 */
async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      results[index] = await processor(item, index);
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
  return results;
}

// ============================================
// FRIENDLY NAME GENERATION
// ============================================

/**
 * Sanitize a string to be safe for filenames (CamelCase)
 */
function sanitizeForFilename(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Format series order for display
 */
function formatSeriesOrder(order: number): string {
  return Number.isInteger(order) ? order.toString() : order.toFixed(1);
}

/**
 * Generate a friendly file name following the project convention:
 * - With series: {BookTitle}_{SeriesName}-Book{SeriesOrder}_part{PartNumber}.{ext}
 * - Without series: {BookTitle}_part{PartNumber}.{ext}
 */
function generateFriendlyFileName(
  bookTitle: string,
  seriesName: string | null,
  seriesOrder: number | null,
  partNumber: number,
  format: string
): string {
  const sanitizedTitle = sanitizeForFilename(bookTitle);
  const ext = format.toLowerCase().replace(/^\./, "");

  if (seriesName && seriesOrder !== null && seriesOrder !== undefined) {
    const sanitizedSeries = sanitizeForFilename(seriesName);
    const orderStr = formatSeriesOrder(seriesOrder);
    return `${sanitizedTitle}_${sanitizedSeries}-Book${orderStr}_part${partNumber}.${ext}`;
  }

  return `${sanitizedTitle}_part${partNumber}.${ext}`;
}

/**
 * Extract format from filename
 */
function getFormat(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "mp3";
  return ext;
}

/**
 * Sort files naturally (part1, part2, ..., part10, part11)
 */
function naturalSort(files: FirebaseFile[]): FirebaseFile[] {
  return [...files].sort((a, b) => {
    // Try to extract numbers from filenames
    const numA = extractPartNumber(a.name);
    const numB = extractPartNumber(b.name);

    if (numA !== null && numB !== null) {
      return numA - numB;
    }

    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

/**
 * Try to extract a part number from a filename
 */
function extractPartNumber(fileName: string): number | null {
  // Try patterns like "part1", "Part 2", "01", "track_03", etc.
  const patterns = [/part\s*(\d+)/i, /track\s*(\d+)/i, /^(\d+)\./, /[\s_-](\d+)\./, /(\d+)$/];

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return null;
}

// ============================================
// R2 CLIENT
// ============================================

function getR2Client(config: ReturnType<typeof getConfig>): S3Client {
  if (!config.R2_ACCOUNT_ID || !config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  });
}

function getStoragePrefix(config: ReturnType<typeof getConfig>): string {
  return config.STORAGE_ENV === "production" ? "prod" : "dev";
}

// ============================================
// MAIN MIGRATION LOGIC
// ============================================

async function main(): Promise<void> {
  // Load config after env file is loaded
  const config = getConfig();

  console.log("🚀 Firebase Files to ChapterCheck R2 Migration");
  console.log("=".repeat(60));

  // Show configuration
  console.log("\n📋 Configuration:");
  console.log(
    `   Environment:        ${config.STORAGE_ENV === "production" ? "PRODUCTION" : "development"}`
  );
  console.log(`   R2 Path Prefix:     ${config.STORAGE_ENV === "production" ? "prod" : "dev"}/...`);
  console.log(`   Convex URL:         ${config.CONVEX_URL || "NOT SET"}`);
  console.log(`   Clerk ID:           ${config.MIGRATION_CLERK_ID || "NOT SET"}`);
  console.log(`   R2 Bucket:          ${config.R2_BUCKET_NAME || "NOT SET"}`);
  console.log(`   Firebase Bucket:    ${config.FIREBASE_STORAGE_BUCKET}`);

  console.log("\n📊 Options:");
  console.log(`   Dry Run:            ${DRY_RUN ? "YES (no files will be uploaded)" : "NO"}`);
  console.log(`   Limit:              ${LIMIT > 0 ? `${LIMIT} books` : "No limit"}`);
  console.log(`   Concurrency:        ${CONCURRENCY} parallel uploads`);

  console.log("");

  // Validate configuration
  if (!config.CONVEX_URL) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable not set");
    process.exit(1);
  }

  if (!config.MIGRATION_CLERK_ID) {
    console.error("❌ MIGRATION_CLERK_ID environment variable not set");
    console.error(
      "   Set this to your Clerk user ID to associate migrated files with your account"
    );
    process.exit(1);
  }

  if (!DRY_RUN) {
    if (
      !config.R2_ACCOUNT_ID ||
      !config.R2_ACCESS_KEY_ID ||
      !config.R2_SECRET_ACCESS_KEY ||
      !config.R2_BUCKET_NAME
    ) {
      console.error("❌ R2 credentials not configured");
      console.error(
        "   Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
      );
      process.exit(1);
    }
  }

  // Confirm before proceeding
  const confirmed = await confirmContinue("Continue with migration?");
  if (!confirmed) {
    console.log("Migration cancelled.");
    process.exit(0);
  }

  console.log("");

  // Load Firebase service account
  let serviceAccount;
  try {
    const content = readFileSync(config.FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8");
    serviceAccount = JSON.parse(content);
  } catch {
    console.error(
      `❌ Could not load Firebase service account from: ${config.FIREBASE_SERVICE_ACCOUNT_PATH}`
    );
    process.exit(1);
  }

  // Initialize Firebase
  const app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: config.FIREBASE_STORAGE_BUCKET,
  });
  const storage = getStorage(app);
  const bucket = storage.bucket();

  // Initialize Convex
  const convex = new ConvexHttpClient(config.CONVEX_URL);

  // Initialize R2 client
  let r2Client: S3Client | null = null;
  if (!DRY_RUN) {
    r2Client = getR2Client(config);
  }

  // ==========================================
  // STEP 1: Get storage account for the user
  // ==========================================
  console.log("\n👤 Step 1: Getting storage account...");

  const { storageAccount } = (await convex.mutation(
    api.migration.mutations.getOrCreateStorageAccount,
    { clerkId: config.MIGRATION_CLERK_ID! }
  )) as { storageAccount: StorageAccount };

  console.log(`   Storage account: ${storageAccount.r2PathPrefix}`);

  // ==========================================
  // STEP 2: Get all books with Firebase IDs
  // ==========================================
  console.log("\n📖 Step 2: Getting books with Firebase IDs...");

  const books: BookWithFirebaseId[] = await convex.mutation(
    api.migration.mutations.listBooksWithFirebaseId,
    {}
  );
  console.log(`   Found ${books.length} books with Firebase IDs`);

  const booksToProcess = LIMIT > 0 ? books.slice(0, LIMIT) : books;

  // ==========================================
  // STEP 3: Process each book's files
  // ==========================================
  console.log("\n🎵 Step 3: Migrating audio files...");

  // Counters (modified by parallel workers)
  let totalFiles = 0;
  let uploadedFiles = 0;
  let skippedFiles = 0;
  let errorFiles = 0;
  let booksWithFiles = 0;
  let booksProcessed = 0;

  // Process a single book
  const processBook = async (book: BookWithFirebaseId, _index: number) => {
    if (!book.firebaseId) return;

    const bookLabel = `${book.title.substring(0, 35)}`;

    try {
      // List files in Firebase Storage for this book
      const basePath = `${book.firebaseId}/`;
      let files: FirebaseFile[] = [];

      try {
        const [fileList] = await bucket.getFiles({ prefix: basePath });
        if (fileList.length > 0) {
          files = fileList
            .filter((f) => {
              const name = f.name.toLowerCase();
              return (
                name.endsWith(".mp3") ||
                name.endsWith(".m4a") ||
                name.endsWith(".m4b") ||
                name.endsWith(".flac") ||
                name.endsWith(".ogg")
              );
            })
            .map((f) => ({
              name: f.name.split("/").pop() || f.name,
              fullPath: f.name,
              size: parseInt(String(f.metadata?.size || "0")),
            }));
        }
      } catch {
        // Path doesn't exist or error accessing
      }

      if (files.length === 0) {
        booksProcessed++;
        return;
      }

      booksWithFiles++;
      totalFiles += files.length;

      // Sort files naturally
      files = naturalSort(files);

      console.log(
        `   📚 [${booksProcessed + 1}/${booksToProcess.length}] "${bookLabel}" (${files.length} files)`
      );

      // Process each file sequentially within a book (to maintain part order in logs)
      for (let partIndex = 0; partIndex < files.length; partIndex++) {
        const file = files[partIndex];
        const partNumber = partIndex + 1;
        const format = getFormat(file.name);

        const friendlyFileName = generateFriendlyFileName(
          book.title,
          book.seriesName,
          book.seriesOrder,
          partNumber,
          format
        );

        // Check if file already exists (idempotent migration)
        const existingCheck = (await convex.mutation(api.migration.mutations.checkAudioFileExists, {
          bookId: book._id,
          firebaseStoragePath: file.fullPath,
        })) as { exists: boolean; r2Key: string | null };

        if (existingCheck.exists) {
          if (VERBOSE) {
            console.log(`      ⏭️  Part ${partNumber}: SKIPPED (already migrated)`);
          }
          skippedFiles++;
          continue;
        }

        // Generate R2 key: {env}/{r2PathPrefix}/audiobooks/{bookId}/{fileName}
        const r2Key = `${getStoragePrefix(config)}/${storageAccount.r2PathPrefix}/audiobooks/${book._id}/${friendlyFileName}`;

        if (DRY_RUN) {
          console.log(`      📤 Part ${partNumber}: ${friendlyFileName}`);
          uploadedFiles++;
          continue;
        }

        try {
          console.log(`      ⬇️  Part ${partNumber}: Downloading...`);

          // Download file from Firebase
          const [fileBuffer] = await bucket.file(file.fullPath).download();

          console.log(
            `      ⬆️  Part ${partNumber}: Uploading (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)...`
          );

          // Upload to R2
          const contentType = format === "mp3" ? "audio/mpeg" : `audio/${format}`;

          await r2Client!.send(
            new PutObjectCommand({
              Bucket: config.R2_BUCKET_NAME,
              Key: r2Key,
              Body: fileBuffer,
              ContentType: contentType,
            })
          );

          // Create audio file record in Convex
          await convex.mutation(api.migration.mutations.createMigratedAudioFile, {
            bookId: book._id,
            firebaseStoragePath: file.fullPath,
            fileSize: fileBuffer.length,
            duration: 0,
            format,
            partNumber,
            friendlyFileName,
            r2Key,
            r2Bucket: config.R2_BUCKET_NAME!,
            clerkId: config.MIGRATION_CLERK_ID!,
          });

          console.log(`      ✅ Part ${partNumber}: Done`);
          uploadedFiles++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`      ❌ Part ${partNumber}: ${message}`);
          errorFiles++;
        }
      }

      booksProcessed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n   ❌ Error processing book "${book.title}": ${message}`);
      booksProcessed++;
    }
  };

  // Process books with concurrency
  await processWithConcurrency(booksToProcess, CONCURRENCY, processBook);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log("\n\n" + "=".repeat(60));
  console.log("✅ File Migration Complete!");
  console.log("=".repeat(60));
  console.log("\n📊 Summary:");
  console.log(`   Books processed: ${booksToProcess.length}`);
  console.log(`   Books with files: ${booksWithFiles}`);
  console.log(`   Total files found: ${totalFiles}`);
  console.log(`   Files uploaded: ${uploadedFiles}`);
  console.log(`   Files skipped: ${skippedFiles}`);
  console.log(`   Errors: ${errorFiles}`);

  if (DRY_RUN) {
    console.log("\n⚠️  This was a DRY RUN - no files were uploaded");
    console.log("   Run without --dry-run to perform actual migration");
  }
}

main().catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
