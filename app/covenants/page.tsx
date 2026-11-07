import { readCSV, readDoc } from "@/lib/csv";
import { evaluate } from "@/lib/covenants";
import { PageHead, Stat, Assumptions, Errors } from "@/components/ui";
import CovenantBoard from "./CovenantBoard";

export const metadata = { title: "Covenant monitor · Redhawk Finance Desk" };

export default function Page() {
  const res = evaluate(readCSV("loan_covenants.csv"));
  const policy = readDoc("documents/loan-policy.txt");
  const latest = res.borrowers.map((b) => b.latest);
  const count = (s: string) => latest.filter((q) => q.status === s).length;
  const everBreached = res.borrowers.filter((b) => b.hist.some((q) => q.status === "breach")).length;

  return (
    <>
      <PageHead
        n="#5"
        title="Borrower covenant monitoring"
        user="For a commercial-banking credit analyst who must tell, each quarter, which borrowers have breached a leverage or debt-service covenant and which are close. Every ratio is recomputed from the reported figures and tied back to the agreement's definition."
      />
      <Errors list={res.errors} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Borrowers monitored" value={res.borrowers.length} sub={`${res.quarters.length} borrower-quarters`} />
        <Stat label="In breach (latest quarter)" value={count("breach")} tone="high" sub={`${everBreached} breached in at least one quarter`} />
        <Stat label="Watch (<10% cushion)" value={count("watch")} tone="med" sub="assumption: editable policy choice" />
        <Stat label="Compliant" value={count("ok")} tone="ok" sub={count("unevaluable") ? `${count("unevaluable")} not evaluable` : "all evaluable"} />
      </div>
      <CovenantBoard borrowers={res.borrowers} policy={policy} />
      <Assumptions
        items={[
          "Definitions come only from documents/loan-policy.txt (shown beside each calculation): leverage = gross debt ÷ TTM EBITDA, max 3.00×; DSCR = TTM available cash flow ÷ TTM debt service, min 1.20×.",
          "Breach tests use exact integer arithmetic (debt × 100 > max × EBITDA), so a ratio of exactly 3.00× is compliant. Displayed ratios are truncated to 2 decimals.",
          "Cushion = how far EBITDA (or cash flow) could fall, holding debt and debt service constant, before the covenant trips. 'Watch' means cushion under 10% — our assumption, not part of the agreement.",
          "If EBITDA ≤ 0 or debt service = 0 the ratio is marked 'not evaluable' rather than silently passing.",
          "Borrower-reported figures are taken at face value; no cure periods, waivers, equity cures or covenant add-backs are modelled.",
        ]}
      />
    </>
  );
}
