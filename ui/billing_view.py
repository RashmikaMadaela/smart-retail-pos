import customtkinter as ctk
from tkinter import ttk, messagebox
from database import queries

class BillingView(ctk.CTkFrame):
    def __init__(self, parent, controller, user_data):
        super().__init__(parent)
        self.controller = controller
        self.user_data = user_data # Store the logged-in user's data (like ID and Role)
        
        self.cart = [] # This will hold the items currently being bought
        
        self.setup_ui()

    def setup_ui(self):
        # --- Left Panel: Cart Table ---
        self.left_frame = ctk.CTkFrame(self)
        self.left_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        # Barcode Input Area
        self.barcode_entry = ctk.CTkEntry(self.left_frame, placeholder_text="Scan Barcode or Type SYS- ID...", height=40, font=("Arial", 16))
        self.barcode_entry.pack(fill="x", padx=10, pady=10)
        self.barcode_entry.bind("<Return>", self.add_to_cart) # Triggers when scanner hits Enter
        self.barcode_entry.focus() # Automatically put the cursor here

        # The Cart Table (Using standard ttk Treeview for tabular data)
        columns = ("id", "name", "qty", "price", "total")
        self.cart_table = ttk.Treeview(self.left_frame, columns=columns, show="headings", height=20)
        self.cart_table.heading("id", text="Item ID")
        self.cart_table.heading("name", text="Item Name")
        self.cart_table.heading("qty", text="Qty")
        self.cart_table.heading("price", text="Unit Price")
        self.cart_table.heading("total", text="Total")
        
        self.cart_table.column("id", width=100)
        self.cart_table.column("name", width=300)
        self.cart_table.column("qty", width=50)
        self.cart_table.column("price", width=100)
        self.cart_table.column("total", width=100)
        self.cart_table.pack(fill="both", expand=True, padx=10, pady=10)

        # --- Right Panel: Totals & Checkout ---
        self.right_frame = ctk.CTkFrame(self, width=300)
        self.right_frame.pack(side="right", fill="y", padx=10, pady=10)
        self.right_frame.pack_propagate(False) # Keep the frame at 300px wide

        ctk.CTkLabel(self.right_frame, text=f"Cashier: {self.user_data['username']}", font=("Arial", 16, "bold")).pack(pady=20)

        # Totals Display
        self.subtotal_var = ctk.StringVar(value="Subtotal: Rs. 0.00")
        self.total_var = ctk.StringVar(value="Total: Rs. 0.00")

        ctk.CTkLabel(self.right_frame, textvariable=self.subtotal_var, font=("Arial", 18)).pack(pady=10)
        ctk.CTkLabel(self.right_frame, textvariable=self.total_var, font=("Arial", 24, "bold"), text_color="green").pack(pady=20)

        # Action Buttons
        self.checkout_btn = ctk.CTkButton(self.right_frame, text="CHECKOUT", height=60, font=("Arial", 20, "bold"), fg_color="green", hover_color="darkgreen", command=self.process_checkout)
        self.checkout_btn.pack(side="bottom", fill="x", padx=20, pady=20)
        
        self.clear_btn = ctk.CTkButton(self.right_frame, text="Clear Cart", height=40, fg_color="red", hover_color="darkred", command=self.clear_cart)
        self.clear_btn.pack(side="bottom", fill="x", padx=20, pady=10)

    def add_to_cart(self, event=None):
        barcode = self.barcode_entry.get().strip()
        self.barcode_entry.delete(0, 'end') # Clear the entry box fast for the next scan

        if not barcode:
            return

        product = queries.get_product(barcode)
        
        if product:
            # Check if item is already in cart, if so, just increase qty
            found = False
            for item in self.cart:
                if item['product_id'] == barcode:
                    item['qty'] += 1.0
                    item['total'] = item['qty'] * item['price']
                    found = True
                    break
            
            if not found:
                self.cart.append({
                    'product_id': barcode,
                    'name': product['name'],
                    'qty': 1.0,
                    'price': product['sell_price'],
                    'discount': 0.0,
                    'total': product['sell_price']
                })
            
            self.refresh_cart_table()
        else:
            messagebox.showerror("Not Found", "Item not found in database.")

    def refresh_cart_table(self):
        # Clear existing rows
        for row in self.cart_table.get_children():
            self.cart_table.delete(row)
            
        subtotal = 0.0
        
        # Insert updated rows
        for item in self.cart:
            subtotal += item['total']
            self.cart_table.insert("", "end", values=(item['product_id'], item['name'], item['qty'], item['price'], item['total']))
            
        # Update Labels (Formatting as LKR)
        self.subtotal_var.set(f"Subtotal: Rs. {subtotal:.2f}")
        self.total_var.set(f"Total: Rs. {subtotal:.2f}") # We'll add discounts later

    def clear_cart(self):
        self.cart = []
        self.refresh_cart_table()

    def process_checkout(self):
        if not self.cart:
            messagebox.showwarning("Empty Cart", "Cannot checkout an empty cart.")
            return
            
        # Calculate final numbers
        subtotal = sum(item['total'] for item in self.cart)
        
        # Send to database
        success, result = queries.process_sale(
            cashier_id=self.user_data['id'],
            customer_id=None,
            cart_items=self.cart,
            subtotal=subtotal,
            global_discount=0.0,
            total_amount=subtotal
        )
        
        if success:
            messagebox.showinfo("Success", f"Sale Complete!\nInvoice ID: {result}")
            self.clear_cart()
            # Here is where we will eventually call the receipt printer!
        else:
            messagebox.showerror("Database Error", f"Sale failed: {result}")