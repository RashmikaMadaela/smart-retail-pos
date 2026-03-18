# System Overview

## Purpose

Smart Retail POS is an offline-first desktop billing and mini-ERP application for small retail stores. It supports cashier billing speed and admin control for inventory, supplier payables, customer credit, and daily financial visibility.

## Core Capabilities

- Login and role-based access (Admin, Cashier)
- Inventory CRUD with low-stock monitoring
- Billing with line/global discounts, hold/recall, and customer credit
- Payment handling with CASH or CARD
- Product-level card surcharge rules
- Supplier batch receiving and partial batch settlement
- Expense tracking
- Analytics dashboard and operational tables
- Receipt output and barcode sticker output with robust fallback behavior

## Architecture

The project follows a simple layered architecture.

1. UI Layer
- Path: ui/
- Technology: CustomTkinter + ttk Treeview
- Responsibility: user interactions, validation at form level, and rendering

2. Business/Data Layer
- Path: database/queries.py
- Responsibility: validation, transactional logic, stock movement, financial updates

3. Persistence Layer
- Path: database/db_setup.py, database/pos.db
- Technology: SQLite
- Responsibility: schema management, migration-safe column adds, seeded admin

4. Hardware Integration Layer
- Path: hardware/printer.py
- Responsibility: ESC/POS print integration and file fallback output

## Main Modules

### Authentication

- verify_login checks username/password hash and role.
- Admin routes to dashboard; Cashier routes to billing.

### Billing

- Add by barcode or search.
- Editable quantity and line discount.
- Global discount support.
- Hold/recall for interrupted transactions.
- Paid amount preview for change due and balance due.
- Customer binding required for unpaid or partial sales.

### Inventory

- Product fields: barcode_id, name, buy_price, sell_price, stock, min_stock
- Extended fields: default_discount_pct, card_surcharge_enabled, card_surcharge_pct
- Supports system-generated product IDs for non-barcoded items.

### Supplier Ledger

- Supplier profile creation.
- Batch receive with line items and line discount.
- Optional initial payment at receiving.
- Manual batch settlement with payment method and note.
- Outstanding payable auto-updates per settlement.

### Customer Ledger

- Tracks customer outstanding balances.
- Supports payment application against open balances.
- Maintains sale-level paid and due values.

### Expenses and Analytics

- Expense capture with category.
- Dashboard includes gross sales, COGS, expenses, net profit.
- Table analytics include top sellers, low stock, dead stock, and peak hours.

## Database Tables

- users: system users and roles
- products: inventory and card surcharge configuration
- suppliers: supplier profile and outstanding
- supplier_batches: supplier invoice/header for received stock
- supplier_batch_items: line-level received products
- supplier_payments: settlement records
- customers: customer identities and outstanding
- sales: transaction header and payment state
- sale_items: immutable sold line details
- expenses: operational expenses

## Reliability and Fallback Strategy

1. Receipt print flow
- Try ESC/POS text printing.
- If unavailable/fails, save to receipts/receipt_<id>.txt.

2. Sticker print flow
- Try image generation and ESC/POS image printing.
- If image generation fails, save text fallback in receipts/stickers/.
- If ESC/POS image print fails, keep generated image in receipts/stickers/.

## Security and Operational Notes

- Passwords are stored as SHA-256 hashes.
- App is designed for single-site local usage.
- No network services or cloud dependency required for operation.
