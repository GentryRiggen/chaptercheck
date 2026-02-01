"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { BookCover } from "@/components/books/BookCover";
import { BookDialog } from "@/components/books/BookDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

export default function BooksPage() {
  const { shouldSkipQuery } = useAuthReady();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled();

  const isSearching = debouncedSearch.trim().length > 0;

  // Paginated query for browsing (when not searching)
  const {
    results: paginatedResults,
    status,
    loadMore,
  } = usePaginatedQuery(api.books.queries.listBooks, shouldSkipQuery || isSearching ? "skip" : {}, {
    initialNumItems: ITEMS_PER_PAGE,
  });

  // Search query (when searching)
  const searchResults = useQuery(
    api.books.queries.searchBooks,
    shouldSkipQuery || !isSearching ? "skip" : { search: debouncedSearch }
  );

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(ITEMS_PER_PAGE);
    }
  }, [status, loadMore]);

  // Infinite scroll
  useInfiniteScroll(loadMoreRef, handleLoadMore, { enabled: !isSearching });

  // Determine which results to show
  const books = isSearching ? searchResults : paginatedResults;
  const isLoading = isSearching ? searchResults === undefined : status === "LoadingFirstPage";
  const isLoadingMore = !isSearching && status === "LoadingMore";
  const canLoadMore = !isSearching && status === "CanLoadMore";
  const isEmpty = books !== undefined && books.length === 0 && !isLoading;

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 z-10 border-b bg-card/30 backdrop-blur-sm transition-all duration-200 sm:top-16">
        <div
          className={cn(
            "mx-auto max-w-7xl px-3 py-2.5 transition-all duration-200 sm:px-6 sm:py-3 lg:px-8",
            scrolled && "py-1.5 sm:py-2"
          )}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <h1
              className={cn(
                "shrink-0 font-bold transition-all duration-200",
                scrolled ? "text-sm sm:text-lg" : "text-lg sm:text-xl"
              )}
            >
              Books
            </h1>
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200",
                  scrolled ? "h-3.5 w-3.5" : "h-4 w-4"
                )}
              />
              <Input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={cn(
                  "transition-all duration-200",
                  scrolled ? "h-7 pl-7 text-sm" : "h-8 pl-8"
                )}
              />
            </div>
            <Button
              size="icon"
              onClick={() => setDialogOpen(true)}
              className={cn(
                "shrink-0 transition-all duration-200",
                scrolled ? "h-7 w-7" : "h-8 w-8"
              )}
            >
              <Plus
                className={cn("transition-all duration-200", scrolled ? "h-4 w-4" : "h-5 w-5")}
              />
              <span className="sr-only">Add book</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="py-8 text-center">
            {isSearching ? (
              <p className="text-sm text-muted-foreground">
                No books found for &quot;{debouncedSearch}&quot;
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">No books yet</p>
                <Button variant="link" size="sm" onClick={() => setDialogOpen(true)}>
                  Create your first book
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50 rounded-lg bg-card/60 shadow-sm">
            {books?.map((book) => (
              <Link
                key={book._id}
                href={`/books/${book._id}`}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                <BookCover coverImageR2Key={book.coverImageR2Key} title={book.title} size="sm" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-medium text-foreground">{book.title}</h2>
                  {book.authors && book.authors.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
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
