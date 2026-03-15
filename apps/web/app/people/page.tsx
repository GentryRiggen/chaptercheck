"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";
import { useQuery } from "convex/react";
import { Search, Users } from "lucide-react";
import { useState } from "react";

import { UserRow } from "@/components/social/UserRow";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function PeoplePage() {
  usePageTitle("People");
  const { shouldSkipQuery } = useAuthReady();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const hasQuery = debouncedSearch.trim().length > 0;

  const searchResults = useQuery(
    api.users.queries.searchUsers,
    shouldSkipQuery || !hasQuery ? "skip" : { query: debouncedSearch.trim() }
  );

  const isSearching = hasQuery && searchResults === undefined;

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">People</h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search for people by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      {!hasQuery ? (
        <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            Search for people to follow and see their reading activity.
          </p>
        </div>
      ) : isSearching ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : searchResults && searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((user) => (
            <UserRow key={user._id} user={user} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card/50 p-8 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No people found for &ldquo;{debouncedSearch.trim()}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
