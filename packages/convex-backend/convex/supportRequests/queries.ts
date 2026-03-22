import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAdmin } from "../lib/auth";

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("new"), v.literal("reviewed"), v.literal("resolved"))),
  },
  handler: async (ctx, { status }) => {
    await requireAdmin(ctx);
    if (status) {
      return await ctx.db
        .query("supportRequests")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("supportRequests").order("desc").collect();
  },
});

export const getNewCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const requests = await ctx.db
      .query("supportRequests")
      .withIndex("by_status", (q) => q.eq("status", "new"))
      .collect();
    return requests.length;
  },
});
