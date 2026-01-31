"use client";

import { useImageUrl } from "@/hooks/useImageUrl";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  coverImageR2Key?: string;
  title: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-12 h-16",
  md: "w-20 h-28",
  lg: "w-32 h-44",
};

const iconSizes = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

export function BookCover({
  coverImageR2Key,
  title,
  size = "md",
  className,
}: BookCoverProps) {
  const { imageUrl, loading } = useImageUrl(coverImageR2Key);

  if (loading) {
    return (
      <div
        className={cn(
          "rounded bg-muted animate-pulse flex-shrink-0",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (!imageUrl) {
    return (
      <div
        className={cn(
          "rounded bg-muted flex items-center justify-center flex-shrink-0",
          sizeClasses[size],
          className
        )}
      >
        <BookOpen className={cn("text-muted-foreground", iconSizes[size])} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={title}
      className={cn("rounded object-cover flex-shrink-0", sizeClasses[size], className)}
    />
  );
}
