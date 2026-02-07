"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useQuery } from "convex/react";

import { StarRating } from "./StarRating";

interface BookRatingStatsProps {
  bookId: Id<"books">;
  onClick?: () => void;
}

export function BookRatingStats({ bookId, onClick }: BookRatingStatsProps) {
  const stats = useQuery(api.bookUserData.queries.getBookRatingStats, { bookId });

  if (stats === undefined) {
    return <div className="h-6 w-32 animate-pulse rounded bg-muted" />;
  }

  if (stats.averageRating === null && stats.reviewCount === 0) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick?.()}
        className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <StarRating value={0} readonly size="sm" />
        <span>No reviews yet</span>
      </div>
    );
  }

  const averageDisplay = stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—";
  const reviewText = stats.reviewCount === 1 ? "review" : "reviews";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="flex cursor-pointer items-center gap-2 text-sm hover:opacity-80"
    >
      <StarRating value={Math.round(stats.averageRating ?? 0)} readonly size="sm" />
      <span className="text-muted-foreground">
        {averageDisplay} avg · {stats.reviewCount} {reviewText}
      </span>
    </div>
  );
}
