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
};

contextBridge.exposeInMainWorld("posApi", api);
