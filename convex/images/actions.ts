import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v } from "convex/values";

import { action } from "../_generated/server";
import { getR2Client, getStoragePrefix } from "../lib/r2Client";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Generate a presigned URL for uploading an image
export const generateUploadUrl = action({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    contentType: v.string(),
    path: v.string(), // e.g., "authors", "books"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate content type
    if (!ALLOWED_IMAGE_TYPES.includes(args.contentType)) {
      throw new Error(`Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
    }

    // Validate file size
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const r2Client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("R2_BUCKET_NAME not configured");
    }

    // Generate unique key for the file with environment prefix
    const timestamp = Date.now();
    const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const r2Key = `${getStoragePrefix()}/media/${args.path}/${timestamp}-${sanitizedFileName}`;

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

// Generate a presigned URL for viewing an image
export const generateImageUrl = action({
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

    // Generate presigned URL valid for 1 hour
    const imageUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { imageUrl };
  },
});
