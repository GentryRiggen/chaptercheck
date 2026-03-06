"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";
import { useQuery } from "convex/react";
import { BookOpen, Library, Search, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BookCover } from "@/components/books/BookCover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/ui/user-avatar";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();

  const results = useQuery(
    api.search.queries.searchAll,
    debouncedSearch.trim().length > 0 ? { search: debouncedSearch } : "skip"
  );

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false);
      setSearch("");
      router.push(path);
    },
    [router]
  );

  const users = results?.users ?? [];
  const series = results?.series ?? [];
  const hasResults =
    results &&
    (results.books.length > 0 ||
      results.authors.length > 0 ||
      series.length > 0 ||
      users.length > 0);
  const isSearching = debouncedSearch.trim().length > 0;

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative h-8 gap-2 text-muted-foreground sm:w-48 sm:justify-start sm:pr-2"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline-flex">Search...</span>
        <kbd className="pointer-events-none ml-auto hidden select-none rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          ⌘K
        </kbd>
      </Button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search books, authors, series, people..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-[400px]">
              {isSearching && !hasResults && results !== undefined && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}

              {!isSearching && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Start typing to search...
                </div>
              )}

              {/* Books */}
              {results && results.books.length > 0 && (
                <CommandGroup heading="Books">
                  {results.books.slice(0, 8).map((book) => (
                    <CommandItem
                      key={book._id}
                      value={`book-${book._id}`}
                      onSelect={() => handleSelect(`/books/${book._id}`)}
                      className="gap-3"
                    >
                      <BookCover
                        coverImageR2Key={book.coverImageR2Key}
                        title={book.title}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{book.title}</p>
                        {book.authors && book.authors.length > 0 && (
                          <p className="truncate text-xs text-muted-foreground">
                            {book.authors.map((a) => a.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Authors */}
              {results && results.authors.length > 0 && (
                <CommandGroup heading="Authors">
                  {results.authors.slice(0, 5).map((author) => (
                    <CommandItem
                      key={author._id}
                      value={`author-${author._id}`}
                      onSelect={() => handleSelect(`/authors/${author._id}`)}
                      className="gap-3"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{author.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {author.bookCount} {author.bookCount === 1 ? "book" : "books"}
                          {author.seriesCount > 0 && ` · ${author.seriesCount} series`}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Series */}
              {series.length > 0 && (
                <CommandGroup heading="Series">
                  {series.slice(0, 5).map((s) => (
                    <CommandItem
                      key={s._id}
                      value={`series-${s._id}`}
                      onSelect={() => handleSelect(`/series/${s._id}`)}
                      className="gap-3"
                    >
                      <Library className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.bookCount} {s.bookCount === 1 ? "book" : "books"}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* People */}
              {users.length > 0 && (
                <CommandGroup heading="People">
                  {users.slice(0, 5).map((user) => (
                    <CommandItem
                      key={user._id}
                      value={`user-${user._id}`}
                      onSelect={() => handleSelect(`/users/${user._id}`)}
                      className="gap-3"
                    >
                      <UserAvatar name={user.name} imageUrl={user.imageUrl} size="sm" />
                      <p className="truncate font-medium">{user.name || "Anonymous"}</p>
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
