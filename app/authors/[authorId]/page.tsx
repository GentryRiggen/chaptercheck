"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { AuthorImage } from "@/components/authors/AuthorImage";
import { AuthorEditDialog } from "@/components/authors/AuthorEditDialog";
import { AuthorDeleteDialog } from "@/components/authors/AuthorDeleteDialog";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { Library } from "lucide-react";

export default function AuthorDetailPage({
  params,
}: {
  params: Promise<{ authorId: Id<"authors"> }>;
}) {
  const router = useRouter();
  const [authorId, setAuthorId] = useState<Id<"authors"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setAuthorId(p.authorId));
  }, [params]);

  const author = useQuery(
    api.authors.queries.getAuthor,
    authorId ? { authorId } : "skip"
  );
  const books = useQuery(
    api.authors.queries.getAuthorBooks,
    authorId ? { authorId } : "skip"
  );
  const series = useQuery(
    api.authors.queries.getAuthorSeries,
    authorId ? { authorId } : "skip"
  );

  if (author === undefined || authorId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (author === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Author not found</p>
          <Link href="/authors" className="text-primary hover:underline">
            Back to Authors
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
          href="/authors"
          className="text-sm text-primary hover:underline mb-4 inline-block"
        >
          &larr; Back to Authors
        </Link>

        {/* Hero section - always side by side */}
        <div className="flex gap-4 sm:gap-6 mb-6">
          {/* Fixed-size image */}
          <div className="flex-shrink-0">
            <AuthorImage
              imageR2Key={author.imageR2Key}
              name={author.name}
              size="lg"
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 shadow-lg"
            />
          </div>

          {/* Author info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{author.name}</h1>

            {(books && books.length > 0) || (series && series.length > 0) ? (
              <p className="text-sm text-muted-foreground mt-1">
                {books && books.length > 0 && (
                  <span>{books.length} book{books.length !== 1 ? "s" : ""}</span>
                )}
                {books && books.length > 0 && series && series.length > 0 && (
                  <span> · </span>
                )}
                {series && series.length > 0 && (
                  <span>{series.length} series</span>
                )}
              </p>
            ) : null}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditDialogOpen(true)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Bio */}
        {author.bio && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">About</h2>
            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{author.bio}</p>
          </div>
        )}

        {/* Series */}
        {series && series.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Series
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {series.map((s) => (
                <Link
                  key={s._id}
                  href={`/series/${s._id}`}
                  className="bg-card/60 rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Library className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground line-clamp-2">
                        {s.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.bookCountByAuthor} book{s.bookCountByAuthor !== 1 ? "s" : ""} by {author.name}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Books */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Books by {author.name}
          </h2>
          {books === undefined ? (
            <p className="text-sm text-muted-foreground">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books by this author yet</p>
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
                    <h3 className="font-medium text-sm">{book.title}</h3>
                    {book.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {book.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {book.publishedYear && <span>{book.publishedYear}</span>}
                      {book.role && book.role !== "author" && (
                        <span className="bg-muted px-1.5 py-0.5 rounded">{book.role}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <AuthorEditDialog
        author={author}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <AuthorDeleteDialog
        authorId={authorId}
        authorName={author.name}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => router.push("/authors")}
      />
    </div>
  );
}
