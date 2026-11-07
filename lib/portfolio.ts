import { cents, ratio } from "./money";

export type Holding = {
  record_id: string; account_id: string; security_id: string; sector: string;
  market_value_usd: string; annual_fee_bps: string; csvRow: number;
};
export type Thresholds = { security: number; sector: number; top5: number }; // fractions

export const DEFAULTS: Thresholds = { security: 0.1, sector: 0.25, top5: 0.4 };

export function analyzePortfolio(rows: Holding[], t: Thresholds) {
  let total = 0n, fees = 0n;
  const sec = new Map<string, { value: bigint; accounts: Map<string, bigint>; sector: string; rows: Holding[] }>();
  const sectors = new Map<string, { value: bigint; securities: Set<string> }>();
  for (const h of rows) {
    const v = cents(h.market_value_usd);
    const bps = BigInt(h.annual_fee_bps);
    total += v;
    fees += (v * bps * 2n + 10000n) / 20000n; // round half up, per holding
    const s = sec.get(h.security_id) ?? { value: 0n, accounts: new Map<string, bigint>(), sector: h.sector, rows: [] as Holding[] };
    s.value += v; s.accounts.set(h.account_id, (s.accounts.get(h.account_id) ?? 0n) + v); s.rows.push(h);
    sec.set(h.security_id, s);
    const k = sectors.get(h.sector) ?? { value: 0n, securities: new Set() };
    k.value += v; k.securities.add(h.security_id); sectors.set(h.sector, k);
  }
  const frac = (v: bigint) => ratio(v, total) ?? 0;
  const securities = [...sec].map(([id, s]) => ({
    id, sector: s.sector, value: Number(s.value) / 100, fraction: frac(s.value),
    accounts: [...s.accounts].map(([a, v]) => ({ account: a, value: Number(v) / 100, fraction: frac(v) })).sort((a, b) => b.value - a.value),
    overlap: s.accounts.size, rows: s.rows,
    flag: frac(s.value) > t.security,
  })).sort((a, b) => b.value - a.value);
  const sectorList = [...sectors].map(([name, s]) => ({
    name, value: Number(s.value) / 100, fraction: frac(s.value), securities: s.securities.size, flag: frac(s.value) > t.sector,
  })).sort((a, b) => b.value - a.value);
  const top5 = securities.slice(0, 5).reduce((a, s) => a + s.fraction, 0);
  const hhi = securities.reduce((a, s) => a + (s.fraction * 100) ** 2, 0); // 0–10,000
  return {
    total: Number(total) / 100, fees: Number(fees) / 100, feeRate: ratio(fees, total) ?? 0,
    securities, sectors: sectorList, top5, top5Flag: top5 > t.top5, hhi,
    overlapping: securities.filter((s) => s.overlap > 1).length,
  };
}
