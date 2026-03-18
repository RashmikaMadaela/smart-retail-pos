# Smart Retail POS and Local ERP

Offline-first desktop retail POS application built with Python, CustomTkinter, and SQLite.

## What This System Covers

- Role-based login for Admin and Cashier
- Inventory management (barcode and non-barcoded items)
- POS billing with line discount, global discount, hold/recall, and mixed payment handling
- Card surcharge for configured products
- Customer credit ledger with partial and unpaid flows
- Supplier batch receiving and manual batch settlement
- Expense tracking
- Admin analytics dashboard (gross, COGS, expenses, net, top sellers, dead stock, peak hours)
- Receipt printing (ESC/POS) with file fallback
- Product barcode sticker generation/printing with fallback

## Out of Scope

- Cloud sync
- Docker and CI/CD deployment
- AI or natural language query integration
- WhatsApp receipt integration

## Technology Stack

- Python 3.10+
- CustomTkinter
- SQLite
- python-escpos
- Pillow
- python-barcode
- pytest

## Quick Start

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
venv\Scripts\python.exe -m pip install -r requirements.txt
```

3. Initialize the database:

```bash
venv\Scripts\python.exe database\db_setup.py
```

4. Run the app:

```bash
venv\Scripts\python.exe main.py
```

Default seeded admin credentials:

- Username: admin
- Password: admin123

## Testing

Run automated tests:

```bash
venv\Scripts\python.exe -m pytest -q
```

Optional smoke script:

```bash
venv\Scripts\python.exe test_logic.py
```

## Printer and Label Settings

Optional ESC/POS USB environment variables:

- POS_PRINTER_VENDOR_ID (example: 0x04b8)
- POS_PRINTER_PRODUCT_ID (example: 0x0202)

If printer settings are not provided or printing fails:

- Receipts are saved to receipts/receipt_<sale_id>.txt
- Sticker output is saved to receipts/stickers/

## Documentation Map

- Product overview and architecture: docs/system_overview.md
- End-user workflow guide: docs/user_operations_guide.md
- Developer setup and maintenance: docs/developer_guide.md
- Demo script and walkthrough: docs/demo_runbook.md
- PRD acceptance checklist: docs/prd_acceptance_checklist.md

## Repository Structure

```text
main.py
database/
hardware/
ui/
utils/
tests/
docs/
receipts/
```
