import crypto from "node:crypto";
import type Database from "better-sqlite3";

const CURRENT_SCHEMA_VERSION = 1;

function ensureColumn(db: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export function initializeDatabaseSchema(db: Database.Database) {
  const currentVersionRow = db.prepare("PRAGMA user_version").get() as { user_version: number };
  const currentVersion = Number(currentVersionRow?.user_version || 0);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
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

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      contact TEXT,
      opening_balance REAL DEFAULT 0.0,
      total_outstanding REAL DEFAULT 0.0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS supplier_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      reference_no TEXT,
      received_at DATETIME DEFAULT (datetime('now','localtime')),
      total_cost REAL NOT NULL,
      paid_amount REAL DEFAULT 0.0,
      balance_due REAL DEFAULT 0.0,
      status TEXT NOT NULL,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS supplier_batch_items (
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

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      batch_id INTEGER,
      amount REAL NOT NULL,
      paid_at DATETIME DEFAULT (datetime('now','localtime')),
      method TEXT DEFAULT 'CASH',
      note TEXT,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY(batch_id) REFERENCES supplier_batches(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT,
      total_outstanding REAL DEFAULT 0.0
    );

    CREATE TABLE IF NOT EXISTS sales (
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
      FOREIGN KEY(cashier_id) REFERENCES users(id),
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      qty REAL NOT NULL,
      sold_at_price REAL NOT NULL,
      item_discount REAL DEFAULT 0.0,
      cogs_unit_cost REAL,
      applied_surcharge REAL DEFAULT 0.0,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(barcode_id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date DATETIME DEFAULT (datetime('now','localtime')),
      category TEXT DEFAULT 'General'
    );
  `);

  ensureColumn(db, "sales", "paid_amount", "REAL DEFAULT 0.0");
  ensureColumn(db, "sales", "balance_due", "REAL DEFAULT 0.0");
  ensureColumn(db, "sales", "payment_status", "TEXT DEFAULT 'PAID'");
  ensureColumn(db, "sales", "payment_method", "TEXT DEFAULT 'CASH'");
  ensureColumn(db, "sale_items", "cogs_unit_cost", "REAL");
  ensureColumn(db, "sale_items", "applied_surcharge", "REAL DEFAULT 0.0");
  ensureColumn(db, "expenses", "category", "TEXT DEFAULT 'General'");
  ensureColumn(db, "products", "default_discount_pct", "REAL DEFAULT 0.0");
  ensureColumn(db, "products", "card_surcharge_enabled", "INTEGER DEFAULT 0");
  ensureColumn(db, "products", "card_surcharge_pct", "REAL DEFAULT 0.0");

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  }

  const defaultPasswordHash = crypto.createHash("sha256").update("admin123").digest("hex");
  db.prepare("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", defaultPasswordHash, "Admin");
}
