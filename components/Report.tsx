"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Report({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "l3-diagnostic-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Full case study</h3>
        <div className="flex gap-2">
          <button onClick={copy} className="rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "var(--line)" }}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={download} className="rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "var(--line)" }}>
            Download .md
          </button>
        </div>
      </div>
      <article className="prose-report mt-4 text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </section>
  );
}
