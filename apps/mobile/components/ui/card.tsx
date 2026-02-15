import { type ReactNode } from "react";
import { Text, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
}

function Card({ children, className }: CardProps) {
  return (
    <View className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
      {children}
    </View>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

function CardHeader({ children, className }: CardHeaderProps) {
  return <View className={cn("gap-1.5 p-4", className)}>{children}</View>;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

function CardTitle({ children, className }: CardTitleProps) {
  return (
    <Text className={cn("text-lg font-semibold text-card-foreground", className)}>{children}</Text>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

function CardDescription({ children, className }: CardDescriptionProps) {
  return <Text className={cn("text-sm text-muted-foreground", className)}>{children}</Text>;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

function CardContent({ children, className }: CardContentProps) {
  return <View className={cn("px-4 pb-4", className)}>{children}</View>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

function CardFooter({ children, className }: CardFooterProps) {
  return <View className={cn("flex-row items-center px-4 pb-4", className)}>{children}</View>;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
