# PRD Acceptance Checklist - Phase 1

## Project Objective

- [ ] Offline-first POS flow runs without network dependency.
- [ ] System provides inventory, billing, credit, expense, and net profit reporting.

## RBAC

- [ ] Login screen authenticates users.
- [ ] Admin has full access to all modules.
- [ ] Cashier access is limited to billing and payment workflows.
- [ ] Cashier cannot view buy price or net profit analytics.

## Inventory Management

- [ ] Add item with name, barcode, buy price, sell price, stock, min stock.
- [ ] Support non-barcoded items (search/quick selection).
- [ ] Admin can update stock quantities.
- [ ] Admin can change selling prices for future sales.
- [ ] Low stock alert flags items where stock is below min stock.
- [ ] Product-level default discount percent is configurable.
- [ ] Product-level card surcharge settings are configurable.
- [ ] Inventory supports barcode sticker generation and print fallback.

## POS Billing

- [ ] Barcode scanner entry works through keyboard input path.
- [ ] Item add by name is supported.
- [ ] Line-item discount is supported.
- [ ] Global bill discount is supported.
- [ ] Hold bill feature stores active transaction.
- [ ] Recall bill feature restores held transaction.
- [ ] Completed sale stores immutable sold-at price in line items.
- [ ] Receipt generation is triggered after checkout.
- [ ] Cashier can quick-add missing products in billing flow.
- [ ] Payment method supports CASH and CARD.
- [ ] Card surcharge is automatically applied for configured items on CARD payments.
- [ ] Paid amount preview shows change or remaining balance before checkout.

## Supplier Ledger and Batch Management

- [ ] Admin can create supplier profiles.
- [ ] Admin can receive supplier batches with product lines, unit cost, and discounts.
- [ ] Batch receive increases product stock.
- [ ] Partial supplier settlement is supported for selected batch.
- [ ] Supplier outstanding payable updates after receive and settlement.

## Customer Ledger

- [ ] Bill can be marked unpaid.
- [ ] Bill can be marked partially paid.
- [ ] Customer profile (name, contact) is linked for unpaid balances.
- [ ] Debt clearance updates outstanding balances correctly.

## Expense Tracking

- [ ] Admin can log business expenses.
- [ ] Expense includes amount, date, and category.
- [ ] Expense entries are available for reporting.

## Admin Analytics Dashboard

- [ ] Gross sales is displayed.
- [ ] Net profit is displayed as sales minus COGS minus expenses.
- [ ] Top sellers by volume are displayed.
- [ ] Dead stock (no sales in period) is displayed.
- [ ] Peak hours (sales by hour) is displayed.

## Hardware

- [ ] USB barcode scanner works as keyboard emulation.
- [ ] ESC/POS thermal print path is supported.
- [ ] Fallback receipt output works if no printer is configured.
- [ ] Sticker generation and fallback output works if printer/image path is unavailable.

## Database Coverage

- [ ] `users` table supports authentication and RBAC.
- [ ] `products` table stores inventory and margin fields.
- [ ] `sales` table stores transaction headers and statuses.
- [ ] `sale_items` table stores line items.
- [ ] `customers` table stores ledger identity and outstanding balances.
- [ ] `expenses` table stores operational expenses.
- [ ] `suppliers` table stores supplier identities and outstanding values.
- [ ] `supplier_batches` table stores supplier invoices/stock receipts.
- [ ] `supplier_batch_items` table stores received line-level product details.
- [ ] `supplier_payments` table stores supplier settlement records.

## Out of Scope (Must Stay Excluded)

- [ ] Cloud synchronization is not included.
- [ ] Docker and CI/CD deployment are not included.
- [ ] AI/NLQ integration is not included.
- [ ] WhatsApp receipt integration is not included.
