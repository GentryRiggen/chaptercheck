"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AuthorMultiSelect } from "@/components/authors/AuthorMultiSelect";
import { ImageUpload } from "@/components/images/ImageUpload";
import { SeriesSelect } from "@/components/series/SeriesSelect";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type Id } from "@/convex/_generated/dataModel";
import { type BookFormValues, bookSchema } from "@/lib/validations/book";

interface BookFormProps {
  initialValues?: Partial<BookFormValues>;
  initialCoverUrl?: string;
  onSubmit: (values: BookFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  bookId?: Id<"books">; // The book being edited (if editing)
}

export function BookForm({
  initialValues,
  initialCoverUrl,
  onSubmit,
  onCancel,
  submitLabel,
  bookId,
}: BookFormProps) {
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: initialValues?.title || "",
      subtitle: initialValues?.subtitle || "",
      description: initialValues?.description || "",
      isbn: initialValues?.isbn || "",
      publishedYear: initialValues?.publishedYear ?? null,
      language: initialValues?.language || "",
      coverImageR2Key: initialValues?.coverImageR2Key,
      seriesId: initialValues?.seriesId,
      seriesOrder: initialValues?.seriesOrder ?? null,
      authorIds: initialValues?.authorIds || [],
    },
  });

  const handleSubmit = async (values: BookFormValues) => {
    await onSubmit({
      ...values,
      subtitle: values.subtitle || undefined,
      description: values.description || undefined,
      isbn: values.isbn || undefined,
      language: values.language || undefined,
      publishedYear: values.publishedYear ?? undefined,
      seriesOrder: values.seriesOrder ?? undefined,
    });
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.stopPropagation();
    form.handleSubmit(handleSubmit)(e);
  };

  return (
    <Form {...form}>
      <form onSubmit={onFormSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="coverImageR2Key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
              <FormControl>
                <ImageUpload
                  path="books"
                  value={field.value}
                  previewUrl={initialCoverUrl}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Book title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subtitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subtitle</FormLabel>
              <FormControl>
                <Input placeholder="Subtitle (optional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Book description (optional)" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isbn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISBN</FormLabel>
                <FormControl>
                  <Input placeholder="ISBN" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="publishedYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Published Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Year"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value ? parseInt(e.target.value) : null)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Language</FormLabel>
              <FormControl>
                <Input placeholder="e.g., English" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="authorIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authors</FormLabel>
              <FormControl>
                <AuthorMultiSelect value={field.value || []} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SeriesSelect
          value={{
            seriesId: form.watch("seriesId") as Id<"series"> | undefined,
            seriesOrder: form.watch("seriesOrder") ?? undefined,
          }}
          onChange={(val) => {
            form.setValue("seriesId", val.seriesId);
            form.setValue("seriesOrder", val.seriesOrder ?? null);
          }}
          error={form.formState.errors.seriesOrder?.message}
          currentBookId={bookId}
          currentBookTitle={form.watch("title") || "New book"}
        />

        <div className="flex gap-4 pt-2">
          <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
