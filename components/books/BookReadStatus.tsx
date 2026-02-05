"use client";

import { useMutation, useQuery } from "convex/react";
import { BookCheck, Check, Lock, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BookReviewDialog } from "@/components/books/BookReviewDialog";
import { StarRating } from "@/components/books/StarRating";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface BookReadStatusProps {
  bookId: Id<"books">;
}

export function BookReadStatus({ bookId }: BookReadStatusProps) {
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
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

  const handleUnmarkAsRead = async () => {
    setIsUnmarking(true);
    try {
      await markAsRead({ bookId });
      toast.success("Unmarked as read");
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
  return (
    <>
      <div className="flex items-center gap-2">
        {/* Completed badge - clickable to unmark */}
        <Button
          variant="delicious"
          size="sm"
          onClick={handleUnmarkAsRead}
          disabled={isUnmarking}
          title="Click to unmark as read"
          className={cn("rounded-full", justMarked && "animate-bounce")}
        >
          <Check className={cn("h-4 w-4", isUnmarking && "animate-pulse")} />
          {isUnmarking ? "..." : "Read"}
          {isPrivate && !isUnmarking && <Lock className="h-3 w-3 opacity-80" />}
        </Button>

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
    </>
  );
}
