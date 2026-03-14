import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'pos.db')

def get_connection():
    """Helper function to get a database connection with foreign keys enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    # This allows us to access columns by name (e.g., row['name']) instead of index (row[0])
    conn.row_factory = sqlite3.Row 
    return conn

# --- 1. INVENTORY MANAGEMENT ---

def add_product(barcode, name, buy_price, sell_price, stock, min_stock):
    """
    Adds a new product. If barcode is empty (loose item), it generates a SYS- ID.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Auto-generate Virtual ID for loose items
        if not barcode or barcode.strip() == "":
            cursor.execute("SELECT barcode_id FROM products WHERE barcode_id LIKE 'SYS-%' ORDER BY barcode_id DESC LIMIT 1")
            result = cursor.fetchone()
            if result:
                last_num = int(result['barcode_id'].split('-')[1])
                barcode = f"SYS-{last_num + 1:03d}"
            else:
                barcode = "SYS-001"
                
        try:
            cursor.execute('''
                INSERT INTO products (barcode_id, name, buy_price, sell_price, stock, min_stock)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (barcode, name, buy_price, sell_price, stock, min_stock))
            conn.commit()
            return True, barcode # Return success and the ID used
        except sqlite3.IntegrityError:
            return False, "Error: Product with this Barcode/ID already exists."

def get_product(barcode):
    """Fetches product details when scanned."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE barcode_id = ?", (barcode,))
        row = cursor.fetchone()
        if row:
            return dict(row) # Convert the SQLite Row to a standard Python dictionary
        return None

# --- 2. SALES & BILLING ---

def process_sale(cashier_id, customer_id, cart_items, subtotal, global_discount, total_amount, status="COMPLETED"):
    """
    Processes a complete sale using a Database Transaction.
    cart_items should be a list of dictionaries: 
    [{'product_id': 'SYS-001', 'qty': 2, 'price': 150.0, 'discount': 0.0}]
    """
    
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            # 1. Create the Sale Header
            cursor.execute('''
                INSERT INTO sales (cashier_id, customer_id, subtotal, discount, total, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (cashier_id, customer_id, subtotal, global_discount, total_amount, status))
            
            sale_id = cursor.lastrowid # Grab the newly created Invoice Number
            
            # 2. Process each item in the cart
            for item in cart_items:
                # Insert the line item
                cursor.execute('''
                    INSERT INTO sale_items (sale_id, product_id, qty, sold_at_price, item_discount)
                    VALUES (?, ?, ?, ?, ?)
                ''', (sale_id, item['product_id'], item['qty'], item['price'], item['discount']))
                
                # Deduct from inventory (ONLY if the sale is completed)
                if status == "COMPLETED":
                    cursor.execute('''
                        UPDATE products 
                        SET stock = stock - ? 
                        WHERE barcode_id = ?
                    ''', (item['qty'], item['product_id']))
                    
            # 3. If everything above worked without crashing, lock it in!
            conn.commit()
            return True, sale_id
            
        except Exception as e:
            # If ANYTHING fails (e.g., bad product ID), undo the whole process
            conn.rollback()
            return False, str(e)