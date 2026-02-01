"use client";

import { useMutation } from "convex/react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import type { BookFormValues } from "@/lib/validations/book";

import { BookForm } from "./BookForm";

interface BookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAuthorId?: Id<"authors">;
}

export function BookDialog({ open, onOpenChange, initialAuthorId }: BookDialogProps) {
  const createBook = useMutation(api.books.mutations.createBook);

  const handleSubmit = async (values: BookFormValues) => {
    await createBook({
      title: values.title,
      subtitle: values.subtitle || undefined,
      description: values.description || undefined,
      isbn: values.isbn || undefined,
      publishedYear: values.publishedYear ?? undefined,
      language: values.language || undefined,
      coverImageR2Key: values.coverImageR2Key,
      seriesId: values.seriesId as Id<"series"> | undefined,
      seriesOrder: values.seriesOrder ?? undefined,
      authorIds: values.authorIds?.length ? (values.authorIds as Id<"authors">[]) : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
        </DialogHeader>
        <BookForm
          initialValues={initialAuthorId ? { authorIds: [initialAuthorId] } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Create Book"
        />
      </DialogContent>
    </Dialog>
  );
}
