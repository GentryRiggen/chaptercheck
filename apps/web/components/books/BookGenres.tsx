"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BookGenresProps {
  bookId: Id<"books">;
}

const MAX_VISIBLE_GENRES = 5;

export function BookGenres({ bookId }: BookGenresProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const genres = useQuery(api.bookGenreVotes.queries.getGenresForBook, { bookId });
  const toggleVote = useMutation(api.bookGenreVotes.mutations.toggleGenreVote);

  if (genres === undefined) {
    return null; // Loading
  }

  if (genres.length === 0) {
    return null; // No genres to show
  }

  const visibleGenres = isExpanded ? genres : genres.slice(0, MAX_VISIBLE_GENRES);
  const hasMore = genres.length > MAX_VISIBLE_GENRES;

  const handleToggleVote = async (genreId: Id<"genres">) => {
    await toggleVote({ bookId, genreId });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleGenres.map((genre) => (
        <button
          key={genre._id}
          type="button"
          onClick={() => handleToggleVote(genre._id)}
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1"
        >
          <Badge
            variant={genre.userHasVoted ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              genre.userHasVoted
                ? "hover:bg-primary/80"
                : "hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            )}
          >
            {genre.name}
            <span
              className={cn(
                "ml-1.5 text-xs",
                genre.userHasVoted ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {genre.voteCount}
            </span>
          </Badge>
        </button>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {isExpanded ? "Show less" : `Show all (${genres.length})`}
        </button>
      )}
    </div>
  );
}
