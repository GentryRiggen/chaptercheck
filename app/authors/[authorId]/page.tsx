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
import { Button } from "@/components/ui/button";

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

  if (author === undefined || authorId === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (author === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-6">
              <AuthorImage
                imageR2Key={author.imageR2Key}
                name={author.name}
                size="lg"
              />
              <div>
                <Link
                  href="/authors"
                  className="text-sm text-primary hover:underline mb-2 inline-block"
                >
                  &larr; Back to Authors
                </Link>
                <h1 className="text-3xl font-bold">{author.name}</h1>
              </div>
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {author.bio && (
          <div className="bg-card rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Bio</h2>
            <p className="text-foreground whitespace-pre-wrap">{author.bio}</p>
          </div>
        )}

        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Books</h2>
          {books === undefined ? (
            <p className="text-muted-foreground">Loading books...</p>
          ) : books.length === 0 ? (
            <p className="text-muted-foreground">No books by this author yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <Link
                  key={book._id}
                  href={`/books/${book._id}`}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold">{book.title}</h3>
                  {book.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {book.subtitle}
                    </p>
                  )}
                  {book.role && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Role: {book.role}
                    </p>
                  )}
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
