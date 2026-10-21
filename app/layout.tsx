import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "L3 PnL Diagnostic — AI root-cause analysis for D2C sellers",
  description:
    "Paste a Facebook seller's PnL, campaign, audience, geo and fulfilment data and get an 8-step L3 root-cause case study with an action plan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
