import { Switch as RNSwitch, View } from "react-native";

import { cn } from "@chaptercheck/tailwind-config/cn";

const TRACK_COLOR_FALSE = "hsl(37, 14%, 89%)";
const TRACK_COLOR_TRUE = "hsl(120, 13%, 60%)";
const THUMB_COLOR = "#ffffff";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked, onCheckedChange, disabled = false, className }: SwitchProps) {
  return (
    <View className={cn(disabled && "opacity-50", className)}>
      <RNSwitch
        value={checked}
        onValueChange={onCheckedChange}
        disabled={disabled}
        trackColor={{ false: TRACK_COLOR_FALSE, true: TRACK_COLOR_TRUE }}
        thumbColor={THUMB_COLOR}
      />
    </View>
  );
}

export { Switch, type SwitchProps };
