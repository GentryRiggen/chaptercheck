import { v } from "convex/values";

import { internal } from "../_generated/api";
import { internalMutation, internalQuery, action } from "../_generated/server";

/**
 * Internal mutation that deletes all user-owned rows across every table.
 *
 * Deletion order is chosen so that child/join-table rows are removed before
 * the parent rows they reference (e.g. bookNoteTags before bookNotes,
 * shelfBooks before shelves), and the users row is deleted last.
 */
export const deleteAccountData = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // --- 1. bookNoteTags (join table, has userId + by_user_and_tag index) ---
    const bookNoteTags = await ctx.db
      .query("bookNoteTags")
      .withIndex("by_user_and_tag", (q) => q.eq("userId", userId))
      .collect();
    for (const row of bookNoteTags) {
      await ctx.db.delete(row._id);
    }

    // --- 2. bookNotes (has by_user_and_book index prefix) ---
    const bookNotes = await ctx.db
      .query("bookNotes")
      .withIndex("by_user_and_book", (q) => q.eq("userId", userId))
      .collect();
    for (const row of bookNotes) {
      await ctx.db.delete(row._id);
    }

    // --- 3. noteCategories (has by_user index) ---
    const noteCategories = await ctx.db
      .query("noteCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of noteCategories) {
      await ctx.db.delete(row._id);
    }

    // --- 4. memoryTags (has by_user index) ---
    const memoryTags = await ctx.db
      .query("memoryTags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of memoryTags) {
      await ctx.db.delete(row._id);
    }

    // --- 5. bookGenreVotes (has by_book_and_user index — no userId-only index, use filter) ---
    const bookGenreVotes = await ctx.db
      .query("bookGenreVotes")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    for (const row of bookGenreVotes) {
      await ctx.db.delete(row._id);
    }

    // --- 6. shelfBooks (no userId field — must go through user's shelves) ---
    const shelves = await ctx.db
      .query("shelves")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const shelf of shelves) {
      const shelfBooks = await ctx.db
        .query("shelfBooks")
        .withIndex("by_shelf", (q) => q.eq("shelfId", shelf._id))
        .collect();
      for (const row of shelfBooks) {
        await ctx.db.delete(row._id);
      }
    }

    // --- 7. shelves (has by_user index, rows fetched above) ---
    for (const shelf of shelves) {
      await ctx.db.delete(shelf._id);
    }

    // --- 8. listeningProgress (has by_user_and_book index prefix) ---
    const listeningProgress = await ctx.db
      .query("listeningProgress")
      .withIndex("by_user_and_book", (q) => q.eq("userId", userId))
      .collect();
    for (const row of listeningProgress) {
      await ctx.db.delete(row._id);
    }

    // --- 9. bookUserData (has by_user index) ---
    const bookUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const row of bookUserData) {
      await ctx.db.delete(row._id);
    }

    // --- 10. userPreferences (has by_userId index) ---
    const userPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const row of userPreferences) {
      await ctx.db.delete(row._id);
    }

    // --- 11. audioFiles (field is uploadedBy, has by_uploadedBy index) ---
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", userId))
      .collect();
    for (const row of audioFiles) {
      await ctx.db.delete(row._id);
    }

    // --- 12. users row (last) ---
    await ctx.db.delete(userId);
  },
});

/**
 * Internal query to look up a user by their Clerk ID.
 * Used by the deleteAccount action since actions cannot query the DB directly.
 */
export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

/**
 * Public action that deletes the authenticated user's account.
 *
 * 1. Verifies the caller is authenticated and resolves their Convex user row.
 * 2. Runs the internal mutation to purge all user data from the database.
 * 3. Calls the Clerk Backend API to delete the Clerk user, ensuring the
 *    identity provider is cleaned up as well.
 */
export const deleteAccount = action({
  args: {},
  handler: async (ctx) => {
    // --- Authenticate ---
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;

    // Look up the Convex user row by Clerk ID
    const user = await ctx.runQuery(internal.users.deleteAccount.getUserByClerkId, {
      clerkId: clerkUserId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // --- Delete all user data from Convex ---
    await ctx.runMutation(internal.users.deleteAccount.deleteAccountData, {
      userId: user._id,
    });

    // --- Delete the user from Clerk ---
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error("CLERK_SECRET_KEY environment variable is not set");
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to delete Clerk user (${response.status}): ${errorBody}`);
    }
  },
});
