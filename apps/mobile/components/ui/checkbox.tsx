import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Checkbox({ checked, onCheckedChange, disabled = false, className }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(disabled && "opacity-50", className)}
    >
      <View
        className={cn(
          "h-5 w-5 items-center justify-center rounded border border-primary",
          checked && "bg-primary"
        )}
      >
        {checked ? <Check size={14} color="#ffffff" /> : null}
      </View>
    </Pressable>
  );
}

export { Checkbox, type CheckboxProps };
