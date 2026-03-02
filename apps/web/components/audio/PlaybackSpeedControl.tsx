"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SPEED_OPTIONS = Array.from({ length: 26 }, (_, i) => {
  const rate = 0.5 + i * 0.1;
  const rounded = Math.round(rate * 10) / 10;
  const label = Number.isInteger(rounded) ? `${rounded}x` : `${rounded.toFixed(1)}x`;
  return { value: rounded.toString(), label };
});

interface PlaybackSpeedControlProps {
  value: number;
  onChange: (rate: number) => void;
  size?: "sm" | "default";
}

export function PlaybackSpeedControl({
  value,
  onChange,
  size = "default",
}: PlaybackSpeedControlProps) {
  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(parseFloat(v))}>
      <SelectTrigger className={size === "sm" ? "h-8 w-[70px] text-xs" : "h-9 w-[80px]"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SPEED_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
