import { View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function Separator({ orientation = "horizontal", className }: SeparatorProps) {
  return (
    <View
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  );
}

export { Separator, type SeparatorProps };
