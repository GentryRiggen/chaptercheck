import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getCurrentUser, requireAdmin, requireAuth } from "../lib/auth";

type BookUserDataLike = {
  isRead?: boolean;
  readAt?: number;
  createdAt: number;
};

function isBookFinished(data: BookUserDataLike): boolean {
  return data.isRead === true;
}

function getFinishedAt(data: BookUserDataLike): number {
  return data.readAt ?? data.createdAt;
}

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
    const startIndex = cursor ? Math.max(0, parseInt(cursor as string, 10) || 0) : 0;
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

/**
 * Get a user's public reviews with manual pagination
 * Same logic as getUserPublicReviews but with cursor-based slicing
 */
export const getUserReviewsPaginated = query({
  args: {
    userId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const currentUser = await getCurrentUser(ctx);
    const isOwnProfile = currentUser?._id === args.userId;

    const allUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const reviews = allUserData.filter((data) => {
      const hasReviewContent = data.rating !== undefined || data.reviewText;
      if (!hasReviewContent) return false;
      if (isOwnProfile) return true;
      return !data.isReviewPrivate;
    });

    reviews.sort((a, b) => {
      const aTime = a.reviewedAt ?? 0;
      const bTime = b.reviewedAt ?? 0;
      return bTime - aTime;
    });

    // Manual pagination
    const { cursor, numItems } = args.paginationOpts;
    const startIndex = cursor ? Math.max(0, parseInt(cursor as string, 10) || 0) : 0;
    const endIndex = startIndex + numItems;
    const paginatedReviews = reviews.slice(startIndex, endIndex);
    const hasMore = endIndex < reviews.length;

    const reviewsWithBooks = await Promise.all(
      paginatedReviews.map(async (review) => {
        const book = await ctx.db.get(review.bookId);

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

    return {
      page: reviewsWithBooks,
      isDone: !hasMore,
      continueCursor: hasMore ? String(endIndex) : String(startIndex),
    };
  },
});

/**
 * Get books a user has marked as read with manual pagination
 * Returns paginated list with book details, respecting privacy settings
 */
export const getUserReadBooksPaginated = query({
  args: {
    userId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const isOwnProfile = currentUser._id === args.userId;

    const allUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let readData = allUserData.filter((d) => d.isRead);
    if (!isOwnProfile) {
      readData = readData.filter((d) => !d.isReadPrivate);
    }

    readData.sort((a, b) => {
      const aTime = a.readAt ?? a.createdAt;
      const bTime = b.readAt ?? b.createdAt;
      return bTime - aTime;
    });

    // Manual pagination
    const { cursor, numItems } = args.paginationOpts;
    const startIndex = cursor ? Math.max(0, parseInt(cursor as string, 10) || 0) : 0;
    const endIndex = startIndex + numItems;
    const paginatedData = readData.slice(startIndex, endIndex);
    const hasMore = endIndex < readData.length;

    const booksWithDetails = await Promise.all(
      paginatedData.map(async (data) => {
        const book = await ctx.db.get(data.bookId);
        if (!book) return null;

        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = (
          await Promise.all(
            bookAuthors.map(async (ba) => {
              const author = await ctx.db.get(ba.authorId);
              return author ? { _id: author._id, name: author.name } : null;
            })
          )
        ).filter((a): a is { _id: Id<"authors">; name: string } => a !== null);

        let series: { _id: Id<"series">; name: string } | null = null;
        if (book.seriesId) {
          const seriesDoc = await ctx.db.get(book.seriesId);
          if (seriesDoc) {
            series = { _id: seriesDoc._id, name: seriesDoc.name };
          }
        }

        return {
          _id: book._id,
          title: book.title,
          coverImageR2Key: book.coverImageR2Key,
          seriesOrder: book.seriesOrder,
          averageRating: book.averageRating,
          ratingCount: book.ratingCount,
          authors,
          series,
          readAt: data.readAt,
          userRating: data.rating,
          userReviewText: data.reviewText,
          isReviewPrivate: data.isReviewPrivate,
          isReadPrivate: data.isReadPrivate,
        };
      })
    );

    const filtered = booksWithDetails.filter((b) => b !== null);

    return {
      page: filtered,
      isDone: !hasMore,
      continueCursor: hasMore ? String(endIndex) : String(startIndex),
    };
  },
});

/**
 * Get books a user has marked as read
 * Returns list with book details, respecting privacy settings
 */
export const getUserReadBooks = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    const isOwnProfile = currentUser._id === args.userId;

    // Get all user's read data
    const allUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter to read books, respecting privacy for non-own profiles
    let readData = allUserData.filter((d) => d.isRead);
    if (!isOwnProfile) {
      readData = readData.filter((d) => !d.isReadPrivate);
    }

    // Sort by readAt descending (most recently read first)
    readData.sort((a, b) => {
      const aTime = a.readAt ?? a.createdAt;
      const bTime = b.readAt ?? b.createdAt;
      return bTime - aTime;
    });

    // Enrich with book details
    const booksWithDetails = await Promise.all(
      readData.map(async (data) => {
        const book = await ctx.db.get(data.bookId);
        if (!book) return null;

        // Get authors
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = (
          await Promise.all(
            bookAuthors.map(async (ba) => {
              const author = await ctx.db.get(ba.authorId);
              return author ? { _id: author._id, name: author.name } : null;
            })
          )
        ).filter((a): a is { _id: Id<"authors">; name: string } => a !== null);

        // Get series if exists
        let series: { _id: Id<"series">; name: string } | null = null;
        if (book.seriesId) {
          const seriesDoc = await ctx.db.get(book.seriesId);
          if (seriesDoc) {
            series = { _id: seriesDoc._id, name: seriesDoc.name };
          }
        }

        return {
          _id: book._id,
          title: book.title,
          coverImageR2Key: book.coverImageR2Key,
          seriesOrder: book.seriesOrder,
          averageRating: book.averageRating,
          ratingCount: book.ratingCount,
          authors,
          series,
          readAt: data.readAt,
          userRating: data.rating,
          userReviewText: data.reviewText,
          isReviewPrivate: data.isReviewPrivate,
          isReadPrivate: data.isReadPrivate,
        };
      })
    );

    return booksWithDetails.filter((b) => b !== null);
  },
});

/**
 * Get all ratings/reviews for a user for the admin drill-in page.
 * Includes private entries and basic read-status metadata.
 */
export const getAdminUserRatings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const allUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const ratedOrReviewed = allUserData.filter(
      (data) => data.rating !== undefined || !!data.reviewText?.trim()
    );

    ratedOrReviewed.sort((a, b) => {
      const aTime = a.reviewedAt ?? a.readAt ?? a.updatedAt;
      const bTime = b.reviewedAt ?? b.readAt ?? b.updatedAt;
      return bTime - aTime;
    });

    return (
      await Promise.all(
        ratedOrReviewed.map(async (entry) => {
          const book = await ctx.db.get(entry.bookId);
          if (!book) return null;

          const bookAuthors = await ctx.db
            .query("bookAuthors")
            .withIndex("by_book", (q) => q.eq("bookId", book._id))
            .collect();

          const authors = (
            await Promise.all(
              bookAuthors.map(async (ba) => {
                const author = await ctx.db.get(ba.authorId);
                return author ? { _id: author._id, name: author.name } : null;
              })
            )
          ).filter((author): author is { _id: Id<"authors">; name: string } => author !== null);

          return {
            _id: entry._id,
            rating: entry.rating,
            reviewText: entry.reviewText,
            reviewedAt: entry.reviewedAt,
            updatedAt: entry.updatedAt,
            readAt: entry.readAt,
            isRead: entry.isRead,
            isReadPrivate: entry.isReadPrivate,
            isReviewPrivate: entry.isReviewPrivate,
            book: {
              _id: book._id,
              title: book.title,
              coverImageR2Key: book.coverImageR2Key,
              authors,
              averageRating: book.averageRating,
              ratingCount: book.ratingCount,
            },
          };
        })
      )
    ).filter((entry) => entry !== null);
  },
});
