import "./globals.css";

import type { Metadata } from "next";

import { NowPlayingSpacer } from "@/components/audio/NowPlayingSpacer";
import { NowPlayingUI } from "@/components/audio/NowPlayingUI";
import { MeshBackground } from "@/components/layout/MeshBackground";
import { Navigation } from "@/components/layout/Navigation";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ChapterCheck",
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
          <MeshBackground />
          <Navigation />
          {children}
          <NowPlayingSpacer />
          <NowPlayingUI />
        </Providers>
      </body>
    </html>
  );
}
