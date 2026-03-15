"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useAuth } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import {
  Globe,
  Loader2,
  Lock,
  LogIn,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Tag,
  Trash2,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

import { FreeformNoteComposerDialog } from "./FreeformNoteComposerDialog";
import { NoteDeleteDialog } from "./NoteDeleteDialog";
import { ENTRY_TYPES, type EntryType, EntryTypeBadge, EntryTypeFilterChip } from "./NoteEntryType";

type BookNoteAudioFile = {
  _id: Id<"audioFiles">;
  displayName: string;
  fileName: string;
  partNumber?: number | null;
  chapterNumber?: number | null;
  duration: number;
};

type MemoryTag = {
  _id: Id<"memoryTags">;
  name: string;
  normalizedName: string;
};

type BookNote = {
  _id: Id<"bookNotes">;
  _creationTime: number;
  userId: Id<"users">;
  bookId: Id<"books">;
  entryType?: string;
  audioFileId?: Id<"audioFiles"> | null;
  categoryId?: Id<"noteCategories"> | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  noteText?: string | null;
  sourceText?: string | null;
  isPublic?: boolean | null;
  createdAt: number;
  updatedAt: number;
  audioFile: BookNoteAudioFile | null;
  category: { _id: Id<"noteCategories">; name: string; colorToken: string } | null;
  tags: MemoryTag[];
};

type NoteSortOption = "timeline" | "recent" | "type";

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

  const memoryTags = useQuery(
    api.bookNotes.queries.getMyMemoryTags,
    shouldSkipQuery ? "skip" : {}
  ) as MemoryTag[] | undefined;

  const [selectedEntryType, setSelectedEntryType] = useState<EntryType | "all">("all");
  const [selectedTagId, setSelectedTagId] = useState<Id<"memoryTags"> | "all">("all");
  const [sortOption, setSortOption] = useState<NoteSortOption>("timeline");
  const [previewNote, setPreviewNote] = useState<BookNote | null>(null);

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<BookNote | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<Id<"bookNotes"> | null>(null);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];

    let filtered = notes;

    // Filter by entry type
    if (selectedEntryType !== "all") {
      filtered = filtered.filter((note) => (note.entryType ?? "note") === selectedEntryType);
    }

    // Filter by tag
    if (selectedTagId !== "all") {
      filtered = filtered.filter((note) => note.tags.some((t) => t._id === selectedTagId));
    }

    // Sort
    if (sortOption === "recent") {
      return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    if (sortOption === "type") {
      return [...filtered].sort((a, b) => {
        const typeA = a.entryType ?? "note";
        const typeB = b.entryType ?? "note";
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        return b.updatedAt - a.updatedAt;
      });
    }

    // Timeline: audio-anchored notes sorted by part/time, then freeform by date
    return [...filtered].sort((a, b) => {
      const aHasAudio = a.audioFile !== null;
      const bHasAudio = b.audioFile !== null;

      // Audio-anchored notes come first
      if (aHasAudio && !bHasAudio) return -1;
      if (!aHasAudio && bHasAudio) return 1;

      if (aHasAudio && bHasAudio) {
        const partDelta = (a.audioFile!.partNumber ?? 0) - (b.audioFile!.partNumber ?? 0);
        if (partDelta !== 0) return partDelta;
        return (a.startSeconds ?? 0) - (b.startSeconds ?? 0);
      }

      // Freeform notes: by creation date
      return a.createdAt - b.createdAt;
    });
  }, [notes, selectedEntryType, selectedTagId, sortOption]);

  const notesLoading =
    isSignedIn && !shouldSkipQuery && (notes === undefined || memoryTags === undefined);

  // Unique tags present in current notes for filter display
  const noteTags = useMemo(() => {
    if (!notes) return [];
    const tagMap = new Map<string, MemoryTag>();
    for (const note of notes) {
      for (const tag of note.tags) {
        tagMap.set(tag._id, tag);
      }
    }
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [notes]);

  const handleEdit = (note: BookNote) => {
    setEditingNote(note);
    setComposerOpen(true);
  };

  const handleDelete = (noteId: Id<"bookNotes">) => {
    setDeletingNoteId(noteId);
    setDeleteDialogOpen(true);
  };

  const handleComposerClose = (open: boolean) => {
    setComposerOpen(open);
    if (!open) {
      setEditingNote(null);
    }
  };

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
              <p className="text-sm text-muted-foreground">Private notes for this book</p>
            )}
          </div>
          {isSignedIn && (
            <Button size="sm" onClick={() => setComposerOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Note</span>
            </Button>
          )}
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
            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  {/* Entry type filters */}
                  <div className="flex flex-wrap gap-1.5">
                    <EntryTypeFilterChip
                      entryType="all"
                      active={selectedEntryType === "all"}
                      onClick={() => setSelectedEntryType("all")}
                    />
                    {ENTRY_TYPES.map((type) => (
                      <EntryTypeFilterChip
                        key={type}
                        entryType={type}
                        active={selectedEntryType === type}
                        onClick={() => setSelectedEntryType(type)}
                      />
                    ))}
                  </div>

                  {/* Tag filters */}
                  {noteTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          selectedTagId === "all"
                            ? "border-transparent bg-primary/10 text-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted/60"
                        )}
                        onClick={() => setSelectedTagId("all")}
                      >
                        <Tag className="h-3 w-3" />
                        All Tags
                      </button>
                      {noteTags.map((tag) => (
                        <button
                          key={tag._id}
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            selectedTagId === tag._id
                              ? "border-transparent bg-primary/10 text-foreground"
                              : "bg-background text-muted-foreground hover:bg-muted/60"
                          )}
                          onClick={() => setSelectedTagId(tag._id)}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
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
                    <SelectItem value="type">By Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes list */}
            {filteredNotes.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {notes && notes.length > 0
                    ? "No notes match the selected filters."
                    : 'No notes saved for this book yet. Tap "Add Note" to create one.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note) => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    onPreview={() => setPreviewNote(note)}
                    onEdit={() => handleEdit(note)}
                    onDelete={() => handleDelete(note._id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Clip preview dialog */}
      <BookNotePreviewDialog
        open={previewNote !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewNote(null);
        }}
        note={previewNote}
      />

      {/* Freeform note composer */}
      <FreeformNoteComposerDialog
        open={composerOpen}
        onOpenChange={handleComposerClose}
        bookId={bookId}
        initialData={
          editingNote
            ? {
                noteId: editingNote._id,
                entryType: editingNote.entryType,
                noteText: editingNote.noteText,
                sourceText: editingNote.sourceText,
                isPublic: editingNote.isPublic,
                tags: editingNote.tags,
              }
            : undefined
        }
      />

      {/* Delete confirmation */}
      <NoteDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        noteId={deletingNoteId}
      />
    </>
  );
}

function NoteCard({
  note,
  onPreview,
  onEdit,
  onDelete,
}: {
  note: BookNote;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isAudioAnchored =
    note.audioFile !== null && note.startSeconds != null && note.endSeconds != null;

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/10">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Header: entry type badge + visibility + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <EntryTypeBadge entryType={note.entryType} />
              {note.isPublic ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              )}
              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <span
                      key={tag._id}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Note actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Source text (for quotes) */}
          {note.sourceText && (
            <blockquote className="border-l-2 border-amber-500/40 pl-3 text-sm italic text-muted-foreground">
              {note.sourceText}
            </blockquote>
          )}

          {/* Note text */}
          {note.noteText ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {note.noteText}
            </p>
          ) : !note.sourceText ? (
            <p className="text-sm italic text-muted-foreground">
              {isAudioAnchored ? "Saved clip" : "Empty note"}
            </p>
          ) : null}

          {/* Audio info + timestamp */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {isAudioAnchored && note.audioFile && (
              <>
                <span>{getAudioFileLabel(note.audioFile)}</span>
                <span>·</span>
                <span>
                  {formatTime(note.startSeconds!)} - {formatTime(note.endSeconds!)}
                </span>
                <span>·</span>
                <span>{formatDuration(note.endSeconds! - note.startSeconds!)}</span>
                <span>·</span>
              </>
            )}
            <span>Updated {formatRelativeDate(note.updatedAt)}</span>
          </div>

          {/* Preview clip button (only for audio-anchored notes) */}
          {isAudioAnchored && (
            <div className="pt-1">
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Play className="h-4 w-4" />
                Preview Clip
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
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
