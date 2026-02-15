"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import type { ShelfFormValues } from "@chaptercheck/shared/validations/shelf";
import { useMutation } from "convex/react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ShelfForm } from "./ShelfForm";

interface ShelfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, dialog is in edit mode */
  shelf?: {
    _id: Id<"shelves">;
    name: string;
    description?: string;
    isOrdered: boolean;
    isPublic: boolean;
  };
  onCreated?: (shelfId: Id<"shelves">) => void;
}

export function ShelfDialog({ open, onOpenChange, shelf, onCreated }: ShelfDialogProps) {
  const createShelf = useMutation(api.shelves.mutations.createShelf);
  const updateShelf = useMutation(api.shelves.mutations.updateShelf);

  const isEdit = !!shelf;

  const handleSubmit = async (values: ShelfFormValues) => {
    if (isEdit) {
      await updateShelf({
        shelfId: shelf._id,
        name: values.name,
        description: values.description || undefined,
        isOrdered: values.isOrdered,
        isPublic: values.isPublic,
      });
    } else {
      const shelfId = await createShelf({
        name: values.name,
        description: values.description || undefined,
        isOrdered: values.isOrdered,
        isPublic: values.isPublic,
      });
      onCreated?.(shelfId);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Shelf" : "Create Shelf"}</DialogTitle>
        </DialogHeader>
        <ShelfForm
          initialValues={
            shelf
              ? {
                  name: shelf.name,
                  description: shelf.description ?? "",
                  isOrdered: shelf.isOrdered,
                  isPublic: shelf.isPublic,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={isEdit ? "Save Changes" : "Create Shelf"}
        />
      </DialogContent>
    </Dialog>
  );
}
