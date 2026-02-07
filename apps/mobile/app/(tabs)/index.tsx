import { useQuery } from "convex/react";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@chaptercheck/convex-backend/_generated/api";

export default function BooksScreen() {
  const books = useQuery(api.books.queries.listBooks, {
    paginationOpts: { numItems: 20, cursor: null },
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground">Books</Text>
        {books === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="hsl(120, 13%, 60%)" />
          </View>
        ) : (
          <Text className="mt-4 text-muted-foreground">{books.page.length} books loaded</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
