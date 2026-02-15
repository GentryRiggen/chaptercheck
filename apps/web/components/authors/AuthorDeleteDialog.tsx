"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, BookOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthorDeleteDialogProps {
  authorId: Id<"authors">;
  authorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function AuthorDeleteDialog({
  authorId,
  authorName,
  open,
  onOpenChange,
  onDeleted,
}: AuthorDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const preview = useQuery(
    api.authors.queries.getAuthorDeletionPreview,
    open ? { authorId } : "skip"
  );
  const deleteAuthor = useMutation(api.authors.mutations.deleteAuthor);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAuthor({ authorId });
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete author");
      setDeleting(false);
    }
  };

  const hasBooks = preview && preview.totalBooks > 0;
  const hasBooksToDelete = preview && preview.booksToDelete.length > 0;
  const hasBooksToKeep = preview && preview.booksToKeep.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Author
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{authorName}</strong>?
          </DialogDescription>
        </DialogHeader>

        {preview === undefined ? (
          <div className="py-4 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {!hasBooks && (
              <p className="text-sm text-muted-foreground">This author has no associated books.</p>
            )}

            {hasBooksToDelete && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    {preview.booksToDelete.length} book
                    {preview.booksToDelete.length !== 1 ? "s" : ""} will be deleted
                  </span>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  These books have no other authors and will be permanently deleted along with their
                  audio files:
                </p>
                <ul className="space-y-1 text-sm">
                  {preview.booksToDelete.map((book) => (
                    <li key={book._id} className="flex items-center gap-2">
                      <BookOpen className="h-3 w-3 text-muted-foreground" />
                      {book.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasBooksToKeep && (
              <div className="rounded-lg border border-green-500/50 bg-green-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700">
                    {preview.booksToKeep.length} book
                    {preview.booksToKeep.length !== 1 ? "s" : ""} will be kept
                  </span>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  These books have other authors and will remain in the library:
                </p>
                <ul className="space-y-1 text-sm">
                  {preview.booksToKeep.map((book) => (
                    <li key={book._id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                        {book.title}
                      </div>
                      <span className="ml-5 text-xs text-muted-foreground">
                        by {book.otherAuthors.join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || preview === undefined}
          >
            {deleting ? "Deleting..." : "Delete Author"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
