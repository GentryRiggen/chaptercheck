import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireAdminMutation, requireAuthMutation } from "../lib/auth";
import { recalculateBookRating } from "../lib/bookRatings";
import {
  BOOK_STATUS_VALUES,
  getLegacyIsRead,
  type BookStatus,
  isFinishedStatus,
} from "../lib/bookUserData";
import { getWantToReadShelfBook } from "../lib/wantToReadShelf";

/**
 * Helper to get or create bookUserData for a user/book combination
 */
async function getOrCreateBookUserData(ctx: MutationCtx, userId: Id<"users">, bookId: Id<"books">) {
  const existing = await ctx.db
    .query("bookUserData")
    .withIndex("by_user_and_book", (q) => q.eq("userId", userId).eq("bookId", bookId))
    .unique();

  if (existing) {
    return existing;
  }

  const now = Date.now();
  const newId = await ctx.db.insert("bookUserData", {
    userId,
    bookId,
    status: "want_to_read",
    isRead: false,
    isReadPrivate: false,
    isReviewPrivate: false,
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(newId);
}

type BookFormat = "physical" | "ebook" | "audiobook" | "mixed";

function buildStatusPatch(
  current: {
    status?: string;
    startedAt?: number;
    finishedAt?: number;
    rereadCount?: number;
    currentFormat?: BookFormat;
    favorite?: boolean;
    personalSummary?: string;
  },
  args: {
    status: BookStatus;
    startedAt?: number;
    finishedAt?: number;
    currentFormat?: BookFormat;
    favorite?: boolean;
    personalSummary?: string;
  },
  now: number
) {
  const startedAt =
    args.startedAt !== undefined
      ? args.startedAt
      : args.status === "want_to_read"
        ? undefined
        : args.status === "reading" && current.startedAt === undefined
          ? now
          : args.status === "finished" && current.startedAt === undefined
            ? (args.finishedAt ?? now)
            : current.startedAt;

  const finishedAt =
    args.finishedAt !== undefined
      ? args.finishedAt
      : isFinishedStatus(args.status)
        ? (current.finishedAt ?? now)
        : undefined;

  const rereadCount =
    current.status === "finished" && args.status === "reading"
      ? (current.rereadCount ?? 0) + 1
      : current.rereadCount;

  return {
    status: args.status,
    startedAt,
    finishedAt,
    lastStatusChangedAt: now,
    rereadCount,
    currentFormat: args.currentFormat ?? current.currentFormat,
    favorite: args.favorite ?? current.favorite,
    personalSummary: args.personalSummary ?? current.personalSummary,
    isRead: getLegacyIsRead(args.status),
    readAt: finishedAt,
    updatedAt: now,
  };
}

/**
 * Toggle read status for a book
 * If marking as read, sets readAt to current time
 * If unmarking, clears readAt and also clears rating/review
 */
export const markAsRead = mutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    // Verify book exists
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const bookUserData = await getOrCreateBookUserData(ctx, user._id, args.bookId);
    if (!bookUserData) {
      throw new Error("Failed to get or create book user data");
    }

    const now = Date.now();
    const currentStatus = (bookUserData.status as BookStatus | undefined) ?? "want_to_read";
    const newStatus: BookStatus = currentStatus === "finished" ? "want_to_read" : "finished";

    if (newStatus === "finished") {
      // Marking as read
      await ctx.db.patch(bookUserData._id, {
        ...buildStatusPatch(bookUserData, { status: "finished", finishedAt: now }, now),
      });

      const wantToRead = await getWantToReadShelfBook(ctx, user._id, args.bookId);
      if (wantToRead?.shelf && wantToRead.shelfBook) {
        await ctx.db.delete(wantToRead.shelfBook._id);
        await ctx.db.patch(wantToRead.shelf._id, { updatedAt: now });
      }
    } else {
      // Unmarking as read - also clear rating and review
      const hadRating = bookUserData.rating !== undefined;

      await ctx.db.patch(bookUserData._id, {
        ...buildStatusPatch(bookUserData, { status: "want_to_read" }, now),
        isRead: false,
        readAt: undefined,
        finishedAt: undefined,
        rating: undefined,
        reviewText: undefined,
        reviewedAt: undefined,
      });

      // Recalculate book rating if this user had a rating
      if (hadRating) {
        await recalculateBookRating(ctx, args.bookId);
      }
    }

    return { isRead: newStatus === "finished" };
  },
});

export const setReadingStatus = mutation({
  args: {
    bookId: v.id("books"),
    status: v.union(...BOOK_STATUS_VALUES.map((status) => v.literal(status))),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    currentFormat: v.optional(
      v.union(v.literal("physical"), v.literal("ebook"), v.literal("audiobook"), v.literal("mixed"))
    ),
    favorite: v.optional(v.boolean()),
    personalSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const bookUserData = await getOrCreateBookUserData(ctx, user._id, args.bookId);
    if (!bookUserData) {
      throw new Error("Failed to get or create book user data");
    }

    const now = Date.now();
    await ctx.db.patch(
      bookUserData._id,
      buildStatusPatch(
        bookUserData,
        {
          status: args.status,
          startedAt: args.startedAt,
          finishedAt: args.finishedAt,
          currentFormat: args.currentFormat,
          favorite: args.favorite,
          personalSummary: args.personalSummary,
        },
        now
      )
    );

    if (args.status !== "want_to_read") {
      const wantToRead = await getWantToReadShelfBook(ctx, user._id, args.bookId);
      if (wantToRead?.shelf && wantToRead.shelfBook) {
        await ctx.db.delete(wantToRead.shelfBook._id);
        await ctx.db.patch(wantToRead.shelf._id, { updatedAt: now });
      }
    }

    return { success: true };
  },
});

export const updateBookMemory = mutation({
  args: {
    bookId: v.id("books"),
    personalSummary: v.optional(v.string()),
    currentFormat: v.optional(
      v.union(v.literal("physical"), v.literal("ebook"), v.literal("audiobook"), v.literal("mixed"))
    ),
    favorite: v.optional(v.boolean()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const bookUserData = await getOrCreateBookUserData(ctx, user._id, args.bookId);
    if (!bookUserData) {
      throw new Error("Failed to get or create book user data");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.personalSummary !== undefined) patch.personalSummary = args.personalSummary;
    if (args.currentFormat !== undefined) patch.currentFormat = args.currentFormat;
    if (args.favorite !== undefined) patch.favorite = args.favorite;
    if (args.startedAt !== undefined) patch.startedAt = args.startedAt;
    if (args.finishedAt !== undefined) {
      patch.finishedAt = args.finishedAt;
      patch.readAt = args.finishedAt;
    }

    await ctx.db.patch(bookUserData._id, patch);
    return { success: true };
  },
});

/**
 * Save or update a review for a book
 * Also marks the book as read if not already
 * Enforces: if isReadPrivate=true, force isReviewPrivate=true
 */
export const saveReview = mutation({
  args: {
    bookId: v.id("books"),
    rating: v.optional(v.number()),
    reviewText: v.optional(v.string()),
    isReadPrivate: v.boolean(),
    isReviewPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    // Verify book exists
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    // Validate rating if provided (1-5 stars)
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Enforce privacy cascade: if read is private, review must also be private
    const isReviewPrivate = args.isReadPrivate ? true : args.isReviewPrivate;

    const bookUserData = await getOrCreateBookUserData(ctx, user._id, args.bookId);
    if (!bookUserData) {
      throw new Error("Failed to get or create book user data");
    }

    const now = Date.now();
    const hasReviewContent = args.rating !== undefined || args.reviewText;
    const ratingChanged = bookUserData.rating !== args.rating;

    const nextStatus: BookStatus =
      (bookUserData.status as BookStatus | undefined) === "finished" ? "finished" : "finished";

    // Saving a review implies the user finished the book unless already explicitly tracked.
    await ctx.db.patch(bookUserData._id, {
      ...buildStatusPatch(
        bookUserData,
        {
          status: nextStatus,
          finishedAt: bookUserData.finishedAt ?? bookUserData.readAt ?? now,
        },
        now
      ),
      isRead: true,
      readAt: bookUserData.readAt ?? bookUserData.finishedAt ?? now,
      rating: args.rating,
      reviewText: args.reviewText,
      reviewedAt: hasReviewContent ? now : undefined,
      isReadPrivate: args.isReadPrivate,
      isReviewPrivate,
    });

    // Recalculate book rating if the rating changed
    if (ratingChanged) {
      await recalculateBookRating(ctx, args.bookId);
    }

    return { success: true };
  },
});

/**
 * Update privacy settings for a book
 * Enforces: if isReadPrivate=true, force isReviewPrivate=true
 */
export const updatePrivacy = mutation({
  args: {
    bookId: v.id("books"),
    isReadPrivate: v.optional(v.boolean()),
    isReviewPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    // Verify book exists
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const bookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user_and_book", (q) => q.eq("userId", user._id).eq("bookId", args.bookId))
      .unique();

    if (!bookUserData) {
      throw new Error("No book data found for this user and book");
    }

    const now = Date.now();

    // Determine new privacy values
    const newIsReadPrivate = args.isReadPrivate ?? bookUserData.isReadPrivate;
    let newIsReviewPrivate = args.isReviewPrivate ?? bookUserData.isReviewPrivate;

    // Enforce cascade: if read is private, review must also be private
    if (newIsReadPrivate) {
      newIsReviewPrivate = true;
    }

    await ctx.db.patch(bookUserData._id, {
      isReadPrivate: newIsReadPrivate,
      isReviewPrivate: newIsReviewPrivate,
      updatedAt: now,
    });

    return {
      isReadPrivate: newIsReadPrivate,
      isReviewPrivate: newIsReviewPrivate,
    };
  },
});

/**
 * Delete all user data for a book
 * Removes the bookUserData record entirely
 */
export const deleteBookUserData = mutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    const bookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user_and_book", (q) => q.eq("userId", user._id).eq("bookId", args.bookId))
      .unique();

    if (!bookUserData) {
      // No data to delete - this is not an error
      return { success: true, deleted: false };
    }

    const hadRating = bookUserData.rating !== undefined;

    await ctx.db.delete(bookUserData._id);

    // Recalculate book rating if this user had a rating
    if (hadRating) {
      await recalculateBookRating(ctx, args.bookId);
    }

    return { success: true, deleted: true };
  },
});

/**
 * Admin-only: Delete any user's review
 * Clears rating/reviewText/reviewedAt but preserves isRead status
 */
export const adminDeleteReview = mutation({
  args: {
    bookUserDataId: v.id("bookUserData"),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const bookUserData = await ctx.db.get(args.bookUserDataId);
    if (!bookUserData) {
      throw new Error("Review not found");
    }

    const hadRating = bookUserData.rating !== undefined;
    const bookId = bookUserData.bookId;

    // Clear only review-related fields, preserve read status
    await ctx.db.patch(args.bookUserDataId, {
      rating: undefined,
      reviewText: undefined,
      reviewedAt: undefined,
      updatedAt: Date.now(),
    });

    // Recalculate book rating if this review had a rating
    if (hadRating) {
      await recalculateBookRating(ctx, bookId);
    }

    return { success: true };
  },
});
