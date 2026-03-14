import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

export const followUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    if (user._id === args.userId) {
      throw new Error("Cannot follow yourself");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Check if already following
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.userId)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("follows", {
      followerId: user._id,
      followingId: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const unfollowUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.userId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
