import { type ReactNode } from "react";
import { Text } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

interface LabelProps {
  children: ReactNode;
  className?: string;
  error?: boolean;
}

function Label({ children, className, error = false }: LabelProps) {
  return (
    <Text
      className={cn("text-sm font-medium text-foreground", error && "text-destructive", className)}
    >
      {children}
    </Text>
  );
}

export { Label, type LabelProps };
