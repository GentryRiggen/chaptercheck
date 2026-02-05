"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Loader2, MessageSquarePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { type ReviewSortOption } from "@/convex/bookUserData/queries";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<{
    _id: Id<"bookUserData">;
    userName: string;
    reviewText?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<ReviewSortOption>("recent");

  // Get current user's book data for editing
  const myBookData = useQuery(api.bookUserData.queries.getMyBookData, { bookId });

  // Get current user permissions for admin check
  const currentUser = useQuery(api.users.queries.getCurrentUserWithPermissions, {});
  const isAdmin = currentUser?.permissions?.isAdmin ?? false;

  // Admin delete mutation
  const adminDeleteReview = useMutation(api.bookUserData.mutations.adminDeleteReview);

  // Fetch reviews with pagination
  const reviewsResult = useQuery(api.bookUserData.queries.getPublicReviewsForBookPaginated, {
    bookId,
    paginationOpts: { numItems: PAGE_SIZE, cursor: cursor ?? null },
    sortBy,
  });

  // Track the user's reviewedAt to detect when their review is deleted
  const prevReviewedAt = useRef(myBookData?.reviewedAt);

  // Reset cache when user's review is deleted (reviewedAt goes from defined to undefined)
  useEffect(() => {
    const currentReviewedAt = myBookData?.reviewedAt;
    if (prevReviewedAt.current !== undefined && currentReviewedAt === undefined) {
      // Review was deleted - reset the cache
      setCursor(null);
      setAllReviews([]);
    }
    prevReviewedAt.current = currentReviewedAt;
  }, [myBookData?.reviewedAt]);

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

  // Loading states
  const isInitialLoading = reviewsResult === undefined && allReviews.length === 0;
  const isLoadingMore = reviewsResult === undefined && allReviews.length > 0;
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

  // Check if user has any review (rating or text) that should be pinned at top
  const hasOwnReview =
    myBookData?.rating !== undefined ||
    (myBookData?.reviewText && myBookData.reviewText.length > 0);

  const isOwnReviewPrivate = myBookData?.isReviewPrivate ?? false;

  // Check if book is not yet marked as read (show "marking as read" callout)
  const isNotRead = !myBookData?.isRead;

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

  // Reset pagination when sort changes
  const handleSortChange = (value: ReviewSortOption) => {
    setSortBy(value);
    setCursor(null);
    setAllReviews([]);
  };

  const handleDeleteReview = (review: {
    _id: Id<"bookUserData">;
    user: { name?: string } | null;
    reviewText?: string;
  }) => {
    setReviewToDelete({
      _id: review._id,
      userName: review.user?.name ?? "Anonymous",
      reviewText: review.reviewText,
    });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;

    setIsDeleting(true);
    try {
      await adminDeleteReview({ bookUserDataId: reviewToDelete._id });
      toast.success("Review deleted");
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      // Reset pagination to refetch fresh data
      setCursor(null);
      setAllReviews([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review");
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if there are any reviews to show controls for
  const hasAnyReviews = displayReviews.length > 0 || hasOwnReview;

  return (
    <div className="space-y-4">
      {/* Header with Write a Review button and filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Write a Review button - only shown when user has no review */}
        {!hasOwnReview ? (
          <Button
            variant="outline"
            onClick={() => setReviewDialogOpen(true)}
            className="w-full bg-background/50 sm:w-auto"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Write a Review
          </Button>
        ) : (
          <div /> // Spacer when button is hidden
        )}

        {/* Sort control - only shown when there are reviews */}
        {hasAnyReviews && (
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[140px] bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="highest">Highest rated</SelectItem>
              <SelectItem value="lowest">Lowest rated</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Reviews list */}
      {isInitialLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : displayReviews.length === 0 && !hasOwnReview ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pinned: User's own review at the top (private or public) */}
          {hasOwnReview && myBookData && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your Review
              </p>
              <ReviewCard
                review={{
                  _id: myBookData._id,
                  rating: myBookData.rating,
                  reviewText: myBookData.reviewText,
                  reviewedAt: myBookData.reviewedAt,
                  user: {
                    _id: myBookData.userId,
                    name: user
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : undefined,
                    imageUrl: user?.imageUrl,
                  },
                }}
                isOwnReview={true}
                isPrivate={isOwnReviewPrivate}
                onEdit={handleEdit}
              />
            </div>
          )}

          {/* Other reviews - filter out user's own review to avoid duplication */}
          {displayReviews.filter((r) => !r.isOwnReview).length > 0 && (
            <div className="space-y-4">
              {hasOwnReview && (
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Community Reviews
                </p>
              )}
              {displayReviews
                .filter((review) => !review.isOwnReview)
                .map((review) => (
                  <ReviewCard
                    key={review._id}
                    review={review}
                    isOwnReview={false}
                    isAdmin={isAdmin}
                    onDelete={() => handleDeleteReview(review)}
                  />
                ))}
            </div>
          )}

          {/* Load More button */}
          {(hasMore || isLoadingMore) && (
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="w-full bg-background/50"
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <BookReviewDialog
        open={reviewDialogOpen}
        onOpenChange={handleDialogClose}
        bookId={bookId}
        isMarkingAsRead={isNotRead}
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

      {/* Admin Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review?</DialogTitle>
            <DialogDescription>
              This will permanently delete {reviewToDelete?.userName}&apos;s review.
            </DialogDescription>
          </DialogHeader>

          {reviewToDelete?.reviewText && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Review preview</p>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {reviewToDelete.reviewText}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
