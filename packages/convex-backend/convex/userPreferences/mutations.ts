import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

/**
 * Update the current user's playback preferences.
 * Upserts by userId — one row per user.
 */
export const updatePreferences = mutation({
  args: {
    skipForwardSeconds: v.optional(v.number()),
    skipBackwardSeconds: v.optional(v.number()),
    momentumSkipEnabled: v.optional(v.boolean()),
    smartRewindEnabled: v.optional(v.boolean()),
    voiceBoostEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const now = Date.now();

    // Validate ranges
    if (
      args.skipForwardSeconds !== undefined &&
      (args.skipForwardSeconds < 5 || args.skipForwardSeconds > 120)
    ) {
      throw new Error("skipForwardSeconds must be between 5 and 120");
    }
    if (
      args.skipBackwardSeconds !== undefined &&
      (args.skipBackwardSeconds < 5 || args.skipBackwardSeconds > 120)
    ) {
      throw new Error("skipBackwardSeconds must be between 5 and 120");
    }

    // Build patch from only the fields that were provided
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.skipForwardSeconds !== undefined) patch.skipForwardSeconds = args.skipForwardSeconds;
    if (args.skipBackwardSeconds !== undefined)
      patch.skipBackwardSeconds = args.skipBackwardSeconds;
    if (args.momentumSkipEnabled !== undefined)
      patch.momentumSkipEnabled = args.momentumSkipEnabled;
    if (args.smartRewindEnabled !== undefined) patch.smartRewindEnabled = args.smartRewindEnabled;
    if (args.voiceBoostEnabled !== undefined) patch.voiceBoostEnabled = args.voiceBoostEnabled;

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("userPreferences", {
      userId: user._id,
      skipForwardSeconds: args.skipForwardSeconds,
      skipBackwardSeconds: args.skipBackwardSeconds,
      momentumSkipEnabled: args.momentumSkipEnabled,
      smartRewindEnabled: args.smartRewindEnabled,
      voiceBoostEnabled: args.voiceBoostEnabled,
      createdAt: now,
      updatedAt: now,
    });
  },
});
