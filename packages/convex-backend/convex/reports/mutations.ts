import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { getEffectiveRole, requireAdminMutation, requireApprovedMutation } from "../lib/auth";

/**
 * Report a user. Creates a report with status "pending" and auto-blocks the reported user
 * (with source "report") so their content is immediately hidden from the reporter.
 */
export const reportUser = mutation({
  args: {
    reportedUserId: v.id("users"),
    reason: v.union(
      v.literal("spam"),
      v.literal("inappropriate_content"),
      v.literal("harassment"),
      v.literal("impersonation"),
      v.literal("other")
    ),
    reasonText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireApprovedMutation(ctx);

    if (user._id === args.reportedUserId) {
      throw new Error("Cannot report yourself");
    }

    const targetUser = await ctx.db.get(args.reportedUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Create the report
    await ctx.db.insert("reports", {
      reporterId: user._id,
      reportedUserId: args.reportedUserId,
      reason: args.reason,
      reasonText: args.reasonText,
      status: "pending",
      createdAt: Date.now(),
    });

    // Auto-block with source "report" (don't create duplicate)
    const existingBlock = await ctx.db
      .query("blocks")
      .withIndex("by_blocker_and_blocked", (q) =>
        q.eq("blockerId", user._id).eq("blockedUserId", args.reportedUserId)
      )
      .unique();

    if (!existingBlock) {
      await ctx.db.insert("blocks", {
        blockerId: user._id,
        blockedUserId: args.reportedUserId,
        createdAt: Date.now(),
        source: "report",
      });
    }

    // Remove follows in both directions
    const [followingThem, followedByThem] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_follower_and_following", (q) =>
          q.eq("followerId", user._id).eq("followingId", args.reportedUserId)
        )
        .unique(),
      ctx.db
        .query("follows")
        .withIndex("by_follower_and_following", (q) =>
          q.eq("followerId", args.reportedUserId).eq("followingId", user._id)
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
 * Admin: dismiss all pending reports for a user.
 * Sets reports to "dismissed" and removes auto-blocks (source "report") where the
 * reported user is the blockedUserId. Does NOT remove explicit blocks.
 */
export const adminDismissReports = mutation({
  args: { reportedUserId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const pendingReports = await ctx.db
      .query("reports")
      .withIndex("by_reported_user_and_status", (q) =>
        q.eq("reportedUserId", args.reportedUserId).eq("status", "pending")
      )
      .collect();

    const now = Date.now();

    // Dismiss all pending reports
    await Promise.all(
      pendingReports.map((report) =>
        ctx.db.patch(report._id, {
          status: "dismissed",
          reviewedAt: now,
          reviewedAction: "dismiss",
        })
      )
    );

    // Remove auto-blocks (source "report") where the reported user is the blockedUserId
    const reportBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocked", (q) => q.eq("blockedUserId", args.reportedUserId))
      .collect();

    await Promise.all(
      reportBlocks
        .filter((block) => block.source === "report")
        .map((block) => ctx.db.delete(block._id))
    );

    return { success: true };
  },
});

/**
 * Admin: action all pending reports for a user (suspend or delete).
 * Sets reports to "actioned" with the corresponding reviewedAction.
 * For "suspend": updates the user's approvalStatus to "suspended".
 * For "delete": marks reports as actioned; actual deletion should use the existing admin delete flow.
 */
export const adminActionReports = mutation({
  args: {
    reportedUserId: v.id("users"),
    action: v.union(v.literal("suspend"), v.literal("delete")),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const targetUser = await ctx.db.get(args.reportedUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    if (getEffectiveRole(targetUser) === "admin") {
      throw new Error("Cannot action reports against an admin user");
    }

    const pendingReports = await ctx.db
      .query("reports")
      .withIndex("by_reported_user_and_status", (q) =>
        q.eq("reportedUserId", args.reportedUserId).eq("status", "pending")
      )
      .collect();

    const now = Date.now();

    // Mark all pending reports as actioned
    await Promise.all(
      pendingReports.map((report) =>
        ctx.db.patch(report._id, {
          status: "actioned",
          reviewedAt: now,
          reviewedAction: args.action,
        })
      )
    );

    // For suspend: update user's approvalStatus
    if (args.action === "suspend") {
      await ctx.db.patch(args.reportedUserId, {
        approvalStatus: "suspended",
        suspensionReason: "Suspended due to user reports",
        updatedAt: now,
      });
    }

    // For delete: reports are marked as actioned.
    // The admin should use the existing delete account flow to actually delete the user.

    return { success: true };
  },
});
