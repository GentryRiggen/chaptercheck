import { useImageUrl } from "@chaptercheck/shared/hooks/useImageUrl";
import { cn } from "@chaptercheck/tailwind-config/cn";
import { Image } from "expo-image";
import { User } from "lucide-react-native";
import { Text, View } from "react-native";

import { useThemeColors } from "@/hooks/useThemeColors";

interface AuthorImageProps {
  imageR2Key?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "card";
  className?: string;
}

type AuthorImageSize = NonNullable<AuthorImageProps["size"]>;

const SIZE_DIMENSIONS: Record<AuthorImageSize, number> = {
  xs: 32,
  sm: 40,
  md: 64,
  lg: 96,
  card: 80,
};

const SIZE_CLASSES: Record<AuthorImageSize, string> = {
  xs: "w-8 h-8",
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  card: "w-20 h-20",
};

const ICON_SIZES: Record<AuthorImageSize, number> = {
  xs: 16,
  sm: 20,
  md: 32,
  lg: 48,
  card: 40,
};

const INITIALS_TEXT_CLASSES: Record<AuthorImageSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  card: "text-lg",
};

// Palette of solid background colors for fallback avatars, selected by name hash
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

/** Generate a consistent color from a string */
function getColorFromName(name: string): string {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

/** Extract initials from a name: first letter of first two words, uppercase */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AuthorImage({ imageR2Key, name, size = "md", className }: AuthorImageProps) {
  const colors = useThemeColors();
  const { imageUrl, loading } = useImageUrl(imageR2Key);
  const dimension = SIZE_DIMENSIONS[size];
  const iconSize = ICON_SIZES[size];

  // Loading state: pulsing circle
  if (loading) {
    return (
      <View className={cn("rounded-full bg-muted opacity-50", SIZE_CLASSES[size], className)} />
    );
  }

  // Fallback: solid color with initials or User icon
  if (!imageUrl) {
    const backgroundColor = getColorFromName(name);
    const initials = getInitials(name);

    return (
      <View
        className={cn(
          "items-center justify-center rounded-full border border-border/50",
          SIZE_CLASSES[size],
          className
        )}
        style={{ backgroundColor: `${backgroundColor}4D` }} // 30% opacity via hex alpha
      >
        {initials ? (
          <Text
            className={cn("font-semibold text-muted-foreground/80", INITIALS_TEXT_CLASSES[size])}
          >
            {initials}
          </Text>
        ) : (
          <User size={iconSize} color={colors.mutedForeground} strokeWidth={1.5} />
        )}
      </View>
    );
  }

  // Image loaded: render circular image with expo-image
  return (
    <Image
      source={{ uri: imageUrl }}
      alt={name}
      contentFit="cover"
      className={cn("rounded-full", SIZE_CLASSES[size], className)}
      style={{ width: dimension, height: dimension, borderRadius: 9999 }}
      transition={200}
    />
  );
}
