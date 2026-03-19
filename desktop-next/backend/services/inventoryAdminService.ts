import fs from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { getDb } from "../db/sqlite";
import type { Product, ServiceResult } from "../types";

type InventoryExportPayload = {
  exported_at: string;
  product_count: number;
  products: Product[];
};

function resolveInventoryExportDir() {
  return process.env.POS_INVENTORY_EXPORT_DIR || path.resolve(process.cwd(), "../inventory_exports");
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function clearInventoryStock(): ServiceResult<{ rows_affected: number }> {
  try {
    const db = getDb();
    try {
      const result = db.prepare("DELETE FROM products").run();
      return { ok: true, data: { rows_affected: Number(result.changes || 0) } };
    } catch (error) {
      const message = String((error as Error).message || error);
      if (!message.toLowerCase().includes("foreign key constraint failed")) {
        throw error;
      }

      // SuperAdmin hard reset: remove product master records even when history tables reference product IDs.
      db.pragma("foreign_keys = OFF");
      try {
        const forced = db.prepare("DELETE FROM products").run();
        return { ok: true, data: { rows_affected: Number(forced.changes || 0) } };
      } finally {
        db.pragma("foreign_keys = ON");
      }
    }
  } catch (error) {
    return { ok: false, error: `Error: ${String((error as Error).message || error)}` };
  }
}

export async function exportInventoryToJson(): Promise<ServiceResult<{ file_path: string; product_count: number }>> {
  try {
    const db = getDb();
    const products = db.prepare("SELECT * FROM products ORDER BY name ASC").all() as Product[];

    const dir = resolveInventoryExportDir();
    await mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `inventory-export-${nowStamp()}.json`);
    const payload: InventoryExportPayload = {
      exported_at: new Date().toISOString(),
      product_count: products.length,
      products,
    };

    await fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
    return { ok: true, data: { file_path: filePath, product_count: products.length } };
  } catch (error) {
    return { ok: false, error: `Error: ${String((error as Error).message || error)}` };
  }
}

export async function importInventoryFromJson(filePath: string): Promise<ServiceResult<{ upserted_count: number }>> {
  try {
    const resolvedPath = path.resolve(filePath || "");
    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return { ok: false, error: "Error: Import file not found." };
    }

    const raw = await fs.promises.readFile(resolvedPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<InventoryExportPayload>;
    const products = Array.isArray(parsed.products) ? parsed.products : [];
    if (products.length === 0) {
      return { ok: false, error: "Error: Import file has no products." };
    }

    const db = getDb();
    const upsert = db.prepare(
      `
      INSERT INTO products (
        barcode_id, name, buy_price, sell_price, stock, min_stock,
        default_discount_pct, card_surcharge_enabled, card_surcharge_pct
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(barcode_id) DO UPDATE SET
        name = excluded.name,
        buy_price = excluded.buy_price,
        sell_price = excluded.sell_price,
        stock = excluded.stock,
        min_stock = excluded.min_stock,
        default_discount_pct = excluded.default_discount_pct,
        card_surcharge_enabled = excluded.card_surcharge_enabled,
        card_surcharge_pct = excluded.card_surcharge_pct
      `,
    );

    const tx = db.transaction(() => {
      let upserted = 0;
      for (const product of products) {
        const barcodeId = String((product as any).barcode_id || "").trim();
        const name = String((product as any).name || "").trim();
        const buyPrice = Number((product as any).buy_price || 0);
        const sellPrice = Number((product as any).sell_price || 0);
        const stock = Number((product as any).stock || 0);
        const minStock = Number((product as any).min_stock || 0);
        const defaultDiscountPct = Number((product as any).default_discount_pct || 0);
        const cardSurchargeEnabled = Number((product as any).card_surcharge_enabled || 0) ? 1 : 0;
        const cardSurchargePct = Number((product as any).card_surcharge_pct || 0);

        if (!barcodeId || !name) {
          continue;
        }
        if (!Number.isFinite(buyPrice) || buyPrice < 0 || !Number.isFinite(sellPrice) || sellPrice < 0) {
          continue;
        }
        if (!Number.isFinite(stock) || stock < 0 || !Number.isFinite(minStock) || minStock < 0) {
          continue;
        }

        upsert.run(
          barcodeId,
          name,
          buyPrice,
          sellPrice,
          stock,
          minStock,
          defaultDiscountPct,
          cardSurchargeEnabled,
          cardSurchargePct,
        );
        upserted += 1;
      }
      return upserted;
    });

    return { ok: true, data: { upserted_count: tx() } };
  } catch (error) {
    return { ok: false, error: `Error: ${String((error as Error).message || error)}` };
  }
}
