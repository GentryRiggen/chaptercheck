"use client";

import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { Play } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";

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
  const { play, currentTrack, isPlaying } = useAudioPlayerContext();
  const percentage = Math.round(item.progressFraction * 100);
  const isCurrentlyPlaying = isPlaying && currentTrack?.audioFileId === item.audioFile._id;

  const handlePlay = async () => {
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
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5",
        "ring-1 ring-primary/10",
        "p-5 sm:p-6"
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
        {/* Cover */}
        <Link href={`/books/${item.bookId}`} className="group mx-auto flex-shrink-0 sm:mx-0">
          <BookCover
            coverImageR2Key={item.book.coverImageR2Key}
            title={item.book.title}
            size="lg"
            className="h-48 w-32 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105 sm:h-56 sm:w-[152px]"
          />
        </Link>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col justify-center text-center sm:text-left">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary/70">
            Continue Listening
          </p>
          <Link href={`/books/${item.bookId}`}>
            <h3 className="mb-1 text-xl font-bold leading-tight text-foreground transition-colors hover:text-primary sm:text-2xl">
              {item.book.title}
            </h3>
          </Link>
          {item.book.authors.length > 0 && (
            <p className="mb-1 text-sm text-muted-foreground">
              {item.book.authors.map((a) => a.name).join(", ")}
            </p>
          )}
          {item.book.series && (
            <p className="mb-3 text-xs italic text-primary/70">
              {item.book.series.name}
              {item.book.seriesOrder !== undefined && ` #${item.book.seriesOrder}`}
            </p>
          )}

          {/* Part info */}
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-start">
            {item.totalParts > 1 && item.audioFile.partNumber && (
              <>
                <span className="text-primary/80">
                  Part {item.audioFile.partNumber} of {item.totalParts}
                </span>
                <span>·</span>
              </>
            )}
            <span>{formatRelativeDate(item.lastListenedAt)}</span>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{percentage}% complete</p>
          </div>

          {/* Resume button */}
          <div className="flex justify-center sm:justify-start">
            <Button
              size="lg"
              className="gap-2 rounded-full px-8"
              onClick={handlePlay}
              aria-label={`Resume listening to ${item.book.title}`}
            >
              <Play className="h-5 w-5" fill="currentColor" />
              {isCurrentlyPlaying ? "Playing" : "Resume"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
