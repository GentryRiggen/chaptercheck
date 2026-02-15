import { usePaginatedQuery } from "convex/react";
import { type PaginatedQueryReference } from "convex/react";
import { type FunctionReturnType } from "convex/server";
import { useCallback, useEffect, useRef } from "react";

// Default page size - load more items per page to reduce API calls
const DEFAULT_PAGE_SIZE = 50;

interface UsePaginatedListOptions {
  /** Number of items per page. Defaults to 50. */
  pageSize?: number;
  /** Whether to skip the query entirely. Defaults to false. */
  skip?: boolean;
  /** Intersection observer threshold for triggering load more. Defaults to 0.1. */
  scrollThreshold?: number;
}

interface UsePaginatedListResult<T> {
  /** The array of results */
  items: T[];
  /** Whether the initial page is loading */
  isLoading: boolean;
  /** Whether additional pages are loading */
  isLoadingMore: boolean;
  /** Whether more items can be loaded */
  canLoadMore: boolean;
  /** Whether the list is empty (loaded but no items) */
  isEmpty: boolean;
  /** Ref to attach to the load more trigger element */
  loadMoreRef: React.RefObject<HTMLDivElement>;
  /** Manually trigger loading more items */
  loadMore: () => void;
}

/**
 * A centralized hook for paginated lists with infinite scroll.
 *
 * @example
 * ```tsx
 * const { items, isLoading, isLoadingMore, isEmpty, loadMoreRef } = usePaginatedList(
 *   api.books.queries.listBooks,
 *   {},
 *   { skip: !isAuthenticated }
 * );
 *
 * return (
 *   <div>
 *     {items.map(item => <ItemCard key={item._id} item={item} />)}
 *     <div ref={loadMoreRef}>
 *       {isLoadingMore && <Spinner />}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function usePaginatedList<Query extends PaginatedQueryReference>(
  query: Query,
  args: Record<string, unknown>,
  options: UsePaginatedListOptions = {}
): UsePaginatedListResult<FunctionReturnType<Query>["page"][number]> {
  const { pageSize = DEFAULT_PAGE_SIZE, skip = false, scrollThreshold = 0.1 } = options;

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    results,
    status,
    loadMore: convexLoadMore,
  } = usePaginatedQuery(
    query,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skip ? "skip" : (args as any),
    { initialNumItems: pageSize }
  );

  const loadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      convexLoadMore(pageSize);
    }
  }, [status, convexLoadMore, pageSize]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (skip) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "CanLoadMore") {
          convexLoadMore(pageSize);
        }
      },
      { threshold: scrollThreshold }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [skip, status, convexLoadMore, pageSize, scrollThreshold]);

  const isLoading = status === "LoadingFirstPage";
  const isLoadingMore = status === "LoadingMore";
  const canLoadMore = status === "CanLoadMore";
  const isEmpty = results !== undefined && results.length === 0 && !isLoading;

  return {
    items: results ?? [],
    isLoading,
    isLoadingMore,
    canLoadMore,
    isEmpty,
    loadMoreRef: loadMoreRef as React.RefObject<HTMLDivElement>,
    loadMore,
  };
}
