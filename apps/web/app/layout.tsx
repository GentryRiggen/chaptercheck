import "./globals.css";

import type { Metadata } from "next";

import { NowPlayingSpacer } from "@/components/audio/NowPlayingSpacer";
import { NowPlayingUI } from "@/components/audio/NowPlayingUI";
import { AccentApplicator } from "@/components/layout/AccentApplicator";
import { IOSBackground } from "@/components/layout/IOSBackground";
import { Navigation } from "@/components/layout/Navigation";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Chapter Check",
  description: "Your personal audiobook library",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <ScrollToTop />
          <AccentApplicator />
          <IOSBackground />
          <Navigation />
          {children}
          <NowPlayingSpacer />
          <NowPlayingUI />
        </Providers>
      </body>
    </html>
  );
}
