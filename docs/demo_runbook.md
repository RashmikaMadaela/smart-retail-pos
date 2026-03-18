# Demo Runbook - Smart Retail POS

## Pre-Demo Setup

1. Install dependencies:

```bash
venv\Scripts\python.exe -m pip install -r requirements.txt
```

2. Initialize database:

```bash
venv\Scripts\python.exe database\db_setup.py
```

3. Launch application:

```bash
venv\Scripts\python.exe main.py
```

## Demo Flow 1 - Cashier Billing and Checkout

1. Log in with admin/admin123 and open Billing.
2. Add products via barcode input and product search.
3. Edit quantity and line discount from the current item panel.
4. Switch payment method between CASH and CARD.
5. Show surcharge auto-application for products marked with card surcharge.
6. Enter Paid Amount and show live Change or Balance Due preview.
7. Use Hold Bill and Recall Bill.
8. Complete checkout and show receipt behavior:
- ESC/POS print when configured and available.
- File fallback at receipts/receipt_<sale_id>.txt.

## Demo Flow 2 - Customer Credit and Settlement

1. In billing, complete a PARTIAL or UNPAID sale with customer details.
2. Open Admin > Customers and verify outstanding amount.
3. Record customer payment and verify ledger + outstanding update.

## Demo Flow 3 - Supplier Batch Receiving and Partial Settlement

1. Open Admin > Suppliers.
2. Add a supplier.
3. Add one or more batch lines with product ID, qty, unit cost, and discount percent.
4. Receive stock with optional initial payment.
5. Verify stock increase in Inventory table.
6. Select batch and settle a partial payment.
7. Verify batch balance, status, and supplier outstanding are updated.

## Demo Flow 4 - Inventory and Label Printing

1. Open Admin > Inventory.
2. Add or select a product.
3. Enter Copies and click Print Sticker.
4. Show output behavior:
- ESC/POS image print when configured and available.
- Fallback saved under receipts/stickers/.

## Demo Flow 5 - Admin Controls and Analytics

1. Admin > Users: create a Cashier account.
2. Admin > Expenses: add categorized expense.
3. Admin > Dashboard: verify KPI cards and labeled analytics tables.

## Validation Commands

1. Run tests:

```bash
venv\Scripts\python.exe -m pytest -q
```

2. Optional smoke script:

```bash
venv\Scripts\python.exe test_logic.py
```

## Known Limits

- No cloud sync.
- No Docker/CI-CD pipeline included.
- No AI/NLQ integration.
- No WhatsApp receipt integration.
