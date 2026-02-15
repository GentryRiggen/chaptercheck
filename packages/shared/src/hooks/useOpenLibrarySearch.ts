import { useAction } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "@chaptercheck/convex-backend/_generated/api";

import type {
  OpenLibraryAuthorSuggestion,
  OpenLibraryBookSuggestion,
} from "../types/openLibrary";

import { useDebounce } from "./useDebounce";

interface UseOpenLibraryBookSearchResult {
  suggestions: OpenLibraryBookSuggestion[];
  isLoading: boolean;
  error: string | null;
}

interface UseOpenLibraryAuthorSearchResult {
  suggestions: OpenLibraryAuthorSuggestion[];
  isLoading: boolean;
  error: string | null;
}

export function useOpenLibraryBookSearch(query: string): UseOpenLibraryBookSearchResult {
  const [suggestions, setSuggestions] = useState<OpenLibraryBookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const searchBooks = useAction(api.openLibrary.actions.searchBooks);

  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await searchBooks({ query: debouncedQuery });
        setSuggestions(results);
      } catch (err) {
        console.error("Book search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery, searchBooks]);

  return { suggestions, isLoading, error };
}

export function useOpenLibraryAuthorSearch(query: string): UseOpenLibraryAuthorSearchResult {
  const [suggestions, setSuggestions] = useState<OpenLibraryAuthorSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const searchAuthors = useAction(api.openLibrary.actions.searchAuthors);

  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await searchAuthors({ query: debouncedQuery });
        setSuggestions(results);
      } catch (err) {
        console.error("Author search error:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedQuery, searchAuthors]);

  return { suggestions, isLoading, error };
}
