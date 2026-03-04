/**
 * 37 accent colors matching the iOS app's AccentColorToken.swift.
 * Each color provides HSL values for CSS custom properties in light and dark mode.
 *
 * CSS vars set by AccentApplicator: --primary, --accent, --accent-foreground, --ring, --primary-foreground
 */

export type AccentColorName =
  | "sky"
  | "blue"
  | "navy"
  | "periwinkle"
  | "indigo"
  | "midnight"
  | "lavender"
  | "purple"
  | "plum"
  | "rose"
  | "pink"
  | "magenta"
  | "coral"
  | "red"
  | "crimson"
  | "peach"
  | "orange"
  | "tangerine"
  | "lemon"
  | "amber"
  | "yellow"
  | "gold"
  | "chartreuse"
  | "lime"
  | "green"
  | "emerald"
  | "forest"
  | "aqua"
  | "teal"
  | "ocean"
  | "cyan"
  | "electric"
  | "seafoam"
  | "mint"
  | "jade"
  | "brown"
  | "graphite";

export interface ColorVars {
  /** HSL values without hsl() wrapper, e.g. "210 100% 50%" */
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
}

export interface AccentColorDef {
  displayName: string;
  /** Hex for swatch preview */
  swatch: string;
  light: ColorVars;
  dark: ColorVars;
}

export const DEFAULT_ACCENT: AccentColorName = "blue";

/**
 * All 37 accent colors.
 * Light mode: full chroma primary, accent at ~94% lightness tint.
 * Dark mode: lightness bumped ~10%, accent at ~16% lightness.
 */
export const ACCENT_COLORS: Record<AccentColorName, AccentColorDef> = {
  // ── Blues ──
  sky: {
    displayName: "Sky",
    swatch: "#59ADF2",
    light: {
      primary: "206 87% 58%",
      primaryForeground: "0 0% 100%",
      accent: "206 87% 94%",
      accentForeground: "206 87% 38%",
      ring: "206 87% 58%",
    },
    dark: {
      primary: "206 87% 68%",
      primaryForeground: "0 0% 0%",
      accent: "206 40% 16%",
      accentForeground: "206 87% 78%",
      ring: "206 87% 68%",
    },
  },
  blue: {
    displayName: "Blue",
    swatch: "#007AFF",
    light: {
      primary: "214 100% 50%",
      primaryForeground: "0 0% 100%",
      accent: "214 100% 94%",
      accentForeground: "214 100% 35%",
      ring: "214 100% 50%",
    },
    dark: {
      primary: "214 100% 60%",
      primaryForeground: "0 0% 0%",
      accent: "214 50% 16%",
      accentForeground: "214 100% 75%",
      ring: "214 100% 60%",
    },
  },
  navy: {
    displayName: "Navy",
    swatch: "#264099",
    light: {
      primary: "229 60% 37%",
      primaryForeground: "0 0% 100%",
      accent: "229 60% 94%",
      accentForeground: "229 60% 30%",
      ring: "229 60% 37%",
    },
    dark: {
      primary: "229 60% 50%",
      primaryForeground: "0 0% 100%",
      accent: "229 35% 16%",
      accentForeground: "229 60% 70%",
      ring: "229 60% 50%",
    },
  },

  // ── Indigos ──
  periwinkle: {
    displayName: "Periwinkle",
    swatch: "#8F85F2",
    light: {
      primary: "245 79% 74%",
      primaryForeground: "0 0% 100%",
      accent: "245 79% 94%",
      accentForeground: "245 60% 50%",
      ring: "245 79% 74%",
    },
    dark: {
      primary: "245 79% 78%",
      primaryForeground: "0 0% 0%",
      accent: "245 40% 16%",
      accentForeground: "245 79% 82%",
      ring: "245 79% 78%",
    },
  },
  indigo: {
    displayName: "Indigo",
    swatch: "#5856D6",
    light: {
      primary: "241 58% 59%",
      primaryForeground: "0 0% 100%",
      accent: "241 58% 94%",
      accentForeground: "241 58% 42%",
      ring: "241 58% 59%",
    },
    dark: {
      primary: "241 58% 69%",
      primaryForeground: "0 0% 0%",
      accent: "241 35% 16%",
      accentForeground: "241 58% 78%",
      ring: "241 58% 69%",
    },
  },
  midnight: {
    displayName: "Midnight",
    swatch: "#382E80",
    light: {
      primary: "249 47% 34%",
      primaryForeground: "0 0% 100%",
      accent: "249 47% 94%",
      accentForeground: "249 47% 28%",
      ring: "249 47% 34%",
    },
    dark: {
      primary: "249 47% 48%",
      primaryForeground: "0 0% 100%",
      accent: "249 30% 16%",
      accentForeground: "249 47% 68%",
      ring: "249 47% 48%",
    },
  },

  // ── Purples ──
  lavender: {
    displayName: "Lavender",
    swatch: "#B88CF2",
    light: {
      primary: "272 80% 75%",
      primaryForeground: "0 0% 100%",
      accent: "272 80% 94%",
      accentForeground: "272 60% 50%",
      ring: "272 80% 75%",
    },
    dark: {
      primary: "272 80% 78%",
      primaryForeground: "0 0% 0%",
      accent: "272 40% 16%",
      accentForeground: "272 80% 82%",
      ring: "272 80% 78%",
    },
  },
  purple: {
    displayName: "Purple",
    swatch: "#AF52DE",
    light: {
      primary: "283 64% 60%",
      primaryForeground: "0 0% 100%",
      accent: "283 64% 94%",
      accentForeground: "283 64% 42%",
      ring: "283 64% 60%",
    },
    dark: {
      primary: "283 64% 70%",
      primaryForeground: "0 0% 0%",
      accent: "283 35% 16%",
      accentForeground: "283 64% 78%",
      ring: "283 64% 70%",
    },
  },
  plum: {
    displayName: "Plum",
    swatch: "#7A2685",
    light: {
      primary: "295 55% 34%",
      primaryForeground: "0 0% 100%",
      accent: "295 55% 94%",
      accentForeground: "295 55% 28%",
      ring: "295 55% 34%",
    },
    dark: {
      primary: "295 55% 48%",
      primaryForeground: "0 0% 100%",
      accent: "295 30% 16%",
      accentForeground: "295 55% 68%",
      ring: "295 55% 48%",
    },
  },

  // ── Pinks ──
  rose: {
    displayName: "Rose",
    swatch: "#FF8099",
    light: {
      primary: "350 100% 75%",
      primaryForeground: "0 0% 100%",
      accent: "350 100% 94%",
      accentForeground: "350 80% 50%",
      ring: "350 100% 75%",
    },
    dark: {
      primary: "350 100% 78%",
      primaryForeground: "0 0% 0%",
      accent: "350 50% 16%",
      accentForeground: "350 100% 82%",
      ring: "350 100% 78%",
    },
  },
  pink: {
    displayName: "Pink",
    swatch: "#FF2D55",
    light: {
      primary: "349 100% 59%",
      primaryForeground: "0 0% 100%",
      accent: "349 100% 94%",
      accentForeground: "349 100% 42%",
      ring: "349 100% 59%",
    },
    dark: {
      primary: "349 100% 69%",
      primaryForeground: "0 0% 0%",
      accent: "349 50% 16%",
      accentForeground: "349 100% 78%",
      ring: "349 100% 69%",
    },
  },
  magenta: {
    displayName: "Magenta",
    swatch: "#D91E85",
    light: {
      primary: "328 76% 49%",
      primaryForeground: "0 0% 100%",
      accent: "328 76% 94%",
      accentForeground: "328 76% 35%",
      ring: "328 76% 49%",
    },
    dark: {
      primary: "328 76% 59%",
      primaryForeground: "0 0% 0%",
      accent: "328 40% 16%",
      accentForeground: "328 76% 74%",
      ring: "328 76% 59%",
    },
  },

  // ── Reds ──
  coral: {
    displayName: "Coral",
    swatch: "#FF7361",
    light: {
      primary: "7 100% 69%",
      primaryForeground: "0 0% 100%",
      accent: "7 100% 94%",
      accentForeground: "7 80% 48%",
      ring: "7 100% 69%",
    },
    dark: {
      primary: "7 100% 74%",
      primaryForeground: "0 0% 0%",
      accent: "7 50% 16%",
      accentForeground: "7 100% 82%",
      ring: "7 100% 74%",
    },
  },
  red: {
    displayName: "Red",
    swatch: "#FF3B30",
    light: {
      primary: "4 100% 59%",
      primaryForeground: "0 0% 100%",
      accent: "4 100% 94%",
      accentForeground: "4 100% 42%",
      ring: "4 100% 59%",
    },
    dark: {
      primary: "4 100% 69%",
      primaryForeground: "0 0% 0%",
      accent: "4 50% 16%",
      accentForeground: "4 100% 78%",
      ring: "4 100% 69%",
    },
  },
  crimson: {
    displayName: "Crimson",
    swatch: "#B31426",
    light: {
      primary: "352 80% 39%",
      primaryForeground: "0 0% 100%",
      accent: "352 80% 94%",
      accentForeground: "352 80% 30%",
      ring: "352 80% 39%",
    },
    dark: {
      primary: "352 80% 52%",
      primaryForeground: "0 0% 100%",
      accent: "352 40% 16%",
      accentForeground: "352 80% 70%",
      ring: "352 80% 52%",
    },
  },

  // ── Oranges ──
  peach: {
    displayName: "Peach",
    swatch: "#FFA673",
    light: {
      primary: "22 100% 73%",
      primaryForeground: "0 0% 100%",
      accent: "22 100% 94%",
      accentForeground: "22 80% 48%",
      ring: "22 100% 73%",
    },
    dark: {
      primary: "22 100% 76%",
      primaryForeground: "0 0% 0%",
      accent: "22 50% 16%",
      accentForeground: "22 100% 82%",
      ring: "22 100% 76%",
    },
  },
  orange: {
    displayName: "Orange",
    swatch: "#FF9500",
    light: {
      primary: "35 100% 50%",
      primaryForeground: "0 0% 100%",
      accent: "35 100% 94%",
      accentForeground: "35 100% 35%",
      ring: "35 100% 50%",
    },
    dark: {
      primary: "35 100% 60%",
      primaryForeground: "0 0% 0%",
      accent: "35 50% 16%",
      accentForeground: "35 100% 75%",
      ring: "35 100% 60%",
    },
  },
  tangerine: {
    displayName: "Tangerine",
    swatch: "#EB6B14",
    light: {
      primary: "24 86% 50%",
      primaryForeground: "0 0% 100%",
      accent: "24 86% 94%",
      accentForeground: "24 86% 36%",
      ring: "24 86% 50%",
    },
    dark: {
      primary: "24 86% 60%",
      primaryForeground: "0 0% 0%",
      accent: "24 45% 16%",
      accentForeground: "24 86% 75%",
      ring: "24 86% 60%",
    },
  },

  // ── Yellows ──
  lemon: {
    displayName: "Lemon",
    swatch: "#FFEB4D",
    light: {
      primary: "53 100% 65%",
      primaryForeground: "0 0% 20%",
      accent: "53 100% 94%",
      accentForeground: "53 80% 35%",
      ring: "53 100% 65%",
    },
    dark: {
      primary: "53 100% 70%",
      primaryForeground: "0 0% 0%",
      accent: "53 50% 16%",
      accentForeground: "53 100% 78%",
      ring: "53 100% 70%",
    },
  },
  amber: {
    displayName: "Amber",
    swatch: "#F5C200",
    light: {
      primary: "47 100% 48%",
      primaryForeground: "0 0% 20%",
      accent: "47 100% 94%",
      accentForeground: "47 100% 32%",
      ring: "47 100% 48%",
    },
    dark: {
      primary: "47 100% 58%",
      primaryForeground: "0 0% 0%",
      accent: "47 50% 16%",
      accentForeground: "47 100% 72%",
      ring: "47 100% 58%",
    },
  },
  yellow: {
    displayName: "Yellow",
    swatch: "#FFCC00",
    light: {
      primary: "48 100% 50%",
      primaryForeground: "0 0% 20%",
      accent: "48 100% 94%",
      accentForeground: "48 100% 32%",
      ring: "48 100% 50%",
    },
    dark: {
      primary: "48 100% 60%",
      primaryForeground: "0 0% 0%",
      accent: "48 50% 16%",
      accentForeground: "48 100% 75%",
      ring: "48 100% 60%",
    },
  },
  gold: {
    displayName: "Gold",
    swatch: "#D1A61A",
    light: {
      primary: "44 80% 46%",
      primaryForeground: "0 0% 100%",
      accent: "44 80% 94%",
      accentForeground: "44 80% 32%",
      ring: "44 80% 46%",
    },
    dark: {
      primary: "44 80% 56%",
      primaryForeground: "0 0% 0%",
      accent: "44 40% 16%",
      accentForeground: "44 80% 72%",
      ring: "44 80% 56%",
    },
  },

  // ── Greens ──
  chartreuse: {
    displayName: "Chartreuse",
    swatch: "#94E626",
    light: {
      primary: "88 78% 52%",
      primaryForeground: "0 0% 20%",
      accent: "88 78% 94%",
      accentForeground: "88 60% 32%",
      ring: "88 78% 52%",
    },
    dark: {
      primary: "88 78% 62%",
      primaryForeground: "0 0% 0%",
      accent: "88 40% 16%",
      accentForeground: "88 78% 75%",
      ring: "88 78% 62%",
    },
  },
  lime: {
    displayName: "Lime",
    swatch: "#85CC33",
    light: {
      primary: "92 60% 50%",
      primaryForeground: "0 0% 100%",
      accent: "92 60% 94%",
      accentForeground: "92 60% 32%",
      ring: "92 60% 50%",
    },
    dark: {
      primary: "92 60% 60%",
      primaryForeground: "0 0% 0%",
      accent: "92 35% 16%",
      accentForeground: "92 60% 75%",
      ring: "92 60% 60%",
    },
  },
  green: {
    displayName: "Green",
    swatch: "#34C759",
    light: {
      primary: "138 63% 49%",
      primaryForeground: "0 0% 100%",
      accent: "138 63% 94%",
      accentForeground: "138 63% 32%",
      ring: "138 63% 49%",
    },
    dark: {
      primary: "138 63% 59%",
      primaryForeground: "0 0% 0%",
      accent: "138 35% 16%",
      accentForeground: "138 63% 75%",
      ring: "138 63% 59%",
    },
  },
  emerald: {
    displayName: "Emerald",
    swatch: "#2E9E6B",
    light: {
      primary: "155 55% 40%",
      primaryForeground: "0 0% 100%",
      accent: "155 55% 94%",
      accentForeground: "155 55% 28%",
      ring: "155 55% 40%",
    },
    dark: {
      primary: "155 55% 52%",
      primaryForeground: "0 0% 0%",
      accent: "155 35% 16%",
      accentForeground: "155 55% 70%",
      ring: "155 55% 52%",
    },
  },
  forest: {
    displayName: "Forest",
    swatch: "#1F7347",
    light: {
      primary: "150 58% 29%",
      primaryForeground: "0 0% 100%",
      accent: "150 58% 94%",
      accentForeground: "150 58% 22%",
      ring: "150 58% 29%",
    },
    dark: {
      primary: "150 58% 42%",
      primaryForeground: "0 0% 100%",
      accent: "150 35% 16%",
      accentForeground: "150 58% 62%",
      ring: "150 58% 42%",
    },
  },

  // ── Teals & Cyans ──
  aqua: {
    displayName: "Aqua",
    swatch: "#4DD1D9",
    light: {
      primary: "183 62% 58%",
      primaryForeground: "0 0% 20%",
      accent: "183 62% 94%",
      accentForeground: "183 62% 34%",
      ring: "183 62% 58%",
    },
    dark: {
      primary: "183 62% 65%",
      primaryForeground: "0 0% 0%",
      accent: "183 35% 16%",
      accentForeground: "183 62% 78%",
      ring: "183 62% 65%",
    },
  },
  teal: {
    displayName: "Teal",
    swatch: "#30B0C7",
    light: {
      primary: "189 63% 48%",
      primaryForeground: "0 0% 100%",
      accent: "189 63% 94%",
      accentForeground: "189 63% 32%",
      ring: "189 63% 48%",
    },
    dark: {
      primary: "189 63% 58%",
      primaryForeground: "0 0% 0%",
      accent: "189 35% 16%",
      accentForeground: "189 63% 75%",
      ring: "189 63% 58%",
    },
  },
  ocean: {
    displayName: "Ocean",
    swatch: "#1A6B8C",
    light: {
      primary: "197 70% 33%",
      primaryForeground: "0 0% 100%",
      accent: "197 70% 94%",
      accentForeground: "197 70% 25%",
      ring: "197 70% 33%",
    },
    dark: {
      primary: "197 70% 46%",
      primaryForeground: "0 0% 100%",
      accent: "197 40% 16%",
      accentForeground: "197 70% 65%",
      ring: "197 70% 46%",
    },
  },
  cyan: {
    displayName: "Cyan",
    swatch: "#32ADE6",
    light: {
      primary: "201 78% 55%",
      primaryForeground: "0 0% 100%",
      accent: "201 78% 94%",
      accentForeground: "201 78% 38%",
      ring: "201 78% 55%",
    },
    dark: {
      primary: "201 78% 65%",
      primaryForeground: "0 0% 0%",
      accent: "201 40% 16%",
      accentForeground: "201 78% 78%",
      ring: "201 78% 65%",
    },
  },
  electric: {
    displayName: "Electric",
    swatch: "#0DD9FF",
    light: {
      primary: "189 100% 53%",
      primaryForeground: "0 0% 20%",
      accent: "189 100% 94%",
      accentForeground: "189 100% 32%",
      ring: "189 100% 53%",
    },
    dark: {
      primary: "189 100% 63%",
      primaryForeground: "0 0% 0%",
      accent: "189 50% 16%",
      accentForeground: "189 100% 78%",
      ring: "189 100% 63%",
    },
  },

  // ── Mints ──
  seafoam: {
    displayName: "Seafoam",
    swatch: "#8CEBC7",
    light: {
      primary: "157 68% 73%",
      primaryForeground: "0 0% 20%",
      accent: "157 68% 94%",
      accentForeground: "157 50% 34%",
      ring: "157 68% 73%",
    },
    dark: {
      primary: "157 68% 76%",
      primaryForeground: "0 0% 0%",
      accent: "157 35% 16%",
      accentForeground: "157 68% 82%",
      ring: "157 68% 76%",
    },
  },
  mint: {
    displayName: "Mint",
    swatch: "#00C7BE",
    light: {
      primary: "177 100% 39%",
      primaryForeground: "0 0% 100%",
      accent: "177 100% 94%",
      accentForeground: "177 100% 26%",
      ring: "177 100% 39%",
    },
    dark: {
      primary: "177 100% 50%",
      primaryForeground: "0 0% 0%",
      accent: "177 50% 16%",
      accentForeground: "177 100% 68%",
      ring: "177 100% 50%",
    },
  },
  jade: {
    displayName: "Jade",
    swatch: "#389E85",
    light: {
      primary: "166 47% 42%",
      primaryForeground: "0 0% 100%",
      accent: "166 47% 94%",
      accentForeground: "166 47% 28%",
      ring: "166 47% 42%",
    },
    dark: {
      primary: "166 47% 52%",
      primaryForeground: "0 0% 0%",
      accent: "166 30% 16%",
      accentForeground: "166 47% 70%",
      ring: "166 47% 52%",
    },
  },

  // ── Neutrals ──
  brown: {
    displayName: "Brown",
    swatch: "#A2845E",
    light: {
      primary: "30 28% 50%",
      primaryForeground: "0 0% 100%",
      accent: "30 28% 94%",
      accentForeground: "30 28% 34%",
      ring: "30 28% 50%",
    },
    dark: {
      primary: "30 28% 60%",
      primaryForeground: "0 0% 0%",
      accent: "30 18% 16%",
      accentForeground: "30 28% 75%",
      ring: "30 28% 60%",
    },
  },
  graphite: {
    displayName: "Graphite",
    swatch: "#8E8E93",
    light: {
      primary: "240 2% 56%",
      primaryForeground: "0 0% 100%",
      accent: "240 2% 94%",
      accentForeground: "240 2% 38%",
      ring: "240 2% 56%",
    },
    dark: {
      primary: "240 2% 66%",
      primaryForeground: "0 0% 0%",
      accent: "240 2% 16%",
      accentForeground: "240 2% 78%",
      ring: "240 2% 66%",
    },
  },
};

/** Ordered list matching iOS layout for the color picker grid. */
export const ACCENT_COLOR_ORDER: AccentColorName[] = [
  "sky",
  "blue",
  "navy",
  "periwinkle",
  "indigo",
  "midnight",
  "lavender",
  "purple",
  "plum",
  "rose",
  "pink",
  "magenta",
  "coral",
  "red",
  "crimson",
  "peach",
  "orange",
  "tangerine",
  "lemon",
  "amber",
  "yellow",
  "gold",
  "chartreuse",
  "lime",
  "green",
  "emerald",
  "forest",
  "aqua",
  "teal",
  "ocean",
  "cyan",
  "electric",
  "seafoam",
  "mint",
  "jade",
  "brown",
  "graphite",
];
