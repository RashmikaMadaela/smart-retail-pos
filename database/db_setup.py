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
            min_stock REAL NOT NULL
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
    _ensure_column(cursor, "expenses", "category", "TEXT DEFAULT 'General'")

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