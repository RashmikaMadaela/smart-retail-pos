import customtkinter as ctk
from tkinter import messagebox, ttk

from database import queries


class AdminView(ctk.CTkFrame):
    def __init__(self, parent, controller, user_data):
        super().__init__(parent)
        self.controller = controller
        self.user_data = user_data
        self.selected_product_id = None
        self._build_layout()
        self.refresh_all()

    def _build_layout(self):
        header = ctk.CTkFrame(self)
        header.pack(fill="x", padx=12, pady=(12, 8))

        ctk.CTkLabel(
            header,
            text="Admin Dashboard",
            font=ctk.CTkFont(size=24, weight="bold"),
        ).pack(side="left", padx=12, pady=12)

        ctk.CTkLabel(
            header,
            text=f"Logged in as: {self.user_data.get('username', 'admin')}",
            font=ctk.CTkFont(size=14),
        ).pack(side="left", padx=8)

        billing_btn = ctk.CTkButton(
            header,
            text="Open Billing",
            width=130,
            command=lambda: self.controller.show_billing_screen(self.user_data),
        )
        billing_btn.pack(side="right", padx=8, pady=10)

        logout_btn = ctk.CTkButton(
            header,
            text="Logout",
            width=100,
            fg_color="#B03030",
            hover_color="#8B2323",
            command=self.controller.show_login,
        )
        logout_btn.pack(side="right", padx=8, pady=10)

        self.tabs = ctk.CTkTabview(self)
        self.tabs.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        self.dashboard_tab = self.tabs.add("Dashboard")
        self.inventory_tab = self.tabs.add("Inventory")
        self.users_tab = self.tabs.add("Users")
        self.customers_tab = self.tabs.add("Customers")
        self.expenses_tab = self.tabs.add("Expenses")

        self._build_dashboard_tab()
        self._build_inventory_tab()
        self._build_users_tab()
        self._build_customers_tab()
        self._build_expenses_tab()

    def _build_dashboard_tab(self):
        top = ctk.CTkFrame(self.dashboard_tab)
        top.pack(fill="x", padx=10, pady=10)

        self.gross_var = ctk.StringVar(value="Gross Sales: Rs. 0.00")
        self.cogs_var = ctk.StringVar(value="COGS: Rs. 0.00")
        self.expense_var = ctk.StringVar(value="Expenses: Rs. 0.00")
        self.net_var = ctk.StringVar(value="Net Profit: Rs. 0.00")

        ctk.CTkLabel(top, textvariable=self.gross_var, font=("Arial", 15, "bold")).grid(row=0, column=0, padx=10, pady=8, sticky="w")
        ctk.CTkLabel(top, textvariable=self.cogs_var, font=("Arial", 15)).grid(row=0, column=1, padx=10, pady=8, sticky="w")
        ctk.CTkLabel(top, textvariable=self.expense_var, font=("Arial", 15)).grid(row=0, column=2, padx=10, pady=8, sticky="w")
        ctk.CTkLabel(top, textvariable=self.net_var, font=("Arial", 15, "bold"), text_color="green").grid(row=0, column=3, padx=10, pady=8, sticky="w")

        refresh_btn = ctk.CTkButton(top, text="Refresh Analytics", width=150, command=self.refresh_dashboard)
        refresh_btn.grid(row=0, column=4, padx=10, pady=8)

        grids = ctk.CTkFrame(self.dashboard_tab)
        grids.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        grids.grid_columnconfigure((0, 1), weight=1)
        grids.grid_rowconfigure((0, 1), weight=1)

        top_sellers_card, self.top_sellers_table = self._create_labeled_table_card(
            grids,
            title="Top Sellers",
            subtitle="Highest moving products by quantity sold.",
            columns=("product", "qty", "revenue"),
            headings=("Product", "Qty", "Revenue"),
        )
        top_sellers_card.grid(row=0, column=0, sticky="nsew", padx=6, pady=6)

        low_stock_card, self.low_stock_table = self._create_labeled_table_card(
            grids,
            title="Low Stock Alerts",
            subtitle="Items where current stock is below minimum stock level.",
            columns=("id", "name", "stock", "min"),
            headings=("ID", "Name", "Stock", "Min"),
        )
        low_stock_card.grid(row=0, column=1, sticky="nsew", padx=6, pady=6)

        dead_stock_card, self.dead_stock_table = self._create_labeled_table_card(
            grids,
            title="Dead Stock",
            subtitle="Products with no completed sales in the last 30 days.",
            columns=("id", "name"),
            headings=("ID", "Dead Stock Item"),
        )
        dead_stock_card.grid(row=1, column=0, sticky="nsew", padx=6, pady=6)

        peak_hours_card, self.peak_hours_table = self._create_labeled_table_card(
            grids,
            title="Peak Hours",
            subtitle="Completed sales volume and total sales by hour.",
            columns=("hour", "count", "sales"),
            headings=("Hour", "Sales Count", "Total Sales"),
        )
        peak_hours_card.grid(row=1, column=1, sticky="nsew", padx=6, pady=6)

    def _build_inventory_tab(self):
        controls = ctk.CTkFrame(self.inventory_tab)
        controls.pack(fill="x", padx=10, pady=10)

        self.item_id_entry = ctk.CTkEntry(controls, width=140, placeholder_text="Barcode / Blank")
        self.item_name_entry = ctk.CTkEntry(controls, width=180, placeholder_text="Item Name")
        self.item_buy_entry = ctk.CTkEntry(controls, width=90, placeholder_text="Buy")
        self.item_sell_entry = ctk.CTkEntry(controls, width=90, placeholder_text="Sell")
        self.item_stock_entry = ctk.CTkEntry(controls, width=90, placeholder_text="Stock")
        self.item_min_entry = ctk.CTkEntry(controls, width=90, placeholder_text="Min")

        self.item_id_entry.grid(row=0, column=0, padx=4, pady=6)
        self.item_name_entry.grid(row=0, column=1, padx=4, pady=6)
        self.item_buy_entry.grid(row=0, column=2, padx=4, pady=6)
        self.item_sell_entry.grid(row=0, column=3, padx=4, pady=6)
        self.item_stock_entry.grid(row=0, column=4, padx=4, pady=6)
        self.item_min_entry.grid(row=0, column=5, padx=4, pady=6)

        add_btn = ctk.CTkButton(controls, text="Add Item", width=100, command=self.add_product)
        upd_btn = ctk.CTkButton(controls, text="Update Item", width=100, command=self.update_product)
        stock_btn = ctk.CTkButton(controls, text="Set Stock", width=90, command=self.set_stock)
        del_btn = ctk.CTkButton(
            controls,
            text="Delete",
            width=80,
            fg_color="#B03030",
            hover_color="#8B2323",
            command=self.delete_product,
        )

        add_btn.grid(row=0, column=6, padx=4, pady=6)
        upd_btn.grid(row=0, column=7, padx=4, pady=6)
        stock_btn.grid(row=0, column=8, padx=4, pady=6)
        del_btn.grid(row=0, column=9, padx=4, pady=6)

        self.products_table = self._create_table(
            self.inventory_tab,
            columns=("id", "name", "buy", "sell", "stock", "min"),
            headings=("ID", "Name", "Buy", "Sell", "Stock", "Min"),
        )
        self.products_table.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self.products_table.bind("<<TreeviewSelect>>", self.on_product_select)

    def _build_users_tab(self):
        controls = ctk.CTkFrame(self.users_tab)
        controls.pack(fill="x", padx=10, pady=10)

        self.new_user_entry = ctk.CTkEntry(controls, width=180, placeholder_text="Username")
        self.new_pass_entry = ctk.CTkEntry(controls, width=180, placeholder_text="Password", show="*")
        self.new_role_var = ctk.StringVar(value="Cashier")
        role_menu = ctk.CTkOptionMenu(controls, variable=self.new_role_var, values=["Cashier", "Admin"], width=120)

        self.new_user_entry.grid(row=0, column=0, padx=4, pady=8)
        self.new_pass_entry.grid(row=0, column=1, padx=4, pady=8)
        role_menu.grid(row=0, column=2, padx=4, pady=8)

        add_user_btn = ctk.CTkButton(controls, text="Create User", width=110, command=self.create_user)
        add_user_btn.grid(row=0, column=3, padx=4, pady=8)

        self.users_table = self._create_table(
            self.users_tab,
            columns=("id", "username", "role"),
            headings=("ID", "Username", "Role"),
        )
        self.users_table.pack(fill="both", expand=True, padx=10, pady=(0, 10))

    def _build_expenses_tab(self):
        controls = ctk.CTkFrame(self.expenses_tab)
        controls.pack(fill="x", padx=10, pady=10)

        self.exp_desc_entry = ctk.CTkEntry(controls, width=280, placeholder_text="Expense Description")
        self.exp_amount_entry = ctk.CTkEntry(controls, width=100, placeholder_text="Amount")
        self.exp_category_entry = ctk.CTkEntry(controls, width=140, placeholder_text="Category")

        self.exp_desc_entry.grid(row=0, column=0, padx=4, pady=8)
        self.exp_amount_entry.grid(row=0, column=1, padx=4, pady=8)
        self.exp_category_entry.grid(row=0, column=2, padx=4, pady=8)

        add_exp_btn = ctk.CTkButton(controls, text="Add Expense", width=120, command=self.add_expense)
        add_exp_btn.grid(row=0, column=3, padx=4, pady=8)

        self.expenses_table = self._create_table(
            self.expenses_tab,
            columns=("id", "date", "category", "description", "amount"),
            headings=("ID", "Date", "Category", "Description", "Amount"),
        )
        self.expenses_table.pack(fill="both", expand=True, padx=10, pady=(0, 10))

    def _build_customers_tab(self):
        controls = ctk.CTkFrame(self.customers_tab)
        controls.pack(fill="x", padx=10, pady=10)

        self.customer_search_entry = ctk.CTkEntry(controls, width=240, placeholder_text="Search customer name/contact")
        self.customer_search_entry.grid(row=0, column=0, padx=4, pady=8)

        search_btn = ctk.CTkButton(controls, text="Search", width=90, command=self.refresh_customers)
        search_btn.grid(row=0, column=1, padx=4, pady=8)

        self.customer_payment_entry = ctk.CTkEntry(controls, width=120, placeholder_text="Payment amount")
        self.customer_payment_entry.grid(row=0, column=2, padx=10, pady=8)

        settle_btn = ctk.CTkButton(controls, text="Record Payment", width=130, command=self.settle_customer_balance)
        settle_btn.grid(row=0, column=3, padx=4, pady=8)

        split = ctk.CTkFrame(self.customers_tab)
        split.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        split.grid_columnconfigure((0, 1), weight=1)
        split.grid_rowconfigure(0, weight=1)

        self.customers_table = self._create_table(
            split,
            columns=("id", "name", "contact", "outstanding"),
            headings=("ID", "Name", "Contact", "Outstanding"),
        )
        self.customers_table.grid(row=0, column=0, sticky="nsew", padx=(0, 6), pady=0)
        self.customers_table.bind("<<TreeviewSelect>>", self.on_customer_select)

        self.customer_ledger_table = self._create_table(
            split,
            columns=("sale", "date", "total", "paid", "balance", "status"),
            headings=("Sale", "Date", "Total", "Paid", "Balance", "Payment"),
        )
        self.customer_ledger_table.grid(row=0, column=1, sticky="nsew", padx=(6, 0), pady=0)

    def _create_table(self, parent, columns, headings):
        table = ttk.Treeview(parent, columns=columns, show="headings")
        for column, heading in zip(columns, headings):
            table.heading(column, text=heading)
            table.column(column, width=120, anchor="w")
        return table

    def _create_labeled_table_card(self, parent, title, subtitle, columns, headings):
        card = ctk.CTkFrame(parent)

        ctk.CTkLabel(
            card,
            text=title,
            font=ctk.CTkFont(size=15, weight="bold"),
        ).pack(anchor="w", padx=8, pady=(8, 0))

        ctk.CTkLabel(
            card,
            text=subtitle,
            font=ctk.CTkFont(size=12),
            text_color="gray60",
        ).pack(anchor="w", padx=8, pady=(0, 6))

        table = self._create_table(card, columns=columns, headings=headings)
        table.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        return card, table

    def _clear_table(self, table):
        for row in table.get_children():
            table.delete(row)

    def refresh_all(self):
        self.refresh_products()
        self.refresh_users()
        self.refresh_customers()
        self.refresh_expenses()
        self.refresh_dashboard()

    def refresh_products(self):
        self._clear_table(self.products_table)
        for product in queries.list_products(limit=1000):
            self.products_table.insert(
                "",
                "end",
                values=(
                    product["barcode_id"],
                    product["name"],
                    f"{float(product['buy_price']):.2f}",
                    f"{float(product['sell_price']):.2f}",
                    f"{float(product['stock']):.2f}",
                    f"{float(product['min_stock']):.2f}",
                ),
            )

    def refresh_users(self):
        self._clear_table(self.users_table)
        for user in queries.list_users():
            self.users_table.insert("", "end", values=(user["id"], user["username"], user["role"]))

    def refresh_expenses(self):
        self._clear_table(self.expenses_table)
        for expense in queries.list_expenses(limit=1000):
            self.expenses_table.insert(
                "",
                "end",
                values=(
                    expense["id"],
                    expense["date"],
                    expense.get("category", "General"),
                    expense["description"],
                    f"{float(expense['amount']):.2f}",
                ),
            )

    def refresh_dashboard(self):
        summary = queries.get_financial_summary()
        self.gross_var.set(f"Gross Sales: Rs. {summary['gross_sales']:.2f}")
        self.cogs_var.set(f"COGS: Rs. {summary['cogs']:.2f}")
        self.expense_var.set(f"Expenses: Rs. {summary['expenses']:.2f}")
        self.net_var.set(f"Net Profit: Rs. {summary['net_profit']:.2f}")

        self._clear_table(self.top_sellers_table)
        for row in queries.get_top_sellers(limit=10):
            self.top_sellers_table.insert(
                "",
                "end",
                values=(
                    row.get("name") or row["product_id"],
                    f"{float(row['total_qty']):.2f}",
                    f"{float(row['total_revenue']):.2f}",
                ),
            )

        self._clear_table(self.low_stock_table)
        for row in queries.list_low_stock_products():
            self.low_stock_table.insert(
                "",
                "end",
                values=(
                    row["barcode_id"],
                    row["name"],
                    f"{float(row['stock']):.2f}",
                    f"{float(row['min_stock']):.2f}",
                ),
            )

        self._clear_table(self.dead_stock_table)
        for row in queries.get_dead_stock(days=30):
            self.dead_stock_table.insert("", "end", values=(row["barcode_id"], row["name"]))

        self._clear_table(self.peak_hours_table)
        for row in queries.get_peak_hours():
            self.peak_hours_table.insert(
                "",
                "end",
                values=(
                    row["hour"],
                    int(row["sale_count"]),
                    f"{float(row['total_sales'] or 0.0):.2f}",
                ),
            )

    def refresh_customers(self):
        self._clear_table(self.customers_table)
        self._clear_table(self.customer_ledger_table)

        search_text = self.customer_search_entry.get().strip()
        rows = queries.search_customers(search_text, limit=200)

        for row in rows:
            self.customers_table.insert(
                "",
                "end",
                values=(
                    row["id"],
                    row["name"],
                    row.get("contact") or "",
                    f"{float(row['total_outstanding']):.2f}",
                ),
            )

    def on_customer_select(self, event=None):
        selection = self.customers_table.selection()
        if not selection:
            return

        values = self.customers_table.item(selection[0], "values")
        customer_id = int(values[0])
        ledger = queries.get_customer_ledger(customer_id)

        self._clear_table(self.customer_ledger_table)
        for row in ledger.get("sales", []):
            self.customer_ledger_table.insert(
                "",
                "end",
                values=(
                    row["id"],
                    row["timestamp"],
                    f"{float(row['total']):.2f}",
                    f"{float(row['paid_amount']):.2f}",
                    f"{float(row['balance_due']):.2f}",
                    row["payment_status"],
                ),
            )

    def settle_customer_balance(self):
        selection = self.customers_table.selection()
        if not selection:
            messagebox.showwarning("Select Customer", "Select a customer first.")
            return

        values = self.customers_table.item(selection[0], "values")
        customer_id = int(values[0])

        amount_text = self.customer_payment_entry.get().strip()
        try:
            amount = float(amount_text)
        except ValueError:
            messagebox.showerror("Invalid", "Payment amount must be numeric.")
            return

        success, message = queries.record_customer_payment(customer_id, amount)
        if success:
            messagebox.showinfo("Recorded", message)
            self.customer_payment_entry.delete(0, "end")
            self.refresh_customers()
            self.refresh_dashboard()
        else:
            messagebox.showerror("Error", message)

    def _get_selected_product(self):
        selection = self.products_table.selection()
        if not selection:
            return None
        return self.products_table.item(selection[0], "values")

    def on_product_select(self, event=None):
        values = self._get_selected_product()
        if not values:
            return

        self.selected_product_id = values[0]
        fields = [
            self.item_id_entry,
            self.item_name_entry,
            self.item_buy_entry,
            self.item_sell_entry,
            self.item_stock_entry,
            self.item_min_entry,
        ]
        for entry in fields:
            entry.delete(0, "end")

        self.item_id_entry.insert(0, values[0])
        self.item_name_entry.insert(0, values[1])
        self.item_buy_entry.insert(0, values[2])
        self.item_sell_entry.insert(0, values[3])
        self.item_stock_entry.insert(0, values[4])
        self.item_min_entry.insert(0, values[5])

    def add_product(self):
        try:
            buy_price = float(self.item_buy_entry.get() or 0)
            sell_price = float(self.item_sell_entry.get() or 0)
            stock = float(self.item_stock_entry.get() or 0)
            min_stock = float(self.item_min_entry.get() or 0)
        except ValueError:
            messagebox.showerror("Invalid", "Buy, sell, stock, and min fields must be numeric.")
            return

        success, result = queries.add_product(
            barcode=self.item_id_entry.get().strip(),
            name=self.item_name_entry.get().strip(),
            buy_price=buy_price,
            sell_price=sell_price,
            stock=stock,
            min_stock=min_stock,
        )
        if success:
            messagebox.showinfo("Success", f"Product saved as {result}")
            self.refresh_products()
            self.refresh_dashboard()
        else:
            messagebox.showerror("Error", result)

    def update_product(self):
        barcode = self.item_id_entry.get().strip()
        try:
            buy_price = float(self.item_buy_entry.get() or 0)
            sell_price = float(self.item_sell_entry.get() or 0)
            min_stock = float(self.item_min_entry.get() or 0)
        except ValueError:
            messagebox.showerror("Invalid", "Buy, sell, and min fields must be numeric.")
            return

        success, message = queries.update_product(
            barcode=barcode,
            name=self.item_name_entry.get().strip(),
            buy_price=buy_price,
            sell_price=sell_price,
            min_stock=min_stock,
        )
        if success:
            messagebox.showinfo("Updated", message)
            self.refresh_products()
            self.refresh_dashboard()
        else:
            messagebox.showerror("Error", message)

    def set_stock(self):
        barcode = self.item_id_entry.get().strip()
        try:
            stock = float(self.item_stock_entry.get() or 0)
        except ValueError:
            messagebox.showerror("Invalid", "Stock must be numeric.")
            return

        success, message = queries.update_stock(barcode, stock)
        if success:
            messagebox.showinfo("Updated", message)
            self.refresh_products()
            self.refresh_dashboard()
        else:
            messagebox.showerror("Error", message)

    def delete_product(self):
        barcode = self.item_id_entry.get().strip()
        if not barcode:
            messagebox.showwarning("Select Item", "Select an item first.")
            return

        if not messagebox.askyesno("Confirm", f"Delete product {barcode}?"):
            return

        success, message = queries.delete_product(barcode)
        if success:
            messagebox.showinfo("Deleted", message)
            self.refresh_products()
            self.refresh_dashboard()
        else:
            messagebox.showerror("Error", message)

    def create_user(self):
        success, message = queries.create_user(
            self.new_user_entry.get().strip(),
            self.new_pass_entry.get(),
            self.new_role_var.get(),
        )
        if success:
            messagebox.showinfo("Success", message)
            self.new_user_entry.delete(0, "end")
            self.new_pass_entry.delete(0, "end")
            self.refresh_users()
        else:
            messagebox.showerror("Error", message)

    def add_expense(self):
        description = self.exp_desc_entry.get().strip()
        category = self.exp_category_entry.get().strip() or "General"
        amount_text = self.exp_amount_entry.get().strip()

        try:
            amount = float(amount_text)
        except ValueError:
            messagebox.showerror("Invalid", "Expense amount must be numeric.")
            return

        success, message = queries.add_expense(description, amount, category=category)
        if success:
            messagebox.showinfo("Saved", message)
            self.exp_desc_entry.delete(0, "end")
            self.exp_amount_entry.delete(0, "end")
            self.exp_category_entry.delete(0, "end")
            self.refresh_expenses()
            self.refresh_dashboard()
        else:
            messagebox.showerror("Error", message)
