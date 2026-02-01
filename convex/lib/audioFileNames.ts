/**
 * Utility functions for generating friendly audio file display names
 *
 * Naming convention:
 * - With series: {BookTitle}_{SeriesName}-Book{SeriesOrder}_part{PartNumber}.{ext}
 * - Without series: {BookTitle}_part{PartNumber}.{ext}
 *
 * Example: "TheWayOfKings_StormlightArchive-Book1_part2.mp3"
 */

export interface AudioFileNameParams {
  bookTitle: string;
  seriesName?: string | null;
  seriesOrder?: number | null;
  partNumber: number;
  format: string; // file extension like "mp3", "m4a"
}

/**
 * Sanitize a string to be safe for filenames
 * - Remove special characters
 * - Convert spaces to nothing (CamelCase)
 * - Keep alphanumeric only
 */
function sanitizeForFilename(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Format series order for display (handles decimals for novellas)
 * - 1 -> "1"
 * - 2.5 -> "2.5"
 */
function formatSeriesOrder(order: number): string {
  return Number.isInteger(order) ? order.toString() : order.toFixed(1);
}

/**
 * Generate a friendly display name for an audio file
 */
export function generateFriendlyFileName(params: AudioFileNameParams): string {
  const { bookTitle, seriesName, seriesOrder, partNumber, format } = params;

  const sanitizedTitle = sanitizeForFilename(bookTitle);
  const ext = format.toLowerCase().replace(/^\./, "");

  if (seriesName && seriesOrder !== null && seriesOrder !== undefined) {
    const sanitizedSeries = sanitizeForFilename(seriesName);
    const orderStr = formatSeriesOrder(seriesOrder);
    return `${sanitizedTitle}_${sanitizedSeries}-Book${orderStr}_part${partNumber}.${ext}`;
  }

  return `${sanitizedTitle}_part${partNumber}.${ext}`;
}

/**
 * Generate a friendly display name without extension (for UI display)
 */
export function generateFriendlyDisplayName(params: Omit<AudioFileNameParams, "format">): string {
  const { bookTitle, seriesName, seriesOrder, partNumber } = params;

  const sanitizedTitle = sanitizeForFilename(bookTitle);

  if (seriesName && seriesOrder !== null && seriesOrder !== undefined) {
    const sanitizedSeries = sanitizeForFilename(seriesName);
    const orderStr = formatSeriesOrder(seriesOrder);
    return `${sanitizedTitle}_${sanitizedSeries}-Book${orderStr}_part${partNumber}`;
  }

  return `${sanitizedTitle}_part${partNumber}`;
}

/**
 * Generate a human-readable display name (with spaces, for UI)
 */
export function generateHumanReadableName(params: Omit<AudioFileNameParams, "format">): string {
  const { bookTitle, seriesName, seriesOrder, partNumber } = params;

  if (seriesName && seriesOrder !== null && seriesOrder !== undefined) {
    const orderStr = formatSeriesOrder(seriesOrder);
    return `${bookTitle} (${seriesName} #${orderStr}) - Part ${partNumber}`;
  }

  return `${bookTitle} - Part ${partNumber}`;
}
