import { getDb } from "../db/sqlite";
import type { FinancialSummary } from "../types";

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
      LEFT JOIN products p ON p.barcode_id = si.product_id
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
