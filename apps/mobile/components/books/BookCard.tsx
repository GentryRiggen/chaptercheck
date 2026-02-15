import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { cn } from "@chaptercheck/tailwind-config/cn";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";
import { StarRating } from "@/components/books/StarRating";

interface BookCardProps {
  book: {
    _id: Id<"books">;
    title: string;
    coverImageR2Key?: string;
    seriesOrder?: number;
    averageRating?: number;
    ratingCount?: number;
    authors?: Array<{ _id: Id<"authors">; name: string }>;
    series?: { _id: Id<"series">; name: string } | null;
  };
  className?: string;
}

function BookCard({ book, className }: BookCardProps) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    router.push(`/books/${book._id}`);
  }, [router, book._id]);

  const hasRating =
    book.averageRating !== undefined && book.ratingCount !== undefined && book.ratingCount > 0;

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "flex-row items-center gap-3 border-b border-border/50 px-4 py-3 active:bg-muted/50",
        className
      )}
      accessibilityRole="button"
      accessibilityLabel={`View ${book.title}`}
    >
      <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="sm" />

      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-semibold leading-tight text-foreground" numberOfLines={2}>
          {book.title}
        </Text>

        {book.authors && book.authors.length > 0 && (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {book.authors.map((a) => a.name).join(", ")}
          </Text>
        )}

        {book.series && (
          <Text className="text-xs italic text-primary" numberOfLines={1}>
            {book.series.name}
            {book.seriesOrder !== undefined && ` #${book.seriesOrder}`}
          </Text>
        )}

        {hasRating && (
          <View className="flex-row items-center gap-1.5 pt-0.5">
            <StarRating value={Math.round(book.averageRating!)} readonly size="xs" />
            <Text className="text-[10px] text-muted-foreground">({book.ratingCount})</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export { BookCard, type BookCardProps };
