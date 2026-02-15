import { api } from "@chaptercheck/convex-backend/_generated/api";
import { formatListeningTime, getGreeting } from "@chaptercheck/shared/utils";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { BookOpen, CheckCircle2, Clock, Headphones } from "lucide-react-native";
import { FlatList, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ListeningCard } from "@/components/books/ListeningCard";
import { HeroListeningCard } from "@/components/home/HeroListeningCard";
import { HomeBookCard } from "@/components/home/HomeBookCard";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeColors } from "@/hooks/useThemeColors";

function ContinueListeningSkeleton() {
  return (
    <View style={{ gap: 12, paddingHorizontal: 20 }}>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <View className="flex-row" style={{ gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} className="w-36" style={{ gap: 8 }}>
            <Skeleton className="w-36 rounded-lg" style={{ aspectRatio: 2 / 3 }} />
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-2.5 w-16 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
}

interface StatChipProps {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  value: string | number;
  label: string;
}

function StatChip({ icon: Icon, value, label }: StatChipProps) {
  const colors = useThemeColors();
  return (
    <View
      className="flex-row items-center rounded-xl border border-border/50 bg-card/80"
      style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}
    >
      <Icon size={16} color={colors.primary} strokeWidth={2} />
      <Text className="text-sm font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function LibraryStats() {
  const stats = useQuery(api.books.queries.getHomeStats);

  if (!stats) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      <StatChip icon={BookOpen} value={stats.totalBooks} label="Books" />
      <StatChip
        icon={Clock}
        value={formatListeningTime(stats.totalListeningSeconds)}
        label="Listened"
      />
      <StatChip icon={CheckCircle2} value={stats.booksRead} label="Finished" />
    </ScrollView>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const { user } = useUser();
  const firstName = user?.firstName || "there";

  const recentlyListening = useQuery(api.listeningProgress.queries.getRecentlyListening, {
    limit: 6,
  });
  const recentBooks = useQuery(api.books.queries.getRecentBooks, { limit: 8 });
  const topRatedBooks = useQuery(api.books.queries.getTopRatedBooks, { limit: 8 });

  const isLoading = recentlyListening === undefined;
  const hasListening = recentlyListening && recentlyListening.length > 0;
  const heroItem = hasListening ? recentlyListening[0] : null;
  const remainingListening = hasListening ? recentlyListening.slice(1) : [];
  const hasBooks = recentBooks && recentBooks.length > 0;
  const hasTopRated = topRatedBooks && topRatedBooks.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text className="text-2xl font-bold text-foreground">
            {getGreeting()}, {firstName}
          </Text>
        </View>

        {/* Loading skeleton */}
        {isLoading && <ContinueListeningSkeleton />}

        {/* Hero Continue Listening */}
        {heroItem && <HeroListeningCard item={heroItem} />}

        {/* No listening progress empty state */}
        {!isLoading && !hasListening && hasBooks && (
          <View
            className="items-center rounded-2xl bg-primary/5"
            style={{ marginHorizontal: 20, paddingVertical: 32, gap: 12 }}
          >
            <Headphones size={48} color={colors.mutedForeground} strokeWidth={1.5} />
            <Text className="px-6 text-center text-sm text-muted-foreground">
              Start listening to a book and your progress will appear here.
            </Text>
          </View>
        )}

        {/* Continue Listening Row (remaining items) */}
        {remainingListening.length > 0 && (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Continue Listening" />
            <FlatList
              data={remainingListening}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              renderItem={({ item }) => <ListeningCard item={item} />}
            />
          </View>
        )}

        {/* Recently Added Row */}
        {hasBooks && (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Recently Added" />
            <FlatList
              data={recentBooks}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              renderItem={({ item }) => <HomeBookCard book={item} />}
            />
          </View>
        )}

        {/* No books empty state */}
        {recentBooks && recentBooks.length === 0 && (
          <View
            className="items-center rounded-2xl border border-border/50 bg-card/50"
            style={{ marginHorizontal: 20, paddingVertical: 32, gap: 12 }}
          >
            <BookOpen size={48} color={colors.mutedForeground} strokeWidth={1.5} />
            <Text className="text-center text-sm text-muted-foreground">No books yet</Text>
          </View>
        )}

        {/* Top Rated Row */}
        {hasTopRated && (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Top Rated" />
            <FlatList
              data={topRatedBooks}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              renderItem={({ item }) => <HomeBookCard book={item} showRating />}
            />
          </View>
        )}

        {/* Library Stats */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Your Library" />
          <LibraryStats />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
