"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { Calendar, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "../ui/button";
import { BookCover } from "./BookCover";
import { BookReviewDialog } from "./BookReviewDialog";
import { StarRating } from "./StarRating";

interface LibraryBookCardProps {
  book: {
    _id: Id<"books">;
    title: string;
    coverImageR2Key?: string;
    authors?: Array<{ _id: Id<"authors">; name: string }>;
    series?: { _id: Id<"series">; name: string } | null;
    seriesOrder?: number;
    averageRating?: number;
    ratingCount?: number;
    readAt?: number;
    userRating?: number;
    userReviewText?: string;
    isReviewPrivate?: boolean;
    isReadPrivate?: boolean;
  };
  isOwnProfile: boolean;
  className?: string;
}

export function LibraryBookCard({ book, isOwnProfile, className }: LibraryBookCardProps) {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const hasRating = book.userRating !== undefined;
  const hasReview = !!book.userReviewText;
  const hasRatingOrReview = hasRating || hasReview;
  const hasAvgRating =
    book.averageRating !== undefined && book.ratingCount !== undefined && book.ratingCount > 0;

  return (
    <>
      <div
        className={cn(
          "group flex flex-col overflow-hidden rounded-xl bg-card/50 shadow-sm ring-1 ring-border/50 transition-all duration-300 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/30",
          className
        )}
      >
        {/* === Book Details Section === */}
        <Link href={`/books/${book._id}`} className="block p-3 pb-2">
          {/* Cover */}
          <div className="relative mb-3 overflow-hidden rounded-lg">
            <BookCover
              coverImageR2Key={book.coverImageR2Key}
              title={book.title}
              size="card"
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>

          {/* Title & Authors */}
          <h2 className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
            {book.title}
          </h2>

          {book.authors && book.authors.length > 0 && (
            <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">
              {book.authors.map((a) => a.name).join(", ")}
            </p>
          )}

          {/* Series info */}
          {book.series && (
            <p className="mt-0.5 line-clamp-1 text-[10px] italic text-primary/80">
              {book.series.name}
              {book.seriesOrder !== undefined && ` #${book.seriesOrder}`}
            </p>
          )}

          {/* Average rating */}
          {hasAvgRating && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <StarRating value={Math.round(book.averageRating!)} readonly size="xs" />
              <span className="text-[10px] text-muted-foreground">({book.ratingCount})</span>
            </div>
          )}
        </Link>

        {/* === Your Reading Section === */}
        <div className="mt-auto border-t border-border/50 bg-muted/30 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              {isOwnProfile ? "Your Reading" : "Their Reading"}
            </span>
            {isOwnProfile && hasRatingOrReview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setReviewDialogOpen(true);
                }}
                className="h-5 gap-0.5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-2.5 w-2.5" />
                Edit
              </Button>
            )}
          </div>

          {/* Read date */}
          {book.readAt && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Read {formatRelativeDate(book.readAt)}</span>
            </div>
          )}

          {/* User's rating */}
          {hasRating && (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Rated:</span>
              <StarRating value={book.userRating ?? 0} readonly size="xs" />
            </div>
          )}

          {/* User's review preview */}
          {hasReview && (
            <p className="mt-1 line-clamp-2 text-[10px] italic text-muted-foreground">
              &ldquo;{book.userReviewText}&rdquo;
            </p>
          )}

          {/* Add review button - only for own profile without rating/review */}
          {isOwnProfile && !hasRatingOrReview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setReviewDialogOpen(true);
              }}
              className="mt-1 h-6 w-full gap-1 rounded-md px-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add Rating
            </Button>
          )}
        </div>
      </div>

      {/* Review dialog */}
      {isOwnProfile && (
        <BookReviewDialog
          bookId={book._id}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          initialData={
            hasRatingOrReview
              ? {
                  rating: book.userRating,
                  reviewText: book.userReviewText,
                  isReadPrivate: book.isReadPrivate ?? false,
                  isReviewPrivate: book.isReviewPrivate ?? false,
                }
              : undefined
          }
        />
      )}
    </>
  );
}
