"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Plus, Search } from "lucide-react";
import { useState } from "react";

import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";

interface AddBooksToShelfDialogProps {
  shelfId: Id<"shelves">;
  existingBookIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBooksToShelfDialog({
  shelfId,
  existingBookIds,
  open,
  onOpenChange,
}: AddBooksToShelfDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const searchResults = useQuery(
    api.books.queries.searchBooks,
    debouncedSearch.trim().length > 0 ? { search: debouncedSearch.trim() } : "skip"
  );

  const addBook = useMutation(api.shelves.mutations.addBookToShelf);
  const removeBook = useMutation(api.shelves.mutations.removeBookFromShelf);

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const handleToggle = async (bookId: Id<"books">) => {
    setPendingIds((prev) => new Set(prev).add(bookId));
    try {
      if (existingBookIds.has(bookId)) {
        await removeBook({ shelfId, bookId });
      } else {
        await addBook({ shelfId, bookId });
      }
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Books</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {!debouncedSearch.trim() ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Search for books to add to this shelf
            </p>
          ) : searchResults === undefined ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Searching...</p>
          ) : searchResults.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No books found</p>
          ) : (
            <div className="space-y-1">
              {searchResults.map((book) => {
                const isInShelf = existingBookIds.has(book._id);
                const isPending = pendingIds.has(book._id);

                return (
                  <button
                    key={book._id}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                    onClick={() => handleToggle(book._id)}
                    disabled={isPending}
                  >
                    <BookCover
                      coverImageR2Key={book.coverImageR2Key}
                      title={book.title}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{book.title}</p>
                      {book.authors && book.authors.length > 0 && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {book.authors.map((a) => a.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {isInShelf ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
