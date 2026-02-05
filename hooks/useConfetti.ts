"use client";

import { useCallback } from "react";

type ConfettiOptions = {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
};

const DEFAULT_OPTIONS: ConfettiOptions = {
  particleCount: 100,
  spread: 70,
  origin: { x: 0.5, y: 0.6 },
};

/**
 * Hook that provides a function to trigger a confetti burst.
 * Uses dynamic import to avoid SSR issues with canvas-confetti.
 *
 * @returns Object containing the fireConfetti function
 *
 * @example
 * const { fireConfetti } = useConfetti();
 * fireConfetti(); // Trigger with defaults
 * fireConfetti({ particleCount: 200, spread: 100 }); // Custom options
 */
export function useConfetti() {
  const fireConfetti = useCallback(async (options?: ConfettiOptions) => {
    const confetti = (await import("canvas-confetti")).default;
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    confetti({
      particleCount: mergedOptions.particleCount,
      spread: mergedOptions.spread,
      origin: mergedOptions.origin,
    });
  }, []);

  return { fireConfetti };
}
