# Smart Retail POS Next (Migration Shell)

This folder contains the new Electron + React + Node migration app scaffold.

## Current Scope

- Electron main/preload setup
- IPC channels for auth, product reads, summary reads, and sales transactions
- Node service layer with better-sqlite3 against existing `database/pos.db`
- React renderer with Zustand session store and migration shell UI
- Sales write-path migration checkpoint:
	- process sale
	- hold sale
	- list held sales
	- recall held sale
	- complete held sale
- Ledger write-path migration checkpoint:
	- create/search customer
	- customer ledger read
	- customer payment settlement
	- create/list/search supplier
	- receive supplier batch
	- supplier batch payment settlement
	- supplier ledger read
- React workflow integration checkpoint:
	- billing cart + checkout wired to sales.processSale
	- hold/recall/complete-held controls wired
	- customer ledger and settlement actions wired
	- supplier create/receive/settlement actions wired
- Parity test harness checkpoint:
	- isolated SQLite test DB per run
	- service-level parity tests for sales and ledger behaviors
- Stage 6 architecture checkpoint:
	- renderer split into feature modules (`LoginView`, `SummaryStrip`, tab components)
	- centralized renderer API wrapper (`posApiClient`) for preload bridge calls
	- renderer integration tests for API forwarding (`renderer/src/lib/posApiClient.test.ts`)
- Stage 7 quality and hardening checkpoint:
	- jsdom UI interaction tests for Billing, Held Sales, Customers, and Suppliers tabs
	- renderer crash containment via `ErrorBoundary`
	- safer renderer API wrapper with standardized fallback errors on bridge/runtime failures
- Stage 8 release readiness checkpoint:
	- production Electron build pipeline (`build:electron` via tsup)
	- desktop packaging pipeline (`dist` via electron-builder)
	- app-level smoke pipeline (`smoke`) and cutover checklist (`CUTOVER_CHECKLIST.md`)
	- branded app icon configured for runtime and installer (`build/icon.png`, `build/icon.ico`)
	- temporary virtual printing pipeline:
		- bill receipts saved as PDF (checkout and held-sale completion)
		- barcode label queue saved as PDF from Operations tab

## Commands

Install dependencies:

```bash
npm install
```

Type check:

```bash
npm run check
```

Run migration parity tests:

```bash
npm run test
```

Test coverage now includes:

- service parity tests (`tests/parity-services.test.ts`)
- renderer API forwarding tests (`renderer/src/lib/posApiClient.test.ts`)
- tab-level UI interaction tests (`renderer/src/features/*.test.tsx`)

Run app in development mode:

```bash
npm run dev
```

Run production build (renderer + electron main/preload):

```bash
npm run build
```

Run packaged app from compiled output:

```bash
npm run start
```

Run smoke pipeline:

```bash
npm run smoke
```

Build Windows installer and portable artifacts:

```bash
npm run dist
```

Build only NSIS installer:

```bash
npm run dist:nsis
```

Build only portable executable:

```bash
npm run dist:portable
```

## Notes

- This is a parallel migration workspace. The existing Python app remains unchanged.
- Stage 6 complete: `App.tsx` now coordinates feature components instead of owning all tab markup directly.
- Stage 7 complete: feature tabs have interaction coverage and renderer-side crash/error hardening.
- Stage 8 complete: desktop packaging scripts, smoke pipeline, and cutover checklist are now in place.
- Temporary virtual printing outputs:
	- development: `printouts/bills` and `printouts/barcodes`
	- packaged app: `%USERPROFILE%/Documents/SmartRetailPOSNext/printouts/...`
- Bill PDF format now uses thermal-style 78mm receipt width.
- Default bill logo is loaded from `renderer/public/logo.jpeg` (also supports `.jpg`, `.png`, `.webp`).
- In packaged builds, the same logo is loaded from `dist/logo.*`.
- Optional bill branding/config via environment variables:
	- `POS_BILL_LOGO_PATH` (absolute path override used only when no default logo file is found)
	- `POS_BILL_STORE_NAME`
	- `POS_BILL_STORE_LOCATION`
	- `POS_BILL_STORE_PHONE`
	- `POS_BILL_STORE_EMAIL`
	- `POS_BILL_RETURN_POLICY`
	- `POS_BILL_FOOTER`
- SuperAdmin account is auto-seeded at startup if missing:
	- username: `superadmin`
	- password: `superadmin123`
	- privileges: clear all inventory product records, export inventory JSON, import inventory JSON
- Inventory export location:
	- development: `inventory_exports/`
	- packaged app: `%USERPROFILE%/Documents/SmartRetailPOSNext/inventory_exports/`
- Next checkpoint: execute UAT checklist with business users and produce final release signoff.
