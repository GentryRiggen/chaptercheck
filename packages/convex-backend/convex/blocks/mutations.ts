import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireApprovedMutation } from "../lib/auth";

/**
 * Block a user explicitly. Also removes follows in both directions.
 */
export const blockUser = mutation({
  args: { blockedUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireApprovedMutation(ctx);

    if (user._id === args.blockedUserId) {
      throw new Error("Cannot block yourself");
    }

    const targetUser = await ctx.db.get(args.blockedUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Check if already blocked
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (q) =>
        q.eq("blockerId", user._id).eq("blockedUserId", args.blockedUserId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("blocks", {
        blockerId: user._id,
        blockedUserId: args.blockedUserId,
        createdAt: Date.now(),
        source: "explicit",
      });
    }

    // Remove follows in both directions
    const [followingThem, followedByThem] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_follower_and_following", (q) =>
          q.eq("followerId", user._id).eq("followingId", args.blockedUserId)
        )
        .unique(),
      ctx.db
        .query("follows")
        .withIndex("by_follower_and_following", (q) =>
          q.eq("followerId", args.blockedUserId).eq("followingId", user._id)
        )
        .unique(),
    ]);

    if (followingThem) {
      await ctx.db.delete(followingThem._id);
    }
    if (followedByThem) {
      await ctx.db.delete(followedByThem._id);
    }

    return { success: true };
  },
});

/**
 * Unblock a user. Removes the block record.
 */
export const unblockUser = mutation({
  args: { blockedUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireApprovedMutation(ctx);

    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (q) =>
        q.eq("blockerId", user._id).eq("blockedUserId", args.blockedUserId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
