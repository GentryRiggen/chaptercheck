import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { getEffectiveRole } from "../lib/auth";
import { getR2Client } from "../lib/r2Client";

/**
 * Admin-only action that empties a storage account.
 *
 * 1. Verifies the caller is an admin.
 * 2. Reads storage account info and audio files via internal query.
 * 3. Deletes all R2 objects under the account's r2PathPrefix.
 * 4. Deletes all audioFile records and related listeningProgress via internal mutation.
 * 5. Resets storage stats to 0.
 */
export const emptyStorageAccount = action({
  args: {
    storageAccountId: v.id("storageAccounts"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    audioFilesDeleted: number;
    listeningProgressDeleted: number;
    r2ObjectsDeleted: number;
  }> => {
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

    // --- Get storage account data ---
    const accountData = await ctx.runQuery(
      internal.storageAccounts.queries.getStorageAccountForEmpty,
      { storageAccountId: args.storageAccountId }
    );

    // --- Delete R2 objects under the prefix ---
    let r2ObjectsDeleted = 0;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (bucketName && accountData.storageAccount.r2PathPrefix) {
      const r2Client = getR2Client();
      let continuationToken: string | undefined;

      do {
        const listResponse = await r2Client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: accountData.storageAccount.r2PathPrefix,
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
          r2ObjectsDeleted += keysToDelete.length;
        }

        continuationToken = listResponse.NextContinuationToken;
      } while (continuationToken);
    }

    // --- Delete DB records via internal mutation ---
    const dbResult = await ctx.runMutation(
      internal.storageAccounts.internal.emptyStorageAccountData,
      {
        storageAccountId: args.storageAccountId,
        audioFileIds: accountData.audioFileIds,
        bookIds: accountData.bookIds,
        userIds: accountData.userIds,
      }
    );

    return {
      audioFilesDeleted: dbResult.audioFilesDeleted,
      listeningProgressDeleted: dbResult.listeningProgressDeleted,
      r2ObjectsDeleted,
    };
  },
});
