"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SPEED_OPTIONS = [
  { value: "0.75", label: "0.75x" },
  { value: "1", label: "1x" },
  { value: "1.25", label: "1.25x" },
  { value: "1.5", label: "1.5x" },
  { value: "1.75", label: "1.75x" },
  { value: "2", label: "2x" },
  { value: "2.5", label: "2.5x" },
  { value: "3", label: "3x" },
];

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
