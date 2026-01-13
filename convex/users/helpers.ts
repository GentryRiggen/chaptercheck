import { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Get or create a user based on the current authenticated identity
 * This ensures users are auto-created even if the Clerk webhook hasn't fired yet
 * Note: This can only be used in mutations (not queries)
 */
export async function getOrCreateUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Try to find existing user
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  // If user doesn't exist, create them
  if (!user) {
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "",
      name: identity.name,
      imageUrl: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
    });

    user = await ctx.db.get(userId);
  }

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

/**
 * Get a user based on the current authenticated identity (for queries)
 * Note: This will not create a user if they don't exist
 */
export async function getUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
