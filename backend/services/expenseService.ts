import { getDb } from "../db/sqlite";
import type { ServiceResult } from "../types";

export type ExpenseRow = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
};

export function listExpenses(limit = 100): ExpenseRow[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT id, description, amount, date, category
      FROM expenses
      ORDER BY date DESC, id DESC
      LIMIT ?
      `,
    )
    .all(limit) as ExpenseRow[];
}

export function createExpense(description: string, amount: number, category: string): ServiceResult<number> {
  if (!description.trim()) {
    return { ok: false, error: "Expense description is required." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Expense amount must be greater than zero." };
  }

  const db = getDb();
  const result = db
    .prepare(
      `
      INSERT INTO expenses (description, amount, date, category)
      VALUES (?, ?, datetime('now','localtime'), ?)
      `,
    )
    .run(description.trim(), amount, category.trim() || "General");

  return { ok: true, data: Number(result.lastInsertRowid) };
}
