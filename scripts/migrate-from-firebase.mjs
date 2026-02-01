#!/usr/bin/env node

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
import { readFileSync } from "fs";

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
const LIMIT = parseInt(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "0");

// ============================================
// OPEN LIBRARY API HELPERS
// ============================================

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert null to undefined for Convex optional fields
function nullToUndefined(value) {
  return value === null ? undefined : value;
}

async function searchOpenLibrary(title, authorName) {
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
    console.error(`  ⚠️  Open Library search failed: ${error.message}`);
    return null;
  }
}

async function getAuthorFromOpenLibrary(authorName) {
  try {
    const query = encodeURIComponent(authorName);
    const url = `https://openlibrary.org/search/authors.json?q=${query}&limit=3`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.docs || data.docs.length === 0) return null;

    const author = data.docs[0];

    return {
      name: author.name,
      bio: author.top_work ? `Author of "${author.top_work}"` : null,
      photoId: author.key ? author.key.replace("/authors/", "") : null,
    };
  } catch (error) {
    console.error(`  ⚠️  Open Library author search failed: ${error.message}`);
    return null;
  }
}

function getOpenLibraryCoverUrl(coverId, size = "L") {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

function getOpenLibraryAuthorPhotoUrl(authorKey, size = "L") {
  if (!authorKey) return null;
  return `https://covers.openlibrary.org/a/olid/${authorKey}-${size}.jpg`;
}

// ============================================
// SERIES PARSING
// ============================================

function parseSeriesFromTitle(title) {
  // Patterns to match series info:
  // "Book Title (Series Name #1)"
  // "Book Title (Series Name #1.5)"
  // "Series Name Book #1 - Book Title"
  // "Book 1 - Series Name: Book Title"

  // Pattern 1: "Title (Series #N)"
  const pattern1 = /^(.+?)\s*\(([^#]+?)#([\d.]+)\)\s*$/;
  const match1 = title.match(pattern1);
  if (match1) {
    return {
      cleanTitle: match1[1].trim(),
      seriesName: match1[2].trim(),
      seriesOrder: parseFloat(match1[3]),
    };
  }

  // Pattern 2: "Series Book #N - Title"
  const pattern2 = /^(.+?)\s+Book\s*#?(\d+)\s*[-–:]\s*(.+)$/i;
  const match2 = title.match(pattern2);
  if (match2) {
    return {
      cleanTitle: match2[3].trim(),
      seriesName: match2[1].trim(),
      seriesOrder: parseFloat(match2[2]),
    };
  }

  // Pattern 3: "Book N - Series: Title" (like "Book 2 - Harry Potter...")
  const pattern3 = /^Book\s*(\d+)\s*[-–:]\s*(.+)$/i;
  const match3 = title.match(pattern3);
  if (match3) {
    // Extract series from the remaining title if it contains a colon
    const remaining = match3[2];
    const colonIndex = remaining.indexOf(":");
    if (colonIndex > 0) {
      return {
        cleanTitle: remaining.substring(colonIndex + 1).trim(),
        seriesName: remaining.substring(0, colonIndex).trim(),
        seriesOrder: parseFloat(match3[1]),
      };
    }
    return {
      cleanTitle: remaining.trim(),
      seriesName: null,
      seriesOrder: parseFloat(match3[1]),
    };
  }

  return { cleanTitle: title, seriesName: null, seriesOrder: null };
}

// ============================================
// MAIN MIGRATION LOGIC
// ============================================

async function main() {
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
  const firebaseBooks = [];
  for (const bookDoc of booksSnapshot.docs) {
    const book = bookDoc.data();
    const authorsSnapshot = await bookDoc.ref.collection("authors").get();
    const authors = authorsSnapshot.docs.map((a) => ({ id: a.id, ...a.data() }));

    firebaseBooks.push({
      id: bookDoc.id,
      ...book,
      authors,
    });
  }

  // Get unique authors
  const authorMap = new Map();
  for (const book of firebaseBooks) {
    for (const author of book.authors) {
      if (!authorMap.has(author.id)) {
        const name = [author.firstName, author.middleInitial, author.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        authorMap.set(author.id, { id: author.id, name, ...author });
      }
    }
  }

  console.log(`   Found ${authorMap.size} unique authors`);

  // ==========================================
  // STEP 2: Migrate Authors
  // ==========================================
  console.log("\n👤 Step 2: Migrating authors...");

  const authorIdMap = new Map(); // firebaseId -> convexId
  let authorCount = 0;

  for (const [firebaseId, author] of authorMap) {
    authorCount++;
    process.stdout.write(`\r   Processing author ${authorCount}/${authorMap.size}: ${author.name}`);

    // Look up author on Open Library for bio/photo
    await sleep(OPEN_LIBRARY_DELAY_MS);
    const olAuthor = await getAuthorFromOpenLibrary(author.name);
    const photoUrl = olAuthor?.photoId ? getOpenLibraryAuthorPhotoUrl(olAuthor.photoId) : undefined;

    if (!DRY_RUN) {
      try {
        const result = await convex.action(api.migration.mutations.migrateAuthor, {
          firebaseId,
          name: author.name,
          bio: nullToUndefined(olAuthor?.bio),
          imageUrl: photoUrl,
        });
        authorIdMap.set(firebaseId, result.authorId);
      } catch (error) {
        console.error(`\n   ❌ Error migrating author ${author.name}: ${error.message}`);
      }
    }
  }

  console.log(`\n   ✅ Migrated ${authorCount} authors`);

  // ==========================================
  // STEP 3: Migrate Books (with series parsing)
  // ==========================================
  console.log("\n📚 Step 3: Migrating books...");

  const seriesMap = new Map(); // seriesName -> convexId
  let bookCount = 0;
  let enrichedCount = 0;
  let seriesCount = 0;

  const booksToProcess = LIMIT > 0 ? firebaseBooks.slice(0, LIMIT) : firebaseBooks;

  for (const book of booksToProcess) {
    bookCount++;
    const authorNames = book.authors.map((a) =>
      [a.firstName, a.middleInitial, a.lastName].filter(Boolean).join(" ").trim()
    );
    const primaryAuthor = authorNames[0] || "Unknown";

    process.stdout.write(
      `\r   Processing book ${bookCount}/${booksToProcess.length}: ${book.title.substring(0, 40)}...`
    );

    // Parse series from title
    const { cleanTitle, seriesName, seriesOrder } = parseSeriesFromTitle(book.title);

    // Get or create series
    let seriesId = null;
    if (seriesName && !DRY_RUN) {
      if (!seriesMap.has(seriesName)) {
        try {
          const series = await convex.mutation(api.migration.mutations.migrateSeries, {
            name: seriesName,
          });
          seriesMap.set(seriesName, series);
          seriesCount++;
        } catch (error) {
          console.error(`\n   ⚠️  Error creating series "${seriesName}": ${error.message}`);
        }
      }
      seriesId = seriesMap.get(seriesName);
    }

    // Look up book on Open Library
    await sleep(OPEN_LIBRARY_DELAY_MS);
    const olBook = await searchOpenLibrary(cleanTitle, primaryAuthor);

    if (olBook) {
      enrichedCount++;
    }

    const coverUrl = olBook?.coverId ? getOpenLibraryCoverUrl(olBook.coverId) : undefined;

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
        console.error(`\n   ❌ Error migrating book "${book.title}": ${error.message}`);
      }
    }
  }

  console.log(`\n   ✅ Migrated ${bookCount} books`);
  console.log(`   📖 Enriched ${enrichedCount} books with Open Library data`);
  console.log(`   📚 Created ${seriesCount} series`);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("✅ Migration Complete!");
  console.log("=".repeat(60));
  console.log(`   Authors: ${authorCount}`);
  console.log(`   Books: ${bookCount}`);
  console.log(`   Series: ${seriesCount}`);
  console.log(`   Books enriched: ${enrichedCount}`);

  if (DRY_RUN) {
    console.log("\n⚠️  This was a DRY RUN - no data was written");
    console.log("   Run without --dry-run to perform actual migration");
  }
}

main().catch((error) => {
  console.error("\n❌ Migration failed:", error);
  process.exit(1);
});
