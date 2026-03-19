import { describe, expect, test, vi, beforeEach } from "vitest";
import { posApiClient } from "./posApiClient";

beforeEach(() => {
  const posApiMock: Window["posApi"] = {
    processSale: vi.fn().mockResolvedValue({ ok: true, data: { sale_id: 10 } }),
    holdSale: vi.fn().mockResolvedValue({ ok: true, data: { sale_id: 11 } }),
    listHeldSales: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    recallHeldSale: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    completeHeldSale: vi.fn().mockResolvedValue({ ok: true, data: { message: "done" } }),
    createOrGetCustomer: vi.fn().mockResolvedValue({ ok: true, data: { id: 1 } }),
    searchCustomers: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getCustomer: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    getCustomerLedger: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    recordCustomerPayment: vi.fn().mockResolvedValue({ ok: true, data: { message: "ok" } }),
    createSupplier: vi.fn().mockResolvedValue({ ok: true, data: { message: "ok" } }),
    listSuppliers: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    receiveSupplierBatch: vi.fn().mockResolvedValue({ ok: true, data: { batch_id: 2 } }),
    listSupplierBatches: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    recordSupplierPayment: vi.fn().mockResolvedValue({ ok: true, data: { message: "ok" } }),
    getSupplierLedger: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    login: vi.fn().mockResolvedValue({ ok: true, data: { id: 1, username: "admin", role: "Admin" } }),
    listProducts: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    searchProducts: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getSummary: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    listExpenses: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    createExpense: vi.fn().mockResolvedValue({ ok: true, data: { expense_id: 1 } }),
    exportSaleBillPdf: vi.fn().mockResolvedValue({ ok: true, data: { file_path: "E:/tmp/bill.pdf" } }),
    exportBarcodePdf: vi.fn().mockResolvedValue({ ok: true, data: { file_path: "E:/tmp/barcodes.pdf", labels: 2 } }),
    clearInventoryStock: vi.fn().mockResolvedValue({ ok: true, data: { rows_affected: 2 } }),
    exportInventoryData: vi.fn().mockResolvedValue({ ok: true, data: { file_path: "E:/tmp/inventory.json", product_count: 2 } }),
    importInventoryData: vi.fn().mockResolvedValue({ ok: true, data: { upserted_count: 2 } }),
    pickInventoryImportFile: vi.fn().mockResolvedValue({ ok: true, data: { file_path: "E:/tmp/inventory.json" } }),
    openInventoryExportFolder: vi.fn().mockResolvedValue({ ok: true, data: { path: "E:/tmp" } }),
  };

  Object.defineProperty(globalThis, "window", {
    value: { posApi: posApiMock },
    writable: true,
    configurable: true,
  });
});

describe("posApiClient renderer integration", () => {
  test("processSale forwards payload to preload API", async () => {
    const payload = { cashier_id: 2, cart_items: [{ product_id: "P100", qty: 1, price: 100, discount: 0 }] };
    await posApiClient.processSale(payload);
    expect(window.posApi.processSale).toHaveBeenCalledWith(payload);
  });

  test("holdSale and completeHeldSale forward payload shape", async () => {
    const holdPayload = { cashier_id: 2, cart_items: [], subtotal: 0, global_discount: 0, total_amount: 0 };
    const completePayload = { sale_id: 5, paid_amount: 20, payment_status: "PARTIAL" };

    await posApiClient.holdSale(holdPayload);
    await posApiClient.completeHeldSale(completePayload);

    expect(window.posApi.holdSale).toHaveBeenCalledWith(holdPayload);
    expect(window.posApi.completeHeldSale).toHaveBeenCalledWith(completePayload);
  });

  test("customer and supplier actions proxy to preload bridge", async () => {
    await posApiClient.recordCustomerPayment({ customer_id: 7, amount: 50 });
    await posApiClient.recordSupplierPayment({ supplier_id: 2, batch_id: 3, amount: 40 });

    expect(window.posApi.recordCustomerPayment).toHaveBeenCalledWith({ customer_id: 7, amount: 50 });
    expect(window.posApi.recordSupplierPayment).toHaveBeenCalledWith({ supplier_id: 2, batch_id: 3, amount: 40 });
  });
});
