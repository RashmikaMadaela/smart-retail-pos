import { contextBridge, ipcRenderer } from "electron";

const api = {
  login: (username: string, password: string) =>
    ipcRenderer.invoke("auth.login", { username, password }),
  listProducts: (limit?: number) =>
    ipcRenderer.invoke("catalog.listProducts", { limit }),
  searchProducts: (searchText: string, limit?: number) =>
    ipcRenderer.invoke("catalog.searchProducts", { searchText, limit }),
  getSummary: () => ipcRenderer.invoke("report.summary"),
  processSale: (payload: unknown) => ipcRenderer.invoke("sales.processSale", payload),
  holdSale: (payload: unknown) => ipcRenderer.invoke("sales.holdSale", payload),
  listHeldSales: (cashierId?: number) =>
    ipcRenderer.invoke("sales.listHeldSales", cashierId ? { cashier_id: cashierId } : {}),
  recallHeldSale: (saleId: number) => ipcRenderer.invoke("sales.recallHeldSale", { sale_id: saleId }),
  completeHeldSale: (payload: unknown) =>
    ipcRenderer.invoke("sales.completeHeldSale", payload),
  createOrGetCustomer: (payload: unknown) => ipcRenderer.invoke("customer.createOrGet", payload),
  searchCustomers: (payload: unknown) => ipcRenderer.invoke("customer.search", payload),
  getCustomer: (customerId: number) => ipcRenderer.invoke("customer.get", { customer_id: customerId }),
  getCustomerLedger: (customerId: number) =>
    ipcRenderer.invoke("customer.getLedger", { customer_id: customerId }),
  recordCustomerPayment: (payload: unknown) => ipcRenderer.invoke("customer.recordPayment", payload),
  createSupplier: (payload: unknown) => ipcRenderer.invoke("supplier.create", payload),
  listSuppliers: (payload: unknown) => ipcRenderer.invoke("supplier.list", payload),
  receiveSupplierBatch: (payload: unknown) => ipcRenderer.invoke("supplier.receiveBatch", payload),
  listSupplierBatches: (payload: unknown) => ipcRenderer.invoke("supplier.listBatches", payload),
  recordSupplierPayment: (payload: unknown) => ipcRenderer.invoke("supplier.recordPayment", payload),
  getSupplierLedger: (supplierId: number) =>
    ipcRenderer.invoke("supplier.getLedger", { supplier_id: supplierId }),
};

contextBridge.exposeInMainWorld("posApi", api);
