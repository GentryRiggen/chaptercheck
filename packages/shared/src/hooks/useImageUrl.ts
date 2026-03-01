import { useAction } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "@chaptercheck/convex-backend/_generated/api";

/**
 * Check if a string is an external URL (vs an R2 storage key)
 */
function isExternalUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

const IMAGE_URL_CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes (URLs currently expire after 60)
const imageUrlCache = new Map<string, { value: string; expiresAt: number }>();
const inflightRequests = new Map<string, Promise<string>>();

export const useImageUrl = (r2Key: string | undefined) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImageUrl = useAction(api.images.actions.generateImageUrl);

  useEffect(() => {
    if (!r2Key) {
      setImageUrl(null);
      return;
    }

    // If it's already an external URL, use it directly (e.g., seed data)
    if (isExternalUrl(r2Key)) {
      setImageUrl(r2Key);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const cached = imageUrlCache.get(r2Key);
        if (cached && cached.expiresAt > Date.now()) {
          if (!cancelled) {
            setImageUrl(cached.value);
            setLoading(false);
          }
          return;
        }

        let request = inflightRequests.get(r2Key);
        if (!request) {
          request = generateImageUrl({ r2Key }).then(({ imageUrl }) => imageUrl);
          inflightRequests.set(r2Key, request);
        }

        const nextUrl = await request;
        imageUrlCache.set(r2Key, {
          value: nextUrl,
          expiresAt: Date.now() + IMAGE_URL_CACHE_TTL_MS,
        });
        inflightRequests.delete(r2Key);

        if (!cancelled) {
          setImageUrl(nextUrl);
        }
      } catch (err) {
        inflightRequests.delete(r2Key);
        if (!cancelled) {
          console.error("Failed to get image URL:", err);
          setError(err instanceof Error ? err.message : "Failed to load image");
          setImageUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUrl();

    return () => {
      cancelled = true;
    };
  }, [r2Key, generateImageUrl]);

  return { imageUrl, loading, error };
};
