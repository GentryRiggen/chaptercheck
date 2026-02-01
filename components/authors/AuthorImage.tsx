"use client";

import { User } from "lucide-react";

import { useImageUrl } from "@/hooks/useImageUrl";
import { cn } from "@/lib/utils";

interface AuthorImageProps {
  imageR2Key?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "w-8 h-8",
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

const iconSizes = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function AuthorImage({ imageR2Key, name, size = "md", className }: AuthorImageProps) {
  const { imageUrl, loading } = useImageUrl(imageR2Key);

  if (loading) {
    return (
      <div className={cn("animate-pulse rounded-full bg-muted", sizeClasses[size], className)} />
    );
  }

  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted",
          sizeClasses[size],
          className
        )}
      >
        <User className={cn("text-muted-foreground", iconSizes[size])} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={name}
      className={cn("rounded-full object-cover", sizeClasses[size], className)}
    />
  );
}
