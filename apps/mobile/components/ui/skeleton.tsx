import { cn } from "@chaptercheck/tailwind-config/cn";
import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
}

function Skeleton({ className, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View className={cn("rounded-md bg-muted", className)} style={[{ opacity }, style]} />
  );
}

export { Skeleton, type SkeletonProps };
