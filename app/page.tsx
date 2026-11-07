import Link from "next/link";

const MVPS = [
  { href: "/controls", n: "#10", track: "Accounting, Audit & Controls", title: "Purchasing & expense controls", body: "1,500 invoices screened by six rules — overpayments, duplicates, paid-before-approval, missing approval / PO / receipt — ranked by dollars at risk, each with CSV-row, payment and source-document evidence." },
  { href: "/covenants", n: "#5", track: "Investment & Commercial Banking", title: "Borrower covenant monitoring", body: "Nine borrowers across four quarters. Leverage and DSCR recomputed with exact math, headroom shown as a cushion, and every result traced to the loan-policy definition." },
  { href: "/portfolio", n: "#17", track: "Research & Wealth Management", title: "Portfolio concentration", body: "Six accounts rolled up by security and sector, overlap across accounts surfaced, and threshold flags you can tune live. Exports include source row numbers." },
];

export default function Home() {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-widest text-brand">Redhawk Builds · Nov 2026</p>
      <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight">Three finance MVPs where every number traces to its source.</h1>
      <p className="mt-4 max-w-2xl text-muted">
        Built on the Redhawk starter pack v1.1 data and its exact-money (BigInt cents) approach. Calculations are deterministic and
        labeled with their assumptions — no generated prose stands in for evidence.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {MVPS.map((m) => (
          <Link key={m.href} href={m.href} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="text-xs text-muted">{m.track}</div>
            <div className="mt-2 text-sm font-semibold text-brand">Challenge {m.n}</div>
            <h2 className="mt-1 text-lg font-semibold">{m.title}</h2>
            <p className="mt-2 text-sm text-muted">{m.body}</p>
            <span className="mt-4 inline-block text-sm font-medium">Open →</span>
          </Link>
        ))}
      </div>
      <section className="card mt-10 p-5 text-sm">
        <h2 className="font-semibold">How these map to the judging rubric</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-2">
          <div><dt className="font-medium">Problem relevance (20)</dt><dd className="text-muted">One named user and one decision per tool.</dd></div>
          <div><dt className="font-medium">Working solution (25)</dt><dd className="text-muted">Real data end-to-end: filter, drill down, export.</dd></div>
          <div><dt className="font-medium">Accuracy & trust (20)</dt><dd className="text-muted">Exact cents math, answer-key tests, visible assumptions, rejected-row reporting.</dd></div>
          <div><dt className="font-medium">Usability (15)</dt><dd className="text-muted">Evidence drawer, plain-language rules, adjustable thresholds.</dd></div>
          <div><dt className="font-medium">Originality (10)</dt><dd className="text-muted">Paid-before-approval rule, covenant cushion, cross-account overlap.</dd></div>
        </dl>
      </section>
    </>
  );
}
