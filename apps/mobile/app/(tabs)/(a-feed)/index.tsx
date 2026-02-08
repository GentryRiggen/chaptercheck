import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-semibold text-foreground">Home</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
