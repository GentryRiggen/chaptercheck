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
import { Badge } from "@/components/ui/badge";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (book === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <Link
                href="/books"
                className="text-sm text-primary hover:underline mb-2 inline-block"
              >
                &larr; Back to Books
              </Link>
              <h1 className="text-3xl font-bold">{book.title}</h1>
              {book.subtitle && (
                <p className="text-xl text-muted-foreground mt-2">
                  {book.subtitle}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setEditDialogOpen(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <BookCover
              coverImageR2Key={book.coverImageR2Key}
              title={book.title}
              size="lg"
              className="w-full h-auto aspect-[2/3]"
            />

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {book.series && (
                    <div>
                      <dt className="text-muted-foreground">Series</dt>
                      <dd className="font-medium">
                        {book.series.name}
                        {book.seriesOrder !== undefined && (
                          <span className="text-muted-foreground ml-1">
                            (Book {book.seriesOrder})
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {book.isbn && (
                    <div>
                      <dt className="text-muted-foreground">ISBN</dt>
                      <dd className="font-medium">{book.isbn}</dd>
                    </div>
                  )}
                  {book.publishedYear && (
                    <div>
                      <dt className="text-muted-foreground">Published</dt>
                      <dd className="font-medium">{book.publishedYear}</dd>
                    </div>
                  )}
                  {book.language && (
                    <div>
                      <dt className="text-muted-foreground">Language</dt>
                      <dd className="font-medium">{book.language}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {book.authors && book.authors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Authors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {book.authors.map((author) => (
                      <Link key={author._id} href={`/authors/${author._id}`}>
                        <Badge variant="secondary" className="cursor-pointer">
                          {author.name}
                          {author.role && author.role !== "author" && (
                            <span className="ml-1 text-xs">
                              ({author.role})
                            </span>
                          )}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {book.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{book.description}</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-6">
              <AudioUpload bookId={bookId} onUploadComplete={() => {}} />

              <Card>
                <CardHeader>
                  <CardTitle>Audio Files</CardTitle>
                </CardHeader>
                <CardContent>
                  {audioFiles === undefined ? (
                    <p className="text-muted-foreground">
                      Loading audio files...
                    </p>
                  ) : audioFiles.length === 0 ? (
                    <p className="text-muted-foreground">
                      No audio files yet. Upload one above to get started.
                    </p>
                  ) : (
                    <div className="space-y-4">
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
          </div>
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
