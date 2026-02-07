"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, BookCheck, Check, EyeOff, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BookReviewDialog } from "@/components/books/BookReviewDialog";
import { StarRating } from "@/components/books/StarRating";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BookReadStatusProps {
  bookId: Id<"books">;
}

export function BookReadStatus({ bookId }: BookReadStatusProps) {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [unmarkDialogOpen, setUnmarkDialogOpen] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [isUnmarking, setIsUnmarking] = useState(false);
  const [justMarked, setJustMarked] = useState(false);

  const bookUserData = useQuery(api.bookUserData.queries.getMyBookData, { bookId });
  const markAsRead = useMutation(api.bookUserData.mutations.markAsRead);

  // Open the review dialog to mark as read (with optional rating/review)
  const handleOpenMarkAsRead = () => {
    setIsMarkingAsRead(true);
    setReviewDialogOpen(true);
  };

  // When dialog closes after marking as read, show celebration
  const handleDialogClose = (open: boolean) => {
    if (!open && isMarkingAsRead) {
      // Dialog was closed from "mark as read" mode - celebrate!
      // The query will update shortly and show the "Read" badge with bounce
      setJustMarked(true);
      setTimeout(() => setJustMarked(false), 1500);
      setIsMarkingAsRead(false);
    }
    setReviewDialogOpen(open);
  };

  const handleConfirmUnmark = async () => {
    setIsUnmarking(true);
    try {
      await markAsRead({ bookId });
      toast.success("Unmarked as read");
      setUnmarkDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsUnmarking(false);
    }
  };

  // Loading state
  if (bookUserData === undefined) {
    return <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />;
  }

  const isRead = bookUserData?.isRead ?? false;
  const hasRating = bookUserData?.rating !== undefined;
  const hasReview = !!bookUserData?.reviewText;
  const hasRatingOrReview = hasRating || hasReview;
  const isPrivate = bookUserData?.isReadPrivate ?? false;

  // Not read state - show delightful "Mark as Read" button
  if (!isRead) {
    return (
      <>
        <Button variant="delicious" onClick={handleOpenMarkAsRead} className="rounded-full">
          <BookCheck className="h-4 w-4" />
          Mark as Read
        </Button>

        <BookReviewDialog
          bookId={bookId}
          open={reviewDialogOpen}
          onOpenChange={handleDialogClose}
          isMarkingAsRead
        />
      </>
    );
  }

  // Read state - show completed badge with options
  const ReadButton = (
    <Button
      variant="delicious"
      size="sm"
      onClick={() => setUnmarkDialogOpen(true)}
      disabled={isUnmarking}
      className={cn("rounded-full", justMarked && "animate-pulse")}
    >
      <Check className={cn("h-4 w-4", isUnmarking && "animate-pulse")} />
      {isUnmarking ? "..." : "Read"}
      {isPrivate && !isUnmarking && <EyeOff className="h-3 w-3 opacity-80" />}
    </Button>
  );

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Completed badge - clickable to unmark */}
        {isPrivate ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{ReadButton}</TooltipTrigger>
              <TooltipContent className="flex items-center gap-2 bg-muted text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5" />
                <span>Only you can see that you&apos;ve read this</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          ReadButton
        )}

        {/* Rating display or add rating button */}
        {hasRating ? (
          <div className="flex items-center gap-1.5">
            <StarRating value={bookUserData.rating ?? 0} readonly size="sm" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsMarkingAsRead(false);
                setReviewDialogOpen(true);
              }}
              className="h-7 gap-1 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsMarkingAsRead(false);
              setReviewDialogOpen(true);
            }}
            className="h-7 gap-1 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Rate
          </Button>
        )}
      </div>

      <BookReviewDialog
        bookId={bookId}
        open={reviewDialogOpen}
        onOpenChange={handleDialogClose}
        isMarkingAsRead={isMarkingAsRead}
        initialData={bookUserData ?? undefined}
      />

      {/* Unmark confirmation dialog */}
      <Dialog open={unmarkDialogOpen} onOpenChange={setUnmarkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unmark as Read?</DialogTitle>
            <DialogDescription>
              This will remove this book from your reading history.
            </DialogDescription>
          </DialogHeader>

          {hasRatingOrReview && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">
                  Your rating and review will be permanently deleted
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasRating && hasReview
                    ? "Your star rating and written review will be lost."
                    : hasRating
                      ? "Your star rating will be lost."
                      : "Your written review will be lost."}{" "}
                  This action cannot be undone.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUnmarkDialogOpen(false)}
              disabled={isUnmarking}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmUnmark} disabled={isUnmarking}>
              {isUnmarking ? "Removing..." : "Unmark as Read"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
