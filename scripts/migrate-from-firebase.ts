#!/usr/bin/env tsx

/**
 * Migration Script: Firebase -> ChapterCheck (Convex)
 *
 * This script migrates books and authors from the old Firebase "books-bro" app
 * to the new ChapterCheck Convex database.
 *
 * Features:
 * - Idempotent: Can be run multiple times safely
 * - Enriches data with Open Library API (covers, descriptions, etc.)
 * - Parses series info from book titles
 * - Uploads cover images to R2
 *
 * Setup:
 *   1. Create firebase-service-account.json with your Firebase credentials
 *   2. Set NEXT_PUBLIC_CONVEX_URL in .env.local
 *
 * Usage:
 *   npm run migrate              # Run full migration
 *   npm run migrate:dry-run      # Preview without writing
 *   npm run migrate:test         # Test with 5 books
 */

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

import type { Id } from "../convex/_generated/dataModel";

// ============================================
// TYPES
// ============================================

interface FirebaseAuthor {
  id: string;
  firstName?: string;
  middleInitial?: string;
  lastName?: string;
}

interface FirebaseBook {
  id: string;
  title: string;
  authors: FirebaseAuthor[];
}

interface OpenLibraryBookResult {
  title: string;
  description: string | null;
  publishedYear: number | null;
  isbn: string | null;
  coverId: number | null;
  language: string | null;
  authorKey: string | null;
}

interface OpenLibraryAuthorResult {
  key: string;
  name: string;
  bio: string | null;
  birthDate: string | null;
  deathDate: string | null;
  photoUrl: string | null;
}

interface SeriesParseResult {
  cleanTitle: string;
  seriesName: string | null;
  seriesOrder: number | null;
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
// CONFIGURATION
// ============================================

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const FIREBASE_SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";

// API references using anyApi for untyped access
const api = {
  migration: {
    mutations: {
      migrateAuthor: anyApi.migration.mutations.migrateAuthor,
      migrateSeries: anyApi.migration.mutations.migrateSeries,
      migrateBook: anyApi.migration.mutations.migrateBook,
      getSeriesByName: anyApi.migration.mutations.getSeriesByName,
    },
  },
};

const OPEN_LIBRARY_DELAY_MS = 100; // Rate limiting for Open Library API
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0");

// ============================================
// OPEN LIBRARY API HELPERS
// ============================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert null to undefined for Convex optional fields
function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

async function searchOpenLibrary(
  title: string,
  authorName: string
): Promise<OpenLibraryBookResult | null> {
  try {
    // Clean up the title - remove series info for better search
    const cleanTitle = title.replace(/\s*\([^)]*#[\d.]+\)\s*$/g, "").trim();
    const query = encodeURIComponent(`${cleanTitle} ${authorName}`);
    const url = `https://openlibrary.org/search.json?q=${query}&limit=5`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.docs || data.docs.length === 0) return null;

    // Find the best match
    const doc = data.docs[0];

    return {
      title: doc.title,
      description: doc.first_sentence?.join(" ") || null,
      publishedYear: doc.first_publish_year || null,
      isbn: doc.isbn?.[0] || null,
      coverId: doc.cover_i || null,
      language: doc.language?.[0] || null,
      authorKey: doc.author_key?.[0] || null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ⚠️  Open Library search failed: ${message}`);
    return null;
  }
}

async function getAuthorFromOpenLibrary(
  authorName: string
): Promise<OpenLibraryAuthorResult | null> {
  try {
    // Step 1: Search for the author to get their key
    const query = encodeURIComponent(authorName);
    const searchUrl = `https://openlibrary.org/search/authors.json?q=${query}&limit=3`;

    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    if (!searchData.docs || searchData.docs.length === 0) return null;

    const authorDoc = searchData.docs[0];
    const authorKey = authorDoc.key; // e.g., "OL123456A"

    // Step 2: Fetch full author details for bio and other info
    await sleep(OPEN_LIBRARY_DELAY_MS);
    const detailsUrl = `https://openlibrary.org/authors/${authorKey}.json`;
    const detailsResponse = await fetch(detailsUrl);

    let bio: string | null = null;
    let birthDate: string | null = null;
    let deathDate: string | null = null;
    let photoUrl: string | null = null;

    if (detailsResponse.ok) {
      const details = await detailsResponse.json();

      // Bio can be a string or an object with "value" property
      if (details.bio) {
        bio = typeof details.bio === "string" ? details.bio : details.bio.value || null;
      }
      birthDate = details.birth_date || null;
      deathDate = details.death_date || null;

      // If no bio but has top_work, create a simple one
      if (!bio && authorDoc.top_work) {
        bio = `Author of "${authorDoc.top_work}"`;
      }

      // Only construct photo URL if author actually has photos in their record
      // The photos array contains photo IDs when photos exist
      if (details.photos && Array.isArray(details.photos) && details.photos.length > 0) {
        // Use the first photo ID to construct the URL
        const photoId = details.photos[0];
        photoUrl = `https://covers.openlibrary.org/b/id/${photoId}-L.jpg`;
      }
    }

    return {
      key: authorKey,
      name: authorDoc.name, // Use the canonical name from Open Library
      bio,
      birthDate,
      deathDate,
      photoUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ⚠️  Open Library author search failed: ${message}`);
    return null;
  }
}

function getOpenLibraryCoverUrl(
  coverId: number | null,
  size: "S" | "M" | "L" = "L"
): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

// Validate that a cover URL returns an actual image (not a 1x1 placeholder)
async function validateCoverUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) return false;

    // Open Library returns a 1x1 transparent GIF (~43 bytes) when no cover exists
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) < 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================
// SERIES PARSING
// ============================================

function parseSeriesFromTitle(title: string): SeriesParseResult {
  // Try multiple patterns in order of specificity

  // Pattern: "Title (Series Name #1)" or "Title (Series Name #1.5)" or "Title (Series Name #1-2)"
  // For ranges like #1-2, we capture only the first number
  const pattern1 = /^(.+?)\s*\(([^)]+?)\s*#([\d.]+)(?:-[\d.]+)?\)\s*$/;
  const match1 = title.match(pattern1);
  if (match1) {
    return {
      cleanTitle: match1[1].trim(),
      seriesName: match1[2].trim(),
      seriesOrder: parseFloat(match1[3]),
    };
  }

  // Pattern: "Title (Series Name, #1)" or "Title (Series Name, Book 1)"
  const pattern1b = /^(.+?)\s*\(([^,]+),\s*(?:Book\s*)?#?([\d.]+)\)\s*$/i;
  const match1b = title.match(pattern1b);
  if (match1b) {
    return {
      cleanTitle: match1b[1].trim(),
      seriesName: match1b[2].trim(),
      seriesOrder: parseFloat(match1b[3]),
    };
  }

  // Pattern: "Title (Series Name Book 1)" - no comma, no #
  const pattern1c = /^(.+?)\s*\(([^)]+?)\s+Book\s*([\d.]+)\)\s*$/i;
  const match1c = title.match(pattern1c);
  if (match1c) {
    return {
      cleanTitle: match1c[1].trim(),
      seriesName: match1c[2].trim(),
      seriesOrder: parseFloat(match1c[3]),
    };
  }

  // Pattern: "Series Name #1: Title" or "Series Name #1 - Title"
  // But NOT if the # is inside parentheses (that's handled by pattern1)
  const pattern2 = /^([^(]+?)\s*#([\d.]+)\s*[-–:]\s*(.+)$/;
  const match2 = title.match(pattern2);
  if (match2) {
    return {
      cleanTitle: match2[3].trim(),
      seriesName: match2[1].trim(),
      seriesOrder: parseFloat(match2[2]),
    };
  }

  // Pattern: "Series Name Book #N - Title" or "Series Name Book N: Title"
  const pattern3 = /^(.+?)\s+Book\s*#?([\d.]+)\s*[-–:]\s*(.+)$/i;
  const match3 = title.match(pattern3);
  if (match3) {
    return {
      cleanTitle: match3[3].trim(),
      seriesName: match3[1].trim(),
      seriesOrder: parseFloat(match3[2]),
    };
  }

  // Pattern: "Title, Book 1" or "Title, #1"
  const pattern4 = /^(.+?),\s*(?:Book\s*)?#?([\d.]+)$/i;
  const match4 = title.match(pattern4);
  if (match4) {
    return {
      cleanTitle: match4[1].trim(),
      seriesName: null, // No series name in this format
      seriesOrder: parseFloat(match4[2]),
    };
  }

  // Pattern: "Book N - Series: Title" (like "Book 2 - Harry Potter: Chamber of Secrets")
  const pattern5 = /^Book\s*([\d.]+)\s*[-–:]\s*(.+)$/i;
  const match5 = title.match(pattern5);
  if (match5) {
    const remaining = match5[2];
    const colonIndex = remaining.indexOf(":");
    if (colonIndex > 0) {
      return {
        cleanTitle: remaining.substring(colonIndex + 1).trim(),
        seriesName: remaining.substring(0, colonIndex).trim(),
        seriesOrder: parseFloat(match5[1]),
      };
    }
    return {
      cleanTitle: remaining.trim(),
      seriesName: null,
      seriesOrder: parseFloat(match5[1]),
    };
  }

  // Pattern: "Title: Book One/Two/Three" etc
  const wordToNum: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const pattern6 = /^(.+?):\s*Book\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)$/i;
  const match6 = title.match(pattern6);
  if (match6) {
    const num = wordToNum[match6[2].toLowerCase()];
    if (num) {
      return {
        cleanTitle: match6[1].trim(),
        seriesName: match6[1].trim(),
        seriesOrder: num,
      };
    }
  }

  // Pattern: "Title - A Series Name Novel" or "Title: A Series Name Story"
  const pattern7 = /^(.+?)\s*[-–:]\s*A\s+(.+?)\s+(?:Novel|Story|Book|Tale)$/i;
  const match7 = title.match(pattern7);
  if (match7) {
    return {
      cleanTitle: match7[1].trim(),
      seriesName: match7[2].trim(),
      seriesOrder: null,
    };
  }

  return { cleanTitle: title, seriesName: null, seriesOrder: null };
}

// ============================================
// MAIN MIGRATION LOGIC
// ============================================

async function main(): Promise<void> {
  console.log("🚀 Starting Firebase to ChapterCheck Migration");
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log("⚠️  DRY RUN MODE - No data will be written\n");
  }

  if (LIMIT > 0) {
    console.log(`📊 Limited to ${LIMIT} books\n`);
  }

  if (!CONVEX_URL) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable not set");
    console.error("   Run: source .env.local");
    process.exit(1);
  }

  // Load Firebase service account
  let serviceAccount;
  try {
    const content = readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8");
    serviceAccount = JSON.parse(content);
  } catch {
    console.error(
      `❌ Could not load Firebase service account from: ${FIREBASE_SERVICE_ACCOUNT_PATH}`
    );
    console.error("   Create this file with your Firebase Admin SDK credentials");
    console.error("   Download from: Firebase Console > Project Settings > Service Accounts");
    process.exit(1);
  }

  // Initialize Firebase
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app);

  // Initialize Convex
  const convex = new ConvexHttpClient(CONVEX_URL);

  // ==========================================
  // STEP 1: Read all data from Firebase
  // ==========================================
  console.log("\n📖 Step 1: Reading data from Firebase...");

  const booksSnapshot = await db.collection("books").get();
  console.log(`   Found ${booksSnapshot.size} books`);

  // Build a map of all books with their authors
  const firebaseBooks: FirebaseBook[] = [];
  for (const bookDoc of booksSnapshot.docs) {
    const book = bookDoc.data();
    const authorsSnapshot = await bookDoc.ref.collection("authors").get();
    const authors = authorsSnapshot.docs.map((a) => ({
      id: a.id,
      ...a.data(),
    })) as FirebaseAuthor[];

    firebaseBooks.push({
      id: bookDoc.id,
      title: book.title,
      authors,
    });
  }

  // Apply limit to books first (so we only process authors for those books)
  const booksToProcess = LIMIT > 0 ? firebaseBooks.slice(0, LIMIT) : firebaseBooks;

  // Get unique authors only from books we'll process
  const authorMap = new Map<string, FirebaseAuthor & { name: string }>();
  for (const book of booksToProcess) {
    for (const author of book.authors) {
      if (!authorMap.has(author.id)) {
        const name = [author.firstName, author.middleInitial, author.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        authorMap.set(author.id, { ...author, name });
      }
    }
  }

  console.log(`   Found ${authorMap.size} unique authors (for ${booksToProcess.length} books)`);

  // ==========================================
  // STEP 2: Migrate Authors (with enrichment)
  // ==========================================
  console.log("\n👤 Step 2: Migrating authors...");

  const authorIdMap = new Map<string, Id<"authors">>(); // firebaseId -> convexId
  let authorCount = 0;
  let authorsEnriched = 0;
  let authorsWithPhotos = 0;

  for (const [firebaseId, author] of authorMap) {
    authorCount++;
    process.stdout.write(
      `\r   Processing author ${authorCount}/${authorMap.size}: ${author.name.padEnd(30)}`
    );

    // Look up author on Open Library for bio/photo
    await sleep(OPEN_LIBRARY_DELAY_MS);
    const olAuthor = await getAuthorFromOpenLibrary(author.name);

    // Use the canonical name from Open Library if available, otherwise keep original
    const authorName = olAuthor?.name || author.name;
    const bio = olAuthor?.bio || undefined;

    // Validate author photo is a real image, not a placeholder
    let photoUrl: string | undefined = undefined;
    if (olAuthor) {
      authorsEnriched++;
      if (olAuthor.photoUrl) {
        const isValidPhoto = await validateCoverUrl(olAuthor.photoUrl);
        if (isValidPhoto) {
          photoUrl = olAuthor.photoUrl;
          authorsWithPhotos++;
        }
      }
    }

    if (!DRY_RUN) {
      try {
        const result = await convex.action(api.migration.mutations.migrateAuthor, {
          firebaseId,
          name: authorName,
          bio: nullToUndefined(bio),
          imageUrl: photoUrl,
        });
        authorIdMap.set(firebaseId, result.authorId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n   ❌ Error migrating author ${author.name}: ${message}`);
      }
    }
  }

  console.log(`\n   ✅ Migrated ${authorCount} authors`);
  console.log(`   📝 Enriched ${authorsEnriched} authors with Open Library data`);
  console.log(`   📷 Found photos for ${authorsWithPhotos} authors`);

  // ==========================================
  // STEP 3: Migrate Books (with series parsing)
  // ==========================================
  console.log("\n📚 Step 3: Migrating books...");

  const seriesMap = new Map<string, Id<"series">>(); // seriesName -> convexId
  let bookCount = 0;
  let enrichedCount = 0;
  let seriesCount = 0;
  let booksWithCovers = 0;

  for (const book of booksToProcess) {
    bookCount++;
    const authorNames = book.authors.map((a) =>
      [a.firstName, a.middleInitial, a.lastName].filter(Boolean).join(" ").trim()
    );
    const primaryAuthor = authorNames[0] || "Unknown";

    if (!VERBOSE) {
      process.stdout.write(
        `\r   Processing book ${bookCount}/${booksToProcess.length}: ${book.title.substring(0, 40).padEnd(40)}...`
      );
    }

    // Parse series from title
    const { cleanTitle, seriesName, seriesOrder } = parseSeriesFromTitle(book.title);

    if (VERBOSE) {
      console.log(`\n   [${bookCount}/${booksToProcess.length}] "${book.title}"`);
      if (seriesName || seriesOrder) {
        console.log(`       → Clean title: "${cleanTitle}"`);
        console.log(`       → Series: "${seriesName || "(none)"}" #${seriesOrder || "?"}`);
      }
    }

    // Get or create series
    let seriesId: Id<"series"> | null = null;
    if (seriesName && !DRY_RUN) {
      if (!seriesMap.has(seriesName)) {
        try {
          const series = await convex.mutation(api.migration.mutations.migrateSeries, {
            name: seriesName,
          });
          seriesMap.set(seriesName, series);
          seriesCount++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`\n   ⚠️  Error creating series "${seriesName}": ${message}`);
        }
      }
      seriesId = seriesMap.get(seriesName) || null;
    }

    // Look up book on Open Library
    await sleep(OPEN_LIBRARY_DELAY_MS);
    const olBook = await searchOpenLibrary(cleanTitle, primaryAuthor);

    let coverUrl: string | undefined = undefined;
    if (olBook) {
      enrichedCount++;
      if (olBook.coverId) {
        const potentialCoverUrl = getOpenLibraryCoverUrl(olBook.coverId);
        if (potentialCoverUrl) {
          // Validate the cover is a real image, not a placeholder
          const isValid = await validateCoverUrl(potentialCoverUrl);
          if (isValid) {
            coverUrl = potentialCoverUrl;
            booksWithCovers++;
          }
        }
      }
    }

    // Get author firebase IDs
    const authorFirebaseIds = book.authors.map((a) => a.id);

    if (!DRY_RUN) {
      try {
        await convex.action(api.migration.mutations.migrateBook, {
          firebaseId: book.id,
          title: cleanTitle,
          subtitle: undefined,
          description: nullToUndefined(olBook?.description),
          isbn: nullToUndefined(olBook?.isbn),
          publishedYear: nullToUndefined(olBook?.publishedYear),
          coverImageUrl: coverUrl,
          language: olBook?.language === "eng" ? "English" : nullToUndefined(olBook?.language),
          seriesId: seriesId || undefined,
          seriesOrder: seriesOrder || undefined,
          authorFirebaseIds,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n   ❌ Error migrating book "${book.title}": ${message}`);
      }
    }
  }

  console.log(`\n   ✅ Migrated ${bookCount} books`);
  console.log(`   📖 Enriched ${enrichedCount} books with Open Library data`);
  console.log(`   🖼️  Found covers for ${booksWithCovers} books`);
  console.log(`   📚 Created ${seriesCount} series`);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ Migration Complete!");
  console.log("=".repeat(60));
  console.log("\n📊 Summary:");
  console.log(
    `   Authors: ${authorCount} (${authorsEnriched} enriched, ${authorsWithPhotos} with photos)`
  );
  console.log(`   Books: ${bookCount} (${enrichedCount} enriched, ${booksWithCovers} with covers)`);
  console.log(`   Series: ${seriesCount}`);

  if (DRY_RUN) {
    console.log("\n⚠️  This was a DRY RUN - no data was written");
    console.log("   Run without --dry-run to perform actual migration");
  }
}

main().catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
