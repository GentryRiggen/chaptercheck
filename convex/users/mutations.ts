import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireAdminMutation } from "../lib/auth";

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
