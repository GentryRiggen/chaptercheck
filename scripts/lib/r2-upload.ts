/**
 * R2 upload utility for scripts.
 * Downloads images from URLs and uploads them to R2.
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// =============================================================================
// R2 CLIENT FACTORY
// =============================================================================

export function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME not configured");
  return bucket;
}

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

const MIN_IMAGE_SIZE = 1000; // bytes — skip placeholders
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Download an image from a URL and upload it to R2.
 *
 * @param r2Client - S3-compatible client
 * @param bucket - R2 bucket name
 * @param imageUrl - Source URL to download
 * @param pathPrefix - R2 path prefix (e.g., "book-covers" or "author-photos")
 * @param fileName - File name without extension
 * @returns R2 key on success, null on failure
 */
export async function uploadImageFromUrl(
  r2Client: S3Client,
  bucket: string,
  imageUrl: string,
  pathPrefix: string,
  fileName: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    // Validate size
    if (buffer.length < MIN_IMAGE_SIZE) return null; // Placeholder image
    if (buffer.length > MAX_IMAGE_SIZE) return null;

    // Validate content type (be lenient — some servers don't set it correctly)
    const isValidType = VALID_CONTENT_TYPES.some((t) => contentType.startsWith(t));
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

    // Match existing pattern: dev/media/{prefix}/{timestamp}-{name}.{ext}
    const storagePrefix = process.env.STORAGE_ENV === "production" ? "prod" : "dev";
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 100);
    const r2Key = `${storagePrefix}/media/${pathPrefix}/${Date.now()}-${sanitizedName}.${isValidType ? ext : "jpg"}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: buffer,
        ContentType: isValidType ? contentType : "image/jpeg",
      })
    );

    return r2Key;
  } catch (error) {
    console.warn(
      `  [r2] Failed to upload ${imageUrl}: ${error instanceof Error ? error.message : error}`
    );
    return null;
  }
}

/**
 * Upload multiple images concurrently with a concurrency limit.
 */
export async function uploadImagesBatch(
  r2Client: S3Client,
  bucket: string,
  items: Array<{ imageUrl: string; pathPrefix: string; fileName: string }>,
  concurrency = 5
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const queue = [...items];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const key = await uploadImageFromUrl(
        r2Client,
        bucket,
        item.imageUrl,
        item.pathPrefix,
        item.fileName
      );
      results.set(item.imageUrl, key);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
