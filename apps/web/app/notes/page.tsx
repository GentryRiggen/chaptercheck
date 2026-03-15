"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";
import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Globe,
  Loader2,
  Lock,
  LogIn,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";

import { BookCover } from "@/components/books/BookCover";
import { FreeformNoteComposerDialog } from "@/components/books/FreeformNoteComposerDialog";
import { NoteDeleteDialog } from "@/components/books/NoteDeleteDialog";
import {
  ENTRY_TYPES,
  type EntryType,
  EntryTypeBadge,
  EntryTypeFilterChip,
} from "@/components/books/NoteEntryType";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

type MemoryTag = {
  _id: Id<"memoryTags">;
  name: string;
  normalizedName: string;
  createdAt: number;
  updatedAt: number;
  userId: Id<"users">;
};

type AllNote = {
  _id: Id<"bookNotes">;
  _creationTime: number;
  userId: Id<"users">;
  bookId: Id<"books">;
  entryType?: string;
  audioFileId?: Id<"audioFiles"> | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  noteText?: string | null;
  sourceText?: string | null;
  isPublic?: boolean | null;
  createdAt: number;
  updatedAt: number;
  book: {
    _id: Id<"books">;
    title: string;
    coverImageR2Key: string | null;
    primaryAuthorName: string | null;
  };
  audioFile: {
    _id: Id<"audioFiles">;
    displayName: string;
    fileName: string;
    partNumber?: number | null;
    chapterNumber?: number | null;
    duration: number;
  } | null;
  tags: Array<{ _id: Id<"memoryTags">; name: string; normalizedName: string }>;
};

type SortOption = "recent" | "oldest" | "by_book";

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
  if (hrs > 0) return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  return `${secs}s`;
}

function getAudioFileLabel(audioFile: NonNullable<AllNote["audioFile"]>) {
  if (audioFile.partNumber) {
    return `Part ${audioFile.partNumber} • ${audioFile.displayName || audioFile.fileName}`;
  }
  return audioFile.displayName || audioFile.fileName;
}

export default function NotesPage() {
  return (
    <Suspense>
      <NotesPageContent />
    </Suspense>
  );
}

function NotesPageContent() {
  usePageTitle("My Notes");
  const { shouldSkipQuery, isAuthLoading } = useAuthReady();
  const { isSignedIn } = useAuth();
  const scrolled = useScrolled();

  const allNotes = useQuery(api.bookNotes.queries.getMyAllNotes, shouldSkipQuery ? "skip" : {}) as
    | AllNote[]
    | undefined;

  const memoryTags = useQuery(
    api.bookNotes.queries.getMyMemoryTags,
    shouldSkipQuery ? "skip" : {}
  ) as MemoryTag[] | undefined;

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedEntryType, setSelectedEntryType] = useState<EntryType | "all">("all");
  const [selectedTagId, setSelectedTagId] = useState<Id<"memoryTags"> | "all">("all");
  const [sortOption, setSortOption] = useState<SortOption>("recent");

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerBookId, setComposerBookId] = useState<Id<"books"> | null>(null);
  const [editingNote, setEditingNote] = useState<AllNote | null>(null);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<Id<"bookNotes"> | null>(null);

  // Book picker for "Add" flow
  const [bookPickerOpen, setBookPickerOpen] = useState(false);

  // Collapsed book groups
  const [collapsedBooks, setCollapsedBooks] = useState<Set<string>>(new Set());

  const isLoading =
    isSignedIn && !shouldSkipQuery && (allNotes === undefined || memoryTags === undefined);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    if (!allNotes) return [];
    let filtered = allNotes;

    // Search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter((note) => {
        const matchesText = note.noteText?.toLowerCase().includes(query);
        const matchesSource = note.sourceText?.toLowerCase().includes(query);
        const matchesBook = note.book.title.toLowerCase().includes(query);
        const matchesAuthor = note.book.primaryAuthorName?.toLowerCase().includes(query);
        const matchesTags = note.tags.some((t) => t.name.toLowerCase().includes(query));
        return matchesText || matchesSource || matchesBook || matchesAuthor || matchesTags;
      });
    }

    // Entry type filter
    if (selectedEntryType !== "all") {
      filtered = filtered.filter((note) => (note.entryType ?? "note") === selectedEntryType);
    }

    // Tag filter
    if (selectedTagId !== "all") {
      filtered = filtered.filter((note) => note.tags.some((t) => t._id === selectedTagId));
    }

    // Sort
    if (sortOption === "oldest") {
      return [...filtered].sort((a, b) => a.updatedAt - b.updatedAt);
    }
    if (sortOption === "by_book") {
      return [...filtered].sort((a, b) => {
        const bookCmp = a.book.title.localeCompare(b.book.title);
        if (bookCmp !== 0) return bookCmp;
        return b.updatedAt - a.updatedAt;
      });
    }
    // "recent" is default (already sorted desc by updatedAt from query)
    return filtered;
  }, [allNotes, debouncedSearch, selectedEntryType, selectedTagId, sortOption]);

  // Stats
  const stats = useMemo(() => {
    if (!allNotes) return { total: 0, books: 0, tags: 0 };
    const bookIds = new Set(allNotes.map((n) => n.bookId));
    return {
      total: allNotes.length,
      books: bookIds.size,
      tags: memoryTags?.length ?? 0,
    };
  }, [allNotes, memoryTags]);

  // Group notes by book (for "by_book" sort)
  const groupedByBook = useMemo(() => {
    if (sortOption !== "by_book") return null;
    const groups = new Map<string, { book: AllNote["book"]; notes: AllNote[] }>();
    for (const note of filteredNotes) {
      const key = note.book._id;
      const existing = groups.get(key);
      if (existing) {
        existing.notes.push(note);
      } else {
        groups.set(key, { book: note.book, notes: [note] });
      }
    }
    return Array.from(groups.values());
  }, [filteredNotes, sortOption]);

  const toggleBookCollapse = (bookId: string) => {
    setCollapsedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

  const handleEdit = (note: AllNote) => {
    setEditingNote(note);
    setComposerBookId(note.bookId);
    setComposerOpen(true);
  };

  const handleDelete = (noteId: Id<"bookNotes">) => {
    setDeletingNoteId(noteId);
    setDeleteDialogOpen(true);
  };

  const handleAddNote = (bookId: Id<"books">) => {
    setEditingNote(null);
    setComposerBookId(bookId);
    setBookPickerOpen(false);
    setComposerOpen(true);
  };

  const handleComposerClose = (open: boolean) => {
    setComposerOpen(open);
    if (!open) {
      setEditingNote(null);
      setComposerBookId(null);
    }
  };

  if (!isSignedIn && !isAuthLoading) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-4xl px-3 py-12 text-center sm:px-6 lg:px-8">
          <StickyNote className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">My Notes</h1>
          <p className="mb-6 text-muted-foreground">Sign in to view your notes across all books.</p>
          <Button asChild>
            <Link href="/sign-in">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-14 z-10 border-b bg-card/30 backdrop-blur-sm transition-all duration-200 sm:top-16">
        <div
          className={cn(
            "mx-auto max-w-4xl px-3 py-2.5 transition-all duration-200 sm:px-6 sm:py-3 lg:px-8",
            scrolled && "py-1.5 sm:py-2"
          )}
        >
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
            <div className="flex shrink-0 items-baseline gap-1.5">
              <h1
                className={cn(
                  "font-bold transition-all duration-200",
                  scrolled ? "text-sm sm:text-lg" : "text-lg sm:text-xl"
                )}
              >
                My Notes
              </h1>
            </div>

            {/* Search */}
            <div className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1">
              <Search
                className={cn(
                  "absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200",
                  scrolled ? "h-3.5 w-3.5 sm:left-2" : "h-4 w-4 sm:left-2"
                )}
              />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={cn(
                  "text-base transition-all duration-200",
                  scrolled ? "h-9 pl-8 sm:h-7 sm:pl-7" : "h-10 pl-9 sm:h-8 sm:pl-8"
                )}
              />
            </div>

            {/* Sort */}
            <Select value={sortOption} onValueChange={(v: SortOption) => setSortOption(v)}>
              <SelectTrigger
                className={cn(
                  "w-[180px] shrink-0 transition-all duration-200",
                  scrolled ? "h-7" : "h-8"
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Updated</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="by_book">By Book</SelectItem>
              </SelectContent>
            </Select>

            {/* Add button */}
            <Button
              onClick={() => setBookPickerOpen(true)}
              className={cn(
                "shrink-0 transition-all duration-200",
                scrolled ? "h-7 px-2 sm:px-3" : "h-8 px-2 sm:px-3"
              )}
            >
              <Plus
                className={cn("transition-all duration-200", scrolled ? "h-4 w-4" : "h-5 w-5")}
              />
              <span className="hidden sm:inline">Add Note</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 py-4 pb-24 sm:px-6 lg:px-8">
        {isLoading || isAuthLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats ribbon */}
            <div className="mb-4 flex gap-4 rounded-xl border bg-card p-3 text-sm">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.total}</span>
                <span className="text-muted-foreground">notes</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.books}</span>
                <span className="text-muted-foreground">books</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{stats.tags}</span>
                <span className="text-muted-foreground">tags</span>
              </div>
            </div>

            {/* Filter chips */}
            <div className="mb-4 space-y-2">
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
              {memoryTags && memoryTags.length > 0 && (
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
                  {memoryTags.map((tag) => (
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

            {/* Notes */}
            {filteredNotes.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-8 text-center">
                <StickyNote className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {allNotes && allNotes.length > 0
                    ? "No notes match your current filters."
                    : "You don't have any notes yet. Create one from a book's detail page or use the Add button above."}
                </p>
              </div>
            ) : sortOption === "by_book" && groupedByBook ? (
              <div className="space-y-4">
                {groupedByBook.map((group) => {
                  const isCollapsed = collapsedBooks.has(group.book._id);
                  return (
                    <div key={group.book._id} className="overflow-hidden rounded-xl border bg-card">
                      {/* Book header */}
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30"
                        onClick={() => toggleBookCollapse(group.book._id)}
                      >
                        <BookCover
                          coverImageR2Key={group.book.coverImageR2Key ?? undefined}
                          title={group.book.title}
                          size="xs"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-sm font-semibold">{group.book.title}</h3>
                          {group.book.primaryAuthorName && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {group.book.primaryAuthorName}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {group.notes.length} note{group.notes.length === 1 ? "" : "s"}
                        </span>
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>

                      {!isCollapsed && (
                        <div className="divide-y border-t">
                          {group.notes.map((note) => (
                            <CrossBookNoteCard
                              key={note._id}
                              note={note}
                              showBook={false}
                              onEdit={() => handleEdit(note)}
                              onDelete={() => handleDelete(note._id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note) => (
                  <CrossBookNoteCard
                    key={note._id}
                    note={note}
                    showBook
                    onEdit={() => handleEdit(note)}
                    onDelete={() => handleDelete(note._id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Book picker dialog */}
      <BookPickerDialog
        open={bookPickerOpen}
        onOpenChange={setBookPickerOpen}
        onSelect={handleAddNote}
      />

      {/* Freeform note composer */}
      {composerBookId && (
        <FreeformNoteComposerDialog
          open={composerOpen}
          onOpenChange={handleComposerClose}
          bookId={composerBookId}
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
      )}

      {/* Delete confirmation */}
      <NoteDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        noteId={deletingNoteId}
      />
    </div>
  );
}

function CrossBookNoteCard({
  note,
  showBook,
  onEdit,
  onDelete,
}: {
  note: AllNote;
  showBook: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isAudioAnchored =
    note.audioFile !== null && note.startSeconds != null && note.endSeconds != null;

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/10">
      <div className="flex gap-3">
        {/* Book cover thumbnail (when showing book info) */}
        {showBook && (
          <Link href={`/books/${note.book._id}`} className="shrink-0">
            <BookCover
              coverImageR2Key={note.book.coverImageR2Key ?? undefined}
              title={note.book.title}
              size="sm"
            />
          </Link>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              {showBook && (
                <div>
                  <Link
                    href={`/books/${note.book._id}`}
                    className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {note.book.title}
                  </Link>
                  {note.book.primaryAuthorName && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {note.book.primaryAuthorName}
                    </p>
                  )}
                </div>
              )}
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
              {note.sourceText.length > 200
                ? note.sourceText.slice(0, 200) + "..."
                : note.sourceText}
            </blockquote>
          )}

          {/* Note text */}
          {note.noteText ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {note.noteText.length > 300 ? note.noteText.slice(0, 300) + "..." : note.noteText}
            </p>
          ) : !note.sourceText ? (
            <p className="text-sm italic text-muted-foreground">
              {isAudioAnchored ? "Saved clip" : "Empty note"}
            </p>
          ) : null}

          {/* Audio info + date */}
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
        </div>
      </div>
    </article>
  );
}

/**
 * Simple book picker dialog - lets user search and select a book before opening the composer.
 * Uses the existing searchBooks query.
 */
function BookPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (bookId: Id<"books">) => void;
}) {
  const { shouldSkipQuery } = useAuthReady();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const searchResults = useQuery(
    api.books.queries.searchBooks,
    shouldSkipQuery || !open || debouncedSearch.trim().length === 0
      ? "skip"
      : { search: debouncedSearch }
  );

  // Reset search when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchInput("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a Book</DialogTitle>
          <DialogDescription>Search for a book to add a note to.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search books..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {debouncedSearch.trim().length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Type to search for a book
              </p>
            ) : searchResults === undefined ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No books found for &quot;{debouncedSearch}&quot;
              </p>
            ) : (
              <div className="divide-y">
                {searchResults.map((book) => (
                  <button
                    key={book._id}
                    type="button"
                    className="flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-muted/50"
                    onClick={() => onSelect(book._id)}
                  >
                    <BookCover
                      coverImageR2Key={book.coverImageR2Key}
                      title={book.title}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{book.title}</p>
                      {book.authors && book.authors.length > 0 && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {book.authors.map((a) => a.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
