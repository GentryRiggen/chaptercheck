"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const sizePx = {
  sm: 24,
  md: 32,
  lg: 40,
};

export function UserAvatar({ name, imageUrl, size = "md", className }: UserAvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name || "User avatar"}
        width={sizePx[size]}
        height={sizePx[size]}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
        unoptimized
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 font-medium text-primary-foreground",
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
