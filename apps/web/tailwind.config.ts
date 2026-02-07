import type { Config } from "tailwindcss";

import { sharedTheme } from "@chaptercheck/tailwind-config";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: sharedTheme,
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
