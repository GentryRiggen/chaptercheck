import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireAdminMutation, requireAuthMutation } from "../lib/auth";
import { recalculateBookRating } from "../lib/bookRatings";

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
    isRead: false,
    isReadPrivate: false,
    isReviewPrivate: false,
    createdAt: now,
    updatedAt: now,
  });

  return await ctx.db.get(newId);
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
    const newIsRead = !bookUserData.isRead;

    if (newIsRead) {
      // Marking as read
      await ctx.db.patch(bookUserData._id, {
        isRead: true,
        readAt: now,
        updatedAt: now,
      });
    } else {
      // Unmarking as read - also clear rating and review
      const hadRating = bookUserData.rating !== undefined;

      await ctx.db.patch(bookUserData._id, {
        isRead: false,
        readAt: undefined,
        rating: undefined,
        reviewText: undefined,
        reviewedAt: undefined,
        updatedAt: now,
      });

      // Recalculate book rating if this user had a rating
      if (hadRating) {
        await recalculateBookRating(ctx, args.bookId);
      }
    }

    return { isRead: newIsRead };
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

    // Validate rating if provided (1, 2, or 3 stars)
    if (args.rating !== undefined && (args.rating < 1 || args.rating > 3)) {
      throw new Error("Rating must be 1, 2, or 3");
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

    // Always mark as read when saving a review, set readAt if not already set
    await ctx.db.patch(bookUserData._id, {
      isRead: true,
      readAt: bookUserData.readAt ?? now,
      rating: args.rating,
      reviewText: args.reviewText,
      reviewedAt: hasReviewContent ? now : undefined,
      isReadPrivate: args.isReadPrivate,
      isReviewPrivate,
      updatedAt: now,
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
