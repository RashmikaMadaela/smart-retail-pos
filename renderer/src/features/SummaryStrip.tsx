import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import type { Summary, PeriodBreakdown } from "./types";

const SummaryCharts = lazy(() => import("./SummaryCharts"));

export type PeriodFilter = "today" | "week" | "month" | "year" | "all";

type SummaryStripProps = {
  summary: Summary | null;
  netColor: string;
  isSuperAdmin?: boolean;
  onClearAllData?: () => void;
  periodFilter?: PeriodFilter;
  onPeriodFilterChange?: (filter: PeriodFilter) => void;
  breakdown?: PeriodBreakdown[] | null;
};

export function SummaryStrip({ 
  summary, 
  netColor, 
  isSuperAdmin = false, 
  onClearAllData,
  periodFilter = "all",
  onPeriodFilterChange,
  breakdown,
}: SummaryStripProps) {
  const { t } = useTranslation();
  const safeSummary = summary ?? {
    gross_sales: 0,
    cogs: 0,
    expenses: 0,
    net_profit: 0,
  };

  const mixData = [
    { name: t("summary.sales"), value: Number(safeSummary.gross_sales.toFixed(2)) },
    { name: "COGS", value: Number(safeSummary.cogs.toFixed(2)) },
    { name: t("summary.expenses"), value: Number(safeSummary.expenses.toFixed(2)) },
    { name: t("summary.profit"), value: Number(safeSummary.net_profit.toFixed(2)) },
  ];

  // Use breakdown for trend data if available, otherwise use mock data
  const trendData = breakdown && breakdown.length > 0 
    ? breakdown.map((item) => ({
        bucket: item.period,
        amount: Number(item.gross_sales.toFixed(2)),
      }))
    : [
        { bucket: "-3", amount: Number((safeSummary.gross_sales * 0.55).toFixed(2)) },
        { bucket: "-2", amount: Number((safeSummary.gross_sales * 0.72).toFixed(2)) },
        { bucket: "-1", amount: Number((safeSummary.gross_sales * 0.88).toFixed(2)) },
        { bucket: "Now", amount: Number(safeSummary.gross_sales.toFixed(2)) },
      ];

  const periodButtons: Array<{ value: PeriodFilter; label: string }> = [
    { value: "today", label: t("summary.today") || "Today" },
    { value: "week", label: t("summary.thisWeek") || "This Week" },
    { value: "month", label: t("summary.thisMonth") || "This Month" },
    { value: "year", label: t("summary.thisYear") || "This Year" },
    { value: "all", label: t("summary.allTime") || "All Time" },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      {isSuperAdmin ? (
        <div className="xl:col-span-2 rounded-xl border border-rose-500/45 bg-rose-500/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-rose-200">SuperAdmin Danger Zone</p>
              <p className="m-0 mt-1 text-sm text-rose-100">{t("summary.danger")}</p>
            </div>
            <button type="button" className="danger" onClick={onClearAllData}>
              {t("summary.clearAll")}
            </button>
          </div>
        </div>
      ) : null}

      {onPeriodFilterChange && (
        <div className="xl:col-span-2 rounded-xl border border-border/80 bg-background/45 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">Period:</span>
            {periodButtons.map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => onPeriodFilterChange(btn.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  periodFilter === btn.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("summary.grossSales")}</h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">Rs. {safeSummary.gross_sales.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">COGS</h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">Rs. {safeSummary.cogs.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("summary.expenses")}</h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">Rs. {safeSummary.expenses.toFixed(2)}</p>
        </article>
        <article className="rounded-xl border border-border/80 bg-background/45 p-4">
          <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{t("summary.netProfit")}</h3>
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
