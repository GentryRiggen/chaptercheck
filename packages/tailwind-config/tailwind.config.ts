import type { Config } from "tailwindcss";

/**
 * Shared Tailwind theme configuration.
 * Apps should extend this config and add their own `content` paths.
 */
export const sharedTheme: Config["theme"] = {
  extend: {
    colors: {
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      card: {
        DEFAULT: "hsl(var(--card))",
        foreground: "hsl(var(--card-foreground))",
      },
      popover: {
        DEFAULT: "hsl(var(--popover))",
        foreground: "hsl(var(--popover-foreground))",
      },
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      muted: {
        DEFAULT: "hsl(var(--muted))",
        foreground: "hsl(var(--muted-foreground))",
      },
      accent: {
        DEFAULT: "hsl(var(--accent))",
        foreground: "hsl(var(--accent-foreground))",
      },
      destructive: {
        DEFAULT: "hsl(var(--destructive))",
        foreground: "hsl(var(--destructive-foreground))",
      },
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      chart: {
        "1": "hsl(var(--chart-1))",
        "2": "hsl(var(--chart-2))",
        "3": "hsl(var(--chart-3))",
        "4": "hsl(var(--chart-4))",
        "5": "hsl(var(--chart-5))",
      },
    },
    borderRadius: {
      lg: "var(--radius)",
      md: "calc(var(--radius) - 2px)",
      sm: "calc(var(--radius) - 4px)",
    },
    animation: {
      "slow-spin": "slow-spin 30s linear infinite",
      "slow-spin-reverse": "slow-spin 25s linear infinite reverse",
      float: "float 20s ease-in-out infinite",
      ripple: "ripple 1s ease-out forwards",
    },
    keyframes: {
      "slow-spin": {
        "0%": { transform: "rotate(0deg)" },
        "100%": { transform: "rotate(360deg)" },
      },
      float: {
        "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
        "33%": { transform: "translate(calc(-50% + 15px), calc(-50% - 15px)) scale(1.05)" },
        "66%": { transform: "translate(calc(-50% - 10px), calc(-50% + 10px)) scale(0.95)" },
      },
      ripple: {
        "0%": { transform: "translate(-50%, -50%) scale(0)", opacity: "1" },
        "100%": { transform: "translate(-50%, -50%) scale(2)", opacity: "0" },
      },
    },
  },
};
