import { useImageUrl } from "@chaptercheck/shared/hooks/useImageUrl";
import { cn } from "@chaptercheck/tailwind-config/cn";
import { Image } from "expo-image";
import { BookOpen } from "lucide-react-native";
import { Text, View } from "react-native";

interface BookCoverProps {
  coverImageR2Key?: string;
  title: string;
  size?: "xs" | "sm" | "md" | "lg" | "card";
  className?: string;
}

type BookCoverSize = NonNullable<BookCoverProps["size"]>;

const SIZE_DIMENSIONS: Record<BookCoverSize, { width: number; height: number } | null> = {
  xs: { width: 32, height: 48 },
  sm: { width: 40, height: 56 },
  md: { width: 80, height: 112 },
  lg: { width: 128, height: 176 },
  card: null, // card uses aspect ratio instead
};

const SIZE_CLASSES: Record<BookCoverSize, string> = {
  xs: "w-8 h-12",
  sm: "w-10 h-14",
  md: "w-20 h-28",
  lg: "w-32 h-44",
  card: "w-full",
};

const ICON_SIZES: Record<BookCoverSize, number> = {
  xs: 16,
  sm: 20,
  md: 40,
  lg: 64,
  card: 48,
};

// Palette of solid background colors for fallback covers, selected by title hash
const FALLBACK_COLORS = [
  "#7c3aed", // violet
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
] as const;

/** Generate a consistent color index from a string */
function getColorFromTitle(title: string): string {
  const hash = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function BookCover({ coverImageR2Key, title, size = "md", className }: BookCoverProps) {
  const { imageUrl, loading } = useImageUrl(coverImageR2Key);
  const isCard = size === "card";
  const dimensions = SIZE_DIMENSIONS[size];
  const iconSize = ICON_SIZES[size];

  // Loading state: pulsing muted rectangle
  if (loading) {
    return (
      <View
        className={cn("shrink-0 rounded-lg bg-muted opacity-50", SIZE_CLASSES[size], className)}
        style={isCard ? { aspectRatio: 2 / 3 } : undefined}
      />
    );
  }

  // Fallback: solid background color with BookOpen icon
  if (!imageUrl) {
    const backgroundColor = getColorFromTitle(title);
    return (
      <View
        className={cn(
          "shrink-0 items-center justify-center rounded-lg border border-border/50",
          SIZE_CLASSES[size],
          isCard && "gap-3 p-4",
          className
        )}
        style={[
          { backgroundColor: `${backgroundColor}33` }, // 20% opacity via hex alpha
          isCard ? { aspectRatio: 2 / 3 } : undefined,
        ]}
      >
        <BookOpen size={iconSize} color="hsl(120, 5%, 50%)" strokeWidth={1.5} />
        {isCard && (
          <Text
            className="text-center text-xs font-medium text-muted-foreground/70"
            numberOfLines={3}
          >
            {title}
          </Text>
        )}
      </View>
    );
  }

  // Image loaded: render with expo-image
  return (
    <Image
      source={{ uri: imageUrl }}
      alt={title}
      contentFit="cover"
      className={cn("shrink-0 rounded-lg", SIZE_CLASSES[size], className)}
      style={[dimensions ?? undefined, isCard ? { aspectRatio: 2 / 3 } : undefined]}
      transition={200}
    />
  );
}
