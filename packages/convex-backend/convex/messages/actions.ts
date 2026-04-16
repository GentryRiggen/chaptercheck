import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";

import { action } from "../_generated/server";
import { getR2Client } from "../lib/r2Client";
import { generateMessageMediaR2Key } from "../lib/r2Keys";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB (after client-side compression)
const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Generate a presigned URL for uploading message media (photo or video).
 */
export const generateMessageMediaUploadUrl = action({
  args: {
    conversationId: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate content type
    const isImage = ALLOWED_IMAGE_TYPES.includes(args.contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(args.contentType);
    if (!isImage && !isVideo) {
      throw new Error(
        `Invalid file type: ${args.contentType}. Allowed: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(", ")}`
      );
    }

    // Validate file size
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (args.fileSize > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("R2_BUCKET_NAME not configured");
    }

    const r2Key = generateMessageMediaR2Key(args.conversationId, args.fileName);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      ContentType: args.contentType,
      ContentLength: args.fileSize,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 900, // 15 minutes
    });

    return { uploadUrl, r2Key, r2Bucket: bucketName };
  },
});

/**
 * Generate a presigned URL for viewing message media.
 */
export const generateMessageMediaUrl = action({
  args: {
    r2Key: v.string(),
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

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: args.r2Key,
    });

    const url = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { url };
  },
});
