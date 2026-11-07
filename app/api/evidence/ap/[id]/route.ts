import { NextResponse } from "next/server";
import { readCSV, readDoc } from "@/lib/csv";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^AP-\d{5}$/.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const invoices = readCSV("invoices.csv");
  const idx = invoices.findIndex((r) => r.record_id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const inv = invoices[idx];
  const payments = readCSV("payments.csv").filter((p) => p.invoice_record_id === id);
  const duplicates = invoices
    .filter((r) => r.vendor_id === inv.vendor_id && r.invoice_number === inv.invoice_number && r.record_id !== id)
    .map((r) => r.record_id);
  let document = "";
  try { document = readDoc(inv.source_document); } catch { document = "(source document not found)"; }
  return NextResponse.json({ csvRow: idx + 2, invoice: inv, payments, duplicates, document });
}
