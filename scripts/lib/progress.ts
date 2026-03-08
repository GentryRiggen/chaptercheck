/**
 * JSON progress file for resumable scripts.
 * Uses atomic writes (write to .tmp, then rename) to avoid corruption.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "fs";

/**
 * Load progress from a JSON file, or return defaults if file doesn't exist.
 */
export function loadProgress<T>(filePath: string, defaults: T): T {
  if (!existsSync(filePath)) return defaults;

  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    console.warn(`  [progress] Failed to read ${filePath}, starting fresh`);
    return defaults;
  }
}

/**
 * Save progress to a JSON file atomically.
 */
export function saveProgress<T>(filePath: string, data: T): void {
  const tmp = filePath + ".tmp";
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, filePath);
}
