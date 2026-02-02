"use client";

import { useAudioPlayerContext } from "@/contexts/AudioPlayerContext";

/**
 * Adds bottom padding to prevent content from being hidden behind the NowPlayingBar.
 * Include this at the bottom of pages/layouts that have scrollable content.
 */
export function NowPlayingSpacer() {
  const { currentTrack } = useAudioPlayerContext();

  if (!currentTrack) return null;

  // h-16 (64px) for the bar + safe area inset
  return <div className="h-16 pb-[env(safe-area-inset-bottom)]" />;
}
