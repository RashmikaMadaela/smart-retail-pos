import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { resetDbConnection, setDbPathForTests } from "../backend/db/sqlite";
import { createProduct, getInventoryStats, listProducts, queryProductsPage, searchProducts } from "../backend/services/catalogService";
import { processSale } from "../backend/services/salesService";

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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode_id TEXT NOT NULL,
      name TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      stock REAL NOT NULL,
      min_stock REAL NOT NULL,
      default_discount_pct REAL DEFAULT 0.0,
      card_surcharge_enabled INTEGER DEFAULT 0,
      card_surcharge_pct REAL DEFAULT 0.0
    );

    CREATE TABLE sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER,
      customer_id INTEGER,
      timestamp DATETIME DEFAULT (datetime('now','localtime')),
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0.0,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      paid_amount REAL DEFAULT 0.0,
      balance_due REAL DEFAULT 0.0,
      payment_status TEXT DEFAULT 'PAID',
      payment_method TEXT DEFAULT 'CASH',
      FOREIGN KEY(cashier_id) REFERENCES users(id)
    );

    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      scanned_barcode TEXT NOT NULL,
      qty REAL NOT NULL,
      sold_at_price REAL NOT NULL,
      item_discount REAL DEFAULT 0.0,
      applied_surcharge REAL DEFAULT 0.0,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);
}

function seedData(db: Database.Database) {
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("cashier", "hash", "Cashier");
  // Leave products table empty for generation tests
}

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-products-test-"));
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

describe("catalog service", () => {
  test("generates PS-10001 for first auto-generated barcode", () => {
    const result = createProduct({
      name: "Widget A",
      qty: 10,
      buy_price: 50,
      sell_price: 100,
    });

    expect(result.barcode_id).toBe("PS-10001");
    expect(result.action).toBe("created");

    const db = new Database(dbPath, { fileMustExist: true });
    const product = db.prepare("SELECT barcode_id, name, stock FROM products WHERE barcode_id = ?").get("PS-10001") as any;
    db.close();

    expect(product.barcode_id).toBe("PS-10001");
    expect(product.name).toBe("Widget A");
    expect(Number(product.stock)).toBe(10);
  });

  test("increments sys-ID correctly (PS-10001 → PS-10002)", () => {
    createProduct({
      name: "Widget A",
      qty: 10,
      buy_price: 50,
      sell_price: 100,
    });

    const result = createProduct({
      name: "Widget B",
      qty: 20,
      buy_price: 60,
      sell_price: 110,
    });

    expect(result.barcode_id).toBe("PS-10002");
    expect(result.action).toBe("created");
  });

  test("skips auto-generation when explicit barcode provided", () => {
    const result = createProduct({
      barcode_id: "CUSTOM-001",
      name: "Special Widget",
      qty: 5,
      buy_price: 75,
      sell_price: 125,
    });

    expect(result.barcode_id).toBe("CUSTOM-001");
    expect(result.action).toBe("created");
  });

  test("creates a new variant when same barcode has a different sell price", () => {
    createProduct({
      barcode_id: "P-001",
      name: "Original Widget",
      qty: 10,
      buy_price: 50,
      sell_price: 100,
    });

    const result = createProduct({
      barcode_id: "P-001",
      name: "Updated Widget",
      qty: 15,
      buy_price: 55,
      sell_price: 105,
    });

    expect(result.action).toBe("created");

    const db = new Database(dbPath, { fileMustExist: true });
    const variants = db.prepare("SELECT id, name, sell_price, stock FROM products WHERE barcode_id = 'P-001' ORDER BY id ASC").all() as any[];
    db.close();

    expect(variants).toHaveLength(2);
    expect(variants[1].name).toBe("Updated Widget");
    expect(Number(variants[1].sell_price)).toBe(105);
    expect(Number(variants[1].stock)).toBe(15);
  });

  test("stock deduction on sale removes quantity from product", () => {
    const created = createProduct({
      name: "Stock Test Product",
      qty: 100,
      buy_price: 50,
      sell_price: 100,
    });

    // Verify initial stock
    let db = new Database(dbPath, { fileMustExist: true });
    let product = db.prepare("SELECT stock FROM products WHERE barcode_id = ?").get(created.barcode_id) as any;
    expect(Number(product.stock)).toBe(100);
    db.close();

    // Process a sale with 25 units
    const sale = processSale({
      cashier_id: 1,
      customer_id: null,
      cart_items: [
        {
          product_id: created.product_id,
          scanned_barcode: created.barcode_id,
          qty: 25,
          price: 100,
          discount: 0,
        },
      ],
      subtotal: 2500,
      global_discount: 0,
      total_amount: 2500,
      status: "COMPLETED",
      paid_amount: 2500,
      payment_status: "PAID",
      payment_method: "CASH",
    });

    expect(sale.ok).toBe(true);

    // Verify stock was deducted
    db = new Database(dbPath, { fileMustExist: true });
    product = db.prepare("SELECT stock FROM products WHERE barcode_id = ?").get(created.barcode_id) as any;
    db.close();

    expect(Number(product.stock)).toBe(75);
  });

  test("oversell prevention - rejects sale exceeding available stock", () => {
    const created = createProduct({
      name: "Limited Stock",
      qty: 10,
      buy_price: 50,
      sell_price: 100,
    });

    const result = processSale({
      cashier_id: 1,
      customer_id: null,
      cart_items: [
        {
          product_id: created.product_id,
          scanned_barcode: created.barcode_id,
          qty: 15, // More than available (10)
          price: 100,
          discount: 0,
        },
      ],
      subtotal: 1500,
      global_discount: 0,
      total_amount: 1500,
      status: "COMPLETED",
      paid_amount: 1500,
      payment_status: "PAID",
      payment_method: "CASH",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("stock");
    }
  });

  test("search finds products by name substring", () => {
    createProduct({
      name: "Milk Packet",
      qty: 20,
      buy_price: 80,
      sell_price: 100,
    });

    createProduct({
      name: "Bread Loaf",
      qty: 15,
      buy_price: 40,
      sell_price: 60,
    });

    const results = searchProducts("Milk", 10);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Milk Packet");
  });

  test("search finds products by barcode", () => {
    createProduct({
      barcode_id: "B123456",
      name: "Widget X",
      qty: 10,
      buy_price: 50,
      sell_price: 100,
    });

    const results = searchProducts("B123", 10);
    expect(results.length).toBe(1);
    expect(results[0].barcode_id).toBe("B123456");
  });

  test("listProducts can return items beyond the first 200 alphabetical rows", () => {
    for (let index = 1; index <= 250; index += 1) {
      createProduct({
        barcode_id: `P-${index.toString().padStart(4, "0")}`,
        name: `Product ${index.toString().padStart(4, "0")}`,
        qty: 10,
        buy_price: 10,
        sell_price: 20,
      });
    }

    const all = listProducts(1000);
    expect(all).toHaveLength(250);
    expect(all[249].name).toBe("Product 0250");
    expect(all.some((product) => product.name === "Product 0201")).toBe(true);
  });

  test("getInventoryStats returns totals independent from list limits", () => {
    createProduct({ barcode_id: "A-1", name: "Healthy", qty: 20, buy_price: 10, sell_price: 12 });
    createProduct({ barcode_id: "A-2", name: "Low", qty: 3, buy_price: 10, sell_price: 12 });
    createProduct({ barcode_id: "A-3", name: "Out", qty: 0, buy_price: 10, sell_price: 12 });

    const stats = getInventoryStats();
    expect(stats.total).toBe(3);
    expect(stats.lowStock).toBe(1);
    expect(stats.outOfStock).toBe(1);
  });

  test("queryProductsPage paginates and filters by search + low stock", () => {
    createProduct({ barcode_id: "P-001", name: "Alpha", qty: 10, buy_price: 10, sell_price: 12 });
    createProduct({ barcode_id: "P-002", name: "Beta", qty: 4, buy_price: 10, sell_price: 12 });
    createProduct({ barcode_id: "P-003", name: "Gamma", qty: 0, buy_price: 10, sell_price: 12 });

    const page1 = queryProductsPage({ limit: 2, offset: 0 });
    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);

    const page2 = queryProductsPage({ limit: 2, offset: 2 });
    expect(page2.items).toHaveLength(1);

    const searched = queryProductsPage({ searchText: "bet", limit: 10, offset: 0 });
    expect(searched.total).toBe(1);
    expect(searched.items[0].name).toBe("Beta");

    const lowOnly = queryProductsPage({ lowStockOnly: true, limit: 10, offset: 0 });
    expect(lowOnly.total).toBe(2);
    expect(lowOnly.items.map((item) => item.name).sort()).toEqual(["Beta", "Gamma"]);
  });
});
