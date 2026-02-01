"use client";

import { BookOpen } from "lucide-react";

import { useImageUrl } from "@/hooks/useImageUrl";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  coverImageR2Key?: string;
  title: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-8 h-12",
  sm: "w-10 h-14",
  md: "w-20 h-28",
  lg: "w-32 h-44",
};

const iconSizes = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

export function BookCover({ coverImageR2Key, title, size = "md", className }: BookCoverProps) {
  const { imageUrl, loading } = useImageUrl(coverImageR2Key);

  if (loading) {
    return (
      <div
        className={cn("flex-shrink-0 animate-pulse rounded bg-muted", sizeClasses[size], className)}
      />
    );
  }

  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded bg-muted",
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
      className={cn("flex-shrink-0 rounded object-cover", sizeClasses[size], className)}
    />
  );
}
