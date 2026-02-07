import { type Id } from "../_generated/dataModel";
import { type MutationCtx } from "../_generated/server";

/**
 * Recalculate and update the denormalized rating stats for a book.
 * Call this whenever a review is added, updated, or deleted.
 */
export async function recalculateBookRating(ctx: MutationCtx, bookId: Id<"books">) {
  // Get all ratings for this book (including private ones - they count toward average)
  const allBookUserData = await ctx.db
    .query("bookUserData")
    .withIndex("by_book", (q) => q.eq("bookId", bookId))
    .collect();

  // Filter to entries with ratings
  const ratings = allBookUserData
    .filter((data) => data.rating !== undefined)
    .map((data) => data.rating as number);

  if (ratings.length === 0) {
    // No ratings - clear the denormalized fields
    await ctx.db.patch(bookId, {
      averageRating: undefined,
      ratingCount: undefined,
      updatedAt: Date.now(),
    });
    return;
  }

  // Calculate average
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  const averageRating = sum / ratings.length;

  // Update the book with new stats
  await ctx.db.patch(bookId, {
    averageRating,
    ratingCount: ratings.length,
    updatedAt: Date.now(),
  });
}
