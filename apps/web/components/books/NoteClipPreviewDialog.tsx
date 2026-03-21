"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useAction } from "convex/react";
import { Globe, Loader2, Lock, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

import { EntryTypeBadge } from "./NoteEntryType";

type PreviewableNoteAudioFile = {
  _id: Id<"audioFiles">;
  displayName: string;
  fileName: string;
  partNumber?: number | null;
  chapterNumber?: number | null;
  duration: number;
};

export type PreviewableNote = {
  audioFileId?: Id<"audioFiles"> | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  entryType?: string;
  isPublic?: boolean | null;
  noteText?: string | null;
  sourceText?: string | null;
  updatedAt: number;
  audioFile: PreviewableNoteAudioFile | null;
};

export function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number) {
  if (!isFinite(seconds) || seconds <= 0) return "0m";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

export function getAudioFileLabel(audioFile: PreviewableNoteAudioFile) {
  if (audioFile.partNumber) {
    return `Part ${audioFile.partNumber} • ${audioFile.displayName || audioFile.fileName}`;
  }
  return audioFile.displayName || audioFile.fileName;
}

export function NoteClipPreviewDialog({
  open,
  onOpenChange,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: PreviewableNote | null;
}) {
  const generateStreamUrl = useAction(api.audioFiles.actions.generateStreamUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startSeconds = note?.startSeconds ?? 0;
  const endSeconds = note?.endSeconds ?? 0;
  const duration = Math.max(endSeconds - startSeconds, 0);

  const cleanupAudio = () => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setSliderValue(0);
    setIsScrubbing(false);
    setErrorMessage(null);
  };

  useEffect(() => cleanupAudio, []);

  useEffect(() => {
    if (!open) {
      cleanupAudio();
    }
  }, [open]);

  const syncCurrentTime = () => {
    if (!note || !audioRef.current) return;
    const elapsed = Math.max(0, audioRef.current.currentTime - startSeconds);
    const bounded = Math.min(elapsed, duration);
    setCurrentTime(bounded);
    if (!isScrubbing) {
      setSliderValue(bounded);
    }
    if (audioRef.current.currentTime >= endSeconds) {
      audioRef.current.pause();
      audioRef.current.currentTime = startSeconds;
      setCurrentTime(0);
      setSliderValue(0);
      setIsPlaying(false);
    }
  };

  const ensureAudio = async () => {
    if (!note || !note.audioFileId || !note.audioFile) return null;
    if (audioRef.current) return audioRef.current;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { streamUrl } = await generateStreamUrl({ audioFileId: note.audioFileId });
      const audio = new Audio(streamUrl);
      audio.preload = "auto";
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current = audio;
      timeUpdateIntervalRef.current = setInterval(syncCurrentTime, 200);

      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => {
          audio.removeEventListener("loadedmetadata", onLoaded);
          audio.removeEventListener("error", onError);
          resolve();
        };
        const onError = () => {
          audio.removeEventListener("loadedmetadata", onLoaded);
          audio.removeEventListener("error", onError);
          reject(new Error("Failed to load audio preview"));
        };
        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("error", onError);
      });

      audio.currentTime = startSeconds;
      setIsLoading(false);
      return audio;
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load audio preview");
      return null;
    }
  };

  const togglePlayPause = async () => {
    if (!note) return;
    const audio = await ensureAudio();
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    if (audio.currentTime < startSeconds || audio.currentTime >= endSeconds) {
      audio.currentTime = startSeconds + sliderValue;
    }

    try {
      await audio.play();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Playback failed");
    }
  };

  const seekTo = async (nextValue: number) => {
    if (!note) return;
    const audio = await ensureAudio();
    if (!audio) return;
    const bounded = Math.max(0, Math.min(nextValue, duration));
    audio.currentTime = startSeconds + bounded;
    setCurrentTime(bounded);
    setSliderValue(bounded);
  };

  const skipBy = async (delta: number) => {
    await seekTo(currentTime + delta);
  };

  const resetPlayback = async () => {
    if (!note) return;
    const audio = await ensureAudio();
    if (!audio) return;
    audio.pause();
    audio.currentTime = startSeconds;
    setCurrentTime(0);
    setSliderValue(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Note Clip</DialogTitle>
          <DialogDescription>
            Playback here is separate from your main audiobook player and does not save progress.
          </DialogDescription>
        </DialogHeader>

        {note ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <EntryTypeBadge entryType={note.entryType} />
                  {note.isPublic ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Globe className="h-3 w-3" />
                      Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      <Lock className="h-3 w-3" />
                      Private
                    </span>
                  )}
                </div>
                <span>Updated {formatRelativeDate(note.updatedAt)}</span>
              </div>

              {note.sourceText && (
                <blockquote className="border-l-2 border-amber-500/40 pl-3 text-sm italic text-muted-foreground">
                  {note.sourceText}
                </blockquote>
              )}

              {note.noteText ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.noteText}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">Saved clip</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(isScrubbing ? sliderValue : currentTime)}</span>
                <span>
                  -{formatTime(Math.max(duration - (isScrubbing ? sliderValue : currentTime), 0))}
                </span>
              </div>
              <Slider
                value={[isScrubbing ? sliderValue : currentTime]}
                max={Math.max(duration, 1)}
                step={1}
                onValueChange={([value]) => setSliderValue(value)}
                onValueCommit={(values) => {
                  setIsScrubbing(false);
                  void seekTo(values[0] ?? 0);
                }}
                onPointerDown={() => setIsScrubbing(true)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => void skipBy(-15)}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => void togglePlayPause()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={() => void skipBy(15)}
                disabled={isLoading}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => void resetPlayback()}
                disabled={isLoading && !audioRef.current}
              >
                Reset
              </Button>
            </div>

            {note.audioFile && (
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{getAudioFileLabel(note.audioFile)}</span>
                <span>·</span>
                <span>
                  {formatTime(startSeconds)} - {formatTime(endSeconds)}
                </span>
                <span>·</span>
                <span>{formatDuration(duration)}</span>
              </div>
            )}

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
