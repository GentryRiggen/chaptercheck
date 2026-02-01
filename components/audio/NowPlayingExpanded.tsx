"use client";

import { ChevronDown, Pause, Play, RotateCcw, RotateCw, Square } from "lucide-react";
import { useState } from "react";

import { PlaybackSpeedControl } from "@/components/audio/PlaybackSpeedControl";
import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function NowPlayingExpanded() {
  const [stopDialogOpen, setStopDialogOpen] = useState(false);

  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackRate,
    isExpanded,
    togglePlayPause,
    seek,
    skipBackward,
    skipForward,
    setPlaybackRate,
    collapse,
    stop,
  } = useAudioPlayerContext();

  if (!currentTrack) return null;

  const handleStop = () => {
    setStopDialogOpen(false);
    stop();
  };

  // Build context string for series/part info
  const contextParts: string[] = [];
  if (currentTrack.seriesName) {
    if (currentTrack.seriesOrder !== undefined) {
      contextParts.push(`Book ${currentTrack.seriesOrder} of ${currentTrack.seriesName}`);
    } else {
      contextParts.push(currentTrack.seriesName);
    }
  }
  if (currentTrack.totalParts > 1 && currentTrack.partNumber) {
    contextParts.push(`Part ${currentTrack.partNumber} of ${currentTrack.totalParts}`);
  }
  const contextString = contextParts.join(" • ");

  return (
    <Sheet open={isExpanded} onOpenChange={(open) => !open && collapse()}>
      <SheetContent side="bottom" className="flex h-[100dvh] flex-col p-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={collapse}
            className="h-8 w-8"
            aria-label="Collapse player"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
          <SheetTitle className="text-sm font-medium">Now Playing</SheetTitle>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setStopDialogOpen(true)}
            className="h-8 w-8"
            aria-label="Stop playback"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        {/* Stop confirmation dialog */}
        <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop playback?</DialogTitle>
              <DialogDescription>
                This will stop the current track and close the player.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStopDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleStop}>
                Stop
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Content - no scroll, everything fits */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-between px-6 py-4">
          {/* Large album art - flexible size */}
          <div className="flex min-h-0 flex-1 items-center justify-center py-2">
            <BookCover
              coverImageR2Key={currentTrack.coverImageR2Key}
              title={currentTrack.bookTitle}
              size="card"
              className="max-h-full w-auto max-w-[200px] rounded-xl shadow-2xl"
            />
          </div>

          {/* Bottom section - fixed size */}
          <div className="flex w-full max-w-sm flex-shrink-0 flex-col items-center gap-4">
            {/* Track info */}
            <div className="w-full text-center">
              <h2 className="truncate text-lg font-bold">{currentTrack.displayName}</h2>
              <p className="truncate text-sm text-muted-foreground">{currentTrack.bookTitle}</p>
              {contextString && (
                <p className="truncate text-xs text-muted-foreground/70">{contextString}</p>
              )}
            </div>

            {/* Seek slider */}
            <div className="w-full">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={([value]) => seek(value)}
                className="mb-1"
                aria-label="Seek"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
              </div>
            </div>

            {/* Large controls */}
            <div className="flex items-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => skipBackward()}
                className="h-11 w-11"
                aria-label="Skip back 15 seconds"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              <Button
                size="icon"
                variant="default"
                onClick={togglePlayPause}
                disabled={isLoading}
                className={cn("h-14 w-14 rounded-full", isLoading && "animate-pulse")}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 translate-x-0.5" />
                )}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => skipForward()}
                className="h-11 w-11"
                aria-label="Skip forward 15 seconds"
              >
                <RotateCw className="h-5 w-5" />
              </Button>
            </div>

            {/* Playback speed */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Speed</span>
              <PlaybackSpeedControl value={playbackRate} onChange={setPlaybackRate} size="sm" />
            </div>
          </div>
        </div>

        {/* Bottom safe area */}
        <SheetDescription className="sr-only">
          Audio player controls for {currentTrack.displayName}
        </SheetDescription>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </SheetContent>
    </Sheet>
  );
}
