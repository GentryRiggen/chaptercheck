import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { type Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery } from "../_generated/server";
import { getEffectiveRole } from "../lib/auth";
import { getR2Client } from "../lib/r2Client";

/**
 * Internal mutation that deletes all user-owned rows across every table.
 *
 * Deletion order is chosen so that child/join-table rows are removed before
 * the parent rows they reference (e.g. bookNoteTags before bookNotes,
 * shelfBooks before shelves), and the users row is deleted last.
 *
 * Returns metadata about audio files for R2 cleanup by the calling action.
 */
export const deleteAccountData = internalMutation({
  args: {
    userId: v.id("users"),
    deleteStorageAccount: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, deleteStorageAccount }) => {
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

    // --- 11. follows (both directions) ---
    const followsAsFollower = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .collect();
    for (const row of followsAsFollower) {
      await ctx.db.delete(row._id);
    }

    const followsAsFollowing = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();
    for (const row of followsAsFollowing) {
      await ctx.db.delete(row._id);
    }

    // --- 12. audioFiles (field is uploadedBy, has by_uploadedBy index) ---
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", userId))
      .collect();

    // Collect r2Keys for R2 cleanup before deleting records
    const r2KeysToDelete = audioFiles.map((f) => f.r2Key);
    const totalBytesDeleted = audioFiles.reduce((sum, f) => sum + f.fileSize, 0);

    // Update storage account stats for shared accounts, or delete if sole user
    const user = await ctx.db.get(userId);
    let storageAccountR2Prefix: string | undefined;

    if (user?.storageAccountId) {
      const storageAccount = await ctx.db.get(user.storageAccountId);
      if (storageAccount) {
        if (deleteStorageAccount) {
          // Sole user: delete the entire storage account record
          storageAccountR2Prefix = storageAccount.r2PathPrefix;
          await ctx.db.delete(storageAccount._id);
        } else {
          // Shared account: decrement stats for deleted files
          await ctx.db.patch(storageAccount._id, {
            totalBytesUsed: Math.max(0, storageAccount.totalBytesUsed - totalBytesDeleted),
            fileCount: Math.max(0, storageAccount.fileCount - audioFiles.length),
            updatedAt: Date.now(),
          });
        }
      }
    }

    for (const row of audioFiles) {
      await ctx.db.delete(row._id);
    }

    // --- 13. users row (last) ---
    await ctx.db.delete(userId);

    return {
      r2KeysToDelete,
      storageAccountR2Prefix,
    };
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
 * Internal query to look up a user by their Convex ID.
 * Used by the adminDeleteUser action since actions cannot query the DB directly.
 */
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

/**
 * Internal query to check if a user is the sole user on their storage account.
 */
export const getStorageAccountUserCount = internalQuery({
  args: { storageAccountId: v.id("storageAccounts") },
  handler: async (ctx, { storageAccountId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_storageAccountId", (q) => q.eq("storageAccountId", storageAccountId))
      .collect();
    return { count: users.length };
  },
});

/**
 * Public action that deletes the authenticated user's account.
 *
 * 1. Verifies the caller is authenticated and resolves their Convex user row.
 * 2. Runs the internal mutation to purge all user data from the database.
 * 3. Deletes R2 files for the user's audio uploads.
 * 4. Calls the Clerk Backend API to delete the Clerk user.
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

    // Check if sole user on storage account
    let isSoleUser = false;
    if (user.storageAccountId) {
      const { count } = await ctx.runQuery(
        internal.users.deleteAccount.getStorageAccountUserCount,
        { storageAccountId: user.storageAccountId }
      );
      isSoleUser = count === 1;
    }

    // --- Delete the user from Clerk first (harder to recover if orphaned) ---
    await deleteClerkUser(clerkUserId);

    // --- Delete all user data from Convex ---
    const { r2KeysToDelete, storageAccountR2Prefix } = await ctx.runMutation(
      internal.users.deleteAccount.deleteAccountData,
      { userId: user._id, deleteStorageAccount: isSoleUser }
    );

    // --- Delete R2 files ---
    await deleteR2Files(r2KeysToDelete, storageAccountR2Prefix);
  },
});

/**
 * Admin-only action that deletes another user's account.
 *
 * 1. Verifies the caller is an admin.
 * 2. Looks up the target user.
 * 3. Deletes the target user from Clerk (before data, to avoid orphaned accounts).
 * 4. Runs the internal mutation to purge all target user data.
 * 5. Deletes R2 files for the target user's audio uploads.
 */
export const adminDeleteUser = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // --- Verify caller is admin ---
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const adminUser = await ctx.runQuery(internal.users.deleteAccount.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!adminUser) {
      throw new Error("Admin user not found");
    }

    if (getEffectiveRole(adminUser) !== "admin") {
      throw new Error("Admin access required");
    }

    // --- Look up target user ---
    const targetUser = await ctx.runQuery(internal.users.deleteAccount.getUserById, {
      userId: args.userId,
    });

    if (!targetUser) {
      throw new Error("Target user not found");
    }

    // Prevent admin from deleting themselves through this action
    if (targetUser._id === adminUser._id) {
      throw new Error("Cannot delete your own account through admin deletion");
    }

    // Prevent deletion of admin users
    if (getEffectiveRole(targetUser) === "admin") {
      throw new Error("Cannot delete an admin user");
    }

    // Check if sole user on storage account
    let isSoleUser = false;
    if (targetUser.storageAccountId) {
      const { count } = await ctx.runQuery(
        internal.users.deleteAccount.getStorageAccountUserCount,
        { storageAccountId: targetUser.storageAccountId }
      );
      isSoleUser = count === 1;
    }

    // --- Delete from Clerk first (harder to recover if orphaned) ---
    await deleteClerkUser(targetUser.clerkId);

    // --- Delete all target user data from Convex ---
    const { r2KeysToDelete, storageAccountR2Prefix } = await ctx.runMutation(
      internal.users.deleteAccount.deleteAccountData,
      { userId: targetUser._id, deleteStorageAccount: isSoleUser }
    );

    // --- Delete R2 files ---
    await deleteR2Files(r2KeysToDelete, storageAccountR2Prefix);
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Delete specific R2 keys and optionally all objects under a prefix.
 * If storageAccountR2Prefix is provided (sole user scenario), deletes everything
 * under that prefix to catch any orphaned files.
 */
async function deleteR2Files(r2Keys: string[], storageAccountR2Prefix?: string): Promise<void> {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    // If R2 isn't configured, skip file cleanup (may happen in dev/test)
    return;
  }

  const r2Client = getR2Client();

  if (storageAccountR2Prefix) {
    // Sole user: delete everything under the storage account prefix
    // This catches any orphaned files that may not have audioFile records
    await deleteR2Prefix(r2Client, bucketName, storageAccountR2Prefix);
  } else if (r2Keys.length > 0) {
    // Shared account: delete only the specific files
    await deleteR2KeysBatch(r2Client, bucketName, r2Keys);
  }
}

/**
 * Delete all R2 objects under a given prefix using ListObjectsV2 + DeleteObjects.
 */
async function deleteR2Prefix(
  r2Client: ReturnType<typeof getR2Client>,
  bucketName: string,
  prefix: string
): Promise<number> {
  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listResponse = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    const objects = listResponse.Contents;
    if (!objects || objects.length === 0) break;

    const keysToDelete = objects
      .map((obj) => obj.Key)
      .filter((key): key is string => key !== undefined);

    if (keysToDelete.length > 0) {
      await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: keysToDelete.map((Key) => ({ Key })),
            Quiet: true,
          },
        })
      );
      totalDeleted += keysToDelete.length;
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  return totalDeleted;
}

/**
 * Delete a batch of specific R2 keys using DeleteObjects (max 1000 per request).
 */
async function deleteR2KeysBatch(
  r2Client: ReturnType<typeof getR2Client>,
  bucketName: string,
  r2Keys: string[]
): Promise<void> {
  // DeleteObjects supports up to 1000 keys per request
  const batchSize = 1000;
  for (let i = 0; i < r2Keys.length; i += batchSize) {
    const batch = r2Keys.slice(i, i + batchSize);
    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

/**
 * Delete a user from Clerk using the Backend API.
 */
async function deleteClerkUser(clerkUserId: string): Promise<void> {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    throw new Error(
      "CLERK_SECRET_KEY environment variable is not set. Run: npx convex env set CLERK_SECRET_KEY <key>"
    );
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
}
