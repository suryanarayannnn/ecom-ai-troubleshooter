// Shrinks large uploads to fit the AI model's input, while the engine still
// computes from every row. Long tables keep their header plus the first and
// last rows (the most recent weeks matter most) with a note of what was cut.
import { KEYLESS } from "./llm";

export const AI_INPUT_BUDGET = KEYLESS ? 30_000 : 200_000;

function shrink(block: string, keep: number): string {
  const lines = block.split("\n");
  if (lines.length <= keep + 3) return block;
  const head = lines.slice(0, 3);
  const body = lines.slice(3);
  const first = Math.ceil(keep / 3);
  const last = keep - first;
  return [
    ...head,
    ...body.slice(0, first),
    `[… ${body.length - keep} rows omitted to fit the AI's input; the engine used every row …]`,
    ...body.slice(-last),
  ].join("\n");
}

export function compactForAI(data: string, budget = AI_INPUT_BUDGET): { text: string; trimmed: boolean } {
  if (data.length <= budget) return { text: data, trimmed: false };
  // Blocks start at "=== …" headers (pasted sections and uploaded files).
  const blocks = data.split(/\n(?====)/);
  for (const keep of [150, 90, 60, 36, 20, 10]) {
    const out = blocks.map((b) => shrink(b, keep)).join("\n");
    if (out.length <= budget) return { text: out, trimmed: true };
  }
  return {
    text: `${data.slice(0, budget)}\n[… input truncated to fit the AI; all core numbers were computed by the engine from the full data …]`,
    trimmed: true,
  };
}
