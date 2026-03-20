import { lazy, Suspense } from "react";
import type { Summary } from "./types";

const SummaryCharts = lazy(() => import("./SummaryCharts"));

type SummaryStripProps = {
  summary: Summary | null;
  netColor: string;
  isSuperAdmin?: boolean;
  onClearAllData?: () => void;
};

export function SummaryStrip({ summary, netColor, isSuperAdmin = false, onClearAllData }: SummaryStripProps) {
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
      {isSuperAdmin ? (
        <div className="xl:col-span-2 rounded-xl border border-rose-500/45 bg-rose-500/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-rose-200">SuperAdmin Danger Zone</p>
              <p className="m-0 mt-1 text-sm text-rose-100">Clear all business data tables. This action cannot be undone.</p>
            </div>
            <button type="button" className="danger" onClick={onClearAllData}>
              Clear All Data
            </button>
          </div>
        </div>
      ) : null}

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

      <Suspense
        fallback={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            <article className="h-44 rounded-xl border border-border/80 bg-background/45 p-4" />
            <article className="h-44 rounded-xl border border-border/80 bg-background/45 p-4" />
          </div>
        }
      >
        <SummaryCharts trendData={trendData} mixData={mixData} />
      </Suspense>
    </section>
  );
}
