import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";
import PricingApp from "@/components/PricingApp";

export const metadata: Metadata = {
  title: "Pricing & tokens · LossLens",
  description: "Free tier and token pricing for LossLens: AI troubleshooting and the Shopify Section Studio.",
};

export default function PricingPage() {
  if (!FEATURES.tokens) redirect("/");
  return <PricingApp />;
}
