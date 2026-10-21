import { z } from "zod";

export const SectionSchema = z.object({
  name: z.string(),
  summary: z.string(),
  liquid: z.string(),
  preview_html: z.string(),
});
export type GeneratedSection = z.infer<typeof SectionSchema>;

export type BrandStyle = {
  brand: string;
  primary: string;
  accent: string;
  font: string;
  corners: "sharp" | "soft" | "round";
  vibe: string;
};

export const FONTS = ["Inter", "Poppins", "DM Sans", "Playfair Display", "Cormorant Garamond", "Space Grotesk", "Outfit"];
export const VIBES = ["Minimal", "Luxury", "Playful", "Bold", "Organic", "Techy"];

export const PRESETS = [
  { label: "Hero banner", prompt: "A full-width hero banner with a background image, overlay, eyebrow text, big heading, subheading and two buttons. Text alignment and overlay opacity configurable." },
  { label: "Product grid", prompt: "A featured collection grid that shows products from a chosen collection with image, title, price, compare-at price and a sale badge. Columns configurable for desktop and mobile." },
  { label: "Testimonials", prompt: "A customer testimonials section with star ratings, quote, customer name and location as blocks, shown as a responsive card grid." },
  { label: "FAQ accordion", prompt: "An FAQ accordion with a heading, where each question/answer is a block, using native details/summary so it works without JavaScript." },
  { label: "Image + text", prompt: "An image-with-text section with image left or right, heading, rich text, bullet highlights as blocks, and a button." },
  { label: "Announcement bar", prompt: "A slim announcement bar with up to 3 rotating-free messages as blocks shown inline, optional link, and colors configurable." },
  { label: "Trust badges", prompt: "A row of trust badges (free shipping, COD available, easy returns, secure checkout) as blocks with an icon choice, title and subtitle." },
  { label: "Newsletter", prompt: "A newsletter signup using Shopify's customer form, with heading, subheading, email field, button and success message." },
];

export const THEME_SYSTEM = `You are an expert Shopify theme developer who writes production-quality Online Store 2.0 sections.

Return ONE section as JSON with fields:
- name: short human name (e.g. "Hero banner").
- summary: 1–2 sentences on what was built or changed.
- liquid: the complete contents of a section file (sections/<handle>.liquid).
- preview_html: a static HTML + CSS mock of how the section renders with its default settings, for a sandboxed browser preview.

## Rules for \`liquid\`
- Valid Liquid for Shopify Online Store 2.0. End with exactly one {% schema %} … {% endschema %} block containing valid JSON (double quotes, no trailing commas, no comments).
- The schema must include "name" (max 25 characters), "settings", and "presets" with at least one preset, so the section appears in "Add section". Use "blocks" for repeatable items, with "max_blocks" where sensible.
- Only use valid setting types: text, textarea, richtext, inline_richtext, image_picker, color, color_background, range, select, checkbox, url, number, collection, product, video_url, font_picker, header, paragraph. A range needs min, max, step and a default within range, with at most 101 steps. A richtext default must be wrapped in <p>.
- Every setting needs an "id" and a "label". Ids are snake_case and unique.
- Scope all CSS to the section: put a <style> tag at the top and prefix every selector with #shopify-section-{{ section.id }}. Use CSS custom properties driven by settings.
- Images: {{ section.settings.image | image_url: width: 1600 | image_tag: loading: 'lazy', widths: '400, 800, 1200, 1600', alt: ... }}. When blank, use {{ 'image' | placeholder_svg_tag: 'placeholder-svg' }}. Never use the deprecated img_url.
- Products and prices: product.title, product.url, product.featured_image, {{ product.price | money }}, product.compare_at_price, product.available. For an empty collection, fall back to placeholder cards.
- Add {{ block.shopify_attributes }} on each block's wrapper element.
- Use semantic, accessible HTML (headings, alt text, aria labels, visible focus states). Make it responsive and mobile-first.
- No external JS libraries and no CDN links. Prefer zero JavaScript (use <details>, CSS scroll-snap, and so on). If a little JS is essential, keep it inline, vanilla and scoped to the section.
- Apply the brand style given (colors as setting defaults, font as a font-family stack, corner radius, overall vibe).

## Rules for \`preview_html\`
- Static body content plus one <style> tag. No <script>, no <html>, <head> or <body> tags, and no external images.
- Render the default settings and default blocks with realistic sample copy for the brand. For images, use CSS gradients or inline SVG placeholders.
- It must look like the real section on a storefront: same layout, spacing, typography and colors. It must be responsive (it will be shown at both desktop and 390px mobile widths).

## When refining
You'll receive the current liquid, the current preview and a change request. Apply the change and return the FULL updated liquid and preview_html. Keep everything else intact.`;

export function buildThemeUserMessage(prompt: string, style: BrandStyle, previous?: { liquid: string; preview_html: string }) {
  const s = `Brand: ${style.brand || "Untitled store"} · primary ${style.primary} · accent ${style.accent} · font "${style.font}" · ${style.corners} corners · vibe: ${style.vibe}`;
  if (!previous) return `${s}\n\nBuild this section:\n${prompt}`;
  return `${s}\n\n<current_liquid>\n${previous.liquid}\n</current_liquid>\n\n<current_preview>\n${previous.preview_html}\n</current_preview>\n\nChange request:\n${prompt}`;
}

// Lightweight structural check of the generated section file.
export function checkSection(liquid: string): { ok: boolean; issues: string[]; settings: number; blocks: number } {
  const issues: string[] = [];
  const m = liquid.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  if (!m) return { ok: false, issues: ["Missing {% schema %} block."], settings: 0, blocks: 0 };
  let schema: { name?: string; settings?: unknown[]; blocks?: unknown[]; presets?: unknown[] };
  try { schema = JSON.parse(m[1]); } catch { return { ok: false, issues: ["Schema is not valid JSON."], settings: 0, blocks: 0 }; }
  if (!schema.name) issues.push("Schema has no name.");
  else if (schema.name.length > 25) issues.push("Schema name is longer than 25 characters.");
  if (!Array.isArray(schema.presets) || schema.presets.length === 0) issues.push("No presets, so it won't appear in Add section.");
  const ids = (schema.settings ?? []).map((s) => (s as { id?: string }).id).filter(Boolean);
  if (new Set(ids).size !== ids.length) issues.push("Duplicate setting ids.");
  if (/\|\s*img_url/.test(liquid)) issues.push("Uses deprecated img_url filter.");
  if (/<script[^>]+src=/i.test(liquid)) issues.push("Loads an external script.");
  return { ok: issues.length === 0, issues, settings: schema.settings?.length ?? 0, blocks: schema.blocks?.length ?? 0 };
}
