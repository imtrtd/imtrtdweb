import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });
const display = Unbounded({ variable: "--font-display", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "I/TD SYSTEM — ImTryingToDesign",
  description: "We bridge developer engineering with high-fidelity creative precision. Beautiful interfaces backed by brutalist code structures.",
  other: { "codex-preview": "development" },
  icons: {
    icon: [
      { url: "/favicon.png?v=10", type: "image/png", sizes: "any" },
      { url: "/favicon-32.png?v=10", type: "image/png", sizes: "32x32" },
      { url: "/favicon.svg?v=10", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.png?v=10",
    apple: "/favicon-180.png?v=10",
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
