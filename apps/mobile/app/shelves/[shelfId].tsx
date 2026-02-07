import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShelfDetailScreen() {
  const { shelfId } = useLocalSearchParams<{ shelfId: string }>();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Shelf Detail" }} />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-muted-foreground">Shelf ID: {shelfId}</Text>
      </View>
    </SafeAreaView>
  );
}
