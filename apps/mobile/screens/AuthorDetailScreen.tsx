import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Library } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { AuthorImage } from "@/components/authors/AuthorImage";
import { BookCover } from "@/components/books/BookCover";
import { DetailSkeleton } from "@/components/skeletons/DetailSkeleton";
import { useThemeColors } from "@/hooks/useThemeColors";
import { Badge } from "@/components/ui/badge";

export default function AuthorDetailScreen() {
  const { authorId } = useLocalSearchParams<{ authorId: string }>();
  const router = useRouter();
  const colors = useThemeColors();

  const id = authorId as Id<"authors">;

  const author = useQuery(api.authors.queries.getAuthor, id ? { authorId: id } : "skip");
  const books = useQuery(api.authors.queries.getAuthorBooks, id ? { authorId: id } : "skip");
  const series = useQuery(api.authors.queries.getAuthorSeries, id ? { authorId: id } : "skip");

  // Loading state
  if (author === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Author" }} />
        <DetailSkeleton />
      </>
    );
  }

  // Not found state
  if (author === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Stack.Screen options={{ title: "Author" }} />
        <Text className="text-base text-muted-foreground">Author not found</Text>
      </View>
    );
  }

  const bookCount = books?.length ?? 0;
  const seriesCount = series?.length ?? 0;

  const statParts: string[] = [];
  if (bookCount > 0) {
    statParts.push(`${bookCount} book${bookCount !== 1 ? "s" : ""}`);
  }
  if (seriesCount > 0) {
    statParts.push(`${seriesCount} series`);
  }
  const statsLine = statParts.join(" \u00B7 ");

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: author.name }} />

      <ScrollView contentContainerClassName="pb-8">
        {/* Hero Section */}
        <View
          className="flex-row items-center"
          style={{ gap: 16, paddingHorizontal: 20, paddingTop: 24 }}
        >
          <AuthorImage imageR2Key={author.imageR2Key} name={author.name} size="lg" />
          <View className="min-w-0 flex-1">
            <Text className="text-2xl font-bold text-foreground">{author.name}</Text>
            {statsLine.length > 0 && (
              <Text className="mt-1 text-sm text-muted-foreground">{statsLine}</Text>
            )}
          </View>
        </View>

        {/* Bio Section */}
        {author.bio ? (
          <View className="mt-6 px-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              About
            </Text>
            <Text className="text-sm leading-relaxed text-foreground">{author.bio}</Text>
          </View>
        ) : null}

        {/* Series Section */}
        {series && series.length > 0 ? (
          <View className="mt-6">
            <Text className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Series
            </Text>
            {series.map((s) => (
              <Pressable
                key={s._id}
                onPress={() => router.push(`/series/${s._id}`)}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-muted/50"
              >
                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Library size={20} className="text-primary" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {s.bookCountByAuthor} book{s.bookCountByAuthor !== 1 ? "s" : ""} by{" "}
                    {author.name}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Books Section */}
        <View className="mt-6">
          <Text className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Books by {author.name}
          </Text>
          {books === undefined ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : books.length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-sm text-muted-foreground">No books yet</Text>
            </View>
          ) : (
            books.map((book, index) => (
              <React.Fragment key={book._id}>
                {index > 0 && <View className="mx-4 border-b border-border/50" />}
                <Pressable
                  onPress={() => router.push(`/books/${book._id}`)}
                  className="flex-row items-center gap-3 px-4 py-3 active:bg-muted/50"
                >
                  <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="sm" />
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
                      {book.title}
                    </Text>
                    {book.subtitle ? (
                      <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
                        {book.subtitle}
                      </Text>
                    ) : null}
                    <View className="mt-1 flex-row items-center gap-2">
                      {book.publishedYear ? (
                        <Text className="text-xs text-muted-foreground">{book.publishedYear}</Text>
                      ) : null}
                      {book.role && book.role !== "author" ? (
                        <Badge variant="secondary">{book.role}</Badge>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
