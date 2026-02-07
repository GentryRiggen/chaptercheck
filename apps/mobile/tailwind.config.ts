import type { Config } from "tailwindcss";

import { sharedTheme } from "@chaptercheck/tailwind-config";

export default {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
  theme: sharedTheme,
} satisfies Config;
