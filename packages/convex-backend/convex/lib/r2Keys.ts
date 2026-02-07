import { getStoragePrefix } from "./r2Client";

/**
 * Sanitize a filename for safe storage
 * Replaces special characters with underscores, keeps alphanumeric, dots, and dashes
 */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
}

/**
 * Generate an R2 key for an audio file
 *
 * Format: {env}/{r2PathPrefix}/audiobooks/{bookId}/{sanitizedFileName}
 * Example: prod/storage-accounts/abc123def/audiobooks/xyz789/TheWayOfKings_part1.mp3
 */
export function generateAudioFileR2Key(
  r2PathPrefix: string,
  bookId: string,
  fileName: string
): string {
  const sanitizedFileName = sanitizeFileName(fileName);
  return `${getStoragePrefix()}/${r2PathPrefix}/audiobooks/${bookId}/${sanitizedFileName}`;
}
