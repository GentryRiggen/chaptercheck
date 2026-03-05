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
    accentColor: v.optional(v.string()),
    colorSchemeMode: v.optional(v.string()),
    autoDownloadOnPlay: v.optional(v.boolean()),
    downloadNetwork: v.optional(v.string()),
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

    // Validate accent color
    const validAccentColors = [
      // Blues
      "sky",
      "blue",
      "navy",
      // Indigos
      "periwinkle",
      "indigo",
      "midnight",
      // Purples
      "lavender",
      "purple",
      "plum",
      // Pinks
      "rose",
      "pink",
      "magenta",
      // Reds
      "coral",
      "red",
      "crimson",
      // Oranges
      "peach",
      "orange",
      "tangerine",
      // Yellows
      "lemon",
      "amber",
      "yellow",
      "gold",
      // Greens
      "chartreuse",
      "lime",
      "green",
      "emerald",
      "forest",
      // Teals & Cyans
      "aqua",
      "teal",
      "ocean",
      "cyan",
      "electric",
      // Mints
      "seafoam",
      "mint",
      "jade",
      // Neutrals
      "brown",
      "graphite",
    ];
    if (args.accentColor !== undefined && !validAccentColors.includes(args.accentColor)) {
      throw new Error(`accentColor must be one of: ${validAccentColors.join(", ")}`);
    }

    // Validate color scheme mode
    const validColorSchemeModes = ["system", "light", "dark"];
    if (
      args.colorSchemeMode !== undefined &&
      !validColorSchemeModes.includes(args.colorSchemeMode)
    ) {
      throw new Error(`colorSchemeMode must be one of: ${validColorSchemeModes.join(", ")}`);
    }

    // Validate download network
    const validDownloadNetworks = ["wifi", "wifiAndCellular"];
    if (
      args.downloadNetwork !== undefined &&
      !validDownloadNetworks.includes(args.downloadNetwork)
    ) {
      throw new Error(`downloadNetwork must be one of: ${validDownloadNetworks.join(", ")}`);
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
    if (args.accentColor !== undefined) patch.accentColor = args.accentColor;
    if (args.colorSchemeMode !== undefined) patch.colorSchemeMode = args.colorSchemeMode;
    if (args.autoDownloadOnPlay !== undefined) patch.autoDownloadOnPlay = args.autoDownloadOnPlay;
    if (args.downloadNetwork !== undefined) patch.downloadNetwork = args.downloadNetwork;

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
      accentColor: args.accentColor,
      colorSchemeMode: args.colorSchemeMode,
      autoDownloadOnPlay: args.autoDownloadOnPlay,
      downloadNetwork: args.downloadNetwork,
      createdAt: now,
      updatedAt: now,
    });
  },
});
