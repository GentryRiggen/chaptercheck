import { type ReactNode, useCallback } from "react";
import { Pressable, Text, type ViewStyle } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

import { hapticLight } from "@/lib/haptics";

const buttonVariants = {
  default: "bg-primary active:opacity-80",
  destructive: "bg-destructive active:opacity-80",
  outline: "border border-input bg-transparent active:bg-accent",
  secondary: "bg-secondary active:opacity-80",
  ghost: "active:bg-accent",
  link: "",
} as const;

const buttonTextVariants = {
  default: "text-primary-foreground",
  destructive: "text-destructive-foreground",
  outline: "text-foreground",
  secondary: "text-secondary-foreground",
  ghost: "text-foreground",
  link: "text-primary underline",
} as const;

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3",
  lg: "h-12 px-8",
  icon: "h-10 w-10",
} as const;

const buttonTextSizes = {
  default: "text-sm",
  sm: "text-xs",
  lg: "text-base",
  icon: "text-sm",
} as const;

type ButtonVariant = keyof typeof buttonVariants;
type ButtonSize = keyof typeof buttonSizes;

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
  className?: string;
  textClassName?: string;
  style?: ViewStyle;
}

function Button({
  variant = "default",
  size = "default",
  disabled = false,
  onPress,
  children,
  className,
  textClassName,
  style,
}: ButtonProps) {
  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      hapticLight();
      onPress();
    }
  }, [disabled, onPress]);

  const isStringChildren = typeof children === "string";

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-center rounded-md",
        buttonVariants[variant],
        buttonSizes[size],
        disabled && "opacity-50",
        className
      )}
      style={style}
    >
      {isStringChildren ? (
        <Text
          className={cn(
            "font-medium",
            buttonTextVariants[variant],
            buttonTextSizes[size],
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize };
