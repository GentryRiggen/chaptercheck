import { api } from "@chaptercheck/convex-backend/_generated/api";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";
import { cn } from "@chaptercheck/tailwind-config/cn";
import { useAuthReady } from "@chaptercheck/shared/hooks/useAuthReady";
import { useQuery } from "convex/react";
import { SlidersHorizontal } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useThemeColors } from "@/hooks/useThemeColors";

interface GenreFilterProps {
  value: Id<"genres">[];
  onChange: (ids: Id<"genres">[]) => void;
}

function GenreFilter({ value, onChange }: GenreFilterProps) {
  const colors = useThemeColors();
  const { shouldSkipQuery } = useAuthReady();
  const genres = useQuery(api.genres.queries.getAllGenres, shouldSkipQuery ? "skip" : {});

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredGenres = useMemo(() => {
    if (!genres) return undefined;
    const term = search.trim().toLowerCase();
    if (!term) return genres;
    return genres.filter((g) => g.name.toLowerCase().includes(term));
  }, [genres, search]);

  const handleToggle = useCallback(
    (id: Id<"genres">) => {
      if (value.includes(id)) {
        onChange(value.filter((v) => v !== id));
      } else {
        onChange([...value, id]);
      }
    },
    [value, onChange]
  );

  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearch("");
    }
  }, []);

  const hasActiveFilters = value.length > 0;

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className={cn(
          "h-10 flex-row items-center justify-center gap-1.5 rounded-md border border-input px-3 active:bg-accent",
          hasActiveFilters && "border-primary/50"
        )}
        accessibilityRole="button"
        accessibilityLabel={`Genre filter${hasActiveFilters ? `, ${value.length} selected` : ""}`}
      >
        <SlidersHorizontal size={16} className="text-muted-foreground" />
        <Text className="text-sm text-foreground">Genre</Text>
        {hasActiveFilters && (
          <Badge className="ml-0.5 min-w-[18px] rounded-full px-1.5 py-0">
            <Text className="text-center text-[10px] font-medium text-primary-foreground">
              {value.length}
            </Text>
          </Badge>
        )}
      </Pressable>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="max-h-[70%]">
          <SheetHeader>
            <SheetTitle>Filter by Genre</SheetTitle>
          </SheetHeader>

          <View className="mb-3">
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search genres..."
              placeholderTextColor={colors.mutedForeground}
              className="h-10 rounded-md border border-input bg-transparent px-3 text-base text-foreground"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ScrollView className="max-h-80" bounces={false}>
            {filteredGenres === undefined ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : filteredGenres.length === 0 ? (
              <View className="py-4">
                <Text className="text-center text-sm text-muted-foreground">
                  {genres && genres.length > 0 ? "No matching genres" : "No genres yet"}
                </Text>
              </View>
            ) : (
              filteredGenres.map((genre) => {
                const isChecked = value.includes(genre._id);
                return (
                  <Pressable
                    key={genre._id}
                    onPress={() => handleToggle(genre._id)}
                    className="flex-row items-center gap-3 rounded-md px-2 py-2.5 active:bg-muted/50"
                  >
                    <Checkbox checked={isChecked} onCheckedChange={() => handleToggle(genre._id)} />
                    <Text
                      className={cn("flex-1 text-sm text-foreground", isChecked && "font-medium")}
                    >
                      {genre.name}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {hasActiveFilters && (
            <View className="mt-3 border-t border-border pt-3">
              <Button variant="ghost" onPress={handleClear}>
                Clear filters
              </Button>
            </View>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export { GenreFilter, type GenreFilterProps };
