"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { AudioUpload } from "@/components/audio/AudioUpload";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { BookCover } from "@/components/books/BookCover";
import { BookEditDialog } from "@/components/books/BookEditDialog";
import { BookDeleteDialog } from "@/components/books/BookDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ bookId: Id<"books"> }>;
}) {
  const router = useRouter();
  const [bookId, setBookId] = useState<Id<"books"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setBookId(p.bookId));
  }, [params]);

  const book = useQuery(
    api.books.queries.getBook,
    bookId ? { bookId } : "skip"
  );
  const audioFiles = useQuery(
    api.audioFiles.queries.getAudioFilesForBook,
    bookId ? { bookId } : "skip"
  );

  if (book === undefined || bookId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (book === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Book not found</p>
          <Link href="/books" className="text-primary hover:underline">
            Back to Books
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
          href="/books"
          className="text-sm text-primary hover:underline mb-4 inline-block"
        >
          &larr; Back to Books
        </Link>

        {/* Hero section - always side by side */}
        <div className="flex gap-4 sm:gap-6 mb-6">
          {/* Fixed-size cover */}
          <div className="flex-shrink-0">
            <BookCover
              coverImageR2Key={book.coverImageR2Key}
              title={book.title}
              size="lg"
              className="w-24 h-36 sm:w-32 sm:h-48 md:w-40 md:h-60 rounded-lg shadow-lg"
            />
          </div>

          {/* Book info */}
          <div className="flex-1 min-w-0">
            {book.series && (
              <p className="text-sm text-muted-foreground italic mb-1">
                {book.series.name}
                {book.seriesOrder !== undefined && ` #${book.seriesOrder}`}
              </p>
            )}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{book.title}</h1>
            {book.subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {book.subtitle}
              </p>
            )}

            {book.authors && book.authors.length > 0 && (
              <div className="mt-2 sm:mt-3">
                <span className="text-sm sm:text-base text-muted-foreground">by </span>
                {book.authors.map((author, i) => (
                  <span key={author._id}>
                    <Link
                      href={`/authors/${author._id}`}
                      className="text-sm sm:text-base text-primary hover:underline"
                    >
                      {author.name}
                    </Link>
                    {author.role && author.role !== "author" && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({author.role})
                      </span>
                    )}
                    {i < book.authors.length - 1 && ", "}
                  </span>
                ))}
              </div>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs sm:text-sm text-muted-foreground">
              {book.publishedYear && <span>{book.publishedYear}</span>}
              {book.language && <span>{book.language}</span>}
              {book.isbn && <span className="hidden sm:inline">ISBN: {book.isbn}</span>}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
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

        {/* Description */}
        {book.description && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</h2>
            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{book.description}</p>
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
                <p className="text-sm text-muted-foreground">
                  Loading audio files...
                </p>
              ) : audioFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No audio files yet. Upload one above to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {audioFiles.map((audioFile) => (
                    <AudioPlayer
                      key={audioFile._id}
                      audioFile={audioFile}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BookEditDialog
        book={book}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

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
