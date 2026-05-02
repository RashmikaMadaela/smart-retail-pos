import { getDb } from "../db/sqlite";
import type { FinancialSummary, PeriodBreakdown } from "../types";

export function getFinancialSummary(): FinancialSummary {
  const db = getDb();

  const grossRow = db
    .prepare("SELECT COALESCE(SUM(total), 0) AS value FROM sales WHERE status = 'COMPLETED'")
    .get() as { value: number };

  const cogsRow = db
    .prepare(
      `
      SELECT COALESCE(SUM(si.qty * COALESCE(si.cogs_unit_cost, p.buy_price)), 0) AS value
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE s.status = 'COMPLETED'
      `,
    )
    .get() as { value: number };

  const expenseRow = db
    .prepare("SELECT COALESCE(SUM(amount), 0) AS value FROM expenses")
    .get() as { value: number };

  const grossSales = Number(grossRow.value || 0);
  const cogs = Number(cogsRow.value || 0);
  const expenses = Number(expenseRow.value || 0);

  return {
    gross_sales: grossSales,
    cogs,
    expenses,
    net_profit: grossSales - cogs - expenses,
  };
}

export function getFinancialSummaryByPeriod(startDate?: string, endDate?: string): FinancialSummary {
  const db = getDb();

  let salesFilter = "WHERE status = 'COMPLETED'";
  let expensesFilter = "WHERE 1=1";
  const params: Record<string, string> = {};

  if (startDate && endDate) {
    salesFilter += " AND timestamp >= @startDate AND timestamp <= @endDate";
    expensesFilter += " AND date >= @startDate AND date <= @endDate";
    params.startDate = startDate;
    params.endDate = endDate;
  } else if (startDate) {
    salesFilter += " AND timestamp >= @startDate";
    expensesFilter += " AND date >= @startDate";
    params.startDate = startDate;
  } else if (endDate) {
    salesFilter += " AND timestamp <= @endDate";
    expensesFilter += " AND date <= @endDate";
    params.endDate = endDate;
  }

  const grossRow = db
    .prepare(`SELECT COALESCE(SUM(total), 0) AS value FROM sales ${salesFilter}`)
    .get(params) as { value: number };

  const cogsRow = db
    .prepare(
      `
      SELECT COALESCE(SUM(si.qty * COALESCE(si.cogs_unit_cost, p.buy_price)), 0) AS value
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      ${salesFilter}
      `,
    )
    .get(params) as { value: number };

  const expenseRow = db
    .prepare(`SELECT COALESCE(SUM(amount), 0) AS value FROM expenses ${expensesFilter}`)
    .get(params) as { value: number };

  const grossSales = Number(grossRow.value || 0);
  const cogs = Number(cogsRow.value || 0);
  const expenses = Number(expenseRow.value || 0);

  return {
    gross_sales: grossSales,
    cogs,
    expenses,
    net_profit: grossSales - cogs - expenses,
  };
}

export function getDailyBreakdown(startDate: string, endDate: string): PeriodBreakdown[] {
  const db = getDb();

  const salesByDay = db
    .prepare(
      `
      SELECT 
        DATE(timestamp) as period,
        COALESCE(SUM(total), 0) as gross_sales
      FROM sales
      WHERE status = 'COMPLETED' AND timestamp >= @startDate AND timestamp <= @endDate
      GROUP BY DATE(timestamp)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; gross_sales: number }>;

  const cogsByDay = db
    .prepare(
      `
      SELECT 
        DATE(s.timestamp) as period,
        COALESCE(SUM(si.qty * COALESCE(si.cogs_unit_cost, p.buy_price)), 0) as cogs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE s.status = 'COMPLETED' AND s.timestamp >= @startDate AND s.timestamp <= @endDate
      GROUP BY DATE(s.timestamp)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; cogs: number }>;

  const expensesByDay = db
    .prepare(
      `
      SELECT 
        DATE(date) as period,
        COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      WHERE date >= @startDate AND date <= @endDate
      GROUP BY DATE(date)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; expenses: number }>;

  const cogsMap = new Map(cogsByDay.map((row) => [row.period, row.cogs]));
  const expensesMap = new Map(expensesByDay.map((row) => [row.period, row.expenses]));

  return salesByDay.map((row) => {
    const cogs = cogsMap.get(row.period) || 0;
    const expenses = expensesMap.get(row.period) || 0;
    return {
      period: row.period,
      gross_sales: Number(row.gross_sales || 0),
      cogs: Number(cogs),
      expenses: Number(expenses),
      net_profit: Number(row.gross_sales || 0) - Number(cogs) - Number(expenses),
    };
  });
}

export function getMonthlyBreakdown(startDate: string, endDate: string): PeriodBreakdown[] {
  const db = getDb();

  const salesByMonth = db
    .prepare(
      `
      SELECT 
        strftime('%Y-%m', timestamp) as period,
        COALESCE(SUM(total), 0) as gross_sales
      FROM sales
      WHERE status = 'COMPLETED' AND timestamp >= @startDate AND timestamp <= @endDate
      GROUP BY strftime('%Y-%m', timestamp)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; gross_sales: number }>;

  const cogsByMonth = db
    .prepare(
      `
      SELECT 
        strftime('%Y-%m', s.timestamp) as period,
        COALESCE(SUM(si.qty * COALESCE(si.cogs_unit_cost, p.buy_price)), 0) as cogs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE s.status = 'COMPLETED' AND s.timestamp >= @startDate AND s.timestamp <= @endDate
      GROUP BY strftime('%Y-%m', s.timestamp)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; cogs: number }>;

  const expensesByMonth = db
    .prepare(
      `
      SELECT 
        strftime('%Y-%m', date) as period,
        COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      WHERE date >= @startDate AND date <= @endDate
      GROUP BY strftime('%Y-%m', date)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; expenses: number }>;

  const cogsMap = new Map(cogsByMonth.map((row) => [row.period, row.cogs]));
  const expensesMap = new Map(expensesByMonth.map((row) => [row.period, row.expenses]));

  return salesByMonth.map((row) => {
    const cogs = cogsMap.get(row.period) || 0;
    const expenses = expensesMap.get(row.period) || 0;
    return {
      period: row.period,
      gross_sales: Number(row.gross_sales || 0),
      cogs: Number(cogs),
      expenses: Number(expenses),
      net_profit: Number(row.gross_sales || 0) - Number(cogs) - Number(expenses),
    };
  });
}

export function getYearlyBreakdown(startDate: string, endDate: string): PeriodBreakdown[] {
  const db = getDb();

  const salesByYear = db
    .prepare(
      `
      SELECT 
        strftime('%Y', timestamp) as period,
        COALESCE(SUM(total), 0) as gross_sales
      FROM sales
      WHERE status = 'COMPLETED' AND timestamp >= @startDate AND timestamp <= @endDate
      GROUP BY strftime('%Y', timestamp)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; gross_sales: number }>;

  const cogsByYear = db
    .prepare(
      `
      SELECT 
        strftime('%Y', s.timestamp) as period,
        COALESCE(SUM(si.qty * COALESCE(si.cogs_unit_cost, p.buy_price)), 0) as cogs
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE s.status = 'COMPLETED' AND s.timestamp >= @startDate AND s.timestamp <= @endDate
      GROUP BY strftime('%Y', s.timestamp)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; cogs: number }>;

  const expensesByYear = db
    .prepare(
      `
      SELECT 
        strftime('%Y', date) as period,
        COALESCE(SUM(amount), 0) as expenses
      FROM expenses
      WHERE date >= @startDate AND date <= @endDate
      GROUP BY strftime('%Y', date)
      ORDER BY period
      `,
    )
    .all({ startDate, endDate }) as Array<{ period: string; expenses: number }>;

  const cogsMap = new Map(cogsByYear.map((row) => [row.period, row.cogs]));
  const expensesMap = new Map(expensesByYear.map((row) => [row.period, row.expenses]));

  return salesByYear.map((row) => {
    const cogs = cogsMap.get(row.period) || 0;
    const expenses = expensesMap.get(row.period) || 0;
    return {
      period: row.period,
      gross_sales: Number(row.gross_sales || 0),
      cogs: Number(cogs),
      expenses: Number(expenses),
      net_profit: Number(row.gross_sales || 0) - Number(cogs) - Number(expenses),
    };
  });
}
