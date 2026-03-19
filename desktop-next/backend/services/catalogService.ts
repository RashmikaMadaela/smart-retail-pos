import { getDb } from "../db/sqlite";
import type { Product } from "../types";

export function listProducts(limit: number): Product[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM products ORDER BY name ASC LIMIT ?")
    .all(limit) as Product[];
}

export function searchProducts(searchText: string, limit: number): Product[] {
  const db = getDb();
  const pattern = `%${(searchText || "").trim()}%`;
  return db
    .prepare(
      `
      SELECT *
      FROM products
      WHERE name LIKE ? OR barcode_id LIKE ?
      ORDER BY name ASC
      LIMIT ?
      `,
    )
    .all(pattern, pattern, limit) as Product[];
}
