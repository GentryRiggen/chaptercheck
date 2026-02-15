import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Monitor, Moon, Sun } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticSelection } from "@/lib/haptics";

type AppearanceOption = "system" | "light" | "dark";

const APPEARANCE_KEY = "appearance-preference";

const APPEARANCE_OPTIONS: { value: AppearanceOption; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { setColorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [preference, setPreference] = useState<AppearanceOption>("system");

  useEffect(() => {
    AsyncStorage.getItem(APPEARANCE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreference(stored);
      }
    });
  }, []);

  const handleAppearance = (option: AppearanceOption) => {
    hapticSelection();
    setPreference(option);
    setColorScheme(option);
    AsyncStorage.setItem(APPEARANCE_KEY, option);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-foreground">Account</Text>
        {user && (
          <Text className="mt-4 text-muted-foreground">
            Signed in as {user.primaryEmailAddress?.emailAddress}
          </Text>
        )}

        {/* Appearance */}
        <View className="mt-8">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Appearance
          </Text>
          <View className="flex-row gap-2">
            {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
              const isActive = preference === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => handleAppearance(value)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-3 py-2.5 ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card active:bg-muted/50"
                  }`}
                >
                  <Icon size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                  <Text
                    className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable onPress={() => signOut()} className="mt-8 rounded-lg bg-destructive px-4 py-3">
          <Text className="text-center font-semibold text-destructive-foreground">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
