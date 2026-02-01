"use client";

import { useConvexAuth } from "convex/react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { BookCover } from "@/components/books/BookCover";
import { BookDialog } from "@/components/books/BookDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const ITEMS_PER_PAGE = 20;

export default function BooksPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isSearching = debouncedSearch.trim().length > 0;

  // Skip queries until auth is ready
  const shouldSkipQuery = isAuthLoading || !isAuthenticated;

  // Paginated query for browsing (when not searching)
  const {
    results: paginatedResults,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.books.queries.listBooks,
    shouldSkipQuery || isSearching ? "skip" : {},
    { initialNumItems: ITEMS_PER_PAGE }
  );

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
      <header className="sticky top-0 z-10 border-b bg-card/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">Books</h1>
            <div className="flex max-w-md flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Add
              </Button>
            </div>
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
