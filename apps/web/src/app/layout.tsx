import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "../styles/globals.css";
import { TRPCProvider } from "@/components/providers/TRPCProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ATTIKO — Talent Search",
    template: "%s | ATTIKO",
  },
  description:
    "Discover world-class musicians, vocalists, DJs, and performers for weddings and private events. International talent search for discerning event planners.",
  keywords: ["wedding musicians", "private event entertainment", "talent search", "wedding band", "event performers"],
  openGraph: {
    title: "ATTIKO — Talent Search",
    description: "International talent discovery for private events and weddings.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATTIKO — Talent Search",
    description: "International talent discovery for private events and weddings.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A2F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen bg-off-white antialiased">
          <TRPCProvider>{children}</TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
