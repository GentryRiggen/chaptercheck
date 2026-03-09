"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useAuth } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { Loader2, LogIn, Pause, Play, RotateCcw, RotateCw, Tag } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ACCENT_COLORS, type AccentColorName, DEFAULT_ACCENT } from "@/lib/accent-colors";
import { cn } from "@/lib/utils";

type BookNoteAudioFile = {
  _id: Id<"audioFiles">;
  displayName: string;
  fileName: string;
  partNumber?: number | null;
  chapterNumber?: number | null;
  duration: number;
};

type BookNoteCategorySummary = {
  _id: Id<"noteCategories">;
  name: string;
  colorToken: string;
};

type BookNote = {
  _id: Id<"bookNotes">;
  _creationTime: number;
  userId: Id<"users">;
  bookId: Id<"books">;
  audioFileId: Id<"audioFiles">;
  categoryId?: Id<"noteCategories"> | null;
  startSeconds: number;
  endSeconds: number;
  noteText?: string | null;
  createdAt: number;
  updatedAt: number;
  audioFile: BookNoteAudioFile;
  category: BookNoteCategorySummary | null;
};

type NoteCategory = {
  _id: Id<"noteCategories">;
  _creationTime: number;
  userId: Id<"users">;
  name: string;
  colorToken: string;
  createdAt: number;
  updatedAt: number;
};

type NoteSortOption = "timeline" | "recent";

interface BookNotesSectionProps {
  bookId: Id<"books">;
}

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
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

function getCategoryColor(colorToken: string) {
  const token = (colorToken in ACCENT_COLORS ? colorToken : DEFAULT_ACCENT) as AccentColorName;
  return ACCENT_COLORS[token].swatch;
}

function getAudioFileLabel(audioFile: BookNoteAudioFile) {
  if (audioFile.partNumber) {
    return `Part ${audioFile.partNumber} • ${audioFile.displayName || audioFile.fileName}`;
  }
  return audioFile.displayName || audioFile.fileName;
}

export function BookNotesSection({ bookId }: BookNotesSectionProps) {
  const { shouldSkipQuery, isAuthLoading } = useAuthReady();
  const { isSignedIn } = useAuth();
  const notes = useQuery(
    api.bookNotes.queries.getMyNotesForBook,
    shouldSkipQuery ? "skip" : { bookId }
  ) as BookNote[] | undefined;
  const categories = useQuery(
    api.bookNotes.queries.getMyNoteCategories,
    shouldSkipQuery ? "skip" : {}
  ) as NoteCategory[] | undefined;

  const [selectedCategoryId, setSelectedCategoryId] = useState<Id<"noteCategories"> | "all">("all");
  const [sortOption, setSortOption] = useState<NoteSortOption>("timeline");
  const [previewNote, setPreviewNote] = useState<BookNote | null>(null);

  const noteCategories = categories ?? [];
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    const byCategory =
      selectedCategoryId === "all"
        ? notes
        : notes.filter((note) => note.category?._id === selectedCategoryId);

    if (sortOption === "recent") {
      return [...byCategory].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return [...byCategory].sort((a, b) => {
      const partDelta = (a.audioFile.partNumber ?? 0) - (b.audioFile.partNumber ?? 0);
      if (partDelta !== 0) return partDelta;
      return a.startSeconds - b.startSeconds;
    });
  }, [notes, selectedCategoryId, sortOption]);

  const notesLoading =
    isSignedIn && !shouldSkipQuery && (notes === undefined || categories === undefined);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Notes</h2>
            {notes && notes.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {notes.length} saved note{notes.length === 1 ? "" : "s"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Private clip notes for this book</p>
            )}
          </div>
        </div>

        {!isSignedIn ? (
          <div className="rounded-xl border bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Notes are private to your account. Sign in to view saved notes and clip previews.
            </p>
            <Button asChild className="mt-4">
              <Link href="/sign-in">
                <LogIn className="h-4 w-4" />
                Sign in to view notes
              </Link>
            </Button>
          </div>
        ) : isAuthLoading || notesLoading ? (
          <div className="flex items-center justify-center rounded-xl border py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <CategoryChip
                    label="All Categories"
                    active={selectedCategoryId === "all"}
                    onClick={() => setSelectedCategoryId("all")}
                  />
                  {noteCategories.map((category) => (
                    <CategoryChip
                      key={category._id}
                      label={category.name}
                      active={selectedCategoryId === category._id}
                      colorToken={category.colorToken}
                      onClick={() => setSelectedCategoryId(category._id)}
                    />
                  ))}
                </div>

                <Select
                  value={sortOption}
                  onValueChange={(value: NoteSortOption) => setSortOption(value)}
                >
                  <SelectTrigger className="w-full sm:w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeline">Timeline</SelectItem>
                    <SelectItem value="recent">Recently Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {notes && notes.length > 0
                    ? "No notes match the selected category."
                    : "No notes saved for this book yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note) => (
                  <article
                    key={note._id}
                    className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/10"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-1 h-14 w-1.5 flex-shrink-0 rounded-full"
                        style={{
                          backgroundColor: note.category
                            ? getCategoryColor(note.category.colorToken)
                            : "hsl(var(--muted-foreground))",
                        }}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-medium">
                              {note.category ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-1"
                                  style={{
                                    backgroundColor: `${getCategoryColor(note.category.colorToken)}1a`,
                                    color: getCategoryColor(note.category.colorToken),
                                  }}
                                >
                                  <Tag className="h-3 w-3" />
                                  {note.category.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Uncategorized</span>
                              )}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Updated {formatRelativeDate(note.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {note.noteText ? (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {note.noteText}
                          </p>
                        ) : (
                          <p className="text-sm italic text-muted-foreground">Saved clip</p>
                        )}

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{getAudioFileLabel(note.audioFile)}</span>
                          <span>·</span>
                          <span>
                            {formatTime(note.startSeconds)} - {formatTime(note.endSeconds)}
                          </span>
                          <span>·</span>
                          <span>{formatDuration(note.endSeconds - note.startSeconds)}</span>
                        </div>

                        <div className="pt-1">
                          <Button variant="outline" size="sm" onClick={() => setPreviewNote(note)}>
                            <Play className="h-4 w-4" />
                            Preview Clip
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BookNotePreviewDialog
        open={previewNote !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewNote(null);
          }
        }}
        note={previewNote}
      />
    </>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  colorToken,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  colorToken?: string;
}) {
  const color = colorToken ? getCategoryColor(colorToken) : undefined;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-primary/10 text-foreground"
          : "bg-background text-muted-foreground hover:bg-muted/60"
      )}
      onClick={onClick}
    >
      {color ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> : null}
      {label}
    </button>
  );
}

function BookNotePreviewDialog({
  open,
  onOpenChange,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: BookNote | null;
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

  const duration = note ? Math.max(note.endSeconds - note.startSeconds, 0) : 0;

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
    const elapsed = Math.max(0, audioRef.current.currentTime - note.startSeconds);
    const bounded = Math.min(elapsed, duration);
    setCurrentTime(bounded);
    if (!isScrubbing) {
      setSliderValue(bounded);
    }
    if (audioRef.current.currentTime >= note.endSeconds) {
      audioRef.current.pause();
      audioRef.current.currentTime = note.startSeconds;
      setCurrentTime(0);
      setSliderValue(0);
      setIsPlaying(false);
    }
  };

  const ensureAudio = async () => {
    if (!note) return null;
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

      audio.currentTime = note.startSeconds;
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

    if (audio.currentTime < note.startSeconds || audio.currentTime >= note.endSeconds) {
      audio.currentTime = note.startSeconds + sliderValue;
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
    audio.currentTime = note.startSeconds + bounded;
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
    audio.currentTime = note.startSeconds;
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
                  {note.category ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1"
                      style={{
                        backgroundColor: `${getCategoryColor(note.category.colorToken)}1a`,
                        color: getCategoryColor(note.category.colorToken),
                      }}
                    >
                      <Tag className="h-3 w-3" />
                      {note.category.name}
                    </span>
                  ) : (
                    <span>Private note</span>
                  )}
                </div>
                <span>Updated {formatRelativeDate(note.updatedAt)}</span>
              </div>
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

            <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span>{getAudioFileLabel(note.audioFile)}</span>
              <span>·</span>
              <span>
                {formatTime(note.startSeconds)} - {formatTime(note.endSeconds)}
              </span>
              <span>·</span>
              <span>{formatDuration(duration)}</span>
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
