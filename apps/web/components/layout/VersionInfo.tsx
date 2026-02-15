"use client";

import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const GIT_HASH = process.env.NEXT_PUBLIC_GIT_HASH ?? "dev";
const DEPLOY_DATE = process.env.NEXT_PUBLIC_DEPLOY_DATE ?? new Date().toISOString();

export function getVersionString(): string {
  const shortHash = GIT_HASH.substring(0, 7);
  const date = new Date(DEPLOY_DATE);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `v ${shortHash} · ${formattedDate}`;
}

export function getGitHash(): string {
  return GIT_HASH;
}

export function getDeployDate(): string {
  return DEPLOY_DATE;
}

interface VersionInfoProps {
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
}

export const VersionInfo = forwardRef<HTMLButtonElement, VersionInfoProps>(function VersionInfo(
  { onClick, className },
  ref
) {
  const versionString = getVersionString();

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-2 py-1.5 text-center text-xs text-muted-foreground/60",
        "transition-colors hover:text-muted-foreground",
        onClick && "cursor-pointer",
        !onClick && "cursor-default",
        className
      )}
    >
      {versionString}
    </button>
  );
});
