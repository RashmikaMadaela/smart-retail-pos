# Smart Retail POS

Offline-first desktop retail POS and mini-ERP built with Electron, React, TypeScript, and SQLite.

This application is designed for day-to-day shop operations: billing, inventory, customer credit, supplier purchases/payments, expenses, barcode workflows, and financial summary reporting.

## 1) Product Overview

### Core goals
- Run fully on local machine without internet dependency
- Support cashier and admin workflows with role-based access
- Keep data in local SQLite with predictable file-based backups
- Provide both installer and portable desktop distribution

### Main workflows
- Counter billing (cash/card, discounts, payment status)
- Hold/recall sales
- Product and stock management
- Customer ledger and payment collection
- Supplier ledger, batch receiving, and payment settlement
- Expense recording and summary analytics
- Bill PDF generation and barcode label generation/printing

## 2) Feature Breakdown

### Authentication and roles
- Login with username/password
- Role-aware UI behavior
- Auto-seeded admin account on first run

### Billing
- Product search and cart composition
- Per-item discounts and card surcharge support
- Payment status handling: PAID, PARTIAL, UNPAID
- Optional customer linking on sale
- Sale completion updates stock and ledgers
- Bill PDF export

### Held sales
- Hold a checkout session
- List held sales per cashier
- Recall held sale for completion
- Void held sale

### Inventory
- Product create/update by barcode
- Auto barcode generation (PS-* style) when barcode omitted
- Stock and price fields per product
- Low-stock filtering and refresh
- Import/export inventory JSON (SuperAdmin flow)
- Clear stock/all business data (SuperAdmin flow)

### Customers
- Create/search customers
- View customer ledger
- Record customer payments against outstanding balances
- Delete customer support

### Suppliers
- Create/update/search suppliers
- Receive supplier batches with line items
- Optional inline new-product creation while receiving
- Record supplier payments
- Supplier ledger and batch listing

### Expenses and operations
- Record/list expenses by category
- Generate and print barcode labels
- Open export folder helpers
- Localization switching through i18n setup

## 3) Technical Architecture

### Desktop architecture
- Electron main process for window lifecycle + IPC registration
- Preload bridge exposes a safe `window.posApi` surface
- React renderer consumes typed API client and Zustand stores
- Backend services perform business logic and SQLite access

### Data flow
1. Renderer calls API client
2. API client invokes preload bridge methods
3. Preload forwards to `ipcMain.handle` channels
4. IPC layer validates payloads (Zod)
5. Backend service executes logic and DB operations
6. Structured response returned to renderer

### Important modules
- `electron/main/main.ts`: app startup, path resolution, env setup
- `electron/main/ipc.ts`: IPC handlers + request validation
- `electron/preload/preload.ts`: exposed bridge API
- `backend/services/*`: domain services
- `backend/db/sqlite.ts`: DB connection lifecycle
- `backend/db/schema.ts`: idempotent schema bootstrap

## 4) Backend Services

- `authService.ts`: login, password hashing, bootstrap admin/superadmin
- `catalogService.ts`: list/search/create/update/remove products
- `salesService.ts`: process/hold/recall/complete/void sales
- `ledgerService.ts`: customers, suppliers, payments, ledgers, batches
- `expenseService.ts`: create/list expenses
- `reportService.ts`: financial summary aggregation
- `printService.ts`: bill PDF and barcode PDF generation
- `tsplPrinterService.ts`: TSPL thermal label printing workflow
- `inventoryAdminService.ts`: inventory export/import and admin reset ops

## 5) Database Model

SQLite file is auto-created and schema-initialized if missing.

### Tables
- `users`
- `products`
- `sales`
- `sale_items`
- `customers`
- `suppliers`
- `supplier_batches`
- `supplier_batch_items`
- `supplier_payments`
- `expenses`

### Schema behavior
- Idempotent `CREATE TABLE IF NOT EXISTS`
- Additive column guards via schema helpers
- Foreign keys enabled
- `PRAGMA user_version` used for schema version tracking

## 6) Runtime Paths and Configuration

### Default paths
- Development DB: `backend/db/pos.db`
- Packaged DB: `%USERPROFILE%/Documents/SmartRetailPOSNext/database/pos.db`
- Development print output: `printouts/`
- Development inventory export output: `inventory_exports/`

### Environment overrides
- `POS_DB_PATH`
- `POS_PRINT_DIR`
- `POS_INVENTORY_EXPORT_DIR`
- `POS_BILL_LOGO_PATH`
- `POS_BILL_FONT_PATH`
- `POS_SUPERADMIN_USERNAME`
- `POS_SUPERADMIN_PASSWORD`
- `POS_OPEN_DEVTOOLS`

## 7) Commands

### Install
```bash
npm install
```

### Development
```bash
npm run dev
```

### Type check
```bash
npm run check
```

### Test
```bash
npm run test
```

### Build
```bash
npm run build
```

### Package
```bash
npm run dist
npm run dist:nsis
npm run dist:portable
```

### Smoke pipeline
```bash
npm run smoke
```

## 8) Packaging and Branding Assets

### Windows icon usage
- App/EXE icon source: `build/icon.ico`
- NSIS installer icon: `build/icon.ico`
- NSIS uninstaller icon: `build/icon.ico`

### Bundled branding assets
The build config includes branding assets in package files and `extraResources`:
- `build/icon.ico`
- `build/icon.png`
- `build/icon-square.png`
- `build/app logo.png`

### Receipt logo resolution
Logo is resolved from common locations (renderer public/build/resources) and optional env override (`POS_BILL_LOGO_PATH`).

## 9) Project Structure

```text
smart-retail-pos/
├── backend/
│   ├── db/
│   │   ├── schema.ts
│   │   └── sqlite.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── catalogService.ts
│   │   ├── expenseService.ts
│   │   ├── inventoryAdminService.ts
│   │   ├── ledgerService.ts
│   │   ├── printService.ts
│   │   ├── reportService.ts
│   │   ├── salesService.ts
│   │   └── tsplPrinterService.ts
│   └── types.ts
├── electron/
│   ├── main/
│   │   ├── ipc.ts
│   │   └── main.ts
│   └── preload/
│       └── preload.ts
├── renderer/
│   ├── public/
│   │   └── logo.jpg
│   └── src/
│       ├── components/
│       ├── features/
│       ├── i18n/
│       ├── lib/
│       ├── locales/
│       ├── store/
│       ├── App.tsx
│       └── main.tsx
├── build/
│   ├── icon.ico
│   ├── icon.png
│   ├── icon-square.png
│   └── app logo.png
├── tests/
├── scripts/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vite.config.ts
└── README.md
```

## 10) Quality and Testing

Current test setup includes:
- Service-level tests for auth/product/sales parity paths
- Renderer interaction tests for feature tabs
- Client API wrapper tests

Recommended routine before release:
```bash
npm run smoke
npm run dist
```

## 11) Operational Notes

- Database is local SQLite file; backing up DB file is sufficient for core data backup.
- First run auto-initializes schema and seeded accounts.
- For thermal printing, actual behavior depends on connected printer compatibility.
- Dev mode currently assumes port 5173 for Electron wait-on flow.

## 12) Default Seed Credentials

- Admin
  - Username: `admin`
  - Password: `admin123`

- SuperAdmin (auto-ensured)
  - Username: `superadmin` (or `POS_SUPERADMIN_USERNAME`)
  - Password: `superadmin123` (or `POS_SUPERADMIN_PASSWORD`)

## 13) License

UNLICENSED (private project).
