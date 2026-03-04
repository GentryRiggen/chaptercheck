"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { ACCENT_COLORS } from "@/lib/accent-colors";

/**
 * Renderless component that applies accent color CSS vars to <html>.
 * Only overrides accent-related vars — all other shadcn tokens stay as-is.
 */
export function AccentApplicator() {
  const { accentColor } = useUserPreferences();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const colorDef = ACCENT_COLORS[accentColor];
    if (!colorDef) return;

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const vars = colorDef[mode];
    const root = document.documentElement;

    root.style.setProperty("--primary", vars.primary);
    root.style.setProperty("--primary-foreground", vars.primaryForeground);
    root.style.setProperty("--accent", vars.accent);
    root.style.setProperty("--accent-foreground", vars.accentForeground);
    root.style.setProperty("--ring", vars.ring);
  }, [accentColor, resolvedTheme]);

  return null;
}
