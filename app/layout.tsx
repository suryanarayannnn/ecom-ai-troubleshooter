import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "L3 Diagnostic — find why a D2C week lost money",
  description:
    "AI root-cause analyst for Facebook D2C sellers. Paste PnL, campaign, audience, geo and fulfilment data; get an 8-step L3 case study with a ₹-quantified action plan. Built by S Surya Narayan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
