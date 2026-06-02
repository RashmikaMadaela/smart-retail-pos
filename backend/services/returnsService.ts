import { getDb } from "../db/sqlite";
import type { ProcessReturnInput, ReturnRow, ServiceResult } from "../types";

export function processReturn(input: ProcessReturnInput): ServiceResult<{ return_id: number }> {
  const db = getDb();

  if (!input.items || input.items.length === 0) {
    return { ok: false, error: "No items provided for return." };
  }

  for (const item of input.items) {
    if (item.qty <= 0) {
      return { ok: false, error: `Invalid quantity for product ID ${item.product_id}.` };
    }
    const product = db.prepare("SELECT id FROM products WHERE id = ?").get(item.product_id) as { id: number } | undefined;
    if (!product) {
      return { ok: false, error: `Product ID ${item.product_id} not found.` };
    }
  }

  const doReturn = db.transaction(() => {
    const insertReturn = db.prepare(
      "INSERT INTO sale_returns (cashier_id, note) VALUES (?, ?)",
    );
    const result = insertReturn.run(input.cashier_id, input.note ?? null);
    const return_id = result.lastInsertRowid as number;

    const insertItem = db.prepare(
      "INSERT INTO sale_return_items (return_id, product_id, qty, return_price) VALUES (?, ?, ?, ?)",
    );
    const restoreStock = db.prepare(
      "UPDATE products SET stock = stock + ? WHERE id = ?",
    );

    for (const item of input.items) {
      insertItem.run(return_id, item.product_id, item.qty, item.return_price);
      restoreStock.run(item.qty, item.product_id);
    }

    return return_id;
  });

  try {
    const return_id = doReturn();
    return { ok: true, data: { return_id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to process return." };
  }
}

export function listReturns(limit = 50): ReturnRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
        sr.id,
        sr.timestamp,
        sr.note,
        u.username AS cashier,
        (SELECT COUNT(*) FROM sale_return_items WHERE return_id = sr.id) AS item_count,
        (SELECT COALESCE(SUM(qty * return_price), 0.0) FROM sale_return_items WHERE return_id = sr.id) AS return_total,
        (SELECT GROUP_CONCAT(p.name, ', ') FROM sale_return_items sri2 INNER JOIN products p ON p.id = sri2.product_id WHERE sri2.return_id = sr.id) AS item_names
      FROM sale_returns sr
      LEFT JOIN users u ON u.id = sr.cashier_id
      ORDER BY sr.timestamp DESC
      LIMIT ?`,
    )
    .all(limit) as ReturnRow[];
}
