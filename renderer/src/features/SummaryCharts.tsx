import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type TrendPoint = {
  bucket: string;
  amount: number;
};

type MixPoint = {
  name: string;
  value: number;
};

type SummaryChartsProps = {
  trendData: TrendPoint[];
  mixData: MixPoint[];
};

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SummaryCharts({ trendData, mixData }: SummaryChartsProps) {
  return (
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
  );
}
