"use client";

import { useMutation } from "convex/react";
import { AlertTriangle } from "lucide-react";
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

interface ShelfDeleteDialogProps {
  shelfId: Id<"shelves">;
  shelfName: string;
  bookCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function ShelfDeleteDialog({
  shelfId,
  shelfName,
  bookCount,
  open,
  onOpenChange,
  onDeleted,
}: ShelfDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const deleteShelf = useMutation(api.shelves.mutations.deleteShelf);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteShelf({ shelfId });
      onOpenChange(false);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete shelf");
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Shelf
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{shelfName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {bookCount > 0 && (
            <p className="text-sm text-muted-foreground">
              This shelf contains {bookCount} book{bookCount !== 1 ? "s" : ""}. The books themselves
              will not be deleted.
            </p>
          )}
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete Shelf"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
