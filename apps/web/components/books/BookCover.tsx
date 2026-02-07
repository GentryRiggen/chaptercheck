"use client";

import { useImageUrl } from "@chaptercheck/shared/hooks/useImageUrl";
import { BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

interface BookCoverProps {
  coverImageR2Key?: string;
  title: string;
  size?: "xs" | "sm" | "md" | "lg" | "card";
  className?: string;
}

const sizeClasses = {
  xs: "w-8 h-12",
  sm: "w-10 h-14",
  md: "w-20 h-28",
  lg: "w-32 h-44",
  card: "aspect-[2/3] w-full",
};

const iconSizes = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-10 h-10",
  lg: "w-16 h-16",
  card: "w-12 h-12",
};

// Generate a consistent gradient based on title
function getGradientFromTitle(title: string): string {
  const gradients = [
    "from-violet-500/20 via-purple-500/20 to-fuchsia-500/20",
    "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
    "from-emerald-500/20 via-green-500/20 to-lime-500/20",
    "from-amber-500/20 via-orange-500/20 to-red-500/20",
    "from-rose-500/20 via-pink-500/20 to-purple-500/20",
    "from-indigo-500/20 via-blue-500/20 to-cyan-500/20",
    "from-teal-500/20 via-emerald-500/20 to-green-500/20",
    "from-orange-500/20 via-amber-500/20 to-yellow-500/20",
  ];
  const hash = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

export function BookCover({ coverImageR2Key, title, size = "md", className }: BookCoverProps) {
  const { imageUrl, loading } = useImageUrl(coverImageR2Key);
  const isCard = size === "card";

  if (loading) {
    return (
      <div
        className={cn(
          "flex-shrink-0 animate-pulse rounded-lg bg-muted",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (!imageUrl) {
    const gradient = getGradientFromTitle(title);
    return (
      <div
        className={cn(
          "flex flex-shrink-0 flex-col items-center justify-center rounded-lg border border-border/50 bg-gradient-to-br",
          gradient,
          sizeClasses[size],
          isCard && "gap-3 p-4",
          className
        )}
      >
        <BookOpen className={cn("text-muted-foreground/70", iconSizes[size])} />
        {isCard && (
          <span className="line-clamp-3 text-center text-xs font-medium text-muted-foreground/70">
            {title}
          </span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={title}
      className={cn("flex-shrink-0 rounded-lg object-cover", sizeClasses[size], className)}
    />
  );
}
