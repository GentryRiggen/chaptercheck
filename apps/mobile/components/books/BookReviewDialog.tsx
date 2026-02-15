import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { reviewSchema } from "@chaptercheck/shared/validations/review";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { Text, TextInput, View } from "react-native";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/books/StarRating";
import { useThemeColors } from "@/hooks/useThemeColors";

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface BookReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: Id<"books">;
  isMarkingAsRead?: boolean;
  initialData?: {
    rating?: number;
    reviewText?: string;
    isReadPrivate?: boolean;
    isReviewPrivate?: boolean;
  };
}

export function BookReviewDialog({
  open,
  onOpenChange,
  bookId,
  isMarkingAsRead = false,
  initialData,
}: BookReviewDialogProps) {
  const colors = useThemeColors();
  const saveReview = useMutation(api.bookUserData.mutations.saveReview);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: initialData?.rating ?? 0,
      reviewText: initialData?.reviewText ?? "",
      isReadPrivate: initialData?.isReadPrivate ?? false,
      isReviewPrivate: initialData?.isReviewPrivate ?? false,
    },
  });

  // Reset form when dialog opens with new initial data
  useEffect(() => {
    if (open) {
      form.reset({
        rating: initialData?.rating ?? 0,
        reviewText: initialData?.reviewText ?? "",
        isReadPrivate: initialData?.isReadPrivate ?? false,
        isReviewPrivate: initialData?.isReviewPrivate ?? false,
      });
    }
  }, [open, initialData, form]);

  const watchIsReadPrivate = form.watch("isReadPrivate");
  const watchReviewText = form.watch("reviewText");
  const charCount = watchReviewText?.length ?? 0;

  // Cascade: when isReadPrivate is checked, force isReviewPrivate
  useEffect(() => {
    if (watchIsReadPrivate) {
      form.setValue("isReviewPrivate", true);
    }
  }, [watchIsReadPrivate, form]);

  const onSubmit = useCallback(
    async (data: ReviewFormValues) => {
      await saveReview({
        bookId,
        rating: data.rating > 0 ? data.rating : undefined,
        reviewText: data.reviewText || undefined,
        isReadPrivate: data.isReadPrivate,
        isReviewPrivate: data.isReadPrivate ? true : data.isReviewPrivate,
      });
      onOpenChange(false);
    },
    [saveReview, bookId, onOpenChange]
  );

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isMarkingAsRead ? "Mark as Read" : initialData ? "Edit Review" : "Write a Review"}
          </DialogTitle>
        </DialogHeader>

        <View style={{ gap: 20 }}>
          {/* Star Rating */}
          <View style={{ gap: 8 }}>
            <Text className="text-sm font-medium text-foreground">Rating</Text>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <StarRating
                value={form.watch("rating")}
                onChange={(val) => form.setValue("rating", val)}
                size="md"
              />
              <Text className="text-xs text-muted-foreground">
                {form.watch("rating") > 0 ? `${form.watch("rating")} / 3` : "Tap to rate"}
              </Text>
            </View>
          </View>

          {/* Review Text */}
          <View style={{ gap: 8 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-foreground">Review</Text>
              <Text className="text-xs text-muted-foreground">{charCount} / 2000</Text>
            </View>
            <TextInput
              value={form.watch("reviewText")}
              onChangeText={(text) => form.setValue("reviewText", text)}
              placeholder="Share your thoughts..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={2000}
              textAlignVertical="top"
              className="min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-base text-foreground"
            />
          </View>

          {/* Privacy */}
          <View style={{ gap: 12 }}>
            <Text className="text-sm font-medium text-foreground">Privacy</Text>

            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Checkbox
                checked={form.watch("isReadPrivate")}
                onCheckedChange={(checked) => form.setValue("isReadPrivate", checked)}
              />
              <Text className="flex-1 text-sm text-foreground">
                Hide that I&apos;ve read this book
              </Text>
            </View>

            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Checkbox
                checked={form.watch("isReviewPrivate")}
                onCheckedChange={(checked) => form.setValue("isReviewPrivate", checked)}
                disabled={watchIsReadPrivate}
              />
              <Text
                className={`flex-1 text-sm ${watchIsReadPrivate ? "text-muted-foreground" : "text-foreground"}`}
              >
                Keep my review private
              </Text>
            </View>
          </View>
        </View>

        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onPress={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isMarkingAsRead ? "Mark as Read" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
