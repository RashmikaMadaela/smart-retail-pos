# User Operations Guide

## Roles

### Admin

- Access to Dashboard, Inventory, Suppliers, Users, Customers, and Expenses
- Can manage prices, stock, supplier payable operations, and analytics

### Cashier

- Access to Billing workflows
- Can create sales, hold/recall, and process checkout

## Login

1. Launch app.
2. Enter username and password.
3. On success, system routes by role.

## Billing Workflow

1. Add item by barcode or search by name.
2. Adjust quantity and line discount as needed.
3. Apply global discount if required.
4. Choose payment method:
- CASH
- CARD
5. Enter paid amount to preview:
- Change due for over-payment handling is prevented by validation.
- Balance due for partial/unpaid handling.
6. If unpaid or partial, provide customer details.
7. Checkout.
8. Receipt is printed or saved as fallback.

## Hold and Recall

1. Build bill and click hold.
2. Open held list and recall bill.
3. Continue edits and complete checkout.

## Quick Add Missing Product (Billing)

1. During billing, if product is missing, open quick add.
2. Enter minimum required fields.
3. Save and continue billing without leaving cashier flow.

## Inventory Management (Admin)

1. Open Inventory tab.
2. Add or update product data.
3. Update stock directly with Set Stock.
4. Configure default discount percent.
5. Configure card surcharge settings:
- Card Fee On: 0 or 1
- Card Fee Percent
6. Delete products when needed.

## Barcode Sticker Printing (Admin)

1. Select product in Inventory table or enter product ID.
2. Enter number of sticker copies.
3. Click Print Sticker.
4. Output behavior:
- Printer available: sticker print sent to ESC/POS.
- Printer unavailable: fallback file saved to receipts/stickers/.

## Supplier Operations (Admin)

### Add Supplier

1. Go to Suppliers tab.
2. Enter name, contact, optional opening balance.
3. Click Add Supplier.

### Receive Stock Batch

1. Select supplier from dropdown.
2. Enter optional batch reference and initial paid amount.
3. Add one or more line items with product ID, qty, unit cost, and discount percent.
4. Click Receive Stock.
5. Verify stock updates in Inventory.

### Settle Supplier Batch

1. Select supplier and batch from Supplier Batches table.
2. Enter pay amount, method, and optional note.
3. Click Settle Selected Batch.
4. Verify updated batch balance and payment records.

## Customer Ledger (Admin)

1. Open Customers tab.
2. Search customer by name/contact.
3. Select customer to view linked sale ledger.
4. Enter payment amount and click Record Payment.

## Users (Admin)

1. Open Users tab.
2. Enter username, password, and role.
3. Click Create User.

## Expenses (Admin)

1. Open Expenses tab.
2. Enter description, amount, category.
3. Click Add Expense.

## Dashboard (Admin)

- KPI cards: Gross Sales, COGS, Expenses, Net Profit
- Analytics tables: Top Sellers, Low Stock Alerts, Dead Stock, Peak Hours

## Common Operational Tips

- Use consistent product IDs when receiving supplier batches.
- Keep CARD surcharge only on products where policy applies.
- For busy cashier hours, prefer barcode scan + keyboard shortcuts style entry.
- Use hold/recall for interrupted counter scenarios.
