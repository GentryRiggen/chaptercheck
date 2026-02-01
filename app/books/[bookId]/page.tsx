"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { AudioUpload } from "@/components/audio/AudioUpload";
import { BookCover } from "@/components/books/BookCover";
import { BookDeleteDialog } from "@/components/books/BookDeleteDialog";
import { BookEditDialog } from "@/components/books/BookEditDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";

export default function BookDetailPage({ params }: { params: Promise<{ bookId: Id<"books"> }> }) {
  const router = useRouter();
  const [bookId, setBookId] = useState<Id<"books"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setBookId(p.bookId));
  }, [params]);

  const book = useQuery(api.books.queries.getBook, bookId ? { bookId } : "skip");
  const audioFiles = useQuery(
    api.audioFiles.queries.getAudioFilesForBook,
    bookId ? { bookId } : "skip"
  );

  if (book === undefined || bookId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (book === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Book not found</p>
          <Link href="/books" className="text-primary hover:underline">
            Back to Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Back link */}
        <Link href="/books" className="mb-4 inline-block text-sm text-primary hover:underline">
          &larr; Back to Books
        </Link>

        {/* Hero section - always side by side */}
        <div className="mb-6 flex gap-4 sm:gap-6">
          {/* Fixed-size cover */}
          <div className="flex-shrink-0">
            <BookCover
              coverImageR2Key={book.coverImageR2Key}
              title={book.title}
              size="lg"
              className="h-36 w-24 rounded-lg shadow-lg sm:h-48 sm:w-32 md:h-60 md:w-40"
            />
          </div>

          {/* Book info */}
          <div className="min-w-0 flex-1">
            {book.series && (
              <p className="mb-1 text-sm italic text-muted-foreground">
                <Link
                  href={`/series/${book.series._id}?fromBook=${bookId}`}
                  className="text-primary hover:underline"
                >
                  {book.series.name}
                </Link>
                {book.seriesOrder !== undefined && ` #${book.seriesOrder}`}
              </p>
            )}
            <h1 className="text-xl font-bold leading-tight sm:text-2xl md:text-3xl">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{book.subtitle}</p>
            )}

            {book.authors && book.authors.length > 0 && (
              <div className="mt-2 sm:mt-3">
                <span className="text-sm text-muted-foreground sm:text-base">by </span>
                {book.authors.map((author, i) => (
                  <span key={author._id}>
                    <Link
                      href={`/authors/${author._id}`}
                      className="text-sm text-primary hover:underline sm:text-base"
                    >
                      {author.name}
                    </Link>
                    {author.role && author.role !== "author" && (
                      <span className="ml-1 text-xs text-muted-foreground">({author.role})</span>
                    )}
                    {i < book.authors.length - 1 && ", "}
                  </span>
                ))}
              </div>
            )}

            {/* Meta info */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              {book.publishedYear && <span>{book.publishedYear}</span>}
              {book.language && <span>{book.language}</span>}
              {book.isbn && <span className="hidden sm:inline">ISBN: {book.isbn}</span>}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditDialogOpen(true)}>
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Description */}
        {book.description && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
              {book.description}
            </p>
          </div>
        )}

        {/* Audio section */}
        <div className="space-y-4">
          <AudioUpload bookId={bookId} onUploadComplete={() => {}} />

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Audio Files</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {audioFiles === undefined ? (
                <p className="text-sm text-muted-foreground">Loading audio files...</p>
              ) : audioFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No audio files yet. Upload one above to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {audioFiles.map((audioFile) => (
                    <AudioPlayer key={audioFile._id} audioFile={audioFile} onDelete={() => {}} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BookEditDialog book={book} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      <BookDeleteDialog
        bookId={bookId}
        bookTitle={book.title}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => router.push("/books")}
      />
    </div>
  );
}
