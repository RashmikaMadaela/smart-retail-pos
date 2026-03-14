# Smart Retail POS & Local ERP

Offline-first retail POS application built with Python, CustomTkinter, and SQLite.

## Phase 1 Scope (PRD-Aligned)

- Role-based access control (Admin, Cashier)
- Inventory management with low stock alerts
- POS billing (barcode and item search)
- Discounts (line and global)
- Hold/recall bills
- Customer credit ledger (unpaid/partial/settlement)
- Expense logging
- Admin analytics (gross/net profit, top sellers, dead stock, peak hours)
- Receipt generation (ESC/POS with fallback output)

Out of scope in Phase 1:

- Cloud sync
- Docker and CI/CD deployment
- AI or natural language querying
- WhatsApp receipt integration

## Tech Stack

- Python 3.10+
- CustomTkinter UI
- SQLite database
- `python-escpos` for thermal printer support

## Project Structure

```text
main.py
database/
hardware/
ui/
utils/
docs/
```

## Local Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Initialize database:

```bash
python database/db_setup.py
```

## Run Application

```bash
python main.py
```

Default seeded admin credentials:

- Username: `admin`
- Password: `admin123`

## Run Smoke Test Script

```bash
python test_logic.py
```

## Planned Automated Test Command

```bash
pytest -q
```

## RBAC Access Matrix (Target)

- Admin:
	- Inventory CRUD, buy/sell prices, stock updates
	- User management
	- Expense logging
	- Financial analytics and net profit
	- Full historical views
- Cashier:
	- Billing screen
	- Hold and recall bills
	- Process payments
	- Cannot view buy prices or net profit analytics

## Receipt Support

- Preferred: ESC/POS thermal printer (`python-escpos`)
- Fallback: printable file output when printer is unavailable

ESC/POS environment variables (optional):

- `POS_PRINTER_VENDOR_ID` (example: `0x04b8`)
- `POS_PRINTER_PRODUCT_ID` (example: `0x0202`)

## Implementation Workflow

Work is executed in phase steps A-H. After each completed phase step:

1. Validate phase-specific checks.
2. Commit with a scoped message such as `feat(phase-B): expand data layer queries`.
3. Push to remote.

See `docs/prd_acceptance_checklist.md` for a detailed acceptance list.

## Demo Guide

Use `docs/demo_runbook.md` for step-by-step cashier/admin demo scenarios and validation commands.
