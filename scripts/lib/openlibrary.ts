/**
 * OpenLibrary API client with rate limiting and retry logic.
 *
 * Rate limit: 100 requests/minute (OL guideline).
 * Covers CDN (covers.openlibrary.org) is separate from API rate limit.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface OLSearchResult {
  key: string; // "/works/OL123W"
  title: string;
  author_name?: string[];
  author_key?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  language?: string[];
  subject?: string[];
  edition_count?: number;
}

export interface OLWorkDetails {
  key: string;
  title: string;
  description?: string | { type: string; value: string };
  subjects?: string[];
  first_publish_date?: string;
  covers?: number[];
}

export interface OLAuthorDetails {
  key: string;
  name: string;
  bio?: string | { type: string; value: string };
  photos?: number[];
  birth_date?: string;
  death_date?: string;
}

export interface OLAuthorSearchResult {
  key: string; // "/authors/OL123A"
  name: string;
  birth_date?: string;
  death_date?: string;
  top_work?: string;
  work_count?: number;
  top_subjects?: string[];
}

export interface OLEdition {
  key: string;
  isbn_13?: string[];
  isbn_10?: string[];
  languages?: Array<{ key: string }>;
}

export interface OLSubjectWork {
  key: string; // "/works/OL123W"
  title: string;
  authors: Array<{ key: string; name: string }>;
  cover_id?: number;
  edition_count?: number;
  first_publish_year?: number;
}

export interface OLSubjectResponse {
  name: string;
  work_count: number;
  works: OLSubjectWork[];
}

// =============================================================================
// RATE LIMITER
// =============================================================================

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private readonly minDelay: number;

  constructor(requestsPerMinute = 100, minDelayMs = 600) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerMinute / 60_000;
    this.minDelay = minDelayMs;
  }

  async wait(): Promise<void> {
    // Refill tokens based on elapsed time
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await sleep(waitTime);
      this.tokens = 1;
      this.lastRefill = Date.now();
    }

    this.tokens -= 1;
    await sleep(this.minDelay);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * OL descriptions can be `string` or `{ type: "/type/text", value: "..." }`.
 * Normalize to plain string.
 */
export function normalizeDescription(
  desc: string | { type: string; value: string } | undefined
): string | undefined {
  if (!desc) return undefined;
  if (typeof desc === "string") return desc;
  return desc.value;
}

/**
 * Get cover image URL from OpenLibrary cover ID.
 * Sizes: S (small), M (medium), L (large)
 */
export function getCoverUrl(coverId: number, size: "S" | "M" | "L" = "L"): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

/**
 * Get author photo URL from OpenLibrary author photo ID.
 */
export function getAuthorPhotoUrl(photoId: number, size: "S" | "M" | "L" = "L"): string {
  return `https://covers.openlibrary.org/a/id/${photoId}-${size}.jpg`;
}

// =============================================================================
// API CLIENT
// =============================================================================

const OL_BASE = "https://openlibrary.org";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

async function fetchWithRetry(url: string, rateLimiter: RateLimiter): Promise<Response> {
  await rateLimiter.wait();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url);

    if (response.ok) return response;

    if (response.status === 429 || response.status >= 500) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] ?? 4000;
        console.warn(`  [retry] ${response.status} for ${url}, waiting ${delay}ms...`);
        await sleep(delay);
        await rateLimiter.wait();
        continue;
      }
    }

    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  throw new Error(`Max retries exceeded for ${url}`);
}

/**
 * Search for a book by title (and optionally author name).
 * Returns the best match or null.
 */
export async function searchBook(
  title: string,
  authorName: string | undefined,
  rateLimiter: RateLimiter
): Promise<OLSearchResult | null> {
  const params = new URLSearchParams({
    title,
    limit: "5",
    fields: "key,title,author_name,author_key,cover_i,first_publish_year,isbn,language,subject",
  });
  if (authorName) params.set("author", authorName);

  const url = `${OL_BASE}/search.json?${params}`;
  const response = await fetchWithRetry(url, rateLimiter);
  const data = (await response.json()) as { docs: OLSearchResult[] };

  if (!data.docs?.length) return null;

  // Best match is first result (OL sorts by relevance)
  return data.docs[0];
}

/**
 * Search for an author by name using OL's dedicated author search.
 * Uses fuzzy matching to pick the best result.
 */
export async function searchAuthors(
  name: string,
  rateLimiter: RateLimiter
): Promise<OLAuthorSearchResult | null> {
  const params = new URLSearchParams({ q: name, limit: "10" });
  const url = `${OL_BASE}/search/authors.json?${params}`;
  const response = await fetchWithRetry(url, rateLimiter);
  const data = (await response.json()) as { docs: OLAuthorSearchResult[] };

  if (!data.docs?.length) return null;

  // Score each result by name similarity and pick the best
  const normalized = normalizeName(name);
  let bestMatch: OLAuthorSearchResult | null = null;
  let bestScore = 0;

  for (const doc of data.docs) {
    const score = nameSimilarity(normalized, normalizeName(doc.name));

    // Boost authors with more works (more likely to be the right person)
    const workBoost = doc.work_count ? Math.min(doc.work_count / 100, 0.1) : 0;
    const totalScore = score + workBoost;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = doc;
    }
  }

  // Require a minimum similarity threshold
  if (bestScore < 0.5) return null;

  return bestMatch;
}

/**
 * Normalize a name for fuzzy comparison:
 * lowercase, strip accents/diacritics, collapse whitespace, remove punctuation.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute similarity between two normalized name strings.
 * Uses a combination of token overlap and longest common subsequence.
 * Returns 0..1 where 1 is identical.
 */
function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  // Token-based Jaccard similarity
  const tokensA = new Set(a.split(" "));
  const tokensB = new Set(b.split(" "));
  const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
  const union = new Set([...tokensA, ...tokensB]);
  const jaccard = intersection.size / union.size;

  // Also check if one contains all tokens of the other (handles "J.K. Rowling" vs "J K Rowling")
  const containsAll =
    [...tokensA].every((t) => b.includes(t)) || [...tokensB].every((t) => a.includes(t));
  const containsBonus = containsAll ? 0.3 : 0;

  return Math.min(1, jaccard + containsBonus);
}

/**
 * Get full work details (description, subjects, covers).
 */
export async function getWorkDetails(
  workKey: string,
  rateLimiter: RateLimiter
): Promise<OLWorkDetails | null> {
  // workKey may be "/works/OL123W" or just "OL123W"
  const key = workKey.startsWith("/works/") ? workKey : `/works/${workKey}`;
  const url = `${OL_BASE}${key}.json`;

  try {
    const response = await fetchWithRetry(url, rateLimiter);
    return (await response.json()) as OLWorkDetails;
  } catch {
    return null;
  }
}

/**
 * Get author details (bio, photos).
 */
export async function getAuthorDetails(
  authorKey: string,
  rateLimiter: RateLimiter
): Promise<OLAuthorDetails | null> {
  // authorKey may be "/authors/OL123A" or just "OL123A"
  const key = authorKey.startsWith("/authors/") ? authorKey : `/authors/${authorKey}`;
  const url = `${OL_BASE}${key}.json`;

  try {
    const response = await fetchWithRetry(url, rateLimiter);
    return (await response.json()) as OLAuthorDetails;
  } catch {
    return null;
  }
}

/**
 * Get first edition of a work (for ISBN).
 */
export async function getFirstEdition(
  workKey: string,
  rateLimiter: RateLimiter
): Promise<OLEdition | null> {
  const key = workKey.startsWith("/works/") ? workKey : `/works/${workKey}`;
  const url = `${OL_BASE}${key}/editions.json?limit=1`;

  try {
    const response = await fetchWithRetry(url, rateLimiter);
    const data = (await response.json()) as { entries: OLEdition[] };
    return data.entries?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch works from a subject (sorted by edition_count/popularity).
 */
export async function fetchSubjectWorks(
  subject: string,
  limit: number,
  offset: number,
  rateLimiter: RateLimiter
): Promise<OLSubjectResponse> {
  const url = `${OL_BASE}/subjects/${subject}.json?limit=${limit}&offset=${offset}`;
  const response = await fetchWithRetry(url, rateLimiter);
  return (await response.json()) as OLSubjectResponse;
}
