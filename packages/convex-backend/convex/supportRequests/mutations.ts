import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireAdminMutation } from "../lib/auth";

// Public — no auth required
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    category: v.union(
      v.literal("bug_report"),
      v.literal("feature_request"),
      v.literal("general_question"),
      v.literal("account_issue")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Server-side validation (frontend uses Zod, but direct API calls bypass it)
    const name = args.name.trim();
    const email = args.email.trim().toLowerCase();
    const message = args.message.trim();

    if (name.length === 0 || name.length > 100) {
      throw new Error("Name must be between 1 and 100 characters");
    }
    if (email.length === 0 || email.length > 254) {
      throw new Error("Invalid email address");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email format");
    }
    if (message.length < 10 || message.length > 5000) {
      throw new Error("Message must be between 10 and 5000 characters");
    }

    await ctx.db.insert("supportRequests", {
      name,
      email,
      category: args.category,
      message,
      status: "new",
      createdAt: Date.now(),
    });
  },
});

// Admin-only mutations for managing requests
export const updateStatus = mutation({
  args: {
    id: v.id("supportRequests"),
    status: v.union(v.literal("reviewed"), v.literal("resolved")),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, adminNotes }) => {
    await requireAdminMutation(ctx);
    const updates: Record<string, unknown> = { status };
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (status === "reviewed") updates.reviewedAt = Date.now();
    if (status === "resolved") updates.resolvedAt = Date.now();
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("supportRequests") },
  handler: async (ctx, { id }) => {
    await requireAdminMutation(ctx);
    await ctx.db.delete(id);
  },
});
