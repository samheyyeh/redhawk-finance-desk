import { readCSV } from "@/lib/csv";
import type { Holding } from "@/lib/portfolio";
import { PageHead, Errors } from "@/components/ui";
import { cents } from "@/lib/money";
import PortfolioView from "./PortfolioView";

export const metadata = { title: "Concentration · Redhawk Finance Desk" };

export default function Page() {
  const errors: string[] = [];
  const holdings: Holding[] = [];
  readCSV("portfolio_holdings.csv").forEach((r, i) => {
    const csvRow = i + 2;
    try {
      if (r.currency !== "USD") throw new Error("non-USD");
      cents(r.market_value_usd);
      if (!/^\d+$/.test(r.annual_fee_bps) || Number(r.annual_fee_bps) > 10000) throw new Error("bad fee bps");
      if (!r.security_id || !r.sector || !r.account_id) throw new Error("missing identifier");
      holdings.push({ record_id: r.record_id, account_id: r.account_id, security_id: r.security_id, sector: r.sector, market_value_usd: r.market_value_usd, annual_fee_bps: r.annual_fee_bps, csvRow });
    } catch (e) { errors.push(`Row ${csvRow} (${r.record_id}): ${(e as Error).message} — skipped`); }
  });

  return (
    <>
      <PageHead
        n="#17"
        title="Portfolio concentration"
        user="For a wealth advisor reviewing a household with six accounts. Holdings are rolled up across accounts to reveal securities that look diversified by account but are really one big position, plus sector exposure and explicit, adjustable threshold flags."
      />
      <Errors list={errors} />
      <PortfolioView holdings={holdings} />
    </>
  );
}
