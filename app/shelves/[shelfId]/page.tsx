"use client";

import { useQuery } from "convex/react";
import { BookOpen, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AddBooksToShelfDialog } from "@/components/shelves/AddBooksToShelfDialog";
import { ShelfBookList } from "@/components/shelves/ShelfBookList";
import { ShelfDeleteDialog } from "@/components/shelves/ShelfDeleteDialog";
import { ShelfDialog } from "@/components/shelves/ShelfDialog";
import { ShelfShareButton } from "@/components/shelves/ShelfShareButton";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ShelfDetailPage({
  params,
}: {
  params: Promise<{ shelfId: Id<"shelves"> }>;
}) {
  const router = useRouter();
  const [shelfId, setShelfId] = useState<Id<"shelves"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addBooksOpen, setAddBooksOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setShelfId(p.shelfId));
  }, [params]);

  const shelf = useQuery(api.shelves.queries.getShelf, shelfId ? { shelfId } : "skip");

  usePageTitle(shelf?.name ?? null);

  const existingBookIds = useMemo(
    () => new Set(shelf?.books.map((b) => b._id) ?? []),
    [shelf?.books]
  );

  if (shelf === undefined || shelfId === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (shelf === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Shelf not found or is private</p>
          <Link href="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
        {/* Back link */}
        {shelf.owner && (
          <Link
            href={`/users/${shelf.owner._id}`}
            className="mb-4 inline-block text-sm text-primary hover:underline"
          >
            &larr; Back to {shelf.isOwner ? "Profile" : `${shelf.owner.name ?? "User"}'s Profile`}
          </Link>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{shelf.name}</h1>
                {!shelf.isPublic && (
                  <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
              </div>
              {shelf.description && (
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {shelf.description}
                </p>
              )}
            </div>
          </div>

          {/* Owner info + actions */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {shelf.owner && (
              <Link
                href={`/users/${shelf.owner._id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <UserAvatar name={shelf.owner.name} imageUrl={shelf.owner.imageUrl} size="sm" />
                <span>{shelf.owner.name ?? "Anonymous"}</span>
              </Link>
            )}

            <span className="text-sm text-muted-foreground">
              {shelf.books.length} book{shelf.books.length !== 1 ? "s" : ""}
            </span>

            {shelf.isPublic && <ShelfShareButton shelfId={shelfId} />}

            {shelf.isOwner && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Add Books button for owner */}
        {shelf.isOwner && (
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={() => setAddBooksOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Books
            </Button>
          </div>
        )}

        {/* Book list */}
        {shelf.books.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {shelf.isOwner ? "No books in this shelf yet." : "This shelf is empty."}
            </p>
            {shelf.isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setAddBooksOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first book
              </Button>
            )}
          </div>
        ) : (
          <ShelfBookList
            shelfId={shelfId}
            books={shelf.books}
            isOrdered={shelf.isOrdered}
            isOwner={shelf.isOwner}
          />
        )}

        {/* CTA for unauthenticated viewers */}
        {!shelf.isOwner && shelf.owner === null && (
          <div className="mt-8 text-center">
            <Link href="/sign-in" className="text-sm text-primary hover:underline">
              Sign in to create your own shelves
            </Link>
          </div>
        )}
      </main>

      {shelf.isOwner && (
        <>
          <ShelfDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} shelf={shelf} />
          <ShelfDeleteDialog
            shelfId={shelfId}
            shelfName={shelf.name}
            bookCount={shelf.books.length}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onDeleted={() => router.push(`/users/${shelf.userId}`)}
          />
          <AddBooksToShelfDialog
            shelfId={shelfId}
            existingBookIds={existingBookIds}
            open={addBooksOpen}
            onOpenChange={setAddBooksOpen}
          />
        </>
      )}
    </div>
  );
}
