"use client";

import type {
  OpenLibraryAuthorSuggestion,
  OpenLibraryBookSuggestion,
} from "@chaptercheck/convex-backend/openLibrary/types";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BookSuggestionsProps {
  query: string;
  suggestions: OpenLibraryBookSuggestion[];
  isLoading: boolean;
  onSelect: (suggestion: OpenLibraryBookSuggestion) => void;
  onDismiss: () => void;
}

interface AuthorSuggestionsProps {
  query: string;
  suggestions: OpenLibraryAuthorSuggestion[];
  isLoading: boolean;
  onSelect: (suggestion: OpenLibraryAuthorSuggestion) => void;
  onDismiss: () => void;
}

export function BookSuggestions({
  query,
  suggestions,
  isLoading,
  onSelect,
  onDismiss,
}: BookSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onDismiss]);

  // Don't show if query is too short
  if (query.trim().length < 2) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
        <div className="flex items-center gap-2 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Searching Open Library...</span>
        </div>
      </div>
    );
  }

  // Don't show empty state if no results
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onDismiss} />
      <div
        ref={containerRef}
        className="absolute z-50 mt-1 max-h-[300px] w-full overflow-auto rounded-md border bg-background shadow-lg"
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Suggestions from Open Library
        </div>
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.key}
            type="button"
            className={`flex w-full gap-3 px-2 py-2 text-left transition-colors hover:bg-muted ${
              index === selectedIndex ? "bg-muted" : ""
            }`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {suggestion.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={suggestion.coverUrl}
                alt=""
                className="h-[60px] w-[40px] flex-shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-[60px] w-[40px] flex-shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                No cover
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{suggestion.title}</div>
              {suggestion.authors.length > 0 && (
                <div className="truncate text-sm text-muted-foreground">
                  by {suggestion.authors.map((a) => a.name).join(", ")}
                </div>
              )}
              <div className="flex gap-2 text-xs text-muted-foreground">
                {suggestion.publishedYear && <span>{suggestion.publishedYear}</span>}
                {suggestion.language && <span>{suggestion.language}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

export function AuthorSuggestions({
  query,
  suggestions,
  isLoading,
  onSelect,
  onDismiss,
}: AuthorSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onDismiss]);

  // Don't show if query is too short
  if (query.trim().length < 2) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
        <div className="flex items-center gap-2 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Searching Open Library...</span>
        </div>
      </div>
    );
  }

  // Don't show empty state if no results
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onDismiss} />
      <div
        ref={containerRef}
        className="absolute z-50 mt-1 max-h-[300px] w-full overflow-auto rounded-md border bg-background shadow-lg"
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Suggestions from Open Library
        </div>
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.key}
            type="button"
            className={`flex w-full gap-3 px-2 py-2 text-left transition-colors hover:bg-muted ${
              index === selectedIndex ? "bg-muted" : ""
            }`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {suggestion.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={suggestion.photoUrl}
                alt=""
                className="h-[40px] w-[40px] flex-shrink-0 rounded-full object-cover"
                onError={(e) => {
                  // Hide broken images (Open Library returns placeholder for missing photos)
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                ?
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{suggestion.name}</div>
              {suggestion.topWork && (
                <div className="truncate text-sm text-muted-foreground">
                  Author of &ldquo;{suggestion.topWork}&rdquo;
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
