import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { BookOpen, Lock } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";
import { Badge } from "@/components/ui/badge";

const PRIMARY_COLOR = "hsl(120, 13%, 60%)";
const MUTED_FOREGROUND_COLOR = "hsl(220, 9%, 46%)";

export default function ShelfDetailScreen() {
  const { shelfId: shelfIdParam } = useLocalSearchParams<{ shelfId: string }>();
  const shelfId = shelfIdParam as Id<"shelves">;
  const router = useRouter();
  const { shouldSkipQuery } = useAuthReady();

  const shelf = useQuery(api.shelves.queries.getShelf, shouldSkipQuery ? "skip" : { shelfId });

  // Loading state
  if (shelf === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ title: "Shelf" }} />
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  // Not found state (null means shelf doesn't exist or is private)
  if (shelf === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text className="text-lg font-semibold text-foreground">Shelf not found</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          This shelf may have been removed or is private.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: shelf.name }} />

      {/* Header */}
      <View className="px-4 pt-4">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-bold text-foreground" numberOfLines={2}>
            {shelf.name}
          </Text>
          {!shelf.isPublic && <Lock size={16} color={MUTED_FOREGROUND_COLOR} />}
        </View>

        {shelf.description && (
          <Text className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {shelf.description}
          </Text>
        )}
      </View>

      {/* Owner info */}
      {shelf.owner && (
        <Pressable
          onPress={() => router.push(`/users/${shelf.owner!._id}`)}
          className="mt-3 flex-row items-center gap-2.5 px-4 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={`View ${shelf.owner.name ?? "user"}'s profile`}
        >
          {/* Circular avatar with first letter */}
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <Text className="text-sm font-semibold text-primary">
              {(shelf.owner.name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-sm text-muted-foreground">{shelf.owner.name ?? "Anonymous"}</Text>
        </Pressable>
      )}

      {/* Book count and visibility badge */}
      <View className="mt-3 flex-row items-center gap-3 px-4">
        <Text className="text-sm text-muted-foreground">
          {shelf.books.length} book{shelf.books.length !== 1 ? "s" : ""}
        </Text>
        <Badge variant={shelf.isPublic ? "secondary" : "outline"}>
          {shelf.isPublic ? "Public" : "Private"}
        </Badge>
      </View>

      {/* Books list */}
      <View className="mt-5 pb-8">
        {shelf.books.length === 0 ? (
          /* Empty state */
          <View className="mx-4 items-center rounded-lg border border-border/50 bg-card/50 py-10">
            <BookOpen size={48} color={MUTED_FOREGROUND_COLOR} strokeWidth={1.5} />
            <Text className="mt-3 text-sm text-muted-foreground">This shelf is empty</Text>
          </View>
        ) : (
          <View className="mx-4 overflow-hidden rounded-lg border border-border/50">
            {shelf.books.map((book, index) => (
              <Pressable
                key={book._id}
                onPress={() => router.push(`/books/${book._id}`)}
                className="flex-row items-center gap-3 border-b border-border/50 px-3 py-3 active:bg-muted/50"
                style={index === shelf.books.length - 1 ? { borderBottomWidth: 0 } : undefined}
                accessibilityRole="button"
                accessibilityLabel={`View ${book.title}`}
              >
                {/* Position number for ordered shelves */}
                {shelf.isOrdered && (
                  <View className="w-7 items-center">
                    <Text className="text-xs font-medium text-muted-foreground">
                      {(book.position ?? index) + 1}
                    </Text>
                  </View>
                )}

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
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
