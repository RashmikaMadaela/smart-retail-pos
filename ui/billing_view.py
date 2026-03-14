import customtkinter as ctk
from tkinter import messagebox, simpledialog, ttk

from database import queries
from hardware.printer import generate_and_print_receipt


class BillingView(ctk.CTkFrame):
    def __init__(self, parent, controller, user_data):
        super().__init__(parent)
        self.controller = controller
        self.user_data = user_data

        self.cart = []
        self.product_search_map = {}
        self.active_held_sale_id = None
        self.current_item_id = None

        self.current_subtotal = 0.0
        self.current_line_discount = 0.0
        self.current_global_discount = 0.0
        self.current_total = 0.0

        self.setup_ui()

    def setup_ui(self):
        self.left_frame = ctk.CTkFrame(self)
        self.left_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        self.right_frame = ctk.CTkFrame(self, width=360)
        self.right_frame.pack(side="right", fill="y", padx=10, pady=10)
        self.right_frame.pack_propagate(False)

        self._build_left_panel()
        self._build_right_panel()
        self.refresh_cart_table()

    def _build_left_panel(self):
        scan_bar = ctk.CTkFrame(self.left_frame)
        scan_bar.pack(fill="x", padx=10, pady=(10, 6))

        self.barcode_entry = ctk.CTkEntry(
            scan_bar,
            placeholder_text="Scan barcode or type item ID...",
            height=38,
            font=("Arial", 14),
        )
        self.barcode_entry.pack(side="left", fill="x", expand=True, padx=(8, 6), pady=8)
        self.barcode_entry.bind("<Return>", self.add_to_cart_from_barcode)

        add_scan_btn = ctk.CTkButton(
            scan_bar,
            text="Add",
            width=80,
            command=self.add_to_cart_from_barcode,
        )
        add_scan_btn.pack(side="right", padx=(0, 8), pady=8)

        qty_discount_bar = ctk.CTkFrame(self.left_frame)
        qty_discount_bar.pack(fill="x", padx=10, pady=(0, 6))

        ctk.CTkLabel(qty_discount_bar, text="Add Qty").pack(side="left", padx=(8, 4), pady=8)
        self.add_qty_entry = ctk.CTkEntry(qty_discount_bar, width=80)
        self.add_qty_entry.pack(side="left", padx=(0, 8), pady=8)
        self.add_qty_entry.insert(0, "1")

        ctk.CTkLabel(qty_discount_bar, text="Item Disc").pack(side="left", padx=(0, 4), pady=8)
        self.add_discount_entry = ctk.CTkEntry(qty_discount_bar, width=90)
        self.add_discount_entry.pack(side="left", padx=(0, 8), pady=8)
        self.add_discount_entry.insert(0, "0")

        ctk.CTkLabel(
            qty_discount_bar,
            text="Use decimal qty for loose items (e.g., 1.25).",
            text_color="gray60",
        ).pack(side="left", padx=4, pady=8)

        search_bar = ctk.CTkFrame(self.left_frame)
        search_bar.pack(fill="x", padx=10, pady=(0, 6))

        self.search_entry = ctk.CTkEntry(
            search_bar,
            placeholder_text="Search item by name...",
            height=36,
        )
        self.search_entry.pack(side="left", fill="x", expand=True, padx=(8, 6), pady=8)

        search_btn = ctk.CTkButton(
            search_bar,
            text="Find",
            width=70,
            command=self.search_products,
        )
        search_btn.pack(side="left", padx=4, pady=8)

        self.search_var = ctk.StringVar(value="No results")
        self.search_dropdown = ctk.CTkOptionMenu(
            search_bar,
            variable=self.search_var,
            values=["No results"],
            width=220,
        )
        self.search_dropdown.pack(side="left", padx=4, pady=8)

        add_search_btn = ctk.CTkButton(
            search_bar,
            text="Add Selected",
            width=120,
            command=self.add_selected_search_result,
        )
        add_search_btn.pack(side="right", padx=(4, 8), pady=8)

        table_frame = ctk.CTkFrame(self.left_frame)
        table_frame.pack(fill="both", expand=True, padx=10, pady=6)

        columns = ("id", "name", "qty", "price", "disc", "total")
        self.cart_table = ttk.Treeview(table_frame, columns=columns, show="headings", height=18)
        self.cart_table.heading("id", text="Item ID")
        self.cart_table.heading("name", text="Item Name")
        self.cart_table.heading("qty", text="Qty")
        self.cart_table.heading("price", text="Unit")
        self.cart_table.heading("disc", text="Disc")
        self.cart_table.heading("total", text="Total")

        self.cart_table.column("id", width=110)
        self.cart_table.column("name", width=250)
        self.cart_table.column("qty", width=55, anchor="center")
        self.cart_table.column("price", width=75, anchor="e")
        self.cart_table.column("disc", width=70, anchor="e")
        self.cart_table.column("total", width=90, anchor="e")
        self.cart_table.pack(fill="both", expand=True, padx=8, pady=8)
        self.cart_table.bind("<<TreeviewSelect>>", self.on_cart_selection_change)

        quick_edit = ctk.CTkFrame(self.left_frame)
        quick_edit.pack(fill="x", padx=10, pady=(0, 6))

        self.current_item_var = ctk.StringVar(value="Current item: Auto")
        ctk.CTkLabel(quick_edit, textvariable=self.current_item_var).pack(side="left", padx=(8, 12), pady=8)

        ctk.CTkLabel(quick_edit, text="Qty").pack(side="left", padx=(0, 4), pady=8)
        self.quick_qty_entry = ctk.CTkEntry(quick_edit, width=80)
        self.quick_qty_entry.pack(side="left", padx=(0, 8), pady=8)

        ctk.CTkLabel(quick_edit, text="Disc").pack(side="left", padx=(0, 4), pady=8)
        self.quick_discount_entry = ctk.CTkEntry(quick_edit, width=80)
        self.quick_discount_entry.pack(side="left", padx=(0, 8), pady=8)

        apply_item_edit_btn = ctk.CTkButton(
            quick_edit,
            text="Apply to Current",
            width=130,
            command=self.apply_quick_item_edit,
        )
        apply_item_edit_btn.pack(side="left", padx=4, pady=8)

        remove_current_btn = ctk.CTkButton(
            quick_edit,
            text="Remove Current",
            width=130,
            fg_color="#B03030",
            hover_color="#8B2323",
            command=self.remove_current_item,
        )
        remove_current_btn.pack(side="left", padx=4, pady=8)

        qty_actions = ctk.CTkFrame(self.left_frame)
        qty_actions.pack(fill="x", padx=10, pady=(0, 10))

        dec_btn = ctk.CTkButton(qty_actions, text="- Qty", width=90, command=self.decrease_selected_qty)
        dec_btn.pack(side="left", padx=4, pady=8)

        inc_btn = ctk.CTkButton(qty_actions, text="+ Qty", width=90, command=self.increase_selected_qty)
        inc_btn.pack(side="left", padx=4, pady=8)

        rm_btn = ctk.CTkButton(
            qty_actions,
            text="Remove Item",
            width=120,
            fg_color="#B03030",
            hover_color="#8B2323",
            command=self.remove_selected_item,
        )
        rm_btn.pack(side="left", padx=4, pady=8)

        self.line_discount_entry = ctk.CTkEntry(
            qty_actions,
            width=90,
            placeholder_text="Disc/Unit",
        )
        self.line_discount_entry.pack(side="left", padx=(12, 4), pady=8)

        line_disc_btn = ctk.CTkButton(
            qty_actions,
            text="Apply Line Disc",
            width=130,
            command=self.apply_line_discount,
        )
        line_disc_btn.pack(side="left", padx=4, pady=8)

    def _build_right_panel(self):
        header = ctk.CTkLabel(
            self.right_frame,
            text=f"Cashier: {self.user_data['username']}",
            font=("Arial", 16, "bold"),
        )
        header.pack(pady=(16, 10))

        self.subtotal_var = ctk.StringVar(value="Subtotal: Rs. 0.00")
        self.line_discount_var = ctk.StringVar(value="Line Discounts: Rs. 0.00")
        self.global_discount_var = ctk.StringVar(value="Global Discount: Rs. 0.00")
        self.total_var = ctk.StringVar(value="Total: Rs. 0.00")

        ctk.CTkLabel(self.right_frame, textvariable=self.subtotal_var, font=("Arial", 16)).pack(pady=4)
        ctk.CTkLabel(self.right_frame, textvariable=self.line_discount_var, font=("Arial", 14)).pack(pady=2)
        ctk.CTkLabel(self.right_frame, textvariable=self.global_discount_var, font=("Arial", 14)).pack(pady=2)
        ctk.CTkLabel(
            self.right_frame,
            textvariable=self.total_var,
            font=("Arial", 24, "bold"),
            text_color="green",
        ).pack(pady=(8, 14))

        discount_box = ctk.CTkFrame(self.right_frame)
        discount_box.pack(fill="x", padx=12, pady=(0, 8))

        ctk.CTkLabel(discount_box, text="Global Discount").grid(row=0, column=0, padx=8, pady=8, sticky="w")
        self.global_discount_entry = ctk.CTkEntry(discount_box, width=90, placeholder_text="0")
        self.global_discount_entry.grid(row=0, column=1, padx=4, pady=8)

        self.discount_mode = ctk.StringVar(value="AMOUNT")
        mode_menu = ctk.CTkOptionMenu(
            discount_box,
            variable=self.discount_mode,
            values=["AMOUNT", "PERCENT"],
            width=100,
        )
        mode_menu.grid(row=0, column=2, padx=4, pady=8)

        apply_disc_btn = ctk.CTkButton(discount_box, text="Apply", width=70, command=self.refresh_cart_table)
        apply_disc_btn.grid(row=0, column=3, padx=4, pady=8)

        payment_box = ctk.CTkFrame(self.right_frame)
        payment_box.pack(fill="x", padx=12, pady=8)

        ctk.CTkLabel(payment_box, text="Payment Mode").grid(row=0, column=0, padx=8, pady=(8, 4), sticky="w")
        self.payment_mode = ctk.StringVar(value="PAID")
        pay_mode_menu = ctk.CTkOptionMenu(
            payment_box,
            variable=self.payment_mode,
            values=["PAID", "PARTIAL", "UNPAID"],
            width=140,
        )
        pay_mode_menu.grid(row=0, column=1, padx=4, pady=(8, 4), sticky="w")

        ctk.CTkLabel(payment_box, text="Paid Amount").grid(row=1, column=0, padx=8, pady=4, sticky="w")
        self.paid_amount_entry = ctk.CTkEntry(payment_box, width=140, placeholder_text="Auto for PAID")
        self.paid_amount_entry.grid(row=1, column=1, padx=4, pady=4, sticky="w")

        ctk.CTkLabel(payment_box, text="Customer Name").grid(row=2, column=0, padx=8, pady=4, sticky="w")
        self.customer_name_entry = ctk.CTkEntry(payment_box, width=200, placeholder_text="Required for credit")
        self.customer_name_entry.grid(row=2, column=1, padx=4, pady=4, sticky="w")

        ctk.CTkLabel(payment_box, text="Customer Contact").grid(row=3, column=0, padx=8, pady=(4, 8), sticky="w")
        self.customer_contact_entry = ctk.CTkEntry(payment_box, width=200, placeholder_text="Phone number")
        self.customer_contact_entry.grid(row=3, column=1, padx=4, pady=(4, 8), sticky="w")

        action_box = ctk.CTkFrame(self.right_frame)
        action_box.pack(fill="x", padx=12, pady=(8, 14))

        hold_btn = ctk.CTkButton(action_box, text="Hold Bill", command=self.hold_current_bill)
        hold_btn.pack(fill="x", padx=8, pady=(10, 4))

        recall_btn = ctk.CTkButton(action_box, text="Recall Held Bill", command=self.recall_held_bill)
        recall_btn.pack(fill="x", padx=8, pady=4)

        self.checkout_btn = ctk.CTkButton(
            action_box,
            text="Checkout",
            height=50,
            font=("Arial", 18, "bold"),
            fg_color="green",
            hover_color="darkgreen",
            command=self.process_checkout,
        )
        self.checkout_btn.pack(fill="x", padx=8, pady=8)

        clear_btn = ctk.CTkButton(
            action_box,
            text="Clear Cart",
            fg_color="#B03030",
            hover_color="#8B2323",
            command=self.clear_cart,
        )
        clear_btn.pack(fill="x", padx=8, pady=(4, 8))

        logout_btn = ctk.CTkButton(
            self.right_frame,
            text="Logout",
            fg_color="#4A4A4A",
            hover_color="#2F2F2F",
            command=self.controller.show_login,
        )
        logout_btn.pack(fill="x", padx=20, pady=(0, 14))

        self.barcode_entry.focus()

    def _find_cart_item(self, product_id):
        for item in self.cart:
            if item["product_id"] == product_id:
                return item
        return None

    def _selected_product_id(self):
        selection = self.cart_table.selection()
        if not selection:
            return None
        values = self.cart_table.item(selection[0], "values")
        if not values:
            return None
        return values[0]

    def _validate_add_stock(self, product, quantity_to_add):
        product_id = product["barcode_id"]
        stock = float(product.get("stock", 0.0))
        cart_item = self._find_cart_item(product_id)
        in_cart_qty = float(cart_item["qty"]) if cart_item else 0.0
        if in_cart_qty + quantity_to_add > stock:
            messagebox.showerror(
                "Insufficient Stock",
                f"Only {stock:.2f} available for {product['name']}.",
            )
            return False
        return True

    def _parse_add_inputs(self):
        qty_text = self.add_qty_entry.get().strip() or "1"
        discount_text = self.add_discount_entry.get().strip() or "0"

        try:
            qty = float(qty_text)
            discount = float(discount_text)
        except ValueError:
            messagebox.showerror("Invalid Value", "Add quantity and discount must be numeric.")
            return None, None

        if qty <= 0:
            messagebox.showerror("Invalid Value", "Add quantity must be greater than zero.")
            return None, None
        if discount < 0:
            messagebox.showerror("Invalid Value", "Item discount cannot be negative.")
            return None, None

        return qty, discount

    def _add_product_to_cart(self, product, qty, discount):
        if discount > float(product["sell_price"]):
            messagebox.showerror("Invalid Value", "Item discount cannot exceed unit price.")
            return

        if not self._validate_add_stock(product, qty):
            return

        product_id = product["barcode_id"]
        existing = self._find_cart_item(product_id)

        if existing:
            existing["qty"] += qty
            existing["discount"] = discount
        else:
            self.cart.append(
                {
                    "product_id": product_id,
                    "name": product["name"],
                    "qty": qty,
                    "price": float(product["sell_price"]),
                    "discount": discount,
                }
            )

        self.current_item_id = product_id
        self.refresh_cart_table()

    def add_to_cart_from_barcode(self, event=None):
        barcode = self.barcode_entry.get().strip()
        self.barcode_entry.delete(0, "end")

        if not barcode:
            return

        product = queries.get_product(barcode)
        if not product:
            messagebox.showerror("Not Found", "Item not found in database.")
            return

        qty, discount = self._parse_add_inputs()
        if qty is None:
            return

        self._add_product_to_cart(product, qty, discount)

    def search_products(self):
        search_text = self.search_entry.get().strip()
        if not search_text:
            return

        results = queries.search_products_by_name(search_text, limit=20)
        self.product_search_map = {}

        if not results:
            self.search_dropdown.configure(values=["No results"])
            self.search_var.set("No results")
            return

        labels = []
        for product in results:
            label = (
                f"{product['barcode_id']} | {product['name']} | "
                f"Rs. {float(product['sell_price']):.2f} | Stock {float(product['stock']):.2f}"
            )
            labels.append(label)
            self.product_search_map[label] = product

        self.search_dropdown.configure(values=labels)
        self.search_var.set(labels[0])

    def add_selected_search_result(self):
        selected = self.search_var.get()
        product = self.product_search_map.get(selected)
        if not product:
            messagebox.showwarning("Select Item", "Search and select a valid item first.")
            return

        qty, discount = self._parse_add_inputs()
        if qty is None:
            return

        self._add_product_to_cart(product, qty, discount)

    def _resolve_current_item(self):
        if self.current_item_id:
            current = self._find_cart_item(self.current_item_id)
            if current:
                return current

        selected = self._selected_cart_item()
        if selected:
            self.current_item_id = selected["product_id"]
            return selected

        if self.cart:
            self.current_item_id = self.cart[-1]["product_id"]
            return self.cart[-1]
        return None

    def _sync_quick_editor(self):
        item = self._resolve_current_item()
        if not item:
            self.current_item_var.set("Current item: Auto")
            self.quick_qty_entry.delete(0, "end")
            self.quick_discount_entry.delete(0, "end")
            return

        self.current_item_var.set(f"Current item: {item['name']}")
        self.quick_qty_entry.delete(0, "end")
        self.quick_qty_entry.insert(0, f"{float(item['qty']):.2f}")
        self.quick_discount_entry.delete(0, "end")
        self.quick_discount_entry.insert(0, f"{float(item['discount']):.2f}")

    def on_cart_selection_change(self, event=None):
        item = self._selected_cart_item()
        if not item:
            return
        self.current_item_id = item["product_id"]
        self._sync_quick_editor()

    def _selected_cart_item(self):
        product_id = self._selected_product_id()
        if not product_id:
            return None
        return self._find_cart_item(product_id)

    def increase_selected_qty(self):
        item = self._resolve_current_item()
        if not item:
            messagebox.showwarning("No Items", "Add an item to cart first.")
            return

        product = queries.get_product(item["product_id"])
        if not product:
            messagebox.showerror("Error", "Product no longer exists.")
            return

        if not self._validate_add_stock(product, 1.0):
            return

        item["qty"] += 1.0
        self.current_item_id = item["product_id"]
        self.refresh_cart_table()

    def decrease_selected_qty(self):
        item = self._resolve_current_item()
        if not item:
            messagebox.showwarning("No Items", "Add an item to cart first.")
            return

        item["qty"] -= 1.0
        if item["qty"] <= 0:
            self.cart = [x for x in self.cart if x["product_id"] != item["product_id"]]
            self.current_item_id = None
        self.refresh_cart_table()

    def remove_selected_item(self):
        item = self._resolve_current_item()
        if not item:
            messagebox.showwarning("No Items", "Add an item to cart first.")
            return

        self.cart = [x for x in self.cart if x["product_id"] != item["product_id"]]
        self.current_item_id = None
        self.refresh_cart_table()

    def apply_line_discount(self):
        item = self._resolve_current_item()
        if not item:
            messagebox.showwarning("No Items", "Add an item to cart first.")
            return

        discount_text = self.line_discount_entry.get().strip() or "0"
        try:
            discount = float(discount_text)
        except ValueError:
            messagebox.showerror("Invalid Value", "Line discount must be numeric.")
            return

        if discount < 0:
            messagebox.showerror("Invalid Value", "Line discount cannot be negative.")
            return
        if discount > item["price"]:
            messagebox.showerror("Invalid Value", "Line discount cannot exceed unit price.")
            return

        item["discount"] = discount
        self.current_item_id = item["product_id"]
        self.refresh_cart_table()

    def apply_quick_item_edit(self):
        item = self._resolve_current_item()
        if not item:
            messagebox.showwarning("No Items", "Add an item to cart first.")
            return

        qty_text = self.quick_qty_entry.get().strip()
        discount_text = self.quick_discount_entry.get().strip()
        try:
            qty = float(qty_text)
            discount = float(discount_text)
        except ValueError:
            messagebox.showerror("Invalid Value", "Quantity and discount must be numeric.")
            return

        if qty <= 0:
            messagebox.showerror("Invalid Value", "Quantity must be greater than zero.")
            return
        if discount < 0:
            messagebox.showerror("Invalid Value", "Discount cannot be negative.")
            return
        if discount > item["price"]:
            messagebox.showerror("Invalid Value", "Discount cannot exceed unit price.")
            return

        product = queries.get_product(item["product_id"])
        if not product:
            messagebox.showerror("Error", "Product no longer exists.")
            return

        other_qty = sum(
            float(x["qty"])
            for x in self.cart
            if x["product_id"] == item["product_id"] and x is not item
        )
        if other_qty + qty > float(product.get("stock", 0.0)):
            messagebox.showerror(
                "Insufficient Stock",
                f"Only {float(product.get('stock', 0.0)):.2f} available for {product['name']}",
            )
            return

        item["qty"] = qty
        item["discount"] = discount
        self.current_item_id = item["product_id"]
        self.refresh_cart_table()

    def remove_current_item(self):
        self.remove_selected_item()

    def _calculate_global_discount(self, subtotal_after_line_discount):
        discount_text = self.global_discount_entry.get().strip()
        if not discount_text:
            return 0.0

        try:
            discount_value = float(discount_text)
        except ValueError:
            messagebox.showerror("Invalid Value", "Global discount must be numeric.")
            return 0.0

        if discount_value < 0:
            messagebox.showerror("Invalid Value", "Global discount cannot be negative.")
            return 0.0

        if self.discount_mode.get() == "PERCENT":
            if discount_value > 100:
                messagebox.showerror("Invalid Value", "Percent discount cannot exceed 100.")
                return 0.0
            return subtotal_after_line_discount * (discount_value / 100.0)

        return discount_value

    def refresh_cart_table(self):
        selected_product_id = self.current_item_id
        for row in self.cart_table.get_children():
            self.cart_table.delete(row)

        subtotal = 0.0
        line_discount_total = 0.0

        for item in self.cart:
            unit_net = max(0.0, float(item["price"]) - float(item["discount"]))
            row_total = round(float(item["qty"]) * unit_net, 2)
            item_subtotal = float(item["qty"]) * float(item["price"])
            item_line_discount = float(item["qty"]) * float(item["discount"])

            subtotal += item_subtotal
            line_discount_total += item_line_discount

            self.cart_table.insert(
                "",
                "end",
                values=(
                    item["product_id"],
                    item["name"],
                    f"{item['qty']:.2f}",
                    f"{item['price']:.2f}",
                    f"{item['discount']:.2f}",
                    f"{row_total:.2f}",
                ),
            )

        for row in self.cart_table.get_children():
            values = self.cart_table.item(row, "values")
            if values and values[0] == selected_product_id:
                self.cart_table.selection_set(row)
                self.cart_table.focus(row)
                break

        subtotal_after_line = max(0.0, subtotal - line_discount_total)
        global_discount = self._calculate_global_discount(subtotal_after_line)
        global_discount = min(global_discount, subtotal_after_line)
        total = max(0.0, subtotal_after_line - global_discount)

        self.current_subtotal = round(subtotal, 2)
        self.current_line_discount = round(line_discount_total, 2)
        self.current_global_discount = round(global_discount, 2)
        self.current_total = round(total, 2)

        self.subtotal_var.set(f"Subtotal: Rs. {self.current_subtotal:.2f}")
        self.line_discount_var.set(f"Line Discounts: Rs. {self.current_line_discount:.2f}")
        self.global_discount_var.set(f"Global Discount: Rs. {self.current_global_discount:.2f}")
        self.total_var.set(f"Total: Rs. {self.current_total:.2f}")
        self._sync_quick_editor()

    def clear_cart(self):
        self.cart = []
        self.active_held_sale_id = None
        self.current_item_id = None
        self.refresh_cart_table()

    def _resolve_customer_for_credit(self, payment_mode):
        if payment_mode == "PAID":
            return True, None

        name = self.customer_name_entry.get().strip()
        contact = self.customer_contact_entry.get().strip()

        if not name:
            messagebox.showwarning("Customer Required", "Customer name is required for credit sales.")
            return False, None

        ok, data = queries.create_or_get_customer(name, contact)
        if not ok:
            messagebox.showerror("Customer Error", data.get("error", "Could not save customer."))
            return False, None

        return True, data["id"]

    def _resolve_paid_amount(self, payment_mode):
        if payment_mode == "PAID":
            return self.current_total
        if payment_mode == "UNPAID":
            return 0.0

        paid_text = self.paid_amount_entry.get().strip()
        if not paid_text:
            messagebox.showwarning("Paid Amount", "Enter paid amount for partial payment.")
            return None

        try:
            return float(paid_text)
        except ValueError:
            messagebox.showerror("Invalid Value", "Paid amount must be numeric.")
            return None

    def hold_current_bill(self):
        if not self.cart:
            messagebox.showwarning("Empty Cart", "Cannot hold an empty cart.")
            return
        if self.active_held_sale_id is not None:
            messagebox.showwarning("Held Bill Active", "Complete or clear the recalled held bill first.")
            return

        success, result = queries.hold_sale(
            cashier_id=self.user_data["id"],
            cart_items=self.cart,
            subtotal=self.current_subtotal,
            global_discount=self.current_global_discount,
            total_amount=self.current_total,
        )
        if success:
            messagebox.showinfo("Held", f"Bill held successfully. Hold ID: {result}")
            self.clear_cart()
        else:
            messagebox.showerror("Hold Failed", result)

    def recall_held_bill(self):
        held = queries.list_held_sales(cashier_id=self.user_data["id"])
        if not held:
            messagebox.showinfo("No Held Bills", "No held bills found for this cashier.")
            return

        lines = [f"{entry['id']} -> Rs. {float(entry['total']):.2f} ({entry['timestamp']})" for entry in held]
        prompt = "Enter Hold ID to recall:\n\n" + "\n".join(lines)
        selected_id = simpledialog.askinteger("Recall Held Bill", prompt)
        if selected_id is None:
            return

        success, payload = queries.recall_held_sale(selected_id)
        if not success:
            messagebox.showerror("Recall Failed", payload.get("error", "Could not recall bill."))
            return

        recalled_items = []
        for item in payload["items"]:
            recalled_items.append(
                {
                    "product_id": item["product_id"],
                    "name": item.get("name") or item["product_id"],
                    "qty": float(item["qty"]),
                    "price": float(item["sold_at_price"]),
                    "discount": float(item.get("item_discount") or 0.0),
                }
            )

        self.cart = recalled_items
        self.active_held_sale_id = int(selected_id)
        self.current_item_id = recalled_items[0]["product_id"] if recalled_items else None
        self.global_discount_entry.delete(0, "end")
        self.global_discount_entry.insert(0, f"{float(payload['sale']['discount']):.2f}")
        self.discount_mode.set("AMOUNT")
        self.payment_mode.set("PAID")
        self.paid_amount_entry.delete(0, "end")
        self.refresh_cart_table()
        messagebox.showinfo("Recalled", f"Hold ID {selected_id} loaded. You can now edit items, qty, and discounts.")

    def process_checkout(self):
        if not self.cart:
            messagebox.showwarning("Empty Cart", "Cannot checkout an empty cart.")
            return

        payment_mode = self.payment_mode.get().strip().upper()
        if payment_mode not in {"PAID", "PARTIAL", "UNPAID"}:
            messagebox.showerror("Payment Mode", "Select a valid payment mode.")
            return

        ok, customer_id = self._resolve_customer_for_credit(payment_mode)
        if not ok:
            return

        paid_amount = self._resolve_paid_amount(payment_mode)
        if paid_amount is None:
            return

        if self.active_held_sale_id is not None:
            sale_id = int(self.active_held_sale_id)
            success, result = queries.complete_held_sale(
                sale_id=self.active_held_sale_id,
                customer_id=customer_id,
                paid_amount=paid_amount,
                payment_status=payment_mode,
                cart_items=self.cart,
                subtotal=self.current_subtotal,
                global_discount=self.current_global_discount,
                total_amount=self.current_total,
            )
            if success:
                receipt_msg = self._generate_receipt_feedback(sale_id)
                messagebox.showinfo("Success", f"Held bill completed.\n{result}\n\n{receipt_msg}")
                self.clear_cart()
            else:
                messagebox.showerror("Checkout Failed", result)
            return

        success, result = queries.process_sale(
            cashier_id=self.user_data["id"],
            customer_id=customer_id,
            cart_items=self.cart,
            subtotal=self.current_subtotal,
            global_discount=self.current_global_discount,
            total_amount=self.current_total,
            status="COMPLETED",
            paid_amount=paid_amount,
            payment_status=payment_mode,
        )

        if success:
            sale_id = int(result)
            receipt_msg = self._generate_receipt_feedback(sale_id)
            messagebox.showinfo("Success", f"Sale complete.\nInvoice ID: {result}\n\n{receipt_msg}")
            self.clear_cart()
        else:
            messagebox.showerror("Checkout Failed", result)

    def _generate_receipt_feedback(self, sale_id):
        receipt_result = generate_and_print_receipt(int(sale_id))
        if receipt_result.get("ok"):
            if receipt_result.get("mode") == "file":
                return (
                    f"Receipt saved: {receipt_result.get('path')}\n"
                    f"Print fallback reason: {receipt_result.get('detail')}"
                )
            return "Receipt printed to ESC/POS device."
        return f"Receipt generation failed: {receipt_result.get('detail')}"
