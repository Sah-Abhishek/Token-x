import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Bricolage Grotesque has a point of view; Geist is this stack's default and
// made the product look like every other Next.js app.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

// Numerals only. Tabular figures keep prices from jittering as digits change.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TokenX",
    template: "%s | TokenX",
  },
  description: "Practice crypto trading without risk.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // ClerkProvider wraps <html> rather than sitting inside <body>, which is
    // what Clerk's App Router setup expects.
    <ClerkProvider>
      <html lang="en">
        <body className={`${bricolage.variable} ${plexMono.variable} antialiased`}>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
