import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Get the current user's playback preferences.
 * Returns null if no preferences have been saved.
 */
export const getMyPreferences = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});
