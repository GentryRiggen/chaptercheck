"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { BookmarkPlus, Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { ShelfDialog } from "./ShelfDialog";

interface AddToShelfPopoverProps {
  bookId: Id<"books">;
}

export function AddToShelfPopover({ bookId }: AddToShelfPopoverProps) {
  const shelves = useQuery(api.shelves.queries.getMyShelvesForBook, { bookId });
  const addBook = useMutation(api.shelves.mutations.addBookToShelf);
  const removeBook = useMutation(api.shelves.mutations.removeBookFromShelf);

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const handleToggle = async (shelfId: Id<"shelves">, containsBook: boolean) => {
    setPendingIds((prev) => new Set(prev).add(shelfId));
    try {
      if (containsBook) {
        await removeBook({ shelfId, bookId });
      } else {
        await addBook({ shelfId, bookId });
      }
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(shelfId);
        return next;
      });
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <BookmarkPlus className="mr-2 h-4 w-4" />
            Shelves
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          {shelves === undefined ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : shelves.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">No shelves yet</p>
          ) : (
            <div className="max-h-48 space-y-0.5 overflow-y-auto">
              {shelves.map((shelf) => {
                const isPending = pendingIds.has(shelf._id);
                return (
                  <button
                    key={shelf._id}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
                    onClick={() => handleToggle(shelf._id, shelf.containsBook)}
                    disabled={isPending}
                  >
                    <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : shelf.containsBook ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : null}
                    </div>
                    <span className="line-clamp-1 flex-1">{shelf.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-1 border-t border-border/50 pt-1">
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create new shelf
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ShelfDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
