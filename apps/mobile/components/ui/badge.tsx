import { type ReactNode } from "react";
import { Text, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

const badgeVariants = {
  default: "bg-primary",
  secondary: "bg-secondary",
  destructive: "bg-destructive",
  outline: "border border-border bg-transparent",
} as const;

const badgeTextVariants = {
  default: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
} as const;

type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  textClassName?: string;
}

function Badge({ variant = "default", children, className, textClassName }: BadgeProps) {
  const isStringChildren = typeof children === "string";

  return (
    <View className={cn("rounded-md px-2.5 py-0.5", badgeVariants[variant], className)}>
      {isStringChildren ? (
        <Text className={cn("text-xs font-medium", badgeTextVariants[variant], textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
