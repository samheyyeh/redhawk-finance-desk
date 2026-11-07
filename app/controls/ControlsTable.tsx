"use client";
import { Fragment, useMemo, useState, useEffect } from "react";
import { RULES, type Finding, type Rule } from "@/lib/controls";
import { download, usd } from "@/components/ui";

type Evidence = {
  csvRow: number; invoice: Record<string, string>; payments: Record<string, string>[];
  duplicates: string[]; document: string; error?: string;
};

export default function ControlsTable({ findings, byRule }: { findings: Finding[]; byRule: Record<Rule, number> }) {
  const [rule, setRule] = useState<Rule | "all">("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const [open, setOpen] = useState<Finding | null>(null);

  const rows = useMemo(
    () => findings.filter((f) => (rule === "all" || f.rule === rule) &&
      (!q || (f.record_id + f.vendor + f.invoice_number).toLowerCase().includes(q.toLowerCase()))),
    [findings, rule, q],
  );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by rule">
        <button onClick={() => setRule("all")} className={`chip ${rule === "all" ? "bg-ink text-bg" : ""}`}>All {findings.length}</button>
        {(Object.keys(RULES) as Rule[]).map((k) => (
          <button key={k} onClick={() => { setRule(k); setLimit(50); }} aria-pressed={rule === k}
            className={`chip ${rule === k ? "bg-ink text-bg" : RULES[k].severity === "high" ? "text-high" : "text-med"}`}>
            {RULES[k].label} {byRule[k]}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, vendor, invoice…" aria-label="Search findings"
          className="ml-auto w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm sm:w-64" />
        <button className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:bg-bg"
          onClick={() => download("ap-exceptions.csv", rows.map((f) => ({
            record_id: f.record_id, rule: f.rule, severity: f.severity, vendor: f.vendor, invoice_number: f.invoice_number,
            invoice_usd: f.invoice, paid_usd: f.paid, exposure_usd: (f.exposureCents / 100).toFixed(2), detail: f.detail,
            invoices_csv_row: f.csvRow, source_document: f.doc,
          })))}>Export CSV</button>
      </div>
      {rule !== "all" && <p className="mt-3 text-sm text-muted">{RULES[rule].why}</p>}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr><th className="p-3">Invoice</th><th>Rule</th><th>Vendor</th><th className="text-right">Invoice</th><th className="text-right">Paid</th><th className="pr-3 text-right">Exposure</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((f) => (
              <tr key={f.record_id + f.rule} className="cursor-pointer border-b border-line last:border-0 hover:bg-bg"
                tabIndex={0} onClick={() => setOpen(f)} onKeyDown={(e) => e.key === "Enter" && setOpen(f)}>
                <td className="p-3 font-mono text-xs">{f.record_id}</td>
                <td><span className={`chip ${f.severity === "high" ? "text-high" : "text-med"}`}>{RULES[f.rule].label}</span></td>
                <td>{f.vendor}</td>
                <td className="num text-right">{usd(Number(f.invoice), 2)}</td>
                <td className="num text-right">{usd(Number(f.paid), 2)}</td>
                <td className="num pr-3 text-right font-medium">{usd(f.exposureCents / 100, 2)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted">No findings match.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>Showing {Math.min(limit, rows.length)} of {rows.length} · sorted by severity, then exposure</span>
        {limit < rows.length && <button className="underline" onClick={() => setLimit(limit + 100)}>Show more</button>}
      </div>
      {open && <Drawer f={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Drawer({ f, onClose }: { f: Finding; onClose: () => void }) {
  const [ev, setEv] = useState<Evidence | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/evidence/ap/${f.record_id}`).then((r) => r.json()).then((d) => live && setEv(d)).catch(() => live && setEv({ error: "Could not load evidence" } as Evidence));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { live = false; window.removeEventListener("keydown", esc); };
  }, [f.record_id, onClose]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-label={`Evidence for ${f.record_id}`} onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-xs text-muted">{f.record_id} · invoices.csv row {f.csvRow}</p>
            <h2 className="mt-1 text-xl font-semibold">{RULES[f.rule].label}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md px-2 py-1 text-xl hover:bg-bg">×</button>
        </div>
        <p className="mt-3 text-sm">{f.detail}</p>
        <p className="mt-1 text-xs text-muted">Rule: {RULES[f.rule].why}</p>
        {!ev && <p className="mt-6 text-sm text-muted">Loading evidence…</p>}
        {ev?.error && <p className="mt-6 text-sm text-high">{ev.error}</p>}
        {ev && !ev.error && (
          <div className="mt-6 space-y-5 text-sm">
            <Block title="Invoice record">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                {["vendor_name", "invoice_number", "invoice_date", "due_date", "amount_usd", "paid_usd", "approval_status", "approver_role", "approval_date", "po_number", "receipt_status"].map((k) => (
                  <Fragment key={k}><dt className="text-muted">{k}</dt><dd className="num font-mono text-xs">{ev.invoice[k] || <i className="text-high">(blank)</i>}</dd></Fragment>
                ))}
              </dl>
            </Block>
            <Block title={`Payments (${ev.payments.length}) — payments.csv`}>
              {ev.payments.length ? ev.payments.map((p) => (
                <div key={p.record_id} className="num flex justify-between font-mono text-xs"><span>{p.payment_date} · {p.record_id}</span><span>{usd(Number(p.amount_usd), 2)}</span></div>
              )) : <span className="text-muted">No payments recorded.</span>}
            </Block>
            {ev.duplicates.length > 0 && <Block title="Same vendor + invoice number also on"><span className="font-mono text-xs">{ev.duplicates.join(", ")}</span></Block>}
            <Block title={`Source document — ${f.doc}`}><pre className="whitespace-pre-wrap font-mono text-xs">{ev.document}</pre></Block>
          </div>
        )}
      </aside>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3><div className="rounded-lg border border-line bg-bg p-3">{children}</div></div>;
}
