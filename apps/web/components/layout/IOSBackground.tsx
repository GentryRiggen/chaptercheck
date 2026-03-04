"use client";

/**
 * Minimal background replacement for the ornate MeshBackground.
 * Fixed full-screen div with the theme's background color.
 */
export function IOSBackground() {
  return <div className="fixed inset-0 -z-10 bg-background" />;
}
