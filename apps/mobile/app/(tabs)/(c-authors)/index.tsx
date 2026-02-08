import { useQuery } from "convex/react";
import { Plus, Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useDebounce } from "@chaptercheck/shared/hooks/useDebounce";

import { AuthorCard } from "@/components/authors/AuthorCard";
import { AuthorSortSelect, type AuthorSortOption } from "@/components/authors/AuthorSortSelect";
import { RoleGate } from "@/components/permissions/RoleGate";
import { usePaginatedList } from "@/hooks/usePaginatedList";

export default function AuthorsScreen() {
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
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Authors</Text>
          <RoleGate minRole="editor">
            <Pressable className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3 py-2 active:opacity-80">
              <Plus size={18} className="text-primary-foreground" />
              <Text className="text-sm font-semibold text-primary-foreground">Add</Text>
            </Pressable>
          </RoleGate>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center rounded-lg border border-input bg-transparent px-3">
          <Search size={18} className="text-muted-foreground" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search authors..."
            placeholderTextColor="hsl(120, 5%, 50%)"
            autoCapitalize="none"
            autoCorrect={false}
            className="ml-2 flex-1 py-2.5 text-base text-foreground"
          />
          {searchInput.length > 0 && (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <X size={18} className="text-muted-foreground" />
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
        <ActivityIndicator size="small" color="hsl(120, 13%, 60%)" />
      </View>
    );
  }, [isLoadingMore]);

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View className="items-center py-16">
          <ActivityIndicator size="large" color="hsl(120, 13%, 60%)" />
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
