"use client";
import { useState } from "react";
import type { Quarter, Status } from "@/lib/covenants";
import { download, usd } from "@/components/ui";

type B = { id: string; hist: Quarter[]; latest: Quarter };
const TONE: Record<Status, string> = { breach: "text-high", watch: "text-med", ok: "text-ok", unevaluable: "text-muted" };
const LABEL: Record<Status, string> = { breach: "Breach", watch: "Watch", ok: "Compliant", unevaluable: "Not evaluable" };
const order: Status[] = ["breach", "unevaluable", "watch", "ok"];

export default function CovenantBoard({ borrowers, policy }: { borrowers: B[]; policy: string }) {
  const sorted = [...borrowers].sort((a, b) => order.indexOf(a.latest.status) - order.indexOf(b.latest.status) || a.id.localeCompare(b.id));
  const [sel, setSel] = useState(sorted[0]?.id);
  const cur = sorted.find((b) => b.id === sel) ?? sorted[0];
  if (!cur) return <p className="mt-8 text-muted">No valid covenant rows.</p>;

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-2" role="listbox" aria-label="Borrowers">
        {sorted.map((b) => (
          <button key={b.id} role="option" aria-selected={b.id === cur.id} onClick={() => setSel(b.id)}
            className={`card block w-full p-3 text-left ${b.id === cur.id ? "ring-2 ring-brand" : "hover:bg-bg"}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium">{b.id}</span>
              <span className={`chip ${TONE[b.latest.status]}`}>{LABEL[b.latest.status]}</span>
            </div>
            <div className="num mt-1 flex gap-4 text-xs text-muted">
              <span>Lev {b.latest.leverage?.toFixed(2) ?? "n/a"}× / {b.latest.maxLev}×</span>
              <span>DSCR {b.latest.dscr?.toFixed(2) ?? "n/a"}× / {b.latest.minDscr}×</span>
            </div>
            <div className="mt-2 flex gap-1" aria-label="Quarterly status">
              {b.hist.map((q) => (
                <span key={q.record_id} title={`${q.period}: ${LABEL[q.status]}`}
                  className={`h-1.5 flex-1 rounded-full ${q.status === "breach" ? "bg-high" : q.status === "watch" ? "bg-med" : q.status === "ok" ? "bg-ok" : "bg-muted"}`} />
              ))}
            </div>
          </button>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{cur.id} <span className="text-sm font-normal text-muted">· quarterly headroom</span></h2>
          <button className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-bg"
            onClick={() => download(`covenants-${cur.id}.csv`, cur.hist.map((q) => ({
              borrower: q.borrower, period: q.period, leverage: q.leverage ?? "", max_leverage: q.maxLev, dscr: q.dscr ?? "", min_dscr: q.minDscr,
              status: q.status, ebitda_cushion: q.ebitdaCushion ?? "", cashflow_cushion: q.cashCushion ?? "", loan_covenants_csv_row: q.csvRow,
            })))}>Export CSV</button>
        </div>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <Trend title="Leverage (lower is better)" hist={cur.hist} get={(q) => q.leverage} limit={Number(cur.latest.maxLev)} kind="max" />
          <Trend title="DSCR (higher is better)" hist={cur.hist} get={(q) => q.dscr} limit={Number(cur.latest.minDscr)} kind="min" />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr><th className="py-2">Quarter</th><th className="text-right">Leverage</th><th className="text-right">EBITDA cushion</th><th className="text-right">DSCR</th><th className="text-right">Cash-flow cushion</th><th className="text-right">Status</th></tr>
            </thead>
            <tbody>
              {cur.hist.map((q) => (
                <tr key={q.record_id} className="border-t border-line">
                  <td className="py-2">{q.period}<div className="font-mono text-[10px] text-muted">{q.record_id} · row {q.csvRow}</div></td>
                  <td className={`num text-right ${q.leverageBreach ? "text-high font-semibold" : ""}`}>{q.leverage?.toFixed(2) ?? "n/a"}×</td>
                  <td className="num text-right">{q.ebitdaCushion === null ? "n/a" : `${(q.ebitdaCushion * 100).toFixed(1)}%`}</td>
                  <td className={`num text-right ${q.dscrBreach ? "text-high font-semibold" : ""}`}>{q.dscr?.toFixed(2) ?? "n/a"}×</td>
                  <td className="num text-right">{q.cashCushion === null ? "n/a" : `${(q.cashCushion * 100).toFixed(1)}%`}</td>
                  <td className={`text-right font-medium ${TONE[q.status]}`}>{LABEL[q.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Trace q={cur.latest} policy={policy} />
      </div>
    </section>
  );
}

function Trend({ title, hist, get, limit, kind }: { title: string; hist: Quarter[]; get: (q: Quarter) => number | null; limit: number; kind: "max" | "min" }) {
  const vals = hist.map(get);
  const nums = vals.filter((v): v is number => v !== null);
  const lo = Math.min(...nums, limit) * 0.9, hi = Math.max(...nums, limit) * 1.1;
  const W = 300, H = 90, x = (i: number) => 10 + (i * (W - 20)) / Math.max(1, hist.length - 1), y = (v: number) => H - 10 - ((v - lo) / (hi - lo || 1)) * (H - 20);
  const pts = vals.map((v, i) => (v === null ? null : [x(i), y(v)] as const));
  return (
    <figure>
      <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${vals.map((v, i) => `${hist[i].period} ${v?.toFixed(2) ?? "n/a"}`).join(", ")}; covenant limit ${limit}`}>
        <line x1="0" x2={W} y1={y(limit)} y2={y(limit)} stroke="var(--high)" strokeDasharray="4 3" />
        <text x={W - 2} y={y(limit) - 4} textAnchor="end" fontSize="9" fill="var(--high)">{kind} {limit.toFixed(2)}×</text>
        <polyline fill="none" stroke="var(--ink)" strokeWidth="1.5" points={pts.filter(Boolean).map((p) => p!.join(",")).join(" ")} />
        {pts.map((p, i) => p && (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="3.5" fill={(kind === "max" ? vals[i]! > limit : vals[i]! < limit) ? "var(--high)" : "var(--ink)"} />
            <text x={p[0]} y={H - 0} textAnchor="middle" fontSize="8" fill="var(--muted)">{hist[i].period.slice(2)}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function Trace({ q, policy }: { q: Quarter; policy: string }) {
  const money = (s: string) => usd(Number(s));
  return (
    <div className="mt-6 rounded-lg border border-line bg-bg p-4 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Calculation trace · {q.period} · {q.record_id} (loan_covenants.csv row {q.csvRow})</h3>
      <div className="num mt-3 grid gap-3 font-mono text-xs md:grid-cols-2">
        <div>
          <b>Leverage</b> = {money(q.debt)} ÷ {money(q.ebitda)} = <b className={q.leverageBreach ? "text-high" : ""}>{q.leverage?.toFixed(2) ?? "n/a"}×</b>
          <div className="text-muted">limit ≤ {q.maxLev}×</div>
        </div>
        <div>
          <b>DSCR</b> = {money(q.cashflow)} ÷ {money(q.service)} = <b className={q.dscrBreach ? "text-high" : ""}>{q.dscr?.toFixed(2) ?? "n/a"}×</b>
          <div className="text-muted">limit ≥ {q.minDscr}×</div>
        </div>
      </div>
      {q.reasons.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs">{q.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      <blockquote className="mt-3 border-l-2 border-brand pl-3 text-xs italic text-muted">
        <span className="not-italic font-semibold">documents/loan-policy.txt:</span> {policy.replace(/^FICTIONAL LOAN POLICY\s*/, "")}
      </blockquote>
    </div>
  );
}
