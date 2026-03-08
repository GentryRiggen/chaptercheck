"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { BookmarkCheck, BookmarkPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface WantToReadButtonProps {
  bookId: Id<"books">;
}

export function WantToReadButton({ bookId }: WantToReadButtonProps) {
  const status = useQuery(api.shelves.queries.getWantToReadStatus, { bookId });
  const toggleWantToRead = useMutation(api.shelves.mutations.toggleWantToRead);
  const [isPending, setIsPending] = useState(false);

  const isOnWantToRead = status?.isOnWantToRead ?? false;

  const handleClick = async () => {
    setIsPending(true);
    try {
      const result = await toggleWantToRead({ bookId });
      toast.success(result.isOnWantToRead ? "Added to Want to Read" : "Removed from Want to Read");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update Want to Read");
    } finally {
      setIsPending(false);
    }
  };

  if (status === undefined) {
    return (
      <Button variant="outline" size="sm" disabled className="rounded-full">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return (
    <Button
      variant={isOnWantToRead ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isOnWantToRead ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <BookmarkPlus className="h-4 w-4" />
      )}
      {isOnWantToRead ? "Want to Read" : "Add to Want to Read"}
    </Button>
  );
}
