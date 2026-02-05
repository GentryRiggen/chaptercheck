"use client";

import { EyeOff, Pencil } from "lucide-react";

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
}

export function ReviewCard({ review, isOwnReview, isPrivate, onEdit }: ReviewCardProps) {
  const userName = review.user?.name || "Anonymous";
  const userImage = review.user?.imageUrl;
  const reviewDate = review.reviewedAt ? formatRelativeDate(review.reviewedAt) : null;

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

        {isOwnReview && onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2">
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        )}
      </div>

      {/* Review text */}
      {review.reviewText && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{review.reviewText}</p>
      )}
    </div>
  );
}
