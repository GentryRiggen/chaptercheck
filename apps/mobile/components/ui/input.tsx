import { useState } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

const MUTED_FOREGROUND = "hsl(220, 9%, 46%)";

interface InputProps extends TextInputProps {
  className?: string;
  label?: string;
}

function Input({ className, label, editable = true, onFocus, onBlur, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isDisabled = editable === false;

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-foreground">{label}</Text> : null}
      <TextInput
        editable={editable}
        placeholderTextColor={MUTED_FOREGROUND}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        className={cn(
          "h-10 rounded-md border border-input bg-transparent px-3 text-base text-foreground",
          isFocused && "border-ring",
          isDisabled && "opacity-50",
          className
        )}
        {...props}
      />
    </View>
  );
}

export { Input, type InputProps };
