import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { cn } from "@chaptercheck/tailwind-config/cn";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useRouter } from "expo-router";
import { Play } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { BookCover } from "@/components/books/BookCover";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";
import { useThemeColors } from "@/hooks/useThemeColors";

interface HeroListeningCardProps {
  item: {
    _id: Id<"listeningProgress">;
    bookId: Id<"books">;
    book: {
      title: string;
      coverImageR2Key?: string;
      seriesOrder?: number;
      authors: Array<{ _id: Id<"authors">; name: string }>;
      series: { _id: Id<"series">; name: string } | null;
    };
    audioFile: {
      _id: Id<"audioFiles">;
      partNumber?: number;
      duration: number;
      displayName: string;
    };
    positionSeconds: number;
    playbackRate: number;
    progressFraction: number;
    totalParts: number;
    lastListenedAt: number;
  };
}

export function HeroListeningCard({ item }: HeroListeningCardProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const { play, currentTrack, isPlaying } = useAudioPlayerContext();
  const percentage = Math.round(item.progressFraction * 100);
  const isCurrentlyPlaying = isPlaying && currentTrack?.audioFileId === item.audioFile._id;

  const handlePlay = useCallback(async () => {
    await play(
      {
        audioFileId: item.audioFile._id,
        displayName: item.audioFile.displayName,
        bookId: item.bookId,
        bookTitle: item.book.title,
        coverImageR2Key: item.book.coverImageR2Key,
        seriesName: item.book.series?.name,
        seriesOrder: item.book.seriesOrder,
        partNumber: item.audioFile.partNumber,
        totalParts: item.totalParts,
      },
      {
        initialPosition: item.positionSeconds,
        initialPlaybackRate: item.playbackRate,
      }
    );
  }, [play, item]);

  const handleNavigate = useCallback(() => {
    router.push(`/books/${item.bookId}`);
  }, [router, item.bookId]);

  const authorText = item.book.authors.map((a) => a.name).join(", ");
  const partText =
    item.totalParts > 1 && item.audioFile.partNumber !== undefined
      ? `Part ${item.audioFile.partNumber} of ${item.totalParts}`
      : null;

  return (
    <View
      className="overflow-hidden rounded-2xl bg-primary/5"
      style={{ marginHorizontal: 20, padding: 16, gap: 16 }}
    >
      <View style={{ flexDirection: "row", gap: 16 }}>
        {/* Cover */}
        <Pressable onPress={handleNavigate} className="active:opacity-80">
          <BookCover
            coverImageR2Key={item.book.coverImageR2Key}
            title={item.book.title}
            size="lg"
          />
        </Pressable>

        {/* Info */}
        <View className="flex-1 justify-center" style={{ gap: 4 }}>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
            Continue Listening
          </Text>
          <Pressable onPress={handleNavigate}>
            <Text className="text-lg font-bold text-foreground" numberOfLines={2}>
              {item.book.title}
            </Text>
          </Pressable>
          {authorText ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {authorText}
            </Text>
          ) : null}
          {item.book.series && (
            <Text className="text-[10px] italic text-primary/70" numberOfLines={1}>
              {item.book.series.name}
              {item.book.seriesOrder !== undefined && ` #${item.book.seriesOrder}`}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 2 }}>
            {partText && (
              <>
                <Text className="text-[10px] text-primary/80">{partText}</Text>
                <Text className="text-[10px] text-muted-foreground">·</Text>
              </>
            )}
            <Text className="text-[10px] text-muted-foreground">
              {formatRelativeDate(item.lastListenedAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ gap: 6 }}>
        <View className="h-2 overflow-hidden rounded-full bg-muted/60">
          <View className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
        </View>
        <Text className="text-[10px] text-muted-foreground">{percentage}% complete</Text>
      </View>

      {/* Resume button */}
      <Pressable
        onPress={handlePlay}
        className={cn(
          "flex-row items-center justify-center rounded-full bg-primary py-3 active:opacity-80"
        )}
        style={{ gap: 8 }}
        accessibilityRole="button"
        accessibilityLabel={isCurrentlyPlaying ? "Currently playing" : "Resume listening"}
      >
        <Play size={18} color={colors.primaryForeground} fill={colors.primaryForeground} />
        <Text className="text-sm font-semibold text-primary-foreground">
          {isCurrentlyPlaying ? "Playing" : "Resume"}
        </Text>
      </Pressable>
    </View>
  );
}
