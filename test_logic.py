from database import queries

def run_tests():
    print("--- 1. Testing Inventory Management ---")
    
    # Add a normal barcoded item
    success, barcode = queries.add_product("4792011001234", "Maliban Lemon Puff 200g", 120.0, 150.0, 50, 10)
    print(f"Added Barcoded Item: {success} ({barcode})")
    
    # Add a loose item (no barcode provided)
    success, sys_id1 = queries.add_product("", "White Rice (Nadu) 1kg", 180.0, 220.0, 100.5, 20)
    print(f"Added Loose Item 1: {success} ({sys_id1})")
    
    # Add another loose item to see if the auto-increment works
    success, sys_id2 = queries.add_product("", "Photocopy (A4 Black)", 5.0, 15.0, 500, 50)
    print(f"Added Loose Item 2: {success} ({sys_id2})")
    
    print("\n--- 2. Fetching Products ---")
    # Simulate scanning the barcode
    product = queries.get_product("4792011001234")
    if product:
        print(f"Scanned: {product['name']} - Current Stock: {product['stock']}")
        
    # Simulate clicking the "White Rice" button
    loose_product = queries.get_product(sys_id1)
    if loose_product:
         print(f"Selected: {loose_product['name']} - Current Stock: {loose_product['stock']}")


    print("\n--- 3. Testing Sales Processing ---")
    
    # Let's say a customer buys 2 packets of Lemon Puff and 1.5kg of Rice
    cart = [
        {'product_id': '4792011001234', 'qty': 2.0, 'price': 150.0, 'discount': 0.0},
        {'product_id': sys_id1, 'qty': 1.5, 'price': 220.0, 'discount': 0.0}
    ]
    
    # Math: (2 * 150) + (1.5 * 220) = 300 + 330 = 630
    subtotal = 630.0
    global_discount = 30.0 # Let's give them a 30 rupee discount
    final_total = 600.0
    
    # We use cashier_id 1 (the default Admin we created)
    success, sale_result = queries.process_sale(
        cashier_id=1, 
        customer_id=None, # None means a regular walk-in customer (no credit)
        cart_items=cart, 
        subtotal=subtotal, 
        global_discount=global_discount, 
        total_amount=final_total
    )
    
    if success:
        print(f"Sale Successful! Invoice ID: {sale_result}")
    else:
        print(f"Sale Failed: {sale_result}")

    print("\n--- 4. Verifying Stock Deductions ---")
    
    updated_puff = queries.get_product("4792011001234")
    updated_rice = queries.get_product(sys_id1)
    
    print(f"Lemon Puff Stock: {updated_puff['stock']} (Expected: 48.0)")
    print(f"White Rice Stock: {updated_rice['stock']} (Expected: 99.0)")

if __name__ == "__main__":
    run_tests()