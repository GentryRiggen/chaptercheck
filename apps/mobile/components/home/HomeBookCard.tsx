import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useRouter } from "expo-router";
import { Star } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";
import { useThemeColors } from "@/hooks/useThemeColors";

interface HomeBookCardProps {
  book: {
    _id: Id<"books">;
    title: string;
    coverImageR2Key?: string;
    averageRating?: number;
    ratingCount?: number;
    authors?: Array<{ _id: Id<"authors">; name: string }>;
    series?: { _id: Id<"series">; name: string } | null;
    seriesOrder?: number;
  };
  showRating?: boolean;
}

export function HomeBookCard({ book, showRating }: HomeBookCardProps) {
  const router = useRouter();
  const colors = useThemeColors();

  const handlePress = useCallback(() => {
    router.push(`/books/${book._id}`);
  }, [router, book._id]);

  const authorText = book.authors?.map((a) => a.name).join(", ");
  const hasRating =
    showRating &&
    book.averageRating !== undefined &&
    book.ratingCount !== undefined &&
    book.ratingCount > 0;

  return (
    <Pressable
      onPress={handlePress}
      className="w-36 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`View ${book.title}`}
    >
      {/* Cover */}
      <View className="relative">
        <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="card" />
        {/* Rating badge overlay */}
        {hasRating && (
          <View
            className="absolute right-1 top-1 flex-row items-center rounded-md bg-black/60 px-1.5 py-0.5"
            style={{ gap: 2 }}
          >
            <Star size={10} color="#facc15" fill="#facc15" />
            <Text className="text-[10px] font-semibold text-white">
              {book.averageRating!.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Text info */}
      <View className="mt-2" style={{ gap: 2 }}>
        <Text className="text-xs font-semibold text-foreground" numberOfLines={2}>
          {book.title}
        </Text>
        {authorText ? (
          <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
            {authorText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
