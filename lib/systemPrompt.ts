import { readFileSync } from "node:fs";
import path from "node:path";

// The diagnostic framework lives in /prompts as plain markdown so it can be
// edited without touching code. Loaded once per server instance.
let cached: string | null = null;

export function getSystemPrompt(): string {
  if (cached) return cached;
  const dir = path.join(process.cwd(), "prompts");
  const core = readFileSync(path.join(dir, "l3-diagnostic.md"), "utf8");
  const addendum = readFileSync(path.join(dir, "web-app-addendum.md"), "utf8");
  cached = `${core}\n\n${addendum}`;
  return cached;
}
