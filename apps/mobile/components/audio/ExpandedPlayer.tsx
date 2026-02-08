import { cn } from "@chaptercheck/tailwind-config/cn";
import { ChevronDown, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react-native";
import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/components/books/BookCover";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;

/**
 * Format seconds into mm:ss or h:mm:ss.
 */
function formatTime(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Build a context line like "Book 1 of Series Name - Part 2 of 5"
 */
function buildContextLine(track: {
  seriesName?: string;
  seriesOrder?: number;
  partNumber?: number;
  totalParts: number;
}): string | null {
  const parts: string[] = [];

  if (track.seriesName) {
    const seriesPart =
      track.seriesOrder !== undefined
        ? `Book ${track.seriesOrder} of ${track.seriesName}`
        : track.seriesName;
    parts.push(seriesPart);
  }

  if (track.totalParts > 1 && track.partNumber !== undefined) {
    parts.push(`Part ${track.partNumber} of ${track.totalParts}`);
  }

  return parts.length > 0 ? parts.join(" \u2022 ") : null;
}

/**
 * A pressable seek bar that allows tapping to seek to a position.
 */
function SeekBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const trackWidth = useRef(0);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    trackWidth.current = event.nativeEvent.layout.width;
  }, []);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (duration <= 0 || trackWidth.current <= 0) return;

      const locationX = event.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, locationX / trackWidth.current));
      onSeek(ratio * duration);
    },
    [duration, onSeek]
  );

  return (
    <Pressable
      onPress={handlePress}
      onLayout={handleLayout}
      className="py-2"
      accessibilityRole="adjustable"
      accessibilityLabel="Seek position"
      accessibilityValue={{
        min: 0,
        max: Math.floor(duration),
        now: Math.floor(currentTime),
      }}
    >
      {/* Track background */}
      <View className="h-1 w-full rounded-full bg-muted">
        {/* Filled portion */}
        <View className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
        {/* Thumb indicator — centered on the 4px track: (4 - 20) / 2 = -8 */}
        <View
          className="absolute h-5 w-5 rounded-full bg-primary"
          style={{ left: `${progressPercent}%`, top: -8, marginLeft: -10 }}
          pointerEvents="none"
        />
      </View>
    </Pressable>
  );
}

function ExpandedPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackRate,
    isExpanded,
    togglePlayPause,
    skipForward,
    skipBackward,
    seek,
    setPlaybackRate,
    collapse,
    stop,
  } = useAudioPlayerContext();

  if (!currentTrack) return null;

  const contextLine = buildContextLine(currentTrack);
  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <Modal
      visible={isExpanded}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={collapse}
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable
            onPress={collapse}
            accessibilityRole="button"
            accessibilityLabel="Collapse player"
            className="active:opacity-70"
          >
            <ChevronDown size={28} className="text-foreground" />
          </Pressable>

          <Text className="font-semibold text-foreground">Now Playing</Text>

          <Pressable
            onPress={stop}
            accessibilityRole="button"
            accessibilityLabel="Stop playback"
            className="active:opacity-70"
          >
            <Square size={22} className="text-muted-foreground" fill="currentColor" />
          </Pressable>
        </View>

        {/* Album art and track info */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-[250px]">
            <BookCover
              coverImageR2Key={currentTrack.coverImageR2Key}
              title={currentTrack.bookTitle}
              size="card"
            />
          </View>

          <Text className="mt-6 text-center text-xl font-bold text-foreground" numberOfLines={2}>
            {currentTrack.displayName}
          </Text>

          <Text className="mt-1 text-center text-base text-muted-foreground" numberOfLines={1}>
            {currentTrack.bookTitle}
          </Text>

          {contextLine && (
            <Text className="mt-1 text-center text-sm text-muted-foreground" numberOfLines={1}>
              {contextLine}
            </Text>
          )}
        </View>

        {/* Seek slider */}
        <View className="px-6">
          <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />

          <View className="mt-1 flex-row justify-between">
            <Text className="text-xs text-muted-foreground">{formatTime(currentTime)}</Text>
            <Text className="text-xs text-muted-foreground">-{formatTime(remainingTime)}</Text>
          </View>
        </View>

        {/* Playback controls */}
        <View className="flex-row items-center justify-center gap-8 py-6">
          <Pressable
            onPress={() => skipBackward()}
            accessibilityRole="button"
            accessibilityLabel="Skip back 15 seconds"
            className="active:opacity-70"
          >
            <SkipBack size={28} className="text-foreground" fill="currentColor" />
          </Pressable>

          <Pressable
            onPress={togglePlayPause}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            className={cn(
              "h-16 w-16 items-center justify-center rounded-full bg-primary",
              "active:opacity-70"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" className="text-primary-foreground" />
            ) : isPlaying ? (
              <Pause size={32} className="text-primary-foreground" fill="currentColor" />
            ) : (
              <Play size={32} className="text-primary-foreground" fill="currentColor" />
            )}
          </Pressable>

          <Pressable
            onPress={() => skipForward()}
            accessibilityRole="button"
            accessibilityLabel="Skip forward 15 seconds"
            className="active:opacity-70"
          >
            <SkipForward size={28} className="text-foreground" fill="currentColor" />
          </Pressable>
        </View>

        {/* Playback speed */}
        <View className="gap-2 px-6 pb-4">
          <Text className="text-center text-xs text-muted-foreground">Speed</Text>
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            {PLAYBACK_SPEEDS.map((speed) => (
              <Pressable
                key={speed}
                onPress={() => setPlaybackRate(speed)}
                accessibilityRole="button"
                accessibilityLabel={`${speed}x speed`}
                accessibilityState={{ selected: speed === playbackRate }}
                className={cn(
                  "rounded-full px-3 py-1.5",
                  speed === playbackRate ? "bg-primary" : "border border-border active:bg-muted"
                )}
              >
                <Text
                  className={cn(
                    "text-xs font-medium",
                    speed === playbackRate ? "text-primary-foreground" : "text-foreground"
                  )}
                >
                  {speed}x
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export { ExpandedPlayer };
