import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { getEffectiveRole, requireAdminMutation, requireAuthMutation } from "../lib/auth";

/**
 * Update a user's role (admin-only)
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update a user's premium status (admin-only)
 */
export const updateUserPremium = mutation({
  args: {
    userId: v.id("users"),
    hasPremium: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      hasPremium: args.hasPremium,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Admin update: set role, premium, and storage account in one call
 */
export const adminUpdateUser = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
    hasPremium: v.boolean(),
    storageAccountId: v.optional(v.id("storageAccounts")),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate storage account exists if provided
    if (args.storageAccountId) {
      const storageAccount = await ctx.db.get(args.storageAccountId);
      if (!storageAccount) {
        throw new Error("Storage account not found");
      }
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      hasPremium: args.hasPremium,
      storageAccountId: args.storageAccountId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Approve a pending user (admin-only)
 */
export const approveUser = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer")),
    hasPremium: v.boolean(),
    storageAccountId: v.optional(v.id("storageAccounts")),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.approvalStatus !== "pending") throw new Error("User is not pending approval");

    await ctx.db.patch(args.userId, {
      approvalStatus: "approved",
      role: args.role,
      hasPremium: args.hasPremium,
      storageAccountId: args.storageAccountId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Deny a pending user (admin-only) — deletes the user record
 */
export const denyUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.approvalStatus !== "pending") throw new Error("User is not pending approval");

    await ctx.db.delete(args.userId);

    return { success: true };
  },
});

/**
 * Suspend an approved user (admin-only)
 */
export const suspendUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (getEffectiveRole(user) === "admin") {
      throw new Error("Cannot suspend an admin user");
    }

    const effectiveStatus = user.approvalStatus ?? "approved";
    if (effectiveStatus !== "approved") {
      throw new Error("Only approved users can be suspended");
    }

    await ctx.db.patch(args.userId, {
      approvalStatus: "suspended",
      suspensionReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unsuspend a suspended user (admin-only)
 */
export const unsuspendUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdminMutation(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.approvalStatus !== "suspended") {
      throw new Error("User is not suspended");
    }

    await ctx.db.patch(args.userId, {
      approvalStatus: "approved",
      suspensionReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update current user's profile privacy setting
 */
export const updateProfilePrivacy = mutation({
  args: {
    isProfilePrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    await ctx.db.patch(user._id, {
      isProfilePrivate: args.isProfilePrivate,
      updatedAt: Date.now(),
    });

    // When going private, remove all followers
    if (args.isProfilePrivate) {
      const followers = await ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", user._id))
        .collect();

      await Promise.all(followers.map((f) => ctx.db.delete(f._id)));
    }

    return { success: true };
  },
});

/**
 * Ensure the current user exists in Convex.
 * Call after Clerk sign-up/sign-in to handle the webhook race condition —
 * requireAuthMutation creates the user if the webhook hasn't fired yet.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuthMutation(ctx);
    return { _id: user._id };
  },
});
