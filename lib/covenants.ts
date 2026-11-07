import { cents, ratio } from "./money";
import type { Row } from "./csv";

export type Status = "breach" | "unevaluable" | "watch" | "ok";
export const WATCH_CUSHION = 0.1; // assumption: <10% cushion is "watch"; editable in the UI copy

export type Quarter = {
  record_id: string; borrower: string; period: string; csvRow: number;
  debt: string; ebitda: string; service: string; cashflow: string; maxLev: string; minDscr: string;
  leverage: number | null; leverageBreach: boolean | null;
  /** Fraction EBITDA could fall before leverage covenant trips (negative = already breached). */
  ebitdaCushion: number | null;
  dscr: number | null; dscrBreach: boolean | null;
  /** Fraction available cash flow could fall before DSCR covenant trips. */
  cashCushion: number | null;
  status: Status; reasons: string[];
};

const REQ = ["record_id", "borrower_id", "period", "debt_usd", "ttm_ebitda_usd", "ttm_debt_service_usd", "ttm_available_cashflow_usd", "max_leverage", "min_dscr"];

export function evaluate(rows: Row[]) {
  const errors: string[] = [];
  const quarters: Quarter[] = [];
  rows.forEach((r, i) => {
    const csvRow = i + 2;
    const miss = REQ.filter((k) => !r[k]);
    if (miss.length || r.currency !== "USD") { errors.push(`Row ${csvRow}: ${miss.length ? "missing " + miss.join(", ") : "non-USD"} — skipped`); return; }
    try {
      const debt = cents(r.debt_usd), ebitda = cents(r.ttm_ebitda_usd, true), service = cents(r.ttm_debt_service_usd), cash = cents(r.ttm_available_cashflow_usd, true);
      const maxC = cents(r.max_leverage), minC = cents(r.min_dscr);
      const reasons: string[] = [];
      const levOk = ebitda > 0n, dscrOk = service > 0n;
      const leverage = levOk ? ratio(debt, ebitda) : null;
      const leverageBreach = levOk ? debt * 100n > maxC * ebitda : null;
      const ebitdaCushion = levOk ? ratio(maxC * ebitda - debt * 100n, maxC * ebitda) : null;
      const dscr = dscrOk ? ratio(cash, service) : null;
      const dscrBreach = dscrOk ? cash * 100n < minC * service : null;
      const cashCushion = dscrOk && cash > 0n ? ratio(cash * 100n - minC * service, cash * 100n) : dscrOk ? -1 : null;
      if (leverageBreach) reasons.push(`Leverage ${leverage?.toFixed(2)}x exceeds maximum ${r.max_leverage}x`);
      if (dscrBreach) reasons.push(`DSCR ${dscr?.toFixed(2)}x is below minimum ${r.min_dscr}x`);
      if (!levOk) reasons.push("TTM EBITDA is zero or negative — leverage cannot be evaluated");
      if (!dscrOk) reasons.push("TTM debt service is zero — DSCR cannot be evaluated");
      let status: Status = "ok";
      if (leverageBreach || dscrBreach) status = "breach";
      else if (!levOk || !dscrOk) status = "unevaluable";
      else if ((ebitdaCushion ?? 1) < WATCH_CUSHION || (cashCushion ?? 1) < WATCH_CUSHION) {
        status = "watch";
        if ((ebitdaCushion ?? 1) < WATCH_CUSHION) reasons.push(`EBITDA could fall only ${((ebitdaCushion ?? 0) * 100).toFixed(1)}% before breaching leverage`);
        if ((cashCushion ?? 1) < WATCH_CUSHION) reasons.push(`Cash flow could fall only ${((cashCushion ?? 0) * 100).toFixed(1)}% before breaching DSCR`);
      }
      quarters.push({
        record_id: r.record_id, borrower: r.borrower_id, period: r.period, csvRow,
        debt: r.debt_usd, ebitda: r.ttm_ebitda_usd, service: r.ttm_debt_service_usd, cashflow: r.ttm_available_cashflow_usd,
        maxLev: r.max_leverage, minDscr: r.min_dscr,
        leverage, leverageBreach, ebitdaCushion, dscr, dscrBreach, cashCushion, status, reasons,
      });
    } catch (e) { errors.push(`Row ${csvRow}: ${(e as Error).message} — skipped`); }
  });
  quarters.sort((a, b) => a.borrower.localeCompare(b.borrower) || a.period.localeCompare(b.period));
  const borrowers = [...new Set(quarters.map((q) => q.borrower))].map((id) => {
    const hist = quarters.filter((q) => q.borrower === id);
    return { id, hist, latest: hist[hist.length - 1] };
  });
  return { quarters, borrowers, errors };
}
