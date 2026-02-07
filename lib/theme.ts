// Centralized theme colors for the mesh background and other components
// Scandinavian Light: sage green + warm stone palette

export const themeColors = {
  sage: {
    hex: "#8BA78B",
    rgb: { r: 139, g: 167, b: 139 },
    rgbString: "139, 167, 139",
  },
  darkSage: {
    hex: "#6B8E6B",
    rgb: { r: 107, g: 142, b: 107 },
    rgbString: "107, 142, 107",
  },
  warmStone: {
    hex: "#D4C5A9",
    rgb: { r: 212, g: 197, b: 169 },
    rgbString: "212, 197, 169",
  },
  warmDark: {
    hex: "#374151",
    rgb: { r: 55, g: 65, b: 81 },
    rgbString: "55, 65, 81",
  },
} as const;

export const meshBackground = {
  dark: {
    primary: themeColors.sage,
    secondary: themeColors.warmStone,
    baseGradient: "radial-gradient(ellipse at 50% 50%, #1F1F1B 0%, #1A1A17 100%)",
    opacity: {
      spotlight: 0.06,
      ambientGlow: 0.04,
      cornerGlow: 0.15,
      cornerGlowInner: 0.08,
    },
    orbs: [
      { baseX: 25, baseY: 30, size: 400, opacity: 0.04, speed: 0.15 },
      { baseX: 70, baseY: 65, size: 350, opacity: 0.03, speed: 0.1 },
      { baseX: 50, baseY: 20, size: 300, opacity: 0.05, speed: 0.12 },
    ],
  },
  light: {
    primary: themeColors.sage,
    secondary: themeColors.warmStone,
    baseGradient: "radial-gradient(ellipse at 50% 50%, #FAF9F6 0%, #F7F7F3 50%, #F4F1EC 100%)",
    opacity: {
      spotlight: 0.08,
      ambientGlow: 0.05,
      cornerGlow: 0.2,
      cornerGlowInner: 0.1,
    },
    orbs: [
      { baseX: 25, baseY: 30, size: 400, opacity: 0.06, speed: 0.15 },
      { baseX: 70, baseY: 65, size: 350, opacity: 0.05, speed: 0.1 },
      { baseX: 50, baseY: 20, size: 300, opacity: 0.07, speed: 0.12 },
    ],
  },
} as const;

// Helper to get theme config based on dark mode
export function getMeshTheme(isDark: boolean) {
  return isDark ? meshBackground.dark : meshBackground.light;
}

// Type exports for use in components
export type ThemeColor = (typeof themeColors)[keyof typeof themeColors];
export type MeshTheme = (typeof meshBackground)["dark" | "light"];
