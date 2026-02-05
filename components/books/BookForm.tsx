"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthorMultiSelect } from "@/components/authors/AuthorMultiSelect";
import { ImageUpload } from "@/components/images/ImageUpload";
import { SeriesSelect } from "@/components/series/SeriesSelect";
import { BookSuggestions } from "@/components/suggestions/OpenLibrarySuggestions";
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
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import type { OpenLibraryBookSuggestion } from "@/convex/openLibrary/types";
import { useOpenLibraryBookSearch } from "@/hooks/useOpenLibrarySearch";
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
  const [externalCoverUrl, setExternalCoverUrl] = useState<string | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [titleSearch, setTitleSearch] = useState("");

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

  const { suggestions, isLoading } = useOpenLibraryBookSearch(titleSearch);
  const uploadImageFromUrl = useAction(api.openLibrary.actions.uploadImageFromUrl);

  const handleSuggestionSelect = useCallback(
    (suggestion: OpenLibraryBookSuggestion) => {
      form.setValue("title", suggestion.title);
      if (suggestion.subtitle) {
        form.setValue("subtitle", suggestion.subtitle);
      }
      if (suggestion.description) {
        form.setValue("description", suggestion.description);
      }
      if (suggestion.isbn) {
        form.setValue("isbn", suggestion.isbn);
      }
      if (suggestion.publishedYear) {
        form.setValue("publishedYear", suggestion.publishedYear);
      }
      if (suggestion.language) {
        form.setValue("language", suggestion.language);
      }
      if (suggestion.coverUrl) {
        setExternalCoverUrl(suggestion.coverUrl);
        // Clear any existing R2 key since we're using external URL
        form.setValue("coverImageR2Key", undefined);
      }

      setShowSuggestions(false);
      setTitleSearch("");
    },
    [form]
  );

  const handleSubmit = async (values: BookFormValues) => {
    let coverImageR2Key = values.coverImageR2Key;

    // Upload external cover to R2 if we have one
    if (externalCoverUrl && !coverImageR2Key) {
      const r2Key = await uploadImageFromUrl({
        imageUrl: externalCoverUrl,
        pathPrefix: "books",
        fileName: `${values.title.replace(/\s+/g, "-")}.jpg`,
      });
      if (r2Key) {
        coverImageR2Key = r2Key;
      }
    }

    await onSubmit({
      ...values,
      coverImageR2Key,
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
                  externalUrl={externalCoverUrl}
                  onChange={field.onChange}
                  onExternalUrlClear={() => setExternalCoverUrl(undefined)}
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
                <div className="relative">
                  <Input
                    placeholder="Book title"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setTitleSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {showSuggestions && (
                    <BookSuggestions
                      query={titleSearch}
                      suggestions={suggestions}
                      isLoading={isLoading}
                      onSelect={handleSuggestionSelect}
                      onDismiss={() => setShowSuggestions(false)}
                    />
                  )}
                </div>
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
          {onCancel && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
