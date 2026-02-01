"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { AuthorDialog } from "@/components/authors/AuthorDialog";
import { AuthorImage } from "@/components/authors/AuthorImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

export default function AuthorsPage() {
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
  } = usePaginatedQuery(
    api.authors.queries.listAuthors,
    shouldSkipQuery || isSearching ? "skip" : {},
    { initialNumItems: ITEMS_PER_PAGE }
  );

  // Search query (when searching)
  const searchResults = useQuery(
    api.authors.queries.searchAuthors,
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
  const authors = isSearching ? searchResults : paginatedResults;
  const isLoading = isSearching ? searchResults === undefined : status === "LoadingFirstPage";
  const isLoadingMore = !isSearching && status === "LoadingMore";
  const canLoadMore = !isSearching && status === "CanLoadMore";
  const isEmpty = authors !== undefined && authors.length === 0 && !isLoading;

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
              Authors
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
              <span className="sr-only">Add author</span>
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
                No authors found for &quot;{debouncedSearch}&quot;
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">No authors yet</p>
                <Button variant="link" size="sm" onClick={() => setDialogOpen(true)}>
                  Create your first author
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {authors?.map((author) => (
              <Link
                key={author._id}
                href={`/authors/${author._id}`}
                className="group rounded-lg bg-card/60 p-3 text-center transition-colors hover:bg-muted/50"
              >
                <AuthorImage
                  imageR2Key={author.imageR2Key}
                  name={author.name}
                  size="md"
                  className="mx-auto mb-2 ring-primary/50 transition-all group-hover:ring-2"
                />
                <h2 className="truncate text-sm font-medium text-foreground">{author.name}</h2>
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
