import { getDb } from "../db/sqlite";
import type { Product } from "../types";

export type CreateProductInput = {
  barcode_id?: string;
  name: string;
  qty: number;
  buy_price: number;
  sell_price: number;
  default_discount_pct?: number;
  card_surcharge_pct?: number;
};

function nextPriyankaStoreBarcode(): string {
  const db = getDb();
  const rows = db
    .prepare("SELECT barcode_id FROM products WHERE barcode_id LIKE 'PS-%'")
    .all() as Array<{ barcode_id: string }>;

  let maxCode = 10000;
  for (const row of rows) {
    const match = /^PS-(\d+)$/.exec((row.barcode_id || "").trim());
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > maxCode) {
      maxCode = value;
    }
  }

  return `PS-${String(maxCode + 1)}`;
}

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

export function createProduct(input: CreateProductInput): { barcode_id: string; action: "created" | "updated" } {
  const db = getDb();

  const productName = (input.name || "").trim();
  if (!productName) {
    throw new Error("Product name is required.");
  }

  const qty = Number(input.qty);
  const buyPrice = Number(input.buy_price);
  const sellPrice = Number(input.sell_price);
  const defaultDiscount = Number(input.default_discount_pct ?? 0);
  const surchargePct = Number(input.card_surcharge_pct ?? 0);

  if (!Number.isFinite(qty) || qty < 0) {
    throw new Error("Qty must be zero or greater.");
  }
  if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
    throw new Error("Buying price must be greater than zero.");
  }
  if (!Number.isFinite(sellPrice) || sellPrice <= 0) {
    throw new Error("Selling price must be greater than zero.");
  }
  if (!Number.isFinite(defaultDiscount) || defaultDiscount < 0 || defaultDiscount > 100) {
    throw new Error("Disc(%) must be between 0 and 100.");
  }
  if (!Number.isFinite(surchargePct) || surchargePct < 0 || surchargePct > 100) {
    throw new Error("Card surcharge(%) must be between 0 and 100.");
  }

  const suppliedBarcode = (input.barcode_id || "").trim();
  let barcodeId = suppliedBarcode;
  if (!barcodeId) {
    barcodeId = nextPriyankaStoreBarcode();
  }

  const existing = db
    .prepare("SELECT barcode_id FROM products WHERE barcode_id = ?")
    .get(barcodeId) as { barcode_id: string } | undefined;

  if (existing) {
    db.prepare(
      `
      UPDATE products
      SET
        name = ?,
        buy_price = ?,
        sell_price = ?,
        stock = ?,
        default_discount_pct = ?,
        card_surcharge_enabled = ?,
        card_surcharge_pct = ?
      WHERE barcode_id = ?
      `,
    ).run(
      productName,
      buyPrice,
      sellPrice,
      qty,
      defaultDiscount,
      surchargePct > 0 ? 1 : 0,
      surchargePct,
      barcodeId,
    );

    return { barcode_id: barcodeId, action: "updated" };
  }

  db.prepare(
    `
    INSERT INTO products (
      barcode_id, name, buy_price, sell_price, stock, min_stock,
      default_discount_pct, card_surcharge_enabled, card_surcharge_pct
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `,
  ).run(
    barcodeId,
    productName,
    buyPrice,
    sellPrice,
    qty,
    defaultDiscount,
    surchargePct > 0 ? 1 : 0,
    surchargePct,
  );

  return { barcode_id: barcodeId, action: "created" };
}

export function removeProduct(barcodeId: string): { barcode_id: string } {
  const db = getDb();
  const normalizedBarcode = (barcodeId || "").trim();
  if (!normalizedBarcode) {
    throw new Error("Product barcode is required.");
  }

  const existing = db
    .prepare("SELECT barcode_id FROM products WHERE barcode_id = ?")
    .get(normalizedBarcode) as { barcode_id: string } | undefined;

  if (!existing) {
    throw new Error(`Product not found: ${normalizedBarcode}`);
  }

  let deleted;
  try {
    deleted = db
      .prepare("DELETE FROM products WHERE barcode_id = ?")
      .run(normalizedBarcode);
  } catch (error) {
    const message = String((error as Error).message || error);
    if (!message.toLowerCase().includes("foreign key constraint failed")) {
      throw error;
    }

    // SuperAdmin hard delete: allow product removal even when history references product IDs.
    db.pragma("foreign_keys = OFF");
    try {
      deleted = db
        .prepare("DELETE FROM products WHERE barcode_id = ?")
        .run(normalizedBarcode);
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }

  if (Number(deleted.changes || 0) === 0) {
    throw new Error("Unable to remove product.");
  }

  return { barcode_id: normalizedBarcode };
}
