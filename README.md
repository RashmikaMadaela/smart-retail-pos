# Smart Retail POS (floreo POS)

Offline-first desktop retail POS & local ERP application. Modern TypeScript/Electron frontend with modular backend services and SQLite persistence.

## ✨ Features

- **Role-based Access**: Admin, Cashier, SuperAdmin roles with permission controls
- **Inventory Management**: Barcode & non-barcoded items with auto-ID generation (PS-10001 format)
- **POS Billing**: Line discounts, global discounts, card surcharges, hold/recall workflows
- **Payment Flexibility**: PAID / PARTIAL / UNPAID states with hold-to-completion logic
- **Customer Ledger**: FIFO credit tracking, partial settlement, payment history
- **Supplier Management**: Batch receiving, payment reconciliation, FIFO settlement
- **Expense Tracking**: Categorized expenses, date filtering
- **Analytics Dashboard**: Revenue, COGS, expenses, profit margins, top sellers
- **Receipt Printing**: PDF + TSPL thermal printer support with fallback
- **Barcode Labels**: PDF generation and TSPL label printing
- **Multi-language Support**: i18n ready (English, Urdu prepared)

## 🛠️ Tech Stack

**Frontend**
- React + TypeScript
- Electron (desktop framework)
- Tailwind CSS + shadcn/ui (components)
- Zustand (state management)
- i18next (localization)

**Backend**
- Node.js + TypeScript
- better-sqlite3 (database driver)
- Modular service architecture (auth, sales, catalog, ledger, etc.)

**Database**
- SQLite (`database/pos.db`)
- 10 tables: users, products, sales, customers, suppliers, expenses, supplier_batches, supplier_payments, supplier_batch_items, sale_items

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Development

1. **Install dependencies:**
   ```bash
   cd desktop-next
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```
   This opens Electron with hot-reload for both main and renderer processes.

3. **Run tests:**
   ```bash
   npm test        # Full suite (auth, products, sales, ledger, UI)
   ```

4. **Type checking:**
   ```bash
   npm run check
   ```

### Building for Production

```bash
cd desktop-next
npm run build     # Outputs to dist/
npm run package   # Creates distributable installer
```

## 📁 Project Structure

```
smart-retail-pos/
├── desktop-next/                    # Main TypeScript/Electron app
│   ├── backend/
│   │   ├── services/               # 9 modular business logic services
│   │   │   ├── authService.ts      # Login, role validation
│   │   │   ├── catalogService.ts   # Product management, auto-ID
│   │   │   ├── salesService.ts     # Sale processing, hold/complete
│   │   │   ├── ledgerService.ts    # Customer/supplier accounts
│   │   │   ├── expenseService.ts   # Expense tracking
│   │   │   ├── reportService.ts    # Analytics & summaries
│   │   │   ├── printService.ts     # PDF generation
│   │   │   ├── tsplPrinterService.ts  # Thermal label printing
│   │   │   └── inventoryAdminService.ts  # Bulk operations
│   │   ├── db/
│   │   │   └── sqlite.ts           # Database connection pool
│   │   └── types/                  # Shared TypeScript types
│   ├── renderer/
│   │   ├── src/
│   │   │   ├── features/          # Tab components (Billing, Inventory, etc.)
│   │   │   ├── store/             # Zustand stores (billing, UI state)
│   │   │   ├── lib/               # Utilities (IPC client, API hooks)
│   │   │   └── App.tsx            # Main app orchestrator
│   │   └── index.html
│   ├── electron/
│   │   ├── main/
│   │   │   ├── main.ts            # Electron main process
│   │   │   └── ipc.ts             # IPC handler registration
│   │   └── preload/
│   │       └── preload.ts         # IPC API bridge
│   ├── tests/
│   │   ├── auth.test.ts           # Login, roles, credentials
│   │   ├── products.test.ts       # Sys-ID, stock, oversell
│   │   └── parity-services.test.ts # Sales, ledger, payments
│   └── package.json
├── database/
│   ├── pos.db                     # SQLite database (auto-initialized)
│   ├── db_setup.py                # Schema reference (not used at runtime)
│   └── queries.py                 # Legacy reference
├── docs/                          # Documentation
├── .gitignore
└── README.md
```

### Key Services

**authService**: User login with SHA256 hashing, role-based access  
**catalogService**: Product CRUD, auto-ID generation (PS-10001 → PS-10002), search  
**salesService**: Transaction processing, hold/recall/void, stock deduction, payment tracking  
**ledgerService**: Customer/supplier account management, FIFO settlement, payment history  
**inventoryAdminService**: Bulk import/export, stock reset, data cleanup  
**reportService**: Financial summaries, analytics, export  

## 📊 Database Schema

10 tables with SQLite PRAGMA foreign_keys enabled:
- **users**: Authentication & roles (admin, cashier, superadmin)
- **products**: Catalog with barcode_id, buy/sell prices, stock, discounts
- **sales**: Transaction header with subtotal, total, payment status
- **sale_items**: Line items linked to sales
- **customers**: Accounts with total_outstanding balance
- **suppliers**: Vendor accounts with balances
- **supplier_batches**: Purchase orders with received_at, status
- **supplier_batch_items**: Line items in batches
- **supplier_payments**: Payment history
- **expenses**: Cost tracking with categories

All timestamp columns use `datetime('now','localtime')` for local timezone support.

## 🧪 Testing

- **Auth tests** (7): Login success/failure, role validation, empty credentials
- **Product tests** (8): Sys-ID auto-generation, stock deduction, oversell prevention, search
- **Parity tests** (5): Sales processing (card surcharge), overpayment handling, hold→complete flow, customer ledger FIFO, supplier settlement
- **API client tests** (3): IPC payload validation, method proxying
- **Component tests** (6): Render checks for major tabs

Run all tests:
```bash
npm test
```

## 🔧 Configuration

### Environment Variables (optional, `.env` in `desktop-next/`)
```env
POS_SUPERADMIN_USERNAME=superadmin
POS_SUPERADMIN_PASSWORD=superadmin123
NODE_ENV=production
```

### Seeded Credentials
On first run, two default admin users are created:
- **admin** / **admin123** (Admin role)
- **cashier** / **admin123** (Cashier role)

## 📝 License

This is a private project for floreo POS.

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
