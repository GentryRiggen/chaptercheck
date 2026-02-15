import "../index";
import "../global.css";

import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import React from "react";

import { ExpandedPlayer } from "@/components/audio/ExpandedPlayer";
import { MiniPlayer } from "@/components/audio/MiniPlayer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { DownloadManagerProvider } from "@/contexts/DownloadManagerContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { tokenCache } from "@/lib/tokenCache";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL as string, {
  unsavedChangesWarning: false,
});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;

if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
}

function AppContent() {
  const { colorScheme } = useColorScheme();

  return (
    <ErrorBoundary>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
      <MiniPlayer />
      <ExpandedPlayer />
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <PermissionsProvider>
            <DownloadManagerProvider>
              <AudioPlayerProvider>
                <AppContent />
              </AudioPlayerProvider>
            </DownloadManagerProvider>
          </PermissionsProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
