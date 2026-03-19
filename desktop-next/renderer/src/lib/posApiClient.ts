type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string };

export const posApiClient = {
  login: (username: string, password: string) =>
    window.posApi.login(username, password) as Promise<ApiResult<{ id: number; username: string; role: "Admin" | "Cashier" }>>,
  listProducts: (limit = 50) => window.posApi.listProducts(limit) as Promise<ApiResult<any[]>>,
  searchProducts: (searchText: string, limit = 50) =>
    window.posApi.searchProducts(searchText, limit) as Promise<ApiResult<any[]>>,
  getSummary: () => window.posApi.getSummary() as Promise<ApiResult<any>>,

  processSale: (payload: unknown) => window.posApi.processSale(payload) as Promise<ApiResult<{ sale_id: number }>>,
  holdSale: (payload: unknown) => window.posApi.holdSale(payload) as Promise<ApiResult<{ sale_id: number }>>,
  listHeldSales: (cashierId?: number) => window.posApi.listHeldSales(cashierId) as Promise<ApiResult<any[]>>,
  recallHeldSale: (saleId: number) => window.posApi.recallHeldSale(saleId) as Promise<ApiResult<any>>,
  completeHeldSale: (payload: unknown) => window.posApi.completeHeldSale(payload) as Promise<ApiResult<{ message: string }>>,

  createOrGetCustomer: (payload: unknown) => window.posApi.createOrGetCustomer(payload) as Promise<ApiResult<any>>,
  searchCustomers: (payload: unknown) => window.posApi.searchCustomers(payload) as Promise<ApiResult<any[]>>,
  getCustomerLedger: (customerId: number) => window.posApi.getCustomerLedger(customerId) as Promise<ApiResult<any>>,
  recordCustomerPayment: (payload: unknown) => window.posApi.recordCustomerPayment(payload) as Promise<ApiResult<{ message: string }>>,

  createSupplier: (payload: unknown) => window.posApi.createSupplier(payload) as Promise<ApiResult<{ message: string }>>,
  listSuppliers: (payload: unknown) => window.posApi.listSuppliers(payload) as Promise<ApiResult<any[]>>,
  receiveSupplierBatch: (payload: unknown) => window.posApi.receiveSupplierBatch(payload) as Promise<ApiResult<{ batch_id: number }>>,
  recordSupplierPayment: (payload: unknown) => window.posApi.recordSupplierPayment(payload) as Promise<ApiResult<{ message: string }>>,
  getSupplierLedger: (supplierId: number) => window.posApi.getSupplierLedger(supplierId) as Promise<ApiResult<any>>,
};
