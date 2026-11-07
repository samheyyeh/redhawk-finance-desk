import { readCSV } from "@/lib/csv";
import { analyze } from "@/lib/controls";
import { PageHead, Stat, Assumptions, Errors } from "@/components/ui";
import ControlsTable from "./ControlsTable";

export const metadata = { title: "Spend controls · Redhawk Finance Desk" };

export default function Page() {
  const invoices = readCSV("invoices.csv");
  const payments = readCSV("payments.csv");
  const r = analyze(invoices, payments);
  const high = r.findings.filter((f) => f.severity === "high").length;
  const exposure = r.findings.filter((f) => f.rule === "overpayment").reduce((a, f) => a + f.exposureCents, 0) / 100;

  return (
    <>
      <PageHead
        n="#10"
        title="Purchasing & expense controls"
        user="For an AP controller who needs to know which paid invoices to chase first. Six deterministic rules run over every invoice; each finding links to its CSV row, the payment records and the source invoice document."
      />
      <Errors list={r.errors} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Invoices reviewed" value={r.rows.toLocaleString()} sub={`Gross ${r.gross} · paid ${r.paid}`} />
        <Stat label="Invoices with ≥1 flag" value={r.flagged.toLocaleString()} sub={`${((r.flagged / r.rows) * 100).toFixed(1)}% of rows`} tone="med" />
        <Stat label="High-severity findings" value={high.toLocaleString()} sub="overpaid · duplicate · paid before approval" tone="high" />
        <Stat label="Overpaid amount" value={exposure.toLocaleString("en-US", { style: "currency", currency: "USD" })} sub="paid − invoiced, where paid > invoiced" tone="high" />
      </div>
      <ControlsTable findings={r.findings} byRule={r.byRule} />
      <Assumptions
        items={[
          "Gross totals include duplicate invoices and are not verified liabilities.",
          "Exposure = USD paid on the flagged invoice (for overpayment: only the excess). One invoice can trigger several rules, so exposure is not additive across rows.",
          "'Paid before approval' compares the earliest payment in payments.csv with approval_date; it also flags any payment on an invoice whose status is not approved.",
          "Duplicates are keyed on vendor_id + invoice_number only; near-matches (typos, split invoices) are not detected.",
          "These are review signals, not fraud findings. Data is fictional; document text is the synthetic TXT invoice supplied in the starter pack.",
          "Rows with missing required fields, a non-USD currency or malformed money are rejected and listed above rather than guessed.",
        ]}
      />
    </>
  );
}
