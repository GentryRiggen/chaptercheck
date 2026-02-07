import { useConvexAuth } from "convex/react";

/**
 * Hook to check if authentication is ready for Convex queries.
 *
 * Use this to skip Convex queries until Clerk auth has synced.
 * This prevents "Not authenticated" errors during initial page load.
 *
 * @example
 * const { isAuthReady, shouldSkipQuery } = useAuthReady();
 *
 * const data = useQuery(
 *   api.books.queries.listBooks,
 *   shouldSkipQuery ? "skip" : {}
 * );
 */
export function useAuthReady() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return {
    /** True when auth state is known and user is authenticated */
    isAuthReady: !isLoading && isAuthenticated,
    /** True when auth is loading or user is not authenticated - use to skip queries */
    shouldSkipQuery: isLoading || !isAuthenticated,
    /** True while auth state is being determined */
    isAuthLoading: isLoading,
    /** True if user is authenticated (may be false during loading) */
    isAuthenticated,
  };
}
