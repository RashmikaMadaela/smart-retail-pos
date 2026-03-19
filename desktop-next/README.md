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

Run app in development mode:

```bash
npm run dev
```

## Notes

- This is a parallel migration workspace. The existing Python app remains unchanged.
- Stage 6 complete: `App.tsx` now coordinates feature components instead of owning all tab markup directly.
- Next checkpoint: add targeted UI interaction tests for each feature tab and prepare cutover hardening.
