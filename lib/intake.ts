// Recognises which data sources are present and which steps they unlock.
export type Source = { id: string; label: string; re: RegExp; steps: number[]; required?: boolean };

export const SOURCES: Source[] = [
  { id: "pnl", label: "Weekly PnL", re: /net\s*profit/i, steps: [1, 2], required: true },
  { id: "changelog", label: "Catalogue changelog", re: /changelog|cost price|selling price|visibility/i, steps: [3, 6] },
  { id: "fulfilment", label: "Fulfilment / carrier", re: /\bfad\b|o2s|s2a|\bndr\b|carrier/i, steps: [4] },
  { id: "audience", label: "Gender / age / platform", re: /gender|female|\bage\b|18-24|instagram|placement/i, steps: [5] },
  { id: "meta", label: "Meta weekly trend", re: /\bcpm\b|\bctr\b|c2pr/i, steps: [5, 8] },
  { id: "product", label: "Product PnL", re: /product|\bsku\b/i, steps: [6] },
  { id: "geo", label: "State breakdown", re: /\bstate\b|maharashtra|karnataka|uttar pradesh|tier\s*[123]/i, steps: [7] },
  { id: "payment", label: "Payment / coupon", re: /\bcod\b|payment mode|coupon/i, steps: [2, 7] },
  { id: "campaign", label: "Campaign PnL", re: /campaign/i, steps: [8] },
];

export const STEP_NAMES = [
  "Intake", "Benchmark", "Problem metric", "Changelog", "Fulfilment",
  "Audience", "Product", "Geo", "Campaign cross-cut",
];

export function detect(text: string) {
  const found = SOURCES.filter((s) => s.re.test(text));
  const unlocked = new Set<number>([0]);
  found.forEach((s) => s.steps.forEach((n) => unlocked.add(n)));
  return { found, unlocked };
}

// Most specific sources first, so a campaign file that mentions products is still a campaign file.
const FILE_ORDER = ["pnl", "campaign", "changelog", "fulfilment", "meta", "audience", "geo", "payment", "product"];

export function detectFileType(name: string, text: string): string {
  const ordered = FILE_ORDER.map((id) => SOURCES.find((s) => s.id === id)!);
  const byName = ordered.find((s) => s.re.test(name.replace(/[_-]/g, " ")));
  if (byName) return byName.label;
  const head = text.slice(0, 1500);
  return ordered.find((s) => s.re.test(head))?.label ?? "Unrecognised";
}
