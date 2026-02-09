import { Switch as RNSwitch, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

import { useThemeColors } from "@/hooks/useThemeColors";
import { hapticLight } from "@/lib/haptics";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked, onCheckedChange, disabled = false, className }: SwitchProps) {
  const colors = useThemeColors();

  return (
    <View className={cn(disabled && "opacity-50", className)}>
      <RNSwitch
        value={checked}
        onValueChange={(val) => {
          hapticLight();
          onCheckedChange(val);
        }}
        disabled={disabled}
        trackColor={{ false: colors.input, true: colors.primary }}
        thumbColor={colors.primaryForeground}
      />
    </View>
  );
}

export { Switch, type SwitchProps };
