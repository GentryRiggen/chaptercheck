# Audio Files Migration

Migrates audio files from Firebase Storage to Cloudflare R2. Must be run **after** the authors/books migration.

## Required Environment Variables

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud

# Clerk user ID (files will be owned by this user)
MIGRATION_CLERK_ID=user_xxxxxxxxxxxxx

# R2 Storage
R2_BUCKET_NAME=chaptercheck-audiobooks
R2_ACCOUNT_ID=xxxxx
R2_ACCESS_KEY_ID=xxxxx
R2_SECRET_ACCESS_KEY=xxxxx

# Optional: Control R2 path prefix (default: dev)
STORAGE_ENV=production  # Use "production" for prod/ prefix
```

## Usage

```bash
# Full migration
npm run migrate:files

# Dry run (preview without uploading)
npm run migrate:files:dry-run

# Test with 5 books, verbose output
npm run migrate:files:test
```

## Options

| Option                     | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `--dry-run`                | Preview changes without uploading to R2            |
| `--verbose` or `-v`        | Show detailed output                               |
| `--limit N` or `--limit=N` | Only process N books                               |
| `--concurrency N`          | Process N files in parallel (default: 3)           |
| `--no-concurrency`         | Disable parallel uploads (same as --concurrency 1) |

## Examples

```bash
# Preview 5 books with verbose output
npm run migrate:files -- --dry-run --limit 5 -v

# Migrate 10 books
npm run migrate:files -- --limit 10

# Migrate with 3 parallel uploads (faster)
npm run migrate:files -- --concurrency 3

# Migrate to prod
STORAGE_ENV=production npm run migrate:files

# Migrate to prod with concurrency
STORAGE_ENV=production npm run migrate:files -- --concurrency 3
```

## R2 Path Format

Files are stored at:

```
{env}/users/{clerkId}/audiobooks/{bookId}/{fileName}
```

Example:

```
prod/users/user_xxx/audiobooks/jh744aj2vj70/TheWayOfKings_part1.mp3
```

## Environment Control

The `STORAGE_ENV` variable controls the R2 path prefix:

| STORAGE_ENV  | Prefix  |
| ------------ | ------- |
| (not set)    | `dev/`  |
| `dev`        | `dev/`  |
| `production` | `prod/` |

## Firebase Storage Path

The script expects files at `{bookId}/{fileId}.{ext}` in Firebase Storage.

## Idempotency

Safe to run multiple times:

- Checks if each file already exists in Convex (by `firebaseStoragePath`)
- Skips files that are already migrated
- Shows skip count in summary

## Troubleshooting

### "Server Error" when running migration

The Convex functions may not be deployed:

```bash
npx convex deploy  # for prod
npx convex dev --once  # for dev
```

### "R2 credentials not configured"

Ensure all R2 variables are set in `.env.local`:

- `R2_BUCKET_NAME`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

### "User not found for clerkId"

The `MIGRATION_CLERK_ID` must be a valid user in the target Convex database. Make sure you're using the correct Clerk ID for dev vs prod.

### Files going to wrong environment prefix

Set `STORAGE_ENV=production` for prod migrations:

```bash
STORAGE_ENV=production npm run migrate:files
```
