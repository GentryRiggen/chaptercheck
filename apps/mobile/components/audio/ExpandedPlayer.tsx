import { cn } from "@chaptercheck/tailwind-config/cn";
import { ChevronDown, Minus, Pause, Play, Plus, Square } from "lucide-react-native";
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
import { ReplayBackwardIcon } from "@/components/icons/ReplayBackwardIcon";
import { ReplayForwardIcon } from "@/components/icons/ReplayForwardIcon";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticLight, hapticMedium } from "@/lib/haptics";

const MIN_SPEED = 0.5;
const MAX_SPEED = 3;
const SPEED_STEP = 0.25;

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
  const colors = useThemeColors();

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
            <ChevronDown size={28} color={colors.foreground} />
          </Pressable>

          <Text className="font-semibold text-foreground">Now Playing</Text>

          <Pressable
            onPress={stop}
            accessibilityRole="button"
            accessibilityLabel="Stop playback"
            className="active:opacity-70"
          >
            <Square size={22} color={colors.mutedForeground} fill={colors.mutedForeground} />
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
            onPress={() => {
              hapticLight();
              skipBackward();
            }}
            accessibilityRole="button"
            accessibilityLabel="Skip back 15 seconds"
            className="active:opacity-70"
          >
            <ReplayBackwardIcon size={36} color={colors.foreground} />
          </Pressable>

          <Pressable
            onPress={() => {
              hapticMedium();
              togglePlayPause();
            }}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
            className={cn(
              "h-16 w-16 items-center justify-center rounded-full bg-primary",
              "active:opacity-70"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : isPlaying ? (
              <Pause size={32} color={colors.primaryForeground} fill={colors.primaryForeground} />
            ) : (
              <Play size={32} color={colors.primaryForeground} fill={colors.primaryForeground} />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              hapticLight();
              skipForward();
            }}
            accessibilityRole="button"
            accessibilityLabel="Skip forward 30 seconds"
            className="active:opacity-70"
          >
            <ReplayForwardIcon size={36} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Playback speed */}
        <View className="flex-row items-center justify-center px-6 pb-4" style={{ gap: 16 }}>
          <Pressable
            onPress={() => {
              hapticLight();
              setPlaybackRate(
                Math.max(MIN_SPEED, Math.round((playbackRate - SPEED_STEP) * 100) / 100)
              );
            }}
            disabled={playbackRate <= MIN_SPEED}
            accessibilityRole="button"
            accessibilityLabel="Decrease speed"
            className={cn(
              "h-9 w-9 items-center justify-center rounded-full border border-border active:bg-muted",
              playbackRate <= MIN_SPEED && "opacity-30"
            )}
          >
            <Minus size={16} color={colors.foreground} />
          </Pressable>

          <Text className="w-14 text-center text-base font-semibold text-foreground">
            {playbackRate}x
          </Text>

          <Pressable
            onPress={() => {
              hapticLight();
              setPlaybackRate(
                Math.min(MAX_SPEED, Math.round((playbackRate + SPEED_STEP) * 100) / 100)
              );
            }}
            disabled={playbackRate >= MAX_SPEED}
            accessibilityRole="button"
            accessibilityLabel="Increase speed"
            className={cn(
              "h-9 w-9 items-center justify-center rounded-full border border-border active:bg-muted",
              playbackRate >= MAX_SPEED && "opacity-30"
            )}
          >
            <Plus size={16} color={colors.foreground} />
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export { ExpandedPlayer };
