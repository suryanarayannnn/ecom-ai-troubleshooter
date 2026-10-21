import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { AnalysisSchema } from "@/lib/schema";
import { getSystemPrompt } from "@/lib/systemPrompt";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 300; // long diagnostics can take a minute or two

const MAX_INPUT_CHARS = 60_000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables." },
      { status: 500 },
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Rate limit reached. Try again in ${Math.ceil(limit.retryAfterSec / 60)} min.` },
      { status: 429 },
    );
  }

  let data: string;
  try {
    const body = await req.json();
    data = typeof body?.data === "string" ? body.data.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (data.length < 50) {
    return NextResponse.json({ error: "Paste more data — at least the weekly PnL." }, { status: 400 });
  }
  if (data.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Input is ${data.length.toLocaleString()} characters; the limit is ${MAX_INPUT_CHARS.toLocaleString()}. Trim older weeks or less relevant breakdowns.` },
      { status: 413 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: getSystemPrompt(),
      output_config: { effort: "medium", format: zodOutputFormat(AnalysisSchema) },
      messages: [
        {
          role: "user",
          content: `Run the full 8-step L3 diagnostic on the seller data below.\n\n<seller_data>\n${data}\n</seller_data>`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined this request." }, { status: 422 });
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return NextResponse.json(
        { error: "The analysis was too long to finish. Try pasting less data." },
        { status: 502 },
      );
    }

    return NextResponse.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "AI service is busy. Please retry in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid ANTHROPIC_API_KEY on the server." }, { status: 500 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI service error (${err.status}).` }, { status: 502 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
