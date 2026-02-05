"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";

import { BookReviewDialog } from "./BookReviewDialog";
import { ReviewCard } from "./ReviewCard";

const PAGE_SIZE = 10;

interface ReviewsListProps {
  bookId: Id<"books">;
}

export function ReviewsList({ bookId }: ReviewsListProps) {
  const { user } = useUser();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [allReviews, setAllReviews] = useState<
    Array<{
      _id: Id<"bookUserData">;
      rating?: number;
      reviewText?: string;
      reviewedAt?: number;
      isOwnReview: boolean;
      user: { _id: Id<"users">; name?: string; imageUrl?: string } | null;
    }>
  >([]);

  // Get current user's book data for editing
  const myBookData = useQuery(api.bookUserData.queries.getMyBookData, { bookId });

  // Fetch reviews with pagination
  const reviewsResult = useQuery(api.bookUserData.queries.getPublicReviewsForBookPaginated, {
    bookId,
    paginationOpts: { numItems: PAGE_SIZE, cursor: cursor ?? null },
  });

  // Initial load: set reviews when first page arrives
  const isInitialLoad = cursor === null && reviewsResult !== undefined;
  if (isInitialLoad && allReviews.length === 0 && reviewsResult.page.length > 0) {
    setAllReviews(reviewsResult.page);
  }

  const handleLoadMore = () => {
    if (reviewsResult?.continueCursor) {
      // Append current page to allReviews before moving to next cursor
      setAllReviews((prev) => {
        // Check if we already have these reviews to avoid duplicates
        const existingIds = new Set(prev.map((r) => r._id));
        const newReviews = reviewsResult.page.filter((r) => !existingIds.has(r._id));
        return [...prev, ...newReviews];
      });
      setCursor(reviewsResult.continueCursor);
    }
  };

  // Show loading state
  const isLoading = reviewsResult === undefined;
  const hasMore = reviewsResult ? !reviewsResult.isDone : false;

  // Combine accumulated reviews with current page (for last page after load more)
  const displayReviews =
    cursor !== null && reviewsResult
      ? (() => {
          const existingIds = new Set(allReviews.map((r) => r._id));
          const newReviews = reviewsResult.page.filter((r) => !existingIds.has(r._id));
          return [...allReviews, ...newReviews];
        })()
      : allReviews.length > 0
        ? allReviews
        : (reviewsResult?.page ?? []);

  // Check if user has a private review that should be shown
  const hasPrivateReview =
    myBookData?.isReviewPrivate && (myBookData.rating !== undefined || myBookData.reviewText);

  const handleEdit = () => {
    setReviewDialogOpen(true);
  };

  // Reset and refetch when dialog closes (to pick up changes)
  const handleDialogClose = (open: boolean) => {
    setReviewDialogOpen(open);
    if (!open) {
      // Reset pagination to refetch fresh data
      setCursor(null);
      setAllReviews([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Write a Review button */}
      <Button
        variant="outline"
        onClick={() => setReviewDialogOpen(true)}
        className="w-full sm:w-auto"
      >
        <MessageSquarePlus className="mr-2 h-4 w-4" />
        Write a Review
      </Button>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : displayReviews.length === 0 && !hasPrivateReview ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Show user's private review at the top */}
          {hasPrivateReview && myBookData && (
            <ReviewCard
              review={{
                _id: myBookData._id,
                rating: myBookData.rating,
                reviewText: myBookData.reviewText,
                reviewedAt: myBookData.reviewedAt,
                user: {
                  _id: myBookData.userId,
                  name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : undefined,
                  imageUrl: user?.imageUrl,
                },
              }}
              isOwnReview={true}
              isPrivate={true}
              onEdit={handleEdit}
            />
          )}

          {/* Public reviews */}
          {displayReviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              isOwnReview={review.isOwnReview}
              onEdit={review.isOwnReview ? handleEdit : undefined}
            />
          ))}

          {/* Load More button */}
          {hasMore && (
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="w-full"
              disabled={isLoading}
            >
              Load More
            </Button>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <BookReviewDialog
        open={reviewDialogOpen}
        onOpenChange={handleDialogClose}
        bookId={bookId}
        initialData={
          myBookData
            ? {
                rating: myBookData.rating,
                reviewText: myBookData.reviewText,
                isReadPrivate: myBookData.isReadPrivate,
                isReviewPrivate: myBookData.isReviewPrivate,
              }
            : undefined
        }
      />
    </div>
  );
}
