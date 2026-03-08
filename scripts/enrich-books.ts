#!/usr/bin/env tsx

/**
 * Enrich existing books and authors with metadata from OpenLibrary.
 *
 * Usage:
 *   npm run enrich-books                    # Enrich all incomplete books + authors
 *   npm run enrich-books -- --dry-run       # Preview without writing
 *   npm run enrich-books -- --limit=10      # Process only N items per phase
 *   npm run enrich-books -- --books-only    # Skip author enrichment
 *   npm run enrich-books -- --authors-only  # Skip book enrichment
 *   npm run enrich-books -- --skip-genres   # Skip genre creation/linking
 *   npm run enrich-books -- --genres-only  # Only add genres to all books (no metadata/authors)
 */

import { ConvexHttpClient } from "convex/browser";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import { api } from "../packages/convex-backend/convex/_generated/api";
import {
  getCoverUrl,
  getAuthorPhotoUrl,
  getWorkDetails,
  getAuthorDetails,
  normalizeDescription,
  RateLimiter,
  searchAuthors,
  searchBook,
} from "./lib/openlibrary";
import { extractGenres, GenreCache } from "./lib/genres";
import { createR2Client, getR2Bucket, uploadImageFromUrl } from "./lib/r2-upload";

// =============================================================================
// CONFIG
// =============================================================================

interface EnrichConfig {
  dryRun: boolean;
  limit: number; // 0 = no limit
  booksOnly: boolean;
  authorsOnly: boolean;
  skipGenres: boolean;
  genresOnly: boolean; // Only add genres to books (fetch all books, not just incomplete)
}

function parseArgs(): EnrichConfig {
  const args = process.argv.slice(2);

  const config: EnrichConfig = {
    dryRun: args.includes("--dry-run"),
    limit: 0,
    booksOnly: args.includes("--books-only"),
    authorsOnly: args.includes("--authors-only"),
    skipGenres: args.includes("--skip-genres"),
    genresOnly: args.includes("--genres-only"),
  };

  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      const value = parseInt(arg.split("=")[1], 10);
      if (!isNaN(value) && value > 0) config.limit = value;
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
// TYPES
// =============================================================================

interface BookToEnrich {
  _id: string;
  title: string;
  description?: string;
  isbn?: string;
  publishedYear?: number;
  language?: string;
  coverImageR2Key?: string;
  authorNames: string[];
}

interface AuthorToEnrich {
  _id: string;
  name: string;
  bio?: string;
  imageR2Key?: string;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  loadEnvFile();

  const config = parseArgs();

  console.log("=".repeat(60));
  console.log("ChapterCheck Book & Author Enrichment");
  console.log("=".repeat(60));
  console.log(`  Dry run:      ${config.dryRun}`);
  console.log(`  Limit:        ${config.limit || "none"}`);
  console.log(`  Skip genres:  ${config.skipGenres}`);
  if (config.genresOnly) console.log("  Mode: genres only (all books)");
  if (config.booksOnly) console.log("  Mode: books only");
  if (config.authorsOnly) console.log("  Mode: authors only");
  console.log("");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("Error: NEXT_PUBLIC_CONVEX_URL not set. Run: source .env.local");
    process.exit(1);
  }

  const client = new ConvexHttpClient(convexUrl);
  const rateLimiter = new RateLimiter(100, 600);

  let r2Client: ReturnType<typeof createR2Client> | null = null;
  let r2Bucket = "";
  if (!config.dryRun) {
    try {
      r2Client = createR2Client();
      r2Bucket = getR2Bucket();
    } catch {
      console.warn("R2 not configured — will skip cover/photo uploads");
    }
  }

  const stats = {
    booksEnriched: 0,
    authorsEnriched: 0,
    genresCreated: 0,
    booksWithGenres: 0,
    skipped: 0,
    errors: 0,
  };

  // Get editor user ID for genre votes (needed unless skipping genres or authors-only)
  let editorUserId: string | null = null;
  if (!config.skipGenres && !config.authorsOnly) {
    editorUserId = await client.query(api.seed.queries.getEditorUserId, {});
    if (!editorUserId && !config.dryRun) {
      console.warn("  No editor/admin user found — will skip genre votes\n");
    }
  }

  const genreCache = new GenreCache();

  // =========================================================================
  // ENRICH BOOKS (+ GENRES)
  // =========================================================================

  if (!config.authorsOnly) {
    const phaseLabel = config.genresOnly ? "Adding genres to books" : "Enriching books";
    console.log(`Phase 1: ${phaseLabel}...\n`);
    process.stdout.write("  Fetching books...");

    // In genres-only mode, fetch ALL books; otherwise only incomplete ones
    const books: BookToEnrich[] = [];
    let cursor: string | undefined;
    let isDone = false;

    while (!isDone) {
      const result = await client.query(api.seed.queries.getBooksNeedingEnrichment, {
        cursor,
        force: config.genresOnly ? true : undefined,
      });
      books.push(...(result.books as BookToEnrich[]));
      isDone = result.isDone;
      cursor = result.nextCursor ?? undefined;
    }

    console.log(` found ${books.length}\n`);

    const toProcess = config.limit > 0 ? books.slice(0, config.limit) : books;

    for (let i = 0; i < toProcess.length; i++) {
      const book = toProcess[i];
      const authorName = book.authorNames[0];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        process.stdout.write(`  ${progress} "${book.title}" by ${authorName ?? "unknown"}...`);

        // In genres-only mode, skip books that already have genre votes
        if (config.genresOnly) {
          const hasVotes = config.dryRun
            ? false
            : await client.query(api.seed.queries.bookHasGenreVotes, {
                bookId: book._id,
              });
          if (hasVotes) {
            console.log(" already has genres");
            stats.skipped++;
            continue;
          }
        }

        // Search OpenLibrary
        const match = await searchBook(book.title, authorName, rateLimiter);
        if (!match) {
          console.log(" no match");
          stats.skipped++;
          continue;
        }

        // Get full work details for description + subjects
        const workDetails = match.key ? await getWorkDetails(match.key, rateLimiter) : null;

        const enrichedFields: string[] = [];

        // Metadata enrichment (skip in genres-only mode)
        if (!config.genresOnly) {
          const enrichData: {
            bookId: string;
            description?: string;
            isbn?: string;
            publishedYear?: number;
            language?: string;
            coverImageR2Key?: string;
          } = { bookId: book._id };

          const desc = normalizeDescription(workDetails?.description);
          if (desc && !book.description) enrichData.description = desc;
          if (!book.isbn && match.isbn?.length) enrichData.isbn = match.isbn[0];
          if (!book.publishedYear && match.first_publish_year)
            enrichData.publishedYear = match.first_publish_year;
          if (!book.language && match.language?.length) enrichData.language = match.language[0];

          if (!book.coverImageR2Key && match.cover_i && r2Client) {
            const coverUrl = getCoverUrl(match.cover_i, "L");
            const r2Key = await uploadImageFromUrl(
              r2Client,
              r2Bucket,
              coverUrl,
              "book-covers",
              `ol-${match.cover_i}`
            );
            if (r2Key) enrichData.coverImageR2Key = r2Key;
          }

          if (config.dryRun) {
            const fields = Object.keys(enrichData).filter((k) => k !== "bookId");
            enrichedFields.push(...fields);
            if (fields.length > 0) stats.booksEnriched++;
          } else {
            const result = await client.mutation(api.seed.mutations.enrichBook, enrichData);
            if (result.updated) {
              enrichedFields.push(...(result.fields as string[]));
              stats.booksEnriched++;
            }
          }
        }

        // Genres — extract from OL subjects and link to book
        if (!config.skipGenres && (editorUserId || config.dryRun)) {
          const allSubjects = [...(workDetails?.subjects ?? []), ...(match.subject ?? [])];
          const genreNames = extractGenres(allSubjects);

          if (genreNames.length > 0) {
            // Check if book already has genre votes (skip if already checked in genres-only mode)
            const hasVotes = config.genresOnly
              ? false // already filtered above
              : config.dryRun
                ? false
                : await client.query(api.seed.queries.bookHasGenreVotes, {
                    bookId: book._id,
                  });

            if (!hasVotes) {
              const genreIds: string[] = [];
              for (const name of genreNames) {
                const id = await genreCache.resolve(name, client, config.dryRun);
                if (id) genreIds.push(id);
              }

              if (genreIds.length > 0 && !config.dryRun) {
                await client.mutation(api.seed.mutations.setBookGenreVotes, {
                  bookId: book._id,
                  genreIds,
                  userId: editorUserId!,
                });
              }

              enrichedFields.push(`genres(${genreNames.join(", ")})`);
              stats.booksWithGenres++;
            }
          }
        }

        if (enrichedFields.length > 0) {
          console.log(
            ` ${config.dryRun ? "would enrich" : "enriched"}: ${enrichedFields.join(", ")}`
          );
        } else {
          console.log(" no new data");
          stats.skipped++;
        }
      } catch (error) {
        console.log(` ERROR: ${error instanceof Error ? error.message : error}`);
        stats.errors++;
      }
    }
  }

  // =========================================================================
  // ENRICH AUTHORS
  // =========================================================================

  if (!config.booksOnly && !config.genresOnly) {
    console.log("\nPhase 2: Enriching authors...\n");
    process.stdout.write("  Fetching authors needing enrichment...");

    // Paginate through all authors needing enrichment
    const authors: AuthorToEnrich[] = [];
    let cursor: string | undefined;
    let isDone = false;

    while (!isDone) {
      const result = await client.query(api.seed.queries.getAuthorsNeedingEnrichment, {
        cursor,
      });
      authors.push(...(result.authors as AuthorToEnrich[]));
      isDone = result.isDone;
      cursor = result.nextCursor ?? undefined;
    }

    console.log(` found ${authors.length}\n`);

    const toProcess = config.limit > 0 ? authors.slice(0, config.limit) : authors;

    for (let i = 0; i < toProcess.length; i++) {
      const author = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        process.stdout.write(`  ${progress} "${author.name}"...`);

        // Search OL's dedicated author search endpoint
        const authorMatch = await searchAuthors(author.name, rateLimiter);

        if (!authorMatch) {
          console.log(" no match");
          stats.skipped++;
          continue;
        }

        // Get full author details (bio, photos)
        const authorKey = authorMatch.key.replace("/authors/", "");
        const details = await getAuthorDetails(authorKey, rateLimiter);
        if (!details) {
          console.log(" no details");
          stats.skipped++;
          continue;
        }

        const enrichData: {
          authorId: string;
          bio?: string;
          imageR2Key?: string;
        } = { authorId: author._id };

        // Bio
        const bio = normalizeDescription(details.bio);
        if (bio && !author.bio) enrichData.bio = bio;

        // Photo
        if (!author.imageR2Key && details.photos?.length && r2Client) {
          const photoId = details.photos.find((p) => p > 0);
          if (photoId) {
            const photoUrl = getAuthorPhotoUrl(photoId, "L");
            const r2Key = await uploadImageFromUrl(
              r2Client,
              r2Bucket,
              photoUrl,
              "author-photos",
              `ol-${photoId}`
            );
            if (r2Key) enrichData.imageR2Key = r2Key;
          }
        }

        if (config.dryRun) {
          const fields = Object.keys(enrichData).filter((k) => k !== "authorId");
          console.log(` would enrich: ${fields.join(", ") || "nothing new"}`);
          if (fields.length > 0) stats.authorsEnriched++;
          else stats.skipped++;
        } else {
          const result = await client.mutation(api.seed.mutations.enrichAuthor, enrichData);
          if (result.updated) {
            console.log(` enriched: ${(result.fields as string[]).join(", ")}`);
            stats.authorsEnriched++;
          } else {
            console.log(" already complete");
            stats.skipped++;
          }
        }
      } catch (error) {
        console.log(` ERROR: ${error instanceof Error ? error.message : error}`);
        stats.errors++;
      }
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================

  console.log("\n" + "=".repeat(60));
  console.log("Enrichment Complete!");
  console.log("=".repeat(60));
  console.log(`  Books enriched:      ${stats.booksEnriched}`);
  console.log(`  Authors enriched:    ${stats.authorsEnriched}`);
  console.log(`  Genres resolved:     ${genreCache.size}`);
  console.log(`  Books with genres:   ${stats.booksWithGenres}`);
  console.log(`  Skipped:             ${stats.skipped}`);
  console.log(`  Errors:              ${stats.errors}`);
  if (config.dryRun) console.log("\n  (Dry run — no changes were made)");
  console.log("");
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  process.exit(1);
});
