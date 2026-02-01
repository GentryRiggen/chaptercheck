"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { AuthorImage } from "@/components/authors/AuthorImage";
import { AuthorDialog } from "@/components/authors/AuthorDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

const ITEMS_PER_PAGE = 20;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AuthorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isSearching = debouncedSearch.trim().length > 0;

  // Paginated query for browsing (when not searching)
  const {
    results: paginatedResults,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.authors.queries.listAuthors,
    isSearching ? "skip" : {},
    { initialNumItems: ITEMS_PER_PAGE }
  );

  // Search query (when searching)
  const searchResults = useQuery(
    api.authors.queries.searchAuthors,
    isSearching ? { search: debouncedSearch } : "skip"
  );

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(ITEMS_PER_PAGE);
    }
  }, [status, loadMore]);

  // Intersection observer for infinite scroll (only when not searching)
  useEffect(() => {
    if (isSearching) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [handleLoadMore, isSearching]);

  // Determine which results to show
  const authors = isSearching ? searchResults : paginatedResults;
  const isLoading = isSearching
    ? searchResults === undefined
    : status === "LoadingFirstPage";
  const isLoadingMore = !isSearching && status === "LoadingMore";
  const canLoadMore = !isSearching && status === "CanLoadMore";
  const isEmpty = authors !== undefined && authors.length === 0 && !isLoading;

  return (
    <div className="min-h-screen">
      <header className="bg-card/40 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold">Authors</h1>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="text-center py-8">
            {isSearching ? (
              <p className="text-muted-foreground text-sm">
                No authors found for &quot;{debouncedSearch}&quot;
              </p>
            ) : (
              <>
                <p className="text-muted-foreground text-sm mb-3">No authors yet</p>
                <Button variant="link" size="sm" onClick={() => setDialogOpen(true)}>
                  Create your first author
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {authors?.map((author) => (
              <Link
                key={author._id}
                href={`/authors/${author._id}`}
                className="bg-card/60 rounded-lg p-3 hover:bg-muted/50 transition-colors text-center group"
              >
                <AuthorImage
                  imageR2Key={author.imageR2Key}
                  name={author.name}
                  size="md"
                  className="mx-auto mb-2 group-hover:ring-2 ring-primary/50 transition-all"
                />
                <h2 className="font-medium text-sm text-foreground truncate">{author.name}</h2>
              </Link>
            ))}
          </div>
        )}

        {/* Infinite scroll trigger (only when not searching) */}
        {!isSearching && (
          <div ref={loadMoreRef} className="py-3">
            {isLoadingMore && (
              <div className="flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {canLoadMore && !isLoadingMore && (
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={handleLoadMore}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <AuthorDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
