"use client";

import { useState } from "react";

const FAQ = [
  {
    q: "What data do I need?",
    a: "Only the weekly seller PnL is required: spend, GMV, RTO%, Spend/GMV%, COGS%, Cancel% and Net Profit% per week. Every extra block (changelog, campaign PnL, gender/age/platform, state, product, fulfilment, Meta weekly trend) unlocks another step. Anything missing is flagged as a data gap, never invented.",
  },
  {
    q: "How deep does the root cause go?",
    a: "Three levels deep. Level 1 is the broken metric (for example, RTO is up 17pp). Level 2 is a single factor (for example, more orders going to men). Level 3 crosses two factors to name the actual mechanism: for example, campaign × gender, where new 'Women Only' campaigns delivered 64% of orders to men and caused doorstep refusals. Level 3 is where you can act.",
  },
  {
    q: "How is the benchmark week chosen?",
    a: "With a strict flowchart. The tool looks for profitable (>5%) weeks first, then break-even (3–5%) weeks. It tries spend bands of ±10%, then ±20%, then ±30%, and looks back 6 months, then 12 months, then the full history. It prefers 4 consecutive weeks over 1. Loss weeks never qualify. If nothing fits, the comparison is labelled DIRECTIONAL.",
  },
  {
    q: "How is the ₹ impact calculated?",
    a: "Only metrics that got worse are counted. Each percentage point of change is multiplied by a fixed share of loss-week GMV: RTO 0.8%, S/GMV 2.0%, COGS 1.0%, Cancel 0.5%. These numbers rank where the money went. They are not an exact accounting reconciliation.",
  },
  {
    q: "Is my data stored?",
    a: "This app has no database. Your paste is sent once to the Claude API to produce the analysis and then discarded by the app. Don't paste data you're not allowed to share.",
  },
  {
    q: "Can it be wrong?",
    a: "Yes. That's why the framework forces every number to come from your data, marks estimates, and lists the data that would change the conclusion. Treat the output like a sharp analyst's first draft, and verify the top action before you act on it.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {FAQ.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium">{f.q}</span>
              <span className="text-xl transition-transform duration-300" style={{ transform: isOpen ? "rotate(45deg)" : "none", color: "var(--loss)" }}>+</span>
            </button>
            <div className="grid transition-all duration-300" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed muted">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
