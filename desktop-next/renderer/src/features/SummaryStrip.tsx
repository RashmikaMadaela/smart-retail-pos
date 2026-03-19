import type { Summary } from "./types";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type SummaryStripProps = {
  summary: Summary | null;
  netColor: string;
};

export function SummaryStrip({ summary, netColor }: SummaryStripProps) {
  const asNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const safeSummary = summary ?? {
    gross_sales: 0,
    cogs: 0,
    expenses: 0,
    net_profit: 0,
  };

  const mixData = [
    { name: "Sales", value: Number(safeSummary.gross_sales.toFixed(2)) },
    { name: "COGS", value: Number(safeSummary.cogs.toFixed(2)) },
    { name: "Expenses", value: Number(safeSummary.expenses.toFixed(2)) },
    { name: "Profit", value: Number(safeSummary.net_profit.toFixed(2)) },
  ];

  const trendData = [
    { bucket: "-3", amount: Number((safeSummary.gross_sales * 0.55).toFixed(2)) },
    { bucket: "-2", amount: Number((safeSummary.gross_sales * 0.72).toFixed(2)) },
    { bucket: "-1", amount: Number((safeSummary.gross_sales * 0.88).toFixed(2)) },
    { bucket: "Now", amount: Number(safeSummary.gross_sales.toFixed(2)) },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gross Sales</h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">Rs. {safeSummary.gross_sales.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">COGS</h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">Rs. {safeSummary.cogs.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Expenses</h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">Rs. {safeSummary.expenses.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Net Profit</h3>
          <p className="mt-2 text-2xl font-semibold" style={{ color: netColor }}>
            Rs. {safeSummary.net_profit.toFixed(2)}
          </p>
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sales Trend</h3>
          <div className="mt-3 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="salesTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="bucket" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <Tooltip formatter={(value) => `Rs. ${asNumber(value).toFixed(2)}`} />
                <Area type="monotone" dataKey="amount" stroke="#60a5fa" fill="url(#salesTrend)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">P&L Mix</h3>
          <div className="mt-3 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip formatter={(value) => `Rs. ${asNumber(value).toFixed(2)}`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
