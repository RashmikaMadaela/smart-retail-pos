export {};

declare global {
  interface Window {
    posApi: {
      login: (username: string, password: string) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listProducts: (limit?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      searchProducts: (searchText: string, limit?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      getSummary: () => Promise<{ ok: boolean; data?: any; error?: string }>;
      processSale: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      holdSale: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listHeldSales: (cashierId?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      recallHeldSale: (saleId: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      completeHeldSale: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      createOrGetCustomer: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      searchCustomers: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      getCustomer: (customerId: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      getCustomerLedger: (customerId: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      recordCustomerPayment: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      createSupplier: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listSuppliers: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      receiveSupplierBatch: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listSupplierBatches: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      recordSupplierPayment: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      getSupplierLedger: (supplierId: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listExpenses: (limit?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      createExpense: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
    };
  }
}
