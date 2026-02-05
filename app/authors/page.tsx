"use client";

import { useQuery } from "convex/react";
import { ArrowUpDown, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthorCard } from "@/components/authors/AuthorCard";
import { AuthorDialog } from "@/components/authors/AuthorDialog";
import { AuthorImage } from "@/components/authors/AuthorImage";
import { RoleGate } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [sort, setSort] = useState<"name_asc" | "name_desc" | "recent">("name_asc");
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
    { sort },
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
            {!isSearching && (
              <Select value={sort} onValueChange={(v: typeof sort) => setSort(v)}>
                <SelectTrigger
                  className={cn(
                    "w-[130px] shrink-0 transition-all duration-200",
                    scrolled ? "h-7" : "h-8"
                  )}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name A-Z</SelectItem>
                  <SelectItem value="name_desc">Name Z-A</SelectItem>
                  <SelectItem value="recent">Recently Added</SelectItem>
                </SelectContent>
              </Select>
            )}
            <RoleGate minRole="editor">
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
            </RoleGate>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 pb-24 sm:px-6 lg:px-8">
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
                <RoleGate minRole="editor">
                  <Button variant="link" size="sm" onClick={() => setDialogOpen(true)}>
                    Create your first author
                  </Button>
                </RoleGate>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Mobile list layout */}
            <div className="divide-y divide-border/50 rounded-lg bg-card/60 sm:hidden">
              {authors?.map((author) => (
                <Link
                  key={author._id}
                  href={`/authors/${author._id}`}
                  className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <AuthorImage imageR2Key={author.imageR2Key} name={author.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-1 text-sm font-semibold text-foreground">
                      {author.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {author.bookCount} book{author.bookCount !== 1 ? "s" : ""}
                      {author.seriesCount > 0 && ` · ${author.seriesCount} series`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop card grid */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {authors?.map((author) => (
                <AuthorCard key={author._id} author={author} />
              ))}
            </div>
          </>
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
