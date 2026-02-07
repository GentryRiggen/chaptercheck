"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export function Logo({ size = 32, className, showBackground = false }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={cn("flex-shrink-0", className)}
    >
      {showBackground && <rect width="512" height="512" rx="112" fill="#374151" />}

      {/* Rounded bookmark */}
      <path
        d="M164,120 Q164,84 200,84 L312,84 Q348,84 348,120 L348,396 L256,336 L164,396 Z"
        fill="none"
        stroke="#8BA78B"
        strokeWidth="27.5"
        strokeLinejoin="round"
      />

      {/* Checkmark */}
      <path
        d="M198,252 L246,300 L320,214"
        fill="none"
        stroke="#6B8E6B"
        strokeWidth="33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
