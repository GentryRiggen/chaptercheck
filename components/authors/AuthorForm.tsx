"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";

import { ImageUpload } from "@/components/images/ImageUpload";
import { AuthorSuggestions } from "@/components/suggestions/OpenLibrarySuggestions";
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
import type { OpenLibraryAuthorSuggestion } from "@/convex/openLibrary/types";
import { useOpenLibraryAuthorSearch } from "@/hooks/useOpenLibrarySearch";
import { type AuthorFormValues, authorSchema } from "@/lib/validations/author";

interface AuthorFormProps {
  initialValues?: Partial<AuthorFormValues>;
  initialImageUrl?: string;
  onSubmit: (values: AuthorFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}

export function AuthorForm({
  initialValues,
  initialImageUrl,
  onSubmit,
  onCancel,
  submitLabel,
}: AuthorFormProps) {
  const [externalImageUrl, setExternalImageUrl] = useState<string | undefined>();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameSearch, setNameSearch] = useState("");

  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: initialValues?.name || "",
      bio: initialValues?.bio || "",
      imageR2Key: initialValues?.imageR2Key,
    },
  });

  const { suggestions, isLoading } = useOpenLibraryAuthorSearch(nameSearch);
  const uploadImageFromUrl = useAction(api.openLibrary.actions.uploadImageFromUrl);

  const handleSuggestionSelect = useCallback(
    (suggestion: OpenLibraryAuthorSuggestion) => {
      form.setValue("name", suggestion.name);
      if (suggestion.bio) {
        form.setValue("bio", suggestion.bio);
      }
      if (suggestion.photoUrl) {
        setExternalImageUrl(suggestion.photoUrl);
        // Clear any existing R2 key since we're using external URL
        form.setValue("imageR2Key", undefined);
      }

      setShowSuggestions(false);
      setNameSearch("");
    },
    [form]
  );

  const handleSubmit = async (values: AuthorFormValues) => {
    let imageR2Key = values.imageR2Key;

    // Upload external image to R2 if we have one
    if (externalImageUrl && !imageR2Key) {
      const r2Key = await uploadImageFromUrl({
        imageUrl: externalImageUrl,
        pathPrefix: "authors",
        fileName: `${values.name.replace(/\s+/g, "-")}.jpg`,
      });
      if (r2Key) {
        imageR2Key = r2Key;
      }
    }

    await onSubmit({
      ...values,
      imageR2Key,
      bio: values.bio || undefined,
    });
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.stopPropagation();
    form.handleSubmit(handleSubmit)(e);
  };

  return (
    <Form {...form}>
      <form onSubmit={onFormSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="imageR2Key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo</FormLabel>
              <FormControl>
                <ImageUpload
                  path="authors"
                  value={field.value}
                  previewUrl={initialImageUrl}
                  externalUrl={externalImageUrl}
                  onChange={field.onChange}
                  onExternalUrlClear={() => setExternalImageUrl(undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="Author name"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setNameSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {showSuggestions && (
                    <AuthorSuggestions
                      query={nameSearch}
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
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea placeholder="Author biography (optional)" rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
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
