/**
 * @deprecated Use the auth utilities from "../lib/auth" instead
 *
 * This file is kept for backwards compatibility.
 * Import from "../lib/auth" for:
 * - requireAuth (queries)
 * - requireAuthMutation (mutations)
 * - requireAdmin / requireAdminMutation
 * - isAdmin, isAuthenticated, getCurrentUser
 */

export { requireAuthMutation as getOrCreateUser, requireAuth as getUser } from "../lib/auth";
