"use client";

import { useMutation } from "convex/react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import Link from "next/link";

import { BookCard } from "@/components/books/BookCard";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";

interface ShelfBook {
  _id: Id<"books">;
  title: string;
  coverImageR2Key?: string;
  seriesOrder?: number;
  averageRating?: number;
  ratingCount?: number;
  shelfBookId: Id<"shelfBooks">;
  position?: number;
  authors: Array<{ _id: Id<"authors">; name: string; role?: string | null }>;
  series?: { _id: Id<"series">; name: string } | null;
}

interface ShelfBookListProps {
  shelfId: Id<"shelves">;
  books: ShelfBook[];
  isOrdered: boolean;
  isOwner: boolean;
}

export function ShelfBookList({ shelfId, books, isOrdered, isOwner }: ShelfBookListProps) {
  const removeBook = useMutation(api.shelves.mutations.removeBookFromShelf);
  const reorderBooks = useMutation(api.shelves.mutations.reorderShelfBooks);

  const handleRemove = async (bookId: Id<"books">) => {
    await removeBook({ shelfId, bookId });
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...books.map((b) => b._id)];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderBooks({ shelfId, bookIds: newOrder });
  };

  const handleMoveDown = async (index: number) => {
    if (index === books.length - 1) return;
    const newOrder = [...books.map((b) => b._id)];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderBooks({ shelfId, bookIds: newOrder });
  };

  if (isOrdered) {
    return (
      <div className="space-y-2">
        {books.map((book, index) => (
          <div
            key={book._id}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3"
          >
            <span className="w-8 flex-shrink-0 text-center text-lg font-bold text-muted-foreground">
              {index + 1}
            </span>
            <Link href={`/books/${book._id}`} className="flex-shrink-0">
              <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="xs" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/books/${book._id}`}
                className="line-clamp-1 text-sm font-semibold hover:underline"
              >
                {book.title}
              </Link>
              {book.authors.length > 0 && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {book.authors.map((a) => a.name).join(", ")}
                </p>
              )}
            </div>
            {isOwner && (
              <div className="flex flex-shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === books.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(book._id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Unordered: card grid
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {books.map((book) => (
        <div key={book._id} className="relative">
          <BookCard book={book} />
          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6 rounded-full bg-background/80 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleRemove(book._id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
