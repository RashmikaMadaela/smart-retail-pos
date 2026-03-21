import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { resetDbConnection, setDbPathForTests } from "../backend/db/sqlite";
import { createOrGetCustomer, createSupplier, recordCustomerPayment, receiveSupplierBatch, recordSupplierPayment, getSupplierLedger } from "../backend/services/ledgerService";
import { completeHeldSale, holdSale, processSale, recallHeldSale } from "../backend/services/salesService";

let testDir = "";
let dbPath = "";

function buildSchema(db: Database.Database) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE products (
      barcode_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      stock REAL NOT NULL,
      min_stock REAL NOT NULL,
      default_discount_pct REAL DEFAULT 0.0,
      card_surcharge_enabled INTEGER DEFAULT 0,
      card_surcharge_pct REAL DEFAULT 0.0
    );

    CREATE TABLE suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      contact TEXT,
      opening_balance REAL DEFAULT 0.0,
      total_outstanding REAL DEFAULT 0.0,
      notes TEXT
    );

    CREATE TABLE supplier_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      reference_no TEXT,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_cost REAL NOT NULL,
      paid_amount REAL DEFAULT 0.0,
      balance_due REAL DEFAULT 0.0,
      status TEXT NOT NULL,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE supplier_batch_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      qty_received REAL NOT NULL,
      unit_cost REAL NOT NULL,
      line_discount_pct REAL DEFAULT 0.0,
      line_total REAL NOT NULL,
      FOREIGN KEY(batch_id) REFERENCES supplier_batches(id),
      FOREIGN KEY(product_id) REFERENCES products(barcode_id)
    );

    CREATE TABLE supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      batch_id INTEGER,
      amount REAL NOT NULL,
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      method TEXT DEFAULT 'CASH',
      note TEXT,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY(batch_id) REFERENCES supplier_batches(id)
    );

    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      total_outstanding REAL DEFAULT 0.0
    );

    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER,
      customer_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0.0,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      paid_amount REAL DEFAULT 0.0,
      balance_due REAL DEFAULT 0.0,
      payment_status TEXT DEFAULT 'PAID',
      payment_method TEXT DEFAULT 'CASH',
      FOREIGN KEY(cashier_id) REFERENCES users(id),
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      qty REAL NOT NULL,
      sold_at_price REAL NOT NULL,
      item_discount REAL DEFAULT 0.0,
      applied_surcharge REAL DEFAULT 0.0,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(barcode_id)
    );

    CREATE TABLE expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      category TEXT DEFAULT 'General'
    );
  `);
}

function seedData(db: Database.Database) {
  const passwordHash = crypto.createHash("sha256").update("admin123").digest("hex");
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", passwordHash, "Admin");
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("cashier", passwordHash, "Cashier");

  db.prepare(
    `
      INSERT INTO products
      (barcode_id, name, buy_price, sell_price, stock, min_stock, default_discount_pct, card_surcharge_enabled, card_surcharge_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run("P100", "Milk Packet", 80, 100, 20, 2, 0, 0, 0);

  db.prepare(
    `
      INSERT INTO products
      (barcode_id, name, buy_price, sell_price, stock, min_stock, default_discount_pct, card_surcharge_enabled, card_surcharge_pct)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run("P200", "Card Fee Item", 50, 100, 15, 2, 0, 1, 5);
}

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-next-test-"));
  dbPath = path.join(testDir, "test.db");
  const db = new Database(dbPath);
  buildSchema(db);
  seedData(db);
  db.close();

  setDbPathForTests(dbPath);
});

afterEach(() => {
  resetDbConnection();
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe("sales parity", () => {
  test("processSale applies card surcharge and passes PAID when amount omitted", () => {
    const result = processSale({
      cashier_id: 2,
      customer_id: null,
      cart_items: [{ product_id: "P200", qty: 1, price: 100, discount: 0 }],
      subtotal: 100,
      global_discount: 0,
      total_amount: 100,
      status: "COMPLETED",
      paid_amount: null,
      payment_status: "PAID",
      payment_method: "CARD",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const db = new Database(dbPath, { fileMustExist: true });
    const sale = db.prepare("SELECT total, paid_amount, payment_status FROM sales WHERE id = ?").get(result.data) as any;
    const saleItem = db.prepare("SELECT applied_surcharge FROM sale_items WHERE sale_id = ?").get(result.data) as any;
    const product = db.prepare("SELECT stock FROM products WHERE barcode_id = 'P200'").get() as any;
    db.close();

    expect(Number(sale.total)).toBe(105);
    expect(Number(sale.paid_amount)).toBe(105);
    expect(sale.payment_status).toBe("PAID");
    expect(Number(saleItem.applied_surcharge)).toBe(5);
    expect(Number(product.stock)).toBe(14);
  });

  test("processSale allows overpayment and keeps balance due at zero", () => {
    const result = processSale({
      cashier_id: 2,
      customer_id: null,
      cart_items: [{ product_id: "P100", qty: 1, price: 100, discount: 0 }],
      subtotal: 100,
      global_discount: 0,
      total_amount: 100,
      status: "COMPLETED",
      paid_amount: 150,
      payment_status: "PAID",
      payment_method: "CASH",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const db = new Database(dbPath, { fileMustExist: true });
    const sale = db
      .prepare("SELECT total, paid_amount, balance_due, payment_status FROM sales WHERE id = ?")
      .get(result.data) as any;
    db.close();

    expect(Number(sale.total)).toBe(100);
    expect(Number(sale.paid_amount)).toBe(150);
    expect(Number(sale.balance_due)).toBe(0);
    expect(sale.payment_status).toBe("PAID");
  });

  test("hold then complete held sale updates stock only on completion", () => {
    const hold = holdSale({
      cashier_id: 2,
      cart_items: [{ product_id: "P100", qty: 2, price: 100, discount: 0 }],
      subtotal: 200,
      global_discount: 0,
      total_amount: 200,
      payment_method: "CASH",
    });
    expect(hold.ok).toBe(true);
    if (!hold.ok) {
      return;
    }

    let db = new Database(dbPath, { fileMustExist: true });
    const stockBefore = db.prepare("SELECT stock FROM products WHERE barcode_id = 'P100'").get() as any;
    expect(Number(stockBefore.stock)).toBe(20);
    db.close();

    const complete = completeHeldSale({
      sale_id: hold.data,
      customer_id: null,
      paid_amount: 200,
      payment_status: "PAID",
      payment_method: "CASH",
    });
    expect(complete.ok).toBe(true);

    db = new Database(dbPath, { fileMustExist: true });
    const stockAfter = db.prepare("SELECT stock FROM products WHERE barcode_id = 'P100'").get() as any;
    db.close();
    expect(Number(stockAfter.stock)).toBe(18);
  });
});

describe("ledger parity", () => {
  test("customer payment updates FIFO dues and outstanding", () => {
    const customer = createOrGetCustomer("John", "0710000000");
    expect(customer.ok).toBe(true);
    if (!customer.ok) {
      return;
    }

    const first = processSale({
      cashier_id: 2,
      customer_id: customer.data.id,
      cart_items: [{ product_id: "P100", qty: 1, price: 100, discount: 0 }],
      subtotal: 100,
      global_discount: 0,
      total_amount: 100,
      status: "COMPLETED",
      paid_amount: 0,
      payment_status: "UNPAID",
      payment_method: "CASH",
    });
    const second = processSale({
      cashier_id: 2,
      customer_id: customer.data.id,
      cart_items: [{ product_id: "P100", qty: 2, price: 100, discount: 0 }],
      subtotal: 200,
      global_discount: 0,
      total_amount: 200,
      status: "COMPLETED",
      paid_amount: 50,
      payment_status: "PARTIAL",
      payment_method: "CASH",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const payment = recordCustomerPayment(customer.data.id, 120);
    expect(payment.ok).toBe(true);

    const db = new Database(dbPath, { fileMustExist: true });
    const outstanding = db.prepare("SELECT total_outstanding FROM customers WHERE id = ?").get(customer.data.id) as any;
    const sales = db.prepare("SELECT id, balance_due, payment_status FROM sales WHERE customer_id = ? ORDER BY id ASC").all(customer.data.id) as any[];
    db.close();

    expect(Number(outstanding.total_outstanding)).toBe(130);
    expect(Number(sales[0].balance_due)).toBe(0);
    expect(sales[0].payment_status).toBe("PAID");
    expect(Number(sales[1].balance_due)).toBe(130);
    expect(sales[1].payment_status).toBe("PARTIAL");
  });

  test("supplier batch receive and settlement updates balances", () => {
    const supplier = createSupplier("Acme", "0771234567", 0, "");
    expect(supplier.ok).toBe(true);

    const db1 = new Database(dbPath, { fileMustExist: true });
    const supplierId = (db1.prepare("SELECT id FROM suppliers WHERE name = 'Acme'").get() as any).id as number;
    db1.close();

    const batch = receiveSupplierBatch(
      supplierId,
      "B-100",
      [{ product_id: "P100", qty_received: 10, unit_cost: 20, line_discount_pct: 10 }],
      50,
    );
    expect(batch.ok).toBe(true);
    if (!batch.ok) {
      return;
    }

    const pay = recordSupplierPayment(supplierId, Number(batch.data), 30, "BANK", "settle");
    expect(pay.ok).toBe(true);

    const ledger = getSupplierLedger(supplierId);
    expect(ledger.supplier).not.toBeNull();
    expect(Number(ledger.supplier?.total_outstanding)).toBe(100);
    expect(Number(ledger.batches[0].paid_amount)).toBe(80);
    expect(Number(ledger.batches[0].balance_due)).toBe(100);
    expect(ledger.batches[0].status).toBe("PARTIAL");
    expect(ledger.payments.length).toBe(2);
  });
});
