"use client";

import {
  BookOpen,
  Lightbulb,
  MessageCircle,
  Palette,
  Quote,
  StickyNote,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const ENTRY_TYPES = [
  "note",
  "quote",
  "takeaway",
  "theme",
  "character",
  "discussion_prompt",
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

const ENTRY_TYPE_CONFIG: Record<
  EntryType,
  { label: string; icon: typeof StickyNote; className: string }
> = {
  note: {
    label: "Note",
    icon: StickyNote,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  quote: {
    label: "Quote",
    icon: Quote,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  takeaway: {
    label: "Takeaway",
    icon: Lightbulb,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  theme: {
    label: "Theme",
    icon: Palette,
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  character: {
    label: "Character",
    icon: Users,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  discussion_prompt: {
    label: "Discussion",
    icon: MessageCircle,
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
};

export function getEntryTypeConfig(entryType: string | undefined) {
  const type = (entryType ?? "note") as EntryType;
  return ENTRY_TYPE_CONFIG[type] ?? ENTRY_TYPE_CONFIG.note;
}

export function getEntryTypeLabel(entryType: string | undefined): string {
  return getEntryTypeConfig(entryType).label;
}

interface EntryTypeBadgeProps {
  entryType: string | undefined;
  size?: "sm" | "md";
  className?: string;
}

export function EntryTypeBadge({ entryType, size = "sm", className }: EntryTypeBadgeProps) {
  const config = getEntryTypeConfig(entryType);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        config.className,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {config.label}
    </Badge>
  );
}

/** Read-only display for selecting entry types in filter chips */
export function EntryTypeFilterChip({
  entryType,
  active,
  onClick,
}: {
  entryType: EntryType | "all";
  active: boolean;
  onClick: () => void;
}) {
  if (entryType === "all") {
    return (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          active
            ? "border-transparent bg-primary/10 text-foreground"
            : "bg-background text-muted-foreground hover:bg-muted/60"
        )}
        onClick={onClick}
      >
        <BookOpen className="h-3 w-3" />
        All
      </button>
    );
  }

  const config = ENTRY_TYPE_CONFIG[entryType];
  const Icon = config.icon;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? cn("border-transparent", config.className)
          : "bg-background text-muted-foreground hover:bg-muted/60"
      )}
      onClick={onClick}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </button>
  );
}
