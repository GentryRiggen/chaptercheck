/**
 * Get a time-of-day greeting string based on the current hour.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Format a duration in seconds to a compact human-readable string (e.g., "3 hrs", "45 mins").
 */
export function formatListeningTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  if (hours < 1) {
    const mins = Math.round(seconds / 60);
    return `${mins} min${mins !== 1 ? "s" : ""}`;
  }
  return `${hours} hr${hours !== 1 ? "s" : ""}`;
}

/**
 * Format bytes to a human-readable string (KB, MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);
  const formatted = value.toFixed(decimals);

  // Remove trailing zeros after decimal point
  const cleaned = parseFloat(formatted).toString();

  return `${cleaned} ${sizes[i]}`;
}

/**
 * Compute a smart rewind position when resuming playback.
 *
 * Based on how long ago the user last listened, rewinds a few seconds
 * so they can re-orient (AntennaPod-style discrete tiers):
 *  - < 1 min pause  → 0s rewind
 *  - 1 min – 1 hr   → 2s rewind
 *  - 1 hr – 1 day   → 5s rewind
 *  - > 1 day        → 10s rewind
 */
export function computeSmartRewind(positionSeconds: number, lastListenedAt: number): number {
  const elapsedMs = Math.max(0, Date.now() - lastListenedAt);

  let rewind: number;
  if (elapsedMs < 60_000) {
    rewind = 0;
  } else if (elapsedMs < 3_600_000) {
    rewind = 2;
  } else if (elapsedMs < 86_400_000) {
    rewind = 5;
  } else {
    rewind = 10;
  }

  return Math.max(0, positionSeconds - rewind);
}

/**
 * Format a timestamp to a relative date string (e.g., "2 days ago", "1 week ago")
 */
export function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  } else if (diffWeeks < 4) {
    return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  } else {
    return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
  }
}
