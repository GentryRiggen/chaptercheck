import {
  usePaginatedQuery,
  type PaginatedQueryArgs,
  type PaginatedQueryItem,
  type PaginatedQueryReference,
} from "convex/react";
import { useCallback, useState } from "react";

/** Default number of items per page */
const DEFAULT_PAGE_SIZE = 50;

interface UsePaginatedListOptions {
  /** Number of items per page. Defaults to 50. */
  pageSize?: number;
  /** Whether to skip the query entirely. Defaults to false. */
  skip?: boolean;
}

interface UsePaginatedListResult<T> {
  /** The array of loaded items */
  items: T[];
  /** Whether the initial page is loading */
  isLoading: boolean;
  /** Whether additional pages are loading */
  isLoadingMore: boolean;
  /** Whether more items can be loaded */
  canLoadMore: boolean;
  /** Whether the list is empty (loaded but no items) */
  isEmpty: boolean;
  /** Manually trigger loading more items */
  loadMore: () => void;
  /** Callback for FlatList's onEndReached prop */
  onEndReached: () => void;
  /** Callback for FlatList's onRefresh prop (triggers Convex re-subscription) */
  onRefresh: () => void;
  /** Whether pull-to-refresh is active (for FlatList's refreshing prop) */
  refreshing: boolean;
}

/**
 * A paginated list hook adapted for React Native FlatList.
 *
 * Unlike the web version which uses IntersectionObserver, this hook
 * provides `onEndReached` and `onRefresh` callbacks designed for
 * React Native's FlatList component.
 *
 * @example
 * ```tsx
 * const { items, isLoading, isLoadingMore, onEndReached, onRefresh, refreshing } =
 *   usePaginatedList(api.books.queries.listBooks, {});
 *
 * return (
 *   <FlatList
 *     data={items}
 *     renderItem={({ item }) => <BookCard book={item} />}
 *     onEndReached={onEndReached}
 *     onEndReachedThreshold={0.5}
 *     onRefresh={onRefresh}
 *     refreshing={refreshing}
 *   />
 * );
 * ```
 */
export function usePaginatedList<Query extends PaginatedQueryReference>(
  query: Query,
  args: PaginatedQueryArgs<Query>,
  options: UsePaginatedListOptions = {}
): UsePaginatedListResult<PaginatedQueryItem<Query>> {
  const { pageSize = DEFAULT_PAGE_SIZE, skip = false } = options;
  const [refreshing, setRefreshing] = useState(false);

  const {
    results,
    status,
    loadMore: convexLoadMore,
  } = usePaginatedQuery(query, skip ? "skip" : args, { initialNumItems: pageSize });

  const isLoading = status === "LoadingFirstPage";
  const isLoadingMore = status === "LoadingMore";
  const canLoadMore = status === "CanLoadMore";
  const isEmpty = results !== undefined && results.length === 0 && !isLoading;

  const loadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      convexLoadMore(pageSize);
    }
  }, [status, convexLoadMore, pageSize]);

  // onEndReached for FlatList: load the next page when scrolling near the end
  const onEndReached = useCallback(() => {
    if (status === "CanLoadMore") {
      convexLoadMore(pageSize);
    }
  }, [status, convexLoadMore, pageSize]);

  // Pull-to-refresh: Convex queries are live, so data is always fresh.
  // We simulate refresh by briefly showing the refreshing indicator.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex subscriptions auto-update, so there is no manual refetch.
    // Show the spinner briefly to give tactile feedback.
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  return {
    items: (results ?? []) as PaginatedQueryItem<Query>[],
    isLoading,
    isLoadingMore,
    canLoadMore,
    isEmpty,
    loadMore,
    onEndReached,
    onRefresh,
    refreshing,
  };
}
