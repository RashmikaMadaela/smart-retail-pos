# Developer Guide

## Environment Setup

1. Create venv and activate.
2. Install dependencies:

```bash
venv\Scripts\python.exe -m pip install -r requirements.txt
```

3. Initialize database schema:

```bash
venv\Scripts\python.exe database\db_setup.py
```

4. Run application:

```bash
venv\Scripts\python.exe main.py
```

## Testing

Run tests:

```bash
venv\Scripts\python.exe -m pytest -q
```

Optional smoke script:

```bash
venv\Scripts\python.exe test_logic.py
```

## Key Paths

- UI: ui/
- Data logic: database/queries.py
- Schema setup: database/db_setup.py
- Printer and label integration: hardware/printer.py
- Tests: tests/

## Data and Transaction Principles

- Use helpers in queries.py for all core business writes.
- Keep inventory stock movement in transactional blocks.
- Never update customer/supplier balances outside paired sale/payment logic.
- Preserve sold_at_price and per-line discount as immutable historical values.

## Schema Evolution

db_setup.py is migration-safe for additive changes.

Guidelines:

1. Add new table with CREATE TABLE IF NOT EXISTS.
2. Add new columns via _ensure_column for backward compatibility.
3. Keep defaults for new fields to avoid null behavior regressions.
4. Re-run db_setup.py after schema changes.

## Hardware Integration

### Receipt Printing

- Primary: ESC/POS via python-escpos
- Fallback: text output under receipts/

### Sticker Printing

- Generate Code128 sticker image via python-barcode and Pillow.
- Print image via ESC/POS when available.
- Fallback to image or text file under receipts/stickers/.

ESC/POS environment variables:

- POS_PRINTER_VENDOR_ID
- POS_PRINTER_PRODUCT_ID

## Coding and Validation Conventions

- Validate user inputs at both UI and query layers.
- Keep query-layer validation authoritative.
- Run compile and tests before committing.
- Use small scoped commits with feature phase tags.

## Suggested Git Workflow

1. Implement one functional checkpoint.
2. Run tests and sanity checks.
3. Commit with scoped message.
4. Push to main after validation.

Example commit messages:

- feat(phase-N4): add inventory barcode sticker generation and print flow
- test(phase-N5): add supplier surcharge and sticker fallback regressions

## Troubleshooting

### pytest not found

Use module form through venv python:

```bash
venv\Scripts\python.exe -m pytest -q
```

### Printer not available

- Verify vendor/product IDs.
- Verify USB access permissions.
- Confirm fallback output is generated in receipts/.

### Stock mismatch after testing

- Reinitialize test database for isolated tests.
- Confirm sale completion status before expecting stock deduction.

### Supplier payment seems unchanged

- Ensure correct supplier and batch are selected.
- Confirm amount is greater than zero and batch has balance due.
