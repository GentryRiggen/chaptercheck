"use client";

import { useCallback, useRef } from "react";

type TripleClickOptions = {
  /** Time window in ms for clicks to count as triple-click (default: 500ms) */
  timeWindow?: number;
};

type TripleClickResult<T extends HTMLElement> = {
  /** Ref to attach to the target element */
  ref: React.RefObject<T | null>;
  /** Click handler props to spread on the element */
  clickProps: {
    onClick: (event: React.MouseEvent) => void;
  };
};

/**
 * Hook that detects triple-clicks on an element.
 *
 * @param onTripleClick - Callback function invoked when triple-click is detected
 * @param options - Configuration options
 * @returns Object with ref and clickProps to attach to the target element
 *
 * @example
 * const { ref, clickProps } = useTripleClick<HTMLSpanElement>(() => {
 *   console.log('Triple clicked!');
 * });
 *
 * return <span ref={ref} {...clickProps}>Click me</span>;
 */
export function useTripleClick<T extends HTMLElement = HTMLElement>(
  onTripleClick: () => void,
  options?: TripleClickOptions
): TripleClickResult<T> {
  const { timeWindow = 500 } = options ?? {};

  const ref = useRef<T | null>(null);
  const clickTimestamps = useRef<number[]>([]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const now = event.timeStamp;
      const timestamps = clickTimestamps.current;

      // Add current click timestamp
      timestamps.push(now);

      // Remove clicks outside the time window
      const cutoff = now - timeWindow;
      while (timestamps.length > 0 && timestamps[0] < cutoff) {
        timestamps.shift();
      }

      // Check if we have 3 clicks within the window
      if (timestamps.length >= 3) {
        onTripleClick();
        // Reset after triggering
        clickTimestamps.current = [];
      }
    },
    [onTripleClick, timeWindow]
  );

  return {
    ref,
    clickProps: {
      onClick: handleClick,
    },
  };
}
