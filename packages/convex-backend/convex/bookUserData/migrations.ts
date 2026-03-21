import { type Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { recalculateBookRating } from "../lib/bookRatings";
/**
 * One-time migration to convert ratings from 1-3 scale to 1-5 scale.
 *
 * Mapping: 1→2, 2→3, 3→5
 *
 * Rationale: preserves relative sentiment — old 1 (disliked) maps to new 2
 * (below average), old 2 (mixed) maps to new 3 (middle), and old 3 (loved)
 * maps to new 5 (top). Skipping 1 and 4 avoids compressing old ratings into
 * the bottom of the new scale and keeps the enthusiastic top rating at 5.
 *
 * Run from the Convex dashboard or CLI:
 *   npx convex run --component bookUserData/migrations:migrateRatingsTo5Star
 */
/**
 * One-time migration to backfill the `status` field on legacy records that
 * only have `isRead: true` but no status set.
 *
 * Run from the Convex dashboard or CLI:
 *   npx convex run bookUserData/migrations:backfillFinishedStatus
 */
export const backfillFinishedStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allBookUserData = await ctx.db.query("bookUserData").collect();
    let migratedCount = 0;

    for (const record of allBookUserData) {
      if (!record.status && record.isRead === true) {
        await ctx.db.patch(record._id, {
          status: "finished",
          lastStatusChangedAt: record.readAt ?? record.updatedAt ?? Date.now(),
          updatedAt: Date.now(),
        });
        migratedCount++;
      }
    }

    return { migratedRecords: migratedCount };
  },
});

export const migrateRatingsTo5Star = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ratingMap: Record<number, number> = {
      1: 2,
      2: 3,
      3: 5,
    };

    const allBookUserData = await ctx.db.query("bookUserData").collect();
    const affectedBookIds = new Set<string>();
    let migratedCount = 0;

    for (const record of allBookUserData) {
      if (record.rating !== undefined && ratingMap[record.rating] !== undefined) {
        const newRating = ratingMap[record.rating];
        await ctx.db.patch(record._id, {
          rating: newRating,
          updatedAt: Date.now(),
        });
        affectedBookIds.add(record.bookId);
        migratedCount++;
      }
    }

    // Recalculate denormalized averageRating for all affected books
    for (const bookId of affectedBookIds) {
      await recalculateBookRating(ctx, bookId as Id<"books">);
    }

    return {
      migratedRecords: migratedCount,
      affectedBooks: affectedBookIds.size,
    };
  },
});
