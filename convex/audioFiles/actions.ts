import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { type Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { getR2Client } from "../lib/r2Client";
import { generateAudioFileR2Key } from "../lib/r2Keys";

// Generate a presigned URL for uploading an audio file
export const generateUploadUrl = action({
  args: {
    bookId: v.id("books"),
    fileName: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    uploadUrl: string;
    r2Key: string;
    r2Bucket: string;
    storageAccountId: Id<"storageAccounts">;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get or create storage account for this user
    const storageAccount = await ctx.runMutation(
      internal.storageAccounts.internal.getOrCreateStorageAccountInternal,
      { clerkId: identity.subject }
    );

    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("R2_BUCKET_NAME not configured");
    }

    // Generate R2 key using storage account path prefix and book ID
    const r2Key = generateAudioFileR2Key(storageAccount.r2PathPrefix, args.bookId, args.fileName);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      ContentType: args.contentType,
      ContentLength: args.fileSize,
    });

    // Generate presigned URL valid for 15 minutes
    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 900, // 15 minutes
    });

    return {
      uploadUrl,
      r2Key,
      r2Bucket: bucketName,
      storageAccountId: storageAccount._id,
    };
  },
});

// Generate a presigned URL for streaming/downloading an audio file
export const generateStreamUrl = action({
  args: {
    r2Key: v.string(),
    r2Bucket: v.string(),
    // Optional friendly filename for Content-Disposition header (used for downloads)
    downloadFileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const r2Client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: args.r2Bucket,
      Key: args.r2Key,
      // Set Content-Disposition for downloads if filename provided
      ...(args.downloadFileName && {
        ResponseContentDisposition: `attachment; filename="${args.downloadFileName}"`,
      }),
    });

    // Generate presigned URL valid for 1 hour
    const streamUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { streamUrl };
  },
});
