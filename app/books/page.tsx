"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { BookCover } from "@/components/books/BookCover";
import { BookDialog } from "@/components/books/BookDialog";
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

export default function BooksPage() {
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
    api.books.queries.listBooks,
    isSearching ? "skip" : {},
    { initialNumItems: ITEMS_PER_PAGE }
  );

  // Search query (when searching)
  const searchResults = useQuery(
    api.books.queries.searchBooks,
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
  const books = isSearching ? searchResults : paginatedResults;
  const isLoading = isSearching
    ? searchResults === undefined
    : status === "LoadingFirstPage";
  const isLoadingMore = !isSearching && status === "LoadingMore";
  const canLoadMore = !isSearching && status === "CanLoadMore";
  const isEmpty = books !== undefined && books.length === 0 && !isLoading;

  return (
    <div className="min-h-screen">
      <header className="bg-card/40 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold">Books</h1>
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
                No books found for &quot;{debouncedSearch}&quot;
              </p>
            ) : (
              <>
                <p className="text-muted-foreground text-sm mb-3">No books yet</p>
                <Button variant="link" size="sm" onClick={() => setDialogOpen(true)}>
                  Create your first book
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-card/60 rounded-lg shadow-sm divide-y divide-border/50">
            {books?.map((book) => (
              <Link
                key={book._id}
                href={`/books/${book._id}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <BookCover
                  coverImageR2Key={book.coverImageR2Key}
                  title={book.title}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium text-sm text-foreground truncate">{book.title}</h2>
                  {book.authors && book.authors.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {book.authors.map((a) => a.name).join(", ")}
                    </p>
                  )}
                </div>
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

      <BookDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
