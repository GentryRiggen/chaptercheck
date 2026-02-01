"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Music, Users } from "lucide-react";
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
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";

interface BookDeleteDialogProps {
  bookId: Id<"books">;
  bookTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function BookDeleteDialog({
  bookId,
  bookTitle,
  open,
  onOpenChange,
  onDeleted,
}: BookDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const preview = useQuery(api.books.queries.getBookDeletionPreview, open ? { bookId } : "skip");
  const deleteBook = useMutation(api.books.mutations.deleteBook);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBook({ bookId });
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete book");
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Book
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{bookTitle}</strong>?
          </DialogDescription>
        </DialogHeader>

        {preview === undefined ? (
          <div className="py-4 text-center text-muted-foreground">Loading...</div>
        ) : preview === null ? (
          <div className="py-4 text-center text-muted-foreground">Book not found</div>
        ) : (
          <div className="space-y-3">
            {preview.authors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>by {preview.authors.join(", ")}</span>
              </div>
            )}

            {preview.audioFilesCount > 0 && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Music className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    {preview.audioFilesCount} audio file
                    {preview.audioFilesCount !== 1 ? "s" : ""} will be deleted
                  </span>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
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
            {deleting ? "Deleting..." : "Delete Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
