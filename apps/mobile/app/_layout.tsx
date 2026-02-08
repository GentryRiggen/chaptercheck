import "../index";
import "../global.css";

import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

import { ExpandedPlayer } from "@/components/audio/ExpandedPlayer";
import { MiniPlayer } from "@/components/audio/MiniPlayer";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { tokenCache } from "@/lib/tokenCache";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL as string, {
  unsavedChangesWarning: false,
});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;

if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <PermissionsProvider>
            <AudioPlayerProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="books/[bookId]" options={{ headerShown: true, title: "" }} />
                <Stack.Screen
                  name="authors/[authorId]"
                  options={{ headerShown: true, title: "" }}
                />
                <Stack.Screen name="series/[seriesId]" options={{ headerShown: true, title: "" }} />
                <Stack.Screen name="shelves/[shelfId]" options={{ headerShown: true, title: "" }} />
                <Stack.Screen name="users/[userId]" options={{ headerShown: true, title: "" }} />
              </Stack>
              <MiniPlayer />
              <ExpandedPlayer />
            </AudioPlayerProvider>
          </PermissionsProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
