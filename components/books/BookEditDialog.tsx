"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookForm } from "./BookForm";
import type { BookFormValues } from "@/lib/validations/book";
import { useImageUrl } from "@/hooks/useImageUrl";

interface Book {
  _id: Id<"books">;
  title: string;
  subtitle?: string;
  description?: string;
  isbn?: string;
  publishedYear?: number;
  language?: string;
  coverImageR2Key?: string;
  seriesId?: Id<"series">;
  seriesOrder?: number;
  authors?: Array<{ _id: Id<"authors">; name: string }>;
}

interface BookEditDialogProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookEditDialog({
  book,
  open,
  onOpenChange,
}: BookEditDialogProps) {
  const updateBook = useMutation(api.books.mutations.updateBook);
  const { imageUrl } = useImageUrl(book.coverImageR2Key);

  const handleSubmit = async (values: BookFormValues) => {
    await updateBook({
      bookId: book._id,
      title: values.title,
      subtitle: values.subtitle || undefined,
      description: values.description || undefined,
      isbn: values.isbn || undefined,
      publishedYear: values.publishedYear ?? undefined,
      language: values.language || undefined,
      coverImageR2Key: values.coverImageR2Key,
      seriesId: values.seriesId as Id<"series"> | undefined,
      seriesOrder: values.seriesOrder ?? undefined,
      authorIds: values.authorIds as Id<"authors">[] | undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Book</DialogTitle>
        </DialogHeader>
        <BookForm
          initialValues={{
            title: book.title,
            subtitle: book.subtitle,
            description: book.description,
            isbn: book.isbn,
            publishedYear: book.publishedYear,
            language: book.language,
            coverImageR2Key: book.coverImageR2Key,
            seriesId: book.seriesId,
            seriesOrder: book.seriesOrder,
            authorIds: book.authors?.map((a) => a._id),
          }}
          initialCoverUrl={imageUrl || undefined}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
        />
      </DialogContent>
    </Dialog>
  );
}
