"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Dashboard as D } from "@/lib/schema";

const inr = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;
const pct = (n: number | null | undefined) => (n == null ? "—" : `${n.toFixed(1)}%`);
const pp = (n: number | null | undefined) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}pp`;

const STATUS = {
  flagged: { label: "🔴 Flagged", color: "var(--loss)" },
  signal: { label: "⚠️ Signal", color: "var(--warn)" },
  ruled_out: { label: "✅ Ruled out", color: "var(--good)" },
  not_available: { label: "— No data", color: "var(--muted)" },
} as const;

const tooltipStyle = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "var(--ink)", fontWeight: 600 },
};
const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4 sm:p-6">
      <h3 className="text-base font-semibold">{title}</h3>
      {sub && <p className="text-xs muted mt-0.5">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs muted">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={tone ? { color: tone } : undefined}>{value}</p>
    </div>
  );
}

export default function Dashboard({ d }: { d: D }) {
  const totalImpact = d.metrics.reduce((s, m) => s + (m.flagged && m.impact_inr ? m.impact_inr : 0), 0);
  const metricChart = d.metrics.map((m) => ({ name: m.metric, Benchmark: m.benchmark, "Loss week": m.loss_week }));
  const stateChart = [...d.states]
    .sort((a, b) => (b.loss_order_share_pct ?? 0) - (a.loss_order_share_pct ?? 0))
    .slice(0, 12)
    .map((s) => ({ name: s.state, Benchmark: s.benchmark_rto_pct, "Loss week": s.loss_rto_pct }));
  const campaignChart = d.campaigns.map((c) => ({
    name: c.campaign.length > 22 ? `${c.campaign.slice(0, 21)}…` : c.campaign,
    "PP spend": c.pp_spend ?? 0,
    "Loss spend": c.loss_spend ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="card p-4 sm:p-6">
        <p className="text-xs muted uppercase tracking-wide">Case study</p>
        <h2 className="mt-1 text-xl sm:text-2xl font-bold">{d.header.seller}</h2>
        <p className="mt-1 text-sm muted">
          Loss week: <strong style={{ color: "var(--ink)" }}>{d.header.loss_week}</strong> · Benchmark:{" "}
          <strong style={{ color: "var(--ink)" }}>{d.header.benchmark}</strong> · {d.header.benchmark_quality}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Primary lens" value={d.header.primary_lens} tone="var(--loss)" />
        <Tile label="Loss-week GMV" value={inr(d.loss_week_gmv)} />
        <Tile label="Loss-week net profit" value={pct(d.loss_week_net_profit_pct)} tone="var(--loss)" />
        <Tile label="Flagged ₹ impact" value={inr(totalImpact)} tone="var(--loss)" />
      </div>

      {/* Root cause */}
      <section className="card p-4 sm:p-6" style={{ borderColor: "var(--loss)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--loss)" }}>🎯 L3 root cause</p>
        <p className="mt-2 text-base leading-relaxed">{d.root_cause}</p>
      </section>

      {/* Step 2 metrics */}
      {d.metrics.length > 0 && (
        <Section title="Step 2: Problem metrics" sub="Account-level PnL, benchmark average vs loss week">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricChart} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="name" {...axis} />
                  <YAxis {...axis} unit="%" />
                  <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Benchmark" fill="var(--bench)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Loss week" fill="var(--loss)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left muted text-xs">
                    <th className="py-2 pr-3">Metric</th><th className="pr-3">Bench</th><th className="pr-3">Loss</th>
                    <th className="pr-3">Δ</th><th className="pr-3">Flag</th><th>₹ impact</th>
                  </tr>
                </thead>
                <tbody>
                  {d.metrics.map((m) => (
                    <tr key={m.metric} className="border-t" style={{ borderColor: "var(--line)" }}>
                      <td className="py-2 pr-3 font-medium">{m.metric}</td>
                      <td className="pr-3">{pct(m.benchmark)}</td>
                      <td className="pr-3">{pct(m.loss_week)}</td>
                      <td className="pr-3">{pp(m.delta_pp)}</td>
                      <td className="pr-3">{m.flagged ? "🔴" : "✅"}</td>
                      <td>{m.flagged ? inr(m.impact_inr) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      {/* Layers */}
      {d.layers.length > 0 && (
        <Section title="Layer verdicts" sub="What was ruled in or out across the 8 steps">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {d.layers.map((l) => {
              const s = STATUS[l.status];
              return (
                <div key={l.layer} className="rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{l.layer}</span>
                    <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                  </div>
                  <p className="mt-1.5 text-xs muted leading-relaxed">{l.finding}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Geo */}
      {stateChart.length > 0 && (
        <Section title="Step 7: State RTO%" sub="Benchmark vs loss week, largest states by loss-week order share">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateChart} margin={{ left: -10, right: 8, bottom: 30 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" {...axis} angle={-35} textAnchor="end" interval={0} />
                <YAxis {...axis} unit="%" />
                <Tooltip {...tooltipStyle} formatter={(v) => (v == null ? "—" : `${Number(v).toFixed(1)}%`)} />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Benchmark" fill="var(--bench)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Loss week" fill="var(--loss)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Campaigns */}
      {d.campaigns.length > 0 && (
        <Section title="Step 8: Campaign spend shift" sub="Benchmark (PP) vs loss-week spend, plus S/GMV per campaign">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignChart} layout="vertical" margin={{ left: 20, right: 12 }}>
                  <CartesianGrid horizontal={false} stroke="var(--line)" />
                  <XAxis type="number" {...axis} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" {...axis} width={130} />
                  <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="PP spend" fill="var(--bench)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Loss spend" fill="var(--loss)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left muted text-xs">
                    <th className="py-2 pr-3">Campaign</th><th className="pr-3">PP S/GMV</th><th>Loss S/GMV</th>
                  </tr>
                </thead>
                <tbody>
                  {d.campaigns.map((c) => (
                    <tr key={c.campaign} className="border-t" style={{ borderColor: "var(--line)" }}>
                      <td className="py-2 pr-3 font-medium break-all">{c.campaign}</td>
                      <td className="pr-3">{pct(c.pp_sgmv_pct)}</td>
                      <td>{pct(c.loss_sgmv_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      {/* Actions */}
      {d.actions.length > 0 && (
        <Section title="Action plan" sub={d.recovery_target}>
          <ol className="space-y-3">
            {[...d.actions].sort((a, b) => a.priority - b.priority).map((a) => (
              <li key={a.priority + a.action} className="flex gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "var(--ink)", color: "var(--bg)" }}
                >
                  {a.priority}
                </span>
                <div>
                  <p className="font-medium text-sm">{a.action}</p>
                  <p className="text-xs muted mt-0.5 leading-relaxed">{a.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {d.data_gaps.length > 0 && (
        <Section title="📌 Data that would sharpen this diagnosis">
          <ul className="list-disc pl-5 space-y-1 text-sm muted">
            {d.data_gaps.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </Section>
      )}
    </div>
  );
}
