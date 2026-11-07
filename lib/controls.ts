import { cents, fmt } from "./money";
import type { Row } from "./csv";

export type Rule =
  | "duplicate_invoice" | "overpayment" | "missing_approval" | "paid_before_approval"
  | "missing_po" | "missing_receipt";

export const RULES: Record<Rule, { label: string; severity: "high" | "medium"; why: string }> = {
  overpayment:          { label: "Paid exceeds invoice",     severity: "high",   why: "Recorded payments total more than the invoice gross amount." },
  duplicate_invoice:    { label: "Duplicate invoice ID",     severity: "high",   why: "Same vendor_id + invoice_number already appears on an earlier row." },
  paid_before_approval: { label: "Paid before approval",     severity: "high",   why: "A payment is dated before the approval date, or the invoice was never approved." },
  missing_approval:     { label: "Not approved",             severity: "medium", why: "approval_status is not 'approved'." },
  missing_po:           { label: "No purchase order",        severity: "medium", why: "po_number is blank." },
  missing_receipt:      { label: "Receipt missing",          severity: "medium", why: "receipt_status is 'missing' (goods/services receipt not confirmed)." },
};

export type Finding = {
  record_id: string; rule: Rule; severity: "high" | "medium"; detail: string;
  vendor: string; invoice_number: string; invoice: string; paid: string;
  exposureCents: number; csvRow: number; doc: string;
};

const KEYS = ["record_id", "invoice_number", "vendor_id", "amount_usd", "paid_usd", "approval_status", "source_document", "currency"];

export function analyze(invoices: Row[], payments: Row[]) {
  const firstPay = new Map<string, string>();
  for (const p of payments) {
    const cur = firstPay.get(p.invoice_record_id);
    if (!cur || p.payment_date < cur) firstPay.set(p.invoice_record_id, p.payment_date);
  }
  const seen = new Map<string, string>();
  const findings: Finding[] = [];
  const errors: string[] = [];
  let gross = 0n, paid = 0n;

  invoices.forEach((r, i) => {
    const csvRow = i + 2;
    const missing = KEYS.filter((k) => !r[k]);
    if (missing.length || r.currency !== "USD") {
      errors.push(`Row ${csvRow} (${r.record_id || "?"}): ${missing.length ? "missing " + missing.join(", ") : "non-USD"} — skipped`);
      return;
    }
    let a: bigint, p: bigint;
    try { a = cents(r.amount_usd); p = cents(r.paid_usd); }
    catch (e) { errors.push(`Row ${csvRow}: ${(e as Error).message} — skipped`); return; }
    gross += a; paid += p;
    const add = (rule: Rule, detail: string, exposure: bigint) =>
      findings.push({
        record_id: r.record_id, rule, severity: RULES[rule].severity, detail, vendor: r.vendor_name,
        invoice_number: r.invoice_number, invoice: r.amount_usd, paid: r.paid_usd,
        exposureCents: Number(exposure), csvRow, doc: r.source_document,
      });
    const key = r.vendor_id + "|" + r.invoice_number;
    if (seen.has(key)) add("duplicate_invoice", `Same vendor and invoice number as ${seen.get(key)}`, p);
    else seen.set(key, r.record_id);
    if (p > a) add("overpayment", `Paid ${fmt(p)} against invoice ${fmt(a)} — excess ${fmt(p - a)}`, p - a);
    if (r.approval_status !== "approved") add("missing_approval", `Approval status: ${r.approval_status}`, p);
    const fp = firstPay.get(r.record_id);
    if (fp && (r.approval_status !== "approved" || (r.approval_date && fp < r.approval_date)))
      add("paid_before_approval", r.approval_status !== "approved"
        ? `Payment made ${fp} on an invoice with status '${r.approval_status}'`
        : `First payment ${fp} precedes approval ${r.approval_date}`, p);
    if (r.po_number === "") add("missing_po", "Purchase-order reference is blank", p);
    if (r.receipt_status === "missing") add("missing_receipt", "Receipt status is 'missing'", p);
  });

  findings.sort((x, y) => (x.severity === y.severity ? 0 : x.severity === "high" ? -1 : 1) || y.exposureCents - x.exposureCents);
  const byRule = Object.fromEntries((Object.keys(RULES) as Rule[]).map((k) => [k, findings.filter((f) => f.rule === k).length])) as Record<Rule, number>;
  const flagged = new Set(findings.map((f) => f.record_id)).size;
  return { findings, errors, byRule, rows: invoices.length, flagged, gross: fmt(gross), paid: fmt(paid) };
}
