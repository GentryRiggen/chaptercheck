// Centralized theme colors for the mesh background and other components
// These are the neon accent colors used throughout the app

export const neonColors = {
  cyan: {
    hex: "#00e5ff",
    rgb: { r: 0, g: 229, b: 255 },
    rgbString: "0, 229, 255",
  },
  pink: {
    hex: "#ff0099",
    rgb: { r: 255, g: 0, b: 153 },
    rgbString: "255, 0, 153",
  },
  // Deeper variants for light mode (better contrast)
  deepPink: {
    hex: "#db2777",
    rgb: { r: 219, g: 39, b: 119 },
    rgbString: "219, 39, 119",
  },
  deepCyan: {
    hex: "#06b6d4",
    rgb: { r: 6, g: 182, b: 212 },
    rgbString: "6, 182, 212",
  },
} as const;

export const meshBackground = {
  dark: {
    primary: neonColors.cyan,
    secondary: neonColors.pink,
    baseGradient:
      "radial-gradient(ellipse at 50% 50%, #1a1a2e 0%, #0a0a0a 100%)",
    opacity: {
      spotlight: 0.12,
      ambientGlow: 0.08,
      gridDot: 0.3,
      gridLine: 0.08,
      rippleBorder: 0.3,
      rippleGlow: 0.15,
      cornerGlow: 0.3,
      cornerGlowInner: 0.15,
    },
    orbs: [
      { baseX: 20, baseY: 25, size: 300, opacity: 0.06, speed: 0.3 },
      { baseX: 75, baseY: 70, size: 250, opacity: 0.05, speed: 0.2 },
      { baseX: 50, baseY: 20, size: 200, opacity: 0.07, speed: 0.25 },
      { baseX: 80, baseY: 30, size: 280, opacity: 0.04, speed: 0.15 },
    ],
  },
  light: {
    primary: neonColors.deepPink,
    secondary: neonColors.deepCyan,
    baseGradient:
      "radial-gradient(ellipse at 50% 50%, #fdf2f8 0%, #f0f4f8 50%, #ecfeff 100%)",
    opacity: {
      spotlight: 0.18,
      ambientGlow: 0.12,
      gridDot: 0.4,
      gridLine: 0.12,
      rippleBorder: 0.25,
      rippleGlow: 0.1,
      cornerGlow: 0.4,
      cornerGlowInner: 0.2,
    },
    orbs: [
      { baseX: 20, baseY: 25, size: 300, opacity: 0.1, speed: 0.3 },
      { baseX: 75, baseY: 70, size: 250, opacity: 0.08, speed: 0.2 },
      { baseX: 50, baseY: 20, size: 200, opacity: 0.12, speed: 0.25 },
      { baseX: 80, baseY: 30, size: 280, opacity: 0.07, speed: 0.15 },
    ],
  },
} as const;

// Helper to get theme config based on dark mode
export function getMeshTheme(isDark: boolean) {
  return isDark ? meshBackground.dark : meshBackground.light;
}

// Type exports for use in components
export type NeonColor = (typeof neonColors)[keyof typeof neonColors];
export type MeshTheme = (typeof meshBackground)["dark" | "light"];
