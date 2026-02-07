"use client";

import { useImageUrl } from "@chaptercheck/shared/hooks/useImageUrl";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";

interface AuthorImageProps {
  imageR2Key?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "card";
  className?: string;
}

const sizeClasses = {
  xs: "w-8 h-8",
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  card: "w-20 h-20 sm:w-24 sm:h-24",
};

const iconSizes = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  card: "w-10 h-10 sm:w-12 sm:h-12",
};

// Generate a consistent gradient based on name
function getGradientFromName(name: string): string {
  const gradients = [
    "from-violet-500/30 via-purple-500/30 to-fuchsia-500/30",
    "from-blue-500/30 via-cyan-500/30 to-teal-500/30",
    "from-emerald-500/30 via-green-500/30 to-lime-500/30",
    "from-amber-500/30 via-orange-500/30 to-red-500/30",
    "from-rose-500/30 via-pink-500/30 to-purple-500/30",
    "from-indigo-500/30 via-blue-500/30 to-cyan-500/30",
    "from-teal-500/30 via-emerald-500/30 to-green-500/30",
    "from-orange-500/30 via-amber-500/30 to-yellow-500/30",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AuthorImage({ imageR2Key, name, size = "md", className }: AuthorImageProps) {
  const { imageUrl, loading } = useImageUrl(imageR2Key);
  const isCard = size === "card";

  if (loading) {
    return (
      <div className={cn("animate-pulse rounded-full bg-muted", sizeClasses[size], className)} />
    );
  }

  if (!imageUrl) {
    const gradient = getGradientFromName(name);
    const initials = getInitials(name);
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full border border-border/50 bg-gradient-to-br",
          gradient,
          sizeClasses[size],
          className
        )}
      >
        {initials ? (
          <span
            className={cn(
              "font-semibold text-muted-foreground/80",
              isCard ? "text-lg sm:text-xl" : size === "lg" ? "text-lg" : "text-sm"
            )}
          >
            {initials}
          </span>
        ) : (
          <User className={cn("text-muted-foreground/70", iconSizes[size])} />
        )}
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
