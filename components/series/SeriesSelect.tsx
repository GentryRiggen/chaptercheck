"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, BookOpen, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";

interface SeriesSelectProps {
  value?: {
    seriesId?: Id<"series">;
    seriesOrder?: number;
  };
  onChange: (value: { seriesId?: Id<"series">; seriesOrder?: number }) => void;
  error?: string;
  currentBookId?: Id<"books">; // The book being edited (if editing)
  currentBookTitle?: string; // Title of the book being created/edited
}

export function SeriesSelect({
  value,
  onChange,
  error,
  currentBookId,
  currentBookTitle,
}: SeriesSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [localOrder, setLocalOrder] = useState<
    Array<{ id: string; title: string; isCurrent?: boolean }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 200);

  // Only search when there's a search term
  const searchResults = useQuery(
    api.series.queries.searchSeries,
    debouncedSearch.trim().length > 0 ? { searchTerm: debouncedSearch } : "skip"
  );

  // Fetch the selected series by ID
  const selectedSeries = useQuery(
    api.series.queries.getSeries,
    value?.seriesId ? { seriesId: value.seriesId } : "skip"
  );

  // Fetch books in the selected series
  const seriesBooks = useQuery(
    api.series.queries.getBooksInSeries,
    value?.seriesId ? { seriesId: value.seriesId } : "skip"
  );

  const createSeries = useMutation(api.series.mutations.createSeries);
  const reorderBooks = useMutation(api.series.mutations.reorderBooks);

  // Initialize local order when series books change
  useEffect(() => {
    if (seriesBooks && value?.seriesId) {
      const existingBooks: Array<{ id: string; title: string; isCurrent?: boolean }> = seriesBooks
        .filter((b) => b._id !== currentBookId)
        .map((b) => ({ id: b._id, title: b.title, isCurrent: false }));

      // Determine where to insert current book
      const currentPosition = value.seriesOrder ?? existingBooks.length + 1;
      const insertIndex = Math.min(Math.max(0, currentPosition - 1), existingBooks.length);

      const newOrder = [...existingBooks];
      newOrder.splice(insertIndex, 0, {
        id: "current",
        title: currentBookTitle || "This book",
        isCurrent: true,
      });
      setLocalOrder(newOrder);
    }
  }, [seriesBooks, value?.seriesId, currentBookId, currentBookTitle, value?.seriesOrder]);

  const isSearching = debouncedSearch.trim().length > 0;
  const isLoadingResults = isSearching && searchResults === undefined;

  const handleSelectSeries = (seriesId: Id<"series">) => {
    onChange({
      seriesId,
      seriesOrder: undefined, // Will be set when user positions the book
    });
    setShowDropdown(false);
    setSearchTerm("");
  };

  const handleStartCreating = () => {
    setIsCreating(true);
    setNewSeriesName(searchTerm);
  };

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) return;

    try {
      const seriesId = await createSeries({ name: newSeriesName.trim() });
      onChange({
        seriesId,
        seriesOrder: 1, // First book in new series
      });
      setIsCreating(false);
      setNewSeriesName("");
      setSearchTerm("");
      setShowDropdown(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create series");
    }
  };

  const handleRemoveSeries = () => {
    onChange({
      seriesId: undefined,
      seriesOrder: undefined,
    });
    setLocalOrder([]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...localOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setLocalOrder(newOrder);
    updateOrderFromLocal(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index === localOrder.length - 1) return;
    const newOrder = [...localOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setLocalOrder(newOrder);
    updateOrderFromLocal(newOrder);
  };

  const updateOrderFromLocal = async (order: typeof localOrder) => {
    if (!value?.seriesId) return;

    // Find position of current book
    const currentIndex = order.findIndex((b) => b.isCurrent);
    onChange({
      seriesId: value.seriesId,
      seriesOrder: currentIndex + 1,
    });

    // Reorder existing books (exclude current book placeholder)
    const existingBookIds = order.filter((b) => !b.isCurrent).map((b) => b.id as Id<"books">);

    if (existingBookIds.length > 0) {
      await reorderBooks({
        seriesId: value.seriesId,
        bookIds: existingBookIds,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Series (Optional)</Label>

        {value?.seriesId && selectedSeries ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Badge variant="secondary" className="px-3 py-2 text-sm">
                {selectedSeries.name}
              </Badge>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleRemoveSeries}>
              Remove
            </Button>
          </div>
        ) : value?.seriesId && selectedSeries === undefined ? (
          <div className="flex h-10 items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <div className="relative">
            <Input
              ref={inputRef}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
                setIsCreating(false);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search for a series..."
            />

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-lg">
                  {isCreating ? (
                    <div className="space-y-3 p-3">
                      <Input
                        value={newSeriesName}
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreateSeries();
                          }
                        }}
                        placeholder="Series name..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleCreateSeries}
                          size="sm"
                          className="flex-1"
                        >
                          Create
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsCreating(false);
                            setNewSeriesName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      {/* Create new option */}
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left transition-colors hover:bg-muted"
                        onClick={handleStartCreating}
                      >
                        <span className="font-medium text-primary">
                          + Create new series
                          {searchTerm && ` "${searchTerm}"`}
                        </span>
                      </button>

                      {/* Search prompt or results */}
                      {!isSearching ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Start typing to search for series...
                        </div>
                      ) : isLoadingResults ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Searching...</span>
                        </div>
                      ) : searchResults && searchResults.length > 0 ? (
                        <div className="border-t">
                          {searchResults.map((series) => (
                            <button
                              key={series._id}
                              type="button"
                              className="w-full px-3 py-2 text-left transition-colors hover:bg-muted"
                              onClick={() => handleSelectSeries(series._id)}
                            >
                              <div className="font-medium">{series.name}</div>
                              {series.description && (
                                <div className="line-clamp-1 text-sm text-muted-foreground">
                                  {series.description}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No series found for &quot;{debouncedSearch}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Series order UI */}
      {value?.seriesId && localOrder.length > 0 && (
        <div className="space-y-2">
          <Label>Book Order</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            Use arrows to set the position of this book in the series
          </p>
          <div className="divide-y rounded-md border bg-muted/30">
            {localOrder.map((book, index) => (
              <div
                key={book.id}
                className={`flex items-center gap-2 px-3 py-2 ${
                  book.isCurrent ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded p-0.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === localOrder.length - 1}
                    className="rounded p-0.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  #{index + 1}
                </span>
                <BookOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className={`truncate text-sm ${book.isCurrent ? "font-medium" : ""}`}>
                  {book.isCurrent ? (
                    <span className="text-primary">{book.title} (this book)</span>
                  ) : (
                    book.title
                  )}
                </span>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {/* Empty series - just show position 1 */}
      {value?.seriesId && seriesBooks && seriesBooks.length === 0 && !currentBookId && (
        <div className="text-sm text-muted-foreground">
          This will be the first book in the series.
        </div>
      )}
    </div>
  );
}
