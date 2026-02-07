"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, GripVertical, Library } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SeriesDetailPage({
  params,
}: {
  params: Promise<{ seriesId: Id<"series"> }>;
}) {
  const [seriesId, setSeriesId] = useState<Id<"series"> | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const searchParams = useSearchParams();
  const fromBook = searchParams.get("fromBook");

  const reorderBooks = useMutation(api.series.mutations.reorderBooks);

  useEffect(() => {
    params.then((p) => setSeriesId(p.seriesId));
  }, [params]);

  const series = useQuery(api.series.queries.getSeries, seriesId ? { seriesId } : "skip");
  const books = useQuery(
    api.series.queries.getBooksInSeriesWithAuthors,
    seriesId ? { seriesId } : "skip"
  );

  usePageTitle(series?.name || null);

  const handleMoveUp = async (index: number) => {
    if (!books || !seriesId || index === 0) return;
    const newOrder = [...books];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderBooks({
      seriesId,
      bookIds: newOrder.map((b) => b._id),
    });
  };

  const handleMoveDown = async (index: number) => {
    if (!books || !seriesId || index === books.length - 1) return;
    const newOrder = [...books];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderBooks({
      seriesId,
      bookIds: newOrder.map((b) => b._id),
    });
  };

  if (series === undefined || seriesId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (series === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Series not found</p>
          <Link
            href={fromBook ? `/books/${fromBook}` : "/books"}
            className="text-primary hover:underline"
          >
            {fromBook ? "Back to Book" : "Back to Books"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
        {/* Back link */}
        <Link
          href={fromBook ? `/books/${fromBook}` : "/books"}
          className="mb-4 inline-block text-sm text-primary hover:underline"
        >
          &larr; {fromBook ? "Back to Book" : "Back to Books"}
        </Link>

        {/* Hero section */}
        <div className="mb-6 flex gap-4 sm:gap-6">
          {/* Series icon */}
          <div className="flex-shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10 sm:h-28 sm:w-28 md:h-32 md:w-32">
              <Library className="h-10 w-10 text-primary sm:h-14 sm:w-14 md:h-16 md:w-16" />
            </div>
          </div>

          {/* Series info */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight sm:text-2xl md:text-3xl">
              {series.name}
            </h1>

            {books && books.length > 0 && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {books.length} book{books.length !== 1 ? "s" : ""}
                </p>
                {(() => {
                  // Get unique authors across all books
                  const uniqueAuthors = Array.from(
                    new Map(
                      books
                        .flatMap((book) => book.authors || [])
                        .map((author) => [author._id, author])
                    ).values()
                  );
                  if (uniqueAuthors.length === 0) return null;
                  return (
                    <p className="mt-1 text-sm text-muted-foreground">
                      by{" "}
                      {uniqueAuthors.map((author, index) => (
                        <span key={author._id}>
                          {index > 0 && ", "}
                          <Link
                            href={`/authors/${author._id}`}
                            className="text-primary hover:underline"
                          >
                            {author.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {series.description && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              About
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
              {series.description}
            </p>
          </div>
        )}

        {/* Books */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Books in Series
            </h2>
            {books && books.length > 1 && (
              <Button
                variant={isReordering ? "default" : "outline"}
                size="sm"
                onClick={() => setIsReordering(!isReordering)}
              >
                <GripVertical className="mr-1 h-4 w-4" />
                {isReordering ? "Done" : "Reorder"}
              </Button>
            )}
          </div>
          {books === undefined ? (
            <p className="text-sm text-muted-foreground">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books in this series yet</p>
          ) : (
            <div className="divide-y divide-border/50 rounded-lg bg-card/60">
              {books.map((book, index) => (
                <div key={book._id} className="flex items-center gap-2 px-3 py-3">
                  {isReordering && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="rounded p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === books.length - 1}
                        className="rounded p-1 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <Link
                    href={`/books/${book._id}`}
                    className="-my-3 -mr-3 flex flex-1 items-start gap-3 rounded-r-lg py-3 pr-3 transition-colors hover:bg-muted/50"
                  >
                    <BookCover
                      coverImageR2Key={book.coverImageR2Key}
                      title={book.title}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                          #{index + 1}
                        </span>
                        <h3 className="text-sm font-medium">{book.title}</h3>
                      </div>
                      {book.subtitle && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {book.subtitle}
                        </p>
                      )}
                      {book.authors && book.authors.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          by{" "}
                          {book.authors.map((author, authorIndex) => (
                            <span key={author._id}>
                              {authorIndex > 0 && ", "}
                              {author.name}
                              {author.role && author.role !== "author" && (
                                <span className="text-muted-foreground/70"> ({author.role})</span>
                              )}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
