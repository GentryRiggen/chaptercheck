"use client";

import { EyeOff, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { type Id } from "@/convex/_generated/dataModel";
import { cn, formatRelativeDate } from "@/lib/utils";

import { StarRating } from "./StarRating";

interface ReviewCardProps {
  review: {
    _id: Id<"bookUserData">;
    rating?: number;
    reviewText?: string;
    reviewedAt?: number;
    user: {
      _id: Id<"users">;
      name?: string;
      imageUrl?: string;
    } | null;
  };
  isOwnReview: boolean;
  isPrivate?: boolean;
  onEdit?: () => void;
  isAdmin?: boolean;
  onDelete?: () => void;
}

export function ReviewCard({
  review,
  isOwnReview,
  isPrivate,
  onEdit,
  isAdmin,
  onDelete,
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const userName = review.user?.name || "Anonymous";
  const userImage = review.user?.imageUrl;
  const reviewDate = review.reviewedAt ? formatRelativeDate(review.reviewedAt) : null;

  // Check if text is long enough to need truncation (rough estimate: >100 chars)
  const needsTruncation = review.reviewText && review.reviewText.length > 100;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-card/25 p-4 backdrop-blur-sm",
        isOwnReview && "border-primary/30 bg-primary/5",
        isPrivate && "border-dashed border-muted-foreground/30 bg-muted/20"
      )}
    >
      {/* Private indicator */}
      {isPrivate && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <EyeOff className="h-3.5 w-3.5" />
          <span>Only visible to you — this review is private</span>
        </div>
      )}

      {/* Header: Avatar, name, stars, date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={userName} imageUrl={userImage} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{userName}</span>
              {isOwnReview && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {review.rating !== undefined && (
                <StarRating value={review.rating} readonly size="sm" />
              )}
              {reviewDate && <span>{reviewDate}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isOwnReview && onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2">
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
          {isAdmin && !isOwnReview && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Review text */}
      {review.reviewText && (
        <div className="mt-3">
          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-relaxed",
              !isExpanded && needsTruncation && "line-clamp-2"
            )}
          >
            {review.reviewText}
          </p>
          {needsTruncation && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
