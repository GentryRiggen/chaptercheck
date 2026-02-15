import { useQuery } from "convex/react";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";

import { AuthorCard } from "@/components/authors/AuthorCard";
import { AuthorSortSelect, type AuthorSortOption } from "@/components/authors/AuthorSortSelect";
import { ListSkeleton } from "@/components/skeletons/ListSkeleton";
import { useThemeColors } from "@/hooks/useThemeColors";
import { usePaginatedList } from "@/hooks/usePaginatedList";

export default function AuthorsScreen() {
  const colors = useThemeColors();
  const { shouldSkipQuery } = useAuthReady();
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<AuthorSortOption>("name_asc");
  const debouncedSearch = useDebounce(searchInput, 300);

  const isSearchMode = debouncedSearch.length > 0;

  // Paginated query for browse mode
  const {
    items: paginatedItems,
    isLoading: isPaginatedLoading,
    isLoadingMore,
    isEmpty: isPaginatedEmpty,
    onEndReached,
    onRefresh,
    refreshing,
  } = usePaginatedList(
    api.authors.queries.listAuthors,
    { sort },
    { skip: shouldSkipQuery || isSearchMode }
  );

  // Search query (non-paginated)
  const searchResults = useQuery(
    api.authors.queries.searchAuthors,
    shouldSkipQuery || !isSearchMode ? "skip" : { search: debouncedSearch }
  );

  // Resolve which data set to display
  const items = isSearchMode ? (searchResults ?? []) : paginatedItems;
  const isLoading = isSearchMode
    ? searchResults === undefined && !shouldSkipQuery
    : isPaginatedLoading;
  const isEmpty = isSearchMode
    ? searchResults !== undefined && searchResults.length === 0
    : isPaginatedEmpty;

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
  }, []);

  const listHeader = useMemo(
    () => (
      <View className="gap-3 px-4 pb-3 pt-4">
        {/* Title row */}
        <Text className="text-2xl font-bold text-foreground">Authors</Text>

        {/* Search bar */}
        <View className="h-10 flex-row items-center rounded-lg border border-input bg-transparent px-3">
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search authors..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-2 h-10 flex-1 text-foreground"
            style={{ fontSize: 16, paddingVertical: 0 }}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Sort select (hidden during search) */}
        {!isSearchMode && (
          <View className="flex-row">
            <View className="w-40">
              <AuthorSortSelect value={sort} onChange={setSort} />
            </View>
          </View>
        )}
      </View>
    ),
    [searchInput, isSearchMode, sort, handleClearSearch]
  );

  const listFooter = useMemo(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="items-center py-4">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View className="pt-4">
          <ListSkeleton />
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View className="items-center py-16">
          <Text className="text-base text-muted-foreground">
            {isSearchMode ? "No authors match your search" : "No authors yet"}
          </Text>
        </View>
      );
    }

    return null;
  }, [isLoading, isEmpty, isSearchMode]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof items)[number] }) => <AuthorCard author={item} />,
    []
  );

  const keyExtractor = useCallback((item: (typeof items)[number]) => item._id, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={isSearchMode ? undefined : onEndReached}
        onEndReachedThreshold={0.3}
        refreshing={isSearchMode ? false : refreshing}
        onRefresh={isSearchMode ? undefined : onRefresh}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}
