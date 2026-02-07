/**
 * HSL color values as JS objects for React Native fallback.
 * These match the CSS variables defined in globals.css.
 */

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export const lightColors = {
  background: hsl(40, 18, 96),
  foreground: hsl(220, 13, 26),
  card: hsl(0, 0, 100),
  cardForeground: hsl(220, 13, 26),
  popover: hsl(0, 0, 100),
  popoverForeground: hsl(220, 13, 26),
  primary: hsl(120, 13, 60),
  primaryForeground: hsl(0, 0, 100),
  secondary: hsl(40, 18, 93),
  secondaryForeground: hsl(220, 13, 26),
  muted: hsl(40, 18, 93),
  mutedForeground: hsl(220, 9, 46),
  accent: hsl(120, 13, 92),
  accentForeground: hsl(120, 13, 40),
  destructive: hsl(0, 84.2, 60.2),
  destructiveForeground: hsl(0, 0, 98),
  border: hsl(37, 14, 89),
  input: hsl(37, 14, 89),
  ring: hsl(120, 13, 60),
};

export const darkColors = {
  background: hsl(50, 8, 9),
  foreground: hsl(50, 5, 88),
  card: hsl(50, 5, 13),
  cardForeground: hsl(50, 5, 88),
  popover: hsl(50, 5, 13),
  popoverForeground: hsl(50, 5, 88),
  primary: hsl(120, 13, 60),
  primaryForeground: hsl(50, 8, 9),
  secondary: hsl(50, 8, 15),
  secondaryForeground: hsl(50, 5, 88),
  muted: hsl(50, 8, 15),
  mutedForeground: hsl(50, 5, 55),
  accent: hsl(120, 13, 18),
  accentForeground: hsl(120, 13, 70),
  destructive: hsl(0, 62.8, 30.6),
  destructiveForeground: hsl(0, 0, 98),
  border: hsl(48, 8, 17),
  input: hsl(48, 8, 17),
  ring: hsl(120, 13, 60),
};
