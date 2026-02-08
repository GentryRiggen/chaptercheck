import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";
import { type Id } from "@chaptercheck/convex-backend/_generated/dataModel";

import { AuthorImage } from "@/components/authors/AuthorImage";

interface AuthorCardProps {
  author: {
    _id: Id<"authors">;
    name: string;
    imageR2Key?: string;
    bookCount?: number;
    seriesCount?: number;
  };
}

function formatSubtitle(bookCount?: number, seriesCount?: number): string {
  const parts: string[] = [];

  if (bookCount !== undefined && bookCount > 0) {
    parts.push(`${bookCount} book${bookCount !== 1 ? "s" : ""}`);
  }

  if (seriesCount !== undefined && seriesCount > 0) {
    parts.push(`${seriesCount} series`);
  }

  return parts.join(" \u00B7 ");
}

function AuthorCard({ author }: AuthorCardProps) {
  const router = useRouter();

  const subtitle = formatSubtitle(author.bookCount, author.seriesCount);

  return (
    <Pressable
      onPress={() => router.push(`/authors/${author._id}`)}
      className={cn(
        "flex-row items-center gap-3 border-b border-border/50 px-4 py-3",
        "active:bg-muted/50"
      )}
    >
      <AuthorImage imageR2Key={author.imageR2Key} name={author.name} size="md" />

      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
          {author.name}
        </Text>
        {subtitle.length > 0 && (
          <Text className="mt-0.5 text-sm text-muted-foreground">{subtitle}</Text>
        )}
      </View>
    </Pressable>
  );
}

export { AuthorCard, type AuthorCardProps };
