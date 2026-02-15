"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { BookOpen, Lock } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/BookCover";
import { cn } from "@/lib/utils";

interface ShelfCardProps {
  shelf: {
    _id: Id<"shelves">;
    name: string;
    description?: string;
    isPublic: boolean;
    isOrdered: boolean;
    bookCount: number;
    previewBooks: Array<{
      _id: Id<"books">;
      title: string;
      coverImageR2Key?: string;
    }>;
  };
  className?: string;
}

export function ShelfCard({ shelf, className }: ShelfCardProps) {
  return (
    <Link
      href={`/shelves/${shelf._id}`}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card/50 p-4 shadow-sm ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/30",
        className
      )}
    >
      {/* Cover stack preview */}
      <div className="relative mb-3 h-24 sm:h-28">
        {shelf.previewBooks.length > 0 ? (
          <div className="flex gap-1.5">
            {shelf.previewBooks.slice(0, 4).map((book, i) => (
              <div
                key={book._id}
                className={cn(
                  "flex-shrink-0 overflow-hidden rounded-md shadow-sm",
                  i >= 2 && "hidden sm:block"
                )}
              >
                <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/30">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <h3 className="line-clamp-1 text-sm font-semibold">{shelf.name}</h3>
          {!shelf.isPublic && <Lock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {shelf.bookCount} book{shelf.bookCount !== 1 ? "s" : ""}
          {shelf.isOrdered ? " (ordered)" : ""}
        </p>
      </div>
    </Link>
  );
}
