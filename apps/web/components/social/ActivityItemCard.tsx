"use client";

import { formatRelativeDate } from "@chaptercheck/shared/utils";
import { BookmarkPlus, MessageSquareText, Star } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/books/BookCover";
import { EntryTypeBadge } from "@/components/books/NoteEntryType";
import { StarRating } from "@/components/books/StarRating";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

interface ActivityItem {
  _id: string;
  type: "review" | "shelf_add" | "public_note";
  timestamp: number;
  user: { _id: string; name?: string; imageUrl?: string };
  book: { _id: string; title: string; coverImageR2Key?: string };
  rating?: number;
  reviewText?: string;
  shelfId?: string;
  shelfName?: string;
  noteText?: string;
  entryType?: string;
  sourceText?: string;
}

interface ActivityItemCardProps {
  item: ActivityItem;
  className?: string;
}

function getActionIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "review":
      return Star;
    case "shelf_add":
      return BookmarkPlus;
    case "public_note":
      return MessageSquareText;
  }
}

function getActionText(item: ActivityItem): React.ReactNode {
  switch (item.type) {
    case "review":
      return (
        <>
          reviewed{" "}
          <Link
            href={`/books/${item.book._id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {item.book.title}
          </Link>
        </>
      );
    case "shelf_add":
      return (
        <>
          added{" "}
          <Link
            href={`/books/${item.book._id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {item.book.title}
          </Link>{" "}
          to{" "}
          {item.shelfId ? (
            <Link
              href={`/shelves/${item.shelfId}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {item.shelfName}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.shelfName}</span>
          )}
        </>
      );
    case "public_note":
      return (
        <>
          shared a note on{" "}
          <Link
            href={`/books/${item.book._id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {item.book.title}
          </Link>
        </>
      );
  }
}

export function ActivityItemCard({ item, className }: ActivityItemCardProps) {
  const ActionIcon = getActionIcon(item.type);

  return (
    <article
      className={cn(
        "rounded-xl border border-border/50 bg-card/50 p-4 transition-colors hover:bg-card/80",
        className
      )}
    >
      {/* Header: avatar + action description + timestamp */}
      <div className="flex items-start gap-3">
        <Link href={`/users/${item.user._id}`} className="shrink-0">
          <UserAvatar name={item.user.name} imageUrl={item.user.imageUrl} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-muted-foreground">
            <Link
              href={`/users/${item.user._id}`}
              className="font-semibold text-foreground hover:text-primary hover:underline"
            >
              {item.user.name || "Anonymous"}
            </Link>{" "}
            {getActionText(item)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ActionIcon className="h-3 w-3" />
            <time dateTime={new Date(item.timestamp).toISOString()}>
              {formatRelativeDate(item.timestamp)}
            </time>
          </div>
        </div>

        {/* Book cover thumbnail */}
        <Link href={`/books/${item.book._id}`} className="shrink-0">
          <BookCover
            coverImageR2Key={item.book.coverImageR2Key}
            title={item.book.title}
            size="xs"
          />
        </Link>
      </div>

      {/* Content area based on activity type */}
      {item.type === "review" && (item.rating !== undefined || item.reviewText) && (
        <div className="mt-3 space-y-2 pl-11">
          {item.rating !== undefined && item.rating > 0 && (
            <StarRating value={item.rating} readonly size="sm" />
          )}
          {item.reviewText && (
            <p className="text-sm leading-relaxed text-foreground/90">
              {item.reviewText.length > 200
                ? item.reviewText.slice(0, 200) + "..."
                : item.reviewText}
            </p>
          )}
        </div>
      )}

      {item.type === "public_note" && (
        <div className="mt-3 space-y-2 pl-11">
          <EntryTypeBadge entryType={item.entryType} />
          {item.sourceText && (
            <blockquote className="border-l-2 border-amber-500/40 pl-3 text-sm italic text-muted-foreground">
              {item.sourceText.length > 150
                ? item.sourceText.slice(0, 150) + "..."
                : item.sourceText}
            </blockquote>
          )}
          {item.noteText && (
            <p className="text-sm leading-relaxed text-foreground/90">
              {item.noteText.length > 200 ? item.noteText.slice(0, 200) + "..." : item.noteText}
            </p>
          )}
        </div>
      )}

      {item.type === "shelf_add" && item.shelfName && (
        <div className="mt-3 pl-11">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <BookmarkPlus className="h-3 w-3" />
            {item.shelfName}
          </span>
        </div>
      )}
    </article>
  );
}
