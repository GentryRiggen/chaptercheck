"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RoleGate } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { GenreDialog } from "./GenreDialog";

interface GenreMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Book ID to pre-load user's existing votes (for review form) */
  bookId?: Id<"books">;
}

export function GenreMultiSelect({ value, onChange, bookId }: GenreMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [initialGenreName, setInitialGenreName] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);

  const genres = useQuery(api.genres.queries.getAllGenres, {});
  const myVotes = useQuery(
    api.bookGenreVotes.queries.getMyGenreVotesForBook,
    bookId ? { bookId } : "skip"
  );

  // Pre-populate with user's existing votes when editing (only once when data loads)
  useEffect(() => {
    if (!hasInitialized && myVotes && myVotes.length > 0 && value.length === 0) {
      onChange(myVotes);
      setHasInitialized(true);
    } else if (!hasInitialized && myVotes !== undefined) {
      setHasInitialized(true);
    }
  }, [myVotes, hasInitialized, value.length, onChange]);

  const selectedGenres = useMemo(() => {
    if (!genres) return [];
    return genres.filter((genre) => value.includes(genre._id));
  }, [genres, value]);

  const filteredGenres = useMemo(() => {
    if (!genres) return [];
    if (!search.trim()) return genres;
    const searchLower = search.toLowerCase();
    return genres.filter((genre) => genre.name.toLowerCase().includes(searchLower));
  }, [genres, search]);

  const handleSelect = (genreId: string) => {
    if (value.includes(genreId)) {
      onChange(value.filter((id) => id !== genreId));
    } else {
      onChange([...value, genreId]);
    }
  };

  const handleRemove = (genreId: string) => {
    onChange(value.filter((id) => id !== genreId));
  };

  const handleGenreCreated = (genreId: Id<"genres">) => {
    onChange([...value, genreId]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedGenres.length > 0
              ? `${selectedGenres.length} genre${selectedGenres.length !== 1 ? "s" : ""} selected`
              : "Select genres..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search genres..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                {genres === undefined ? "Loading..." : "No genres found."}
              </CommandEmpty>
              {filteredGenres.length > 0 && (
                <CommandGroup>
                  {filteredGenres.map((genre) => (
                    <CommandItem
                      key={genre._id}
                      value={genre._id}
                      onSelect={() => handleSelect(genre._id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(genre._id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {genre.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <RoleGate minRole="editor">
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setInitialGenreName(search.trim());
                      setOpen(false);
                      setCreateDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new genre{search.trim() ? ` "${search.trim()}"` : ""}
                  </CommandItem>
                </CommandGroup>
              </RoleGate>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedGenres.map((genre) => (
            <Badge key={genre._id} variant="secondary" className="flex items-center gap-1">
              {genre.name}
              <button
                type="button"
                onClick={() => handleRemove(genre._id)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {genre.name}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      <GenreDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(genreId) => {
          handleGenreCreated(genreId);
          setSearch("");
          setInitialGenreName("");
        }}
        initialName={initialGenreName}
      />
    </div>
  );
}
