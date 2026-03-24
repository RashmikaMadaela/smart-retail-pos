# Smart Retail POS

Offline-first desktop retail POS and local ERP application built with Electron, React, and TypeScript.

## Tech Stack

- Electron + React + TypeScript
- Node.js backend services
- SQLite with `better-sqlite3`
- Tailwind CSS + shadcn/ui
- Vitest + Testing Library

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run Development

```bash
npm run dev
```

### Type Check

```bash
npm run check
```

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Package Desktop App

```bash
npm run dist
```

## Database Behavior

- Development default DB path: `backend/db/pos.db`
- Production packaged default DB path: `%USERPROFILE%/Documents/SmartRetailPOSNext/database/pos.db`
- Override with environment variable: `POS_DB_PATH`
- Schema is initialized idempotently on startup.

## Runtime Output Paths

- Print output default: `printouts/`
- Inventory export default: `inventory_exports/`
- Overrides:
  - `POS_PRINT_DIR`
  - `POS_INVENTORY_EXPORT_DIR`

## Project Structure

```text
backend/
build/
electron/
renderer/
scripts/
tests/
package.json
vite.config.ts
tsconfig.json
tsup.config.ts
```
