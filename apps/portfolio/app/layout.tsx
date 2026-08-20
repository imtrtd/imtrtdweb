import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import "./brand.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });
const display = Unbounded({ variable: "--font-display", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://imtryingtodesign.com"),
  title: "I/TD SYSTEM — ImTryingToDesign",
  description: "We bridge developer engineering with high-fidelity creative precision. Beautiful interfaces backed by brutalist code structures.",
  other: { "codex-preview": "development" },
  icons: {
    icon: [{ url: "/favicon.svg?v=11", type: "image/svg+xml" }],
    shortcut: "/favicon.svg?v=11",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
