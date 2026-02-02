# Authors & Books Migration

Migrates authors, books, and series from Firebase Firestore to Convex. Enriches data with Open Library API (covers, descriptions, bios).

## Required Environment Variables

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud

# Firebase (or set FIREBASE_SERVICE_ACCOUNT_PATH)
# Default: ./firebase-service-account.json
```

## Usage

```bash
# Full migration
npm run migrate

# Dry run (preview without writing)
npm run migrate:dry-run

# Test with 5 books
npm run migrate:test
```

## Options

| Option              | Description                               |
| ------------------- | ----------------------------------------- |
| `--dry-run`         | Preview changes without writing to Convex |
| `--verbose` or `-v` | Show detailed output                      |
| `--limit=N`         | Only process N books                      |

## Examples

```bash
# Preview all books with verbose output
npm run migrate -- --dry-run --verbose

# Migrate 10 books
npm run migrate -- --limit=10

# Full migration with verbose output
npm run migrate -- -v
```

## What It Does

1. Reads all books and authors from Firebase Firestore
2. For each author:
   - Searches Open Library for bio and photo
   - Creates/updates author in Convex
   - Uploads photo to R2 if found
3. For each book:
   - Parses series info from title (e.g., "Title (Series #1)")
   - Searches Open Library for cover, description, ISBN
   - Creates/updates series, book, and author relationships in Convex
   - Uploads cover to R2 if found

## Idempotency

Safe to run multiple times - uses `firebaseId` to detect existing records and updates them.
