# Migration Scripts

Scripts for migrating data from the old Firebase "books-bro" app to ChapterCheck.

## Prerequisites

### Firebase Service Account

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save as `firebase-service-account.json` in the project root

### Environment Variables

The scripts read from `.env.local`. See individual script READMEs for required variables.

## Scripts

| Script                                                                 | Description                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------- |
| [migrate-from-firebase](./README-migrate-from-firebase.md)             | Migrate authors, books, and series from Firestore |
| [migrate-files-from-firebase](./README-migrate-files-from-firebase.md) | Migrate audio files from Firebase Storage to R2   |

## Order of Operations

1. Run authors/books migration first
2. Run files migration second (depends on books existing)

## Running for Production

1. Update `.env.local` with prod Convex and Clerk values
2. Deploy Convex functions to prod:
   ```bash
   npx convex deploy
   ```
3. Run migrations with `STORAGE_ENV=production`:
   ```bash
   STORAGE_ENV=production npm run migrate:files
   ```
