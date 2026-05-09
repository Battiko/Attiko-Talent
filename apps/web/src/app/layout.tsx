import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "../styles/globals.css";
import { TRPCProvider } from "@/components/providers/TRPCProvider";
import { ServiceWorkerRegistration } from "@/components/providers/ServiceWorkerRegistration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-canela",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Attiko — Talent Search",
    template: "%s | Attiko",
  },
  description:
    "Discover world-class musicians, vocalists, DJs, and performers for weddings and private events. International talent search for discerning event planners.",
  keywords: ["wedding musicians", "private event entertainment", "talent search", "wedding band", "event performers"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Attiko Talent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png",   sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Attiko — Talent Search",
    description: "International talent discovery for private events and weddings.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Attiko — Talent Search",
    description: "International talent discovery for private events and weddings.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
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
      <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
        <body className="min-h-screen bg-black antialiased">
          <TRPCProvider>{children}</TRPCProvider>
          <ServiceWorkerRegistration />
        </body>
      </html>
    </ClerkProvider>
  );
}
