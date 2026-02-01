"use client";

import { ChevronUp, Pause, Play, RotateCcw, RotateCw } from "lucide-react";

import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";

export function NowPlayingBar() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    togglePlayPause,
    skipBackward,
    skipForward,
    expand,
  } = useAudioPlayerContext();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Progress bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-3 sm:px-6">
        {/* Book cover */}
        <button
          onClick={expand}
          className="flex-shrink-0 transition-transform hover:scale-105"
          aria-label="Expand player"
        >
          <BookCover
            coverImageR2Key={currentTrack.coverImageR2Key}
            title={currentTrack.bookTitle}
            size="xs"
            className="h-10 w-7 rounded shadow-sm"
          />
        </button>

        {/* Track info */}
        <button onClick={expand} className="min-w-0 flex-1 text-left" aria-label="Expand player">
          <p className="truncate text-sm font-medium">{currentTrack.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{currentTrack.bookTitle}</p>
        </button>

        {/* Controls */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => skipBackward()}
            className="hidden h-8 w-8 sm:flex"
            aria-label="Skip back 15 seconds"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="h-10 w-10"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => skipForward()}
            className="hidden h-8 w-8 sm:flex"
            aria-label="Skip forward 15 seconds"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={expand}
            className="h-8 w-8"
            aria-label="Expand player"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
