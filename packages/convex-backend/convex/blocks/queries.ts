import { v } from "convex/values";

import { internalQuery, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Get the block status between the current user and another user.
 * Returns whether the current user has blocked them and whether they have blocked the current user.
 */
export const getBlockStatus = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const [blockedByMe, blockedByThem] = await Promise.all([
      ctx.db
        .query("blocks")
        .withIndex("by_blocker_and_blocked", (q) =>
          q.eq("blockerId", user._id).eq("blockedUserId", args.otherUserId)
        )
        .unique(),
      ctx.db
        .query("blocks")
        .withIndex("by_blocker_and_blocked", (q) =>
          q.eq("blockerId", args.otherUserId).eq("blockedUserId", user._id)
        )
        .unique(),
    ]);

    return {
      isBlocked: blockedByMe !== null,
      isBlockedBy: blockedByThem !== null,
    };
  },
});

/**
 * Get the current user's list of blocked users with basic info.
 * For the "Blocked Users" settings screen.
 */
export const getMyBlockedUsers = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", user._id))
      .collect();

    const blockedUsers = await Promise.all(
      blocks.map(async (block) => {
        const blockedUser = await ctx.db.get(block.blockedUserId);
        if (!blockedUser) return null;
        return {
          _id: blockedUser._id,
          name: blockedUser.name,
          imageUrl: blockedUser.imageUrl,
          blockedAt: block.createdAt,
          source: block.source,
        };
      })
    );

    return blockedUsers.filter((u) => u !== null);
  },
});

/**
 * Internal helper: get the set of all user IDs that a given user has blocked or is blocked by.
 * Used by other modules for filtering.
 */
export const getBlockedUserIds = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [blockedByUser, blockedUser] = await Promise.all([
      ctx.db
        .query("blocks")
        .withIndex("by_blocker", (q) => q.eq("blockerId", args.userId))
        .collect(),
      ctx.db
        .query("blocks")
        .withIndex("by_blocked", (q) => q.eq("blockedUserId", args.userId))
        .collect(),
    ]);

    const ids: string[] = [];
    for (const block of blockedByUser) {
      ids.push(block.blockedUserId);
    }
    for (const block of blockedUser) {
      ids.push(block.blockerId);
    }

    return ids;
  },
});
