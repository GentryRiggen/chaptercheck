import { S3Client } from "@aws-sdk/client-s3";

/**
 * Get the storage prefix based on environment.
 * This partitions R2 storage by environment to avoid mixing dev/prod files.
 *
 * Requires STORAGE_ENV to be set in Convex environment variables.
 * NODE_ENV is NOT reliable because Convex always sets it to "production".
 *
 * Set STORAGE_ENV=dev on dev deployments, STORAGE_ENV=production on prod.
 */
export const getStoragePrefix = (): string => {
  const env = process.env.STORAGE_ENV;

  if (env === "production") {
    return "prod";
  }

  // Default to "dev" for safety — never accidentally write to prod
  return "dev";
};

export const getR2Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};
