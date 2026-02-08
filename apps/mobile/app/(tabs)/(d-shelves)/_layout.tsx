import { Stack } from "expo-router";

export default function ShelvesLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
