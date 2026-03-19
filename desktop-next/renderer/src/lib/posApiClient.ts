type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string };

async function safeCall<T>(fn: () => Promise<ApiResult<T>>, fallback: string): Promise<ApiResult<T>> {
  try {
    return await fn();
  } catch {
    return { ok: false, error: fallback };
  }
}

export const posApiClient = {
  login: (username: string, password: string) =>
    safeCall(
      () => window.posApi.login(username, password) as Promise<ApiResult<{ id: number; username: string; role: "Admin" | "Cashier" }>>,
      "Unable to contact auth service",
    ),
  listProducts: (limit = 50) => safeCall(() => window.posApi.listProducts(limit) as Promise<ApiResult<any[]>>, "Unable to load products"),
  searchProducts: (searchText: string, limit = 50) =>
    safeCall(() => window.posApi.searchProducts(searchText, limit) as Promise<ApiResult<any[]>>, "Unable to search products"),
  getSummary: () => safeCall(() => window.posApi.getSummary() as Promise<ApiResult<any>>, "Unable to load summary"),

  processSale: (payload: unknown) =>
    safeCall(() => window.posApi.processSale(payload) as Promise<ApiResult<{ sale_id: number }>>, "Unable to process sale"),
  holdSale: (payload: unknown) =>
    safeCall(() => window.posApi.holdSale(payload) as Promise<ApiResult<{ sale_id: number }>>, "Unable to hold sale"),
  listHeldSales: (cashierId?: number) =>
    safeCall(() => window.posApi.listHeldSales(cashierId) as Promise<ApiResult<any[]>>, "Unable to load held sales"),
  recallHeldSale: (saleId: number) =>
    safeCall(() => window.posApi.recallHeldSale(saleId) as Promise<ApiResult<any>>, "Unable to recall held sale"),
  completeHeldSale: (payload: unknown) =>
    safeCall(() => window.posApi.completeHeldSale(payload) as Promise<ApiResult<{ message: string }>>, "Unable to complete held sale"),

  createOrGetCustomer: (payload: unknown) =>
    safeCall(() => window.posApi.createOrGetCustomer(payload) as Promise<ApiResult<any>>, "Unable to create or load customer"),
  searchCustomers: (payload: unknown) =>
    safeCall(() => window.posApi.searchCustomers(payload) as Promise<ApiResult<any[]>>, "Unable to search customers"),
  getCustomerLedger: (customerId: number) =>
    safeCall(() => window.posApi.getCustomerLedger(customerId) as Promise<ApiResult<any>>, "Unable to load customer ledger"),
  recordCustomerPayment: (payload: unknown) =>
    safeCall(() => window.posApi.recordCustomerPayment(payload) as Promise<ApiResult<{ message: string }>>, "Unable to record customer payment"),

  createSupplier: (payload: unknown) =>
    safeCall(() => window.posApi.createSupplier(payload) as Promise<ApiResult<{ message: string }>>, "Unable to create supplier"),
  listSuppliers: (payload: unknown) =>
    safeCall(() => window.posApi.listSuppliers(payload) as Promise<ApiResult<any[]>>, "Unable to load suppliers"),
  receiveSupplierBatch: (payload: unknown) =>
    safeCall(() => window.posApi.receiveSupplierBatch(payload) as Promise<ApiResult<{ batch_id: number }>>, "Unable to receive supplier batch"),
  recordSupplierPayment: (payload: unknown) =>
    safeCall(() => window.posApi.recordSupplierPayment(payload) as Promise<ApiResult<{ message: string }>>, "Unable to record supplier payment"),
  getSupplierLedger: (supplierId: number) =>
    safeCall(() => window.posApi.getSupplierLedger(supplierId) as Promise<ApiResult<any>>, "Unable to load supplier ledger"),

  listExpenses: (limit = 100) =>
    safeCall(() => window.posApi.listExpenses(limit) as Promise<ApiResult<any[]>>, "Unable to load expenses"),
  createExpense: (payload: unknown) =>
    safeCall(() => window.posApi.createExpense(payload) as Promise<ApiResult<{ expense_id: number }>>, "Unable to create expense"),
  exportSaleBillPdf: (saleId: number) =>
    safeCall(() => window.posApi.exportSaleBillPdf(saleId) as Promise<ApiResult<{ file_path: string }>>, "Unable to export sale PDF"),
  exportBarcodePdf: (payload: unknown) =>
    safeCall(
      () => window.posApi.exportBarcodePdf(payload) as Promise<ApiResult<{ file_path: string; labels: number }>>,
      "Unable to export barcode PDF",
    ),
};
