import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ImTryingToDesign — Independent Digital Studio",
  description: "Distinctive websites, art direction and creative development for ambitious brands worth noticing.",
  other: { "codex-preview": "development" },
  icons: {
    icon: [{ url: "/favicon.svg?v=3", type: "image/svg+xml" }],
    shortcut: "/favicon.svg?v=3",
  },
};

export const viewport: Viewport = {
  themeColor: "#080807",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
