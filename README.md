# LossLens: Automated Profit Troubleshooter for E-commerce & Shopify Stores

**Live:** https://ecom-ai-troubleshooter.vercel.app · **Built by** [S Surya Narayan](https://www.linkedin.com/in/ssuryanarayan)

When an online store has a losing week, LossLens finds out why. Answer four quick questions, then paste the store's weekly PnL and any supporting data you have (ad campaigns, gender, age, platform, state, product, fulfilment, catalogue changelog). LossLens runs a strict **8-step troubleshooting method** and returns:

- **A dashboard**: the four problem metrics (RTO, Spend/GMV, COGS, Cancel) with their ₹ impact, state RTO shifts, campaign spend shifts, and a verdict for every layer (✅ / ⚠️ / 🔴)
- **A cross-cut root cause**: campaign × one other factor (gender, product, geo, catalogue or carrier)
- **A prioritised action plan** with a recovery target
- **The full case study** as markdown (copy or download)

> The troubleshooting framework is in [`prompts/l3-diagnostic.md`](prompts/l3-diagnostic.md). I built it from 12+ live seller case studies.

## How it works

```
Browser (Next.js page)  ──POST /api/analyze──▶  Serverless function (Vercel)
   paste data / sample                             ├─ system prompt = prompts/*.md
   charts (Recharts)  ◀── JSON ─────────────────── ├─ Claude API (structured output, zod schema)
   markdown report                                 └─ rate limit + input caps
```

- One model call returns **both** the narrative report and typed dashboard JSON, validated against [`lib/schema.ts`](lib/schema.ts).
- Missing data is never invented. Empty breakdowns show as "No data" and are listed under *data gaps*.
- The API key lives only on the server (Vercel environment variable).

**Stack:** Next.js 15 · TypeScript · Tailwind CSS v4 · Recharts · Anthropic SDK · Zod

## Deploy (no local install needed)

1. **Get an Anthropic API key** at <https://console.anthropic.com>. Under *Limits*, set a monthly spend cap, because the demo is public.
2. **Put the code on GitHub**: create a new repository → *Add file → Upload files* → drag in everything in this folder → *Commit*.
3. **Deploy on Vercel**: sign in at <https://vercel.com> with GitHub → *Add New → Project* → import the repository.
4. Before you click *Deploy*, open **Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your key
   - *(optional)* `ANTHROPIC_MODEL` = `claude-sonnet-5-5` for lower cost per run (the default is `claude-opus-5-5`)
5. Click **Deploy**. You get a public `https://<name>.vercel.app` link.

Every later commit to GitHub, including edits made in GitHub's web editor, redeploys automatically.

## Customise

| What | Where |
|---|---|
| Your name and links in the header | `lib/site.ts` |
| The diagnostic framework | `prompts/l3-diagnostic.md` |
| Web-app output rules | `prompts/web-app-addendum.md` |
| Demo dataset (fictional) | `lib/sampleData.ts` |
| Dashboard fields | `lib/schema.ts` + `components/Dashboard.tsx` |

## Guardrails

- About 5 requests per IP every 10 minutes (best effort, per server instance)
- 60,000-character input cap and an output token cap
- Refusals, truncation and API errors return readable messages

## Run locally (optional)

```bash
npm install
cp .env.example .env.local   # add your key
npm run dev
```
