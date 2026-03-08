#!/usr/bin/env tsx

/**
 * Import ~5000 popular books from OpenLibrary into ChapterCheck.
 *
 * Two-phase approach with progress file for resumability:
 *   Phase 1: Collect works from subjects (~40 API calls, fast)
 *   Phase 2: Process in batches — for each batch of N works:
 *            fetch details → resolve authors → download covers → import to DB
 *
 * Each run processes one batch then exits. Re-run with --resume to continue.
 *
 * Usage:
 *   npm run import-books                              # Collect + first batch of 50
 *   npm run import-books -- --resume                  # Continue next batch
 *   npm run import-books -- --resume --batch-size=100 # Bigger batches
 *   npm run import-books -- --dry-run                 # Preview
 *   npm run import-books -- --skip-covers             # Skip cover downloads
 *   npm run import-books -- --subjects=fiction,fantasy # Specific subjects only
 */

import { ConvexHttpClient } from "convex/browser";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { api } from "../packages/convex-backend/convex/_generated/api";
import {
  fetchSubjectWorks,
  getCoverUrl,
  getFirstEdition,
  getWorkDetails,
  normalizeDescription,
  RateLimiter,
} from "./lib/openlibrary";
import { extractGenres, GenreCache } from "./lib/genres";
import { loadProgress, saveProgress } from "./lib/progress";
import { createR2Client, getR2Bucket, uploadImagesBatch } from "./lib/r2-upload";

// =============================================================================
// CONFIG
// =============================================================================

const DEFAULT_SUBJECTS = [
  "fiction",
  "fantasy",
  "science_fiction",
  "mystery",
  "thriller",
  "romance",
  "horror",
  "historical_fiction",
  "adventure",
  "classics",
  "biography",
  "autobiography",
  "history",
  "science",
  "philosophy",
  "psychology",
  "self_help",
  "business",
  "young_adult",
  "dystopian",
  "detective",
  "crime",
  "war",
  "memoir",
  "humor",
  "poetry",
  "drama",
  "children",
  "american_literature",
  "british_literature",
  "literary_fiction",
  "economics",
  "politics",
  "travel",
  "religion",
  "art",
  "music",
  "cooking",
  "health",
  "technology",
];

const WORKS_PER_SUBJECT = 200;
const DEFAULT_BATCH_SIZE = 50;
const PROGRESS_FILE = resolve(__dirname, ".import-progress.json");

// =============================================================================
// TYPES
// =============================================================================

interface CollectedWork {
  workKey: string;
  title: string;
  authors: Array<{ key: string; name: string }>;
  coverId?: number;
  firstPublishYear?: number;
  description?: string;
  isbn?: string;
  language?: string;
  subjects?: string[];
  detailsFetched?: boolean;
  imported?: boolean;
}

interface ImportProgress {
  completedSubjects: string[];
  works: Record<string, CollectedWork>;
  authorMap: Record<string, string>; // author name → Convex ID
  coverMap: Record<string, string>; // workKey → r2Key
  importedCount: number;
  errors: string[];
}

interface ImportConfig {
  dryRun: boolean;
  batchSize: number;
  resume: boolean;
  continuous: boolean; // Keep processing batches with sleep between them
  skipCovers: boolean;
  subjects: string[];
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(): ImportConfig {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
ChapterCheck Book Import Script

Usage:
  npm run import-books [options]

Options:
  --dry-run                Preview without writing
  --batch-size=N           Process N works per batch (default: ${DEFAULT_BATCH_SIZE})
  --resume                 Resume from progress file
  --continuous             Keep processing batches (10s sleep between) until done
  --skip-covers            Skip cover image downloads
  --subjects=a,b,c         Specific subjects only
  --help, -h               Show this help

Workflow:
  1. First run collects all works from subjects, then processes first batch
  2. Re-run with --resume to process the next batch
  3. Or use --continuous --resume to process all remaining batches unattended
`);
    process.exit(0);
  }

  const config: ImportConfig = {
    dryRun: args.includes("--dry-run"),
    batchSize: DEFAULT_BATCH_SIZE,
    resume: args.includes("--resume"),
    continuous: args.includes("--continuous"),
    skipCovers: args.includes("--skip-covers"),
    subjects: [...DEFAULT_SUBJECTS],
  };

  for (const arg of args) {
    if (arg.startsWith("--batch-size=")) {
      const value = parseInt(arg.split("=")[1], 10);
      if (!isNaN(value) && value > 0) config.batchSize = value;
    }
    if (arg.startsWith("--subjects=")) {
      config.subjects = arg
        .split("=")[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return config;
}

// =============================================================================
// ENV LOADING
// =============================================================================

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

// =============================================================================
// PHASE 1: COLLECT WORKS FROM SUBJECTS
// =============================================================================

async function collectWorks(
  config: ImportConfig,
  progress: ImportProgress,
  rateLimiter: RateLimiter
): Promise<void> {
  console.log("\nPhase 1: Collecting works from subjects...\n");

  const remainingSubjects = config.subjects.filter((s) => !progress.completedSubjects.includes(s));

  if (remainingSubjects.length === 0) {
    console.log("  All subjects already collected.\n");
    return;
  }

  for (const subject of remainingSubjects) {
    process.stdout.write(
      `  [${progress.completedSubjects.length + 1}/${config.subjects.length}] ${subject}...`
    );

    try {
      const response = await fetchSubjectWorks(subject, WORKS_PER_SUBJECT, 0, rateLimiter);

      let newCount = 0;
      for (const work of response.works) {
        const workKey = work.key.replace("/works/", "");
        if (!progress.works[workKey]) {
          progress.works[workKey] = {
            workKey,
            title: work.title,
            authors: work.authors.map((a) => ({
              key: a.key.replace("/authors/", ""),
              name: a.name,
            })),
            coverId: work.cover_id && work.cover_id > 0 ? work.cover_id : undefined,
            firstPublishYear: work.first_publish_year,
          };
          newCount++;
        }
      }

      progress.completedSubjects.push(subject);
      console.log(` ${response.works.length} works (${newCount} new)`);

      saveProgress(PROGRESS_FILE, progress);
    } catch (error) {
      console.log(` ERROR: ${error instanceof Error ? error.message : error}`);
      progress.errors.push(`collect ${subject}: ${error}`);
    }
  }

  const totalWorks = Object.keys(progress.works).length;
  console.log(`\n  Total unique works: ${totalWorks}\n`);
}

// =============================================================================
// PHASE 2: PROCESS BATCH
// =============================================================================

async function processBatch(
  config: ImportConfig,
  progress: ImportProgress,
  client: ConvexHttpClient,
  rateLimiter: RateLimiter,
  genreCache: GenreCache,
  editorUserId: string | null
): Promise<{ processed: number; remaining: number }> {
  // Get next batch of unprocessed works (not yet imported and not yet details-fetched,
  // OR details-fetched but not imported)
  const allWorks = Object.values(progress.works);
  const unimported = allWorks.filter((w) => !w.imported);

  if (unimported.length === 0) {
    console.log("Phase 2: All works already imported!\n");
    return { processed: 0, remaining: 0 };
  }

  const batch = unimported.slice(0, config.batchSize);
  const remaining = unimported.length - batch.length;

  console.log(
    `Phase 2: Processing batch of ${batch.length} works (${remaining} remaining after this)...\n`
  );

  // --- Step A: Fetch details for works in this batch that need it ---
  const needDetails = batch.filter((w) => !w.detailsFetched);
  if (needDetails.length > 0) {
    console.log(`  Fetching details for ${needDetails.length} works...`);

    for (let i = 0; i < needDetails.length; i++) {
      const work = needDetails[i];
      if ((i + 1) % 10 === 0 || i === needDetails.length - 1) {
        process.stdout.write(`\r  Fetching details: ${i + 1}/${needDetails.length}`);
      }

      try {
        const details = await getWorkDetails(work.workKey, rateLimiter);
        if (details) {
          work.description = normalizeDescription(details.description);
          if (details.subjects?.length) work.subjects = details.subjects;
        }

        const edition = await getFirstEdition(work.workKey, rateLimiter);
        if (edition) {
          work.isbn = edition.isbn_13?.[0] ?? edition.isbn_10?.[0];
          if (edition.languages?.length) {
            work.language = edition.languages[0].key.replace("/languages/", "");
          }
        }

        work.detailsFetched = true;
      } catch (error) {
        progress.errors.push(`details ${work.workKey}: ${error}`);
        work.detailsFetched = true; // mark as attempted to avoid retrying forever
      }
    }
    console.log("");
  }

  // --- Step B: Resolve authors for this batch ---
  const uniqueAuthors = new Map<string, string>();
  for (const work of batch) {
    for (const author of work.authors) {
      if (!progress.authorMap[author.name]) {
        uniqueAuthors.set(author.name, author.key);
      }
    }
  }

  if (uniqueAuthors.size > 0) {
    console.log(`  Resolving ${uniqueAuthors.size} authors...`);
    let created = 0;

    for (const [name] of uniqueAuthors) {
      try {
        if (config.dryRun) {
          const existing = await client.query(api.seed.queries.findAuthorByName, { name });
          if (!existing) created++;
          progress.authorMap[name] = existing?._id ?? `dry-run-${name}`;
        } else {
          const result = await client.mutation(api.seed.mutations.upsertAuthorByName, { name });
          progress.authorMap[name] = result.authorId;
          if (result.created) created++;
        }
      } catch (error) {
        progress.errors.push(`author "${name}": ${error}`);
      }
    }

    console.log(`  Resolved ${uniqueAuthors.size} authors (${created} new)`);
  }

  // --- Step C: Download covers for this batch ---
  if (!config.skipCovers && !config.dryRun) {
    const needsCover = batch.filter(
      (w) => w.coverId && w.coverId > 0 && !progress.coverMap[w.workKey]
    );

    if (needsCover.length > 0) {
      console.log(`  Downloading ${needsCover.length} covers...`);

      let r2Client;
      let r2Bucket: string;
      try {
        r2Client = createR2Client();
        r2Bucket = getR2Bucket();

        const items = needsCover.map((w) => ({
          imageUrl: getCoverUrl(w.coverId!, "L"),
          pathPrefix: "book-covers",
          fileName: `ol-${w.coverId}`,
        }));

        const results = await uploadImagesBatch(r2Client, r2Bucket, items, 5);

        for (const work of needsCover) {
          const url = getCoverUrl(work.coverId!, "L");
          const r2Key = results.get(url);
          if (r2Key) progress.coverMap[work.workKey] = r2Key;
        }

        const uploaded = needsCover.filter((w) => progress.coverMap[w.workKey]).length;
        console.log(`  Uploaded ${uploaded} covers`);
      } catch {
        console.log("  R2 not configured, skipping covers");
      }
    }
  }

  // --- Step D: Import books to database ---
  console.log(`  Importing ${batch.length} books...`);
  let imported = 0;
  let skipped = 0;

  for (const work of batch) {
    try {
      // Dedup check
      if (work.isbn) {
        const existing = await client.query(api.seed.queries.findBookByIsbn, { isbn: work.isbn });
        if (existing) {
          work.imported = true;
          skipped++;
          continue;
        }
      }

      const existingByTitle = await client.query(api.seed.queries.findBookByTitle, {
        title: work.title,
      });
      if (existingByTitle) {
        work.imported = true;
        skipped++;
        continue;
      }

      // Resolve author IDs
      const authorIds = work.authors
        .map((a) => progress.authorMap[a.name])
        .filter((id): id is string => !!id);

      if (authorIds.length === 0) {
        progress.errors.push(`No authors for "${work.title}"`);
        work.imported = true; // skip permanently
        skipped++;
        continue;
      }

      if (config.dryRun) {
        imported++;
        work.imported = true;
        continue;
      }

      await client.mutation(api.seed.mutations.importBookWithAuthors, {
        title: work.title,
        description: work.description,
        isbn: work.isbn,
        publishedYear: work.firstPublishYear,
        language: work.language,
        coverImageR2Key: progress.coverMap[work.workKey],
        authorIds,
      });

      work.imported = true;
      imported++;
      progress.importedCount++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      progress.errors.push(`import "${work.title}": ${msg}`);
      console.error(`    ERROR importing "${work.title}": ${msg}`);
      work.imported = true; // Mark as attempted to avoid infinite retry
    }
  }

  console.log(`  Imported ${imported}, skipped ${skipped} (duplicates)`);

  // --- Step E: Add genres to newly imported books ---
  if (editorUserId || config.dryRun) {
    const booksWithSubjects = batch.filter((w) => w.imported && w.subjects?.length);
    let genreCount = 0;

    for (const work of booksWithSubjects) {
      const genreNames = extractGenres(work.subjects);
      if (genreNames.length === 0) continue;

      const genreIds: string[] = [];
      for (const name of genreNames) {
        const id = await genreCache.resolve(name, client, config.dryRun);
        if (id) genreIds.push(id);
      }

      if (genreIds.length > 0 && !config.dryRun) {
        // Find the book by title to get its ID
        const book = await client.query(api.seed.queries.findBookByTitle, { title: work.title });
        if (book) {
          await client.mutation(api.seed.mutations.setBookGenreVotes, {
            bookId: book._id,
            genreIds,
            userId: editorUserId!,
          });
          genreCount++;
        }
      } else if (config.dryRun && genreIds.length > 0) {
        genreCount++;
      }
    }

    if (genreCount > 0) {
      console.log(`  Added genres to ${genreCount} books`);
    }
  }

  console.log("");

  // Save progress after batch
  saveProgress(PROGRESS_FILE, progress);

  return { processed: batch.length, remaining };
}

// =============================================================================
// HELPERS
// =============================================================================

function getDefaultProgress(): ImportProgress {
  return {
    completedSubjects: [],
    works: {},
    authorMap: {},
    coverMap: {},
    importedCount: 0,
    errors: [],
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  loadEnvFile();

  const config = parseArgs();

  console.log("=".repeat(60));
  console.log("ChapterCheck Book Import (OpenLibrary)");
  console.log("=".repeat(60));
  console.log(`  Dry run:      ${config.dryRun}`);
  console.log(`  Batch size:   ${config.batchSize}`);
  console.log(`  Resume:       ${config.resume}`);
  console.log(`  Continuous:   ${config.continuous}`);
  console.log(`  Skip covers:  ${config.skipCovers}`);
  console.log(`  Subjects:     ${config.subjects.length}`);

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("\nError: NEXT_PUBLIC_CONVEX_URL not set. Run: source .env.local");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);
  const rateLimiter = new RateLimiter(100, 600);

  // Load or create progress (always resume if progress file exists)
  const hasProgressFile = existsSync(PROGRESS_FILE);
  const progress =
    hasProgressFile && config.resume
      ? loadProgress<ImportProgress>(PROGRESS_FILE, getDefaultProgress())
      : getDefaultProgress();

  const totalWorks = Object.keys(progress.works).length;
  const totalImported = Object.values(progress.works).filter((w) => w.imported).length;

  if (config.resume && hasProgressFile) {
    console.log(`  Progress:     ${totalImported}/${totalWorks} imported`);
  }

  const startTime = Date.now();

  // Phase 1: Collect works from subjects (fast, only on first run or if incomplete)
  if (!config.resume || progress.completedSubjects.length < config.subjects.length) {
    await collectWorks(config, progress, rateLimiter);
  }

  // Get editor user ID for genre votes
  const editorUserId = await client.query(api.seed.queries.getEditorUserId, {});
  if (!editorUserId && !config.dryRun) {
    console.warn("\n  No editor/admin user found — will skip genre votes");
  }
  const genreCache = new GenreCache();

  // Phase 2: Process batches
  let batchNum = 0;
  let lastRemaining = Infinity;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    batchNum++;
    const { remaining } = await processBatch(
      config,
      progress,
      client,
      rateLimiter,
      genreCache,
      editorUserId
    );
    lastRemaining = remaining;

    if (remaining === 0 || !config.continuous) break;

    console.log(`  Sleeping 10s before next batch... (Ctrl+C to stop, progress is saved)\n`);
    await new Promise((r) => setTimeout(r, 10_000));
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(0);
  const nowImported = Object.values(progress.works).filter((w) => w.imported).length;
  const nowTotal = Object.keys(progress.works).length;

  console.log("=".repeat(60));
  console.log(config.continuous && lastRemaining === 0 ? "Import Complete!" : "Batch Complete!");
  console.log("=".repeat(60));
  console.log(`  Total works:     ${nowTotal}`);
  console.log(`  Imported so far: ${nowImported}`);
  console.log(`  Remaining:       ${lastRemaining}`);
  console.log(`  Batches run:     ${batchNum}`);
  console.log(`  Covers uploaded: ${Object.keys(progress.coverMap).length}`);
  console.log(`  Genres resolved: ${genreCache.size}`);
  console.log(`  Authors:         ${Object.keys(progress.authorMap).length}`);
  console.log(`  Errors:          ${progress.errors.length}`);
  console.log(`  Duration:        ${duration}s`);
  if (config.dryRun) console.log("\n  (Dry run — no changes were made)");

  if (lastRemaining > 0) {
    console.log(
      `\n  Run again with --resume to process next ${Math.min(config.batchSize, lastRemaining)} works`
    );
  } else {
    console.log("\n  All works imported!");
  }

  if (progress.errors.length > 0) {
    console.log("\n  Last 5 errors:");
    for (const err of progress.errors.slice(-5)) {
      console.log(`    - ${err}`);
    }
  }

  console.log("");
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  process.exit(1);
});
