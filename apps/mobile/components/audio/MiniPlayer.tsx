import { Pause, Play, SkipBack, SkipForward } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";

function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    togglePlayPause,
    skipForward,
    skipBackward,
    expand,
  } = useAudioPlayerContext();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-card">
      {/* Progress bar */}
      <View className="h-0.5 w-full bg-muted">
        <View className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
      </View>

      {/* Content row */}
      <View className="h-16 flex-row items-center px-4">
        {/* Cover art - pressable to expand */}
        <Pressable
          onPress={expand}
          accessibilityRole="button"
          accessibilityLabel="Expand player"
          className="active:opacity-70"
        >
          <BookCover
            coverImageR2Key={currentTrack.coverImageR2Key}
            title={currentTrack.bookTitle}
            size="xs"
          />
        </Pressable>

        {/* Track info - pressable to expand */}
        <Pressable
          onPress={expand}
          className="ml-3 min-w-0 flex-1 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Expand player"
        >
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {currentTrack.displayName}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {currentTrack.bookTitle}
          </Text>
        </Pressable>

        {/* Controls */}
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => skipBackward()}
            accessibilityRole="button"
            accessibilityLabel="Skip back 15 seconds"
            className="active:opacity-70"
          >
            <SkipBack size={20} className="text-foreground" fill="currentColor" />
          </Pressable>

          {isLoading ? (
            <ActivityIndicator size="small" className="text-foreground" />
          ) : (
            <Pressable
              onPress={togglePlayPause}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
              className="active:opacity-70"
            >
              {isPlaying ? (
                <Pause size={28} className="text-foreground" fill="currentColor" />
              ) : (
                <Play size={28} className="text-foreground" fill="currentColor" />
              )}
            </Pressable>
          )}

          <Pressable
            onPress={() => skipForward()}
            accessibilityRole="button"
            accessibilityLabel="Skip forward 15 seconds"
            className="active:opacity-70"
          >
            <SkipForward size={20} className="text-foreground" fill="currentColor" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export { MiniPlayer };
