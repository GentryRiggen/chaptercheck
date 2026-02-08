import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { BookCheck, Check, Pencil } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/books/StarRating";
import { BookReviewDialog } from "@/components/books/BookReviewDialog";

const PRIMARY_COLOR = "hsl(120, 13%, 60%)";

interface BookReadStatusProps {
  bookId: Id<"books">;
  myBookData:
    | {
        _id: Id<"bookUserData">;
        isRead?: boolean;
        rating?: number;
        reviewText?: string;
        reviewedAt?: number;
        isReadPrivate?: boolean;
        isReviewPrivate: boolean;
      }
    | null
    | undefined;
}

export function BookReadStatus({ bookId, myBookData }: BookReadStatusProps) {
  const markAsRead = useMutation(api.bookUserData.mutations.markAsRead);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  const isRead = myBookData?.isRead === true;
  const hasReview =
    myBookData?.rating !== undefined ||
    (myBookData?.reviewText && myBookData.reviewText.length > 0);

  const handleMarkAsRead = () => {
    setIsMarkingAsRead(true);
    setReviewDialogOpen(true);
  };

  const handleUnmark = () => {
    const message = hasReview
      ? "This will also remove your rating and review for this book."
      : "Are you sure you want to unmark this book as read?";

    Alert.alert("Unmark as Read", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unmark",
        style: "destructive",
        onPress: () => markAsRead({ bookId }),
      },
    ]);
  };

  const handleEditReview = () => {
    setIsMarkingAsRead(false);
    setReviewDialogOpen(true);
  };

  const initialData =
    isRead && myBookData
      ? {
          rating: myBookData.rating,
          reviewText: myBookData.reviewText,
          isReadPrivate: myBookData.isReadPrivate,
          isReviewPrivate: myBookData.isReviewPrivate,
        }
      : undefined;

  if (!isRead) {
    return (
      <>
        <Button variant="outline" onPress={handleMarkAsRead}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <BookCheck size={16} color={PRIMARY_COLOR} />
            <Text className="text-sm font-medium text-foreground">Mark as Read</Text>
          </View>
        </Button>

        <BookReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          bookId={bookId}
          isMarkingAsRead
        />
      </>
    );
  }

  return (
    <>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        {/* Read pill */}
        <Pressable
          onPress={handleUnmark}
          className="flex-row items-center rounded-full bg-primary px-3 py-1.5 active:opacity-80"
          style={{ gap: 4 }}
        >
          <Check size={14} color="white" />
          <Text className="text-sm font-medium text-primary-foreground">Read</Text>
        </Pressable>

        {/* Rating display + edit */}
        {myBookData?.rating !== undefined ? (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <StarRating value={myBookData.rating} readonly size="sm" />
            <Pressable
              onPress={handleEditReview}
              hitSlop={8}
              className="active:opacity-70"
              accessibilityLabel="Edit review"
              accessibilityRole="button"
            >
              <Pencil size={14} color={PRIMARY_COLOR} />
            </Pressable>
          </View>
        ) : (
          <Button variant="ghost" size="sm" onPress={handleEditReview}>
            <Text className="text-xs font-medium text-primary">Rate</Text>
          </Button>
        )}
      </View>

      <BookReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        bookId={bookId}
        isMarkingAsRead={isMarkingAsRead}
        initialData={initialData}
      />
    </>
  );
}
