import { formatBytes } from "@chaptercheck/shared/utils";
import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Monitor, Moon, Sun, Trash2 } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticSelection } from "@/lib/haptics";

type AppearanceOption = "system" | "light" | "dark";

const APPEARANCE_KEY = "appearance-preference";

const APPEARANCE_OPTIONS: { value: AppearanceOption; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { setColorScheme } = useColorScheme();
  const colors = useThemeColors();
  const [preference, setPreference] = useState<AppearanceOption>("system");
  const { getDownloadedBooks, getStorageUsed, deleteDownloadsForBook, deleteAllDownloads } =
    useDownloadManager();

  const downloadedBooks = getDownloadedBooks();
  const totalStorageUsed = getStorageUsed();

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

  const handleDeleteBookDownloads = (bookId: string, bookTitle: string) => {
    Alert.alert("Delete Downloads", `Remove all downloaded files for "${bookTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteDownloadsForBook(bookId),
      },
    ]);
  };

  const handleDeleteAllDownloads = () => {
    Alert.alert(
      "Delete All Downloads",
      `This will free up ${formatBytes(totalStorageUsed)}. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: () => deleteAllDownloads(),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-12">
        <Text className="text-2xl font-bold text-foreground">Settings</Text>
        {user && (
          <Text className="mt-4 text-muted-foreground">
            Signed in as {user.primaryEmailAddress?.emailAddress}
          </Text>
        )}

        {/* Downloads */}
        <View className="mt-8">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Downloads
          </Text>

          {downloadedBooks.length === 0 ? (
            <View className="rounded-lg border border-dashed border-border py-6">
              <Text className="text-center text-sm text-muted-foreground">No downloaded files</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text className="text-sm text-muted-foreground">
                {formatBytes(totalStorageUsed)} used
              </Text>

              {downloadedBooks.map((book) => (
                <View
                  key={book.bookId}
                  className="flex-row items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                      {book.bookTitle}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {book.files.length} {book.files.length === 1 ? "file" : "files"} &middot;{" "}
                      {formatBytes(book.totalSize)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDeleteBookDownloads(book.bookId, book.bookTitle)}
                    hitSlop={8}
                    className="ml-3 active:opacity-70"
                    accessibilityLabel={`Delete downloads for ${book.bookTitle}`}
                    accessibilityRole="button"
                  >
                    <Trash2 size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              ))}

              <Pressable
                onPress={handleDeleteAllDownloads}
                className="mt-1 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
              >
                <Text
                  className="text-center text-sm font-medium"
                  style={{ color: colors.destructive }}
                >
                  Delete All Downloads
                </Text>
              </Pressable>
            </View>
          )}
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}
