import { Stack } from "expo-router";

import { useThemeColors } from "@/hooks/useThemeColors";

export default function AccountLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerTitleStyle: { color: colors.foreground },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
