import { useColorScheme } from "nativewind";
import { darkColors, lightColors } from "@chaptercheck/tailwind-config/colors";

export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? darkColors : lightColors;
}
