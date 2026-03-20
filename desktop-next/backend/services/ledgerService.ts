import { getDb } from "../db/sqlite";
import type {
  Customer,
  CustomerLedger,
  ServiceResult,
  Supplier,
  SupplierBatchInput,
  SupplierLedger,
} from "../types";

function nonNegative(value: number, label: string) {
  if (value < 0) {
    throw new Error(`${label} must be non-negative.`);
  }
}

function positive(value: number, label: string) {
  if (value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

function generateSystemProductId() {
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

export function createOrGetCustomer(name: string, contact = ""): ServiceResult<Customer> {
  const customerName = (name || "").trim();
  const customerContact = (contact || "").trim();
  if (!customerName) {
    return { ok: false, error: "Customer name is required." };
  }

  try {
    const db = getDb();
    const tx = db.transaction(() => {
      if (customerContact) {
        const existing = db
          .prepare("SELECT * FROM customers WHERE contact = ?")
          .get(customerContact) as Customer | undefined;
        if (existing) {
          return existing;
        }
      }

      const result = db
        .prepare("INSERT INTO customers (name, contact, total_outstanding) VALUES (?, ?, 0.0)")
        .run(customerName, customerContact);
      return db
        .prepare("SELECT * FROM customers WHERE id = ?")
        .get(Number(result.lastInsertRowid)) as Customer;
    });

    return { ok: true, data: tx() };
  } catch (err) {
    return { ok: false, error: String((err as Error).message || err) };
  }
}

export function searchCustomers(searchText: string, limit = 20): Customer[] {
  const pattern = `%${(searchText || "").trim()}%`;
  const db = getDb();
  return db
    .prepare(
      `
      SELECT *
      FROM customers
      WHERE name LIKE ? OR contact LIKE ?
      ORDER BY name ASC
      LIMIT ?
      `,
    )
    .all(pattern, pattern, Number(limit)) as Customer[];
}

export function getCustomer(customerId: number): Customer | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(Number(customerId)) as Customer | undefined;
  return row ?? null;
}

export function getCustomerLedger(customerId: number): CustomerLedger {
  const customer = getCustomer(customerId);
  if (!customer) {
    return { customer: null, sales: [] };
  }

  const db = getDb();
  const sales = db
    .prepare(
      `
      SELECT id, timestamp, total, paid_amount, balance_due, payment_status, status
      FROM sales
      WHERE customer_id = ?
      ORDER BY timestamp DESC
      `,
    )
    .all(Number(customerId)) as CustomerLedger["sales"];

  return { customer, sales };
}

export function recordCustomerPayment(customerId: number, amount: number): ServiceResult<string> {
  try {
    positive(Number(amount), "Payment amount");
    const db = getDb();

    const tx = db.transaction(() => {
      const row = db
        .prepare("SELECT total_outstanding FROM customers WHERE id = ?")
        .get(Number(customerId)) as { total_outstanding: number } | undefined;
      if (!row) {
        throw new Error("Customer not found.");
      }

      const outstanding = Number(row.total_outstanding);
      if (outstanding <= 0) {
        throw new Error("Customer has no outstanding balance.");
      }

      let remainingPayment = Math.min(Number(amount), outstanding);
      const dueSales = db
        .prepare(
          `
          SELECT id, total, paid_amount, balance_due
          FROM sales
          WHERE customer_id = ?
            AND status = 'COMPLETED'
            AND balance_due > 0
          ORDER BY timestamp ASC
          `,
        )
        .all(Number(customerId)) as Array<{
        id: number;
        total: number;
        paid_amount: number;
        balance_due: number;
      }>;

      const updateSale = db.prepare(
        "UPDATE sales SET paid_amount = ?, balance_due = ?, payment_status = ? WHERE id = ?",
      );
      for (const sale of dueSales) {
        if (remainingPayment <= 0) {
          break;
        }

        const saleBalance = Number(sale.balance_due);
        const applied = Math.min(remainingPayment, saleBalance);
        const newPaid = Number(sale.paid_amount) + applied;
        const newBalance = Number((saleBalance - applied).toFixed(2));
        const newStatus = newBalance === 0 ? "PAID" : "PARTIAL";

        updateSale.run(newPaid, newBalance, newStatus, Number(sale.id));
        remainingPayment = Number((remainingPayment - applied).toFixed(2));
      }

      const appliedTotal = Math.min(Number(amount), outstanding);
      const newOutstanding = Number((outstanding - appliedTotal).toFixed(2));
      db.prepare("UPDATE customers SET total_outstanding = ? WHERE id = ?").run(newOutstanding, Number(customerId));

      return `Payment recorded. Outstanding balance: ${newOutstanding.toFixed(2)}`;
    });

    return { ok: true, data: tx() };
  } catch (err) {
    return { ok: false, error: `Error: ${String((err as Error).message || err)}` };
  }
}

export function createSupplier(name: string, contact = "", openingBalance = 0, notes = ""): ServiceResult<string> {
  const supplierName = (name || "").trim();
  if (!supplierName) {
    return { ok: false, error: "Error: Supplier name is required." };
  }

  try {
    nonNegative(Number(openingBalance), "Opening balance");
    const db = getDb();
    db.prepare(
      `
      INSERT INTO suppliers (name, contact, opening_balance, total_outstanding, notes)
      VALUES (?, ?, ?, ?, ?)
      `,
    ).run(
      supplierName,
      (contact || "").trim(),
      Number(openingBalance),
      Number(openingBalance),
      (notes || "").trim(),
    );
    return { ok: true, data: "Supplier created successfully." };
  } catch (err: any) {
    if (String(err?.message || "").includes("UNIQUE")) {
      return { ok: false, error: "Error: Supplier already exists." };
    }
    return { ok: false, error: `Error: ${String(err?.message || err)}` };
  }
}

export function updateSupplier(supplierId: number, name: string, contact = ""): ServiceResult<string> {
  const supplierName = (name || "").trim();
  if (!supplierName) {
    return { ok: false, error: "Error: Supplier name is required." };
  }

  try {
    const db = getDb();
    const updated = db
      .prepare(
        `
        UPDATE suppliers
        SET name = ?, contact = ?
        WHERE id = ?
        `,
      )
      .run(supplierName, (contact || "").trim(), Number(supplierId));

    if (updated.changes === 0) {
      return { ok: false, error: "Error: Supplier not found." };
    }

    return { ok: true, data: "Supplier updated successfully." };
  } catch (err: any) {
    if (String(err?.message || "").includes("UNIQUE")) {
      return { ok: false, error: "Error: Supplier already exists." };
    }
    return { ok: false, error: `Error: ${String(err?.message || err)}` };
  }
}

export function listSuppliers(limit = 200): Supplier[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM suppliers ORDER BY name ASC LIMIT ?")
    .all(Number(limit)) as Supplier[];
}

export function searchSuppliers(searchText: string, limit = 50): Supplier[] {
  const pattern = `%${(searchText || "").trim()}%`;
  const db = getDb();
  return db
    .prepare(
      `
      SELECT *
      FROM suppliers
      WHERE name LIKE ? OR contact LIKE ?
      ORDER BY name ASC
      LIMIT ?
      `,
    )
    .all(pattern, pattern, Number(limit)) as Supplier[];
}

export function receiveSupplierBatch(
  supplierId: number,
  referenceNo: string,
  items: SupplierBatchInput[],
  paidAmount = 0,
): ServiceResult<string> {
  if (!items || items.length === 0) {
    return { ok: false, error: "Error: Batch must contain at least one item." };
  }

  try {
    nonNegative(Number(paidAmount), "Paid amount");
    const db = getDb();

    const tx = db.transaction(() => {
      const supplierExists = db
        .prepare("SELECT id FROM suppliers WHERE id = ?")
        .get(Number(supplierId));
      if (!supplierExists) {
        throw new Error("Supplier not found.");
      }

      const normalizedItems: Array<SupplierBatchInput & { product_id: string; line_total: number }> = [];
      let totalCost = 0;

      for (const item of items) {
        let productId = (item.product_id || "").trim();
        const qty = Number(item.qty_received || 0);
        const unitCost = Number(item.unit_cost || 0);
        const lineDiscountPct = Number(item.line_discount_pct || 0);
        const newProduct = item.new_product;

        if (!productId && newProduct) {
          productId = (newProduct.barcode_id || "").trim() || generateSystemProductId();
        }
        if (!productId) {
          throw new Error("Product id/barcode is required unless creating a new item.");
        }

        positive(qty, `Received qty for ${productId}`);
        nonNegative(unitCost, `Unit cost for ${productId}`);
        nonNegative(lineDiscountPct, `Line discount percent for ${productId}`);
        if (lineDiscountPct > 100) {
          throw new Error(`Line discount percent cannot exceed 100 for ${productId}.`);
        }

        const productExists = db
          .prepare("SELECT barcode_id FROM products WHERE barcode_id = ?")
          .get(productId);

        if (!productExists) {
          if (!newProduct) {
            throw new Error(`Product not found: ${productId}`);
          }

          const productName = (newProduct.name || "").trim();
          if (!productName) {
            throw new Error(`New product name is required for ${productId}.`);
          }

          const buyPrice = Number(newProduct.buy_price ?? unitCost);
          const sellPrice = Number(newProduct.sell_price ?? 0);
          const defaultDiscountPct = Number(newProduct.default_discount_pct ?? 0);
          const minStock = Number(newProduct.min_stock ?? 0);
          const surchargeEnabled = newProduct.card_surcharge_enabled ? 1 : 0;
          const surchargePct = Number(newProduct.card_surcharge_pct ?? 0);

          positive(buyPrice, `Buy price for ${productId}`);
          positive(sellPrice, `Sell price for ${productId}`);
          nonNegative(defaultDiscountPct, `Default discount percent for ${productId}`);
          if (defaultDiscountPct > 100) {
            throw new Error(`Default discount percent cannot exceed 100 for ${productId}.`);
          }
          nonNegative(minStock, `Minimum stock for ${productId}`);
          nonNegative(surchargePct, `Card surcharge percent for ${productId}`);
          if (surchargePct > 100) {
            throw new Error(`Card surcharge percent cannot exceed 100 for ${productId}.`);
          }

          db.prepare(
            `
            INSERT INTO products (
              barcode_id, name, buy_price, sell_price, stock, min_stock,
              default_discount_pct, card_surcharge_enabled, card_surcharge_pct
            ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
            `,
          ).run(
            productId,
            productName,
            buyPrice,
            sellPrice,
            minStock,
            defaultDiscountPct,
            surchargeEnabled,
            surchargePct,
          );
        }

        const base = qty * unitCost;
        const lineDiscount = base * (lineDiscountPct / 100);
        const lineTotal = Number((base - lineDiscount).toFixed(2));
        totalCost += lineTotal;

        normalizedItems.push({
          product_id: productId,
          qty_received: qty,
          unit_cost: unitCost,
          line_discount_pct: lineDiscountPct,
          new_product: newProduct,
          line_total: lineTotal,
        });
      }

      if (Number(paidAmount) > totalCost) {
        throw new Error("Paid amount cannot exceed total batch cost.");
      }

      const balanceDue = Number((totalCost - Number(paidAmount)).toFixed(2));
      let status = "PARTIAL";
      if (balanceDue === 0) {
        status = "PAID";
      } else if (Number(paidAmount) === 0) {
        status = "UNPAID";
      }

      const batchResult = db
        .prepare(
          `
          INSERT INTO supplier_batches (supplier_id, reference_no, total_cost, paid_amount, balance_due, status)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          Number(supplierId),
          (referenceNo || "").trim() || null,
          Number(totalCost.toFixed(2)),
          Number(paidAmount),
          balanceDue,
          status,
        );
      const batchId = Number(batchResult.lastInsertRowid);

      const insertItem = db.prepare(
        `
        INSERT INTO supplier_batch_items
        (batch_id, product_id, qty_received, unit_cost, line_discount_pct, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
      );

      const increaseStock = db.prepare("UPDATE products SET stock = stock + ? WHERE barcode_id = ?");
      for (const item of normalizedItems) {
        insertItem.run(
          batchId,
          item.product_id,
          item.qty_received,
          item.unit_cost,
          item.line_discount_pct,
          item.line_total,
        );
        increaseStock.run(item.qty_received, item.product_id);
      }

      if (Number(paidAmount) > 0) {
        db.prepare(
          `
          INSERT INTO supplier_payments (supplier_id, batch_id, amount, method, note)
          VALUES (?, ?, ?, 'CASH', 'Initial payment at receiving')
          `,
        ).run(Number(supplierId), batchId, Number(paidAmount));
      }

      db.prepare("UPDATE suppliers SET total_outstanding = total_outstanding + ? WHERE id = ?").run(
        balanceDue,
        Number(supplierId),
      );

      return String(batchId);
    });

    return { ok: true, data: tx() };
  } catch (err) {
    return { ok: false, error: `Error: ${String((err as Error).message || err)}` };
  }
}

export function listSupplierBatches(supplierId: number, includeSettled = true) {
  const db = getDb();
  if (includeSettled) {
    return db
      .prepare("SELECT * FROM supplier_batches WHERE supplier_id = ? ORDER BY received_at DESC")
      .all(Number(supplierId));
  }
  return db
    .prepare("SELECT * FROM supplier_batches WHERE supplier_id = ? AND balance_due > 0 ORDER BY received_at DESC")
    .all(Number(supplierId));
}

export function recordSupplierPayment(
  supplierId: number,
  batchId: number,
  amount: number,
  method = "CASH",
  note = "",
): ServiceResult<string> {
  try {
    positive(Number(amount), "Payment amount");
    const db = getDb();

    const tx = db.transaction(() => {
      const supplier = db
        .prepare("SELECT id FROM suppliers WHERE id = ?")
        .get(Number(supplierId));
      if (!supplier) {
        throw new Error("Supplier not found.");
      }

      const batch = db
        .prepare(
          "SELECT balance_due, paid_amount, total_cost FROM supplier_batches WHERE id = ? AND supplier_id = ?",
        )
        .get(Number(batchId), Number(supplierId)) as
        | { balance_due: number; paid_amount: number; total_cost: number }
        | undefined;
      if (!batch) {
        throw new Error("Supplier batch not found.");
      }

      const currentBalance = Number(batch.balance_due);
      if (currentBalance <= 0) {
        throw new Error("Selected batch is already settled.");
      }

      const applied = Math.min(Number(amount), currentBalance);
      const newBalance = Number((currentBalance - applied).toFixed(2));
      const newPaid = Number((Number(batch.paid_amount) + applied).toFixed(2));
      const status = newBalance === 0 ? "PAID" : newPaid === 0 ? "UNPAID" : "PARTIAL";

      db.prepare("UPDATE supplier_batches SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?").run(
        newPaid,
        newBalance,
        status,
        Number(batchId),
      );
      db.prepare(
        "INSERT INTO supplier_payments (supplier_id, batch_id, amount, method, note) VALUES (?, ?, ?, ?, ?)",
      ).run(Number(supplierId), Number(batchId), applied, (method || "CASH").toUpperCase(), (note || "").trim());

      db.prepare("UPDATE suppliers SET total_outstanding = MAX(total_outstanding - ?, 0) WHERE id = ?").run(
        applied,
        Number(supplierId),
      );

      return `Payment recorded. Remaining batch balance: ${newBalance.toFixed(2)}`;
    });

    return { ok: true, data: tx() };
  } catch (err) {
    return { ok: false, error: `Error: ${String((err as Error).message || err)}` };
  }
}

export function getSupplierLedger(supplierId: number): SupplierLedger {
  const db = getDb();
  const supplier = db
    .prepare("SELECT * FROM suppliers WHERE id = ?")
    .get(Number(supplierId)) as Supplier | undefined;
  if (!supplier) {
    return { supplier: null, batches: [], payments: [] };
  }

  const batches = db
    .prepare("SELECT * FROM supplier_batches WHERE supplier_id = ? ORDER BY received_at DESC")
    .all(Number(supplierId)) as SupplierLedger["batches"];
  const payments = db
    .prepare("SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY paid_at DESC")
    .all(Number(supplierId)) as SupplierLedger["payments"];

  return { supplier, batches, payments };
}
