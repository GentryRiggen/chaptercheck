"use client";

import { api } from "@chaptercheck/convex-backend/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { type AccentColorName, DEFAULT_ACCENT } from "@/lib/accent-colors";

interface UserPreferencesContextValue {
  accentColor: AccentColorName;
  colorSchemeMode: "system" | "light" | "dark";
  isLoading: boolean;
  updatePreferences: (prefs: {
    accentColor?: AccentColorName;
    colorSchemeMode?: "system" | "light" | "dark";
  }) => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue>({
  accentColor: DEFAULT_ACCENT,
  colorSchemeMode: "system",
  isLoading: true,
  updatePreferences: async () => {},
});

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const { setTheme } = useTheme();

  const preferences = useQuery(
    api.userPreferences.queries.getMyPreferences,
    isSignedIn ? {} : "skip"
  );
  const updatePrefsMutation = useMutation(api.userPreferences.mutations.updatePreferences);

  const isLoading = isSignedIn === undefined || (isSignedIn && preferences === undefined);

  const accentColor = (preferences?.accentColor as AccentColorName) ?? DEFAULT_ACCENT;
  const colorSchemeMode = (preferences?.colorSchemeMode as "system" | "light" | "dark") ?? "system";

  // Sync colorSchemeMode to next-themes
  useEffect(() => {
    if (!isLoading && isSignedIn) {
      setTheme(colorSchemeMode);
    }
  }, [colorSchemeMode, isLoading, isSignedIn, setTheme]);

  const updatePreferences = useCallback(
    async (prefs: {
      accentColor?: AccentColorName;
      colorSchemeMode?: "system" | "light" | "dark";
    }) => {
      if (prefs.colorSchemeMode) {
        setTheme(prefs.colorSchemeMode);
      }
      await updatePrefsMutation(prefs);
    },
    [updatePrefsMutation, setTheme]
  );

  const value = useMemo(
    () => ({ accentColor, colorSchemeMode, isLoading, updatePreferences }),
    [accentColor, colorSchemeMode, isLoading, updatePreferences]
  );

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}
