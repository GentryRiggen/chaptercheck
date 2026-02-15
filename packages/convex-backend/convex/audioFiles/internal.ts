import { v } from "convex/values";

import { internalQuery } from "../_generated/server";

/**
 * Internal query to verify user has premium and access to an audio file
 * Used by actions that need to check permissions before generating URLs
 */
export const verifyAudioFileAccess = internalQuery({
  args: {
    clerkId: v.string(),
    audioFileId: v.id("audioFiles"),
  },
  handler: async (ctx, args) => {
    // Find user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check premium status
    if (!user.hasPremium) {
      throw new Error("Premium access required to stream audio");
    }

    // Get the audio file
    const audioFile = await ctx.db.get(args.audioFileId);
    if (!audioFile) {
      throw new Error("Audio file not found");
    }

    // Verify user has access to the file's storage account
    if (audioFile.storageAccountId) {
      if (user.storageAccountId !== audioFile.storageAccountId) {
        throw new Error("Not authorized to access this file");
      }
    } else {
      // Legacy files without storageAccountId - check uploadedBy
      if (audioFile.uploadedBy !== user._id) {
        throw new Error("Not authorized to access this file");
      }
    }

    return {
      audioFile,
      user,
    };
  },
});

/**
 * Internal query to verify user has premium access
 * Used by upload action to gate premium features
 */
export const verifyPremiumAccess = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.hasPremium) {
      throw new Error("Premium access required to upload audio files");
    }

    return { user };
  },
});
