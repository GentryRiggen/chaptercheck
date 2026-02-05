"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "xs" | "sm" | "md";
}

export function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const handleStarClick = (starIndex: number) => {
    if (readonly || !onChange) return;

    const newValue = starIndex + 1;
    // If clicking the same star that's already the current value, clear the rating
    if (newValue === value) {
      onChange(0);
    } else {
      onChange(newValue);
    }
  };

  const iconSize = size === "xs" ? "h-3 w-3" : size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((index) => {
        const isFilled = index < value;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleStarClick(index)}
            disabled={readonly}
            className={cn(
              "rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              !readonly && "cursor-pointer transition-transform hover:scale-110"
            )}
            aria-label={`Rate ${index + 1} star${index === 0 ? "" : "s"}`}
          >
            <Star
              className={cn(
                iconSize,
                isFilled
                  ? "fill-amber-500 text-amber-500"
                  : "fill-transparent text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
