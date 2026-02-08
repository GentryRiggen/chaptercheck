import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCard } from "@/components/books/BookCard";
import { GenreFilter } from "@/components/books/GenreFilter";
import { SortSelect, type SortOption } from "@/components/books/SortSelect";
import { usePaginatedList } from "@/hooks/usePaginatedList";

const PRIMARY_COLOR = "hsl(120, 13%, 60%)";
const MUTED_FOREGROUND = "hsl(220, 9%, 46%)";

export default function BooksScreen() {
  const { shouldSkipQuery } = useAuthReady();

  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<SortOption>("title_asc");
  const [genreFilter, setGenreFilter] = useState<Id<"genres">[]>([]);
  const debouncedSearch = useDebounce(searchInput, 300);

  const isSearchMode = debouncedSearch.trim().length > 0;
  const isFilterMode = genreFilter.length > 0 && !isSearchMode;

  // Paginated query for browse mode
  const {
    items: paginatedItems,
    isLoading: isPaginatedLoading,
    isLoadingMore,
    onEndReached,
    onRefresh,
    refreshing,
  } = usePaginatedList(
    api.books.queries.listBooks,
    { sort },
    { skip: shouldSkipQuery || isSearchMode || isFilterMode }
  );

  // Search query
  const searchResults = useQuery(
    api.books.queries.searchBooks,
    shouldSkipQuery || !isSearchMode ? "skip" : { search: debouncedSearch }
  );

  // Genre filter query
  const genreResults = useQuery(
    api.books.queries.filterBooksByGenres,
    shouldSkipQuery || isSearchMode || !isFilterMode ? "skip" : { genreIds: genreFilter, sort }
  );

  // Determine which items to display based on mode
  const items = useMemo(() => {
    if (isSearchMode) return searchResults ?? [];
    if (isFilterMode) return genreResults ?? [];
    return paginatedItems;
  }, [isSearchMode, isFilterMode, searchResults, genreResults, paginatedItems]);

  const isLoading = isSearchMode
    ? searchResults === undefined
    : isFilterMode
      ? genreResults === undefined
      : isPaginatedLoading;

  const isEmpty = !isLoading && items.length === 0;

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: (typeof items)[number] }) => <BookCard book={item} />,
    []
  );

  const keyExtractor = useCallback((item: (typeof items)[number]) => item._id, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    let message = "No books yet";
    if (isSearchMode) {
      message = "No books match your search";
    } else if (isFilterMode) {
      message = "No books match the selected genres";
    }

    return (
      <View className="flex-1 items-center justify-center px-6 py-16">
        <Text className="text-center text-sm text-muted-foreground">{message}</Text>
      </View>
    );
  }, [isLoading, isSearchMode, isFilterMode]);

  // Only use infinite scroll in browse mode
  const handleEndReached = isSearchMode || isFilterMode ? undefined : onEndReached;
  const handleRefresh = isSearchMode || isFilterMode ? undefined : onRefresh;
  const isRefreshing = isSearchMode || isFilterMode ? false : refreshing;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header area - search, sort, filter controls */}
      <View className="gap-2.5 border-b border-border/50 px-4 pb-3 pt-4">
        <Text className="text-2xl font-bold text-foreground">Books</Text>

        {/* Search bar */}
        <View className="relative">
          <View className="pointer-events-none absolute left-3 top-0 z-10 h-10 justify-center">
            <Search size={16} color={MUTED_FOREGROUND} />
          </View>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search books..."
            placeholderTextColor={MUTED_FOREGROUND}
            className="h-10 rounded-md border border-input bg-transparent pl-9 pr-9 text-foreground"
            style={{ fontSize: 16, paddingVertical: 0 }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
              className="absolute right-2 top-0 z-10 h-10 items-center justify-center px-1"
              hitSlop={8}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <X size={16} color={MUTED_FOREGROUND} />
            </Pressable>
          )}
        </View>

        {/* Sort and genre filter row - hidden during search */}
        {!isSearchMode && (
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <SortSelect value={sort} onChange={setSort} />
            </View>
            <GenreFilter value={genreFilter} onChange={setGenreFilter} />
          </View>
        )}
      </View>

      {/* Content area */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={isEmpty ? { flex: 1 } : undefined}
          keyboardDismissMode="on-drag"
        />
      )}
    </SafeAreaView>
  );
}
