"use client";
import { useMemo, useState } from "react";
import { analyzePortfolio, DEFAULTS, type Holding } from "@/lib/portfolio";
import { Assumptions, Stat, download, usd } from "@/components/ui";

export default function PortfolioView({ holdings }: { holdings: Holding[] }) {
  const [t, setT] = useState({ security: DEFAULTS.security * 100, sector: DEFAULTS.sector * 100, top5: DEFAULTS.top5 * 100 });
  const a = useMemo(() => analyzePortfolio(holdings, { security: t.security / 100, sector: t.sector / 100, top5: t.top5 / 100 }), [holdings, t]);
  const [sel, setSel] = useState<string | null>(null);
  const selected = a.securities.find((s) => s.id === sel);
  const flags = a.securities.filter((s) => s.flag).length + a.sectors.filter((s) => s.flag).length + (a.top5Flag ? 1 : 0);
  const maxSector = Math.max(...a.sectors.map((s) => s.fraction), 0.0001);
  const maxSec = Math.max(...a.securities.slice(0, 10).map((s) => s.fraction), 0.0001);

  if (!holdings.length) return <p className="text-muted">No valid holdings.</p>;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total market value" value={usd(a.total)} sub={`${holdings.length} lots · ${new Set(holdings.map((h) => h.account_id)).size} accounts`} />
        <Stat label="Threshold flags" value={flags} tone={flags ? "high" : "ok"} sub="security · sector · top-5" />
        <Stat label="Securities held in >1 account" value={a.overlapping} tone="med" sub={`of ${a.securities.length} distinct securities`} />
        <Stat label="Est. annual fees" value={usd(a.fees)} sub={`${(a.feeRate * 100).toFixed(2)}% of assets · HHI ${a.hhi.toFixed(0)}`} />
      </div>

      <section className="card mt-4 p-4" aria-label="Thresholds">
        <h2 className="text-sm font-semibold">Flag when exposure exceeds (% of total portfolio)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {([["security", "Single security"], ["sector", "Single sector"], ["top5", "Top-5 securities combined"]] as const).map(([k, label]) => (
            <label key={k} className="text-sm">
              <span className="flex justify-between"><span>{label}</span><b className="num">{t[k].toFixed(0)}%</b></span>
              <input type="range" min={1} max={k === "top5" ? 80 : 50} value={t[k]} onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })} className="mt-1 w-full accent-[var(--brand)]" />
            </label>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold">Sector exposure</h2>
          <ul className="mt-3 space-y-3">
            {a.sectors.map((s) => (
              <li key={s.name}>
                <div className="flex justify-between text-sm"><span>{s.name} {s.flag && <span className="chip ml-1 text-high">over {t.sector.toFixed(0)}%</span>}</span><span className="num">{(s.fraction * 100).toFixed(1)}% · {usd(s.value)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-bg"><div className={`h-2 rounded-full ${s.flag ? "bg-high" : "bg-ink/70"}`} style={{ width: `${(s.fraction / maxSector) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className={`num mt-4 text-sm ${a.top5Flag ? "text-high" : "text-muted"}`}>Top-5 securities = {(a.top5 * 100).toFixed(1)}% {a.top5Flag ? `(over ${t.top5.toFixed(0)}%)` : ""}</p>
        </section>

        <section className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Largest securities, all accounts combined</h2>
            <button className="rounded-md border border-line px-3 py-1 text-sm hover:bg-bg" onClick={() => download("portfolio-exposure.csv", a.securities.map((s) => ({
              security_id: s.id, sector: s.sector, total_usd: s.value.toFixed(2), pct_of_portfolio: (s.fraction * 100).toFixed(2), accounts_held_in: s.overlap, over_threshold: s.flag ? "yes" : "no",
              source_rows: s.rows.map((r) => r.csvRow).join(" "),
            })))}>Export CSV</button>
          </div>
          <ul className="mt-3 space-y-1">
            {a.securities.slice(0, 10).map((s) => (
              <li key={s.id}>
                <button onClick={() => setSel(s.id === sel ? null : s.id)} aria-pressed={s.id === sel} className={`block w-full rounded-md p-2 text-left text-sm hover:bg-bg ${s.id === sel ? "bg-bg ring-1 ring-brand" : ""}`}>
                  <div className="flex justify-between">
                    <span><span className="font-mono text-xs">{s.id}</span> <span className="text-muted">{s.sector}</span> {s.overlap > 1 && <span className="chip ml-1 text-med">{s.overlap} accounts</span>} {s.flag && <span className="chip ml-1 text-high">flag</span>}</span>
                    <span className="num">{(s.fraction * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-bg"><div className={`h-1.5 rounded-full ${s.flag ? "bg-high" : "bg-ink/70"}`} style={{ width: `${(s.fraction / maxSec) * 100}%` }} /></div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selected && (
        <section className="card mt-4 p-4" aria-live="polite">
          <h2 className="font-semibold">{selected.id} · {selected.sector} · {usd(selected.value, 2)} ({(selected.fraction * 100).toFixed(2)}%)</h2>
          <p className="mt-1 text-xs text-muted">Source lots in portfolio_holdings.csv:</p>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted"><tr><th>Lot</th><th>CSV row</th><th>Account</th><th className="text-right">Value</th><th className="text-right">Fee (bps)</th></tr></thead>
            <tbody>
              {selected.rows.map((r) => (
                <tr key={r.record_id} className="border-t border-line"><td className="py-1.5 font-mono text-xs">{r.record_id}</td><td>{r.csvRow}</td><td>{r.account_id}</td><td className="num text-right">{usd(Number(r.market_value_usd), 2)}</td><td className="num text-right">{r.annual_fee_bps}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Assumptions
        items={[
          "Exposure is by security_id as given. The pack has no look-through data, so a fund holding the same company as a stock is NOT detected as overlap.",
          "Percentages are of total market value across all six accounts; values are static synthetic prices, not live quotes, and no returns are forecast.",
          "Default thresholds (10% security, 25% sector, 40% top-5) are illustrative — they are not regulatory limits. Adjust with the sliders.",
          "HHI is the sum of squared security weights (in %), from 0 to 10,000; lower is more diversified.",
          "Fee estimate = market value × annual_fee_bps ÷ 10,000, rounded half-up to the cent per lot.",
          "Rows with a non-USD currency, malformed values or missing identifiers are rejected and listed rather than guessed. Fictional data; not investment advice.",
        ]}
      />
    </>
  );
}
