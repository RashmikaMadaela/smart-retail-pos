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
- Next checkpoint: split the large migration shell into feature pages/components and add parity tests around the new IPC write paths.
