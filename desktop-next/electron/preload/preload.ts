import { contextBridge, ipcRenderer } from "electron";

const api = {
  login: (username: string, password: string) =>
    ipcRenderer.invoke("auth.login", { username, password }),
  listProducts: (limit?: number) =>
    ipcRenderer.invoke("catalog.listProducts", { limit }),
  searchProducts: (searchText: string, limit?: number) =>
    ipcRenderer.invoke("catalog.searchProducts", { searchText, limit }),
  createProduct: (payload: unknown) =>
    ipcRenderer.invoke("catalog.createProduct", payload),
  removeProduct: (payload: unknown) =>
    ipcRenderer.invoke("catalog.removeProduct", payload),
  getSummary: () => ipcRenderer.invoke("report.summary"),
  processSale: (payload: unknown) => ipcRenderer.invoke("sales.processSale", payload),
  holdSale: (payload: unknown) => ipcRenderer.invoke("sales.holdSale", payload),
  listHeldSales: (cashierId?: number) =>
    ipcRenderer.invoke("sales.listHeldSales", cashierId ? { cashier_id: cashierId } : {}),
  recallHeldSale: (saleId: number) => ipcRenderer.invoke("sales.recallHeldSale", { sale_id: saleId }),
  voidHeldSale: (saleId: number) => ipcRenderer.invoke("sales.voidHeldSale", { sale_id: saleId }),
  completeHeldSale: (payload: unknown) =>
    ipcRenderer.invoke("sales.completeHeldSale", payload),
  createOrGetCustomer: (payload: unknown) => ipcRenderer.invoke("customer.createOrGet", payload),
  searchCustomers: (payload: unknown) => ipcRenderer.invoke("customer.search", payload),
  getCustomer: (customerId: number) => ipcRenderer.invoke("customer.get", { customer_id: customerId }),
  getCustomerLedger: (customerId: number) =>
    ipcRenderer.invoke("customer.getLedger", { customer_id: customerId }),
  recordCustomerPayment: (payload: unknown) => ipcRenderer.invoke("customer.recordPayment", payload),
  deleteCustomer: (customerId: number) => ipcRenderer.invoke("customer.delete", { customer_id: customerId }),
  createSupplier: (payload: unknown) => ipcRenderer.invoke("supplier.create", payload),
  updateSupplier: (payload: unknown) => ipcRenderer.invoke("supplier.update", payload),
  listSuppliers: (payload: unknown) => ipcRenderer.invoke("supplier.list", payload),
  receiveSupplierBatch: (payload: unknown) => ipcRenderer.invoke("supplier.receiveBatch", payload),
  listSupplierBatches: (payload: unknown) => ipcRenderer.invoke("supplier.listBatches", payload),
  recordSupplierPayment: (payload: unknown) => ipcRenderer.invoke("supplier.recordPayment", payload),
  getSupplierLedger: (supplierId: number) =>
    ipcRenderer.invoke("supplier.getLedger", { supplier_id: supplierId }),
  listExpenses: (limit?: number) => ipcRenderer.invoke("expense.list", { limit }),
  createExpense: (payload: unknown) => ipcRenderer.invoke("expense.create", payload),
  exportSaleBillPdf: (saleId: number) => ipcRenderer.invoke("print.salePdf", { sale_id: saleId }),
  exportBarcodePdf: (payload: unknown) => ipcRenderer.invoke("print.barcodePdf", payload),
  clearInventoryStock: (role: "SuperAdmin") => ipcRenderer.invoke("inventory.clearStock", { role }),
  clearAllData: (role: "SuperAdmin") => ipcRenderer.invoke("inventory.clearAllData", { role }),
  exportInventoryData: (role: "SuperAdmin") => ipcRenderer.invoke("inventory.exportData", { role }),
  importInventoryData: (payload: { role: "SuperAdmin"; file_path: string }) => ipcRenderer.invoke("inventory.importData", payload),
  pickInventoryImportFile: (role: "SuperAdmin") => ipcRenderer.invoke("inventory.pickImportFile", { role }),
  openInventoryExportFolder: (role: "SuperAdmin") => ipcRenderer.invoke("inventory.openExportFolder", { role }),
};

contextBridge.exposeInMainWorld("posApi", api);
