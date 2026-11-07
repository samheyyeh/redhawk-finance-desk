import type { ReactNode } from "react";

export function PageHead({ n, title, user, children }: { n: string; title: string; user: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">Challenge {n}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-3xl text-muted">{user}</p>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "high" | "med" | "ok" }) {
  const color = tone === "high" ? "text-high" : tone === "med" ? "text-med" : tone === "ok" ? "text-ok" : "";
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Assumptions({ title = "Assumptions & limitations", items }: { title?: string; items: string[] }) {
  return (
    <details className="card mt-8 p-4 text-sm">
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
        {items.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </details>
  );
}

export function Errors({ list }: { list: string[] }) {
  if (!list.length) return null;
  return (
    <div role="alert" className="mb-4 rounded-lg border border-med p-3 text-sm text-med">
      <b>{list.length} input row(s) rejected:</b>
      <ul className="mt-1 list-disc pl-5">{list.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  );
}

export const usd = (n: number, dp = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: dp, maximumFractionDigits: dp });

export function download(name: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const h = Object.keys(rows[0]);
  const q = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const csv = [h.map(q).join(","), ...rows.map((r) => h.map((k) => q(r[k])).join(","))].join("\n") + "\n";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
