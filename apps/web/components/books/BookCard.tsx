"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { BookCover } from "./BookCover";
import { StarRating } from "./StarRating";

interface BookCardProps {
  book: {
    _id: Id<"books">;
    title: string;
    coverImageR2Key?: string;
    seriesOrder?: number;
    averageRating?: number;
    ratingCount?: number;
    authors?: Array<{ _id: Id<"authors">; name: string }>;
    series?: { _id: Id<"series">; name: string } | null;
  };
  /** Variant for different display contexts */
  variant?: "default" | "compact";
  className?: string;
}

export function BookCard({ book, variant = "default", className }: BookCardProps) {
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/books/${book._id}`}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card/50 p-3 shadow-sm ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/30",
        className
      )}
    >
      <div className="relative mb-3 overflow-hidden rounded-lg">
        <BookCover
          coverImageR2Key={book.coverImageR2Key}
          title={book.title}
          size="card"
          className="transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
      <div className="space-y-1">
        <h2
          className={cn(
            "line-clamp-2 font-semibold leading-tight text-foreground",
            isCompact ? "text-xs" : "text-sm"
          )}
        >
          {book.title}
        </h2>
        {book.authors && book.authors.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {book.authors.map((a) => a.name).join(", ")}
          </p>
        )}
        {book.series && (
          <p className="line-clamp-1 text-[10px] italic text-primary/80">
            {book.series.name}
            {book.seriesOrder !== undefined && ` #${book.seriesOrder}`}
          </p>
        )}
        {book.averageRating !== undefined &&
          book.ratingCount !== undefined &&
          book.ratingCount > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <StarRating value={Math.round(book.averageRating)} readonly size="xs" />
              <span className="text-[10px] text-muted-foreground">({book.ratingCount})</span>
            </div>
          )}
      </div>
    </Link>
  );
}
