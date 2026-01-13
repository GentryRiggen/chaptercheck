import { v } from "convex/values";
import { action } from "../_generated/server";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "./r2Client";

// Generate a presigned URL for uploading an audio file
export const generateUploadUrl = action({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("R2_BUCKET_NAME not configured");
    }

    // Generate unique key for the file
    const timestamp = Date.now();
    const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const r2Key = `audiobooks/${timestamp}-${sanitizedFileName}`;

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

    return { uploadUrl, r2Key, r2Bucket: bucketName };
  },
});

// Generate a presigned URL for streaming/downloading an audio file
export const generateStreamUrl = action({
  args: {
    r2Key: v.string(),
    r2Bucket: v.string(),
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
    });

    // Generate presigned URL valid for 1 hour
    const streamUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { streamUrl };
  },
});
