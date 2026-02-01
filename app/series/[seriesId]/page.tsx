"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { BookCover } from "@/components/books/BookCover";
import { Library } from "lucide-react";

export default function SeriesDetailPage({
  params,
}: {
  params: Promise<{ seriesId: Id<"series"> }>;
}) {
  const [seriesId, setSeriesId] = useState<Id<"series"> | null>(null);
  const searchParams = useSearchParams();
  const fromBook = searchParams.get("fromBook");

  useEffect(() => {
    params.then((p) => setSeriesId(p.seriesId));
  }, [params]);

  const series = useQuery(
    api.series.queries.getSeries,
    seriesId ? { seriesId } : "skip"
  );
  const books = useQuery(
    api.series.queries.getBooksInSeriesWithAuthors,
    seriesId ? { seriesId } : "skip"
  );

  if (series === undefined || seriesId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (series === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Series not found</p>
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
      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Back link */}
        <Link
          href={fromBook ? `/books/${fromBook}` : "/books"}
          className="text-sm text-primary hover:underline mb-4 inline-block"
        >
          &larr; {fromBook ? "Back to Book" : "Back to Books"}
        </Link>

        {/* Hero section */}
        <div className="flex gap-4 sm:gap-6 mb-6">
          {/* Series icon */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-lg bg-primary/10 flex items-center justify-center">
              <Library className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary" />
            </div>
          </div>

          {/* Series info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
              {series.name}
            </h1>

            {books && books.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mt-1">
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
                    <p className="text-sm text-muted-foreground mt-1">
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
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              About
            </h2>
            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
              {series.description}
            </p>
          </div>
        )}

        {/* Books */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Books in Series
          </h2>
          {books === undefined ? (
            <p className="text-sm text-muted-foreground">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books in this series yet</p>
          ) : (
            <div className="bg-card/60 rounded-lg divide-y divide-border/50">
              {books.map((book) => (
                <Link
                  key={book._id}
                  href={`/books/${book._id}`}
                  className="flex items-start gap-3 px-3 py-3 hover:bg-muted/50 transition-colors"
                >
                  <BookCover
                    coverImageR2Key={book.coverImageR2Key}
                    title={book.title}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-baseline gap-2">
                      {book.seriesOrder !== undefined && (
                        <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          #{book.seriesOrder}
                        </span>
                      )}
                      <h3 className="font-medium text-sm">{book.title}</h3>
                    </div>
                    {book.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {book.subtitle}
                      </p>
                    )}
                    {book.authors && book.authors.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by{" "}
                        {book.authors.map((author, index) => (
                          <span key={author._id}>
                            {index > 0 && ", "}
                            {author.name}
                            {author.role && author.role !== "author" && (
                              <span className="text-muted-foreground/70">
                                {" "}
                                ({author.role})
                              </span>
                            )}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
