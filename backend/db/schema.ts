import crypto from "node:crypto";
import type Database from "better-sqlite3";

const CURRENT_SCHEMA_VERSION = 4;

function ensureColumn(db: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function hasTable(db: Database.Database, tableName: string) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;
  return Boolean(row?.name);
}

function migrateSchemaV1ToV2(db: Database.Database) {
  if (!hasTable(db, "products")) {
    return;
  }

  const productColumns = db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
  const hasInternalId = productColumns.some((column) => column.name === "id");
  if (hasInternalId) {
    return;
  }

  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec(`
      CREATE TABLE products_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode_id TEXT NOT NULL,
        name TEXT NOT NULL,
        buy_price REAL NOT NULL,
        sell_price REAL NOT NULL,
        stock REAL NOT NULL,
        min_stock REAL NOT NULL,
        default_discount_pct REAL DEFAULT 0.0,
        card_surcharge_enabled INTEGER DEFAULT 0,
        card_surcharge_pct REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT (datetime('now','localtime'))
      );

      INSERT INTO products_v2 (
        barcode_id,
        name,
        buy_price,
        sell_price,
        stock,
        min_stock,
        default_discount_pct,
        card_surcharge_enabled,
        card_surcharge_pct
      )
      SELECT
        barcode_id,
        name,
        buy_price,
        sell_price,
        stock,
        min_stock,
        COALESCE(default_discount_pct, 0.0),
        COALESCE(card_surcharge_enabled, 0),
        COALESCE(card_surcharge_pct, 0.0)
      FROM products;

      CREATE INDEX idx_products_v2_barcode ON products_v2(barcode_id);
      CREATE INDEX idx_products_v2_barcode_sell ON products_v2(barcode_id, sell_price);

      CREATE TABLE supplier_batch_items_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        qty_received REAL NOT NULL,
        unit_cost REAL NOT NULL,
        line_discount_pct REAL DEFAULT 0.0,
        line_total REAL NOT NULL,
        FOREIGN KEY(batch_id) REFERENCES supplier_batches(id),
        FOREIGN KEY(product_id) REFERENCES products_v2(id)
      );

      INSERT INTO supplier_batch_items_v2 (
        id,
        batch_id,
        product_id,
        qty_received,
        unit_cost,
        line_discount_pct,
        line_total
      )
      SELECT
        sbi.id,
        sbi.batch_id,
        p.id,
        sbi.qty_received,
        sbi.unit_cost,
        COALESCE(sbi.line_discount_pct, 0.0),
        sbi.line_total
      FROM supplier_batch_items sbi
      JOIN products_v2 p ON p.barcode_id = sbi.product_id;

      CREATE INDEX idx_supplier_batch_items_v2_product_id ON supplier_batch_items_v2(product_id);

      CREATE TABLE sale_items_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        scanned_barcode TEXT NOT NULL,
        qty REAL NOT NULL,
        sold_at_price REAL NOT NULL,
        item_discount REAL DEFAULT 0.0,
        cogs_unit_cost REAL,
        applied_surcharge REAL DEFAULT 0.0,
        FOREIGN KEY(sale_id) REFERENCES sales(id),
        FOREIGN KEY(product_id) REFERENCES products_v2(id)
      );

      INSERT INTO sale_items_v2 (
        id,
        sale_id,
        product_id,
        scanned_barcode,
        qty,
        sold_at_price,
        item_discount,
        cogs_unit_cost,
        applied_surcharge
      )
      SELECT
        si.id,
        si.sale_id,
        p.id,
        si.product_id,
        si.qty,
        si.sold_at_price,
        COALESCE(si.item_discount, 0.0),
        si.cogs_unit_cost,
        COALESCE(si.applied_surcharge, 0.0)
      FROM sale_items si
      JOIN products_v2 p ON p.barcode_id = si.product_id;

      CREATE INDEX idx_sale_items_v2_product_id ON sale_items_v2(product_id);

      DROP TABLE sale_items;
      DROP TABLE supplier_batch_items;
      DROP TABLE products;

      ALTER TABLE products_v2 RENAME TO products;
      ALTER TABLE supplier_batch_items_v2 RENAME TO supplier_batch_items;
      ALTER TABLE sale_items_v2 RENAME TO sale_items;
    `);

    const fkIssues = db.prepare("PRAGMA foreign_key_check").all() as unknown[];
    if (fkIssues.length > 0) {
      throw new Error("Schema migration to v2 failed foreign key check.");
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode_id TEXT NOT NULL,
      name TEXT NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      stock REAL NOT NULL,
      min_stock REAL NOT NULL,
      default_discount_pct REAL DEFAULT 0.0,
      card_surcharge_enabled INTEGER DEFAULT 0,
      card_surcharge_pct REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode_sell ON products(barcode_id, sell_price);

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
      product_id INTEGER NOT NULL,
      qty_received REAL NOT NULL,
      unit_cost REAL NOT NULL,
      line_discount_pct REAL DEFAULT 0.0,
      line_total REAL NOT NULL,
      FOREIGN KEY(batch_id) REFERENCES supplier_batches(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE INDEX IF NOT EXISTS idx_supplier_batch_items_product_id ON supplier_batch_items(product_id);

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
      product_id INTEGER NOT NULL,
      scanned_barcode TEXT NOT NULL,
      qty REAL NOT NULL,
      sold_at_price REAL NOT NULL,
      item_discount REAL DEFAULT 0.0,
      cogs_unit_cost REAL,
      applied_surcharge REAL DEFAULT 0.0,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

    CREATE TABLE IF NOT EXISTS sale_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT (datetime('now','localtime')),
      note TEXT,
      FOREIGN KEY(cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty REAL NOT NULL,
      return_price REAL NOT NULL,
      FOREIGN KEY(return_id) REFERENCES sale_returns(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
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
  ensureColumn(db, "sale_items", "scanned_barcode", "TEXT DEFAULT ''");
  ensureColumn(db, "sale_items", "applied_surcharge", "REAL DEFAULT 0.0");
  ensureColumn(db, "sale_items", "item_name", "TEXT");
  ensureColumn(db, "expenses", "category", "TEXT DEFAULT 'General'");
  ensureColumn(db, "products", "default_discount_pct", "REAL DEFAULT 0.0");
  ensureColumn(db, "products", "card_surcharge_enabled", "INTEGER DEFAULT 0");
  ensureColumn(db, "products", "card_surcharge_pct", "REAL DEFAULT 0.0");

  if (currentVersion < 2) {
    migrateSchemaV1ToV2(db);
  }

  if (currentVersion < 3) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sale_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cashier_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT (datetime('now','localtime')),
        note TEXT,
        FOREIGN KEY(cashier_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS sale_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        return_price REAL NOT NULL,
        FOREIGN KEY(return_id) REFERENCES sale_returns(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );
    `);
  }

  // v3 -> v4: Recreate sale_items to allow nullable product_id (for ad-hoc items)
  // and add item_name column for the cashier-entered label.
  if (currentVersion < 4) {
    db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sale_items_v4 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER,
          item_name TEXT,
          scanned_barcode TEXT NOT NULL DEFAULT '',
          qty REAL NOT NULL,
          sold_at_price REAL NOT NULL,
          item_discount REAL DEFAULT 0.0,
          cogs_unit_cost REAL,
          applied_surcharge REAL DEFAULT 0.0,
          FOREIGN KEY(sale_id) REFERENCES sales(id),
          FOREIGN KEY(product_id) REFERENCES products(id)
        );

        INSERT INTO sale_items_v4 (
          id, sale_id, product_id, item_name, scanned_barcode,
          qty, sold_at_price, item_discount, cogs_unit_cost, applied_surcharge
        )
        SELECT
          id, sale_id, product_id, NULL, COALESCE(scanned_barcode, ''),
          qty, sold_at_price, COALESCE(item_discount, 0.0),
          cogs_unit_cost, COALESCE(applied_surcharge, 0.0)
        FROM sale_items;

        CREATE INDEX IF NOT EXISTS idx_sale_items_v4_product_id ON sale_items_v4(product_id);

        DROP TABLE sale_items;
        ALTER TABLE sale_items_v4 RENAME TO sale_items;
      `);
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    db.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  }

  const defaultPasswordHash = crypto.createHash("sha256").update("admin123").digest("hex");
  db.prepare("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)").run("admin", defaultPasswordHash, "Admin");
}
