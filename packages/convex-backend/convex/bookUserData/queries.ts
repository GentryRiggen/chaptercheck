import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { type Doc, type Id } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { getBlockedUserIdsForUser } from "../blocks/helpers";
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
 * Batch-fetch books, authors, and series for an array of bookUserData entries.
 * Returns maps keyed by bookId for efficient assembly.
 */
async function batchFetchBookDetails(ctx: QueryCtx, bookIds: Id<"books">[]) {
  if (bookIds.length === 0) {
    return {
      bookMap: new Map<string, Doc<"books">>(),
      authorsMap: new Map<string, { _id: Id<"authors">; name: string }[]>(),
      seriesMap: new Map<string, { _id: Id<"series">; name: string }>(),
    };
  }

  // 1. Batch-fetch all books
  const bookDocs = await Promise.all(bookIds.map((id) => ctx.db.get(id)));
  const bookMap = new Map<string, Doc<"books">>();
  for (const doc of bookDocs) {
    if (doc) bookMap.set(doc._id, doc);
  }

  // 2. Batch-fetch bookAuthors for all books
  const validBookIds = [...bookMap.keys()] as Id<"books">[];
  const bookAuthorsByBook = await Promise.all(
    validBookIds.map((bookId) =>
      ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect()
    )
  );

  // 3. Collect unique author IDs and series IDs
  const authorIds = new Set<Id<"authors">>();
  const seriesIds = new Set<Id<"series">>();
  for (const bas of bookAuthorsByBook) {
    for (const ba of bas) {
      authorIds.add(ba.authorId);
    }
  }
  for (const book of bookMap.values()) {
    if (book.seriesId) seriesIds.add(book.seriesId);
  }

  // 4. Batch-fetch all authors and series
  const [authorDocs, seriesDocs] = await Promise.all([
    Promise.all([...authorIds].map((id) => ctx.db.get(id))),
    Promise.all([...seriesIds].map((id) => ctx.db.get(id))),
  ]);

  const authorDocMap = new Map<string, Doc<"authors">>();
  for (const doc of authorDocs) {
    if (doc) authorDocMap.set(doc._id, doc);
  }

  const seriesDocMap = new Map<string, Doc<"series">>();
  for (const doc of seriesDocs) {
    if (doc) seriesDocMap.set(doc._id, doc);
  }

  // 5. Build per-book author lists (Map keyed by bookId for safe pairing)
  const bookAuthorsMap = new Map<string, Doc<"bookAuthors">[]>();
  for (let i = 0; i < validBookIds.length; i++) {
    bookAuthorsMap.set(validBookIds[i], bookAuthorsByBook[i]);
  }

  const authorsMap = new Map<string, { _id: Id<"authors">; name: string }[]>();
  for (const [bookId, bas] of bookAuthorsMap) {
    const authors: { _id: Id<"authors">; name: string }[] = [];
    for (const ba of bas) {
      const author = authorDocMap.get(ba.authorId);
      if (author) {
        authors.push({ _id: author._id, name: author.name });
      }
    }
    authorsMap.set(bookId, authors);
  }

  // 6. Build series map (bookId -> series)
  const seriesMap = new Map<string, { _id: Id<"series">; name: string }>();
  for (const book of bookMap.values()) {
    if (book.seriesId) {
      const seriesDoc = seriesDocMap.get(book.seriesId);
      if (seriesDoc) {
        seriesMap.set(book._id, { _id: seriesDoc._id, name: seriesDoc.name });
      }
    }
  }

  return { bookMap, authorsMap, seriesMap };
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
    const { user } = await requireAuth(ctx);
    const blockedIds = await getBlockedUserIdsForUser(ctx, user._id);

    // Get all reviews for this book that have a review (rating or text) and are public
    const allBookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Filter to public reviews that have actual review content, excluding blocked users
    const publicReviews = allBookUserData.filter(
      (data) =>
        !data.isReviewPrivate &&
        (data.rating !== undefined || data.reviewText) &&
        !blockedIds.has(data.userId)
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
    const blockedIds = await getBlockedUserIdsForUser(ctx, user._id);

    // Get all reviews for this book
    const allBookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Filter to public reviews that have actual review content, excluding blocked users
    let publicReviews = allBookUserData.filter(
      (data) =>
        !data.isReviewPrivate &&
        (data.rating !== undefined || data.reviewText) &&
        !blockedIds.has(data.userId)
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

    // Batch-enrich with book info
    const bookIds = reviews.map((r) => r.bookId);
    const { bookMap, authorsMap } = await batchFetchBookDetails(ctx, bookIds);

    const reviewsWithBooks = reviews.map((review) => {
      const book = bookMap.get(review.bookId);
      const authors = authorsMap.get(review.bookId) ?? [];
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
    });

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

    const bookIds = paginatedReviews.map((r) => r.bookId);
    const { bookMap, authorsMap } = await batchFetchBookDetails(ctx, bookIds);

    const reviewsWithBooks = paginatedReviews.map((review) => {
      const book = bookMap.get(review.bookId);
      const authors = authorsMap.get(review.bookId) ?? [];
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
    });

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

    let readData = allUserData.filter((d) => isBookFinished(d));
    if (!isOwnProfile) {
      readData = readData.filter((d) => !d.isReadPrivate);
    }

    readData.sort((a, b) => {
      const aTime = getFinishedAt(a);
      const bTime = getFinishedAt(b);
      return bTime - aTime;
    });

    // Manual pagination
    const { cursor, numItems } = args.paginationOpts;
    const startIndex = cursor ? Math.max(0, parseInt(cursor as string, 10) || 0) : 0;
    const endIndex = startIndex + numItems;
    const paginatedData = readData.slice(startIndex, endIndex);
    const hasMore = endIndex < readData.length;

    const bookIds = paginatedData.map((d) => d.bookId);
    const { bookMap, authorsMap, seriesMap } = await batchFetchBookDetails(ctx, bookIds);

    const booksWithDetails = paginatedData
      .map((data) => {
        const book = bookMap.get(data.bookId);
        if (!book) return null;

        return {
          _id: book._id,
          title: book.title,
          coverImageR2Key: book.coverImageR2Key,
          seriesOrder: book.seriesOrder,
          averageRating: book.averageRating,
          ratingCount: book.ratingCount,
          authors: authorsMap.get(book._id) ?? [],
          series: seriesMap.get(book._id) ?? null,
          readAt: data.finishedAt ?? data.readAt,
          userRating: data.rating,
          userReviewText: data.reviewText,
          isReviewPrivate: data.isReviewPrivate,
          isReadPrivate: data.isReadPrivate,
        };
      })
      .filter((b) => b !== null);

    return {
      page: booksWithDetails,
      isDone: !hasMore,
      continueCursor: hasMore ? String(endIndex) : String(startIndex),
    };
  },
});

/**
 * Get books a user has in their library filtered by optional status.
 * When status is provided, returns only books matching that status.
 * When no status is provided, returns ALL books with a bookUserData entry.
 * Returns paginated list with book details and status, respecting privacy settings.
 */
export const getUserBooksByStatusPaginated = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("want_to_read"),
        v.literal("reading"),
        v.literal("finished"),
        v.literal("paused"),
        v.literal("dnf")
      )
    ),
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

    let filteredData = allUserData;

    if (args.status) {
      filteredData = allUserData.filter((d) => {
        if (d.status === args.status) return true;
        // Legacy fallback: if status field is not set, use isRead for "finished"
        if (args.status === "finished" && !d.status && d.isRead === true) return true;
        return false;
      });
    }

    if (!isOwnProfile) {
      filteredData = filteredData.filter((d) => !d.isReadPrivate);
    }

    // Sort by lastStatusChangedAt, falling back to updatedAt
    filteredData.sort((a, b) => {
      const aTime = a.lastStatusChangedAt ?? a.updatedAt;
      const bTime = b.lastStatusChangedAt ?? b.updatedAt;
      return bTime - aTime;
    });

    // Manual pagination
    const { cursor, numItems } = args.paginationOpts;
    const startIndex = cursor ? Math.max(0, parseInt(cursor as string, 10) || 0) : 0;
    const endIndex = startIndex + numItems;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    const hasMore = endIndex < filteredData.length;

    const bookIds = paginatedData.map((d) => d.bookId);
    const { bookMap, authorsMap, seriesMap } = await batchFetchBookDetails(ctx, bookIds);

    const booksWithDetails = paginatedData
      .map((data) => {
        const book = bookMap.get(data.bookId);
        if (!book) return null;

        return {
          _id: book._id,
          title: book.title,
          coverImageR2Key: book.coverImageR2Key,
          seriesOrder: book.seriesOrder,
          averageRating: book.averageRating,
          ratingCount: book.ratingCount,
          authors: authorsMap.get(book._id) ?? [],
          series: seriesMap.get(book._id) ?? null,
          readAt: data.finishedAt ?? data.readAt,
          userRating: data.rating,
          userReviewText: data.reviewText,
          isReviewPrivate: data.isReviewPrivate,
          isReadPrivate: data.isReadPrivate,
          status: data.status ?? (data.isRead ? "finished" : undefined),
        };
      })
      .filter((b) => b !== null);

    return {
      page: booksWithDetails,
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
    let readData = allUserData.filter((d) => isBookFinished(d));
    if (!isOwnProfile) {
      readData = readData.filter((d) => !d.isReadPrivate);
    }

    // Sort by readAt descending (most recently read first)
    readData.sort((a, b) => {
      const aTime = getFinishedAt(a);
      const bTime = getFinishedAt(b);
      return bTime - aTime;
    });

    // Batch-enrich with book details
    const bookIds = readData.map((d) => d.bookId);
    const { bookMap, authorsMap, seriesMap } = await batchFetchBookDetails(ctx, bookIds);

    return readData
      .map((data) => {
        const book = bookMap.get(data.bookId);
        if (!book) return null;

        return {
          _id: book._id,
          title: book.title,
          coverImageR2Key: book.coverImageR2Key,
          seriesOrder: book.seriesOrder,
          averageRating: book.averageRating,
          ratingCount: book.ratingCount,
          authors: authorsMap.get(book._id) ?? [],
          series: seriesMap.get(book._id) ?? null,
          readAt: data.finishedAt ?? data.readAt,
          userRating: data.rating,
          userReviewText: data.reviewText,
          isReviewPrivate: data.isReviewPrivate,
          isReadPrivate: data.isReadPrivate,
        };
      })
      .filter((b) => b !== null);
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

    const bookIds = ratedOrReviewed.map((e) => e.bookId);
    const { bookMap, authorsMap } = await batchFetchBookDetails(ctx, bookIds);

    return ratedOrReviewed
      .map((entry) => {
        const book = bookMap.get(entry.bookId);
        if (!book) return null;

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
            authors: authorsMap.get(book._id) ?? [],
            averageRating: book.averageRating,
            ratingCount: book.ratingCount,
          },
        };
      })
      .filter((entry) => entry !== null);
  },
});
