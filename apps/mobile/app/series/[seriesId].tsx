import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SeriesDetailScreen() {
  const { seriesId } = useLocalSearchParams<{ seriesId: string }>();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Series Detail" }} />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-muted-foreground">Series ID: {seriesId}</Text>
      </View>
    </SafeAreaView>
  );
}
