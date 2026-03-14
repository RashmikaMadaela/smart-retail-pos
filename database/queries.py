import hashlib
import os
import sqlite3
from typing import Dict, List, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), "pos.db")


def get_connection() -> sqlite3.Connection:
    """Return a SQLite connection with foreign keys and row dict-style access."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def _row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict]:
    if row is None:
        return None
    return dict(row)


def _validate_non_negative(value: float, label: str) -> None:
    if value is None or float(value) < 0:
        raise ValueError(f"{label} must be non-negative.")


def _validate_positive(value: float, label: str) -> None:
    if value is None or float(value) <= 0:
        raise ValueError(f"{label} must be greater than zero.")


def _generate_sys_barcode(cursor: sqlite3.Cursor) -> str:
    cursor.execute(
        "SELECT barcode_id FROM products WHERE barcode_id LIKE 'SYS-%' ORDER BY barcode_id DESC LIMIT 1"
    )
    result = cursor.fetchone()
    if not result:
        return "SYS-001"
    last_num = int(result["barcode_id"].split("-")[1])
    return f"SYS-{last_num + 1:03d}"


def _normalize_cart_items(cart_items: List[Dict]) -> List[Dict]:
    normalized = []
    if not cart_items:
        raise ValueError("Cart cannot be empty.")

    for item in cart_items:
        product_id = (item.get("product_id") or "").strip()
        qty = float(item.get("qty", 0))
        price = float(item.get("price", 0))
        discount = float(item.get("discount", 0.0))

        if not product_id:
            raise ValueError("Cart item product_id is required.")
        _validate_positive(qty, f"Quantity for {product_id}")
        _validate_non_negative(price, f"Price for {product_id}")
        _validate_non_negative(discount, f"Discount for {product_id}")
        if discount > price:
            raise ValueError(f"Item discount cannot exceed unit price for {product_id}.")

        normalized.append(
            {
                "product_id": product_id,
                "qty": qty,
                "price": price,
                "discount": discount,
            }
        )

    return normalized


def _compute_payment_state(
    total_amount: float,
    paid_amount: Optional[float],
    payment_status: Optional[str],
) -> Tuple[float, float, str]:
    total_amount = float(total_amount)
    paid_value = total_amount if paid_amount is None else float(paid_amount)

    _validate_non_negative(total_amount, "Total amount")
    _validate_non_negative(paid_value, "Paid amount")

    if paid_value > total_amount:
        raise ValueError("Paid amount cannot exceed total amount.")

    balance_due = round(total_amount - paid_value, 2)

    if payment_status:
        normalized = payment_status.upper().strip()
        if normalized not in {"PAID", "PARTIAL", "UNPAID"}:
            raise ValueError("Payment status must be PAID, PARTIAL, or UNPAID.")
    else:
        if balance_due == 0:
            normalized = "PAID"
        elif paid_value == 0:
            normalized = "UNPAID"
        else:
            normalized = "PARTIAL"

    if normalized == "PAID" and balance_due != 0:
        raise ValueError("PAID status requires full payment.")
    if normalized == "UNPAID" and paid_value != 0:
        raise ValueError("UNPAID status requires zero paid amount.")
    if normalized == "PARTIAL" and (paid_value == 0 or balance_due == 0):
        raise ValueError("PARTIAL status requires partial payment.")

    return paid_value, balance_due, normalized


def _ensure_stock_available(cursor: sqlite3.Cursor, cart_items: List[Dict]) -> None:
    for item in cart_items:
        cursor.execute(
            "SELECT name, stock FROM products WHERE barcode_id = ?",
            (item["product_id"],),
        )
        product = cursor.fetchone()
        if not product:
            raise ValueError(f"Product not found: {item['product_id']}")
        if float(product["stock"]) < item["qty"]:
            raise ValueError(
                f"Insufficient stock for {product['name']}: available {product['stock']}, requested {item['qty']}"
            )


# --- Inventory Management ---

def add_product(
    barcode: str,
    name: str,
    buy_price: float,
    sell_price: float,
    stock: float,
    min_stock: float,
) -> Tuple[bool, str]:
    with get_connection() as conn:
        cursor = conn.cursor()

        product_name = (name or "").strip()
        if not product_name:
            return False, "Error: Product name is required."

        _validate_non_negative(buy_price, "Buying price")
        _validate_non_negative(sell_price, "Selling price")
        _validate_non_negative(stock, "Stock")
        _validate_non_negative(min_stock, "Minimum stock")

        product_id = (barcode or "").strip() or _generate_sys_barcode(cursor)

        try:
            cursor.execute(
                """
                INSERT INTO products (barcode_id, name, buy_price, sell_price, stock, min_stock)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    product_id,
                    product_name,
                    float(buy_price),
                    float(sell_price),
                    float(stock),
                    float(min_stock),
                ),
            )
            conn.commit()
            return True, product_id
        except sqlite3.IntegrityError:
            return False, "Error: Product with this Barcode/ID already exists."
        except ValueError as err:
            return False, f"Error: {err}"


def get_product(barcode: str) -> Optional[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE barcode_id = ?", (barcode,))
        return _row_to_dict(cursor.fetchone())


def search_products_by_name(search_text: str, limit: int = 20) -> List[Dict]:
    pattern = f"%{(search_text or '').strip()}%"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT *
            FROM products
            WHERE name LIKE ?
            ORDER BY name ASC
            LIMIT ?
            """,
            (pattern, int(limit)),
        )
        return [dict(row) for row in cursor.fetchall()]


def list_products(limit: int = 500) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM products ORDER BY name ASC LIMIT ?",
            (int(limit),),
        )
        return [dict(row) for row in cursor.fetchall()]


def update_product(
    barcode: str,
    name: str,
    buy_price: float,
    sell_price: float,
    min_stock: float,
) -> Tuple[bool, str]:
    try:
        product_name = (name or "").strip()
        if not product_name:
            return False, "Error: Product name is required."

        _validate_non_negative(buy_price, "Buying price")
        _validate_non_negative(sell_price, "Selling price")
        _validate_non_negative(min_stock, "Minimum stock")

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE products
                SET name = ?, buy_price = ?, sell_price = ?, min_stock = ?
                WHERE barcode_id = ?
                """,
                (
                    product_name,
                    float(buy_price),
                    float(sell_price),
                    float(min_stock),
                    barcode,
                ),
            )
            conn.commit()
            if cursor.rowcount == 0:
                return False, "Error: Product not found."
            return True, "Product updated successfully."
    except ValueError as err:
        return False, f"Error: {err}"


def update_stock(barcode: str, new_stock: float) -> Tuple[bool, str]:
    try:
        _validate_non_negative(new_stock, "Stock")
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE products SET stock = ? WHERE barcode_id = ?",
                (float(new_stock), barcode),
            )
            conn.commit()
            if cursor.rowcount == 0:
                return False, "Error: Product not found."
            return True, "Stock updated successfully."
    except ValueError as err:
        return False, f"Error: {err}"


def adjust_stock(barcode: str, delta: float) -> Tuple[bool, str]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT stock FROM products WHERE barcode_id = ?", (barcode,))
        row = cursor.fetchone()
        if not row:
            return False, "Error: Product not found."

        new_stock = float(row["stock"]) + float(delta)
        if new_stock < 0:
            return False, "Error: Stock cannot be negative."

        cursor.execute(
            "UPDATE products SET stock = ? WHERE barcode_id = ?",
            (new_stock, barcode),
        )
        conn.commit()
        return True, "Stock adjusted successfully."


def delete_product(barcode: str) -> Tuple[bool, str]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE barcode_id = ?", (barcode,))
        conn.commit()
        if cursor.rowcount == 0:
            return False, "Error: Product not found."
        return True, "Product deleted successfully."


def list_low_stock_products() -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT *
            FROM products
            WHERE stock < min_stock
            ORDER BY (min_stock - stock) DESC, name ASC
            """
        )
        return [dict(row) for row in cursor.fetchall()]


# --- Users and RBAC ---

def create_user(username: str, password: str, role: str) -> Tuple[bool, str]:
    normalized_username = (username or "").strip()
    normalized_role = (role or "").strip().capitalize()

    if not normalized_username or not password:
        return False, "Error: Username and password are required."
    if normalized_role not in {"Admin", "Cashier"}:
        return False, "Error: Role must be Admin or Cashier."

    password_hash = hashlib.sha256(password.encode()).hexdigest()

    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                (normalized_username, password_hash, normalized_role),
            )
            conn.commit()
            return True, "User created successfully."
        except sqlite3.IntegrityError:
            return False, "Error: Username already exists."


def list_users() -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role FROM users ORDER BY username ASC")
        return [dict(row) for row in cursor.fetchall()]


def update_user_password(user_id: int, new_password: str) -> Tuple[bool, str]:
    if not new_password:
        return False, "Error: Password is required."

    password_hash = hashlib.sha256(new_password.encode()).hexdigest()

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (password_hash, int(user_id)),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return False, "Error: User not found."
        return True, "Password updated successfully."


# --- Customer Ledger ---

def create_or_get_customer(name: str, contact: str = "") -> Tuple[bool, Dict]:
    customer_name = (name or "").strip()
    customer_contact = (contact or "").strip()

    if not customer_name:
        return False, {"error": "Customer name is required."}

    with get_connection() as conn:
        cursor = conn.cursor()
        if customer_contact:
            cursor.execute("SELECT * FROM customers WHERE contact = ?", (customer_contact,))
            existing = cursor.fetchone()
            if existing:
                return True, dict(existing)

        cursor.execute(
            "INSERT INTO customers (name, contact, total_outstanding) VALUES (?, ?, 0.0)",
            (customer_name, customer_contact),
        )
        conn.commit()
        customer_id = cursor.lastrowid
        cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
        return True, dict(cursor.fetchone())


def search_customers(search_text: str, limit: int = 20) -> List[Dict]:
    pattern = f"%{(search_text or '').strip()}%"
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT *
            FROM customers
            WHERE name LIKE ? OR contact LIKE ?
            ORDER BY name ASC
            LIMIT ?
            """,
            (pattern, pattern, int(limit)),
        )
        return [dict(row) for row in cursor.fetchall()]


def get_customer(customer_id: int) -> Optional[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE id = ?", (int(customer_id),))
        return _row_to_dict(cursor.fetchone())


def get_customer_ledger(customer_id: int) -> Dict:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE id = ?", (int(customer_id),))
        customer = cursor.fetchone()
        if not customer:
            return {"customer": None, "sales": []}

        cursor.execute(
            """
            SELECT id, timestamp, total, paid_amount, balance_due, payment_status, status
            FROM sales
            WHERE customer_id = ?
            ORDER BY timestamp DESC
            """,
            (int(customer_id),),
        )

        return {
            "customer": dict(customer),
            "sales": [dict(row) for row in cursor.fetchall()],
        }


def record_customer_payment(customer_id: int, amount: float) -> Tuple[bool, str]:
    try:
        _validate_positive(amount, "Payment amount")

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT total_outstanding FROM customers WHERE id = ?",
                (int(customer_id),),
            )
            row = cursor.fetchone()
            if not row:
                return False, "Error: Customer not found."

            outstanding = float(row["total_outstanding"])
            if outstanding <= 0:
                return False, "Error: Customer has no outstanding balance."

            remaining_payment = min(float(amount), outstanding)

            cursor.execute(
                """
                SELECT id, total, paid_amount, balance_due
                FROM sales
                WHERE customer_id = ?
                  AND status = 'COMPLETED'
                  AND balance_due > 0
                ORDER BY timestamp ASC
                """,
                (int(customer_id),),
            )
            due_sales = cursor.fetchall()

            for sale in due_sales:
                if remaining_payment <= 0:
                    break

                sale_balance = float(sale["balance_due"])
                applied = min(remaining_payment, sale_balance)
                new_paid = float(sale["paid_amount"]) + applied
                new_balance = round(sale_balance - applied, 2)

                if new_balance == 0:
                    new_status = "PAID"
                else:
                    new_status = "PARTIAL"

                cursor.execute(
                    """
                    UPDATE sales
                    SET paid_amount = ?, balance_due = ?, payment_status = ?
                    WHERE id = ?
                    """,
                    (new_paid, new_balance, new_status, int(sale["id"])),
                )

                remaining_payment = round(remaining_payment - applied, 2)

            new_outstanding = round(outstanding - min(float(amount), outstanding), 2)
            cursor.execute(
                "UPDATE customers SET total_outstanding = ? WHERE id = ?",
                (new_outstanding, int(customer_id)),
            )
            conn.commit()
            return True, f"Payment recorded. Outstanding balance: {new_outstanding:.2f}"

    except ValueError as err:
        return False, f"Error: {err}"


# --- Sales and Billing ---

def process_sale(
    cashier_id: int,
    customer_id: Optional[int],
    cart_items: List[Dict],
    subtotal: float,
    global_discount: float,
    total_amount: float,
    status: str = "COMPLETED",
    paid_amount: Optional[float] = None,
    payment_status: Optional[str] = None,
) -> Tuple[bool, str]:
    try:
        normalized_status = (status or "COMPLETED").strip().upper()
        if normalized_status not in {"COMPLETED", "HELD", "VOID"}:
            return False, "Error: Invalid sale status."

        _validate_non_negative(subtotal, "Subtotal")
        _validate_non_negative(global_discount, "Global discount")
        _validate_non_negative(total_amount, "Total amount")

        normalized_items = _normalize_cart_items(cart_items)

        with get_connection() as conn:
            cursor = conn.cursor()

            if normalized_status == "COMPLETED":
                _ensure_stock_available(cursor, normalized_items)

            resolved_paid, balance_due, resolved_payment_status = _compute_payment_state(
                float(total_amount), paid_amount, payment_status
            )

            if normalized_status != "COMPLETED":
                resolved_paid = 0.0
                balance_due = float(total_amount)
                resolved_payment_status = "UNPAID"

            if balance_due > 0 and customer_id is None and normalized_status == "COMPLETED":
                return False, "Error: Customer is required for unpaid or partial payments."

            cursor.execute(
                """
                INSERT INTO sales (
                    cashier_id,
                    customer_id,
                    subtotal,
                    discount,
                    total,
                    status,
                    paid_amount,
                    balance_due,
                    payment_status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(cashier_id),
                    customer_id,
                    float(subtotal),
                    float(global_discount),
                    float(total_amount),
                    normalized_status,
                    float(resolved_paid),
                    float(balance_due),
                    resolved_payment_status,
                ),
            )
            sale_id = cursor.lastrowid

            for item in normalized_items:
                cursor.execute(
                    """
                    INSERT INTO sale_items (sale_id, product_id, qty, sold_at_price, item_discount)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        sale_id,
                        item["product_id"],
                        item["qty"],
                        item["price"],
                        item["discount"],
                    ),
                )

                if normalized_status == "COMPLETED":
                    cursor.execute(
                        "UPDATE products SET stock = stock - ? WHERE barcode_id = ?",
                        (item["qty"], item["product_id"]),
                    )

            if normalized_status == "COMPLETED" and balance_due > 0 and customer_id is not None:
                cursor.execute(
                    """
                    UPDATE customers
                    SET total_outstanding = total_outstanding + ?
                    WHERE id = ?
                    """,
                    (balance_due, int(customer_id)),
                )
                if cursor.rowcount == 0:
                    conn.rollback()
                    return False, "Error: Customer not found for credit transaction."

            conn.commit()
            return True, str(sale_id)

    except (ValueError, sqlite3.IntegrityError) as err:
        return False, f"Error: {err}"
    except Exception as err:
        return False, str(err)


def hold_sale(
    cashier_id: int,
    cart_items: List[Dict],
    subtotal: float,
    global_discount: float,
    total_amount: float,
) -> Tuple[bool, str]:
    return process_sale(
        cashier_id=cashier_id,
        customer_id=None,
        cart_items=cart_items,
        subtotal=subtotal,
        global_discount=global_discount,
        total_amount=total_amount,
        status="HELD",
        paid_amount=0.0,
        payment_status="UNPAID",
    )


def list_held_sales(cashier_id: Optional[int] = None) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        if cashier_id is None:
            cursor.execute(
                """
                SELECT s.id, s.timestamp, s.total, s.subtotal, s.discount, u.username AS cashier
                FROM sales s
                LEFT JOIN users u ON u.id = s.cashier_id
                WHERE s.status = 'HELD'
                ORDER BY s.timestamp ASC
                """
            )
        else:
            cursor.execute(
                """
                SELECT s.id, s.timestamp, s.total, s.subtotal, s.discount, u.username AS cashier
                FROM sales s
                LEFT JOIN users u ON u.id = s.cashier_id
                WHERE s.status = 'HELD' AND s.cashier_id = ?
                ORDER BY s.timestamp ASC
                """,
                (int(cashier_id),),
            )
        return [dict(row) for row in cursor.fetchall()]


def get_sale_items(sale_id: int) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT si.product_id, p.name, si.qty, si.sold_at_price, si.item_discount
            FROM sale_items si
            LEFT JOIN products p ON p.barcode_id = si.product_id
            WHERE si.sale_id = ?
            ORDER BY si.id ASC
            """,
            (int(sale_id),),
        )
        return [dict(row) for row in cursor.fetchall()]


def recall_held_sale(sale_id: int) -> Tuple[bool, Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sales WHERE id = ?", (int(sale_id),))
        sale = cursor.fetchone()
        if not sale:
            return False, {"error": "Sale not found."}
        if sale["status"] != "HELD":
            return False, {"error": "Sale is not in HELD status."}

        items = get_sale_items(int(sale_id))
        return True, {"sale": dict(sale), "items": items}


def complete_held_sale(
    sale_id: int,
    customer_id: Optional[int] = None,
    paid_amount: Optional[float] = None,
    payment_status: Optional[str] = None,
) -> Tuple[bool, str]:
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sales WHERE id = ?", (int(sale_id),))
            sale = cursor.fetchone()
            if not sale:
                return False, "Error: Held sale not found."
            if sale["status"] != "HELD":
                return False, "Error: Sale is not held."

            cursor.execute(
                """
                SELECT product_id, qty, sold_at_price AS price, item_discount AS discount
                FROM sale_items
                WHERE sale_id = ?
                """,
                (int(sale_id),),
            )
            items = [dict(row) for row in cursor.fetchall()]
            normalized_items = _normalize_cart_items(items)
            _ensure_stock_available(cursor, normalized_items)

            resolved_paid, balance_due, resolved_payment_status = _compute_payment_state(
                float(sale["total"]),
                paid_amount,
                payment_status,
            )

            if balance_due > 0 and customer_id is None:
                return False, "Error: Customer is required for unpaid or partial payments."

            cursor.execute(
                """
                UPDATE sales
                SET
                    status = 'COMPLETED',
                    customer_id = ?,
                    paid_amount = ?,
                    balance_due = ?,
                    payment_status = ?,
                    timestamp = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    customer_id,
                    resolved_paid,
                    balance_due,
                    resolved_payment_status,
                    int(sale_id),
                ),
            )

            for item in normalized_items:
                cursor.execute(
                    "UPDATE products SET stock = stock - ? WHERE barcode_id = ?",
                    (item["qty"], item["product_id"]),
                )

            if balance_due > 0 and customer_id is not None:
                cursor.execute(
                    """
                    UPDATE customers
                    SET total_outstanding = total_outstanding + ?
                    WHERE id = ?
                    """,
                    (balance_due, int(customer_id)),
                )
                if cursor.rowcount == 0:
                    conn.rollback()
                    return False, "Error: Customer not found for credit transaction."

            conn.commit()
            return True, "Held sale completed successfully."
    except (ValueError, sqlite3.IntegrityError) as err:
        return False, f"Error: {err}"


def void_sale(sale_id: int) -> Tuple[bool, str]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE sales SET status = 'VOID' WHERE id = ? AND status = 'HELD'",
            (int(sale_id),),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return False, "Error: Only held sales can be voided."
        return True, "Sale voided successfully."


# --- Expense Tracking ---

def add_expense(
    description: str,
    amount: float,
    category: str = "General",
    date: Optional[str] = None,
) -> Tuple[bool, str]:
    try:
        desc = (description or "").strip()
        if not desc:
            return False, "Error: Expense description is required."

        _validate_positive(amount, "Expense amount")
        expense_category = (category or "General").strip() or "General"

        with get_connection() as conn:
            cursor = conn.cursor()
            if date:
                cursor.execute(
                    """
                    INSERT INTO expenses (description, amount, date, category)
                    VALUES (?, ?, ?, ?)
                    """,
                    (desc, float(amount), date, expense_category),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO expenses (description, amount, category)
                    VALUES (?, ?, ?)
                    """,
                    (desc, float(amount), expense_category),
                )
            conn.commit()
            return True, "Expense added successfully."
    except ValueError as err:
        return False, f"Error: {err}"


def list_expenses(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 500,
) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM expenses WHERE 1=1"
        params: List = []

        if start_date:
            query += " AND date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND date <= ?"
            params.append(end_date)
        if category:
            query += " AND category = ?"
            params.append(category)

        query += " ORDER BY date DESC LIMIT ?"
        params.append(int(limit))

        cursor.execute(query, tuple(params))
        return [dict(row) for row in cursor.fetchall()]


# --- Reporting and Analytics ---

def _build_date_filters(
    start_date: Optional[str],
    end_date: Optional[str],
    field_name: str = "timestamp",
) -> Tuple[str, List]:
    clause = ""
    params: List = []
    if start_date:
        clause += f" AND {field_name} >= ?"
        params.append(start_date)
    if end_date:
        clause += f" AND {field_name} <= ?"
        params.append(end_date)
    return clause, params


def get_financial_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict:
    with get_connection() as conn:
        cursor = conn.cursor()

        sales_filter, sales_params = _build_date_filters(start_date, end_date, "s.timestamp")
        expense_filter, expense_params = _build_date_filters(start_date, end_date, "e.date")

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(s.total), 0.0) AS gross_sales
            FROM sales s
            WHERE s.status = 'COMPLETED' {sales_filter}
            """,
            tuple(sales_params),
        )
        gross_sales = float(cursor.fetchone()["gross_sales"])

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(si.qty * p.buy_price), 0.0) AS cogs
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            JOIN products p ON p.barcode_id = si.product_id
            WHERE s.status = 'COMPLETED' {sales_filter}
            """,
            tuple(sales_params),
        )
        cogs = float(cursor.fetchone()["cogs"])

        cursor.execute(
            f"""
            SELECT COALESCE(SUM(e.amount), 0.0) AS expenses_total
            FROM expenses e
            WHERE 1=1 {expense_filter}
            """,
            tuple(expense_params),
        )
        expenses_total = float(cursor.fetchone()["expenses_total"])

        net_profit = gross_sales - cogs - expenses_total
        return {
            "gross_sales": round(gross_sales, 2),
            "cogs": round(cogs, 2),
            "expenses": round(expenses_total, 2),
            "net_profit": round(net_profit, 2),
        }


def get_top_sellers(
    limit: int = 10,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        sales_filter, sales_params = _build_date_filters(start_date, end_date, "s.timestamp")

        cursor.execute(
            f"""
            SELECT
                si.product_id,
                p.name,
                SUM(si.qty) AS total_qty,
                SUM(si.qty * si.sold_at_price) AS total_revenue
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            LEFT JOIN products p ON p.barcode_id = si.product_id
            WHERE s.status = 'COMPLETED' {sales_filter}
            GROUP BY si.product_id, p.name
            ORDER BY total_qty DESC
            LIMIT ?
            """,
            tuple(sales_params + [int(limit)]),
        )
        return [dict(row) for row in cursor.fetchall()]


def get_dead_stock(days: int = 30) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT p.*
            FROM products p
            WHERE NOT EXISTS (
                SELECT 1
                FROM sale_items si
                JOIN sales s ON s.id = si.sale_id
                WHERE si.product_id = p.barcode_id
                  AND s.status = 'COMPLETED'
                  AND s.timestamp >= datetime('now', ?)
            )
            ORDER BY p.name ASC
            """,
            (f"-{int(days)} days",),
        )
        return [dict(row) for row in cursor.fetchall()]


def get_peak_hours(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict]:
    with get_connection() as conn:
        cursor = conn.cursor()
        sales_filter, sales_params = _build_date_filters(start_date, end_date, "timestamp")

        cursor.execute(
            f"""
            SELECT
                strftime('%H', timestamp) AS hour,
                COUNT(*) AS sale_count,
                SUM(total) AS total_sales
            FROM sales
            WHERE status = 'COMPLETED' {sales_filter}
            GROUP BY strftime('%H', timestamp)
            ORDER BY hour ASC
            """,
            tuple(sales_params),
        )
        return [dict(row) for row in cursor.fetchall()]
