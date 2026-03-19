# Smart Retail POS Next Cutover Checklist

## 1. Build and Package

- [x] Run `npm run check`
- [x] Run `npm run test`
- [x] Run `npm run build`
- [x] Run `npm run dist`
- [x] Verify installer and portable artifacts in `release/`

## 2. Environment and Data

- [ ] Confirm source database exists at `database/pos.db`
- [ ] Validate packaged app can read bundled DB from `resources/database/pos.db`
- [ ] Set explicit `POS_DB_PATH` for production if custom DB location is required

## 3. Critical Workflow UAT

- [ ] Login as Admin and Cashier
- [ ] Billing: add item, hold bill, recall bill, complete sale
- [ ] Customer: create/get customer, partial payment, ledger updates
- [ ] Supplier: create supplier, receive batch, settle batch, ledger updates
- [ ] Financial summary values update after each workflow

## 4. Rollback Readiness

- [ ] Keep current Python desktop app installer available
- [ ] Keep backup of the latest known-good `database/pos.db`
- [ ] Document revert trigger conditions and responsible owner

## 5. Go-Live Signoff

- [ ] Stakeholder signoff for UAT results
- [ ] Deployment date/time approved
- [ ] Post-deploy verification owner assigned
