import { api } from "@chaptercheck/convex-backend/_generated/api";
import { Headphones } from "lucide-react-native";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";

import { ListeningCard } from "@/components/books/ListeningCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeColors } from "@/hooks/useThemeColors";

function ContinueListeningSkeleton() {
  return (
    <View className="flex-row" style={{ gap: 12, paddingHorizontal: 20 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} className="w-36" style={{ gap: 8 }}>
          <Skeleton className="w-36 rounded-lg" style={{ aspectRatio: 2 / 3 }} />
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-2.5 w-16 rounded" />
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const recentlyListening = useQuery(api.listeningProgress.queries.getRecentlyListening, {
    limit: 6,
  });

  const isLoading = recentlyListening === undefined;
  const hasItems = recentlyListening && recentlyListening.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text className="text-2xl font-bold text-foreground">Home</Text>
      </View>

      {isLoading && <ContinueListeningSkeleton />}

      {!isLoading && hasItems && (
        <View style={{ gap: 12 }}>
          <Text
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ paddingHorizontal: 20 }}
          >
            Continue Listening
          </Text>
          <FlatList
            data={recentlyListening}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item }) => <ListeningCard item={item} />}
          />
        </View>
      )}

      {!isLoading && !hasItems && (
        <View className="flex-1 items-center justify-center px-6" style={{ gap: 12 }}>
          <Headphones size={48} color={colors.mutedForeground} strokeWidth={1.5} />
          <Text className="text-center text-sm text-muted-foreground">
            Start listening to a book and your progress will appear here.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
