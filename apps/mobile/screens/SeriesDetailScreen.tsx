import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Library } from "lucide-react-native";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";

const PRIMARY_COLOR = "hsl(120, 13%, 60%)";

export default function SeriesDetailScreen() {
  const { seriesId: seriesIdParam } = useLocalSearchParams<{ seriesId: string }>();
  const seriesId = seriesIdParam as Id<"series">;
  const router = useRouter();
  const { shouldSkipQuery } = useAuthReady();

  const series = useQuery(api.series.queries.getSeries, shouldSkipQuery ? "skip" : { seriesId });

  const books = useQuery(
    api.series.queries.getBooksInSeriesWithAuthors,
    shouldSkipQuery ? "skip" : { seriesId }
  );

  // Collect unique authors across all books in the series
  const uniqueAuthors = useMemo(() => {
    if (!books) return [];
    const authorMap = new Map<string, { _id: Id<"authors">; name: string }>();
    for (const book of books) {
      for (const author of book.authors ?? []) {
        if (!authorMap.has(author._id)) {
          authorMap.set(author._id, { _id: author._id, name: author.name });
        }
      }
    }
    return Array.from(authorMap.values());
  }, [books]);

  // Loading state
  if (series === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ title: "Series" }} />
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  // Not found state
  if (series === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text className="text-lg font-semibold text-foreground">Series not found</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          This series may have been removed or you don't have access.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: series.name }} />

      {/* Hero section */}
      <View className="flex-row gap-4 px-4 pt-4">
        {/* Series icon */}
        <View className="h-24 w-24 items-center justify-center rounded-lg bg-primary/10">
          <Library size={48} color={PRIMARY_COLOR} />
        </View>

        {/* Series info */}
        <View className="min-w-0 flex-1 justify-center">
          <Text className="text-xl font-bold leading-tight text-foreground">{series.name}</Text>

          {books && books.length > 0 && (
            <Text className="mt-1 text-sm text-muted-foreground">
              {books.length} book{books.length !== 1 ? "s" : ""}
            </Text>
          )}

          {/* Unique authors list */}
          {uniqueAuthors.length > 0 && (
            <View className="mt-1 flex-row flex-wrap items-center">
              <Text className="text-sm text-muted-foreground">by </Text>
              {uniqueAuthors.map((author, index) => (
                <View key={author._id} className="flex-row">
                  {index > 0 && <Text className="text-sm text-muted-foreground">, </Text>}
                  <Pressable
                    onPress={() => router.push(`/authors/${author._id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${author.name}`}
                  >
                    <Text className="text-sm font-medium text-primary">{author.name}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      {series.description && (
        <View className="mt-5 px-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            About
          </Text>
          <Text className="text-sm leading-relaxed text-foreground">{series.description}</Text>
        </View>
      )}

      {/* Books in Series */}
      <View className="mt-5 pb-8">
        <Text className="mb-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Books in Series
        </Text>

        {books === undefined ? (
          <View className="items-center py-8">
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          </View>
        ) : books.length === 0 ? (
          <View className="mx-4 items-center rounded-lg border border-border/50 bg-card/50 py-8">
            <Text className="text-sm text-muted-foreground">No books in this series yet</Text>
          </View>
        ) : (
          <View className="mx-4 overflow-hidden rounded-lg border border-border/50">
            {books.map((book, index) => (
              <Pressable
                key={book._id}
                onPress={() => router.push(`/books/${book._id}`)}
                className="flex-row items-center gap-3 border-b border-border/50 px-3 py-3 active:bg-muted/50"
                style={index === books.length - 1 ? { borderBottomWidth: 0 } : undefined}
                accessibilityRole="button"
                accessibilityLabel={`View ${book.title}`}
              >
                {/* Position badge */}
                <View className="w-8 items-center">
                  <View className="rounded bg-primary/10 px-1.5 py-0.5">
                    <Text className="text-xs font-medium text-primary">#{index + 1}</Text>
                  </View>
                </View>

                {/* Book cover */}
                <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="sm" />

                {/* Book info */}
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    className="text-sm font-semibold leading-tight text-foreground"
                    numberOfLines={2}
                  >
                    {book.title}
                  </Text>

                  {book.subtitle && (
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {book.subtitle}
                    </Text>
                  )}

                  {book.authors && book.authors.length > 0 && (
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      by{" "}
                      {book.authors
                        .map((author) => {
                          const roleSuffix =
                            author.role && author.role !== "author" ? ` (${author.role})` : "";
                          return `${author.name}${roleSuffix}`;
                        })
                        .join(", ")}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
