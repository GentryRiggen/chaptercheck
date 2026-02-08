import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShelvesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground">Shelves</Text>
        <Text className="mt-4 text-muted-foreground">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
