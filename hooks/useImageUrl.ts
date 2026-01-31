import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

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

    let cancelled = false;

    const fetchUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const { imageUrl } = await generateImageUrl({ r2Key });
        if (!cancelled) {
          setImageUrl(imageUrl);
        }
      } catch (err) {
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
