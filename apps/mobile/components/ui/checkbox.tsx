import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticLight } from "@/lib/haptics";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Checkbox({ checked, onCheckedChange, disabled = false, className }: CheckboxProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={() => {
        hapticLight();
        onCheckedChange(!checked);
      }}
      disabled={disabled}
      className={cn(disabled && "opacity-50", className)}
    >
      <View
        className={cn(
          "h-5 w-5 items-center justify-center rounded border border-primary",
          checked && "bg-primary"
        )}
      >
        {checked ? <Check size={14} color={colors.primaryForeground} /> : null}
      </View>
    </Pressable>
  );
}

export { Checkbox, type CheckboxProps };
