import type { Summary } from "./types";

type SummaryStripProps = {
  summary: Summary | null;
  netColor: string;
};

export function SummaryStrip({ summary, netColor }: SummaryStripProps) {
  return (
    <section className="summary-grid">
      <article>
        <h3>Gross Sales</h3>
        <p>Rs. {summary ? summary.gross_sales.toFixed(2) : "0.00"}</p>
      </article>
      <article>
        <h3>COGS</h3>
        <p>Rs. {summary ? summary.cogs.toFixed(2) : "0.00"}</p>
      </article>
      <article>
        <h3>Expenses</h3>
        <p>Rs. {summary ? summary.expenses.toFixed(2) : "0.00"}</p>
      </article>
      <article>
        <h3>Net Profit</h3>
        <p style={{ color: netColor }}>Rs. {summary ? summary.net_profit.toFixed(2) : "0.00"}</p>
      </article>
    </section>
  );
}
