"use client";

import Link from "next/link";

import { type Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

import { AuthorImage } from "./AuthorImage";

interface AuthorCardProps {
  author: {
    _id: Id<"authors">;
    name: string;
    imageR2Key?: string;
    bookCount?: number;
    seriesCount?: number;
  };
  /** Variant for different display contexts */
  variant?: "default" | "compact";
  className?: string;
}

export function AuthorCard({ author, variant = "default", className }: AuthorCardProps) {
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/authors/${author._id}`}
      className={cn(
        "group relative flex flex-col items-center overflow-hidden rounded-xl bg-card/50 p-4 shadow-sm ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/30",
        className
      )}
    >
      <div className="relative mb-3">
        <AuthorImage
          imageR2Key={author.imageR2Key}
          name={author.name}
          size="card"
          className="ring-2 ring-border/30 transition-all duration-300 group-hover:scale-105 group-hover:ring-primary/50"
        />
      </div>
      <h2
        className={cn(
          "line-clamp-2 text-center font-semibold leading-tight text-foreground",
          isCompact ? "text-xs" : "text-sm"
        )}
      >
        {author.name}
      </h2>
      {(author.bookCount !== undefined || author.seriesCount !== undefined) && (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {author.bookCount !== undefined && (
            <>
              {author.bookCount} book{author.bookCount !== 1 ? "s" : ""}
            </>
          )}
          {author.seriesCount !== undefined && author.seriesCount > 0 && (
            <> · {author.seriesCount} series</>
          )}
        </p>
      )}
    </Link>
  );
}
