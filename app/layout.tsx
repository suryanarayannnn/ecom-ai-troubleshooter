import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import SpotlightTracker from "@/components/SpotlightTracker";
import { THEME_BOOT } from "@/lib/themeBoot";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "LossLens — Autonomous Profit Troubleshooter for E-commerce & Shopify Stores",
  description:
    "LossLens is an AI agent that finds why an online store's week lost money. A deterministic engine computes the numbers, an AI analyst reasons through 8 steps, and a verifier blocks anything it can't trace. Built by S Surya Narayan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${inter.variable} ${grotesk.variable} ${jbmono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <SpotlightTracker />
        {children}
      </body>
    </html>
  );
}
