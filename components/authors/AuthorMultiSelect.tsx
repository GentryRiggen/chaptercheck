"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthorDialog } from "./AuthorDialog";

interface AuthorMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function AuthorMultiSelect({ value, onChange }: AuthorMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [initialAuthorName, setInitialAuthorName] = useState("");

  const authors = useQuery(api.authors.queries.getAllAuthors, {});

  const selectedAuthors = useMemo(() => {
    if (!authors) return [];
    return authors.filter((author) => value.includes(author._id));
  }, [authors, value]);

  const filteredAuthors = useMemo(() => {
    if (!authors) return [];
    if (!search.trim()) return authors;
    const searchLower = search.toLowerCase();
    return authors.filter((author) =>
      author.name.toLowerCase().includes(searchLower)
    );
  }, [authors, search]);

  const handleSelect = (authorId: string) => {
    if (value.includes(authorId)) {
      onChange(value.filter((id) => id !== authorId));
    } else {
      onChange([...value, authorId]);
    }
  };

  const handleRemove = (authorId: string) => {
    onChange(value.filter((id) => id !== authorId));
  };

  const handleAuthorCreated = (authorId: Id<"authors">) => {
    onChange([...value, authorId]);
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
            {selectedAuthors.length > 0
              ? `${selectedAuthors.length} author${selectedAuthors.length !== 1 ? "s" : ""} selected`
              : "Select authors..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search authors..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {authors === undefined ? "Loading..." : "No authors found."}
              </CommandEmpty>
              {filteredAuthors.length > 0 && (
                <CommandGroup>
                  {filteredAuthors.map((author) => (
                    <CommandItem
                      key={author._id}
                      value={author._id}
                      onSelect={() => handleSelect(author._id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(author._id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {author.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setInitialAuthorName(search.trim());
                    setOpen(false);
                    setCreateDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create new author{search.trim() ? ` "${search.trim()}"` : ""}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAuthors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedAuthors.map((author) => (
            <Badge
              key={author._id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {author.name}
              <button
                type="button"
                onClick={() => handleRemove(author._id)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {author.name}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      <AuthorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(authorId) => {
          handleAuthorCreated(authorId);
          setSearch("");
          setInitialAuthorName("");
        }}
        initialName={initialAuthorName}
      />
    </div>
  );
}
