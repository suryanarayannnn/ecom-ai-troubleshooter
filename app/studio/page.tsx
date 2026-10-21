import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/lib/features";
import StudioApp from "@/components/studio/StudioApp";

export const metadata: Metadata = {
  title: "Section Studio — AI Shopify section builder · LossLens",
  description: "Describe a Shopify section and get production-ready Liquid with theme-editor settings, a live preview, and chat refinement.",
};

export default function StudioPage() {
  if (!FEATURES.studio) notFound();
  return <StudioApp />;
}
