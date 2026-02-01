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
      <defs>
        <linearGradient id="logoBookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#ff0099" />
        </linearGradient>
        <linearGradient id="logoCheckGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff0099" />
          <stop offset="100%" stopColor="#00e5ff" />
        </linearGradient>
      </defs>

      {/* Background circle - optional */}
      {showBackground && (
        <circle cx="256" cy="256" r="240" className="fill-[#0a0a0a] dark:fill-[#0a0a0a]" />
      )}

      {/* Open book shape */}
      <g transform="translate(256, 280)">
        {/* Left page */}
        <path
          d="M-20,-100 Q-120,-110 -140,-20 L-140,80 Q-120,70 -20,80 Z"
          fill="url(#logoBookGradient)"
          opacity="0.9"
        />
        {/* Right page */}
        <path
          d="M20,-100 Q120,-110 140,-20 L140,80 Q120,70 20,80 Z"
          fill="url(#logoBookGradient)"
          opacity="0.7"
        />
        {/* Spine - uses theme-aware color */}
        <path
          d="M-20,-100 L-20,80 L20,80 L20,-100 Q0,-90 -20,-100"
          className="fill-background"
        />
        {/* Page lines left - only show with background */}
        {showBackground && (
          <>
            <line x1="-110" y1="0" x2="-40" y2="5" stroke="#0a0a0a" strokeWidth="3" opacity="0.3" />
            <line x1="-110" y1="25" x2="-40" y2="30" stroke="#0a0a0a" strokeWidth="3" opacity="0.3" />
            <line x1="-110" y1="50" x2="-40" y2="55" stroke="#0a0a0a" strokeWidth="3" opacity="0.3" />
          </>
        )}
      </g>

      {/* Checkmark */}
      <path
        d="M340,160 L380,200 L440,120"
        fill="none"
        stroke="url(#logoCheckGradient)"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
