import { type Doc } from "../_generated/dataModel";
import { type MutationCtx, type QueryCtx } from "../_generated/server";

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
 *
 * For editor+ operations (content management):
 *   const user = await requireEditorMutation(ctx);
 *
 * For premium features:
 *   const user = await requirePremiumMutation(ctx);
 */

// Role hierarchy: admin > editor > viewer
export type UserRole = "admin" | "editor" | "viewer";

// Role levels for comparison (higher = more permissions)
// Exported for use in frontend permission checks
export const ROLE_LEVELS: Record<UserRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

/**
 * Get the effective role for a user, handling legacy "user" role migration
 * - "user" or undefined → "viewer"
 * - "admin", "editor", "viewer" → unchanged
 */
export function getEffectiveRole(user: Doc<"users">): UserRole {
  const role = user.role;
  if (role === "admin") return "admin";
  if (role === "editor") return "editor";
  // Legacy "user" role and undefined both map to "viewer"
  return "viewer";
}

/**
 * Check if user has at least the specified role level
 */
export function hasRoleLevel(user: Doc<"users">, minRole: UserRole): boolean {
  const effectiveRole = getEffectiveRole(user);
  return ROLE_LEVELS[effectiveRole] >= ROLE_LEVELS[minRole];
}

/**
 * Check if user has premium access
 */
export function hasPremium(user: Doc<"users">): boolean {
  return user.hasPremium === true;
}

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
      role: "viewer", // New users start as viewers
      hasPremium: false, // Premium must be granted by admin
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

  if (!hasRoleLevel(auth.user, "admin")) {
    throw new Error("Admin access required");
  }

  return auth;
}

/**
 * Require admin role for mutations
 */
export async function requireAdminMutation(ctx: MutationCtx): Promise<AuthenticatedUser> {
  const auth = await requireAuthMutation(ctx);

  if (!hasRoleLevel(auth.user, "admin")) {
    throw new Error("Admin access required");
  }

  return auth;
}

/**
 * Require editor role for queries (content read operations that need editor access)
 */
export async function requireEditor(ctx: QueryCtx): Promise<AuthenticatedUser> {
  const auth = await requireAuth(ctx);

  if (!hasRoleLevel(auth.user, "editor")) {
    throw new Error("Editor access required");
  }

  return auth;
}

/**
 * Require editor role for mutations (content management operations)
 */
export async function requireEditorMutation(ctx: MutationCtx): Promise<AuthenticatedUser> {
  const auth = await requireAuthMutation(ctx);

  if (!hasRoleLevel(auth.user, "editor")) {
    throw new Error("Editor access required");
  }

  return auth;
}

/**
 * Require premium access for queries
 */
export async function requirePremium(ctx: QueryCtx): Promise<AuthenticatedUser> {
  const auth = await requireAuth(ctx);

  if (!hasPremium(auth.user)) {
    throw new Error("Premium access required");
  }

  return auth;
}

/**
 * Require premium access for mutations
 */
export async function requirePremiumMutation(ctx: MutationCtx): Promise<AuthenticatedUser> {
  const auth = await requireAuthMutation(ctx);

  if (!hasPremium(auth.user)) {
    throw new Error("Premium access required");
  }

  return auth;
}

/**
 * Check if the current user is an admin (non-throwing)
 */
export async function isAdmin(ctx: QueryCtx): Promise<boolean> {
  try {
    const auth = await requireAuth(ctx);
    return hasRoleLevel(auth.user, "admin");
  } catch {
    return false;
  }
}

/**
 * Check if the current user is an editor or higher (non-throwing)
 */
export async function isEditor(ctx: QueryCtx): Promise<boolean> {
  try {
    const auth = await requireAuth(ctx);
    return hasRoleLevel(auth.user, "editor");
  } catch {
    return false;
  }
}

/**
 * Check if the current user has premium (non-throwing)
 */
export async function isPremium(ctx: QueryCtx): Promise<boolean> {
  try {
    const auth = await requireAuth(ctx);
    return hasPremium(auth.user);
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
