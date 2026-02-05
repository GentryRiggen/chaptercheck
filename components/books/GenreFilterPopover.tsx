"use client";

import { useQuery } from "convex/react";
import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface GenreFilterPopoverProps {
  value: Id<"genres">[];
  onChange: (ids: Id<"genres">[]) => void;
  scrolled: boolean;
}

export function GenreFilterPopover({ value, onChange, scrolled }: GenreFilterPopoverProps) {
  const genres = useQuery(api.genres.queries.getAllGenres);
  const [search, setSearch] = useState("");

  const filteredGenres = useMemo(() => {
    if (!genres) return undefined;
    const term = search.trim().toLowerCase();
    if (!term) return genres;
    return genres.filter((g) => g.name.toLowerCase().includes(term));
  }, [genres, search]);

  const toggle = (id: Id<"genres">) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "shrink-0 gap-1.5 transition-all duration-200",
            scrolled ? "h-7" : "h-8",
            value.length > 0 && "border-primary/50"
          )}
        >
          <Filter className="h-3.5 w-3.5 shrink-0 opacity-50" />
          <span className="hidden sm:inline">Genre</span>
          {value.length > 0 && (
            <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">{value.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="relative mb-1.5">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search genres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filteredGenres === undefined ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading...</p>
          ) : filteredGenres.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              {genres && genres.length > 0 ? "No matching genres" : "No genres yet"}
            </p>
          ) : (
            filteredGenres.map((genre) => (
              <label
                key={genre._id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={value.includes(genre._id)}
                  onCheckedChange={() => toggle(genre._id)}
                />
                {genre.name}
              </label>
            ))
          )}
        </div>
        {value.length > 0 && (
          <div className="mt-1.5 border-t pt-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-xs"
              onClick={() => onChange([])}
            >
              Clear filters
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
