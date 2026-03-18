import sqlite3
import os
import hashlib

# Ensure the database is created in the same folder as this script
DB_PATH = os.path.join(os.path.dirname(__file__), 'pos.db')


def _ensure_column(cursor, table_name, column_name, column_definition):
    cursor.execute(f"PRAGMA table_info({table_name})")
    existing_columns = {row[1] for row in cursor.fetchall()}
    if column_name not in existing_columns:
        cursor.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )

def setup_database():
    # Connect to SQLite (this creates the file if it doesn't exist)
    conn = sqlite3.connect(DB_PATH)
    
    # Enable Foreign Key support in SQLite (crucial for relational data)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    print("Creating tables...")

    # 1. Users Table (RBAC)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')

    # 2. Products Table
    # Note: stock and min_stock are REAL (decimals) to support 1.5kg of rice, etc.
    cursor.execute('''
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
        )
    ''')

    # 2.1 Suppliers Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            contact TEXT,
            opening_balance REAL DEFAULT 0.0,
            total_outstanding REAL DEFAULT 0.0,
            notes TEXT
        )
    ''')

    # 2.2 Supplier Batches (stock receipts from supplier)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS supplier_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            reference_no TEXT,
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            total_cost REAL NOT NULL,
            paid_amount REAL DEFAULT 0.0,
            balance_due REAL DEFAULT 0.0,
            status TEXT NOT NULL, -- 'PAID', 'PARTIAL', 'UNPAID'
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
        )
    ''')

    # 2.3 Supplier Batch Items
    cursor.execute('''
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
        )
    ''')

    # 2.4 Supplier Payments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS supplier_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            batch_id INTEGER,
            amount REAL NOT NULL,
            paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            method TEXT DEFAULT 'CASH',
            note TEXT,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY(batch_id) REFERENCES supplier_batches(id)
        )
    ''')

    # 3. Customers Table (For Credit/Lent Items)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            total_outstanding REAL DEFAULT 0.0
        )
    ''')

    # 4. Sales Table (The Header)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cashier_id INTEGER,
            customer_id INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            subtotal REAL NOT NULL,
            discount REAL DEFAULT 0.0,
            total REAL NOT NULL,
            status TEXT NOT NULL, -- 'COMPLETED', 'HELD', 'VOID'
            paid_amount REAL DEFAULT 0.0,
            balance_due REAL DEFAULT 0.0,
            payment_status TEXT DEFAULT 'PAID', -- 'PAID', 'PARTIAL', 'UNPAID'
            payment_method TEXT DEFAULT 'CASH', -- 'CASH', 'CARD'
            FOREIGN KEY(cashier_id) REFERENCES users(id),
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    ''')

    # 5. Sale Items Table (The Line Items)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_id TEXT NOT NULL,
            qty REAL NOT NULL,
            sold_at_price REAL NOT NULL,
            item_discount REAL DEFAULT 0.0, -- NEW: Tracks specific discount given on this item
            applied_surcharge REAL DEFAULT 0.0,
            FOREIGN KEY(sale_id) REFERENCES sales(id),
            FOREIGN KEY(product_id) REFERENCES products(barcode_id)
        )
    ''')

    # 6. Expenses Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            category TEXT DEFAULT 'General'
        )
    ''')

    # Apply idempotent schema upgrades for existing databases.
    _ensure_column(cursor, "sales", "paid_amount", "REAL DEFAULT 0.0")
    _ensure_column(cursor, "sales", "balance_due", "REAL DEFAULT 0.0")
    _ensure_column(cursor, "sales", "payment_status", "TEXT DEFAULT 'PAID'")
    _ensure_column(cursor, "sales", "payment_method", "TEXT DEFAULT 'CASH'")
    _ensure_column(cursor, "sale_items", "applied_surcharge", "REAL DEFAULT 0.0")
    _ensure_column(cursor, "expenses", "category", "TEXT DEFAULT 'General'")
    _ensure_column(cursor, "products", "default_discount_pct", "REAL DEFAULT 0.0")
    _ensure_column(cursor, "products", "card_surcharge_enabled", "INTEGER DEFAULT 0")
    _ensure_column(cursor, "products", "card_surcharge_pct", "REAL DEFAULT 0.0")

    # --- SEED DATA: Create a default Admin user ---
    # We use a simple SHA-256 hash for the default password "admin123"
    default_password = "admin123"
    hashed_pw = hashlib.sha256(default_password.encode()).hexdigest()

    # Use IGNORE so it doesn't crash if you run the setup script twice
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, password_hash, role)
        VALUES (?, ?, ?)
    ''', ("admin", hashed_pw, "Admin"))

    conn.commit()
    conn.close()
    print(f"Database setup complete! File located at: {DB_PATH}")

if __name__ == "__main__":
    setup_database()