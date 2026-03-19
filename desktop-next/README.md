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

## Commands

Install dependencies:

```bash
npm install
```

Type check:

```bash
npm run check
```

Run app in development mode:

```bash
npm run dev
```

## Notes

- This is a parallel migration workspace. The existing Python app remains unchanged.
- Supplier/customer ledger transaction writes are the next migration checkpoint.
