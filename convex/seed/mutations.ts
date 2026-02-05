import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { recalculateBookRating } from "../lib/bookRatings";

/**
 * Mutations for database seeding.
 *
 * WARNING: These mutations bypass authentication and should ONLY be used
 * for development/testing purposes. They are exposed as public mutations
 * so they can be called from the seed script.
 */

// =============================================================================
// SEED USERS
// =============================================================================

export const seedUsers = mutation({
  args: {
    users: v.array(
      v.object({
        clerkId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
        hasPremium: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds: Id<"users">[] = [];

    for (const user of args.users) {
      const userId = await ctx.db.insert("users", {
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        role: user.role,
        hasPremium: user.hasPremium,
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(userId);
    }

    return insertedIds;
  },
});

// =============================================================================
// SEED AUTHORS
// =============================================================================

export const seedAuthors = mutation({
  args: {
    authors: v.array(
      v.object({
        name: v.string(),
        bio: v.optional(v.string()),
        imageR2Key: v.optional(v.string()), // Can be external URL for seed data
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds: Id<"authors">[] = [];

    for (const author of args.authors) {
      const authorId = await ctx.db.insert("authors", {
        name: author.name,
        bio: author.bio,
        imageR2Key: author.imageR2Key,
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(authorId);
    }

    return insertedIds;
  },
});

// =============================================================================
// SEED SERIES
// =============================================================================

export const seedSeries = mutation({
  args: {
    series: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds: Id<"series">[] = [];

    for (const s of args.series) {
      const seriesId = await ctx.db.insert("series", {
        name: s.name,
        description: s.description,
        createdAt: now,
        updatedAt: now,
      });
      insertedIds.push(seriesId);
    }

    return insertedIds;
  },
});

// =============================================================================
// SEED BOOKS
// =============================================================================

export const seedBooks = mutation({
  args: {
    books: v.array(
      v.object({
        title: v.string(),
        subtitle: v.optional(v.string()),
        description: v.optional(v.string()),
        isbn: v.optional(v.string()),
        publishedYear: v.optional(v.number()),
        coverImageR2Key: v.optional(v.string()), // Can be external URL for seed data
        language: v.optional(v.string()),
        duration: v.optional(v.number()),
        seriesId: v.optional(v.string()), // String ID to be cast
        seriesOrder: v.optional(v.number()),
        authorIds: v.array(v.string()), // String IDs to be cast
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds: Id<"books">[] = [];

    for (const book of args.books) {
      // Cast string IDs to proper Convex IDs
      const seriesId = book.seriesId ? (book.seriesId as Id<"series">) : undefined;
      const authorIds = book.authorIds.map((id) => id as Id<"authors">);

      // Insert the book
      const bookId = await ctx.db.insert("books", {
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        isbn: book.isbn,
        publishedYear: book.publishedYear,
        coverImageR2Key: book.coverImageR2Key,
        language: book.language,
        duration: book.duration,
        seriesId,
        seriesOrder: book.seriesOrder,
        createdAt: now,
        updatedAt: now,
      });

      // Create book-author relationships
      for (const authorId of authorIds) {
        await ctx.db.insert("bookAuthors", {
          bookId,
          authorId,
          role: "author",
        });
      }

      insertedIds.push(bookId);
    }

    return insertedIds;
  },
});

// =============================================================================
// SEED BOOK USER DATA (Reviews/Ratings)
// =============================================================================

export const seedBookUserData = mutation({
  args: {
    reviews: v.array(
      v.object({
        userId: v.string(), // String ID to be cast
        bookId: v.string(), // String ID to be cast
        isRead: v.boolean(),
        rating: v.optional(v.number()), // 1, 2, or 3
        reviewText: v.optional(v.string()),
        isReadPrivate: v.boolean(),
        isReviewPrivate: v.boolean(),
        readAt: v.optional(v.number()), // Timestamp for when book was read
        reviewedAt: v.optional(v.number()), // Timestamp for when review was written
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const insertedIds: Id<"bookUserData">[] = [];

    for (const review of args.reviews) {
      // Cast string IDs to proper Convex IDs
      const userId = review.userId as Id<"users">;
      const bookId = review.bookId as Id<"books">;

      // Use provided timestamps or fall back to now
      const readAt = review.isRead ? (review.readAt ?? now) : undefined;
      const reviewedAt =
        review.rating || review.reviewText ? (review.reviewedAt ?? now) : undefined;

      const bookUserDataId = await ctx.db.insert("bookUserData", {
        userId,
        bookId,
        isRead: review.isRead,
        readAt,
        rating: review.rating,
        reviewText: review.reviewText,
        reviewedAt,
        isReadPrivate: review.isReadPrivate,
        isReviewPrivate: review.isReviewPrivate,
        createdAt: readAt ?? now,
        updatedAt: reviewedAt ?? readAt ?? now,
      });
      insertedIds.push(bookUserDataId);
    }

    return insertedIds;
  },
});

// =============================================================================
// RECALCULATE BOOK RATINGS
// =============================================================================

/**
 * Recalculate ratings for all books.
 * Call this after seeding reviews to update denormalized rating stats.
 * Processes books in batches to avoid hitting Convex limits.
 */
export const recalculateAllBookRatings = mutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const BATCH_SIZE = 100;

    // Get all books
    const allBooks = await ctx.db.query("books").collect();

    // Manual pagination using cursor (book ID)
    const startIndex = args.cursor ? allBooks.findIndex((b) => b._id === args.cursor) + 1 : 0;
    const batchBooks = allBooks.slice(startIndex, startIndex + BATCH_SIZE);

    // Recalculate ratings for each book in the batch
    for (const book of batchBooks) {
      await recalculateBookRating(ctx, book._id);
    }

    const hasMore = startIndex + BATCH_SIZE < allBooks.length;
    const nextCursor = hasMore ? batchBooks[batchBooks.length - 1]?._id : null;

    return {
      processed: batchBooks.length,
      hasMore,
      nextCursor,
    };
  },
});

// =============================================================================
// NUKE DATABASE
// =============================================================================

// Users to preserve during nuke (by email)
const PRESERVED_USER_EMAILS = ["gentry.riggen@gmail.com"];

type NukeTableName =
  | "users"
  | "authors"
  | "series"
  | "books"
  | "bookAuthors"
  | "bookUserData"
  | "audioFiles"
  | "storageAccounts";

// Batch size to stay under Convex read/write limits
const NUKE_BATCH_SIZE = 500;

/**
 * Nuke a single table in batches. Call repeatedly until done.
 * Returns { deleted, preserved, done }
 */
export const nukeTable = mutation({
  args: {
    table: v.union(
      v.literal("users"),
      v.literal("authors"),
      v.literal("series"),
      v.literal("books"),
      v.literal("bookAuthors"),
      v.literal("bookUserData"),
      v.literal("audioFiles"),
      v.literal("storageAccounts")
    ),
    preservedUserIds: v.array(v.string()),
    preservedStorageAccountIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const tableName = args.table as NukeTableName;
    const preservedUserIdSet = new Set(args.preservedUserIds);
    const preservedStorageAccountIdSet = new Set(args.preservedStorageAccountIds);

    // Query a batch of documents
    const documents = await ctx.db.query(tableName).take(NUKE_BATCH_SIZE);

    let deleted = 0;
    let preserved = 0;

    for (const doc of documents) {
      let shouldPreserve = false;

      if (tableName === "users") {
        shouldPreserve = preservedUserIdSet.has(doc._id);
      } else if (tableName === "storageAccounts") {
        shouldPreserve = preservedStorageAccountIdSet.has(doc._id);
      }

      if (shouldPreserve) {
        preserved++;
      } else {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    }

    // If we deleted less than batch size, we might be done
    // But we need to account for preserved items
    const done = documents.length < NUKE_BATCH_SIZE;

    return { deleted, preserved, done };
  },
});

/**
 * Get users to preserve and their storage accounts.
 */
export const getPreservedIds = mutation({
  args: {},
  handler: async (ctx) => {
    const preservedUserIds: string[] = [];
    const preservedStorageAccountIds: string[] = [];

    // Query users by email - this should be a small set
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      if (PRESERVED_USER_EMAILS.includes(user.email)) {
        preservedUserIds.push(user._id);
        if (user.storageAccountId) {
          preservedStorageAccountIds.push(user.storageAccountId);
        }
      }
    }

    return { preservedUserIds, preservedStorageAccountIds };
  },
});
