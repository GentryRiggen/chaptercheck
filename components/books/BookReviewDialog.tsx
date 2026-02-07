"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { BookCheck, EyeOff, Lock } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { GenreMultiSelect } from "@/components/genres/GenreMultiSelect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { type ReviewFormData, reviewSchema } from "@/lib/validations/review";

import { StarRating } from "./StarRating";

interface BookReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: Id<"books">;
  /** When true, shows "marking as read" indication */
  isMarkingAsRead?: boolean;
  initialData?: {
    rating?: number;
    reviewText?: string;
    isReadPrivate: boolean;
    isReviewPrivate: boolean;
  };
}

export function BookReviewDialog({
  open,
  onOpenChange,
  bookId,
  isMarkingAsRead = false,
  initialData,
}: BookReviewDialogProps) {
  const saveReview = useMutation(api.bookUserData.mutations.saveReview);
  const setGenreVotes = useMutation(api.bookGenreVotes.mutations.setGenreVotes);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: initialData?.rating ?? 0,
      reviewText: initialData?.reviewText ?? "",
      isReadPrivate: initialData?.isReadPrivate ?? false,
      isReviewPrivate: initialData?.isReviewPrivate ?? false,
      genreIds: [],
    },
  });

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      form.reset({
        rating: initialData?.rating ?? 0,
        reviewText: initialData?.reviewText ?? "",
        isReadPrivate: initialData?.isReadPrivate ?? false,
        isReviewPrivate: initialData?.isReviewPrivate ?? false,
        genreIds: [],
      });
    }
  }, [open, initialData, form]);

  const isReadPrivate = form.watch("isReadPrivate");

  // Auto-check "Keep review private" when "Keep read status private" is checked
  useEffect(() => {
    if (isReadPrivate) {
      form.setValue("isReviewPrivate", true);
    }
  }, [isReadPrivate, form]);

  const handleSubmit = async (values: ReviewFormData) => {
    await saveReview({
      bookId,
      // Convert 0 rating to undefined (no rating)
      rating: values.rating > 0 ? values.rating : undefined,
      reviewText: values.reviewText || undefined,
      isReadPrivate: values.isReadPrivate,
      isReviewPrivate: values.isReviewPrivate,
    });

    // Save genre votes if any were selected
    if (values.genreIds && values.genreIds.length > 0) {
      await setGenreVotes({
        bookId,
        genreIds: values.genreIds as Parameters<typeof setGenreVotes>[0]["genreIds"],
      });
    }

    onOpenChange(false);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.stopPropagation();
    form.handleSubmit(handleSubmit)(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isMarkingAsRead ? "Mark as Read" : "Rate and Review"}</DialogTitle>
          <DialogDescription>
            {isMarkingAsRead
              ? "Add a rating or review (optional)."
              : "Share your thoughts about this book."}
          </DialogDescription>
        </DialogHeader>

        {/* Marking as read indicator */}
        {isMarkingAsRead && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2",
              "bg-primary/10",
              "border border-primary/20"
            )}
          >
            <BookCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              This book will be marked as read
            </span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <StarRating value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>Click a star to rate, click again to clear.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reviewText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your review..."
                      rows={4}
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length ?? 0} / 2000 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Privacy Settings</span>
              </div>

              <FormField
                control={form.control}
                name="isReadPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border bg-background p-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="flex-1 space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                        Hide that I&apos;ve read this book
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Your reading activity stays completely private. This book won&apos;t appear
                        in your public reading history, and others won&apos;t know you&apos;ve read
                        it.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isReviewPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border bg-background p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isReadPrivate}
                      />
                    </FormControl>
                    <div className="flex-1 space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                        Keep my review private
                      </FormLabel>
                      <FormDescription className="text-xs">
                        {isReadPrivate
                          ? "Automatically private because your read status is hidden."
                          : "Your review is public by default. Check this to hide your rating and review from others."}
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="genreIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genres (optional)</FormLabel>
                  <FormControl>
                    <GenreMultiSelect
                      value={field.value ?? []}
                      onChange={field.onChange}
                      bookId={bookId}
                    />
                  </FormControl>
                  <FormDescription>Vote for genres that describe this book</FormDescription>
                </FormItem>
              )}
            />

            <div className="flex gap-4 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isMarkingAsRead
                    ? "Mark as Read"
                    : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
