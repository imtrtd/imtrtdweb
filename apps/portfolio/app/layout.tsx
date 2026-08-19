import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./brand.css";

const sans = Space_Grotesk({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://imtryingtodesign.com"),
  title: {
    default: "ImTryingToDesign — Web Development",
    template: "%s — ImTryingToDesign",
  },
  description: "Expressive web design and development for independent studios, artists, small brands and digital products.",
  openGraph: {
    type: "website",
    siteName: "ImTryingToDesign",
    title: "ImTryingToDesign — Web Development",
    description: "Expressive web design and development for independent studios, artists, small brands and digital products.",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
