"use client";

import { useQuery } from "convex/react";
import { Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthorDialog } from "@/components/authors/AuthorDialog";
import { AuthorImage } from "@/components/authors/AuthorImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePaginatedList } from "@/hooks/usePaginatedList";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/utils";

export default function AuthorsPage() {
  usePageTitle("Authors");
  const { shouldSkipQuery } = useAuthReady();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const scrolled = useScrolled();

  const isSearching = debouncedSearch.trim().length > 0;

  // Paginated query for browsing (when not searching)
  const {
    items: paginatedResults,
    isLoading: isPaginatedLoading,
    isLoadingMore,
    canLoadMore,
    loadMoreRef,
    loadMore,
  } = usePaginatedList(
    api.authors.queries.listAuthors,
    {},
    { skip: shouldSkipQuery || isSearching }
  );

  // Search query (when searching)
  const searchResults = useQuery(
    api.authors.queries.searchAuthors,
    shouldSkipQuery || !isSearching ? "skip" : { search: debouncedSearch }
  );

  // Determine which results to show
  const authors = isSearching ? searchResults : paginatedResults;
  const isLoading = isSearching ? searchResults === undefined : isPaginatedLoading;
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
                  "text-base transition-all duration-200",
                  scrolled ? "h-7 pl-7" : "h-8 pl-8"
                )}
              />
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className={cn(
                "shrink-0 transition-all duration-200",
                scrolled ? "h-7 px-2 sm:px-3" : "h-8 px-2 sm:px-3"
              )}
            >
              <Plus
                className={cn("transition-all duration-200", scrolled ? "h-4 w-4" : "h-5 w-5")}
              />
              <span className="hidden sm:inline">Add Author</span>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {authors?.map((author) => (
              <Link
                key={author._id}
                href={`/authors/${author._id}`}
                className="group relative flex flex-col items-center overflow-hidden rounded-xl bg-card/50 p-3 shadow-sm ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/30 sm:p-4"
              >
                <div className="relative mb-2 sm:mb-3">
                  <AuthorImage
                    imageR2Key={author.imageR2Key}
                    name={author.name}
                    size="card"
                    className="ring-2 ring-border/30 transition-all duration-300 group-hover:scale-105 group-hover:ring-primary/50"
                  />
                </div>
                <h2 className="line-clamp-2 text-center text-xs font-semibold leading-tight text-foreground sm:text-sm">
                  {author.name}
                </h2>
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
                <Button variant="ghost" size="sm" onClick={loadMore}>
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
