import { getDb } from "../db/sqlite";
import type { CartItem, HeldSaleRow, SaleItemRow, SaleWithItems, ServiceResult } from "../types";

type ProcessSaleInput = {
  cashier_id: number;
  customer_id: number | null;
  cart_items: CartItem[];
  subtotal: number;
  global_discount: number;
  total_amount: number;
  status?: "COMPLETED" | "HELD" | "VOID";
  paid_amount?: number | null;
  payment_status?: "PAID" | "PARTIAL" | "UNPAID" | null;
  payment_method?: "CASH" | "CARD";
};

type CompleteHeldSaleInput = {
  sale_id: number;
  customer_id?: number | null;
  paid_amount?: number | null;
  payment_status?: "PAID" | "PARTIAL" | "UNPAID" | null;
  cart_items?: CartItem[];
  subtotal?: number;
  global_discount?: number;
  total_amount?: number;
  payment_method?: "CASH" | "CARD";
};

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

function normalizeCartItems(cartItems: CartItem[]): CartItem[] {
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cart cannot be empty.");
  }

  return cartItems.map((item) => {
    const productId = (item.product_id || "").trim();
    const qty = Number(item.qty ?? 0);
    const price = Number(item.price ?? 0);
    const discount = Number(item.discount ?? 0);
    const appliedSurcharge = Number(item.applied_surcharge ?? 0);

    if (!productId) {
      throw new Error("Cart item product_id is required.");
    }
    positive(qty, `Quantity for ${productId}`);
    nonNegative(price, `Price for ${productId}`);
    nonNegative(discount, `Discount for ${productId}`);
    nonNegative(appliedSurcharge, `Surcharge for ${productId}`);
    if (discount > price) {
      throw new Error(`Item discount cannot exceed unit price for ${productId}.`);
    }

    return {
      product_id: productId,
      qty,
      price,
      discount,
      applied_surcharge: appliedSurcharge,
    };
  });
}

function computePaymentState(totalAmount: number, paidAmount?: number | null, paymentStatus?: string | null) {
  const total = Number(totalAmount);
  const paid = paidAmount == null ? total : Number(paidAmount);

  nonNegative(total, "Total amount");
  nonNegative(paid, "Paid amount");

  // Allow overpayment and return change to customer; balance due cannot be negative.
  const coveredAmount = Math.min(total, paid);
  const balanceDue = Number((total - coveredAmount).toFixed(2));
  let normalizedStatus = (paymentStatus || "").trim().toUpperCase();
  if (!normalizedStatus) {
    if (balanceDue === 0) {
      normalizedStatus = "PAID";
    } else if (paid === 0) {
      normalizedStatus = "UNPAID";
    } else {
      normalizedStatus = "PARTIAL";
    }
  }

  if (!["PAID", "PARTIAL", "UNPAID"].includes(normalizedStatus)) {
    throw new Error("Payment status must be PAID, PARTIAL, or UNPAID.");
  }
  if (normalizedStatus === "PAID" && balanceDue !== 0) {
    throw new Error("PAID status requires full payment.");
  }
  if (normalizedStatus === "UNPAID" && paid !== 0) {
    throw new Error("UNPAID status requires zero paid amount.");
  }
  if (normalizedStatus === "PARTIAL" && (paid === 0 || balanceDue === 0)) {
    throw new Error("PARTIAL status requires partial payment.");
  }

  return {
    paid,
    balanceDue,
    paymentStatus: normalizedStatus as "PAID" | "PARTIAL" | "UNPAID",
  };
}

function ensureStockAvailable(items: CartItem[]) {
  const db = getDb();
  for (const item of items) {
    const product = db
      .prepare("SELECT name, stock FROM products WHERE barcode_id = ?")
      .get(item.product_id) as { name: string; stock: number } | undefined;

    if (!product) {
      throw new Error(`Product not found: ${item.product_id}`);
    }

    if (Number(product.stock) < item.qty) {
      throw new Error(`Insufficient stock for ${product.name}: available ${product.stock}, requested ${item.qty}`);
    }
  }
}

function resolveItemSurcharge(item: CartItem, paymentMethod: string): number {
  if ((paymentMethod || "CASH").trim().toUpperCase() !== "CARD") {
    return 0;
  }

  const db = getDb();
  const product = db
    .prepare(
      `
      SELECT card_surcharge_enabled, card_surcharge_pct
      FROM products
      WHERE barcode_id = ?
      `,
    )
    .get(item.product_id) as { card_surcharge_enabled: number; card_surcharge_pct: number } | undefined;

  if (!product) {
    return 0;
  }
  if (Number(product.card_surcharge_enabled || 0) !== 1) {
    return 0;
  }

  const pct = Number(product.card_surcharge_pct || 0);
  if (pct <= 0) {
    return 0;
  }

  const lineBase = Number(item.qty) * Math.max(0, Number(item.price) - Number(item.discount));
  return Number((lineBase * (pct / 100)).toFixed(2));
}

export function processSale(input: ProcessSaleInput): ServiceResult<number> {
  try {
    const status = (input.status || "COMPLETED").trim().toUpperCase();
    if (!["COMPLETED", "HELD", "VOID"].includes(status)) {
      return { ok: false, error: "Error: Invalid sale status." };
    }

    nonNegative(Number(input.subtotal), "Subtotal");
    nonNegative(Number(input.global_discount), "Global discount");
    nonNegative(Number(input.total_amount), "Total amount");

    const normalizedItems = normalizeCartItems(input.cart_items);
    const paymentMethod = (input.payment_method || "CASH").trim().toUpperCase();
    if (!["CASH", "CARD"].includes(paymentMethod)) {
      return { ok: false, error: "Error: Payment method must be CASH or CARD." };
    }

    const db = getDb();
    const tx = db.transaction(() => {
      if (status === "COMPLETED") {
        ensureStockAvailable(normalizedItems);
      }

      let surchargeTotal = 0;
      for (const item of normalizedItems) {
        const surcharge = resolveItemSurcharge(item, paymentMethod);
        item.applied_surcharge = surcharge;
        surchargeTotal += surcharge;
      }

      const resolvedTotalAmount = Number((Number(input.total_amount) + surchargeTotal).toFixed(2));
      const payment = computePaymentState(resolvedTotalAmount, input.paid_amount, input.payment_status);

      let resolvedPaid = payment.paid;
      let balanceDue = payment.balanceDue;
      let resolvedPaymentStatus = payment.paymentStatus;

      if (status !== "COMPLETED") {
        resolvedPaid = 0;
        balanceDue = resolvedTotalAmount;
        resolvedPaymentStatus = "UNPAID";
      }

      if (status === "COMPLETED" && balanceDue > 0 && !input.customer_id) {
        throw new Error("Customer is required for unpaid or partial payments.");
      }

      const insertSale = db.prepare(
        `
        INSERT INTO sales (
          cashier_id, customer_id, timestamp, subtotal, discount, total, status,
          paid_amount, balance_due, payment_status, payment_method
        ) VALUES (?, ?, datetime('now','localtime'), ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      );

      const result = insertSale.run(
        Number(input.cashier_id),
        input.customer_id ?? null,
        Number(input.subtotal),
        Number(input.global_discount),
        resolvedTotalAmount,
        status,
        resolvedPaid,
        balanceDue,
        resolvedPaymentStatus,
        paymentMethod,
      );

      const saleId = Number(result.lastInsertRowid);
      const insertItem = db.prepare(
        `
        INSERT INTO sale_items (sale_id, product_id, qty, sold_at_price, item_discount, cogs_unit_cost, applied_surcharge)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      );
      const deductStock = db.prepare("UPDATE products SET stock = stock - ? WHERE barcode_id = ?");
      const selectCogsUnitCost = db.prepare("SELECT buy_price FROM products WHERE barcode_id = ?");

      for (const item of normalizedItems) {
        const productCostRow = selectCogsUnitCost.get(item.product_id) as { buy_price: number } | undefined;
        const cogsUnitCost = Number(productCostRow?.buy_price || 0);
        insertItem.run(
          saleId,
          item.product_id,
          item.qty,
          item.price,
          item.discount,
          cogsUnitCost,
          Number(item.applied_surcharge || 0),
        );
        if (status === "COMPLETED") {
          deductStock.run(item.qty, item.product_id);
        }
      }

      if (status === "COMPLETED" && balanceDue > 0 && input.customer_id) {
        const update = db
          .prepare("UPDATE customers SET total_outstanding = total_outstanding + ? WHERE id = ?")
          .run(balanceDue, Number(input.customer_id));
        if (update.changes === 0) {
          throw new Error("Customer not found for credit transaction.");
        }
      }

      return saleId;
    });

    const saleId = tx();
    return { ok: true, data: saleId };
  } catch (err) {
    return { ok: false, error: `Error: ${String((err as Error).message || err)}` };
  }
}

export function holdSale(input: Omit<ProcessSaleInput, "status" | "payment_status" | "paid_amount" | "customer_id">): ServiceResult<number> {
  return processSale({
    cashier_id: input.cashier_id,
    customer_id: null,
    cart_items: input.cart_items,
    subtotal: input.subtotal,
    global_discount: input.global_discount,
    total_amount: input.total_amount,
    status: "HELD",
    paid_amount: 0,
    payment_status: "UNPAID",
    payment_method: input.payment_method || "CASH",
  });
}

export function listHeldSales(cashierId?: number): HeldSaleRow[] {
  const db = getDb();
  if (cashierId == null) {
    return db
      .prepare(
        `
        SELECT s.id, s.timestamp, s.total, s.subtotal, s.discount, u.username AS cashier
        FROM sales s
        LEFT JOIN users u ON u.id = s.cashier_id
        WHERE s.status = 'HELD'
        ORDER BY s.timestamp ASC
        `,
      )
      .all() as HeldSaleRow[];
  }

  return db
    .prepare(
      `
      SELECT s.id, s.timestamp, s.total, s.subtotal, s.discount, u.username AS cashier
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      WHERE s.status = 'HELD' AND s.cashier_id = ?
      ORDER BY s.timestamp ASC
      `,
    )
    .all(Number(cashierId)) as HeldSaleRow[];
}

export function getSaleItems(saleId: number): SaleItemRow[] {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT si.product_id, p.name, si.qty, si.sold_at_price, si.item_discount, si.applied_surcharge
      FROM sale_items si
      LEFT JOIN products p ON p.barcode_id = si.product_id
      WHERE si.sale_id = ?
      ORDER BY si.id ASC
      `,
    )
    .all(Number(saleId)) as SaleItemRow[];
}

export function getSaleWithItems(saleId: number): SaleWithItems | null {
  const db = getDb();
  const sale = db
    .prepare(
      `
      SELECT
        s.id,
        s.timestamp,
        s.subtotal,
        s.discount,
        s.total,
        s.status,
        s.paid_amount,
        s.balance_due,
        s.payment_status,
        s.payment_method,
        u.username AS cashier,
        c.name AS customer_name,
        c.contact AS customer_contact
      FROM sales s
      LEFT JOIN users u ON u.id = s.cashier_id
      LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.id = ?
      `,
    )
    .get(Number(saleId)) as SaleWithItems["sale"] | undefined;

  if (!sale) {
    return null;
  }
  return { sale, items: getSaleItems(saleId) };
}

export function recallHeldSale(saleId: number): ServiceResult<SaleWithItems> {
  const payload = getSaleWithItems(Number(saleId));
  if (!payload) {
    return { ok: false, error: "Sale not found." };
  }
  if (payload.sale.status !== "HELD") {
    return { ok: false, error: "Sale is not in HELD status." };
  }
  
  // Void the held sale after recalling
  const voidResult = voidHeldSale(Number(saleId));
  if (!voidResult.ok) {
    return { ok: false, error: `Failed to void sale after recall: ${voidResult.error}` };
  }
  
  return { ok: true, data: payload };
}

export function completeHeldSale(input: CompleteHeldSaleInput): ServiceResult<string> {
  try {
    const db = getDb();
    const tx = db.transaction(() => {
      const existing = db.prepare("SELECT * FROM sales WHERE id = ?").get(Number(input.sale_id)) as any;
      if (!existing) {
        throw new Error("Held sale not found.");
      }
      if (existing.status !== "HELD") {
        throw new Error("Sale is not held.");
      }

      let normalizedItems: CartItem[];
      let resolvedSubtotal: number;
      let resolvedDiscount: number;
      let resolvedTotal: number;

      if (input.cart_items) {
        normalizedItems = normalizeCartItems(input.cart_items);
        resolvedSubtotal = input.subtotal == null ? Number(existing.subtotal) : Number(input.subtotal);
        resolvedDiscount = input.global_discount == null ? Number(existing.discount) : Number(input.global_discount);
        resolvedTotal = input.total_amount == null ? Number(existing.total) : Number(input.total_amount);
      } else {
        const items = db
          .prepare(
            `
            SELECT product_id, qty, sold_at_price AS price, item_discount AS discount
            FROM sale_items
            WHERE sale_id = ?
            `,
          )
          .all(Number(input.sale_id)) as CartItem[];
        normalizedItems = normalizeCartItems(items);
        resolvedSubtotal = Number(existing.subtotal);
        resolvedDiscount = Number(existing.discount);
        resolvedTotal = Number(existing.total);
      }

      nonNegative(resolvedSubtotal, "Subtotal");
      nonNegative(resolvedDiscount, "Global discount");
      nonNegative(resolvedTotal, "Total amount");

      ensureStockAvailable(normalizedItems);

      const paymentMethod = (input.payment_method || "CASH").trim().toUpperCase();
      if (!["CASH", "CARD"].includes(paymentMethod)) {
        throw new Error("Payment method must be CASH or CARD.");
      }

      let surchargeTotal = 0;
      for (const item of normalizedItems) {
        const surcharge = resolveItemSurcharge(item, paymentMethod);
        item.applied_surcharge = surcharge;
        surchargeTotal += surcharge;
      }

      resolvedTotal = Number((resolvedTotal + surchargeTotal).toFixed(2));

      const payment = computePaymentState(resolvedTotal, input.paid_amount, input.payment_status);
      if (payment.balanceDue > 0 && !input.customer_id) {
        throw new Error("Customer is required for unpaid or partial payments.");
      }

      db.prepare(
        `
        UPDATE sales
        SET
          status = 'COMPLETED',
          customer_id = ?,
          subtotal = ?,
          discount = ?,
          total = ?,
          paid_amount = ?,
          balance_due = ?,
          payment_status = ?,
          payment_method = ?,
          timestamp = datetime('now','localtime')
        WHERE id = ?
        `,
      ).run(
        input.customer_id ?? null,
        resolvedSubtotal,
        resolvedDiscount,
        resolvedTotal,
        payment.paid,
        payment.balanceDue,
        payment.paymentStatus,
        paymentMethod,
        Number(input.sale_id),
      );

      db.prepare("DELETE FROM sale_items WHERE sale_id = ?").run(Number(input.sale_id));

      const insertItem = db.prepare(
        `
        INSERT INTO sale_items (sale_id, product_id, qty, sold_at_price, item_discount, cogs_unit_cost, applied_surcharge)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      );
      const deductStock = db.prepare("UPDATE products SET stock = stock - ? WHERE barcode_id = ?");
      const selectCogsUnitCost = db.prepare("SELECT buy_price FROM products WHERE barcode_id = ?");

      for (const item of normalizedItems) {
        const productCostRow = selectCogsUnitCost.get(item.product_id) as { buy_price: number } | undefined;
        const cogsUnitCost = Number(productCostRow?.buy_price || 0);
        insertItem.run(
          Number(input.sale_id),
          item.product_id,
          item.qty,
          item.price,
          item.discount,
          cogsUnitCost,
          Number(item.applied_surcharge || 0),
        );
        deductStock.run(item.qty, item.product_id);
      }

      if (payment.balanceDue > 0 && input.customer_id) {
        const updated = db
          .prepare("UPDATE customers SET total_outstanding = total_outstanding + ? WHERE id = ?")
          .run(payment.balanceDue, Number(input.customer_id));
        if (updated.changes === 0) {
          throw new Error("Customer not found for credit transaction.");
        }
      }

      return "Held sale completed successfully.";
    });

    const message = tx();
    return { ok: true, data: message };
  } catch (err) {
    return { ok: false, error: `Error: ${String((err as Error).message || err)}` };
  }
}

export function voidHeldSale(saleId: number): ServiceResult<string> {
  try {
    const db = getDb();
    const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(Number(saleId)) as any;
    
    if (!sale) {
      return { ok: false, error: "Sale not found." };
    }
    
    if (sale.status !== "HELD") {
      return { ok: false, error: "Only held sales can be voided." };
    }
    
    db.prepare("UPDATE sales SET status = 'VOID', timestamp = datetime('now','localtime') WHERE id = ?").run(Number(saleId));
    
    return { ok: true, data: "Held sale voided successfully." };
  } catch (err) {
    return { ok: false, error: `Error: ${String((err as Error).message || err)}` };
  }
}
