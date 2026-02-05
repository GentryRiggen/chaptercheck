import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getCurrentUser, requireAuth } from "../lib/auth";

/**
 * Get current user's data for a specific book
 * Returns null if no data exists for this user/book combination
 */
export const getMyBookData = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const bookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user_and_book", (q) => q.eq("userId", user._id).eq("bookId", args.bookId))
      .unique();

    return bookUserData;
  },
});

/**
 * Get public reviews for a book
 * Returns reviews where isReviewPrivate is false, ordered by reviewedAt descending
 */
export const getPublicReviewsForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Get all reviews for this book that have a review (rating or text) and are public
    const allBookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Filter to public reviews that have actual review content
    const publicReviews = allBookUserData.filter(
      (data) => !data.isReviewPrivate && (data.rating !== undefined || data.reviewText)
    );

    // Sort by reviewedAt descending (most recent first)
    publicReviews.sort((a, b) => {
      const aTime = a.reviewedAt ?? 0;
      const bTime = b.reviewedAt ?? 0;
      return bTime - aTime;
    });

    // Enrich with user info
    const reviewsWithUsers = await Promise.all(
      publicReviews.map(async (review) => {
        const user = await ctx.db.get(review.userId);
        return {
          ...review,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                imageUrl: user.imageUrl,
              }
            : null,
        };
      })
    );

    return reviewsWithUsers;
  },
});

// Sort options for reviews
export type ReviewSortOption = "recent" | "oldest" | "highest" | "lowest";

/**
 * Get public reviews for a book with pagination
 * Returns reviews where isReviewPrivate is false
 * Supports sorting and filtering options
 * Includes user info and isOwnReview flag for the current user
 */
export const getPublicReviewsForBookPaginated = query({
  args: {
    bookId: v.id("books"),
    paginationOpts: paginationOptsValidator,
    sortBy: v.optional(
      v.union(v.literal("recent"), v.literal("oldest"), v.literal("highest"), v.literal("lowest"))
    ),
    withTextOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    const sortBy = args.sortBy ?? "recent";
    const withTextOnly = args.withTextOnly ?? false;

    // Get all reviews for this book
    const allBookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Filter to public reviews that have actual review content
    let publicReviews = allBookUserData.filter(
      (data) => !data.isReviewPrivate && (data.rating !== undefined || data.reviewText)
    );

    // Apply withTextOnly filter
    if (withTextOnly) {
      publicReviews = publicReviews.filter((data) => data.reviewText && data.reviewText.length > 0);
    }

    // Sort based on sortBy option
    publicReviews.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (a.reviewedAt ?? 0) - (b.reviewedAt ?? 0);
        case "highest":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "lowest":
          return (a.rating ?? 0) - (b.rating ?? 0);
        case "recent":
        default:
          return (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0);
      }
    });

    // Manual pagination
    const { cursor, numItems } = args.paginationOpts;
    const startIndex = cursor ? parseInt(cursor as string, 10) : 0;
    const endIndex = startIndex + numItems;
    const paginatedReviews = publicReviews.slice(startIndex, endIndex);
    const hasMore = endIndex < publicReviews.length;

    // Enrich with user info
    const reviewsWithUsers = await Promise.all(
      paginatedReviews.map(async (review) => {
        const reviewUser = await ctx.db.get(review.userId);
        return {
          ...review,
          isOwnReview: review.userId === user._id,
          user: reviewUser
            ? {
                _id: reviewUser._id,
                name: reviewUser.name,
                imageUrl: reviewUser.imageUrl,
              }
            : null,
        };
      })
    );

    return {
      page: reviewsWithUsers,
      isDone: !hasMore,
      continueCursor: hasMore ? String(endIndex) : null,
    };
  },
});

/**
 * Get rating statistics for a book
 * Returns average rating and count of ratings (includes all ratings, even private ones)
 */
export const getBookRatingStats = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const allBookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Include ALL ratings in the average (even private ones)
    const allRatings = allBookUserData.filter((data) => data.rating !== undefined);

    // Count only public reviews for the review count display
    const publicReviewCount = allBookUserData.filter(
      (data) => !data.isReviewPrivate && (data.rating !== undefined || data.reviewText)
    ).length;

    if (allRatings.length === 0) {
      return {
        averageRating: null,
        ratingCount: allRatings.length,
        reviewCount: publicReviewCount,
      };
    }

    const totalRating = allRatings.reduce((sum, data) => sum + (data.rating ?? 0), 0);
    const averageRating = totalRating / allRatings.length;

    return {
      averageRating,
      ratingCount: allRatings.length,
      reviewCount: publicReviewCount,
    };
  },
});

/**
 * Get a user's public reviews
 * For viewing another user's profile or the current user's public reviews
 */
export const getUserPublicReviews = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Check if the requesting user is viewing their own reviews
    const currentUser = await getCurrentUser(ctx);
    const isOwnProfile = currentUser?._id === args.userId;

    const allUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter to reviews with content
    // If viewing own profile, show all reviews; otherwise only public ones
    const reviews = allUserData.filter((data) => {
      const hasReviewContent = data.rating !== undefined || data.reviewText;
      if (!hasReviewContent) return false;
      if (isOwnProfile) return true;
      return !data.isReviewPrivate;
    });

    // Sort by reviewedAt descending (most recent first)
    reviews.sort((a, b) => {
      const aTime = a.reviewedAt ?? 0;
      const bTime = b.reviewedAt ?? 0;
      return bTime - aTime;
    });

    // Enrich with book info
    const reviewsWithBooks = await Promise.all(
      reviews.map(async (review) => {
        const book = await ctx.db.get(review.bookId);

        // Get authors for the book
        let authors: { _id: Id<"authors">; name: string }[] = [];
        if (book) {
          const bookAuthors = await ctx.db
            .query("bookAuthors")
            .withIndex("by_book", (q) => q.eq("bookId", book._id))
            .collect();

          authors = (
            await Promise.all(
              bookAuthors.map(async (ba) => {
                const author = await ctx.db.get(ba.authorId);
                return author ? { _id: author._id, name: author.name } : null;
              })
            )
          ).filter((a): a is { _id: Id<"authors">; name: string } => a !== null);
        }

        return {
          ...review,
          book: book
            ? {
                _id: book._id,
                title: book.title,
                coverImageR2Key: book.coverImageR2Key,
                authors,
              }
            : null,
        };
      })
    );

    return reviewsWithBooks;
  },
});
