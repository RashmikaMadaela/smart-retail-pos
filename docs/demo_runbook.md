# Demo Runbook - Smart Retail POS Phase 1 MVP

## Pre-Demo Setup

1. Install dependencies:

```bash
e:/Github/smart-retail-pos/venv/Scripts/python.exe -m pip install -r requirements.txt
```

2. Initialize database:

```bash
e:/Github/smart-retail-pos/venv/Scripts/python.exe database/db_setup.py
```

3. Launch app:

```bash
e:/Github/smart-retail-pos/venv/Scripts/python.exe main.py
```

## Demo Flow 1 - Cashier Billing

1. Log in as `admin`/`admin123` and click `Open Billing`.
2. Add products by barcode and by name search.
3. Apply line discount to a selected item.
4. Apply global discount (amount or percent).
5. Show hold bill and recall bill.
6. Complete checkout with payment mode `PAID`.
7. Confirm receipt behavior:
- ESC/POS if printer IDs are configured.
- Fallback text receipt at `receipts/receipt_<id>.txt`.

## Demo Flow 2 - Credit Ledger

1. In billing, select `PARTIAL` or `UNPAID` payment mode.
2. Enter customer name/contact and checkout.
3. Open admin dashboard and show outstanding reflected in customer ledger queries.
4. Run a settlement using data-layer helper if needed:

```bash
e:/Github/smart-retail-pos/venv/Scripts/python.exe -c "from database import queries; print(queries.record_customer_payment(1, 50))"
```

## Demo Flow 3 - Admin Operations

1. Inventory tab:
- Add item (barcoded and blank barcode SYS item).
- Update sell/buy/min stock fields.
- Set stock quantity and verify low-stock panel updates.
2. Users tab:
- Create a `Cashier` account.
3. Expenses tab:
- Add categorized expense entry.
4. Dashboard tab:
- Show Gross Sales, COGS, Expenses, Net Profit.
- Show Top Sellers, Dead Stock, and Peak Hours tables.

## Validation Commands

1. Run tests:

```bash
e:/Github/smart-retail-pos/venv/Scripts/python.exe -m pytest -q
```

2. Optional smoke script:

```bash
e:/Github/smart-retail-pos/venv/Scripts/python.exe test_logic.py
```

## Known Limits (Per PRD)

- No cloud sync.
- No Docker/CI-CD deployment.
- No AI/NLQ integration.
- No WhatsApp receipts.
