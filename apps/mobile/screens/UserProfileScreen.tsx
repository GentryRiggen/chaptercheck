import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { Image } from "expo-image";
import { useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Book, BookOpen, Calendar, Lock, MessageSquare, User } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";
import { DetailSkeleton } from "@/components/skeletons/DetailSkeleton";
import { useThemeColors } from "@/hooks/useThemeColors";

/** Palette of background colors for avatar fallback, selected by name hash */
const AVATAR_COLORS = [
  "#7c3aed",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
] as const;

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function UserProfileScreen() {
  const { userId: userIdParam } = useLocalSearchParams<{ userId: string }>();
  const userId = userIdParam as Id<"users">;
  const router = useRouter();
  const colors = useThemeColors();
  const { shouldSkipQuery } = useAuthReady();

  const profile = useQuery(api.users.queries.getUserProfile, shouldSkipQuery ? "skip" : { userId });

  // Skip fetching shelves and books if profile is private and not own profile
  const isProfileHidden = profile?.isProfilePrivate === true && !profile?.isOwnProfile;

  const shelvesData = useQuery(
    api.shelves.queries.getUserShelves,
    shouldSkipQuery || !profile || isProfileHidden ? "skip" : { userId }
  );

  const readBooks = useQuery(
    api.bookUserData.queries.getUserReadBooks,
    shouldSkipQuery || !profile || isProfileHidden ? "skip" : { userId }
  );

  // Loading state
  if (profile === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile" }} />
        <DetailSkeleton />
      </>
    );
  }

  // Not found state
  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Stack.Screen options={{ title: "Not Found" }} />
        <Text className="text-lg font-semibold text-foreground">User not found</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          This user may not exist or their profile is unavailable.
        </Text>
      </View>
    );
  }

  const displayName = profile.name || "Anonymous User";
  const memberSince = formatRelativeDate(profile.createdAt);
  const canViewContent = !profile.isProfilePrivate || profile.isOwnProfile;

  return (
    <ScrollView className="flex-1 bg-background">
      <Stack.Screen options={{ title: profile.isOwnProfile ? "Your Profile" : displayName }} />

      {/* Profile header */}
      <View className="items-center px-4 pt-6">
        {/* Avatar */}
        {profile.imageUrl ? (
          <Image
            source={{ uri: profile.imageUrl }}
            alt={displayName}
            contentFit="cover"
            style={{ width: 80, height: 80, borderRadius: 40 }}
            transition={200}
          />
        ) : (
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: `${getAvatarColor(displayName)}4D` }}
          >
            {displayName !== "Anonymous User" ? (
              <Text className="text-2xl font-bold text-foreground/80">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <User size={32} color={colors.mutedForeground} />
            )}
          </View>
        )}

        {/* Name */}
        <Text className="mt-3 text-xl font-bold text-foreground">{displayName}</Text>

        {/* Stats row */}
        {profile.stats && (
          <View className="mt-3 flex-row flex-wrap items-center justify-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <Book size={14} color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground">
                <Text className="font-medium text-foreground">{profile.stats.booksRead}</Text> read
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <MessageSquare size={14} color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground">
                <Text className="font-medium text-foreground">{profile.stats.reviewsWritten}</Text>{" "}
                reviews
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <BookOpen size={14} color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground">
                <Text className="font-medium text-foreground">{profile.stats.shelvesCount}</Text>{" "}
                {profile.stats.shelvesCount === 1 ? "shelf" : "shelves"}
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <Calendar size={14} color={colors.mutedForeground} />
              <Text className="text-xs text-muted-foreground">Joined {memberSince}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Private profile message */}
      {profile.isProfilePrivate && !profile.isOwnProfile && (
        <View className="mx-4 mt-6 items-center rounded-lg border border-border/50 bg-card/50 py-10">
          <Lock size={48} color={colors.mutedForeground} strokeWidth={1.5} />
          <Text className="mt-3 text-base font-semibold text-foreground">
            This profile is private
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            {displayName} has chosen to keep their reading activity private.
          </Text>
        </View>
      )}

      {/* Shelves section */}
      {canViewContent && (
        <View className="mt-6 px-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Shelves
          </Text>

          {shelvesData === undefined ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : shelvesData.shelves.length === 0 ? (
            <View className="items-center rounded-lg border border-border/50 bg-card/50 py-8">
              <BookOpen size={40} color={colors.mutedForeground} strokeWidth={1.5} />
              <Text className="mt-2 text-sm text-muted-foreground">No shelves yet</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {shelvesData.shelves.map((shelf) => (
                <Pressable
                  key={shelf._id}
                  onPress={() => router.push(`/shelves/${shelf._id}`)}
                  className="w-[48%] rounded-xl border border-border/50 bg-card/50 p-3 active:bg-muted/50"
                  accessibilityRole="button"
                  accessibilityLabel={`View shelf ${shelf.name}`}
                >
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>
                    {shelf.name}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {shelf.bookCount} book{shelf.bookCount !== 1 ? "s" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Library section */}
      {canViewContent && (
        <View className="mt-6 px-4 pb-8">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {profile.isOwnProfile ? "Your Library" : "Library"}
          </Text>

          {readBooks === undefined ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : readBooks.length === 0 ? (
            <View className="items-center rounded-lg border border-border/50 bg-card/50 py-8">
              <Book size={40} color={colors.mutedForeground} strokeWidth={1.5} />
              <Text className="mt-2 text-sm text-muted-foreground">
                {profile.isOwnProfile
                  ? "You haven't marked any books as read yet."
                  : "No books in this library yet."}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {readBooks.map((book) => (
                <Pressable
                  key={book._id}
                  onPress={() => router.push(`/books/${book._id}`)}
                  className="w-[31%] active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel={`View ${book.title}`}
                >
                  <BookCover
                    coverImageR2Key={book.coverImageR2Key}
                    title={book.title}
                    size="card"
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
