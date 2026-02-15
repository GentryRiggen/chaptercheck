import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";

interface ListeningCardProps {
  item: {
    _id: Id<"listeningProgress">;
    bookId: Id<"books">;
    book: {
      title: string;
      coverImageR2Key?: string;
      seriesOrder?: number;
      authors: Array<{ _id: Id<"authors">; name: string }>;
      series: { _id: Id<"series">; name: string } | null;
    };
    audioFile: {
      _id: Id<"audioFiles">;
      partNumber?: number;
      displayName: string;
    };
    progressFraction: number;
    totalParts: number;
    lastListenedAt: number;
  };
}

function ListeningCard({ item }: ListeningCardProps) {
  const router = useRouter();

  const handlePress = useCallback(() => {
    router.push(`/books/${item.bookId}`);
  }, [router, item.bookId]);

  const authorText = item.book.authors.map((a) => a.name).join(", ");
  const partText =
    item.totalParts > 1 && item.audioFile.partNumber !== undefined
      ? `Part ${item.audioFile.partNumber} of ${item.totalParts}`
      : null;

  return (
    <Pressable
      onPress={handlePress}
      className="w-36 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`Continue listening to ${item.book.title}`}
    >
      {/* Cover with progress bar overlay */}
      <View className="relative">
        <BookCover
          coverImageR2Key={item.book.coverImageR2Key}
          title={item.book.title}
          size="card"
        />
        {/* Progress bar overlay at bottom of cover */}
        <View className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg bg-muted/60">
          <View
            className="h-full rounded-bl-lg bg-primary"
            style={{ width: `${Math.min(item.progressFraction * 100, 100)}%` }}
          />
        </View>
      </View>

      {/* Text info below cover */}
      <View className="mt-2 gap-0.5">
        <Text className="text-xs font-semibold text-foreground" numberOfLines={2}>
          {item.book.title}
        </Text>
        {authorText ? (
          <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
            {authorText}
          </Text>
        ) : null}
        {partText && (
          <Text className="text-[10px] text-primary" numberOfLines={1}>
            {partText}
          </Text>
        )}
        <Text className="text-[10px] text-muted-foreground">
          {formatRelativeDate(item.lastListenedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

export { ListeningCard, type ListeningCardProps };
