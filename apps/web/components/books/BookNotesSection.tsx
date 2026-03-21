"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Globe,
  Loader2,
  Lock,
  LogIn,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

import { FreeformNoteComposerDialog } from "./FreeformNoteComposerDialog";
import {
  formatDuration,
  formatTime,
  getAudioFileLabel,
  NoteClipPreviewDialog,
} from "./NoteClipPreviewDialog";
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
      <NoteClipPreviewDialog
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
