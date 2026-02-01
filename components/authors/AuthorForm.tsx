"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ImageUpload } from "@/components/images/ImageUpload";
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
  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: initialValues?.name || "",
      bio: initialValues?.bio || "",
      imageR2Key: initialValues?.imageR2Key,
    },
  });

  const handleSubmit = async (values: AuthorFormValues) => {
    await onSubmit({
      ...values,
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
                  onChange={field.onChange}
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
                <Input placeholder="Author name" {...field} />
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
