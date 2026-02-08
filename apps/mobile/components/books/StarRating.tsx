import { cn } from "@chaptercheck/tailwind-config/cn";
import { Star } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, View } from "react-native";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "xs" | "sm" | "md";
}

type StarRatingSize = NonNullable<StarRatingProps["size"]>;

const ICON_SIZES: Record<StarRatingSize, number> = {
  xs: 12,
  sm: 16,
  md: 24,
};

const FILLED_COLOR = "#D4A76A";
const UNFILLED_COLOR = "hsl(120, 5%, 50%)";

/** 3-star rating component. Tapping the current star clears the rating. */
export function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const iconSize = ICON_SIZES[size];

  const handleStarPress = useCallback(
    (starIndex: number) => {
      if (readonly || !onChange) return;

      const newValue = starIndex + 1;
      // Tapping the same star that is already the current value clears the rating
      if (newValue === value) {
        onChange(0);
      } else {
        onChange(newValue);
      }
    },
    [readonly, onChange, value]
  );

  return (
    <View className="flex-row gap-1">
      {([0, 1, 2] as const).map((index) => {
        const isFilled = index < value;

        return (
          <Pressable
            key={index}
            onPress={() => handleStarPress(index)}
            disabled={readonly}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${index + 1} star${index === 0 ? "" : "s"}`}
            className={cn(!readonly && "active:opacity-70")}
          >
            <Star
              size={iconSize}
              color={isFilled ? FILLED_COLOR : UNFILLED_COLOR}
              fill={isFilled ? FILLED_COLOR : "transparent"}
              strokeWidth={2}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
