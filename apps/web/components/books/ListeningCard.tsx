"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { BookCover } from "./BookCover";

interface ListeningCardProps {
  bookId: Id<"books">;
  book: {
    title: string;
    coverImageR2Key?: string;
    seriesOrder?: number;
    authors: Array<{ _id: Id<"authors">; name: string }>;
    series: { _id: Id<"series">; name: string } | null;
  };
  audioFile: {
    partNumber?: number;
  };
  progressFraction: number;
  totalParts: number;
  lastListenedAt: number;
  className?: string;
}

export function ListeningCard({
  bookId,
  book,
  audioFile,
  progressFraction,
  totalParts,
  lastListenedAt,
  className,
}: ListeningCardProps) {
  return (
    <Link
      href={`/books/${bookId}`}
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

        {/* Progress bar overlay at bottom of cover */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-muted/60">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(progressFraction * 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
          {book.title}
        </h2>
        {book.authors.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {book.authors.map((a) => a.name).join(", ")}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {totalParts > 1 && audioFile.partNumber && (
            <span className="text-primary/80">Part {audioFile.partNumber}</span>
          )}
          {totalParts > 1 && audioFile.partNumber && <span>·</span>}
          <span>{formatRelativeDate(lastListenedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
