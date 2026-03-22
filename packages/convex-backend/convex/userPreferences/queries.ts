import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/auth";

/**
 * Get the current user's playback preferences.
 * Returns null if no preferences have been saved or user doesn't exist yet.
 */
export const getMyPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});
