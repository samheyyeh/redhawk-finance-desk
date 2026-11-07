// Exact USD arithmetic in BigInt cents (ported from the starter pack's lib/finance.js).
export function cents(value: string, signed = false): bigint {
  const ok = (signed ? /^-?\d+(\.\d+)?$/ : /^\d+(\.\d+)?$/).test(value);
  if (!ok) throw new Error(`Invalid money value: "${value}"`);
  const neg = value.startsWith("-");
  const [whole, frac = ""] = value.replace("-", "").split(".");
  if (frac.length > 2) throw new Error(`Too many decimals: "${value}"`);
  const n = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0") || "0");
  return neg ? -n : n;
}
export function fmt(n: bigint): string {
  const neg = n < 0n;
  const a = neg ? -n : n;
  const s = a.toString().padStart(3, "0");
  const whole = s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}$${whole}.${s.slice(-2)}`;
}
/** Ratio of two cent values, 4 decimal places, truncated toward zero. */
export function ratio(n: bigint, d: bigint): number | null {
  if (d === 0n) return null;
  return Number((n * 10000n) / d) / 10000;
}
export const pct = (x: number | null, dp = 1) => (x === null ? "n/a" : `${(x * 100).toFixed(dp)}%`);
