"use client";

import { useQuery } from "convex/react";
import { Library, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthorDeleteDialog } from "@/components/authors/AuthorDeleteDialog";
import { AuthorEditDialog } from "@/components/authors/AuthorEditDialog";
import { AuthorImage } from "@/components/authors/AuthorImage";
import { BookCover } from "@/components/books/BookCover";
import { BookDialog } from "@/components/books/BookDialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function AuthorDetailPage({
  params,
}: {
  params: Promise<{ authorId: Id<"authors"> }>;
}) {
  const router = useRouter();
  const [authorId, setAuthorId] = useState<Id<"authors"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setAuthorId(p.authorId));
  }, [params]);

  const author = useQuery(api.authors.queries.getAuthor, authorId ? { authorId } : "skip");
  const books = useQuery(api.authors.queries.getAuthorBooks, authorId ? { authorId } : "skip");
  const series = useQuery(api.authors.queries.getAuthorSeries, authorId ? { authorId } : "skip");

  usePageTitle(author?.name || null);

  if (author === undefined || authorId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (author === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Author not found</p>
          <Link href="/authors" className="text-primary hover:underline">
            Back to Authors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Back link */}
        <Link href="/authors" className="mb-4 inline-block text-sm text-primary hover:underline">
          &larr; Back to Authors
        </Link>

        {/* Hero section - always side by side */}
        <div className="mb-6 flex gap-4 sm:gap-6">
          {/* Fixed-size image */}
          <div className="flex-shrink-0">
            <AuthorImage
              imageR2Key={author.imageR2Key}
              name={author.name}
              size="lg"
              className="h-20 w-20 shadow-lg sm:h-28 sm:w-28 md:h-32 md:w-32"
            />
          </div>

          {/* Author info */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight sm:text-2xl md:text-3xl">
              {author.name}
            </h1>

            {(books && books.length > 0) || (series && series.length > 0) ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {books && books.length > 0 && (
                  <span>
                    {books.length} book{books.length !== 1 ? "s" : ""}
                  </span>
                )}
                {books && books.length > 0 && series && series.length > 0 && <span> · </span>}
                {series && series.length > 0 && <span>{series.length} series</span>}
              </p>
            ) : null}

            {/* Action buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setBookDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add Book
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditDialogOpen(true)}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Bio */}
        {author.bio && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              About
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">{author.bio}</p>
          </div>
        )}

        {/* Series */}
        {series && series.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Series
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {series.map((s) => (
                <Link
                  key={s._id}
                  href={`/series/${s._id}`}
                  className="group rounded-lg bg-card/60 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Library className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-medium text-foreground">{s.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.bookCountByAuthor} book{s.bookCountByAuthor !== 1 ? "s" : ""} by{" "}
                        {author.name}
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Books by {author.name}
          </h2>
          {books === undefined ? (
            <p className="text-sm text-muted-foreground">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books by this author yet</p>
          ) : (
            <div className="divide-y divide-border/50 rounded-lg bg-card/60">
              {books.map((book) => (
                <Link
                  key={book._id}
                  href={`/books/${book._id}`}
                  className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="sm" />
                  <div className="min-w-0 flex-1 py-0.5">
                    <h3 className="text-sm font-medium">{book.title}</h3>
                    {book.subtitle && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {book.subtitle}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {book.publishedYear && <span>{book.publishedYear}</span>}
                      {book.role && book.role !== "author" && (
                        <span className="rounded bg-muted px-1.5 py-0.5">{book.role}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <AuthorEditDialog author={author} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      <AuthorDeleteDialog
        authorId={authorId}
        authorName={author.name}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => router.push("/authors")}
      />

      <BookDialog
        open={bookDialogOpen}
        onOpenChange={setBookDialogOpen}
        initialAuthorId={authorId}
      />
    </div>
  );
}
