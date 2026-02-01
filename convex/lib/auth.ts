import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

/**
 * Auth utilities for Convex functions
 *
 * Usage in queries:
 *   const user = await requireAuth(ctx);
 *
 * Usage in mutations:
 *   const user = await requireAuthMutation(ctx);
 *
 * For admin-only:
 *   const user = await requireAdmin(ctx);
 */

export type UserRole = "admin" | "user";

export interface AuthenticatedUser {
  user: Doc<"users">;
  identity: NonNullable<Awaited<ReturnType<QueryCtx["auth"]["getUserIdentity"]>>>;
}

/**
 * Require authentication for queries
 * Returns the authenticated user or throws an error
 */
export async function requireAuth(ctx: QueryCtx): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found. Please try signing out and back in.");
  }

  return { user, identity };
}

/**
 * Require authentication for mutations
 * Creates user if they don't exist (handles race condition with webhook)
 */
export async function requireAuthMutation(ctx: MutationCtx): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Try to find existing user
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  // If user doesn't exist, create them (handles webhook race condition)
  if (!user) {
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "",
      name: identity.name,
      imageUrl: identity.pictureUrl,
      role: "user",
      createdAt: now,
      updatedAt: now,
    });

    user = await ctx.db.get(userId);
  }

  if (!user) {
    throw new Error("Failed to get or create user");
  }

  return { user, identity };
}

/**
 * Require admin role for queries
 */
export async function requireAdmin(ctx: QueryCtx): Promise<AuthenticatedUser> {
  const auth = await requireAuth(ctx);

  if (auth.user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return auth;
}

/**
 * Require admin role for mutations
 */
export async function requireAdminMutation(ctx: MutationCtx): Promise<AuthenticatedUser> {
  const auth = await requireAuthMutation(ctx);

  if (auth.user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return auth;
}

/**
 * Check if the current user is an admin (non-throwing)
 */
export async function isAdmin(ctx: QueryCtx): Promise<boolean> {
  try {
    const auth = await requireAuth(ctx);
    return auth.user.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Check if user is authenticated (non-throwing)
 */
export async function isAuthenticated(ctx: QueryCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  return identity !== null;
}

/**
 * Get current user without throwing (returns null if not authenticated)
 */
export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}
