import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "LossLens — Automated Profit Troubleshooter for E-commerce & Shopify Stores",
  description:
    "LossLens finds why an online store's week lost money. Paste PnL, ad campaign, audience, geo and fulfilment data; get an automated 8-step root-cause report with a ₹-quantified action plan. Built by S Surya Narayan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
